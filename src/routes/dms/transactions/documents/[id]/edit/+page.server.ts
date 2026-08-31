import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';
import { error } from '@sveltejs/kit';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { calculateExpiryGate, logDocumentAudit } from '$lib/server/dms';
import type { DMSEntityType } from '$lib/types/dms';

export const load: PageServerLoad = async ({ params }) => {
	const { id } = params;
	try {
		const [doc] = await sql`
			SELECT 
				d.*,
				to_char(d.issue_date, 'YYYY-MM-DD') as issue_date_str,
				to_char(d.expiry_date, 'YYYY-MM-DD') as expiry_date_str
			FROM dms.documents d
			WHERE d.id = ${id}
		`;
		if (!doc) throw error(404, 'Dokumen tidak ditemukan');

		const docTypes = await sql`
			SELECT id, code, name, description 
			FROM dms.m_doc_type 
			WHERE is_active = true 
			ORDER BY name ASC
		`;

		const notaries = await sql`
			SELECT id, name 
			FROM dms.m_notary 
			WHERE is_active = true 
			ORDER BY name ASC
		`;

		const issuers = await sql`
			SELECT id, name, type 
			FROM dms.m_issuer 
			WHERE is_active = true 
			ORDER BY name ASC
		`;

		const locations = await sql`
			SELECT id, code, name, description 
			FROM dms.m_filing_location 
			WHERE is_active = true 
			ORDER BY name ASC
		`;

		const partners = await sql`
			SELECT id, nama_kustomer as name 
			FROM master.m_customer 
			ORDER BY nama_kustomer ASC
		`;

		const assets = await sql`
			SELECT id, nomor_unit as name, business_unit 
			FROM fleet.unit 
			WHERE deleted_at IS NULL 
			ORDER BY nomor_unit ASC
		`;

		const drivers = await sql`
			SELECT 
				d.id, 
				k.nama_karyawan as name, 
				k.payroll_id 
			FROM master.m_drivers d
			JOIN master.m_karyawan k ON k.id = d.karyawan_id
			WHERE (k.aktif = 'Y' OR k.aktif = '1' OR k.aktif IS NULL)
			ORDER BY k.nama_karyawan ASC
		`;

		return {
			doc,
			docTypes,
			notaries,
			issuers,
			locations,
			partners,
			assets,
			drivers
		};
	} catch (err: any) {
		console.error('Error loading DMS edit page:', err);
		throw error(500, 'Gagal memuat data master atau dokumen');
	}
};

export const actions: Actions = {
	default: async ({ request, params }) => {
		const { id } = params;
		const data = await request.formData();
		const payloadStr = data.get('payload');

		if (!payloadStr) {
			return { success: false, message: 'Payload data tidak ditemukan' };
		}

		let file_path: string | null = null;
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
				entity_type = 'CORPORATE',
				partner_id,
				asset_id,
				employee_id,
				notary_id,
				issuer_id,
				issue_date,
				expiry_date,
				filing_location_id,
				status,
				notes,
				metadata
			} = payload;

			if (!title || !doc_type_id) {
				return { success: false, message: 'Judul Dokumen dan Tipe Dokumen wajib diisi!' };
			}

			// Hitung ulang lifecycle status jika expiry berubah
			const { computedStatus } = calculateExpiryGate(expiry_date, status);

			const formattedAssetId = asset_id ? Number(asset_id) : null;
			const formattedEmployeeId = employee_id ? Number(employee_id) : null;
			const formattedPartnerId = partner_id ? partner_id : null;

			// Update document
			await sql`
				UPDATE dms.documents SET
					doc_number = ${doc_number || null},
					doc_type_id = ${doc_type_id},
					title = ${title},
					entity_type = ${entity_type as DMSEntityType},
					partner_id = ${formattedPartnerId},
					asset_id = ${formattedAssetId},
					employee_id = ${formattedEmployeeId},
					notary_id = ${notary_id || null},
					issuer_id = ${issuer_id || null},
					issue_date = ${issue_date || null},
					expiry_date = ${expiry_date || null},
					status = ${computedStatus},
					filing_location_id = ${filing_location_id || null},
					notes = ${notes || null},
					metadata = ${metadata ? sql.json(metadata) : null},
					${file_path ? sql`file_path = ${file_path},` : sql``}
					updated_at = CURRENT_TIMESTAMP
				WHERE id = ${id}
			`;

			// Catat log audit (ISO 27001)
			await logDocumentAudit({
				documentId: id,
				action: 'UPDATE',
				userName: 'Staff ERP',
				details: {
					title,
					doc_number,
					entity_type,
					status: computedStatus,
					file_updated: Boolean(file_path)
				}
			});

			return { success: true, message: 'Dokumen berhasil diperbarui!' };
		} catch (err: any) {
			console.error('Error updating document:', err);
			return { success: false, message: err.message || 'Gagal memperbarui dokumen' };
		}
	}
};
