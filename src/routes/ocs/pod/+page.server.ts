import type { PageServerLoad } from './$types';
import sql from '$lib/server/db';

export const load: PageServerLoad = async ({ url }) => {
	try {
		const statusFilter = url.searchParams.get('status') || 'All';
		const search = url.searchParams.get('search')?.toLowerCase() || '';

		// Query all completed trips and their DN status from finance.dn_detail
		const tripsWithDn = await sql`
			SELECT 
				t.id as trip_id,
				t.no_surat_tugas,
				t.tgl_trip,
				t.origin,
				t.destination,
				t.cargo,
				t.actual_weight as ocs_weight,
				u.nomor_unit as unit_number,
				COALESCE(k.nama_karyawan, 'No Driver') as driver_name,
				c.nama_kustomer as customer_name,
				o.id as sales_order_id,
				o.berat_muatan as order_weight,
				dn.id as dn_id,
				dn.no_surat_jalan,
				dn.tgl_surat_jalan,
				dn.total_berat as verified_weight,
				dn.total_amount,
				dn.status as dn_status,
				dn.file_upload,
				dn.created_at as verified_at,
				CASE 
					WHEN dn.id IS NOT NULL THEN 'VERIFIED'
					ELSE 'PENDING_KASIR'
				END as status
			FROM fleet.trip t
			JOIN marketing.sales_order o ON o.assigned_unit_id = t.unit_id AND o.tgl_muat::date = t.tgl_trip::date
			LEFT JOIN master.m_customer c ON c.id = o.customer_id
			LEFT JOIN fleet.unit u ON u.id = t.unit_id
			LEFT JOIN master.m_drivers d ON d.id = t.driver_id
			LEFT JOIN master.m_karyawan k ON k.id = d.karyawan_id
			LEFT JOIN finance.dn_detail dn ON dn.trip_id = t.id
			WHERE t.status = 'COMPLETED'
			ORDER BY t.updated_at DESC
		`;

		const formattedList = tripsWithDn.map((item: any) => {
			const ocsW = parseFloat(item.ocs_weight || item.order_weight || '0');
			const verW = parseFloat(item.verified_weight || '0');
			const diff = item.dn_id ? (ocsW - verW) : 0;
			return {
				...item,
				discrepancy: diff.toFixed(2),
				hasDiscrepancy: Math.abs(diff) > 0.05
			};
		});

		let filtered = formattedList;
		if (search) {
			filtered = filtered.filter((p: any) =>
				p.no_surat_tugas?.toLowerCase().includes(search) ||
				p.no_surat_jalan?.toLowerCase().includes(search) ||
				p.customer_name?.toLowerCase().includes(search) ||
				p.driver_name?.toLowerCase().includes(search) ||
				p.unit_number?.toLowerCase().includes(search)
			);
		}
		if (statusFilter !== 'All') {
			filtered = filtered.filter((p: any) => p.status === statusFilter);
		}

		const summary = {
			totalTrips: formattedList.length,
			verifiedByKasir: formattedList.filter((p: any) => p.status === 'VERIFIED').length,
			pendingKasir: formattedList.filter((p: any) => p.status === 'PENDING_KASIR').length,
			totalVerifiedWeight: formattedList.reduce((acc: number, p: any) => acc + parseFloat(p.verified_weight || '0'), 0)
		};

		return {
			trips: filtered,
			summary,
			filters: { status: statusFilter, search }
		};
	} catch (error) {
		console.error("Error loading OCS SJB monitoring:", error);
		return {
			trips: [],
			summary: { totalTrips: 0, verifiedByKasir: 0, pendingKasir: 0, totalVerifiedWeight: 0 },
			filters: { status: 'All', search: '' }
		};
	}
};
