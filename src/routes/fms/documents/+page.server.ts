import type { PageServerLoad } from './$types';
import sql from '$lib/server/db';
import { calculateExpiryGate } from '$lib/server/dms';

export const load: PageServerLoad = async ({ url }) => {
	try {
		const search = (url.searchParams.get('search') || '').trim();
		const categoryFilter = url.searchParams.get('category') || 'All'; // 'All', 'FLEET', 'DRIVER'
		const typeFilter = url.searchParams.get('type') || 'All';
		const statusFilter = url.searchParams.get('status') || 'All';
		const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
		const perPage = 10;
		const offset = (page - 1) * perPage;

		// Ambil dokumen armada & sopir dari DMS (BPKB, Izin B3, Faktur, STNK, KIR, SIM, Sertifikat B3, SIO Operator)
		const rows = await sql`
			SELECT 
				d.id,
				dt.name as type,
				dt.code as type_code,
				CASE 
					WHEN dt.code IN ('SIM_DRIVER', 'SERTIFIKAT_B3_DRIVER', 'SIO_DRIVER') THEN 'DRIVER'
					ELSE 'FLEET'
				END as category,
				COALESCE(u.nomor_unit, 'Armada Umum') as vehicle,
				u.id as unit_id,
				COALESCE(k.nama_karyawan, d.metadata->>'driver_name', d.metadata->>'operator_name') as driver_name,
				COALESCE(k.payroll_id, d.metadata->>'payroll_id') as driver_payroll,
				d.doc_number as "docNumber",
				to_char(d.expiry_date, 'YYYY-MM-DD') as "expiryDate",
				d.status as db_status,
				COALESCE(i.name, d.metadata->>'issued_by', d.metadata->>'yg_mengeluarkan', 'Instansi Resmi / Dishub') as issuer,
				d.title,
				d.file_path as "filePath",
				d.physical_status as "physicalStatus"
			FROM dms.documents d
			JOIN dms.m_doc_type dt ON dt.id = d.doc_type_id
			LEFT JOIN fleet.unit u ON u.id = d.asset_id
			LEFT JOIN master.m_drivers drv ON drv.id = d.employee_id
			LEFT JOIN master.m_karyawan k ON k.id = drv.karyawan_id OR k.payroll_id = (d.metadata->>'payroll_id')
			LEFT JOIN dms.m_issuer i ON i.id = d.issuer_id
			WHERE dt.code IN (
				'BPKB', 'STNK', 'PAJAK_STNK', 'KIR', 'KIU', 'IZIN_B3', 'IBM', 'UJI_EMISI', 'FAKTUR_ARMADA',
				'SIM_DRIVER', 'SERTIFIKAT_B3_DRIVER', 'SIO_DRIVER'
			)
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
		const fleetCount = processedDocs.filter(d => d.category === 'FLEET').length;
		const driverCount = processedDocs.filter(d => d.category === 'DRIVER').length;
		const expired = processedDocs.filter(d => d.status === 'Expired').length;
		const expiringSoon = processedDocs.filter(d => d.status === 'Expiring Soon').length;
		const valid = processedDocs.filter(d => d.status === 'Valid').length;

		const metrics = {
			totalDocs: processedDocs.length,
			fleetCount,
			driverCount,
			expired,
			expiringSoon,
			valid
		};

		// Filter
		let filtered = processedDocs;
		if (categoryFilter !== 'All') {
			filtered = filtered.filter(d => d.category === categoryFilter);
		}
		if (typeFilter !== 'All') {
			filtered = filtered.filter(d => d.type_code === typeFilter || d.type === typeFilter);
		}
		if (statusFilter !== 'All') {
			filtered = filtered.filter(d => d.status === statusFilter);
		}
		if (search) {
			const q = search.toLowerCase();
			filtered = filtered.filter(d =>
				(d.vehicle && d.vehicle.toLowerCase().includes(q)) ||
				(d.driver_name && d.driver_name.toLowerCase().includes(q)) ||
				(d.driver_payroll && d.driver_payroll.toLowerCase().includes(q)) ||
				(d.docNumber && d.docNumber.toLowerCase().includes(q)) ||
				(d.title && d.title.toLowerCase().includes(q))
			);
		}

		const total = filtered.length;

		// Sorting cerdas:
		// Jika pengguna memfilter status kedaluwarsa ('Expired' / 'Expiring Soon'), urutkan berdasarkan expiry_date ASC
		// Jika melihat Semua ('All') atau 'Valid', urutkan berdasarkan Unit Kendaraan dan prioritaskan BPKB agar langsung tampil di Halaman 1
		if (statusFilter === 'Expired' || statusFilter === 'Expiring Soon') {
			filtered.sort((a, b) => {
				const aTime = a.expiryDate ? new Date(a.expiryDate).getTime() : Infinity;
				const bTime = b.expiryDate ? new Date(b.expiryDate).getTime() : Infinity;
				return aTime - bTime;
			});
		} else {
			filtered.sort((a, b) => {
				const aHasUnit = a.vehicle && a.vehicle !== 'Armada Umum';
				const bHasUnit = b.vehicle && b.vehicle !== 'Armada Umum';
				if (aHasUnit && !bHasUnit) return -1;
				if (!aHasUnit && bHasUnit) return 1;
				if (a.vehicle !== b.vehicle) return (a.vehicle || '').localeCompare(b.vehicle || '');
				const rank = (code: string) => {
					switch (code) {
						case 'BPKB': return 1;
						case 'STNK': return 2;
						case 'PAJAK_STNK': return 3;
						case 'KIR': return 4;
						case 'KIU': return 5;
						case 'IZIN_B3': return 6;
						case 'IBM': return 7;
						case 'UJI_EMISI': return 8;
						case 'FAKTUR_ARMADA': return 9;
						default: return 10;
					}
				};
				if (rank(a.type_code) !== rank(b.type_code)) return rank(a.type_code) - rank(b.type_code);
				return (a.title || '').localeCompare(b.title || '');
			});
		}

		const paginated = filtered.slice(offset, offset + perPage);

		// Ambil list doc types khusus fleet & driver
		const docTypes = await sql`
			SELECT code, name FROM dms.m_doc_type 
			WHERE code IN (
				'BPKB', 'STNK', 'PAJAK_STNK', 'KIR', 'KIU', 'IZIN_B3', 'IBM', 'UJI_EMISI', 'FAKTUR_ARMADA',
				'SIM_DRIVER', 'SERTIFIKAT_B3_DRIVER', 'SIO_DRIVER'
			)
			ORDER BY name
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
			metrics: { totalDocs: 0, fleetCount: 0, driverCount: 0, expired: 0, expiringSoon: 0, valid: 0 },
			docTypes: [],
			meta: { current_page: 1, per_page: 10, total: 0 }
		};
	}
};
