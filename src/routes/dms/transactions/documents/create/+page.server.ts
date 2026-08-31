import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';
import { error } from '@sveltejs/kit';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { calculateExpiryGate, logDocumentAudit } from '$lib/server/dms';
import type { DMSEntityType } from '$lib/types/dms';

export const load: PageServerLoad = async () => {
	try {
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

		// Khusus driver operasional: master.m_drivers JOIN master.m_karyawan
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
			docTypes,
			notaries,
			issuers,
			locations,
			partners,
			assets,
			drivers
		};
	} catch (err: any) {
		console.error('Error loading create doc prerequisites:', err);
		throw error(500, 'Gagal memuat data referensi untuk form registrasi dokumen');
	}
};

export const actions: Actions = {
	saveDoc: async ({ request }) => {
		const data = await request.formData();
		const payloadStr = data.get('payload');

		if (!payloadStr) {
			return { success: false, message: 'Payload data tidak ditemukan' };
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
				entity_type = 'CORPORATE',
				partner_id,
				asset_id,
				employee_id,
				notary_id,
				issuer_id,
				issue_date,
				expiry_date,
				filing_location_id,
				notes,
				metadata
			} = payload;

			if (!title || !doc_type_id) {
				return { success: false, message: 'Judul Dokumen dan Tipe Dokumen wajib diisi!' };
			}

			// Hitung status lifecycle otomatis berbasis expiry_date
			const { computedStatus } = calculateExpiryGate(expiry_date);
			const qrCodeId = `BCS-DMS-${randomUUID().substring(0, 8).toUpperCase()}`;

			const formattedAssetId = asset_id ? Number(asset_id) : null;
			const formattedEmployeeId = employee_id ? Number(employee_id) : null;
			const formattedPartnerId = partner_id ? partner_id : null;

			// 1. Simpan dokumen utama
			const [doc] = await sql`
				INSERT INTO dms.documents (
					doc_number, 
					doc_type_id, 
					title, 
					entity_type,
					partner_id, 
					asset_id, 
					employee_id,
					notary_id, 
					issuer_id,
					issue_date, 
					expiry_date, 
					status,
					current_version,
					physical_status,
					qr_code_id,
					filing_location_id, 
					notes, 
					metadata, 
					file_path, 
					created_by
				) VALUES (
					${doc_number || null}, 
					${doc_type_id}, 
					${title}, 
					${entity_type as DMSEntityType},
					${formattedPartnerId}, 
					${formattedAssetId}, 
					${formattedEmployeeId},
					${notary_id || null}, 
					${issuer_id || null},
					${issue_date || null}, 
					${expiry_date || null}, 
					${computedStatus},
					1,
					'IN_STORAGE',
					${qrCodeId},
					${filing_location_id || null}, 
					${notes || null}, 
					${metadata ? sql.json(metadata) : null}, 
					${file_path}, 
					'Staff ERP'
				) RETURNING id, title, doc_number
			`;

			// 2. Buat snapshot versi awal (Version 1)
			await sql`
				INSERT INTO dms.document_versions (
					document_id,
					version_number,
					doc_number,
					title,
					issue_date,
					expiry_date,
					file_path,
					change_summary,
					metadata,
					created_by
				) VALUES (
					${doc.id},
					1,
					${doc_number || null},
					${title},
					${issue_date || null},
					${expiry_date || null},
					${file_path},
					'Initial document registration',
					${metadata ? sql.json(metadata) : null},
					'Staff ERP'
				)
			`;

			// 3. Catat Audit Log (ISO 27001)
			await logDocumentAudit({
				documentId: doc.id,
				action: 'CREATE',
				userName: 'Staff ERP',
				details: {
					title,
					doc_number,
					entity_type,
					status: computedStatus,
					qr_code_id: qrCodeId
				}
			});

			return {
				success: true,
				message: `Dokumen "${title}" berhasil didaftarkan ke sistem DMS!`,
				id: doc.id
			};
		} catch (err: any) {
			console.error('Error saving document:', err);
			return { success: false, message: err.message || 'Gagal menyimpan dokumen' };
		}
	}
};
