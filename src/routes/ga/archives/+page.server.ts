import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
	try {
		const [racks, shelves, archives] = await Promise.all([
			sql`
				SELECT r.id, r.rack_name,
					COUNT(a.id)::int as doc_count
				FROM ga.archive_racks r
				LEFT JOIN ga.archives a ON a.rack_id = r.id
				GROUP BY r.id, r.rack_name
				ORDER BY r.id ASC
			`,
			sql`
				SELECT s.id, s.rack_id, r.rack_name, s.shelf_name,
					COUNT(a.id)::int as doc_count
				FROM ga.archive_shelves s
				JOIN ga.archive_racks r ON s.rack_id = r.id
				LEFT JOIN ga.archives a ON a.shelf_id = s.id
				GROUP BY s.id, s.rack_id, r.rack_name, s.shelf_name
				ORDER BY s.rack_id ASC, s.id ASC
			`,
			sql`
				SELECT
					a.id,
					a.rack_id,
					r.rack_name,
					a.shelf_id,
					s.shelf_name,
					a.archive_number,
					a.department,
					a.document_name,
					a.document_year,
					a.retention_years,
					to_char(a.destruction_date, 'YYYY-MM-DD') as destruction_date,
					a.raw_destruction,
					a.status,
					a.file_path,
					to_char(a.created_at, 'YYYY-MM-DD HH24:MI') as created_at,
					CASE
						WHEN a.destruction_date IS NOT NULL AND a.destruction_date <= CURRENT_DATE THEN true
						ELSE false
					END as is_due_destruction
				FROM ga.archives a
				LEFT JOIN ga.archive_racks r ON a.rack_id = r.id
				LEFT JOIN ga.archive_shelves s ON a.shelf_id = s.id
				ORDER BY a.rack_id ASC, a.shelf_id ASC, a.id DESC
			`
		]);

		const totalDocs = archives.length;
		const activeDocs = archives.filter((a: any) => a.status === 'aktif').length;
		const dueDestructionCount = archives.filter((a: any) => a.is_due_destruction && a.status === 'aktif').length;
		const departments = [...new Set(archives.map((a: any) => a.department).filter(Boolean))].sort();

		return {
			racks,
			shelves,
			archives,
			departments,
			stats: {
				totalDocs,
				activeDocs,
				dueDestructionCount,
				totalRacks: racks.length,
				totalShelves: shelves.length
			}
		};
	} catch (err) {
		console.error('Error loading GA archives:', err);
		return {
			racks: [],
			shelves: [],
			archives: [],
			departments: [],
			stats: {
				totalDocs: 0,
				activeDocs: 0,
				dueDestructionCount: 0,
				totalRacks: 0,
				totalShelves: 0
			}
		};
	}
};

export const actions: Actions = {
	createArchive: async ({ request }) => {
		const data = await request.formData();
		const rack_id = Number(data.get('rack_id'));
		const shelf_id = Number(data.get('shelf_id'));
		const archive_number = data.get('archive_number')?.toString().trim();
		const department = data.get('department')?.toString().trim().toUpperCase();
		const document_name = data.get('document_name')?.toString().trim();
		const document_year = Number(data.get('document_year') || new Date().getFullYear());
		const retention_years = Number(data.get('retention_years') || 10);
		let destruction_date = data.get('destruction_date')?.toString() || null;

		if (!rack_id || !shelf_id || !archive_number || !department || !document_name) {
			return fail(400, { message: 'Rak, Lantai, No. Arsip, Departemen, dan Nama Dokumen wajib diisi!' });
		}

		if (!destruction_date && document_year > 1990 && retention_years > 0) {
			destruction_date = `${document_year + retention_years}-01-01`;
		}

		try {
			await sql`
				INSERT INTO ga.archives (
					rack_id, shelf_id, archive_number, department, document_name,
					document_year, retention_years, destruction_date, raw_destruction, status
				) VALUES (
					${rack_id}, ${shelf_id}, ${archive_number}, ${department}, ${document_name},
					${document_year}, ${retention_years}, ${destruction_date}, ${destruction_date}, 'aktif'
				)
			`;
			return { success: true, message: `Berkas arsip ${archive_number} - ${document_name} berhasil disimpan` };
		} catch (e: any) {
			console.error('Error creating archive:', e);
			return fail(500, { message: e.message || 'Gagal menyimpan berkas arsip' });
		}
	},

	updateArchiveStatus: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		const status = data.get('status')?.toString() || 'dimusnahkan';
		if (!id) return fail(400, { message: 'ID arsip tidak valid' });

		try {
			await sql`
				UPDATE ga.archives SET status = ${status} WHERE id = ${id}
			`;
			return { success: true, message: `Status berkas arsip diperbarui menjadi ${status}` };
		} catch (e: any) {
			console.error('Error updating archive status:', e);
			return fail(500, { message: 'Gagal memperbarui status arsip' });
		}
	},

	deleteArchive: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		if (!id) return fail(400, { message: 'ID arsip tidak valid' });

		try {
			await sql`DELETE FROM ga.archives WHERE id = ${id}`;
			return { success: true, message: 'Data berkas arsip dihapus' };
		} catch (e: any) {
			console.error('Error deleting archive:', e);
			return fail(500, { message: 'Gagal menghapus arsip' });
		}
	},

	createRack: async ({ request }) => {
		const data = await request.formData();
		const rack_name = data.get('rack_name')?.toString().trim();
		const shelf_count = Math.min(10, Math.max(1, Number(data.get('shelf_count') || 5)));

		if (!rack_name) return fail(400, { message: 'Nama rak wajib diisi!' });

		try {
			const [newRack] = await sql`
				INSERT INTO ga.archive_racks (rack_name) VALUES (${rack_name}) RETURNING id
			`;
			for (let i = 1; i <= shelf_count; i++) {
				await sql`
					INSERT INTO ga.archive_shelves (rack_id, shelf_name)
					VALUES (${newRack.id}, ${`LT ${i}`})
				`;
			}
			return { success: true, message: `${rack_name} beserta ${shelf_count} lantai berhasil dibuat` };
		} catch (e: any) {
			console.error('Error creating rack:', e);
			return fail(500, { message: 'Gagal membuat rak arsip' });
		}
	}
};
