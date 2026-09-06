import type { PageServerLoad } from './$types';
import sql from '$lib/server/db';

export const load: PageServerLoad = async ({ url }) => {
	try {
		const currentYear = new Date().getFullYear();
		const todayStr = new Date().toISOString().split('T')[0];
		const startOfYear = `${currentYear}-01-01`;

		const tab = url.searchParams.get('tab') || 'po'; // 'po' | 'ss' | 'dn'
		const startDate = url.searchParams.get('startDate') || startOfYear;
		const endDate = url.searchParams.get('endDate') || todayStr;
		const search = (url.searchParams.get('q') || '').trim().toLowerCase();

		let poData: any[] = [];
		let ssData: any[] = [];
		let dnData: any[] = [];

		if (tab === 'po') {
			const rows = await sql`
				SELECT 
					po.id as po_id,
					po.po_number,
					to_char(po.date, 'YYYY-MM-DD') as po_date,
					COALESCE(c.nama_kustomer, '-') as vendor_name,
					COALESCE(c.kode_kustomer, '-') as vendor_code,
					COALESCE(p.project_name, 'General') as project_name,
					COALESCE(l.loc_name, 'Gudang Pusat') as site_name,
					po.status as po_status,
					pol.id as line_id,
					m.material_code,
					m.name as material_name,
					m.spec as material_spec,
					m.uom,
					pol.qty_ordered,
					pol.unit_price,
					pol.total as line_total,
					COALESCE((
						SELECT SUM(grl.qty_received)
						FROM procurement.goods_receipt_line grl
						WHERE grl.po_line_id = pol.id
					), 0) as qty_received
				FROM procurement.purchase_order po
				JOIN procurement.purchase_order_line pol ON pol.po_id = po.id
				JOIN master.m_materials m ON m.id = pol.item_id
				LEFT JOIN master.m_customer c ON c.id = po.vendor_id
				LEFT JOIN master.m_project p ON p.id = po.project_id
				LEFT JOIN master.m_lokasi l ON l.id = po.site_id
				WHERE po.date >= ${startDate}::date AND po.date <= ${endDate}::date
				ORDER BY po.date DESC, po.id DESC, pol.id ASC
			`;

			poData = rows;
			if (search) {
				poData = poData.filter(r =>
					(r.po_number && r.po_number.toLowerCase().includes(search)) ||
					(r.vendor_name && r.vendor_name.toLowerCase().includes(search)) ||
					(r.material_code && r.material_code.toLowerCase().includes(search)) ||
					(r.material_name && r.material_name.toLowerCase().includes(search)) ||
					(r.project_name && r.project_name.toLowerCase().includes(search))
				);
			}
		} else if (tab === 'ss') {
			const rows = await sql`
				SELECT 
					ss.id,
					ss.ss_number,
					to_char(ss.date, 'YYYY-MM-DD') as ss_date,
					COALESCE(ss.wo_no, '-') as wo_no,
					COALESCE(u.nomor_unit, '-') as nomor_unit,
					COALESCE(ss.chassis_no, u.no_rangka, '-') as chassis_no,
					COALESCE(ss.tipe, '-') as tipe,
					COALESCE(ss.mekanik_name, '-') as mekanik_name,
					COALESCE(ss.helper_name, '-') as helper_name,
					COALESCE(ss.driver_name, '-') as driver_name,
					COALESCE(ss.problem, '-') as problem,
					ss.status,
					ssi.id as item_id,
					COALESCE(m.material_code, '-') as material_code,
					COALESCE(m.name, '-') as material_name,
					COALESCE(ssi.qty, 0) as qty,
					COALESCE(ssi.uom, m.uom, 'Pcs') as uom,
					COALESCE(m.standard_price, 0) as unit_price,
					(COALESCE(ssi.qty, 0) * COALESCE(m.standard_price, 0)) as item_total,
					COALESCE(ssi.notes, '-') as item_notes
				FROM procurement.service_sheet ss
				LEFT JOIN fleet.unit u ON u.id = ss.unit_id
				LEFT JOIN procurement.service_sheet_item ssi ON ssi.service_sheet_id = ss.id
				LEFT JOIN master.m_materials m ON m.id = ssi.material_id
				WHERE ss.date >= ${startDate}::date AND ss.date <= ${endDate}::date
				ORDER BY ss.date DESC, ss.id DESC, ssi.id ASC
			`;

			ssData = rows;
			if (search) {
				ssData = ssData.filter(r =>
					(r.ss_number && r.ss_number.toLowerCase().includes(search)) ||
					(r.nomor_unit && r.nomor_unit.toLowerCase().includes(search)) ||
					(r.chassis_no && r.chassis_no.toLowerCase().includes(search)) ||
					(r.driver_name && r.driver_name.toLowerCase().includes(search)) ||
					(r.helper_name && r.helper_name.toLowerCase().includes(search)) ||
					(r.mekanik_name && r.mekanik_name.toLowerCase().includes(search)) ||
					(r.material_name && r.material_name.toLowerCase().includes(search))
				);
			}
		} else if (tab === 'dn') {
			const rows = await sql`
				SELECT 
					dn.id,
					dn.dn_number,
					to_char(dn.date, 'YYYY-MM-DD') as dn_date,
					COALESCE(fl.loc_name, 'Gudang Asal') as from_site_name,
					COALESCE(tl.loc_name, 'Gudang Tujuan') as to_site_name,
					COALESCE(dn.courier_name, '-') as courier_name,
					COALESCE(dn.vehicle_no, '-') as vehicle_no,
					dn.status,
					COALESCE(dn.notes, '-') as notes,
					dni.id as item_id,
					COALESCE(m.material_code, '-') as material_code,
					COALESCE(m.name, '-') as material_name,
					COALESCE(dni.qty, 0) as qty,
					COALESCE(dni.uom, m.uom, 'Pcs') as uom,
					COALESCE(dni.notes, '-') as item_notes
				FROM procurement.delivery_note dn
				LEFT JOIN master.m_lokasi fl ON fl.id = dn.from_site_id
				LEFT JOIN master.m_lokasi tl ON tl.id = dn.to_site_id
				LEFT JOIN procurement.delivery_note_item dni ON dni.dn_id = dn.id
				LEFT JOIN master.m_materials m ON m.id = dni.material_id
				WHERE dn.date >= ${startDate}::date AND dn.date <= ${endDate}::date
				ORDER BY dn.date DESC, dn.id DESC, dni.id ASC
			`;

			dnData = rows;
			if (search) {
				dnData = dnData.filter(r =>
					(r.dn_number && r.dn_number.toLowerCase().includes(search)) ||
					(r.from_site_name && r.from_site_name.toLowerCase().includes(search)) ||
					(r.to_site_name && r.to_site_name.toLowerCase().includes(search)) ||
					(r.courier_name && r.courier_name.toLowerCase().includes(search)) ||
					(r.vehicle_no && r.vehicle_no.toLowerCase().includes(search)) ||
					(r.material_name && r.material_name.toLowerCase().includes(search))
				);
			}
		}

		// Quick metrics
		const [counts] = await sql`
			SELECT 
				(SELECT COUNT(*) FROM procurement.purchase_order WHERE date >= ${startDate}::date AND date <= ${endDate}::date) as po_count,
				(SELECT COALESCE(SUM(total_amount), 0) FROM procurement.purchase_order WHERE date >= ${startDate}::date AND date <= ${endDate}::date) as po_total_sum,
				(SELECT COUNT(*) FROM procurement.service_sheet WHERE date >= ${startDate}::date AND date <= ${endDate}::date) as ss_count,
				(SELECT COUNT(*) FROM procurement.delivery_note WHERE date >= ${startDate}::date AND date <= ${endDate}::date) as dn_count
		`;

		return {
			tab,
			startDate,
			endDate,
			search,
			poData,
			ssData,
			dnData,
			metrics: {
				poCount: parseInt(counts?.po_count || '0'),
				poTotalSum: parseFloat(counts?.po_total_sum || '0'),
				ssCount: parseInt(counts?.ss_count || '0'),
				dnCount: parseInt(counts?.dn_count || '0')
			}
		};
	} catch (err: any) {
		console.error('Error loading transaction reports:', err);
		return {
			tab: 'po',
			startDate: '',
			endDate: '',
			search: '',
			poData: [],
			ssData: [],
			dnData: [],
			metrics: { poCount: 0, poTotalSum: 0, ssCount: 0, dnCount: 0 }
		};
	}
};
