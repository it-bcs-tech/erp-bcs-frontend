import type { PageServerLoad } from './$types';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';

const sql = postgres(env.DATABASE_URL || 'postgres://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db');

export const load: PageServerLoad = async ({ url }) => {
	try {
		const dbTrips = await sql`
			SELECT 
				t.id as trip_db_id,
				t.no_surat_tugas as do,
				u.nomor_unit as unit,
				COALESCE(k.nama_karyawan, t.driver_nama) as driver,
				t.origin,
				t.destination,
				t.customer,
				t.status,
				t.depart_time,
				t.arrive_time,
				t.distance_km,
				t.max_speed_kmh,
				t.avg_speed_kmh,
				t.stop_count,
				t.fuel_used_l,
				t.created_at,
				t.updated_at
			FROM fleet.trip t
			LEFT JOIN fleet.unit u ON u.id = t.unit_id
			LEFT JOIN master.m_drivers dr ON dr.id = t.driver_id
			LEFT JOIN master.m_karyawan k ON k.id = dr.karyawan_id
			ORDER BY COALESCE(t.depart_time, t.created_at) DESC
		`;

		const allHistory = dbTrips.map((t: any) => {
			const tripIdStr = String(t.trip_db_id);
			const isCompleted = t.status === 'COMPLETED';
			
			let durationStr = '-';
			if (t.depart_time && t.arrive_time) {
				const diffMs = new Date(t.arrive_time).getTime() - new Date(t.depart_time).getTime();
				const hrs = Math.floor(diffMs / 3600000);
				const mins = Math.floor((diffMs % 3600000) / 60000);
				durationStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
			} else if (t.depart_time) {
				const diffMs = new Date().getTime() - new Date(t.depart_time).getTime();
				const hrs = Math.floor(diffMs / 3600000);
				const mins = Math.floor((diffMs % 3600000) / 60000);
				durationStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
			}

			const formatTime = (d: any) => d ? new Date(d).toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute:'2-digit', hour12: false }) : '-';

			return {
				dbId: t.trip_db_id,
				id: t.do || `TRP-${tripIdStr.padStart(8, '0')}`,
				unit: t.unit || '-',
				driver: t.driver || 'Unknown',
				origin: t.origin || '-',
				destination: t.destination || '-',
				do: t.do || '-',
				customer: t.customer || '-',
				startDate: formatTime(t.depart_time || t.created_at),
				endDate: isCompleted ? formatTime(t.arrive_time || t.updated_at) : '-',
				distance: t.distance_km ? parseFloat(t.distance_km).toFixed(1) : 0,
				duration: durationStr,
				avgSpeed: t.avg_speed_kmh || 0,
				maxSpeed: t.max_speed_kmh || 0,
				fuelUsed: t.fuel_used_l ? parseFloat(t.fuel_used_l).toFixed(1) : 0,
				stops: t.stop_count || 0,
				status: isCompleted ? 'Completed' : 'In Progress'
			};
		});

		const search = url.searchParams.get('search')?.toLowerCase() || '';
		const statusFilter = url.searchParams.get('status') || 'All';

		let filtered = allHistory;
		if (search) {
			filtered = filtered.filter((h: any) =>
				h.unit.toLowerCase().includes(search) ||
				h.driver.toLowerCase().includes(search) ||
				h.do.toLowerCase().includes(search) ||
				h.origin.toLowerCase().includes(search) ||
				h.destination.toLowerCase().includes(search) ||
				h.customer.toLowerCase().includes(search)
			);
		}
		if (statusFilter !== 'All') filtered = filtered.filter((h: any) => h.status === statusFilter);

		const perPage = 5;
		const page = parseInt(url.searchParams.get('page') || '1');
		const total = filtered.length;
		const start = (page - 1) * perPage;
		const paginated = filtered.slice(start, start + perPage);

		return {
			history: paginated,
			stats: {
				totalTrips: allHistory.length,
				totalDistance: Number(allHistory.reduce((sum: number, h: any) => sum + parseFloat(h.distance || '0'), 0).toFixed(1)),
				avgSpeed: allHistory.length ? Math.round(allHistory.reduce((sum: number, h: any) => sum + h.avgSpeed, 0) / allHistory.length) : 0,
				totalFuel: Number(allHistory.reduce((sum: number, h: any) => sum + parseFloat(h.fuelUsed || '0'), 0).toFixed(1))
			},
			meta: { current_page: page, per_page: perPage, total }
		};
	} catch (error) {
		console.error("Error loading route history:", error);
		return { history: [], stats: { totalTrips: 0, totalDistance: 0, avgSpeed: 0, totalFuel: 0 }, meta: { current_page: 1, per_page: 5, total: 0 } };
	}
};
