import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url }) => {
	try {
		const search = (url.searchParams.get('q') || '').trim().toLowerCase();

		const sheets = await sql`
			SELECT 
				ss.id,
				ss.ss_number as "ssNumber",
				COALESCE(ss.wo_no, '-') as "woNo",
				to_char(ss.date, 'YYYY-MM-DD') as date,
				COALESCE(u.nopol, u.hull_number, 'Unit-' || ss.unit_id) as "unitNopol",
				p.project_name as "projectName",
				COALESCE(ss.tipe, 'Perawatan Rutin') as tipe,
				COALESCE(ss.mekanik_name, 'Mekanik Workshop') as "mekanikName",
				COALESCE(ss.problem, '-') as problem,
				ss.status,
				ss.notes
			FROM procurement.service_sheet ss
			LEFT JOIN fleet.unit u ON u.id = ss.unit_id
			LEFT JOIN master.m_project p ON p.id = ss.project_id
			ORDER BY ss.id DESC
		`;

		const units = await sql`SELECT id, nopol, hull_number, model FROM fleet.unit ORDER BY nopol ASC LIMIT 100`;
		const projects = await sql`SELECT id, project_name FROM master.m_project WHERE is_active = true ORDER BY project_name`;

		let filtered = sheets;
		if (search) {
			filtered = filtered.filter(s =>
				(s.ssNumber && s.ssNumber.toLowerCase().includes(search)) ||
				(s.unitNopol && s.unitNopol.toLowerCase().includes(search)) ||
				(s.woNo && s.woNo.toLowerCase().includes(search)) ||
				(s.mekanikName && s.mekanikName.toLowerCase().includes(search)) ||
				(s.problem && s.problem.toLowerCase().includes(search))
			);
		}

		return {
			sheets: filtered,
			units,
			projects
		};
	} catch (err: any) {
		console.error('Error loading Service Sheets:', err);
		return { sheets: [], units: [], projects: [] };
	}
};

export const actions: Actions = {
	save: async ({ request }) => {
		const formData = await request.formData();
		const date = formData.get('date') as string || new Date().toISOString().split('T')[0];
		const woNo = (formData.get('woNo') as string || '').trim();
		const unitId = formData.get('unitId') ? parseInt(formData.get('unitId') as string) : null;
		const projectId = formData.get('projectId') ? parseInt(formData.get('projectId') as string) : null;
		const tipe = (formData.get('tipe') as string || 'Perawatan Rutin').trim();
		const mekanikName = (formData.get('mekanikName') as string || '').trim();
		const problem = (formData.get('problem') as string || '').trim();
		const notes = (formData.get('notes') as string || '').trim();

		if (!problem) {
			return fail(400, { success: false, message: 'Deskripsi Masalah/Problem perbaikan wajib diisi!' });
		}

		try {
			const now = new Date();
			const yymm = `${now.getFullYear().toString().slice(-2)}${(now.getMonth() + 1).toString().padStart(2, '0')}`;
			const [seqRow] = await sql`SELECT COUNT(*) as count FROM procurement.service_sheet`;
			const seq = (parseInt(seqRow?.count || '0') + 1).toString().padStart(4, '0');
			const ssNumber = `SS-${yymm}-${seq}`;

			await sql`
				INSERT INTO procurement.service_sheet (
					ss_number,
					wo_no,
					date,
					unit_id,
					project_id,
					tipe,
					mekanik_name,
					problem,
					notes,
					status
				) VALUES (
					${ssNumber},
					${woNo || `WO-${Date.now().toString().slice(-4)}`},
					${date},
					${unitId},
					${projectId},
					${tipe},
					${mekanikName},
					${problem},
					${notes},
					'OPEN'
				)
			`;
			return { success: true, message: 'Service Sheet berhasil dicatat!' };
		} catch (err: any) {
			console.error('Error creating service sheet:', err);
			return fail(500, { success: false, message: err.message || 'Gagal menyimpan service sheet' });
		}
	}
};
