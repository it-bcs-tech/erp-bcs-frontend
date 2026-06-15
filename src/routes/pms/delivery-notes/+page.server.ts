import type { PageServerLoad } from './$types';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';
import { error } from '@sveltejs/kit';

const sql = postgres(env.DATABASE_URL || 'postgres://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db');

export const load: PageServerLoad = async () => {
	try {
		// Fetch all DN Headers
		const headers = await sql`
			SELECT h.*, w.unit_id, k.nama_karyawan as picker_name
			FROM fleet.maintenance_dn_header h
			LEFT JOIN fleet.work_orders w ON h.wo_no = w.wo_no
			LEFT JOIN master.m_karyawan k ON h.picked_by = k.payroll_id
			ORDER BY h.created_at DESC
		`;

		// Fetch all DN Details joined with materials
		const details = await sql`
			SELECT d.*, m.name as material_name, m.material_code, m.stock, m.id as m_id
			FROM fleet.maintenance_dn_detail d
			LEFT JOIN master.m_materials m ON d.material_id = m.material_code
		`;

		// Map details to their respective headers
		const dns = headers.map(header => {
			const myDetails = details.filter(d => d.dn_no === header.dn_no);
			// Determine status: 
			// If picked_by is set, it's Issued/Completed
			const status = header.picked_by ? 'Issued' : 'Pending';
			
			return {
				...header,
				status,
				details: myDetails
			};
		});

		// Fetch warehouse staff for picker dropdown
		const warehouseStaff = await sql`
			SELECT k.payroll_id as id, k.nama_karyawan as name 
			FROM master.m_karyawan k
			LEFT JOIN master.m_title t ON k.title = t.title_code
			LEFT JOIN master.m_dept d ON k.dept_id = d.dept_code
			WHERE k.aktif = 'Y' 
			AND (
				t.title ILIKE '%warehouse%' OR t.title ILIKE '%gudang%' OR t.title ILIKE '%storage%' OR t.title ILIKE '%inventory%' OR
				d.dept_name ILIKE '%warehouse%' OR d.dept_name ILIKE '%gudang%' OR d.dept_name ILIKE '%storage%' OR d.dept_name ILIKE '%procurement%'
			)
			ORDER BY k.nama_karyawan ASC
		`;

		return {
			deliveryNotes: dns,
			warehouseStaff
		};

	} catch (err) {
		console.error("Error fetching Delivery Notes:", err);
		throw error(500, 'Internal Server Error');
	}
};

export const actions = {
	issueDN: async ({ request, cookies }) => {
		const data = await request.formData();
		const dnNo = data.get('dn_no')?.toString();
		const pickerName = data.get('picker_name')?.toString();
		const issuedPartsJson = data.get('issued_parts')?.toString();

		if (!dnNo || !pickerName || !issuedPartsJson) {
			return { success: false, message: 'Missing required data' };
		}

		// Get user from cookies
		let systemUser = 'system';
		const userDataCookie = cookies.get('user_data');
		if (userDataCookie) {
			try {
				const user = JSON.parse(userDataCookie);
				systemUser = user.username || 'system';
			} catch (e) {}
		}

		try {
			const parts = JSON.parse(issuedPartsJson);
			
			return await sql.begin(async (tx) => {
				const totalQty = parts.reduce((acc: number, p: any) => acc + (parseFloat(p.qty_actual) || 0), 0);
				if (totalQty <= 0) {
					throw new Error('Total barang yang dikeluarkan (Actual Issue) tidak boleh 0.');
				}

				// 1. Update DN Header
				await tx`
					UPDATE fleet.maintenance_dn_header
					SET picked_by = ${pickerName}, updated_by = ${systemUser}, updated_at = NOW()
					WHERE dn_no = ${dnNo}
				`;

				// 2. Loop through issued parts
				for (const part of parts) {
					const qtyActual = parseFloat(part.qty_actual) || 0;
					const price = parseFloat(part.price) || 0;
					const materialDbId = parseInt(part.material_db_id);

					// A. Validate Stock Server-side
					if (qtyActual > 0) {
						const stockCheck = await tx`SELECT stock, name FROM master.m_materials WHERE id = ${materialDbId} FOR UPDATE`;
						if (stockCheck.length > 0 && stockCheck[0].stock < qtyActual) {
							throw new Error(`Stok barang "${stockCheck[0].name}" tidak mencukupi (Stok: ${stockCheck[0].stock}, Diminta: ${qtyActual}).`);
						}
					}

					// B. Update DN Detail
					await tx`
						UPDATE fleet.maintenance_dn_detail
						SET 
							qty_actual = ${qtyActual},
							total = ${qtyActual * price},
							updated_at = NOW()
						WHERE id = ${part.detail_id}
					`;

					// B. Deduct Stock & Insert Ledger (only if qty > 0)
					if (qtyActual > 0) {
						// Update Stock
						await tx`
							UPDATE master.m_materials
							SET stock = stock - ${qtyActual}, updated_at = NOW()
							WHERE id = ${materialDbId}
						`;

						// Insert Transaction Log
						await tx`
							INSERT INTO master.m_inventory_transactions (
								material_id, transaction_type, qty, reference_no, note, created_by
							) VALUES (
								${materialDbId}, 'OUT', ${qtyActual}, ${dnNo}, ${'Issued to ' + pickerName}, ${systemUser}
							)
						`;
					}
				}

				return { success: true };
			});

		} catch (err: any) {
			console.error("Failed to issue DN:", err);
			return { success: false, message: err.message || 'Failed to issue materials' };
		}
	}
};
