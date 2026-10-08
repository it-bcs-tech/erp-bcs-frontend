import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import sql from '$lib/server/db';

function parseJsonSafe<T>(val: any, fallback: T): T {
	if (!val) return fallback;
	let curr = val;
	while (typeof curr === 'string') {
		try {
			curr = JSON.parse(curr);
		} catch {
			break;
		}
	}
	return (curr ?? fallback) as T;
}

export const load: PageServerLoad = async ({ params }) => {
	const idOrNo = decodeURIComponent(params.id);

	try {
		// 1. Fetch Work Order
		const workOrders = await sql`
			SELECT 
				w.*,
				m.nama_karyawan as mechanic_name,
				h.nama_karyawan as helper_mechanic_name,
				d.nama_karyawan as driver_name,
				w.kilometer as current_unit_km,
				COALESCE(tu.nama_tipe, u.business_unit::text, 'Truck') as unit_type
			FROM fleet.work_orders w
			LEFT JOIN master.m_karyawan m ON w.mechanic_id = m.payroll_id
			LEFT JOIN master.m_karyawan h ON w.helper_mechanic_id = h.payroll_id
			LEFT JOIN master.m_karyawan d ON w.driver_id = d.payroll_id
			LEFT JOIN fleet.unit u ON w.unit_id = u.nomor_unit
			LEFT JOIN master.m_model_unit mu ON u.model_unit_id::text = mu.id::text
			LEFT JOIN master.m_tipe_unit tu ON mu.tipe_unit_id::text = tu.id::text
			WHERE w.wo_no = ${idOrNo} OR w.id::text = ${idOrNo}
			LIMIT 1
		`;

		if (workOrders.length === 0) {
			throw error(404, 'Work Order tidak ditemukan.');
		}

		const wo = workOrders[0];

		// 2. Fetch linked Delivery Note / Spareparts from PMS if any
		const pmsParts = await sql`
			SELECT 
				d.id,
				COALESCE(m.material_code, d.material_id) as material_code,
				COALESCE(m.name, 'Item ' || d.material_id) as item_name,
				COALESCE(d.qty_actual, d.qty_request, 0) as qty,
				COALESCE(m.uom, 'PCS') as uom,
				COALESCE(d.price, 0) as unit_price,
				COALESCE(d.total, 0) as total,
				COALESCE(d.location, '') as keterangan
			FROM fleet.maintenance_dn_header h
			JOIN fleet.maintenance_dn_detail d ON h.dn_no = d.dn_no
			LEFT JOIN master.m_materials m ON 
				CASE 
					WHEN d.material_id ~ '^[0-9]+$' THEN m.id = d.material_id::integer 
					ELSE m.material_code = d.material_id 
				END
			WHERE h.wo_no = ${wo.wo_no}
			ORDER BY d.id ASC
		`;

		// Format repaired_items
		const rawRepaired = parseJsonSafe(wo.repaired_items, []);
		const rawChecklist = parseJsonSafe(wo.checklist_items, []);
		let repairedItems = Array.isArray(rawRepaired) && rawRepaired.length > 0 ? rawRepaired : [];
		if (repairedItems.length === 0 && Array.isArray(rawChecklist)) {
			repairedItems = rawChecklist.map((c: any, idx: number) => ({
				id: c.id || `wo_item_${idx + 1}`,
				category: c.category || wo.maint_category || 'General',
				item: c.item,
				remark: c.remark || '',
				status: c.status === 'OK' || c.status === 'RESOLVED' ? 'RESOLVED' : 'PENDING',
				mechanic_notes: c.mechanic_notes || '',
				repaired_at: c.repaired_at || null
			}));
		}

		const parsedDispensation = parseJsonSafe(wo.dispensation_data, null);

		return {
			wo: {
				id: wo.id,
				woNo: wo.wo_no,
				date: wo.wo_date ? new Date(wo.wo_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-',
				closedDate: wo.closed_at ? new Date(wo.closed_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : null,
				unitId: wo.unit_id,
				unitType: wo.unit_type || 'Truck',
				kilometer: wo.kilometer ? wo.kilometer.toLocaleString('id-ID') : (wo.current_unit_km?.toLocaleString('id-ID') || '-'),
				driverName: wo.driver_name || 'Tanpa Driver',
				driverId: wo.driver_id,
				mechanicId: wo.mechanic_id,
				mechanicName: wo.mechanic_name || 'Belum Ditugaskan',
				helperMechanicId: wo.helper_mechanic_id,
				helperMechanicName: wo.helper_mechanic_name || '-',
				category: wo.maint_category || 'Regular Repair',
				complaint: wo.keluhan_driver || '-',
				status: wo.status || 'Open',
				location: wo.job_location || 'Workshop Pool Utama',
				inspectionNo: wo.inspection_no || null,
				repairedItems,
				sparepartsUsed: Array.isArray(wo.spareparts_used) ? wo.spareparts_used : [],
				pmsParts: pmsParts.map(p => ({
					id: p.id,
					code: p.material_code,
					name: p.item_name,
					qty: p.qty,
					uom: p.uom,
					price: Number(p.unit_price || 0),
					total: Number(p.total || 0),
					remark: p.keterangan
				})),
				dispensationData: parsedDispensation || {
					is_requested: false,
					recommendation: wo.recommendation || '',
					operational_reason: wo.operational_reason || '',
					commitment_date: wo.commitment_date ? new Date(wo.commitment_date).toISOString().slice(0, 10) : null,
					deferred_items: [],
					approval_maintenance: { approved: false, by: null, at: null, notes: '' },
					approval_inspek: { approved: false, by: null, at: null, notes: '' },
					approval_operational: { approved: false, by: null, at: null, notes: '' }
				}
			}
		};
	} catch (err: any) {
		if (err?.status === 404) throw err;
		console.error("Error fetching Work Order detail for print:", err);
		throw error(500, 'Gagal memuat dokumen cetak Work Order.');
	}
};
