import type { PageServerLoad, Actions } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';

const sql = postgres(env.DATABASE_URL || 'postgres://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db');

export const load: PageServerLoad = async () => {
	try {
		// Fetch units and their primary active drivers
		const unitsWithDrivers = await sql`
			SELECT 
				u.nomor_unit as no_unit, 
				k.nama_karyawan as driver_name,
				k.payroll_id as driver_id
			FROM fleet.unit u
			LEFT JOIN fleet.unit_driver_assignment a ON u.id = a.unit_id AND a.is_aktif = true AND a.posisi = 'SUPIR_UTAMA'
			LEFT JOIN master.m_drivers d ON a.driver_id = d.id
			LEFT JOIN master.m_karyawan k ON d.karyawan_id = k.id
			WHERE u.is_active = true
			ORDER BY u.nomor_unit ASC
		`;

		// Fetch all active drivers for the datalist
		const driversList = await sql`
			SELECT k.payroll_id as id, k.nama_karyawan as name
			FROM master.m_drivers d
			JOIN master.m_karyawan k ON d.karyawan_id = k.id
			WHERE k.aktif = 'Y'
			ORDER BY k.nama_karyawan ASC
		`;
		
		return {
			units: unitsWithDrivers.map(u => ({
				no_unit: u.no_unit,
				driver_name: u.driver_name || '',
				driver_id: u.driver_id || ''
			})).filter(u => u.no_unit),
			drivers: driversList
		};
	} catch (error) {
		console.error("Database error loading create WO data:", error);
		return { units: [] };
	}
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		
		const unit_id = data.get('unit_id')?.toString();
		const driver_id = data.get('driver_id')?.toString() || null;
		const keluhan_driver = data.get('keluhan_driver')?.toString();
		const maint_category = data.get('maint_category')?.toString() || 'Regular Repair';
		
		const kilometer = parseInt(data.get('kilometer')?.toString() || '0') || null;
		const hourmeter = parseInt(data.get('hourmeter')?.toString() || '0') || null;
		const vendor = data.get('vendor')?.toString() || null;
		const project_code = data.get('project_code')?.toString() || null;
		const job_location = data.get('job_location')?.toString() || null;

		// Get user from cookies
		let createdBy = 'system';
		const userDataCookie = cookies.get('user_data');
		if (userDataCookie) {
			try {
				const user = JSON.parse(userDataCookie);
				createdBy = user.username || 'system';
			} catch (e) {}
		}

		if (!unit_id || !keluhan_driver) {
			return fail(400, { missing: true, message: 'Unit and Keluhan Driver are required' });
		}

		try {
			// Generate WO Number
			const now = new Date();
			const month = String(now.getMonth() + 1).padStart(2, '0');
			const year = now.getFullYear();
			const suffix = `/WO/WSP/${month}/${year}`;

			// Find highest sequence for this month
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

			// Default checklist template for new WO (can be expanded later)
			const defaultChecklist = [
				{ item: "Lampu Kepala", remark: "", status: "Not Yet" },
				{ item: "Lampu Rem", remark: "", status: "Not Yet" },
				{ item: "Lampu Sein", remark: "", status: "Not Yet" },
				{ item: "Klakson", remark: "", status: "Not Yet" },
				{ item: "Wiper", remark: "", status: "Not Yet" }
			];

			// Insert to Work Orders
			await sql`
				INSERT INTO fleet.work_orders (
					wo_no,
					unit_id,
					driver_id,
					keluhan_driver,
					maint_category,
					kilometer,
					hourmeter,
					vendor,
					project_code,
					job_location,
					status,
					wo_date,
					checklist_items,
					created_at,
					created_by
				) VALUES (
					${newWoNo},
					${unit_id},
					${driver_id},
					${keluhan_driver},
					${maint_category},
					${kilometer},
					${hourmeter},
					${vendor},
					${project_code},
					${job_location},
					'Open',
					NOW(),
					${JSON.stringify(defaultChecklist)},
					NOW(),
					${createdBy}
				)
			`;

			// Success! Redirect to the detail page of the newly created WO
			throw redirect(303, `/fms/maintenance/${encodeURIComponent(newWoNo)}`);

		} catch (err) {
			console.error("Failed to create WO:", err);
			// Redirects are thrown as errors in SvelteKit, catch and rethrow if it's a redirect
			if (err && err.status === 303) {
				throw err;
			}
			return fail(500, { error: true, message: 'Failed to save Work Order to database' });
		}
	}
};
