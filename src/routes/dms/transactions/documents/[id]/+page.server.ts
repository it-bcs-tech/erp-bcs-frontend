import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';
import { error } from '@sveltejs/kit';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { calculateExpiryGate, logDocumentAudit } from '$lib/server/dms';
import type { DocumentItem, DocumentVersion, DocumentCustodyLog, DocumentAuditLog } from '$lib/types/dms';

export const load: PageServerLoad = async ({ params }) => {
	const { id } = params;

	try {
		const [doc] = await sql`
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
				fl.code as filing_location_code,
				i.name as issuer_name,
				n.name as notary_name
			FROM dms.documents d
			LEFT JOIN dms.m_doc_type dt ON dt.id = d.doc_type_id
			LEFT JOIN master.m_customer c ON c.id = d.partner_id
			LEFT JOIN fleet.unit u ON u.id = d.asset_id
			LEFT JOIN master.m_drivers drv ON drv.id = d.employee_id
			LEFT JOIN master.m_karyawan k ON k.id = drv.karyawan_id
			LEFT JOIN dms.m_filing_location fl ON fl.id = d.filing_location_id
			LEFT JOIN dms.m_issuer i ON i.id = d.issuer_id
			LEFT JOIN dms.m_notary n ON n.id = d.notary_id
			WHERE d.id = ${id}
		`;

		if (!doc) {
			throw error(404, 'Dokumen tidak ditemukan');
		}

		// Hitung lifecycle expiry gate terkini
		const { daysRemaining, gateLevel, computedStatus } = calculateExpiryGate(doc.expiry_date, doc.status);

		const documentData: DocumentItem = {
			...doc,
			status: computedStatus,
			days_remaining: daysRemaining,
			gate_level: gateLevel
		};

		// Ambil riwayat versi
		const versions = await sql<DocumentVersion[]>`
			SELECT * 
			FROM dms.document_versions 
			WHERE document_id = ${id} 
			ORDER BY version_number DESC
		`;

		// Ambil log peminjaman fisik (custody)
		const custodyLogs = await sql<DocumentCustodyLog[]>`
			SELECT * 
			FROM dms.document_custody_logs 
			WHERE document_id = ${id} 
			ORDER BY created_at DESC
		`;

		// Ambil log audit ISO 27001
		const auditLogs = await sql<DocumentAuditLog[]>`
			SELECT * 
			FROM dms.document_audit_logs 
			WHERE document_id = ${id} 
			ORDER BY created_at DESC 
			LIMIT 50
		`;

		// Catat view audit log
		await logDocumentAudit({
			documentId: id,
			action: 'VIEW',
			userName: 'Staff ERP',
			details: {
				title: doc.title,
				current_version: doc.current_version
			}
		});

		return {
			document: documentData,
			versions,
			custodyLogs,
			auditLogs
		};
	} catch (err: any) {
		console.error('Error loading DMS document detail:', err);
		throw error(500, 'Gagal memuat detail dokumen');
	}
};

export const actions: Actions = {
	// Aksi 1: Perpanjangan Dokumen & Snapshot Versi Baru (Renewal Hub)
	renewDoc: async ({ request, params }) => {
		const { id } = params;
		const data = await request.formData();

		const doc_number = data.get('doc_number') as string;
		const issue_date = data.get('issue_date') as string;
		const expiry_date = data.get('expiry_date') as string;
		const change_summary = data.get('change_summary') as string;
		const notes = data.get('notes') as string;

		if (!expiry_date) {
			return { success: false, message: 'Tanggal jatuh tempo baru wajib diisi untuk perpanjangan!' };
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
			// 1. Ambil dokumen saat ini
			const [currentDoc] = await sql`SELECT * FROM dms.documents WHERE id = ${id}`;
			if (!currentDoc) return { success: false, message: 'Dokumen tidak ditemukan' };

			const newVersionNumber = (currentDoc.current_version || 1) + 1;
			const { computedStatus } = calculateExpiryGate(expiry_date);
			const effectiveFilePath = file_path || currentDoc.file_path;

			// 2. Simpan snapshot versi baru
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
					${id},
					${newVersionNumber},
					${doc_number || currentDoc.doc_number},
					${currentDoc.title},
					${issue_date || null},
					${expiry_date},
					${effectiveFilePath},
					${change_summary || 'Perpanjangan Masa Berlaku Dokumen'},
					${currentDoc.metadata ? sql.json(currentDoc.metadata) : null},
					'Staff ERP'
				)
			`;

			// 3. Update dokumen aktif
			await sql`
				UPDATE dms.documents SET
					doc_number = ${doc_number || currentDoc.doc_number},
					issue_date = ${issue_date || currentDoc.issue_date},
					expiry_date = ${expiry_date},
					status = ${computedStatus},
					current_version = ${newVersionNumber},
					${file_path ? sql`file_path = ${file_path},` : sql``}
					notes = ${notes ? (currentDoc.notes ? currentDoc.notes + '\n' + notes : notes) : currentDoc.notes},
					updated_at = CURRENT_TIMESTAMP
				WHERE id = ${id}
			`;

			// 4. Catat Audit Log
			await logDocumentAudit({
				documentId: id,
				action: 'RENEW',
				userName: 'Staff ERP',
				details: {
					previous_version: currentDoc.current_version,
					new_version: newVersionNumber,
					new_expiry: expiry_date,
					change_summary
				}
			});

			return {
				success: true,
				message: `Dokumen berhasil diperpanjang! Versi telah dinaikkan ke v${newVersionNumber}.`
			};
		} catch (err: any) {
			console.error('Error renewing document:', err);
			return { success: false, message: err.message || 'Gagal memperpanjang dokumen' };
		}
	},

	// Aksi 2: Peminjaman Fisik (Check-Out)
	checkoutCustody: async ({ request, params }) => {
		const { id } = params;
		const data = await request.formData();

		const borrower_name = data.get('borrower_name') as string;
		const borrower_role = data.get('borrower_role') as string;
		const borrow_date = (data.get('borrow_date') as string) || new Date().toISOString().slice(0, 10);
		const expected_return_date = data.get('expected_return_date') as string;
		const purpose = data.get('purpose') as string;
		const notes = data.get('notes') as string;

		if (!borrower_name || !purpose) {
			return { success: false, message: 'Nama Peminjam dan Keperluan Peminjaman wajib diisi!' };
		}

		try {
			// Insert custody log
			await sql`
				INSERT INTO dms.document_custody_logs (
					document_id,
					action,
					borrower_name,
					borrower_role,
					borrow_date,
					expected_return_date,
					purpose,
					notes,
					created_by
				) VALUES (
					${id},
					'CHECK_OUT',
					${borrower_name},
					${borrower_role || null},
					${borrow_date},
					${expected_return_date || null},
					${purpose},
					${notes || null},
					'Staff ERP'
				)
			`;

			// Update document physical status
			await sql`
				UPDATE dms.documents SET
					physical_status = 'BORROWED',
					updated_at = CURRENT_TIMESTAMP
				WHERE id = ${id}
			`;

			// Audit log
			await logDocumentAudit({
				documentId: id,
				action: 'CUSTODY_CHECKOUT',
				userName: 'Staff ERP',
				details: {
					borrower_name,
					borrower_role,
					purpose,
					expected_return_date
				}
			});

			return { success: true, message: 'Peminjaman berkas fisik berhasil dicatat!' };
		} catch (err: any) {
			console.error('Error recording custody checkout:', err);
			return { success: false, message: err.message || 'Gagal mencatat peminjaman berkas' };
		}
	},

	// Aksi 3: Pengembalian Fisik (Check-In)
	checkinCustody: async ({ request, params }) => {
		const { id } = params;
		const data = await request.formData();

		const borrower_name = data.get('borrower_name') as string;
		const actual_return_date = (data.get('actual_return_date') as string) || new Date().toISOString().slice(0, 10);
		const notes = data.get('notes') as string;

		try {
			// Insert custody log check-in
			await sql`
				INSERT INTO dms.document_custody_logs (
					document_id,
					action,
					borrower_name,
					borrow_date,
					actual_return_date,
					purpose,
					notes,
					created_by
				) VALUES (
					${id},
					'CHECK_IN',
					${borrower_name || 'Staff/Driver'},
					CURRENT_DATE,
					${actual_return_date},
					'Pengembalian Berkas Fisik ke Lemari Arsip',
					${notes || null},
					'Staff ERP'
				)
			`;

			// Update document physical status back to storage
			await sql`
				UPDATE dms.documents SET
					physical_status = 'IN_STORAGE',
					updated_at = CURRENT_TIMESTAMP
				WHERE id = ${id}
			`;

			// Audit log
			await logDocumentAudit({
				documentId: id,
				action: 'CUSTODY_CHECKIN',
				userName: 'Staff ERP',
				details: {
					borrower_name,
					actual_return_date
				}
			});

			return { success: true, message: 'Pengembalian berkas fisik berhasil dikonfirmasi ke rak!' };
		} catch (err: any) {
			console.error('Error recording custody checkin:', err);
			return { success: false, message: err.message || 'Gagal mencatat pengembalian berkas' };
		}
	}
};
