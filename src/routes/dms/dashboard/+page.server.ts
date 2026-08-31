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
				c.nama_kustomer as partner_name,
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

		const processedDocs: DocumentItem[] = allDocs.map((r: any) => {
			const { daysRemaining, gateLevel, computedStatus } = calculateExpiryGate(r.expiry_date, r.status);

			if (r.entity_type === 'FLEET') fleetCount++;
			else if (r.entity_type === 'DRIVER') driverCount++;
			else if (r.entity_type === 'CUSTOMER') customerCount++;
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

			return {
				...r,
				status: computedStatus,
				days_remaining: daysRemaining,
				gate_level: gateLevel
			};
		});

		// Dokumen yang perlu perhatian segera (Urgent, Critical, Warning, Expired)
		const upcomingExpiringDocs = processedDocs
			.filter(d => d.expiry_date && (d.days_remaining !== null && d.days_remaining <= 60))
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
				entities: {
					fleet: fleetCount,
					driver: driverCount,
					customer: customerCount,
					corporate: corporateCount
				}
			},
			upcomingExpiringDocs,
			borrowedDocs
		};
	} catch (err: any) {
		console.error('Error loading DMS dashboard analytics:', err);
		throw error(500, 'Gagal memuat dashboard analitik DMS');
	}
};
