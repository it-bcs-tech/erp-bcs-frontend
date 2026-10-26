import type { PageServerLoad } from './$types';
import sql from '$lib/server/db';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
	try {
		const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
		const monthNamesFull = [
			'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
			'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
		];

		const [
			[statsRow],
			horizonDbRows,
			healthDbRows,
			upcomingExpiringDocs,
			expiredDocs,
			borrowedDocs,
			topDocTypes
		] = await Promise.all([
			// 1. Overall Document Stats Aggregated in PostgreSQL
			sql<any[]>`
				SELECT 
					COUNT(*)::int as total,
					COUNT(*) FILTER (WHERE status = 'ACTIVE' AND (expiry_date IS NULL OR expiry_date > CURRENT_DATE + INTERVAL '60 days'))::int as valid,
					COUNT(*) FILTER (WHERE status = 'ACTIVE' AND expiry_date BETWEEN CURRENT_DATE + INTERVAL '31 days' AND CURRENT_DATE + INTERVAL '60 days')::int as warning60,
					COUNT(*) FILTER (WHERE status = 'ACTIVE' AND expiry_date BETWEEN CURRENT_DATE + INTERVAL '8 days' AND CURRENT_DATE + INTERVAL '30 days')::int as critical30,
					COUNT(*) FILTER (WHERE status = 'ACTIVE' AND expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days')::int as urgent7,
					COUNT(*) FILTER (WHERE status = 'EXPIRED' OR (status = 'ACTIVE' AND expiry_date < CURRENT_DATE))::int as expired,
					COUNT(*) FILTER (WHERE status = 'RENEWAL_IN_PROGRESS')::int as in_renewal,
					COUNT(*) FILTER (WHERE physical_status = 'BORROWED')::int as borrowed,
					COUNT(*) FILTER (WHERE entity_type = 'FLEET')::int as fleet,
					COUNT(*) FILTER (WHERE entity_type = 'DRIVER')::int as driver,
					COUNT(*) FILTER (WHERE entity_type = 'CUSTOMER')::int as customer,
					COUNT(*) FILTER (WHERE entity_type = 'VENDOR')::int as vendor,
					COUNT(*) FILTER (WHERE entity_type = 'CORPORATE')::int as corporate,
					COUNT(*) FILTER (WHERE entity_type IN ('CUSTOMER', 'VENDOR'))::int as contracts
				FROM dms.documents
			`,

			// 2. 12-Month Expiry Horizon Series Aggregated in PostgreSQL
			sql<any[]>`
				WITH months AS (
					SELECT 
						date_trunc('month', d) as m_date,
						TO_CHAR(d, 'Mon') as month_label,
						TO_CHAR(d, 'YYYY-MM') as period_key,
						EXTRACT(YEAR FROM d)::int as yr,
						EXTRACT(MONTH FROM d)::int as mo
					FROM generate_series(
						date_trunc('month', CURRENT_DATE),
						date_trunc('month', CURRENT_DATE) + INTERVAL '11 months',
						INTERVAL '1 month'
					) d
				),
				exp AS (
					SELECT 
						date_trunc('month', expiry_date) as m_date,
						COUNT(*)::int as total,
						COUNT(*) FILTER (WHERE entity_type = 'FLEET')::int as fleet,
						COUNT(*) FILTER (WHERE entity_type = 'DRIVER')::int as driver,
						COUNT(*) FILTER (WHERE entity_type IN ('CUSTOMER', 'VENDOR'))::int as contracts,
						COUNT(*) FILTER (WHERE entity_type = 'CORPORATE')::int as corporate
					FROM dms.documents
					WHERE expiry_date IS NOT NULL
					GROUP BY date_trunc('month', expiry_date)
				)
				SELECT 
					m.period_key,
					m.month_label,
					m.yr,
					m.mo,
					COALESCE(e.total, 0)::int as total,
					COALESCE(e.fleet, 0)::int as fleet,
					COALESCE(e.driver, 0)::int as driver,
					COALESCE(e.contracts, 0)::int as contracts,
					COALESCE(e.corporate, 0)::int as corporate
				FROM months m
				LEFT JOIN exp e ON e.m_date = m.m_date
				ORDER BY m.m_date ASC
			`,

			// 3. Entity Compliance Health Aggregated in PostgreSQL
			sql<any[]>`
				SELECT 
					CASE 
						WHEN dt.code = 'KONTRAK_KERJASAMA' OR d.entity_type IN ('CUSTOMER', 'VENDOR') THEN 'CONTRACTS'
						WHEN d.entity_type = 'FLEET' THEN 'FLEET'
						WHEN d.entity_type = 'DRIVER' THEN 'DRIVER'
						ELSE 'CORPORATE'
					END as category,
					COUNT(*)::int as total,
					COUNT(*) FILTER (WHERE d.status = 'ACTIVE' AND (d.expiry_date IS NULL OR d.expiry_date > CURRENT_DATE + INTERVAL '60 days'))::int as safe,
					COUNT(*) FILTER (WHERE d.status = 'ACTIVE' AND d.expiry_date BETWEEN CURRENT_DATE + INTERVAL '31 days' AND CURRENT_DATE + INTERVAL '60 days')::int as warning,
					COUNT(*) FILTER (WHERE d.status = 'ACTIVE' AND d.expiry_date BETWEEN CURRENT_DATE + INTERVAL '8 days' AND CURRENT_DATE + INTERVAL '30 days')::int as critical,
					COUNT(*) FILTER (WHERE d.status = 'ACTIVE' AND d.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days')::int as urgent,
					COUNT(*) FILTER (WHERE d.status = 'EXPIRED' OR (d.status = 'ACTIVE' AND d.expiry_date < CURRENT_DATE))::int as expired
				FROM dms.documents d
				LEFT JOIN dms.m_doc_type dt ON dt.id = d.doc_type_id
				GROUP BY 1
			`,

			// 4. Top 10 Upcoming Expiring Docs (H <= 60)
			sql<any[]>`
				SELECT 
					d.id,
					d.title,
					d.doc_number,
					to_char(d.expiry_date, 'YYYY-MM-DD') as expiry_date_str,
					d.expiry_date,
					d.status,
					d.entity_type,
					d.physical_status,
					dt.name as type_name,
					COALESCE(u.nomor_unit, k.nama_karyawan, c.nama_kustomer, 'Korporat') as entity_name,
					(d.expiry_date - CURRENT_DATE)::int as days_remaining,
					CASE 
						WHEN (d.expiry_date - CURRENT_DATE) <= 0 THEN 'EXPIRED'
						WHEN (d.expiry_date - CURRENT_DATE) <= 7 THEN 'URGENT_7'
						WHEN (d.expiry_date - CURRENT_DATE) <= 30 THEN 'CRITICAL_30'
						ELSE 'WARNING_60'
					END as gate_level
				FROM dms.documents d
				LEFT JOIN dms.m_doc_type dt ON dt.id = d.doc_type_id
				LEFT JOIN fleet.unit u ON u.id = d.asset_id
				LEFT JOIN master.m_drivers drv ON drv.id = d.employee_id
				LEFT JOIN master.m_karyawan k ON k.id = drv.karyawan_id
				LEFT JOIN master.m_customer c ON c.id = d.partner_id
				WHERE d.status = 'ACTIVE' AND d.expiry_date IS NOT NULL AND d.expiry_date >= CURRENT_DATE AND (d.expiry_date - CURRENT_DATE) <= 60
				ORDER BY d.expiry_date ASC
				LIMIT 10
			`,

			// 5. Top 10 Expired Docs
			sql<any[]>`
				SELECT 
					d.id,
					d.title,
					d.doc_number,
					to_char(d.expiry_date, 'YYYY-MM-DD') as expiry_date_str,
					d.expiry_date,
					d.status,
					d.entity_type,
					dt.name as type_name,
					COALESCE(u.nomor_unit, k.nama_karyawan, c.nama_kustomer, 'Korporat') as entity_name,
					(CURRENT_DATE - d.expiry_date)::int as days_overdue
				FROM dms.documents d
				LEFT JOIN dms.m_doc_type dt ON dt.id = d.doc_type_id
				LEFT JOIN fleet.unit u ON u.id = d.asset_id
				LEFT JOIN master.m_drivers drv ON drv.id = d.employee_id
				LEFT JOIN master.m_karyawan k ON k.id = drv.karyawan_id
				LEFT JOIN master.m_customer c ON c.id = d.partner_id
				WHERE d.status = 'EXPIRED' OR (d.status = 'ACTIVE' AND d.expiry_date < CURRENT_DATE)
				ORDER BY d.expiry_date DESC
				LIMIT 10
			`,

			// 6. Borrowed Docs Tracker
			sql<any[]>`
				SELECT 
					d.id,
					d.title,
					d.doc_number,
					fl.code as filing_location_code
				FROM dms.documents d
				LEFT JOIN dms.m_filing_location fl ON fl.id = d.filing_location_id
				WHERE d.physical_status = 'BORROWED'
				LIMIT 8
			`,

			// 7. Top Document Types Breakdown
			sql<any[]>`
				SELECT 
					dt.name as type_name,
					COUNT(d.id)::int as count
				FROM dms.m_doc_type dt
				LEFT JOIN dms.documents d ON d.doc_type_id = dt.id
				GROUP BY dt.id, dt.name
				ORDER BY count DESC
				LIMIT 6
			`
		]);

		// Format Expiry Horizon Series
		const expiryHorizon = horizonDbRows.map((row: any) => {
			const mIdx = (row.mo || 1) - 1;
			const yrShort = String(row.yr || 2026).slice(2);
			return {
				key: row.period_key,
				label: `${monthNamesShort[mIdx]} '${yrShort}`,
				fullName: `${monthNamesFull[mIdx]} ${row.yr}`,
				year: row.yr,
				month: row.mo,
				fleet: row.fleet || 0,
				driver: row.driver || 0,
				contracts: row.contracts || 0,
				corporate: row.corporate || 0,
				total: row.total || 0
			};
		});

		// Format Entity Health map
		const entityHealth: Record<string, any> = {
			FLEET: {
				label: 'Armada (FMS)',
				total: 0,
				safe: 0,
				warning: 0,
				critical: 0,
				urgent: 0,
				expired: 0,
				score: 100,
				color: 'text-sky-600 dark:text-sky-400',
				bg: 'bg-sky-500'
			},
			DRIVER: {
				label: 'Driver (HRIS)',
				total: 0,
				safe: 0,
				warning: 0,
				critical: 0,
				urgent: 0,
				expired: 0,
				score: 100,
				color: 'text-indigo-600 dark:text-indigo-400',
				bg: 'bg-indigo-500'
			},
			CONTRACTS: {
				label: 'Kontrak Legal',
				total: 0,
				safe: 0,
				warning: 0,
				critical: 0,
				urgent: 0,
				expired: 0,
				score: 100,
				color: 'text-amber-600 dark:text-amber-400',
				bg: 'bg-amber-500'
			},
			CORPORATE: {
				label: 'Korporat & ISO',
				total: 0,
				safe: 0,
				warning: 0,
				critical: 0,
				urgent: 0,
				expired: 0,
				score: 100,
				color: 'text-violet-600 dark:text-violet-400',
				bg: 'bg-violet-500'
			}
		};

		let totalDocsHealth = 0;
		let totalSafeHealth = 0;

		for (const hRow of healthDbRows) {
			const cat = hRow.category;
			if (entityHealth[cat]) {
				const tot = hRow.total || 0;
				const safe = hRow.safe || 0;
				const warn = (hRow.warning || 0) + (hRow.critical || 0) + (hRow.urgent || 0);
				entityHealth[cat].total = tot;
				entityHealth[cat].safe = safe;
				entityHealth[cat].warning = hRow.warning || 0;
				entityHealth[cat].critical = hRow.critical || 0;
				entityHealth[cat].urgent = hRow.urgent || 0;
				entityHealth[cat].expired = hRow.expired || 0;
				entityHealth[cat].score = tot > 0 ? Math.round(((safe + (hRow.warning || 0)) / tot) * 100) : 100;

				totalDocsHealth += tot;
				totalSafeHealth += (safe + (hRow.warning || 0));
			}
		}

		const overallComplianceScore = totalDocsHealth > 0 ? Math.round((totalSafeHealth / totalDocsHealth) * 100) : 100;

		const total = statsRow.total || 0;
		const valid = statsRow.valid || 0;
		const warning60 = statsRow.warning60 || 0;
		const critical30 = statsRow.critical30 || 0;
		const urgent7 = statsRow.urgent7 || 0;
		const expired = statsRow.expired || 0;
		const inRenewal = statsRow.in_renewal || 0;
		const borrowedCount = statsRow.borrowed || 0;

		return {
			stats: {
				total,
				valid,
				warning60,
				critical30,
				urgent7,
				expired,
				inRenewal,
				borrowedCount,
				overallComplianceScore,
				entities: {
					fleet: statsRow.fleet || 0,
					driver: statsRow.driver || 0,
					customer: statsRow.customer || 0,
					vendor: statsRow.vendor || 0,
					corporate: statsRow.corporate || 0,
					contracts: statsRow.contracts || 0
				}
			},
			pipeline: {
				stage1_recorded: { count: total, label: 'Dokumen Terarsip' },
				stage2_valid: { count: valid, label: 'Valid & Terlindungi (>60 hr)' },
				stage3_warning: { count: warning60 + critical30 + urgent7, label: 'Gate Peringatan (H-60 s/d H-7)' },
				stage4_expired: { count: expired, label: 'Kadaluarsa / Perlu Review' }
			},
			expiryHorizon,
			entityHealth,
			upcomingExpiringDocs,
			expiredDocs,
			borrowedDocs,
			topDocTypes
		};
	} catch (err: any) {
		console.error('Error loading DMS dashboard analytics:', err);
		throw error(500, 'Gagal memuat dashboard analitik DMS');
	}
};
