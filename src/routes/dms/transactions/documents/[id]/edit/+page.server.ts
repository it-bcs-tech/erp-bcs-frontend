import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';
import { error, redirect } from '@sveltejs/kit';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

export const load: PageServerLoad = async ({ params }) => {
	const { id } = params;
	try {
		// Load the document
		const [doc] = await sql`SELECT * FROM documents.documents WHERE id = ${id}`;
		if (!doc) throw error(404, 'Dokumen tidak ditemukan');

		// Load master data for dropdowns
		const docTypes = await sql`SELECT id, code, name FROM documents.m_doc_type WHERE is_active = true ORDER BY name`;
		const notaries = await sql`SELECT id, name FROM documents.m_notary WHERE is_active = true ORDER BY name`;
		const issuers = await sql`SELECT id, name FROM documents.m_issuer WHERE is_active = true ORDER BY name`;
		const locations = await sql`SELECT id, name FROM documents.m_filing_location WHERE is_active = true ORDER BY name`;
		const partners = await sql`SELECT id, nama_kustomer as name FROM master.m_customer WHERE is_active = true ORDER BY name`;
		const assets = await sql`SELECT id, nomor_unit as name FROM fleet.unit ORDER BY nomor_unit`;

		return {
			doc,
			docTypes,
			notaries,
			issuers,
			locations,
			partners,
			assets
		};
	} catch (err: any) {
		console.error("Error loading DMS edit page:", err);
		throw error(500, 'Gagal memuat data master atau dokumen');
	}
};

export const actions: Actions = {
	default: async ({ request, params }) => {
		const { id } = params;
		const formData = await request.formData();
		
		const title = formData.get('title') as string;
		const doc_number = formData.get('doc_number') as string;
		const doc_type_id = formData.get('doc_type_id') as string;
		
		const partner_id = formData.get('partner_id') as string;
		const asset_id = formData.get('asset_id') as string;
		const employee_id = formData.get('employee_id') as string;
		
		const notary_id = formData.get('notary_id') as string;
		const issuer_id = formData.get('issuer_id') as string;
		const filing_location_id = formData.get('filing_location_id') as string;
		
		const issue_date = formData.get('issue_date') as string;
		const expiry_date = formData.get('expiry_date') as string;
		const status = formData.get('status') as string;
		const notes = formData.get('notes') as string;

		// Metadata for dynamic fields (e.g., Ownership, Brankas)
		const metadataEntriesStr = formData.get('metadata') as string;
		let metadata = {};
		try {
			if (metadataEntriesStr) metadata = JSON.parse(metadataEntriesStr);
		} catch (e) {
			console.warn("Invalid metadata JSON", e);
		}

		if (!title || !doc_type_id) {
			return { success: false, error: 'Title and Type are required.' };
		}

		let file_path = null;
		const file = formData.get('file_upload') as File;
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
			await sql`
				UPDATE documents.documents SET
					doc_number = ${doc_number || null}, 
					doc_type_id = ${doc_type_id}, 
					title = ${title}, 
					partner_id = ${partner_id || null}, 
					asset_id = ${asset_id || null}, 
					employee_id = ${employee_id || null}, 
					notary_id = ${notary_id || null}, 
					issuer_id = ${issuer_id || null},
					issue_date = ${issue_date || null}, 
					expiry_date = ${expiry_date || null}, 
					filing_location_id = ${filing_location_id || null}, 
					status = ${status || 'ACTIVE'},
					notes = ${notes || null}, 
					metadata = ${metadata},
					file_path = COALESCE(${file_path}, file_path)
				WHERE id = ${id}
			`;
		} catch (err: any) {
			console.error("Error updating document:", err);
			return { success: false, error: err.message };
		}

		throw redirect(303, `/dms/transactions/documents/${id}`);
	}
};
