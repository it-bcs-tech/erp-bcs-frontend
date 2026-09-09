import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';
import { fail } from '@sveltejs/kit';
import { formatAuditUser, verifyUserData } from '$lib/server/auth';

export const load: PageServerLoad = async ({ url }) => {
	try {
		const search = (url.searchParams.get('q') || '').trim().toLowerCase();

		// 1. Fetch Maintenance Delivery Notes from fleet schema
		const maintHeaders = await sql`
			SELECT h.*, w.unit_id, k.nama_karyawan as picker_name
			FROM fleet.maintenance_dn_header h
			LEFT JOIN fleet.work_orders w ON h.wo_no = w.wo_no
			LEFT JOIN master.m_karyawan k ON h.picked_by = k.payroll_id
			ORDER BY h.created_at DESC
		`;

		const maintDetails = await sql`
			SELECT d.*, m.name as material_name, m.material_code, m.spec, m.uom, m.stock, m.id as m_id
			FROM fleet.maintenance_dn_detail d
			LEFT JOIN master.m_materials m ON 
				CASE 
					WHEN d.material_id ~ '^[0-9]+$' THEN m.id = d.material_id::integer 
					ELSE m.material_code = d.material_id 
				END
		`;

		const maintenanceDNs = maintHeaders.map((header: any) => {
			const myDetails = maintDetails.filter((d: any) => d.dn_no === header.dn_no);
			const status = header.picked_by ? 'Issued' : 'Pending';
			return {
				...header,
				status,
				details: myDetails
			};
		});

		// 2. Fetch Logistic / Inter-site Delivery Notes
		const logisticNotes = await sql`
			SELECT 
				dn.id,
				dn.dn_number as "dnNumber",
				to_char(dn.date, 'YYYY-MM-DD') as date,
				COALESCE(s1.loc_name, 'Gudang Pusat') as "fromSite",
				COALESCE(s2.loc_name, 'Pool Merak') as "toSite",
				COALESCE(dn.courier_name, '-') as "courierName",
				COALESCE(dn.vehicle_no, '-') as "vehicleNo",
				dn.status,
				dn.notes,
				COUNT(dni.id) as item_count,
				COALESCE(SUM(dni.qty), 0) as total_qty
			FROM procurement.delivery_note dn
			LEFT JOIN master.m_lokasi s1 ON s1.id = dn.from_site_id
			LEFT JOIN master.m_lokasi s2 ON s2.id = dn.to_site_id
			LEFT JOIN procurement.delivery_note_item dni ON dni.dn_id = dn.id
			GROUP BY dn.id, s1.loc_name, s2.loc_name
			ORDER BY dn.id DESC
		`;

		// 3. Fetch auxiliary data
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

		const sites = await sql`SELECT id, loc_code, loc_name FROM master.m_lokasi ORDER BY loc_code`;
		const materials = await sql`SELECT id, material_code, name, uom FROM master.m_materials WHERE is_active = true ORDER BY name`;

		// Filtering if search query is passed
		let filteredMaint = maintenanceDNs;
		let filteredLogistic = logisticNotes;
		if (search) {
			filteredMaint = filteredMaint.filter((dn: any) =>
				(dn.dn_no && dn.dn_no.toLowerCase().includes(search)) ||
				(dn.wo_no && dn.wo_no.toLowerCase().includes(search)) ||
				(dn.target_unit && dn.target_unit.toLowerCase().includes(search)) ||
				(dn.note && dn.note.toLowerCase().includes(search)) ||
				(dn.details && dn.details.some((d: any) => d.material_name && d.material_name.toLowerCase().includes(search)))
			);
			filteredLogistic = filteredLogistic.filter((dn: any) =>
				(dn.dnNumber && dn.dnNumber.toLowerCase().includes(search)) ||
				(dn.fromSite && dn.fromSite.toLowerCase().includes(search)) ||
				(dn.toSite && dn.toSite.toLowerCase().includes(search)) ||
				(dn.courierName && dn.courierName.toLowerCase().includes(search)) ||
				(dn.vehicleNo && dn.vehicleNo.toLowerCase().includes(search))
			);
		}

		return {
			maintenanceDNs: filteredMaint,
			logisticNotes: filteredLogistic,
			warehouseStaff,
			sites,
			materials
		};
	} catch (err: any) {
		console.error('Error loading Delivery Notes:', err);
		return {
			maintenanceDNs: [],
			logisticNotes: [],
			warehouseStaff: [],
			sites: [],
			materials: []
		};
	}
};

export const actions: Actions = {
	issueDN: async ({ request, cookies }) => {
		const data = await request.formData();
		const dnNo = data.get('dn_no')?.toString();
		const pickerName = data.get('picker_name')?.toString();
		const issuedPartsJson = data.get('issued_parts')?.toString();

		if (!dnNo || !pickerName || !issuedPartsJson) {
			return fail(400, { success: false, message: 'Data tidak lengkap' });
		}

		// Get user from cookies
		let systemUser = 'system';
		const userDataCookie = cookies.get('user_data');
		if (userDataCookie) {
			try {
				const user = verifyUserData(userDataCookie);
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

					// C. Deduct Stock & Insert Ledger (only if qty > 0)
					if (qtyActual > 0) {
						await tx`
							UPDATE master.m_materials
							SET stock = stock - ${qtyActual}, updated_at = NOW()
							WHERE id = ${materialDbId}
						`;

						await tx`
							INSERT INTO master.m_inventory_transactions (
								material_id, transaction_type, qty, reference_no, note, created_by
							) VALUES (
								${materialDbId}, 'OUT', ${qtyActual}, ${dnNo}, ${'Issued to ' + pickerName}, ${systemUser}
							)
						`;
					}
				}

				return { success: true, message: 'Barang berhasil dikeluarkan dari gudang!' };
			});
		} catch (err: any) {
			console.error('Failed to issue DN:', err);
			return fail(500, { success: false, message: err.message || 'Gagal memproses pengeluaran barang' });
		}
	},

	save: async ({ request, locals }) => {
		const formData = await request.formData();
		const date = (formData.get('date') as string) || new Date().toISOString().split('T')[0];
		const fromSiteId = formData.get('fromSiteId') ? parseInt(formData.get('fromSiteId') as string) : null;
		const toSiteId = formData.get('toSiteId') ? parseInt(formData.get('toSiteId') as string) : null;
		const courierName = (formData.get('courierName') as string || '').trim();
		const vehicleNo = (formData.get('vehicleNo') as string || '').trim().toUpperCase();
		const createdBy = formatAuditUser(locals.user);
		const notes = (formData.get('notes') as string || '').trim();
		const materialId = formData.get('materialId') ? parseInt(formData.get('materialId') as string) : null;
		const qty = parseFloat((formData.get('qty') as string) || '1');

		try {
			const now = new Date();
			const yymm = `${now.getFullYear().toString().slice(-2)}${(now.getMonth() + 1).toString().padStart(2, '0')}`;
			const [seqRow] = await sql`SELECT COUNT(*) as count FROM procurement.delivery_note`;
			const seq = (parseInt(seqRow?.count || '0') + 1).toString().padStart(4, '0');
			const dnNumber = `DN-${yymm}-${seq}`;

			const [dn] = await sql`
				INSERT INTO procurement.delivery_note (
					dn_number,
					date,
					from_site_id,
					to_site_id,
					courier_name,
					vehicle_no,
					status,
					notes,
					created_by
				) VALUES (
					${dnNumber},
					${date},
					${fromSiteId},
					${toSiteId},
					${courierName},
					${vehicleNo},
					'DELIVERED',
					${notes},
					${createdBy}
				) RETURNING id
			`;

			if (materialId) {
				await sql`
					INSERT INTO procurement.delivery_note_item (
						dn_id,
						material_id,
						qty,
						uom,
						notes
					) VALUES (
						${dn.id},
						${materialId},
						${qty},
						'Pcs',
						${notes}
					)
				`;
			}

			return { success: true, message: 'Surat Jalan (DN) berhasil dibuat!' };
		} catch (err: any) {
			console.error('Error creating Delivery Note:', err);
			return fail(500, { success: false, message: err.message || 'Gagal menyimpan Delivery Note' });
		}
	}
};
