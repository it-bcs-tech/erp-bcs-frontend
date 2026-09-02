import type { PageServerLoad } from './$types';
import sql from '$lib/server/db';

export const load: PageServerLoad = async ({ url }) => {
	try {
		const result = await sql`
			SELECT 
				o.id,
				COALESCE(k.nama_karyawan, 'No Driver') as driver,
				u.nomor_unit as unit,
				ca.estimated_ujo as amount,
				ca.ujo_makan as makan,
				ca.ujo_tol as tol,
				(COALESCE(ca.estimated_ujo,0) - COALESCE(ca.ujo_makan,0) - COALESCE(ca.ujo_tol,0)) as bbm,
				ori.nama_kustomer || ' → ' || dest.nama_kustomer as route,
				ca.payment_status as status,
				o.tgl_muat as "tripDate"
			FROM finance.cash_advance ca
			JOIN marketing.sales_order o ON o.id = ca.sales_order_id
			LEFT JOIN fleet.unit u ON u.id = ca.unit_id
			LEFT JOIN master.m_drivers d ON d.id = ca.driver_id
			LEFT JOIN master.m_karyawan k ON k.id = d.karyawan_id
			LEFT JOIN master.m_customer ori ON ori.id = o.origin_id
			LEFT JOIN master.m_customer dest ON dest.id = o.destination_id
			WHERE o.status NOT IN ('CANCELED') AND ca.estimated_ujo > 0
			ORDER BY ca.created_at DESC
		`;

		const allUJO = result.map(o => ({
			...o,
			status: o.status === 'PAID' ? 'Paid' : 'Pending',
			paidAt: o.status === 'PAID' ? 'Sudah dicairkan Kasir' : '-',
			do: o.id
		}));

		const statusFilter = url.searchParams.get('status') || 'All';
		const search = url.searchParams.get('search')?.toLowerCase() || '';

		let filtered = allUJO;
		if (search) filtered = filtered.filter(u => u.driver.toLowerCase().includes(search) || (u.unit||'').toLowerCase().includes(search) || u.do.toLowerCase().includes(search));
		if (statusFilter !== 'All') filtered = filtered.filter(u => u.status === statusFilter);

		const summary = {
			totalUJO: allUJO.reduce((s, u) => s + parseFloat(u.amount||'0'), 0),
			paid: allUJO.filter(u => u.status === 'Paid').length,
			pending: allUJO.filter(u => u.status === 'Pending').length,
			totalBBM: allUJO.reduce((s, u) => s + parseFloat(u.bbm||'0'), 0),
		};

		const perPage = 5;
		const page = parseInt(url.searchParams.get('page') || '1');
		const total = filtered.length;
		const paginated = filtered.slice((page - 1) * perPage, page * perPage);

		return { ujoList: paginated, summary, meta: { current_page: page, per_page: perPage, total } };
	} catch (error) {
		console.error("Error loading OCS UJO:", error);
		return { ujoList: [], summary: {totalUJO:0, paid:0, pending:0, totalBBM:0}, meta: { current_page: 1, per_page: 5, total: 0 } };
	}
};
