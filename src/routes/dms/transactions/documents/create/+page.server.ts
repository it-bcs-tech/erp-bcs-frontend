import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';
import { error, redirect } from '@sveltejs/kit';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

export const load: PageServerLoad = async () => {
	try {
		const docTypes = await sql`SELECT id, code, name FROM documents.m_doc_type WHERE is_active = true ORDER BY name`;
		const notaries = await sql`SELECT id, name FROM documents.m_notary WHERE is_active = true ORDER BY name`;
		const issuers = await sql`SELECT id, name FROM documents.m_issuer WHERE is_active = true ORDER BY name`;
		const locations = await sql`SELECT id, name FROM documents.m_filing_location WHERE is_active = true ORDER BY name`;
		const partners = await sql`SELECT id, nama_kustomer as name FROM master.m_customer WHERE is_active = true ORDER BY name`;
		// Using fleet.unit for vehicles/assets (for BPKB etc)
		const assets = await sql`SELECT id, nomor_unit as name FROM fleet.unit ORDER BY nomor_unit`;
		
		return {
			docTypes,
			notaries,
			issuers,
			locations,
			partners,
			assets
		};
	} catch (err: any) {
		console.error("Error loading create doc prerequisites:", err);
		throw error(500, 'Gagal memuat master data untuk form dokumen');
	}
};

export const actions: Actions = {
	saveDoc: async ({ request, locals }) => {
		const data = await request.formData();
		const payloadStr = data.get('payload');
		
		if (!payloadStr) {
			return { success: false, message: 'Payload is required' };
		}

		let file_path = null;
		const file = data.get('file_upload') as File;
		if (file && file.size > 0) {
			const ext = file.name.split('.').pop() || 'pdf';
			const filename = `doc-${randomUUID()}.${ext}`;
			const uploadDir = join(process.cwd(), 'uploads');
			
			await mkdir(uploadDir, { recursive: true });
			
			const arrayBuffer = await file.arrayBuffer();
			const buffer = Buffer.from(arrayBuffer);
			
			await writeFile(join(uploadDir, filename), buffer);
			file_path = filename;
		}

		try {
			const payload = JSON.parse(payloadStr.toString());
			const {
				doc_number,
				doc_type_id,
				title,
				partner_id,
				asset_id,
				notary_id,
				issuer_id,
				issue_date,
				expiry_date,
				filing_location_id,
				notes,
				metadata // JSONB
			} = payload;

			if (!title || !doc_type_id) {
				return { success: false, message: 'Title dan Tipe Dokumen wajib diisi' };
			}

			// Insert logic
			const [result] = await sql`
				INSERT INTO documents.documents (
					doc_number, doc_type_id, title, partner_id, asset_id, notary_id, issuer_id,
					issue_date, expiry_date, filing_location_id, notes, metadata, file_path, created_by
				) VALUES (
					${doc_number || null}, ${doc_type_id}, ${title}, ${partner_id || null}, ${asset_id || null}, 
					${notary_id || null}, ${issuer_id || null},
					${issue_date || null}, ${expiry_date || null}, ${filing_location_id || null}, 
					${notes || null}, ${metadata || null}, ${file_path}, 'System'
				) RETURNING id
			`;

			return { success: true, message: 'Dokumen berhasil disimpan!', id: result.id };
		} catch (err: any) {
			console.error("Error saving document:", err);
			return { success: false, message: err.message || 'Gagal menyimpan dokumen' };
		}
	}
};
