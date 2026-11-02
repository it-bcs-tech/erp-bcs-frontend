import type { PageServerLoad } from './$types';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';
import { verifyUserData } from '$lib/server/auth';

const sql = postgres(env.DATABASE_URL || 'postgres://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db');

export const load: PageServerLoad = async ({ url }) => {
	try {
		// Fetch trips from database
		const dbTrips = await sql`
			SELECT 
				t.id as trip_db_id,
				t.no_surat_tugas as id,
				t.unit_id as unit_db_id,
				t.driver_id as driver_db_id,
				u.nomor_unit as vehicle,
				k.nama_karyawan as driver,
				k.payroll_id as driver_payroll,
				t.origin,
				t.destination,
				t.cargo,
				t.status,
				t.depart_time,
				t.arrive_time,
				t.created_at,
				COALESCE(
					(
						SELECT so.status 
						FROM finance.cash_advance ca 
						JOIN marketing.sales_order so ON so.id = ca.sales_order_id 
						WHERE ca.trip_id = t.id 
						LIMIT 1
					),
					(
						SELECT so.status 
						FROM marketing.sales_order so 
						WHERE so.assigned_unit_id = t.unit_id 
						  AND so.tgl_muat::date = t.tgl_trip::date 
						ORDER BY so.created_at DESC 
						LIMIT 1
					)
				) as so_status,
				(
					SELECT notes FROM fleet.trip_checkpoint 
					WHERE trip_id = t.id AND event = 'NOTE' AND notes LIKE '%Tiba di Pool Tujuan%' 
					ORDER BY recorded_at DESC LIMIT 1
				) as pool_arrival_note,
				COALESCE(
					(SELECT json_agg(json_build_object('status', sl.status, 'created_at', sl.created_at) ORDER BY sl.created_at ASC)
					 FROM fleet.trip_status_log sl WHERE sl.trip_id = t.id),
					'[]'::json
				) as status_logs,
				COALESCE(
					(SELECT json_agg(json_build_object(
						'point', tn.point, 
						'note', tn.note, 
						'created_by', tn.created_by, 
						'created_at', tn.created_at,
						'category', COALESCE(tn.category, 'GENERAL'),
						'ref_wo_no', tn.ref_wo_no,
						'ref_incident_no', tn.ref_incident_no,
						'is_escalated_hse', tn.is_escalated_hse,
						'location_detail', tn.location_detail
					))
					 FROM fleet.trip_notes tn WHERE tn.trip_id = t.id),
					'[]'::json
				) as notes
			FROM fleet.trip t
			LEFT JOIN fleet.unit u ON t.unit_id = u.id
			LEFT JOIN master.m_drivers d ON d.id = t.driver_id
			LEFT JOIN master.m_karyawan k ON k.id = d.karyawan_id
			ORDER BY t.created_at DESC
		`;

		// Format trips and build history timeline
		const allTrips = dbTrips.map(t => {
			const formatTime = (dateStr: any) => {
				if (!dateStr) return null;
				const d = new Date(dateStr);
				return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
			};

			const createdTime = formatTime(t.created_at);
			const departTime = formatTime(t.depart_time);
			const arriveTime = formatTime(t.arrive_time);

			let mappedStatus = 'Scheduled';
			let progress = 0;

			// Base status mapping
			if (t.status === 'COMPLETED') {
				mappedStatus = 'Completed';
				progress = 100;
			} else if (t.status === 'RETURNING') {
				if (t.so_status === 'CLOSING' || t.pool_arrival_note) {
					mappedStatus = 'Waiting Cashier';
					progress = 95;
				} else {
					mappedStatus = 'In Transit';
					progress = 90;
				}
			} else if (t.status === 'AT_DESTINATION') {
				mappedStatus = 'In Transit';
				progress = 75;
			} else if (t.status === 'ON_ROUTE') {
				mappedStatus = 'In Transit';
				progress = 60;
			} else if (t.status === 'AT_ORIGIN') {
				mappedStatus = 'In Transit';
				progress = 40;
			} else if (t.status === 'DISPATCHED') {
				mappedStatus = 'In Transit';
				progress = 20;
			} else if (t.status === 'CANCELED') {
				mappedStatus = 'Canceled';
				progress = 0;
			}

			const completedStatuses = {
				'AT_POOL': true,
				'HEADING_ORIGIN': ['AT_ORIGIN', 'ON_ROUTE', 'AT_DESTINATION', 'RETURNING', 'COMPLETED'].includes(t.status),
				'AT_ORIGIN': ['ON_ROUTE', 'AT_DESTINATION', 'RETURNING', 'COMPLETED'].includes(t.status),
				'HEADING_DEST': ['AT_DESTINATION', 'RETURNING', 'COMPLETED'].includes(t.status),
				'AT_DEST': ['RETURNING', 'COMPLETED'].includes(t.status),
				'RETURNING': t.status === 'COMPLETED'
			};

			const logs = Array.isArray(t.status_logs) ? t.status_logs : [];
			const logMap = new Map();
			logs.forEach((l: any) => {
				if (!logMap.has(l.status)) {
					logMap.set(l.status, l.created_at);
				}
			});

			const calcDuration = (startStatus: string, endStatus: string) => {
				const start = logMap.get(startStatus);
				let end = logMap.get(endStatus);
				let isOngoing = false;

				if (!start) return null;
				if (!end) {
					if (t.status === startStatus) {
						end = new Date();
						isOngoing = true;
					} else {
						return null;
					}
				}

				const diffMs = new Date(end).getTime() - new Date(start).getTime();
				if (diffMs < 0) return null;

				const diffMinutes = Math.floor(diffMs / 60000);
				const hours = Math.floor(diffMinutes / 60);
				const mins = diffMinutes % 60;

				let text = '';
				if (hours > 0) text += `${hours}h `;
				text += `${mins}m`;
				if (isOngoing) text += ' (ongoing)';
				return text;
			};

			const notesList = Array.isArray(t.notes) ? t.notes : [];
			const notesMap = new Map();
			notesList.forEach((n: any) => notesMap.set(n.point, n));

			// Generate horizontal timeline history
			const history = [
				{ 
					step: 'AT_POOL', 
					label: 'Standby at Pool', 
					time: createdTime, 
					completed: completedStatuses['AT_POOL'], 
					active: t.status === 'SCHEDULED',
					duration: null,
					note: notesMap.get('AT_POOL') || null
				},
				{ 
					step: 'HEADING_ORIGIN', 
					label: 'Heading to Origin', 
					time: logMap.get('DISPATCHED') ? formatTime(logMap.get('DISPATCHED')) : departTime, 
					completed: completedStatuses['HEADING_ORIGIN'], 
					active: t.status === 'DISPATCHED',
					duration: calcDuration('DISPATCHED', 'AT_ORIGIN'),
					note: notesMap.get('HEADING_ORIGIN') || null
				},
				{ 
					step: 'AT_ORIGIN', 
					label: 'Loading at Origin', 
					time: logMap.get('AT_ORIGIN') ? formatTime(logMap.get('AT_ORIGIN')) : null, 
					completed: completedStatuses['AT_ORIGIN'], 
					active: t.status === 'AT_ORIGIN',
					duration: calcDuration('AT_ORIGIN', 'ON_ROUTE'),
					note: notesMap.get('AT_ORIGIN') || null
				},
				{ 
					step: 'HEADING_DEST', 
					label: 'On Route to Dest', 
					time: logMap.get('ON_ROUTE') ? formatTime(logMap.get('ON_ROUTE')) : null, 
					completed: completedStatuses['HEADING_DEST'], 
					active: t.status === 'ON_ROUTE',
					duration: calcDuration('ON_ROUTE', 'AT_DESTINATION'),
					note: notesMap.get('HEADING_DEST') || null
				},
				{ 
					step: 'AT_DEST', 
					label: 'Unloading at Dest', 
					time: logMap.get('AT_DESTINATION') ? formatTime(logMap.get('AT_DESTINATION')) : null, 
					completed: completedStatuses['AT_DEST'], 
					active: t.status === 'AT_DESTINATION',
					duration: calcDuration('AT_DESTINATION', 'RETURNING'),
					note: notesMap.get('AT_DEST') || null
				},
				{ 
					step: 'RETURNING', 
					label: mappedStatus === 'Waiting Cashier' ? 'At Pool (Menunggu Kasir)' : 'Returning to Pool', 
					time: logMap.get('RETURNING') ? formatTime(logMap.get('RETURNING')) : null, 
					completed: completedStatuses['RETURNING'], 
					active: t.status === 'RETURNING',
					duration: calcDuration('RETURNING', 'COMPLETED'),
					note: t.pool_arrival_note ? { note: t.pool_arrival_note } : (notesMap.get('RETURNING') || null)
				}
			];

			const activeStoringNote = notesList.find((n: any) => n.category === 'STORING');
			const hasActiveStoring = !!activeStoringNote;
			const activeStoringWo = activeStoringNote?.ref_wo_no || null;

			return {
				id: t.id || 'TRP-UNKNOWN',
				db_id: t.trip_db_id,
				unit_id: t.unit_db_id,
				driver_id: t.driver_db_id,
				vehicle: t.vehicle || '-',
				driver: t.driver || '-',
				origin: t.origin || '-',
				destination: t.destination || '-',
				status: mappedStatus,
				has_active_storing: hasActiveStoring,
				active_storing_wo: activeStoringWo,
				progress,
				departedAt: t.depart_time ? new Date(t.depart_time).toLocaleString('id-ID') : '-',
				eta: arriveTime ? arriveTime : (t.depart_time ? 'Est. 4h' : '-'),
				cargo: t.cargo || 'General Cargo',
				history
			};
		});

		// Metrics
		const metrics = {
			activeTrips: allTrips.filter(t => t.status === 'In Transit' || t.status === 'Waiting Cashier').length,
			completedToday: allTrips.filter(t => t.status === 'Completed').length,
			scheduled: allTrips.filter(t => t.status === 'Scheduled').length,
			delayed: allTrips.filter(t => t.status === 'Delayed').length
		};

		// Extract search and filters
		const search = url.searchParams.get('search')?.toLowerCase() || '';
		const statusFilter = url.searchParams.get('status') || 'All';

		let filteredTrips = allTrips;

		if (search) {
			filteredTrips = filteredTrips.filter(t =>
				t.id.toLowerCase().includes(search) ||
				t.vehicle.toLowerCase().includes(search) ||
				t.driver.toLowerCase().includes(search) ||
				t.destination.toLowerCase().includes(search)
			);
		}

		if (statusFilter !== 'All') {
			filteredTrips = filteredTrips.filter(t => t.status === statusFilter);
		}

		const perPage = 5;
		const page = parseInt(url.searchParams.get('page') || '1');
		const total = filteredTrips.length;
		const start = (page - 1) * perPage;
		const paginatedTrips = filteredTrips.slice(start, start + perPage);

		return {
			trips: paginatedTrips,
			metrics,
			meta: {
				current_page: page,
				per_page: perPage,
				total: total
			}
		};
	} catch (error) {
		console.error("Error loading trips from database:", error);
		return { 
			trips: [], 
			metrics: { activeTrips: 0, completedToday: 0, scheduled: 0, delayed: 0 }, 
			meta: { current_page: 1, per_page: 5, total: 0 } 
		};
	}
};

import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
	saveNote: async ({ request, cookies }) => {
		const data = await request.formData();
		const tripId = data.get('trip_id')?.toString();
		const point = data.get('point')?.toString();
		const note = data.get('note')?.toString()?.trim() || '';
		const category = (data.get('category')?.toString() || 'HSE').toUpperCase(); // 'HSE' or 'STORING'
		const locationDetail = data.get('location_detail')?.toString()?.trim() || point;
		const escalateHse = data.get('escalate_hse') === 'true' || data.get('escalate_hse') === 'on';
		const incidentType = data.get('incident_type')?.toString() || 'Unsafe Condition';

		if (!tripId || !point || !note) {
			return fail(400, { success: false, message: 'Trip, titik milestone, dan isi catatan wajib diisi!' });
		}

		let createdBy = 'Unknown';
		const userDataCookie = cookies.get('user_data');
		if (userDataCookie) {
			try {
				const u = verifyUserData(userDataCookie);
				createdBy = u.name || u.email || 'Unknown';
			} catch (e) { /* silent */ }
		}

		try {
			// 1. Ambil info trip, unit, driver
			const [tripData] = await sql`
				SELECT 
					t.id, 
					t.unit_id, 
					t.driver_id, 
					t.no_surat_tugas, 
					u.nomor_unit, 
					k.payroll_id, 
					k.nama_karyawan
				FROM fleet.trip t
				LEFT JOIN fleet.unit u ON u.id = t.unit_id
				LEFT JOIN master.m_drivers d ON d.id = t.driver_id
				LEFT JOIN master.m_karyawan k ON k.id = d.karyawan_id
				WHERE t.id = ${tripId}
			`;

			const [existingNote] = await sql`
				SELECT ref_wo_no, ref_incident_no 
				FROM fleet.trip_notes 
				WHERE trip_id = ${tripId} AND point = ${point}
			`;

			let refWoNo = existingNote?.ref_wo_no || null;
			let refIncidentNo = existingNote?.ref_incident_no || null;

			// 2. Kategori STORING: Terbitkan Work Order di fleet.work_orders jika belum ada
			if (category === 'STORING') {
				if (!refWoNo) {
					const now = new Date();
					const month = String(now.getMonth() + 1).padStart(2, '0');
					const year = now.getFullYear();
					const suffix = `/WO/WSP/${month}/${year}`;

					const lastWo = await sql`
						SELECT wo_no FROM fleet.work_orders 
						WHERE wo_no LIKE ${'%' + suffix} 
						ORDER BY wo_no DESC LIMIT 1
					`;

					let seq = 1;
					if (lastWo.length > 0) {
						const lastSeqStr = lastWo[0].wo_no.split('/')[0];
						seq = parseInt(lastSeqStr, 10) + 1;
					}
					refWoNo = `${String(seq).padStart(5, '0')}${suffix}`;

					const repairedItems = [{
						id: 'wo_item_1',
						category: 'STORING',
						item: note,
						remark: `Storing darurat di ${locationDetail}`,
						status: 'PENDING',
						mechanic_notes: '',
						repaired_at: null
					}];

					await sql`
						INSERT INTO fleet.work_orders (
							wo_no,
							unit_id,
							driver_id,
							keluhan_driver,
							maint_category,
							job_location,
							status,
							status_reason,
							operational_reason,
							wo_date,
							checklist_items,
							repaired_items,
							created_at,
							created_by
						) VALUES (
							${refWoNo},
							${tripData?.nomor_unit || 'UNKNOWN'},
							${tripData?.payroll_id || tripData?.nama_karyawan || null},
							${note},
							'STORING',
							${locationDetail},
							'Open',
							'Unit Storing di Jalan pada Perjalanan Trip',
							${'Trip No: ' + (tripData?.no_surat_tugas || tripId)},
							NOW(),
							${sql.json(repairedItems.map(r => ({ item: r.item, status: 'Not Yet' })))},
							${sql.json(repairedItems)},
							NOW(),
							${createdBy}
						)
					`;
				}
			}

			// 3. Kategori HSE: Eskalasi ke Laporan Insiden di qhse.incidents jika diminta
			if (category === 'HSE' && escalateHse) {
				if (!refIncidentNo) {
					const countRes = await sql`SELECT count(*) FROM qhse.incidents`;
					const seq = (parseInt(countRes[0].count, 10) + 1).toString().padStart(4, '0');
					refIncidentNo = `INC-${new Date().getFullYear()}-${seq}`;

					await sql`
						INSERT INTO qhse.incidents (
							incident_number,
							incident_date,
							incident_type,
							severity,
							unit_id,
							driver_id,
							location,
							description,
							status
						) VALUES (
							${refIncidentNo},
							NOW(),
							${incidentType},
							'LOW',
							${tripData?.unit_id ? String(tripData.unit_id) : null},
							${tripData?.driver_id ? String(tripData.driver_id) : null},
							${locationDetail},
							${note},
							'OPEN'
						)
					`;
				}
			}

			// 4. Upsert Catatan Trip
			await sql`
				INSERT INTO fleet.trip_notes (
					trip_id,
					point,
					note,
					category,
					ref_wo_no,
					ref_incident_no,
					is_escalated_hse,
					location_detail,
					created_by,
					created_at,
					updated_at
				) VALUES (
					${tripId},
					${point},
					${note},
					${category},
					${category === 'STORING' ? refWoNo : null},
					${category === 'HSE' && escalateHse ? refIncidentNo : null},
					${category === 'HSE' && escalateHse},
					${locationDetail},
					${createdBy},
					NOW(),
					NOW()
				)
				ON CONFLICT (trip_id, point) DO UPDATE SET 
					note = EXCLUDED.note,
					category = EXCLUDED.category,
					ref_wo_no = COALESCE(EXCLUDED.ref_wo_no, fleet.trip_notes.ref_wo_no),
					ref_incident_no = COALESCE(EXCLUDED.ref_incident_no, fleet.trip_notes.ref_incident_no),
					is_escalated_hse = EXCLUDED.is_escalated_hse,
					location_detail = EXCLUDED.location_detail,
					created_by = EXCLUDED.created_by,
					updated_at = CURRENT_TIMESTAMP
			`;

			return { 
				success: true, 
				category, 
				refWoNo, 
				refIncidentNo,
				message: category === 'STORING'
					? `Catatan tersimpan & Tiket Work Order Storing ${refWoNo} berhasil diterbitkan ke Bengkel.`
					: (escalateHse 
						? `Catatan tersimpan & Laporan Insiden ${refIncidentNo} berhasil dieskalasi ke QHSE.`
						: `Catatan lapangan berhasil disimpan.`)
			};
		} catch (error: any) {
			console.error("Failed to save note:", error);
			return fail(500, { success: false, message: 'Gagal menyimpan catatan: ' + (error?.message || error) });
		}
	}
};
