import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url }) => {
	try {
		const search = (url.searchParams.get('search') || '').trim().toLowerCase();
		const typeFilter = url.searchParams.get('type') || 'All';
		const gateFilter = url.searchParams.get('gate') || 'All';
		const sortBy = url.searchParams.get('sort') || 'expiry_asc';

		const [rawPermits, rawLogs, fleetUnits] = await Promise.all([
			sql`
				SELECT 
					p.id,
					p.unit_id,
					p.unit_number,
					p.police_number,
					p.chassis_number,
					p.engine_number,
					p.permit_type,
					p.document_number,
					p.institution,
					to_char(p.issue_date, 'YYYY-MM-DD') as issue_date,
					to_char(p.expiry_date, 'YYYY-MM-DD') as expiry_date_str,
					p.expiry_date,
					(p.expiry_date - CURRENT_DATE)::int as days_remaining,
					p.file_url,
					p.status as manual_status,
					COALESCE(p.renewal_cost, 0)::numeric as renewal_cost,
					p.notes,
					to_char(p.updated_at, 'YYYY-MM-DD HH24:MI') as updated_at
				FROM ga.fleet_legal_permits p
			`,
			sql`
				SELECT 
					l.id,
					l.permit_id,
					to_char(l.renewal_date, 'YYYY-MM-DD') as renewal_date,
					to_char(l.extended_to, 'YYYY-MM-DD') as extended_to,
					COALESCE(l.cost, 0)::numeric as cost,
					l.handled_by,
					l.receipt_doc,
					l.notes,
					to_char(l.created_at, 'YYYY-MM-DD') as created_at
				FROM ga.permit_renewal_logs l
				ORDER BY l.renewal_date DESC, l.id DESC
			`,
			sql`
				SELECT id, nomor_unit, no_rangka, no_mesin
				FROM fleet.unit
				ORDER BY nomor_unit ASC
				LIMIT 150
			`
		]);

		// Group logs by permit_id
		const logsMap = new Map<number, any[]>();
		for (const l of rawLogs) {
			if (!logsMap.has(l.permit_id)) {
				logsMap.set(l.permit_id, []);
			}
			logsMap.get(l.permit_id)!.push(l);
		}

		// Calculate dynamic gate level & status
		const processedPermits = rawPermits.map((p: any) => {
			const days = p.days_remaining;
			let gateLevel = 'VALID';
			let computedStatus = 'VALID';

			if (days < 0) {
				gateLevel = 'EXPIRED';
				computedStatus = 'EXPIRED';
			} else if (days <= 7) {
				gateLevel = 'URGENT_7';
				computedStatus = 'EXPIRING_SOON';
			} else if (days <= 30) {
				gateLevel = 'CRITICAL_30';
				computedStatus = 'EXPIRING_SOON';
			} else {
				gateLevel = 'VALID';
				computedStatus = 'VALID';
			}

			return {
				...p,
				renewal_cost: parseFloat(p.renewal_cost || '0'),
				days_remaining: days,
				gateLevel,
				computedStatus,
				renewalLogs: logsMap.get(p.id) || []
			};
		});

		// Calculate Stats
		const totalPermits = processedPermits.length;
		const expiredCount = processedPermits.filter(p => p.gateLevel === 'EXPIRED').length;
		const urgentCount = processedPermits.filter(p => p.gateLevel === 'URGENT_7').length;
		const criticalCount = processedPermits.filter(p => p.gateLevel === 'CRITICAL_30').length;
		const validCount = processedPermits.filter(p => p.gateLevel === 'VALID').length;
		const attentionCost = processedPermits
			.filter(p => p.gateLevel !== 'VALID')
			.reduce((acc, cur) => acc + cur.renewal_cost, 0);

		// Apply Filters
		let filtered = processedPermits;
		if (search) {
			filtered = filtered.filter((p: any) =>
				(p.unit_number && p.unit_number.toLowerCase().includes(search)) ||
				(p.police_number && p.police_number.toLowerCase().includes(search)) ||
				(p.document_number && p.document_number.toLowerCase().includes(search)) ||
				(p.institution && p.institution.toLowerCase().includes(search)) ||
				(p.chassis_number && p.chassis_number.toLowerCase().includes(search))
			);
		}
		if (typeFilter !== 'All') {
			filtered = filtered.filter((p: any) => p.permit_type === typeFilter);
		}
		if (gateFilter !== 'All') {
			if (gateFilter === 'ATTENTION') {
				filtered = filtered.filter((p: any) => p.gateLevel !== 'VALID');
			} else {
				filtered = filtered.filter((p: any) => p.gateLevel === gateFilter);
			}
		}

		// Sorting
		if (sortBy === 'expiry_asc') {
			filtered.sort((a, b) => a.days_remaining - b.days_remaining);
		} else if (sortBy === 'cost_desc') {
			filtered.sort((a, b) => b.renewal_cost - a.renewal_cost);
		} else if (sortBy === 'unit_asc') {
			filtered.sort((a, b) => (a.unit_number || '').localeCompare(b.unit_number || ''));
		}

		return {
			permits: filtered,
			totalCount: totalPermits,
			stats: {
				totalPermits,
				expiredCount,
				urgentCount,
				criticalCount,
				validCount,
				attentionCost
			},
			fleetUnits: fleetUnits || []
		};
	} catch (err) {
		console.error('Error loading fleet legal permits:', err);
		return {
			permits: [],
			totalCount: 0,
			stats: {
				totalPermits: 0,
				expiredCount: 0,
				urgentCount: 0,
				criticalCount: 0,
				validCount: 0,
				attentionCost: 0
			},
			fleetUnits: []
		};
	}
};

export const actions: Actions = {
	createPermit: async ({ request }) => {
		const data = await request.formData();
		const unit_number = data.get('unit_number')?.toString().trim();
		const police_number = data.get('police_number')?.toString().trim() || null;
		const chassis_number = data.get('chassis_number')?.toString().trim() || null;
		const engine_number = data.get('engine_number')?.toString().trim() || null;
		const permit_type = data.get('permit_type')?.toString();
		const document_number = data.get('document_number')?.toString().trim();
		const institution = data.get('institution')?.toString().trim() || null;
		const issue_date = data.get('issue_date')?.toString() || null;
		const expiry_date = data.get('expiry_date')?.toString();
		const renewal_cost = parseFloat(data.get('renewal_cost')?.toString() || '0');
		const file_url = data.get('file_url')?.toString().trim() || null;
		const notes = data.get('notes')?.toString().trim() || null;

		if (!unit_number || !permit_type || !document_number || !expiry_date) {
			return fail(400, { message: 'Nomor unit, tipe dokumen, nomor dokumen, dan tanggal jatuh tempo wajib diisi!' });
		}

		try {
			await sql`
				INSERT INTO ga.fleet_legal_permits (
					unit_number, police_number, chassis_number, engine_number,
					permit_type, document_number, institution, issue_date, expiry_date,
					status, renewal_cost, file_url, notes
				) VALUES (
					${unit_number}, ${police_number}, ${chassis_number}, ${engine_number},
					${permit_type}, ${document_number}, ${institution}, ${issue_date}, ${expiry_date},
					'VALID', ${renewal_cost}, ${file_url}, ${notes}
				)
			`;
			return { success: true, message: 'Dokumen legalitas armada berhasil didaftarkan' };
		} catch (e: any) {
			console.error('Error creating permit:', e);
			return fail(500, { message: e.message || 'Gagal mendaftarkan dokumen legalitas' });
		}
	},

	renewPermit: async ({ request }) => {
		const data = await request.formData();
		const permit_id = data.get('permit_id')?.toString();
		const renewal_date = data.get('renewal_date')?.toString() || new Date().toISOString().split('T')[0];
		const extended_to = data.get('extended_to')?.toString();
		const cost = parseFloat(data.get('cost')?.toString() || '0');
		const handled_by = data.get('handled_by')?.toString().trim() || 'Internal GA';
		const notes = data.get('notes')?.toString().trim() || null;
		const receipt_doc = data.get('receipt_doc')?.toString().trim() || null;

		if (!permit_id || !extended_to) {
			return fail(400, { message: 'ID Dokumen dan Tanggal Perpanjangan Baru wajib diisi!' });
		}

		try {
			// 1. Insert Renewal Log
			await sql`
				INSERT INTO ga.permit_renewal_logs (
					permit_id, renewal_date, extended_to, cost, handled_by, receipt_doc, notes
				) VALUES (
					${permit_id}, ${renewal_date}, ${extended_to}, ${cost}, ${handled_by}, ${receipt_doc}, ${notes}
				)
			`;

			// 2. Update Permit Master Record
			await sql`
				UPDATE ga.fleet_legal_permits SET
					expiry_date = ${extended_to},
					issue_date = ${renewal_date},
					renewal_cost = ${cost},
					status = 'VALID',
					notes = COALESCE(${notes}, notes),
					updated_at = NOW()
				WHERE id = ${permit_id}
			`;

			return { success: true, message: 'Perpanjangan dokumen legalitas berhasil dicatat & masa berlaku diperbarui' };
		} catch (e: any) {
			console.error('Error renewing permit:', e);
			return fail(500, { message: 'Gagal mencatat perpanjangan dokumen' });
		}
	},

	updatePermit: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();
		const unit_number = data.get('unit_number')?.toString().trim();
		const police_number = data.get('police_number')?.toString().trim() || null;
		const chassis_number = data.get('chassis_number')?.toString().trim() || null;
		const engine_number = data.get('engine_number')?.toString().trim() || null;
		const permit_type = data.get('permit_type')?.toString();
		const document_number = data.get('document_number')?.toString().trim();
		const institution = data.get('institution')?.toString().trim() || null;
		const issue_date = data.get('issue_date')?.toString() || null;
		const expiry_date = data.get('expiry_date')?.toString();
		const renewal_cost = parseFloat(data.get('renewal_cost')?.toString() || '0');
		const notes = data.get('notes')?.toString().trim() || null;

		if (!id || !unit_number || !permit_type || !document_number || !expiry_date) {
			return fail(400, { message: 'Data wajib belum lengkap diisi!' });
		}

		try {
			await sql`
				UPDATE ga.fleet_legal_permits SET
					unit_number = ${unit_number},
					police_number = ${police_number},
					chassis_number = ${chassis_number},
					engine_number = ${engine_number},
					permit_type = ${permit_type},
					document_number = ${document_number},
					institution = ${institution},
					issue_date = ${issue_date},
					expiry_date = ${expiry_date},
					renewal_cost = ${renewal_cost},
					notes = ${notes},
					updated_at = NOW()
				WHERE id = ${id}
			`;
			return { success: true, message: 'Data dokumen berhasil diperbarui' };
		} catch (e: any) {
			console.error('Error updating permit:', e);
			return fail(500, { message: 'Gagal memperbarui dokumen' });
		}
	},

	deletePermit: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();
		if (!id) return fail(400, { message: 'ID dokumen tidak valid' });

		try {
			await sql`DELETE FROM ga.fleet_legal_permits WHERE id = ${id}`;
			return { success: true, message: 'Dokumen berhasil dihapus' };
		} catch (e: any) {
			console.error('Error deleting permit:', e);
			return fail(500, { message: 'Gagal menghapus dokumen' });
		}
	}
};
