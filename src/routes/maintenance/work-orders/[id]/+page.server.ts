import type { PageServerLoad } from './$types';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';
import { error } from '@sveltejs/kit';
import { verifyUserData } from '$lib/server/auth';

const sql = postgres(env.DATABASE_URL || 'postgres://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db');

export const load: PageServerLoad = async ({ params }) => {
	// The id parameter from URL is encoded if it contains slashes, e.g. "01427%2FWO%2FWSP%2F06%2F2026"
	const woNo = decodeURIComponent(params.id);

	try {
		// 1. Fetch WO
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

		// Parse the JSONB checklist if it's a string, or just use it if it's already an object
		let checklist = [];
		if (wo.checklist_items) {
			try {
				checklist = typeof wo.checklist_items === 'string' ? JSON.parse(wo.checklist_items) : wo.checklist_items;
			} catch (e) {
				console.error("Error parsing checklist JSON", e);
			}
		}
		wo.checklist_parsed = checklist;

		// 2. Fetch DN Header
		const dnHeaderQuery = await sql`
			SELECT * FROM fleet.maintenance_dn_header 
			WHERE wo_no = ${woNo}
			LIMIT 1
		`;
		const dnHeader = dnHeaderQuery.length > 0 ? dnHeaderQuery[0] : null;

		// 3. Fetch DN Details if header exists
		let dnDetails = [];
		if (dnHeader) {
			dnDetails = await sql`
				SELECT d.*, m.name as material_name
				FROM fleet.maintenance_dn_detail d
				LEFT JOIN master.m_materials m ON 
					CASE 
						WHEN d.material_id ~ '^[0-9]+$' THEN m.id = d.material_id::integer 
						ELSE m.material_code = d.material_id 
					END
				WHERE d.dn_no = ${dnHeader.dn_no}
			`;
		}

		// 4. Fetch all active materials for the Request Modal
		const materials = await sql`
			SELECT id, name, material_code, uom, standard_price, stock 
			FROM master.m_materials 
			WHERE is_active = true 
			ORDER BY name ASC
		`;

		// 5. Fetch all mechanics for Assign Mechanic Modal (Filtered by mechanic titles/departments)
		const mechanics = await sql`
			SELECT k.payroll_id as id, k.nama_karyawan as name 
			FROM master.m_karyawan k
			LEFT JOIN master.m_title t ON k.title = t.title_code
			LEFT JOIN master.m_dept d ON k.dept_id = d.dept_code
			LEFT JOIN master.m_division v ON k.div_id = v.div_code
			LEFT JOIN master.m_directorat dir ON k.dir_id = dir.dir_code
			WHERE k.aktif = 'Y' 
			AND (
				t.title ILIKE '%mechanic%' OR t.title ILIKE '%mekanik%' OR 
				d.dept_name ILIKE '%mechanic%' OR d.dept_name ILIKE '%mekanik%' OR d.dept_name ILIKE '%maint%' OR
				v.div_name ILIKE '%mechanic%' OR v.div_name ILIKE '%mekanik%' OR v.div_name ILIKE '%maint%' OR
				dir.dir_name ILIKE '%mechanic%' OR dir.dir_name ILIKE '%mekanik%' OR dir.dir_name ILIKE '%maint%'
			)
			ORDER BY k.nama_karyawan ASC
		`;

		return {
			workOrder: wo,
			dnHeader,
			dnDetails,
			materials: materials.map(m => ({
				id: m.id,
				name: m.name,
				code: m.material_code,
				uom: m.uom,
				price: m.standard_price,
				stock: parseFloat(m.stock) || 0
			})),
			mechanics
		};

	} catch (err) {
		console.error("Error fetching work order detail:", err);
		throw error(500, 'Internal Server Error');
	}
};

export const actions = {
	assignMechanic: async ({ request, params }) => {
		const woNo = decodeURIComponent(params.id);
		const data = await request.formData();
		const mechanicId = data.get('mechanic_id')?.toString();

		if (!mechanicId) {
			return { success: false, message: 'Please select a mechanic' };
		}

		try {
			await sql`
				UPDATE fleet.work_orders 
				SET mechanic_id = ${mechanicId}, updated_at = NOW() 
				WHERE wo_no = ${woNo}
			`;
			return { success: true };
		} catch (err) {
			console.error("Failed to assign mechanic:", err);
			return { success: false, message: 'Failed to assign mechanic' };
		}
	},

	updateWO: async ({ request, params }) => {
		const woNo = decodeURIComponent(params.id);
		const data = await request.formData();
		
		const status = data.get('status')?.toString();
		const problem = data.get('problem')?.toString();
		const cause = data.get('cause')?.toString();
		const checklistJson = data.get('checklist_items')?.toString();
		
		try {
			let checklistItems = '[]';
			if (checklistJson) {
				JSON.parse(checklistJson);
				checklistItems = checklistJson;
			}
			
			const isClosed = status?.toLowerCase().includes('close') || status?.toLowerCase().includes('complete');
			
			await sql`
				UPDATE fleet.work_orders 
				SET 
					status = COALESCE(${status}, status),
					problem = COALESCE(${problem}, problem),
					cause = COALESCE(${cause}, cause),
					checklist_items = ${checklistItems}::jsonb,
					closed_at = CASE WHEN ${isClosed} THEN NOW() ELSE closed_at END,
					updated_at = NOW()
				WHERE wo_no = ${woNo}
			`;
			
			return { success: true };
		} catch (err) {
			console.error("Failed to update WO:", err);
			return { success: false, message: 'Failed to update Work Order' };
		}
	},

	createDN: async ({ request, params, cookies }) => {
		const woNo = decodeURIComponent(params.id);
		const data = await request.formData();
		const note = data.get('note')?.toString() || '';
		
		let parts = [];
		try {
			parts = JSON.parse(data.get('requested_parts')?.toString() || '[]');
		} catch (e) {
			return { success: false, message: 'Invalid parts data' };
		}

		if (parts.length === 0) {
			return { success: false, message: 'No parts requested' };
		}

		// Get user from cookies
		let createdBy = 'system';
		const userDataCookie = cookies.get('user_data');
		if (userDataCookie) {
			try {
				const user = verifyUserData(userDataCookie);
				createdBy = user.username || 'system';
			} catch (e) {}
		}

		try {
			// Fetch unit_id from work_orders for target_unit
			const woRec = await sql`SELECT unit_id FROM fleet.work_orders WHERE wo_no = ${woNo}`;
			const targetUnit = woRec.length > 0 ? woRec[0].unit_id : null;

			// Begin Transaction
			return await sql.begin(async (tx) => {
				// 1. Generate DN Sequence
				const now = new Date();
				const month = String(now.getMonth() + 1).padStart(2, '0');
				const year = now.getFullYear();
				
				const lastDn = await tx`
					SELECT dn_no 
					FROM fleet.maintenance_dn_header 
					WHERE dn_no LIKE ${'%/DN/WSP/' + month + '/' + year}
					ORDER BY id DESC LIMIT 1
				`;
				
				let sequence = 1;
				if (lastDn.length > 0) {
					const lastSeq = parseInt(lastDn[0].dn_no.split('/')[0], 10);
					if (!isNaN(lastSeq)) sequence = lastSeq + 1;
				}
				
				const dnNo = `${String(sequence).padStart(5, '0')}/DN/WSP/${month}/${year}`;

				// 2. Insert DN Header
				await tx`
					INSERT INTO fleet.maintenance_dn_header (
						dn_no, dn_date, wo_no, target_unit, note, created_at, created_by
					) VALUES (
						${dnNo}, CURRENT_DATE, ${woNo}, ${targetUnit}, ${note}, NOW(), ${createdBy}
					)
				`;

				// 3. Insert DN Details
				for (const part of parts) {
					const qty = parseFloat(part.qty) || 0;
					if (qty <= 0) continue;

					// Find price if needed
					const price = parseFloat(part.price) || 0;

					await tx`
						INSERT INTO fleet.maintenance_dn_detail (
							dn_no, material_id, qty_request, price, total, created_at
						) VALUES (
							${dnNo}, ${part.code}, ${qty}, ${price}, ${qty * price}, NOW()
						)
					`;
				}

				return { success: true, dnNo };
			});

		} catch (err) {
			console.error("Failed to create DN:", err);
			return { success: false, message: 'Failed to request materials' };
		}
	}
};
