import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import sql from '$lib/server/db';
import { mkdir, writeFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

function getNowWibTimestamp(): string {
	const now = new Date();
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone: 'Asia/Jakarta',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: false
	}).formatToParts(now);
	const map: Record<string, string> = {};
	for (const p of parts) map[p.type] = p.value;
	const hr = map.hour === '24' ? '00' : map.hour;
	return `${map.year}-${map.month}-${map.day} ${hr}:${map.minute}:${map.second || '00'}`;
}

async function handleFileUpload(file: File | null, prefix: string): Promise<string | null> {
	if (!file || file.size === 0) return null;
	if (file.size > 25 * 1024 * 1024) return null;

	const ext = file.name.split('.').pop()?.toLowerCase();
	const allowed = ['pdf', 'png', 'jpg', 'jpeg', 'webp'];
	if (!ext || !allowed.includes(ext)) return null;

	const uploadDir = join(process.cwd(), 'uploads', 'frontdesk');
	await mkdir(uploadDir, { recursive: true });

	const timestamp = Date.now();
	const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
	const filename = `${prefix}_${timestamp}_${safeName}`;
	const buffer = Buffer.from(await file.arrayBuffer());
	await writeFile(join(uploadDir, filename), buffer);

	return `frontdesk/${filename}`;
}

export const load: PageServerLoad = async () => {
	try {
		const [
			visitors,
			statsRows,
			employees,
			departments,
			documents,
			invoices,
			proposals,
			calls,
			frontdeskStats
		] = await Promise.all([
			sql`
				SELECT
					id,
					visitor_name,
					company,
					address,
					phone,
					purpose,
					badge_number,
					host_nik,
					host_name,
					host_department,
					to_char(check_in_time, 'YYYY-MM-DD') as check_in_date,
					to_char(check_in_time, 'HH24:MI') as check_in_clock,
					to_char(check_in_time, 'YYYY-MM-DD HH24:MI') as check_in_str,
					to_char(check_out_time, 'YYYY-MM-DD') as check_out_date,
					to_char(check_out_time, 'HH24:MI') as check_out_clock,
					to_char(check_out_time, 'YYYY-MM-DD HH24:MI') as check_out_str,
					survey_rating,
					photo_file,
					status
				FROM ga.visitors
				ORDER BY
					CASE WHEN status = 'CHECKED_IN' THEN 0 ELSE 1 END,
					check_in_time DESC,
					id DESC
			`,
			sql`
				SELECT
					COUNT(*)::int as total_visitors,
					COUNT(CASE WHEN status = 'CHECKED_IN' THEN 1 END)::int as active_visitors,
					COUNT(CASE WHEN survey_rating = 3 THEN 1 END)::int as rating_puas,
					COUNT(CASE WHEN survey_rating = 2 THEN 1 END)::int as rating_cukup,
					COUNT(CASE WHEN survey_rating = 1 THEN 1 END)::int as rating_kurang,
					COUNT(CASE WHEN survey_rating IS NOT NULL THEN 1 END)::int as total_rated,
					ROUND(AVG(survey_rating)::numeric, 2) as avg_rating
				FROM ga.visitors
			`,
			sql`
				SELECT
					k.payroll_id as nik,
					k.nama_karyawan as name,
					COALESCE(d.dept_name, 'GENERAL AFFAIRS') as department,
					COALESCE(k.telp1, k.telp2) as phone
				FROM master.m_karyawan k
				LEFT JOIN master.m_dept d ON d.dept_code = k.dept_id
				WHERE k.aktif = 'Y' AND k.nama_karyawan IS NOT NULL
				ORDER BY k.nama_karyawan ASC
				LIMIT 500
			`,
			sql`
				SELECT dept_code, dept_name
				FROM master.m_dept
				WHERE aktif = 'Y'
				ORDER BY dept_name ASC
			`.catch(() => []),
			sql`
				SELECT
					id,
					direction,
					doc_type,
					tracking_number,
					courier_name,
					sender_name,
					sender_company,
					recipient_name,
					recipient_department,
					recipient_phone,
					to_char(received_at, 'YYYY-MM-DD HH24:MI') as received_at,
					to_char(handed_over_at, 'YYYY-MM-DD HH24:MI') as handed_over_at,
					handed_over_to,
					status,
					file_path,
					notes
				FROM ga.frontdesk_documents
				ORDER BY received_at DESC, id DESC
			`,
			sql`
				SELECT
					id,
					receipt_number,
					vendor_name,
					invoice_number,
					po_number,
					amount,
					to_char(received_date, 'YYYY-MM-DD') as received_date,
					to_char(due_date, 'YYYY-MM-DD') as due_date,
					courier_sender,
					received_by_receptionist,
					handed_to_finance_by,
					finance_recipient_name,
					to_char(handed_to_finance_at, 'YYYY-MM-DD HH24:MI') as handed_to_finance_at,
					status,
					file_path,
					notes,
					to_char(created_at, 'YYYY-MM-DD HH24:MI') as created_at
				FROM ga.frontdesk_invoices
				ORDER BY received_date DESC, id DESC
			`,
			sql`
				SELECT
					id,
					proposal_number,
					sender_organization,
					contact_person,
					contact_phone,
					title,
					category,
					target_recipient,
					to_char(received_date, 'YYYY-MM-DD') as received_date,
					status,
					disposition_notes,
					disposition_by,
					file_path,
					to_char(created_at, 'YYYY-MM-DD HH24:MI') as created_at
				FROM ga.frontdesk_proposals
				ORDER BY received_date DESC, id DESC
			`,
			sql`
				SELECT
					id,
					caller_name,
					caller_company,
					caller_phone,
					target_employee_name,
					target_department,
					to_char(call_time, 'YYYY-MM-DD HH24:MI') as call_time,
					urgency,
					call_type,
					action_taken,
					message_content,
					status
				FROM ga.frontdesk_calls
				ORDER BY call_time DESC, id DESC
			`,
			sql`
				SELECT
					(SELECT COUNT(*)::int FROM ga.frontdesk_documents WHERE status = 'DITERIMA') as pending_docs,
					(SELECT COUNT(*)::int FROM ga.frontdesk_invoices WHERE status = 'DITERIMA') as pending_invoices,
					(SELECT COUNT(*)::int FROM ga.frontdesk_proposals WHERE status = 'MENUNGGU_REVIEW') as pending_proposals,
					(SELECT COUNT(*)::int FROM ga.frontdesk_calls WHERE status = 'PENDING') as pending_calls,
					(SELECT COUNT(*)::int FROM ga.frontdesk_calls WHERE urgency = 'MENDESAK' AND status = 'PENDING') as urgent_calls
			`
		]);

		return {
			visitors,
			stats: statsRows[0] || {
				total_visitors: 0,
				active_visitors: 0,
				rating_puas: 0,
				rating_cukup: 0,
				rating_kurang: 0,
				total_rated: 0,
				avg_rating: 0
			},
			employees,
			departments: departments.map((d: any) => d.dept_name || d.dept_code),
			documents,
			invoices,
			proposals,
			calls,
			frontdeskStats: frontdeskStats[0] || {
				pending_docs: 0,
				pending_invoices: 0,
				pending_proposals: 0,
				pending_calls: 0,
				urgent_calls: 0
			}
		};
	} catch (err) {
		console.error('Error loading GA frontdesk hub:', err);
		return {
			visitors: [],
			stats: { total_visitors: 0, active_visitors: 0, rating_puas: 0, rating_cukup: 0, rating_kurang: 0, total_rated: 0, avg_rating: 0 },
			employees: [],
			departments: [],
			documents: [],
			invoices: [],
			proposals: [],
			calls: [],
			frontdeskStats: { pending_docs: 0, pending_invoices: 0, pending_proposals: 0, pending_calls: 0, urgent_calls: 0 }
		};
	}
};

export const actions: Actions = {
	// ==================== 1. BUKU TAMU ====================
	checkIn: async ({ request }) => {
		const fd = await request.formData();
		const visitor_name = String(fd.get('visitor_name') || '').trim();
		const company = String(fd.get('company') || '-').trim();
		const address = String(fd.get('address') || '-').trim();
		const phone = String(fd.get('phone') || '-').trim();
		const purpose = String(fd.get('purpose') || '-').trim();
		const badge_number = String(fd.get('badge_number') || '-').trim();
		const host_nik = String(fd.get('host_nik') || '').trim() || null;
		const host_name = String(fd.get('host_name') || '-').trim();
		const host_department = String(fd.get('host_department') || 'UMUM').trim();

		const check_in_timestamp = getNowWibTimestamp();

		if (!visitor_name || !purpose) {
			return fail(400, { error: 'Nama tamu dan keperluan kunjungan wajib diisi.' });
		}

		try {
			await sql`
				INSERT INTO ga.visitors (
					visitor_name, company, address, phone, purpose,
					badge_number, host_nik, host_name, host_department,
					check_in_time, status, act
				) VALUES (
					${visitor_name}, ${company}, ${address}, ${phone}, ${purpose},
					${badge_number}, ${host_nik}, ${host_name}, ${host_department},
					(${check_in_timestamp}::text)::timestamp, 'CHECKED_IN', 1
				)
			`;
			return { success: true, message: `Tamu ${visitor_name} berhasil Check-In.` };
		} catch (err) {
			console.error('Error checking in visitor:', err);
			return fail(500, { error: 'Gagal mencatat Check-In tamu.' });
		}
	},

	checkOut: async ({ request }) => {
		const fd = await request.formData();
		const id = Number(fd.get('id'));
		const survey_rating = Number(fd.get('survey_rating') || 3);

		if (!id) return fail(400, { error: 'ID kunjungan tidak valid.' });
		const check_out_timestamp = getNowWibTimestamp();

		try {
			await sql`
				UPDATE ga.visitors
				SET
					check_out_time = COALESCE(check_out_time, (${check_out_timestamp}::text)::timestamp),
					status = 'CHECKED_OUT',
					survey_rating = ${survey_rating}
				WHERE id = ${id}
			`;
			return { success: true, message: 'Tamu berhasil Check-Out & survei layanan disimpan.' };
		} catch (err) {
			console.error('Error checking out visitor:', err);
			return fail(500, { error: 'Gagal memproses Check-Out tamu.' });
		}
	},

	deleteVisitor: async ({ request }) => {
		const fd = await request.formData();
		const id = Number(fd.get('id'));
		if (!id) return fail(400, { error: 'ID tidak valid.' });

		try {
			await sql`DELETE FROM ga.visitors WHERE id = ${id}`;
			return { success: true, message: 'Data buku tamu berhasil dihapus.' };
		} catch (err) {
			console.error('Error deleting visitor:', err);
			return fail(500, { error: 'Gagal menghapus data buku tamu.' });
		}
	},

	// ==================== 2. DOKUMEN & PAKET ====================
	createDocument: async ({ request }) => {
		const fd = await request.formData();
		const direction = String(fd.get('direction') || 'INCOMING');
		const doc_type = String(fd.get('doc_type') || 'SURAT_DINAS');
		const tracking_number = String(fd.get('tracking_number') || '').trim() || null;
		const courier_name = String(fd.get('courier_name') || '-').trim();
		const sender_name = String(fd.get('sender_name') || '').trim();
		const sender_company = String(fd.get('sender_company') || '-').trim();
		const recipient_name = String(fd.get('recipient_name') || '').trim();
		const recipient_department = String(fd.get('recipient_department') || '-').trim();
		const recipient_phone = String(fd.get('recipient_phone') || '-').trim();
		const notes = String(fd.get('notes') || '').trim() || null;
		const file = fd.get('file') as File | null;

		if (!sender_name || !recipient_name) {
			return fail(400, { error: 'Nama pengirim dan nama penerima wajib diisi.' });
		}

		try {
			const filePath = await handleFileUpload(file, 'doc');
			await sql`
				INSERT INTO ga.frontdesk_documents (
					direction, doc_type, tracking_number, courier_name,
					sender_name, sender_company, recipient_name, recipient_department,
					recipient_phone, status, file_path, notes
				) VALUES (
					${direction}, ${doc_type}, ${tracking_number}, ${courier_name},
					${sender_name}, ${sender_company}, ${recipient_name}, ${recipient_department},
					${recipient_phone}, 'DITERIMA', ${filePath}, ${notes}
				)
			`;
			return { success: true, message: `Dokumen/Paket dari ${sender_name} berhasil dicatat.` };
		} catch (err: any) {
			console.error('Error creating frontdesk document:', err);
			return fail(500, { error: 'Gagal mencatat dokumen/paket.' });
		}
	},

	handoverDocument: async ({ request }) => {
		const fd = await request.formData();
		const id = Number(fd.get('id'));
		const handed_over_to = String(fd.get('handed_over_to') || '').trim();
		const notes = String(fd.get('notes') || '').trim() || null;

		if (!id || !handed_over_to) {
			return fail(400, { error: 'Nama penerima serah terima fisik wajib diisi.' });
		}

		try {
			await sql`
				UPDATE ga.frontdesk_documents
				SET
					status = 'DISERAHKAN',
					handed_over_at = CURRENT_TIMESTAMP,
					handed_over_to = ${handed_over_to},
					notes = COALESCE(notes, '') || ${notes ? ' [Serah Terima: ' + notes + ']' : ''}
				WHERE id = ${id}
			`;
			return { success: true, message: `Dokumen berhasil diserahterimakan kepada ${handed_over_to}.` };
		} catch (err) {
			console.error('Error handing over document:', err);
			return fail(500, { error: 'Gagal memproses serah terima dokumen.' });
		}
	},

	deleteDocument: async ({ request }) => {
		const fd = await request.formData();
		const id = Number(fd.get('id'));
		if (!id) return fail(400, { error: 'ID tidak valid.' });

		try {
			const [doc] = await sql`SELECT file_path FROM ga.frontdesk_documents WHERE id = ${id}`;
			if (doc?.file_path) {
				const fullPath = join(process.cwd(), 'uploads', doc.file_path);
				if (existsSync(fullPath)) await unlink(fullPath).catch(() => {});
			}
			await sql`DELETE FROM ga.frontdesk_documents WHERE id = ${id}`;
			return { success: true, message: 'Data dokumen/paket berhasil dihapus.' };
		} catch (err) {
			console.error('Error deleting document:', err);
			return fail(500, { error: 'Gagal menghapus dokumen.' });
		}
	},

	// ==================== 3. INVOICE MASUK ====================
	createInvoice: async ({ request }) => {
		const fd = await request.formData();
		const vendor_name = String(fd.get('vendor_name') || '').trim();
		const invoice_number = String(fd.get('invoice_number') || '').trim();
		const po_number = String(fd.get('po_number') || '').trim() || null;
		const amount = parseFloat(String(fd.get('amount') || '0'));
		const received_date = String(fd.get('received_date') || new Date().toISOString().split('T')[0]);
		const due_date = String(fd.get('due_date') || '').trim() || null;
		const courier_sender = String(fd.get('courier_sender') || 'Kurir / Vendor Langsung').trim();
		const received_by_receptionist = String(fd.get('received_by_receptionist') || 'Resepsionis GA').trim();
		const notes = String(fd.get('notes') || '').trim() || null;
		const file = fd.get('file') as File | null;

		if (!vendor_name || !invoice_number) {
			return fail(400, { error: 'Nama vendor dan nomor invoice wajib diisi.' });
		}

		try {
			// Generate Receipt Number: REC-INV-YYYYMM-XXX
			const d = new Date();
			const yrmo = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
			const [seq] = await sql`
				SELECT COUNT(*)::int + 1 as next_val 
				FROM ga.frontdesk_invoices 
				WHERE to_char(created_at, 'YYYYMM') = ${yrmo}
			`;
			const receipt_number = `REC-INV-${yrmo}-${String(seq.next_val).padStart(3, '0')}`;

			const filePath = await handleFileUpload(file, 'inv');

			await sql`
				INSERT INTO ga.frontdesk_invoices (
					receipt_number, vendor_name, invoice_number, po_number,
					amount, received_date, due_date, courier_sender,
					received_by_receptionist, status, file_path, notes
				) VALUES (
					${receipt_number}, ${vendor_name}, ${invoice_number}, ${po_number},
					${amount}, ${received_date}, ${due_date}, ${courier_sender},
					${received_by_receptionist}, 'DITERIMA', ${filePath}, ${notes}
				)
			`;
			return { success: true, message: `Invoice #${invoice_number} dari ${vendor_name} berhasil dicatat (No. Tanda Terima: ${receipt_number}).` };
		} catch (err: any) {
			console.error('Error creating frontdesk invoice:', err);
			return fail(500, { error: 'Gagal mencatat tanda terima invoice.' });
		}
	},

	handoverInvoiceToFinance: async ({ request }) => {
		const fd = await request.formData();
		const id = Number(fd.get('id'));
		const finance_recipient_name = String(fd.get('finance_recipient_name') || '').trim();
		const handed_to_finance_by = String(fd.get('handed_to_finance_by') || 'Resepsionis GA').trim();
		const notes = String(fd.get('notes') || '').trim() || null;

		if (!id || !finance_recipient_name) {
			return fail(400, { error: 'Nama staf finance penerima fisik wajib diisi.' });
		}

		try {
			await sql`
				UPDATE ga.frontdesk_invoices
				SET
					status = 'DISERAHKAN_KE_FINANCE',
					finance_recipient_name = ${finance_recipient_name},
					handed_to_finance_by = ${handed_to_finance_by},
					handed_to_finance_at = CURRENT_TIMESTAMP,
					notes = COALESCE(notes, '') || ${notes ? ' [Serah Finance: ' + notes + ']' : ''}
				WHERE id = ${id}
			`;
			return { success: true, message: `Invoice berhasil diserahkan ke Finance (${finance_recipient_name}).` };
		} catch (err) {
			console.error('Error handing over invoice:', err);
			return fail(500, { error: 'Gagal menyerahkan invoice ke Finance.' });
		}
	},

	deleteInvoice: async ({ request }) => {
		const fd = await request.formData();
		const id = Number(fd.get('id'));
		if (!id) return fail(400, { error: 'ID tidak valid.' });

		try {
			const [inv] = await sql`SELECT file_path FROM ga.frontdesk_invoices WHERE id = ${id}`;
			if (inv?.file_path) {
				const fullPath = join(process.cwd(), 'uploads', inv.file_path);
				if (existsSync(fullPath)) await unlink(fullPath).catch(() => {});
			}
			await sql`DELETE FROM ga.frontdesk_invoices WHERE id = ${id}`;
			return { success: true, message: 'Data tanda terima invoice berhasil dihapus.' };
		} catch (err) {
			console.error('Error deleting invoice:', err);
			return fail(500, { error: 'Gagal menghapus tanda terima invoice.' });
		}
	},

	// ==================== 4. PROPOSAL MASUK ====================
	createProposal: async ({ request }) => {
		const fd = await request.formData();
		const sender_organization = String(fd.get('sender_organization') || '').trim();
		const contact_person = String(fd.get('contact_person') || '-').trim();
		const contact_phone = String(fd.get('contact_phone') || '-').trim();
		const title = String(fd.get('title') || '').trim();
		const category = String(fd.get('category') || 'PENAWARAN_HARGA');
		const target_recipient = String(fd.get('target_recipient') || 'Direktur Utama').trim();
		const received_date = String(fd.get('received_date') || new Date().toISOString().split('T')[0]);
		const file = fd.get('file') as File | null;

		if (!sender_organization || !title) {
			return fail(400, { error: 'Instansi pengirim dan judul proposal wajib diisi.' });
		}

		try {
			const d = new Date();
			const yrmo = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
			const [seq] = await sql`
				SELECT COUNT(*)::int + 1 as next_val 
				FROM ga.frontdesk_proposals 
				WHERE to_char(created_at, 'YYYYMM') = ${yrmo}
			`;
			const proposal_number = `PROP-${yrmo}-${String(seq.next_val).padStart(3, '0')}`;

			const filePath = await handleFileUpload(file, 'prop');

			await sql`
				INSERT INTO ga.frontdesk_proposals (
					proposal_number, sender_organization, contact_person, contact_phone,
					title, category, target_recipient, received_date,
					status, file_path
				) VALUES (
					${proposal_number}, ${sender_organization}, ${contact_person}, ${contact_phone},
					${title}, ${category}, ${target_recipient}, ${received_date},
					'MENUNGGU_REVIEW', ${filePath}
				)
			`;
			return { success: true, message: `Proposal "${title}" dari ${sender_organization} berhasil dicatat.` };
		} catch (err: any) {
			console.error('Error creating frontdesk proposal:', err);
			return fail(500, { error: 'Gagal mencatat proposal masuk.' });
		}
	},

	updateProposalDisposition: async ({ request }) => {
		const fd = await request.formData();
		const id = Number(fd.get('id'));
		const status = String(fd.get('status') || 'DITERUSKAN');
		const disposition_notes = String(fd.get('disposition_notes') || '').trim() || null;
		const disposition_by = String(fd.get('disposition_by') || 'Manajemen').trim();

		if (!id) return fail(400, { error: 'ID tidak valid.' });

		try {
			await sql`
				UPDATE ga.frontdesk_proposals
				SET
					status = ${status},
					disposition_notes = ${disposition_notes},
					disposition_by = ${disposition_by}
				WHERE id = ${id}
			`;
			return { success: true, message: `Disposisi proposal berhasil diperbarui (${status}).` };
		} catch (err) {
			console.error('Error updating proposal disposition:', err);
			return fail(500, { error: 'Gagal memperbarui disposisi proposal.' });
		}
	},

	deleteProposal: async ({ request }) => {
		const fd = await request.formData();
		const id = Number(fd.get('id'));
		if (!id) return fail(400, { error: 'ID tidak valid.' });

		try {
			const [prop] = await sql`SELECT file_path FROM ga.frontdesk_proposals WHERE id = ${id}`;
			if (prop?.file_path) {
				const fullPath = join(process.cwd(), 'uploads', prop.file_path);
				if (existsSync(fullPath)) await unlink(fullPath).catch(() => {});
			}
			await sql`DELETE FROM ga.frontdesk_proposals WHERE id = ${id}`;
			return { success: true, message: 'Data proposal berhasil dihapus.' };
		} catch (err) {
			console.error('Error deleting proposal:', err);
			return fail(500, { error: 'Gagal menghapus data proposal.' });
		}
	},

	// ==================== 5. LOG PANGGILAN TELEPON ====================
	createCallLog: async ({ request }) => {
		const fd = await request.formData();
		const caller_name = String(fd.get('caller_name') || '').trim();
		const caller_company = String(fd.get('caller_company') || '-').trim();
		const caller_phone = String(fd.get('caller_phone') || '-').trim();
		const target_employee_name = String(fd.get('target_employee_name') || '').trim();
		const target_department = String(fd.get('target_department') || '-').trim();
		const urgency = String(fd.get('urgency') || 'NORMAL');
		const call_type = String(fd.get('call_type') || 'INCOMING');
		const action_taken = String(fd.get('action_taken') || 'TITIP_PESAN');
		const message_content = String(fd.get('message_content') || '').trim() || null;

		if (!caller_name || !target_employee_name) {
			return fail(400, { error: 'Nama penelepon dan nama tujuan wajib diisi.' });
		}

		try {
			await sql`
				INSERT INTO ga.frontdesk_calls (
					caller_name, caller_company, caller_phone, target_employee_name,
					target_department, urgency, call_type, action_taken,
					message_content, status
				) VALUES (
					${caller_name}, ${caller_company}, ${caller_phone}, ${target_employee_name},
					${target_department}, ${urgency}, ${call_type}, ${action_taken},
					${message_content}, 'PENDING'
				)
			`;
			return { success: true, message: `Panggilan dari ${caller_name} berhasil dicatat.` };
		} catch (err: any) {
			console.error('Error creating call log:', err);
			return fail(500, { error: 'Gagal mencatat panggilan telepon.' });
		}
	},

	updateCallStatus: async ({ request }) => {
		const fd = await request.formData();
		const id = Number(fd.get('id'));
		const status = String(fd.get('status') || 'SELESAI');

		if (!id) return fail(400, { error: 'ID tidak valid.' });

		try {
			await sql`UPDATE ga.frontdesk_calls SET status = ${status} WHERE id = ${id}`;
			return { success: true, message: `Status panggilan diperbarui menjadi ${status}.` };
		} catch (err) {
			console.error('Error updating call status:', err);
			return fail(500, { error: 'Gagal memperbarui status panggilan.' });
		}
	},

	deleteCallLog: async ({ request }) => {
		const fd = await request.formData();
		const id = Number(fd.get('id'));
		if (!id) return fail(400, { error: 'ID tidak valid.' });

		try {
			await sql`DELETE FROM ga.frontdesk_calls WHERE id = ${id}`;
			return { success: true, message: 'Log panggilan berhasil dihapus.' };
		} catch (err) {
			console.error('Error deleting call log:', err);
			return fail(500, { error: 'Gagal menghapus log panggilan.' });
		}
	}
};
