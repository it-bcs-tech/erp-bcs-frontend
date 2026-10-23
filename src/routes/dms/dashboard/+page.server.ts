import type { PageServerLoad } from './$types';
import sql from '$lib/server/db';
import { error } from '@sveltejs/kit';
import { calculateExpiryGate } from '$lib/server/dms';
import type { DocumentItem } from '$lib/types/dms';

export const load: PageServerLoad = async () => {
	try {
		const allDocs = await sql`
			SELECT 
				d.*,
				to_char(d.issue_date, 'YYYY-MM-DD') as issue_date_str,
				to_char(d.expiry_date, 'YYYY-MM-DD') as expiry_date_str,
				dt.code as type_code,
				dt.name as type_name,
				COALESCE(c.nama_kustomer, d.metadata->>'partner_name') as partner_name,
				u.nomor_unit as unit_number,
				u.business_unit as unit_type,
				k.nama_karyawan as driver_name,
				k.payroll_id as driver_payroll_id,
				fl.name as filing_location_name,
				fl.code as filing_location_code
			FROM dms.documents d
			LEFT JOIN dms.m_doc_type dt ON dt.id = d.doc_type_id
			LEFT JOIN master.m_customer c ON c.id = d.partner_id
			LEFT JOIN fleet.unit u ON u.id = d.asset_id
			LEFT JOIN master.m_drivers drv ON drv.id = d.employee_id
			LEFT JOIN master.m_karyawan k ON k.id = drv.karyawan_id
			LEFT JOIN dms.m_filing_location fl ON fl.id = d.filing_location_id
			ORDER BY d.expiry_date ASC NULLS LAST
		`;

		let total = allDocs.length;
		let valid = 0;
		let warning60 = 0;
		let critical30 = 0;
		let urgent7 = 0;
		let expired = 0;
		let inRenewal = 0;
		let borrowedCount = 0;

		let fleetCount = 0;
		let driverCount = 0;
		let customerCount = 0;
		let corporateCount = 0;
		let vendorCount = 0;
		let contractCount = 0;

		// 1. Inisialisasi 12 bulan Horizon Expiry ke depan dari bulan berjalan
		const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
		const monthNamesFull = [
			'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
			'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
		];

		const now = new Date();
		const currentYear = now.getFullYear();
		const currentMonth = now.getMonth();

		const horizonMonths: Array<{
			key: string;
			label: string;
			fullName: string;
			year: number;
			month: number;
			fleet: number;
			driver: number;
			contracts: number;
			corporate: number;
			total: number;
		}> = [];

		const horizonMap = new Map<string, (typeof horizonMonths)[0]>();

		for (let i = 0; i < 12; i++) {
			const targetDate = new Date(currentYear, currentMonth + i, 1);
			const y = targetDate.getFullYear();
			const m = targetDate.getMonth() + 1;
			const key = `${y}-${String(m).padStart(2, '0')}`;
			const item = {
				key,
				label: `${monthNamesShort[m - 1]} '${String(y).slice(2)}`,
				fullName: `${monthNamesFull[m - 1]} ${y}`,
				year: y,
				month: m,
				fleet: 0,
				driver: 0,
				contracts: 0,
				corporate: 0,
				total: 0
			};
			horizonMonths.push(item);
			horizonMap.set(key, item);
		}

		// 2. Health & Kepatuhan per Entitas
		const entityHealth: Record<
			string,
			{
				label: string;
				total: number;
				safe: number;
				warning: number;
				critical: number;
				urgent: number;
				expired: number;
				score: number;
				color: string;
				bg: string;
			}
		> = {
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

		const processedDocs: DocumentItem[] = allDocs.map((r: any) => {
			const { daysRemaining, gateLevel, computedStatus } = calculateExpiryGate(r.expiry_date, r.status);

			const isContract = r.type_code === 'KONTRAK_KERJASAMA';
			if (isContract) contractCount++;

			let entityCategory = 'CORPORATE';
			if (isContract) entityCategory = 'CONTRACTS';
			else if (r.entity_type === 'FLEET') entityCategory = 'FLEET';
			else if (r.entity_type === 'DRIVER') entityCategory = 'DRIVER';
			else if (r.entity_type === 'CUSTOMER') entityCategory = 'CONTRACTS';
			else entityCategory = 'CORPORATE';

			if (r.entity_type === 'FLEET') fleetCount++;
			else if (r.entity_type === 'DRIVER') driverCount++;
			else if (r.entity_type === 'CUSTOMER') customerCount++;
			else if (r.entity_type === 'VENDOR') vendorCount++;
			else corporateCount++;

			if (r.physical_status === 'BORROWED') borrowedCount++;

			if (computedStatus === 'RENEWAL_IN_PROGRESS') {
				inRenewal++;
			} else if (gateLevel === 'EXPIRED') {
				expired++;
			} else if (gateLevel === 'URGENT_7') {
				urgent7++;
			} else if (gateLevel === 'CRITICAL_30') {
				critical30++;
			} else if (gateLevel === 'WARNING_60') {
				warning60++;
			} else {
				valid++;
			}

			// Agregasi Health per Entitas
			const targetHealth = entityHealth[entityCategory] || entityHealth.CORPORATE;
			targetHealth.total++;
			if (gateLevel === 'EXPIRED') targetHealth.expired++;
			else if (gateLevel === 'URGENT_7') targetHealth.urgent++;
			else if (gateLevel === 'CRITICAL_30') targetHealth.critical++;
			else if (gateLevel === 'WARNING_60') targetHealth.warning++;
			else targetHealth.safe++;

			// Agregasi Horizon Expiry per Bulan
			if (r.expiry_date) {
				const expDate = new Date(r.expiry_date);
				const expKey = `${expDate.getFullYear()}-${String(expDate.getMonth() + 1).padStart(2, '0')}`;
				const hMonth = horizonMap.get(expKey);
				if (hMonth) {
					hMonth.total++;
					if (entityCategory === 'FLEET') hMonth.fleet++;
					else if (entityCategory === 'DRIVER') hMonth.driver++;
					else if (entityCategory === 'CONTRACTS') hMonth.contracts++;
					else hMonth.corporate++;
				}
			}

			return {
				...r,
				status: computedStatus,
				days_remaining: daysRemaining,
				gate_level: gateLevel
			};
		});

		// Hitung persentase skor kepatuhan per entitas
		let totalDocsHealth = 0;
		let totalSafeHealth = 0;
		for (const key of Object.keys(entityHealth)) {
			const eh = entityHealth[key];
			if (eh.total > 0) {
				eh.score = Math.round(((eh.safe + eh.warning) / eh.total) * 100);
				totalDocsHealth += eh.total;
				totalSafeHealth += (eh.safe + eh.warning);
			}
		}
		const overallComplianceScore = totalDocsHealth > 0 ? Math.round((totalSafeHealth / totalDocsHealth) * 100) : 100;

		// Dokumen yang perlu perhatian segera (Urgent, Critical, Warning, Expired)
		const upcomingExpiringDocs = processedDocs
			.filter(d => d.expiry_date && d.days_remaining !== null && d.days_remaining !== undefined && d.days_remaining <= 60)
			.slice(0, 10);

		// Dokumen fisik yang sedang dipinjam
		const borrowedDocs = processedDocs
			.filter(d => d.physical_status === 'BORROWED')
			.slice(0, 8);

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
					fleet: fleetCount,
					driver: driverCount,
					customer: customerCount,
					vendor: vendorCount,
					corporate: corporateCount,
					contracts: contractCount
				}
			},
			expiryHorizon: horizonMonths,
			entityHealth,
			upcomingExpiringDocs,
			borrowedDocs
		};
	} catch (err: any) {
		console.error('Error loading DMS dashboard analytics:', err);
		throw error(500, 'Gagal memuat dashboard analitik DMS');
	}
};
