import type { PageServerLoad } from './$types';
import sql from '$lib/server/db';
import { calculateExpiryGate } from '$lib/server/dms';

export const load: PageServerLoad = async ({ url }) => {
	try {
		const search = (url.searchParams.get('search') || '').trim();
		const typeFilter = url.searchParams.get('type') || 'All';
		const statusFilter = url.searchParams.get('status') || 'All';
		const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
		const perPage = 10;
		const offset = (page - 1) * perPage;

		// Ambil semua dokumen armada dari DMS
		const rows = await sql`
			SELECT 
				d.id,
				dt.name as type,
				dt.code as type_code,
				COALESCE(u.nomor_unit, 'Armada Umum') as vehicle,
				u.id as unit_id,
				d.doc_number as "docNumber",
				to_char(d.expiry_date, 'YYYY-MM-DD') as "expiryDate",
				d.status as db_status,
				COALESCE(i.name, 'Samsat/Dishub') as issuer,
				d.title,
				d.file_path as "filePath",
				d.physical_status as "physicalStatus"
			FROM dms.documents d
			LEFT JOIN dms.m_doc_type dt ON dt.id = d.doc_type_id
			LEFT JOIN fleet.unit u ON u.id = d.asset_id
			LEFT JOIN dms.m_issuer i ON i.id = d.issuer_id
			WHERE d.entity_type = 'FLEET' OR d.asset_id IS NOT NULL
			ORDER BY d.expiry_date ASC NULLS LAST
		`;

		// Hitung lifecycle dinamis (Valid, Expiring Soon, Expired)
		const processedDocs = rows.map((r: any) => {
			const { daysRemaining, gateLevel, computedStatus } = calculateExpiryGate(r.expiryDate, r.db_status);
			let displayStatus = 'Valid';
			if (computedStatus === 'EXPIRED' || gateLevel === 'EXPIRED') {
				displayStatus = 'Expired';
			} else if (gateLevel === 'URGENT_7' || gateLevel === 'CRITICAL_30' || gateLevel === 'WARNING_60') {
				displayStatus = 'Expiring Soon';
			}

			return {
				...r,
				status: displayStatus,
				computedStatus,
				gateLevel,
				daysRemaining
			};
		});

		// Metrics
		const expired = processedDocs.filter(d => d.status === 'Expired').length;
		const expiringSoon = processedDocs.filter(d => d.status === 'Expiring Soon').length;
		const valid = processedDocs.filter(d => d.status === 'Valid').length;

		const metrics = {
			totalDocs: processedDocs.length,
			expired,
			expiringSoon,
			valid
		};

		// Filter
		let filtered = processedDocs;
		if (search) {
			const q = search.toLowerCase();
			filtered = filtered.filter(d =>
				(d.vehicle && d.vehicle.toLowerCase().includes(q)) ||
				(d.docNumber && d.docNumber.toLowerCase().includes(q)) ||
				(d.title && d.title.toLowerCase().includes(q))
			);
		}
		if (typeFilter !== 'All') {
			filtered = filtered.filter(d => d.type_code === typeFilter || d.type === typeFilter);
		}
		if (statusFilter !== 'All') {
			filtered = filtered.filter(d => d.status === statusFilter);
		}

		const total = filtered.length;
		const paginated = filtered.slice(offset, offset + perPage);

		// Ambil list doc types untuk filter dropdown
		const docTypes = await sql`
			SELECT code, name FROM dms.m_doc_type WHERE is_active = true ORDER BY name
		`;

		return {
			documents: paginated,
			metrics,
			docTypes,
			meta: { current_page: page, per_page: perPage, total }
		};
	} catch (err: any) {
		console.error('Error loading FMS documents from DMS:', err);
		return {
			documents: [],
			metrics: { totalDocs: 0, expired: 0, expiringSoon: 0, valid: 0 },
			docTypes: [],
			meta: { current_page: 1, per_page: 10, total: 0 }
		};
	}
};
