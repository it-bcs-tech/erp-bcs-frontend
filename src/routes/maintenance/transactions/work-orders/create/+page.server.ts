import type { PageServerLoad, Actions } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';
import { verifyUserData } from '$lib/server/auth';

const sql = postgres(env.DATABASE_URL || 'postgres://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db');

export const load: PageServerLoad = async ({ url }) => {
	const initialUnit = url.searchParams.get('unit') || '';
	const initialCategory = url.searchParams.get('category') || 'Regular Repair';

	try {
		// 1. Units
		const units = await sql`
			SELECT u.nomor_unit as no_unit, u.tipe_kendaraan, u.odometer
			FROM fleet.unit u
			WHERE u.is_active = true
			ORDER BY u.nomor_unit ASC
		`;

		// 2. Mechanics
		const mechanics = await sql`
			SELECT payroll_id as id, nama_karyawan as name
			FROM master.m_karyawan
			WHERE aktif = 'Y'
			ORDER BY nama_karyawan ASC
		`;

		// 3. Drivers
		const drivers = await sql`
			SELECT k.payroll_id as id, k.nama_karyawan as name
			FROM master.m_drivers d
			JOIN master.m_karyawan k ON d.karyawan_id = k.id
			WHERE k.aktif = 'Y'
			ORDER BY k.nama_karyawan ASC
		`;

		return {
			units: units.map(u => ({
				noUnit: u.no_unit,
				type: u.tipe_kendaraan,
				odometer: u.odometer || 0
			})),
			mechanics,
			drivers,
			initialUnit,
			initialCategory
		};
	} catch (error) {
		console.error("Database error loading WO create data:", error);
		return { units: [], mechanics: [], drivers: [], initialUnit: '', initialCategory: 'Regular Repair' };
	}
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();

		const unit_id = data.get('unit_id')?.toString();
		const driver_id = data.get('driver_id')?.toString() || null;
		const mechanic_id = data.get('mechanic_id')?.toString() || null;
		const helper_mechanic_id = data.get('helper_mechanic_id')?.toString() || null;
		const maint_category = data.get('maint_category')?.toString() || 'Regular Repair';
		const keluhan_driver = data.get('keluhan_driver')?.toString();
		const kilometer = parseInt(data.get('kilometer')?.toString() || '0') || null;
		const hourmeter = parseInt(data.get('hourmeter')?.toString() || '0') || null;
		const job_location = data.get('job_location')?.toString() || 'Workshop Pool Utama';
		const items_raw = data.get('items')?.toString() || '[]';

		let items: string[] = [];
		try {
			items = JSON.parse(items_raw);
		} catch (e) {
			items = [];
		}

		let createdBy = 'system';
		const userDataCookie = cookies.get('user_data');
		if (userDataCookie) {
			try {
				const user = verifyUserData(userDataCookie);
				createdBy = user.nama || user.username || 'system';
			} catch (e) {}
		}

		if (!unit_id || !keluhan_driver) {
			return fail(400, { missing: true, message: 'Nomor Unit dan Keluhan/Pekerjaan wajib diisi!' });
		}

		try {
			// Generate WO Number
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
			const newWoNo = `${String(seq).padStart(5, '0')}${suffix}`;

			// Build repaired_items array
			const repairedItems = items.length > 0
				? items.map((itemStr, idx) => ({
					id: `wo_item_${idx + 1}`,
					category: maint_category,
					item: itemStr,
					remark: 'Pekerjaan perbaikan',
					status: 'PENDING',
					mechanic_notes: '',
					repaired_at: null
				}))
				: [{
					id: 'wo_item_1',
					category: maint_category,
					item: keluhan_driver,
					remark: 'Pekerjaan perbaikan utama',
					status: 'PENDING',
					mechanic_notes: '',
					repaired_at: null
				}];

			const initialStatus = mechanic_id ? 'Proses' : 'Open';

			await sql`
				INSERT INTO fleet.work_orders (
					wo_no,
					unit_id,
					driver_id,
					mechanic_id,
					helper_mechanic_id,
					keluhan_driver,
					maint_category,
					kilometer,
					hourmeter,
					job_location,
					status,
					wo_date,
					checklist_items,
					repaired_items,
					created_at,
					created_by
				) VALUES (
					${newWoNo},
					${unit_id},
					${driver_id},
					${mechanic_id},
					${helper_mechanic_id},
					${keluhan_driver},
					${maint_category},
					${kilometer},
					${hourmeter},
					${job_location},
					${initialStatus},
					NOW(),
					${JSON.stringify(repairedItems.map(r => ({ item: r.item, status: 'Not Yet' })))},
					${JSON.stringify(repairedItems)},
					NOW(),
					${createdBy}
				)
			`;

			// Lock vehicle state to MAINTENANCE
			await sql`
				UPDATE fleet.unit
				SET current_state = 'MAINTENANCE',
				    odometer = COALESCE(${kilometer}, odometer),
				    updated_at = NOW()
				WHERE nomor_unit = ${unit_id}
			`;

			throw redirect(303, `/maintenance/transactions/work-orders/${encodeURIComponent(newWoNo)}`);

		} catch (error: any) {
			if (error?.status === 303) throw error;
			console.error("Failed to create manual WO:", error);
			return fail(500, { error: true, message: 'Gagal membuat Work Order ke database.' });
		}
	}
};
