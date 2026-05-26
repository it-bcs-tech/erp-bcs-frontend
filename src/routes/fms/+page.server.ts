import type { PageServerLoad } from './$types';
import sql from '$lib/server/db';

// ─────────────────────────────────────────────────────────────────────────────
// fms/+page.server.ts  —  Dashboard FMS
//
// MODE: DIRECT DB (sementara, sambil menunggu backend API siap)
// Endpoint API yang akan menggantikan ini:  GET /api/v1/fms/dashboard/metrics
//
// Ketika backend sudah siap, ganti dengan:
//   import { apiFetch } from '$lib/utils/api';
//   const response = await apiFetch('/api/v1/fms/dashboard/metrics', {}, authToken);
// ─────────────────────────────────────────────────────────────────────────────

export const load: PageServerLoad = async () => {
	try {
		// ── 1. Metrics utama: ringkasan fleet ─────────────────────────────────
		const [metricsRow] = await sql<[{
			total_vehicles:      string;
			active_vehicles:     string;
			inactive_vehicles:   string;
			utilization_pct:     string;
			maintenance_overdue: string;
			asuransi_expired:    string;
		}]>`
			SELECT
				COUNT(*)                                                      AS total_vehicles,
				SUM(CASE WHEN is_active THEN 1 ELSE 0 END)                    AS active_vehicles,
				SUM(CASE WHEN NOT is_active THEN 1 ELSE 0 END)                AS inactive_vehicles,
				ROUND(
					SUM(CASE WHEN is_active THEN 1 ELSE 0 END)::numeric
					/ NULLIF(COUNT(*), 0) * 100, 1
				)                                                             AS utilization_pct,
				COUNT(*) FILTER (
					WHERE tgl_maintenance_prevent IS NOT NULL
					  AND tgl_maintenance_prevent < CURRENT_DATE
				)                                                             AS maintenance_overdue,
				COUNT(*) FILTER (
					WHERE expire_date_asuransi IS NOT NULL
					  AND expire_date_asuransi < now()
				)                                                             AS asuransi_expired
			FROM fleet.unit
			WHERE deleted_at IS NULL
		`;

		// ── 2. Distribusi per business_unit ───────────────────────────────────
		const buRows = await sql<{ business_unit: string; total: string; aktif: string }[]>`
			SELECT
				business_unit,
				COUNT(*)                                            AS total,
				SUM(CASE WHEN is_active THEN 1 ELSE 0 END)         AS aktif
			FROM fleet.unit
			WHERE deleted_at IS NULL
			GROUP BY business_unit
			ORDER BY total DESC
		`;

		// ── 3. Metrics dari fleet.trip (REAL active trips) ────────────────────
		const [tripMetrics] = await sql<[{
			active_trips:      string;
			completed_today:   string;
			count_loading:     string;
			count_on_route:    string;
			total_30d:         string;
		}]>`
			SELECT
				COUNT(*) FILTER (WHERE status IN ('DISPATCHED','AT_ORIGIN','ON_ROUTE','AT_DESTINATION','RETURNING'))             AS active_trips,
				COUNT(*) FILTER (WHERE tgl_trip = CURRENT_DATE AND status = 'COMPLETED') AS completed_today,
				COUNT(*) FILTER (WHERE status = 'AT_ORIGIN')                           AS count_loading,
				COUNT(*) FILTER (WHERE status = 'ON_ROUTE')                          AS count_on_route,
				COUNT(*) FILTER (WHERE tgl_trip >= CURRENT_DATE - INTERVAL '30 days') AS total_30d
			FROM fleet.trip
			WHERE deleted_at IS NULL
		`;

		// ── 4. Recent trips (5 terbaru) ───────────────────────────────────────
		const recentTrips = await sql<{
			no_surat_tugas: string;
			nomor_unit:     string;
			driver_nama:    string;
			driver_karyawan: string | null;
			customer:       string | null;
			cargo:          string | null;
			origin:         string | null;
			destination:    string | null;
			status:         string;
			tgl_trip:       string;
			last_location:  string | null;
		}[]>`
			SELECT
				t.no_surat_tugas,
				u.nomor_unit,
				COALESCE(k.nama_karyawan, t.driver_nama, '-')   AS driver_nama,
				k.nama_karyawan                                   AS driver_karyawan,
				t.customer,
				t.cargo,
				t.origin,
				t.destination,
				t.status::text,
				t.tgl_trip::text,
				t.last_location
			FROM fleet.trip t
			JOIN  fleet.unit        u  ON u.id  = t.unit_id
			LEFT JOIN master.m_drivers   dr ON dr.id = t.driver_id
			LEFT JOIN master.m_karyawan  k  ON k.id  = dr.karyawan_id
			WHERE t.deleted_at IS NULL
			ORDER BY t.tgl_trip DESC, t.updated_at DESC NULLS LAST
			LIMIT 5
		`;

		// ── 5. Maintenance alerts (unit overdue) ──────────────────────────────
		const maintenanceAlerts = await sql<{
			nomor_unit:              string;
			nama_tipe:               string;
			tgl_maintenance_prevent: string;
			hari_overdue:            string;
		}[]>`
			SELECT
				u.nomor_unit,
				tu.nama_tipe,
				u.tgl_maintenance_prevent::text,
				(CURRENT_DATE - u.tgl_maintenance_prevent) AS hari_overdue
			FROM fleet.unit u
			JOIN master.m_model_unit mu ON mu.id = u.model_unit_id
			JOIN master.m_tipe_unit  tu ON tu.id = mu.tipe_unit_id
			WHERE u.tgl_maintenance_prevent IS NOT NULL
			  AND u.tgl_maintenance_prevent < CURRENT_DATE
			  AND u.deleted_at IS NULL
			ORDER BY hari_overdue DESC
			LIMIT 5
		`;

		// ── 6. Asuransi expired alerts ────────────────────────────────────────
		const asuransiAlerts = await sql<{
			nomor_unit:           string;
			nama_tipe:            string;
			expire_date_asuransi: string;
		}[]>`
			SELECT
				u.nomor_unit,
				tu.nama_tipe,
				u.expire_date_asuransi::text
			FROM fleet.unit u
			JOIN master.m_model_unit mu ON mu.id = u.model_unit_id
			JOIN master.m_tipe_unit  tu ON tu.id = mu.tipe_unit_id
			WHERE u.expire_date_asuransi IS NOT NULL
			  AND u.expire_date_asuransi < now()
			  AND u.deleted_at IS NULL
			ORDER BY u.expire_date_asuransi
			LIMIT 3
		`;

		// ── 7. Top drivers ────────────────────────────────────────────────────
		const topDrivers = await sql<{
			id:                  string;
			nama:                string;
			driver_category:     string;
			sim_type:            string;
			total_unit_assigned: string;
		}[]>`
			SELECT
				d.id::text,
				k.nama_karyawan   AS nama,
				d.driver_category,
				d.sim_type,
				COUNT(uda.id)::text AS total_unit_assigned
			FROM master.m_drivers d
			JOIN master.m_karyawan k ON k.id = d.karyawan_id
			LEFT JOIN fleet.unit_driver_assignment uda
				ON uda.driver_id = d.id AND uda.is_aktif = true
			WHERE d.deleted_at IS NULL
			GROUP BY d.id, k.nama_karyawan, d.driver_category, d.sim_type
			ORDER BY COUNT(uda.id) DESC, k.nama_karyawan
			LIMIT 5
		`;

		// ── Hitung angka untuk UI ─────────────────────────────────────────────
		const total      = Number(metricsRow.total_vehicles);
		const active     = Number(metricsRow.active_vehicles);
		const inactive   = Number(metricsRow.inactive_vehicles);
		const maintAlerts = Number(metricsRow.maintenance_overdue);

		const activeTrips   = Number(tripMetrics.active_trips);
		const cntLoading    = Number(tripMetrics.count_loading);
		const cntOnRoute    = Number(tripMetrics.count_on_route);
		const cntDoneToday  = Number(tripMetrics.completed_today);

		// fleetSummary: available = aktif - yang sedang loading/on_route
		const available = Math.max(0, active - cntLoading - cntOnRoute);
		const maintenance = Math.min(maintAlerts, inactive);

		// Build alerts dari data nyata
		const alerts = [
			...maintenanceAlerts.slice(0, 2).map((u, i) => ({
				id:       i + 1,
				unit:     u.nomor_unit,
				type:     'Maintenance',
				message:  `Maintenance preventif overdue ${u.hari_overdue} hari (jadwal: ${u.tgl_maintenance_prevent})`,
				severity: Number(u.hari_overdue) > 365 ? 'danger' : 'warning',
				time:     'Jadwal terlewat'
			})),
			...asuransiAlerts.slice(0, 2).map((u, i) => ({
				id:       maintenanceAlerts.length + i + 1,
				unit:     u.nomor_unit,
				type:     'Asuransi',
				message:  `Asuransi kadaluarsa sejak ${u.expire_date_asuransi?.split('T')[0]}`,
				severity: 'critical',
				time:     'Kadaluarsa'
			}))
		];

		return {
			metrics: {
				totalVehicles:       total,
				activeVehicles:      active,
				inactiveVehicles:    inactive,
				fleetUtilization:    Number(metricsRow.utilization_pct) || 0,
				maintenanceAlerts:   maintAlerts,
				criticalMaintenance: Number(metricsRow.asuransi_expired),
				activeTrips,
				completedTripsToday: cntDoneToday,
			},
			fleetSummary: {
				available,
				moving:       cntOnRoute,    // ON_ROUTE dari fleet.trip
				transit:      0,
				loading:      cntLoading,    // AT_ORIGIN dari fleet.trip
				maintenance,
				overhaul:     0,
				accident:     0,
				onDO:         0,
				inactive:     Math.max(0, inactive - maintenance),
				dumpTruck:    buRows.find(r => r.business_unit === 'DUMP_TRUCK')
					? Number(buRows.find(r => r.business_unit === 'DUMP_TRUCK')!.total) : 0,
				transportation: buRows.find(r => r.business_unit === 'TRANSPORTATION')
					? Number(buRows.find(r => r.business_unit === 'TRANSPORTATION')!.total) : 0,
			},
			topDrivers: topDrivers.map(d => ({
				id:            d.id,
				name:          d.nama,
				category:      d.driver_category || '-',
				simType:       d.sim_type || '-',
				totalAssigned: Number(d.total_unit_assigned),
				trips:         0,
				rating:        null
			})),
			recentTrips,
			alerts,
			// liveUnits: akan diisi ketika GPS real-time tersedia
			liveUnits: [] as {
				id: string; driver: string; status: string;
				speed: number; route: string; do: string; progress: number;
			}[]
		};

	} catch (error) {
		console.error('[fms/dashboard] DB query error:', error);
		return {
			metrics: {
				totalVehicles: 0, activeVehicles: 0, inactiveVehicles: 0,
				fleetUtilization: 0, maintenanceAlerts: 0,
				criticalMaintenance: 0, activeTrips: 0, completedTripsToday: 0
			},
			fleetSummary: {
				available: 0, moving: 0, transit: 0, loading: 0,
				maintenance: 0, overhaul: 0, accident: 0, onDO: 0,
				inactive: 0, dumpTruck: 0, transportation: 0
			},
			topDrivers:   [],
			recentTrips:  [],
			alerts:       [],
			liveUnits:    [],
			error:        'Gagal memuat data dashboard.'
		};
	}
};
