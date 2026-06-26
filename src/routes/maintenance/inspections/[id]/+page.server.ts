import type { PageServerLoad, Actions } from './$types';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';
import { error, fail } from '@sveltejs/kit';

const sql = postgres(env.DATABASE_URL || 'postgres://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db');

export const load: PageServerLoad = async ({ params }) => {
	const woNo = decodeURIComponent(params.id);

	try {
		const woQuery = await sql`
			SELECT 
				w.*, 
				u.nama_karyawan as mechanic_name,
				d.nama_karyawan as driver_name
			FROM fleet.work_orders w
			LEFT JOIN master.m_karyawan u ON w.mechanic_id = u.payroll_id
			LEFT JOIN master.m_karyawan d ON w.driver_id = d.payroll_id
			WHERE w.wo_no = ${woNo}
			LIMIT 1
		`;

		if (woQuery.length === 0) {
			throw error(404, 'Work Order not found');
		}

		const wo = woQuery[0];

		// Determine if this WO is editable by inspector (only when status is Open)
		const isEditable = wo.status?.toLowerCase() === 'open';

		// Fetch units for edit dropdown
		let units: any[] = [];
		if (isEditable) {
			const unitsQuery = await sql`
				SELECT nomor_unit as no_unit FROM fleet.unit WHERE is_active = true ORDER BY nomor_unit ASC
			`;
			units = unitsQuery;
		}

		return {
			workOrder: wo,
			isEditable,
			units
		};

	} catch (err: any) {
		if (err?.status === 404) throw err;
		console.error("Error fetching work order for inspector:", err);
		throw error(500, 'Internal Server Error');
	}
};

export const actions: Actions = {
	updateWo: async ({ request, params }) => {
		const woNo = decodeURIComponent(params.id);
		const data = await request.formData();

		// Verify status is still Open before allowing edit
		const woCheck = await sql`SELECT status FROM fleet.work_orders WHERE wo_no = ${woNo} LIMIT 1`;
		if (woCheck.length === 0 || woCheck[0].status?.toLowerCase() !== 'open') {
			return fail(403, { success: false, message: 'Work Order ini sudah tidak bisa diedit karena statusnya bukan Open.' });
		}

		const unit_id = data.get('unit_id')?.toString() || '';
		const keluhan_driver = data.get('keluhan_driver')?.toString() || '';
		const maint_category = data.get('maint_category')?.toString() || '';
		const kilometer = parseInt(data.get('kilometer')?.toString() || '0') || 0;
		const hourmeter = parseInt(data.get('hourmeter')?.toString() || '0') || 0;

		try {
			await sql`
				UPDATE fleet.work_orders SET
					unit_id = ${unit_id},
					keluhan_driver = ${keluhan_driver},
					maint_category = ${maint_category},
					kilometer = ${kilometer},
					hourmeter = ${hourmeter},
					updated_at = NOW()
				WHERE wo_no = ${woNo}
			`;

			return { success: true, message: 'Work Order berhasil diperbarui.' };
		} catch (err) {
			console.error("Error updating WO:", err);
			return fail(500, { success: false, message: 'Gagal menyimpan perubahan.' });
		}
	}
};
