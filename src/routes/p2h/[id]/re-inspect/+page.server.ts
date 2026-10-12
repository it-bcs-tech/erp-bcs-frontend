import type { PageServerLoad, Actions } from './$types';
import { error, redirect, fail } from '@sveltejs/kit';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';
import { verifyUserData } from '$lib/server/auth';

const sql = postgres(env.DATABASE_URL || 'postgres://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db');

function parseJsonSafe(val: any, fallback: any = []) {
	if (!val) return fallback;
	if (typeof val === 'object') return val;
	try {
		const parsed = JSON.parse(val);
		return typeof parsed === 'string' ? parseJsonSafe(parsed, fallback) : parsed;
	} catch (e) {
		return fallback;
	}
}

export const load: PageServerLoad = async ({ params }) => {
	const idOrNo = decodeURIComponent(params.id);

	try {
		const inspections = await sql`
			SELECT 
				i.*,
				k.nama_karyawan as driver_name,
				w.wo_no,
				w.status as wo_status,
				w.repaired_items,
				COALESCE(u.nama_karyawan, w.mechanic_id) as mechanic_name
			FROM fleet.vehicle_inspections i
			LEFT JOIN master.m_karyawan k ON i.driver_id = k.payroll_id
			LEFT JOIN fleet.work_orders w ON i.wo_no = w.wo_no
			LEFT JOIN master.m_karyawan u ON w.mechanic_id = u.payroll_id
			WHERE i.inspection_no = ${idOrNo} OR i.id::text = ${idOrNo} OR i.wo_no = ${idOrNo}
			LIMIT 1
		`;

		let insp: any = null;

		if (inspections.length > 0) {
			const row = inspections[0];
			insp = {
				id: row.id,
				inspectionNo: row.inspection_no,
				unitId: row.unit_id,
				unitType: row.unit_type || 'Truck',
				driverName: row.driver_name || row.driver_id || 'Tanpa Driver',
				odometer: row.odometer,
				status: row.status,
				woNo: row.wo_no,
				woStatus: row.wo_status,
				mechanicName: row.mechanic_name,
				repairedItems: parseJsonSafe(row.repaired_items, [])
			};
		} else {
			// Fallback: check work order directly
			const wos = await sql`
				SELECT 
					w.*,
					k.nama_karyawan as driver_name,
					COALESCE(u.nama_karyawan, w.mechanic_id) as mechanic_name
				FROM fleet.work_orders w
				LEFT JOIN master.m_karyawan k ON w.driver_id = k.payroll_id
				LEFT JOIN master.m_karyawan u ON w.mechanic_id = u.payroll_id
				WHERE w.wo_no = ${idOrNo} OR w.id::text = ${idOrNo}
				LIMIT 1
			`;

			if (wos.length === 0) {
				throw error(404, 'Data inspeksi atau Work Order tidak ditemukan.');
			}

			const wo = wos[0];
			insp = {
				id: `wo_${wo.id}`,
				inspectionNo: wo.inspection_no || wo.wo_no,
				unitId: wo.unit_id,
				unitType: 'Truck',
				driverName: wo.driver_name || wo.driver_id || 'Tanpa Driver',
				odometer: wo.kilometer,
				status: wo.status,
				woNo: wo.wo_no,
				woStatus: wo.status,
				mechanicName: wo.mechanic_name,
				repairedItems: parseJsonSafe(wo.repaired_items, [])
			};
		}

		return {
			inspection: insp
		};
	} catch (err: any) {
		if (err?.status === 404) throw err;
		console.error("Error loading mobile re-inspect page:", err);
		throw error(500, 'Gagal memuat halaman re-inspeksi.');
	}
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const inspection_no = data.get('inspection_no')?.toString();
		const wo_no = data.get('wo_no')?.toString();
		const unit_id = data.get('unit_id')?.toString();
		const reinspect_notes = data.get('reinspect_notes')?.toString() || '';
		const items_verification_raw = data.get('items_verification')?.toString() || '[]';

		let items_verification: any[] = [];
		try {
			items_verification = JSON.parse(items_verification_raw);
		} catch (e) {
			items_verification = [];
		}

		let inspectorName = 'Inspector QC';
		const userDataCookie = cookies.get('user_data');
		if (userDataCookie) {
			try {
				const user = verifyUserData(userDataCookie);
				inspectorName = user.nama || user.username || 'Inspector QC';
			} catch (e) {}
		}

		if (!wo_no) {
			return fail(400, { missing: true, message: 'Nomor Work Order tidak valid.' });
		}

		try {
			const allPassed = items_verification.every(i => i.verified_ok === true);

			if (!allPassed) {
				// Send back to workshop
				await sql.begin(async sqlTx => {
					await sqlTx`
						UPDATE fleet.work_orders
						SET status = 'Proses',
						    recommendation = ${'Revisi Re-inspeksi: ' + reinspect_notes},
						    updated_at = NOW()
						WHERE wo_no = ${wo_no}
					`;

					if (inspection_no) {
						await sqlTx`
							UPDATE fleet.vehicle_inspections
							SET notes = COALESCE(notes, '') || ${`\n[${new Date().toISOString()}] Re-Inspeksi REVISI oleh ${inspectorName}: ${reinspect_notes}`},
							    updated_at = NOW()
							WHERE inspection_no = ${inspection_no}
						`;
					}
				});

				throw redirect(303, `/p2h/${encodeURIComponent(inspection_no || wo_no)}`);
			}

			// ALL PASSED: Close WO, Close Inspection, set unit to AT_POOL
			await sql.begin(async sqlTx => {
				await sqlTx`
					UPDATE fleet.work_orders
					SET status = 'Closed',
					    closed_at = NOW(),
					    conclusion = ${'Lolos Uji Re-Inspeksi & QC oleh ' + inspectorName + '. ' + reinspect_notes},
					    updated_at = NOW()
					WHERE wo_no = ${wo_no}
				`;

				if (inspection_no) {
					await sqlTx`
						UPDATE fleet.vehicle_inspections
						SET status = 'CLOSED',
						    notes = COALESCE(notes, '') || ${`\n[${new Date().toISOString()}] Re-Inspeksi LOLOS oleh ${inspectorName}. Unit siap beroperasi.`},
						    updated_at = NOW()
						WHERE inspection_no = ${inspection_no}
					`;
				}

				if (unit_id) {
					await sqlTx`
						UPDATE fleet.unit
						SET current_state = 'AT_POOL',
						    updated_at = NOW()
						WHERE nomor_unit = ${unit_id}
					`;
				}
			});

			throw redirect(303, `/p2h/${encodeURIComponent(inspection_no || wo_no)}`);

		} catch (error: any) {
			if (error?.status === 303) throw error;
			console.error("Error submitting mobile re-inspection:", error);
			return fail(500, { error: true, message: 'Gagal menyelesaikan proses re-inspeksi.' });
		}
	}
};
