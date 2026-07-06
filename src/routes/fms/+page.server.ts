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
				SUM(CASE WHEN u.is_active THEN 1 ELSE 0 END)                    AS active_vehicles,
				SUM(CASE WHEN NOT u.is_active THEN 1 ELSE 0 END)                AS inactive_vehicles,
				ROUND(
					SUM(CASE WHEN u.is_active THEN 1 ELSE 0 END)::numeric
					/ NULLIF(COUNT(*), 0) * 100, 1
				)                                                             AS utilization_pct,
				COUNT(*) FILTER (
					WHERE u.tgl_maintenance_prevent IS NOT NULL
					  AND u.tgl_maintenance_prevent < CURRENT_DATE
				)                                                             AS maintenance_overdue,
				COUNT(*) FILTER (
					WHERE u.expire_date_asuransi IS NOT NULL
					  AND u.expire_date_asuransi < now()
				)                                                             AS asuransi_expired
			FROM fleet.unit u
			JOIN master.m_model_unit mu ON mu.id = u.model_unit_id
			JOIN master.m_tipe_unit tu ON tu.id = mu.tipe_unit_id
			WHERE u.deleted_at IS NULL
			AND tu.asset_group = 'LOGISTICS_FLEET'
		`;

		const total        = Number(metricsRow.total_vehicles);
		const active       = Number(metricsRow.active_vehicles);
		const inactive     = Number(metricsRow.inactive_vehicles);
		const maintAlerts  = Number(metricsRow.maintenance_overdue);

		// ── 2. Distribusi per business_unit ───────────────────────────────────
		const buRows = await sql<{ business_unit: string; total: string; aktif: string }[]>`
			SELECT
				u.business_unit,
				COUNT(*)                                            AS total,
				SUM(CASE WHEN u.is_active THEN 1 ELSE 0 END)         AS aktif
			FROM fleet.unit u
			JOIN master.m_model_unit mu ON mu.id = u.model_unit_id
			JOIN master.m_tipe_unit tu ON tu.id = mu.tipe_unit_id
			WHERE u.deleted_at IS NULL
			AND tu.asset_group = 'LOGISTICS_FLEET'
			GROUP BY u.business_unit
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
				COUNT(*) FILTER (WHERE t.status IN ('DISPATCHED','AT_ORIGIN','ON_ROUTE','AT_DESTINATION','RETURNING'))             AS active_trips,
				COUNT(*) FILTER (WHERE t.tgl_trip = CURRENT_DATE AND t.status = 'COMPLETED') AS completed_today,
				COUNT(*) FILTER (WHERE t.status = 'AT_ORIGIN')                           AS count_loading,
				COUNT(*) FILTER (WHERE t.status = 'ON_ROUTE')                          AS count_on_route,
				COUNT(*) FILTER (WHERE t.status = 'AT_DESTINATION')                      AS count_at_customer,
				COUNT(*) FILTER (WHERE t.status = 'RETURNING')                           AS count_returning,
				COUNT(*) FILTER (WHERE t.tgl_trip >= CURRENT_DATE - INTERVAL '30 days') AS total_30d
			FROM fleet.trip t
			JOIN fleet.unit u ON u.id = t.unit_id
			JOIN master.m_model_unit mu ON mu.id = u.model_unit_id
			JOIN master.m_tipe_unit tu ON tu.id = mu.tipe_unit_id
			WHERE t.deleted_at IS NULL
			AND tu.asset_group = 'LOGISTICS_FLEET'
		`;

		// ── 3.5 Metrics dari fleet.work_orders ────────────────────────────────
		const [woMetrics] = await sql<[{ in_maintenance: string }]>`
			SELECT COUNT(DISTINCT unit_id) as in_maintenance
			FROM fleet.work_orders
			WHERE status IN ('Open', 'Proses')
		`;

		// ── 3.8 Metrics Available Units (Real Data Synchronized with OCS) ───
		const [availMetrics] = await sql<[{ count_available: string }]>`
			SELECT COUNT(*) as count_available
			FROM fleet.unit u
			JOIN master.m_model_unit mu ON mu.id = u.model_unit_id
			JOIN master.m_tipe_unit tu ON tu.id = mu.tipe_unit_id
			WHERE u.is_active = true 
			  AND tu.asset_group = 'LOGISTICS_FLEET'
			  AND u.current_state IN ('AT_POOL')
			  AND u.id NOT IN (
			      SELECT assigned_unit_id FROM marketing.sales_order WHERE status NOT IN ('COMPLETED', 'CANCELED') AND assigned_unit_id IS NOT NULL
			  )
			  AND u.nomor_unit NOT IN (
			      SELECT unit_id FROM fleet.work_orders WHERE status IN ('Open', 'Proses') AND unit_id IS NOT NULL
			  )
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
			JOIN master.m_model_unit mu ON mu.id = u.model_unit_id
			JOIN master.m_tipe_unit tu ON tu.id = mu.tipe_unit_id
			WHERE t.deleted_at IS NULL
			AND tu.asset_group = 'LOGISTICS_FLEET'
			ORDER BY t.tgl_trip DESC, t.updated_at DESC NULLS LAST
			LIMIT 5
		`;

		// ── 5. Trend Pemanfaatan (6 Bulan Terakhir) ───────────────────────────
		const trendRows = await sql<{
			month: string;
			total_trips: string;
			unique_units_used: string;
		}[]>`
			WITH months AS (
				SELECT generate_series(
					date_trunc('month', CURRENT_DATE) - INTERVAL '5 months',
					date_trunc('month', CURRENT_DATE),
					'1 month'
				)::date AS month_start
			)
			SELECT 
				to_char(m.month_start, 'Mon') as month,
				COUNT(t.id) as total_trips,
				COUNT(DISTINCT t.unit_id) as unique_units_used
			FROM months m
			LEFT JOIN fleet.trip t ON date_trunc('month', t.tgl_trip) = m.month_start AND t.deleted_at IS NULL
			GROUP BY m.month_start
			ORDER BY m.month_start;
		`;

		const trendData = trendRows.map(r => {
			const u = Number(r.unique_units_used);
			const t = Number(r.total_trips);
			const baseFleet = Number(active) || 141; // fallback to 141
			const pctActive = Math.min(100, Math.round((u / baseFleet) * 100));
			// Anggap 1 unit target = 20 trip per bulan
			const pctTrips = Math.min(100, Math.round((t / (baseFleet * 20)) * 100));
			
			return {
				month: r.month,
				active: `${pctActive}%`,
				trips: `${pctTrips}%`,
				raw_units: u,
				raw_trips: t
			};
		});

		// ── 6. Maintenance alerts (unit overdue) ──────────────────────────────
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
			  AND tu.asset_group = 'LOGISTICS_FLEET'
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

		// ── 8. Active Contracts for Tonnage Tracker ──────────────────────────────
		const activeContracts = await sql<{
			contract_id: string;
			target_tonnage: string;
			delivered_tonnage: string;
			onroute_tonnage: string;
			loading_tonnage: string;
			customer: string | null;
			project_category: string | null;
		}[]>`
			SELECT 
				c.id as contract_id,
				(c.target_tonnage = 0) as is_borongan,
				CASE 
					WHEN c.target_tonnage > 0 THEN c.target_tonnage
					ELSE COALESCE((SELECT target_tonnage FROM operations.contract_monthly_targets WHERE contract_id = c.id AND target_month = date_trunc('month', CURRENT_DATE)::date), 0)
				END AS target_tonnage,
				CASE 
					WHEN c.target_tonnage > 0 THEN COALESCE(c.delivered_tonnage, 0)
					ELSE COALESCE((SELECT SUM(COALESCE(t.actual_weight, o.berat_muatan)) FROM marketing.sales_order o LEFT JOIN fleet.trip t ON t.unit_id = o.assigned_unit_id AND t.tgl_trip::date = o.tgl_muat::date WHERE o.contract_id = c.id AND o.status = 'COMPLETED' AND date_trunc('month', o.tgl_muat) = date_trunc('month', CURRENT_DATE)), 0)
				END + 
				(SELECT COALESCE(SUM(o.berat_muatan), 0) FROM marketing.sales_order o JOIN fleet.trip t ON t.unit_id = o.assigned_unit_id AND t.tgl_trip::date = o.tgl_muat::date AND t.status NOT IN ('COMPLETED', 'CANCELED') WHERE o.contract_id = c.id AND t.status = 'RETURNING' AND (c.target_tonnage > 0 OR date_trunc('month', o.tgl_muat) = date_trunc('month', CURRENT_DATE))) as delivered_tonnage,
				(SELECT COALESCE(SUM(o.berat_muatan), 0) FROM marketing.sales_order o LEFT JOIN fleet.trip t ON t.unit_id = o.assigned_unit_id AND t.tgl_trip::date = o.tgl_muat::date AND t.status NOT IN ('COMPLETED', 'CANCELED') WHERE o.contract_id = c.id AND o.status NOT IN ('COMPLETED', 'CANCELED') AND (t.id IS NULL OR t.status IN ('SCHEDULED', 'DISPATCHED')) AND (c.target_tonnage > 0 OR date_trunc('month', o.tgl_muat) = date_trunc('month', CURRENT_DATE))) as dispatched_tonnage,
				(SELECT COALESCE(SUM(o.berat_muatan), 0) FROM marketing.sales_order o JOIN fleet.trip t ON t.unit_id = o.assigned_unit_id AND t.tgl_trip::date = o.tgl_muat::date AND t.status NOT IN ('COMPLETED', 'CANCELED') WHERE o.contract_id = c.id AND t.status = 'AT_ORIGIN' AND (c.target_tonnage > 0 OR date_trunc('month', o.tgl_muat) = date_trunc('month', CURRENT_DATE))) as loading_tonnage,
				(SELECT COALESCE(SUM(o.berat_muatan), 0) FROM marketing.sales_order o JOIN fleet.trip t ON t.unit_id = o.assigned_unit_id AND t.tgl_trip::date = o.tgl_muat::date AND t.status NOT IN ('COMPLETED', 'CANCELED') WHERE o.contract_id = c.id AND t.status IN ('ON_ROUTE', 'AT_DESTINATION') AND (c.target_tonnage > 0 OR date_trunc('month', o.tgl_muat) = date_trunc('month', CURRENT_DATE))) as onroute_tonnage,
				cust.nama_kustomer as customer,
				p.category as project_category
			FROM marketing.contract c
			LEFT JOIN master.m_customer cust ON cust.id = c.customer_id
			LEFT JOIN master.m_project p ON p.id = c.project_id
			WHERE c.status = 'Active' 
			  AND (
			      (c.target_tonnage > 0 AND COALESCE(c.delivered_tonnage, 0) < c.target_tonnage)
			      OR
			      (c.target_tonnage = 0 AND 
				   (COALESCE((SELECT SUM(COALESCE(t.actual_weight, o.berat_muatan)) FROM marketing.sales_order o LEFT JOIN fleet.trip t ON t.unit_id = o.assigned_unit_id AND t.tgl_trip::date = o.tgl_muat::date WHERE o.contract_id = c.id AND o.status = 'COMPLETED' AND date_trunc('month', o.tgl_muat) = date_trunc('month', CURRENT_DATE)), 0) + 
				    (SELECT COALESCE(SUM(o.berat_muatan), 0) FROM marketing.sales_order o JOIN fleet.trip t ON t.unit_id = o.assigned_unit_id AND t.tgl_trip::date = o.tgl_muat::date AND t.status NOT IN ('COMPLETED', 'CANCELED') WHERE o.contract_id = c.id AND t.status = 'RETURNING' AND date_trunc('month', o.tgl_muat) = date_trunc('month', CURRENT_DATE))) 
				    < COALESCE((SELECT target_tonnage FROM operations.contract_monthly_targets WHERE contract_id = c.id AND target_month = date_trunc('month', CURRENT_DATE)::date), 0)
				  )
			  )
			  AND (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::date BETWEEN c.start_date AND c.end_date
			ORDER BY c.created_at DESC
			LIMIT 5
		`;

		const metricActiveTrips = Number(tripMetrics.active_trips) || 0;
		const metricMaintenance = Number(woMetrics.in_maintenance) || 0;
		const metricAvailable = Number(availMetrics.count_available) || 0;

		return {
			activeContracts: activeContracts.map(c => ({
				id: c.contract_id,
				isBorongan: c.is_borongan,
				customer: c.customer || 'Unknown',
				project_category: c.project_category || '-',
				targetTonnage: Number(c.target_tonnage) || 0,
				deliveredTonnage: Number(c.delivered_tonnage) || 0,
				onrouteTonnage: Number(c.onroute_tonnage) || 0,
				loadingTonnage: Number(c.loading_tonnage) || 0,
				dispatchedTonnage: Number(c.dispatched_tonnage) || 0,
				remainingTonnage: Math.max(0, (Number(c.target_tonnage) || 0) - (Number(c.delivered_tonnage) || 0) - (Number(c.onroute_tonnage) || 0) - (Number(c.loading_tonnage) || 0) - (Number(c.dispatched_tonnage) || 0))
			})),
			metrics: {
				totalVehicles:       total,
				activeVehicles:      active,
				inactiveVehicles:    inactive,
				fleetUtilization:    Number(metricsRow.utilization_pct),
				activeTrips:         metricActiveTrips,
				completedTripsToday: Number(tripMetrics.completed_today),
				maintenanceAlerts:   maintAlerts,
				criticalMaintenance: Number(metricsRow.asuransi_expired),
				inMaintenance:       metricMaintenance,
				availableVehicles:   metricAvailable,
				loadingTrips:        Number(tripMetrics.count_loading),
				onRouteTrips:        Number(tripMetrics.count_on_route),
				atCustomerTrips:     Number(tripMetrics.count_at_customer),
				returningTrips:      Number(tripMetrics.count_returning)
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
			trendData,
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
