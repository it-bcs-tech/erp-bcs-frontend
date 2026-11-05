/**
 * Global Mail Store — BCS Logistics ERP
 * ─────────────────────────────────────────────────────────
 * Mengelola state inbox, sent, draft, trash, dan notifikasi approval sistem.
 * Mendukung pembacaan template HTML email korporat BCS Logistics dan pengiriman pesan baru.
 */

import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import type { EmailMessage, EmailCategory, MailServerConfig } from '$lib/types/mail';

const STORAGE_KEY_EMAILS = 'bcs_erp_mail_messages_v1';
const STORAGE_KEY_CONFIG = 'bcs_erp_mail_server_config_v1';

// Initial Mock Data featuring Issue #14 corporate responsive HTML templates
const INITIAL_EMAILS: EmailMessage[] = [
	{
		id: 'msg-001',
		folder: 'inbox',
		fromName: 'ERP Mailer — HRIS Approval',
		fromEmail: 'no-reply@bcs-logistics.co.id',
		toName: 'Pengguna ERP',
		toEmail: 'karyawan@bcs-logistics.co.id',
		subject: 'Permohonan Persetujuan: Cuti Tahunan — Ahmad Subarjo (NIK: 20240911)',
		preview: 'Terdapat pengajuan Cuti Tahunan (3 Hari) dari Ahmad Subarjo yang membutuhkan persetujuan Anda...',
		bodyHtml: `
			<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1E293B; line-height: 1.6;">
				<div style="border-left: 4px solid #EA580C; padding-left: 14px; margin-bottom: 18px;">
					<h3 style="margin: 0; font-size: 18px; font-weight: 800; color: #0F172A;">Permohonan Cuti Tahunan</h3>
					<p style="margin: 2px 0 0 0; font-size: 12px; color: #64748B;">Nomor Dokumen: <strong>CUTI/HRIS/2026/XI/0042</strong></p>
				</div>
				<p style="font-size: 13.5px; color: #334155; margin-bottom: 16px;">
					Halo Rekan, permohonan cuti tahunan berikut telah diajukan dan memerlukan tinjauan persetujuan atasan langsung:
				</p>
				<table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden;">
					<tr style="background-color: #F8FAFC; border-bottom: 1px solid #E2E8F0;">
						<td style="padding: 9px 14px; font-weight: 600; color: #64748B; width: 35%;">Nama Karyawan</td>
						<td style="padding: 9px 14px; font-weight: 700; color: #0F172A;">Ahmad Subarjo (20240911)</td>
					</tr>
					<tr style="border-bottom: 1px solid #E2E8F0;">
						<td style="padding: 9px 14px; font-weight: 600; color: #64748B;">Departemen</td>
						<td style="padding: 9px 14px; color: #334155;">Fleet Operations — Cilegon</td>
					</tr>
					<tr style="background-color: #F8FAFC; border-bottom: 1px solid #E2E8F0;">
						<td style="padding: 9px 14px; font-weight: 600; color: #64748B;">Tanggal Cuti</td>
						<td style="padding: 9px 14px; font-weight: 700; color: #0F172A;">10 Nov 2026 s/d 12 Nov 2026 (3 Hari Kerja)</td>
					</tr>
					<tr style="border-bottom: 1px solid #E2E8F0;">
						<td style="padding: 9px 14px; font-weight: 600; color: #64748B;">Sisa Hak Cuti</td>
						<td style="padding: 9px 14px; color: #334155;">8 Hari</td>
					</tr>
					<tr style="background-color: #F8FAFC;">
						<td style="padding: 9px 14px; font-weight: 600; color: #64748B;">Alasan / Keperluan</td>
						<td style="padding: 9px 14px; color: #334155;">Acara keluarga di Jawa Tengah dan perpanjangan dokumen pribadi.</td>
					</tr>
				</table>
				<div style="background-color: #FFFBEB; border: 1px solid #FDE68A; border-radius: 10px; padding: 12px 16px; margin-bottom: 20px;">
					<p style="margin: 0; font-size: 12px; color: #92400E; font-weight: 600;">Status: Menunggu Persetujuan Supervisor (Level 1)</p>
				</div>
				<div style="text-align: center; margin-top: 10px;">
					<a href="/hris/leave" style="display: inline-block; background-color: #EA580C; color: #ffffff; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 13px;">Buka di Modul HRIS</a>
				</div>
			</div>
		`,
		date: 'Hari ini, 08:15',
		timestamp: Date.now() - 1000 * 60 * 30,
		isRead: false,
		isStarred: true,
		hasAttachments: false,
		priority: 'urgent',
		badge: { text: 'Approval Cuti', variant: 'amber' }
	},
	{
		id: 'msg-002',
		folder: 'inbox',
		fromName: 'Finance System — Kasbon Hub',
		fromEmail: 'finance-alert@bcs-logistics.co.id',
		toName: 'Pengguna ERP',
		toEmail: 'karyawan@bcs-logistics.co.id',
		subject: 'Konfirmasi Approval: Pengajuan Pinjaman Kasbon #KB-2026-11-004 Disetujui',
		preview: 'Kabar baik! Pengajuan pinjaman kasbon operasional Anda sebesar Rp 2.500.000 telah disetujui...',
		bodyHtml: `
			<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1E293B; line-height: 1.6;">
				<div style="background-color: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 10px; padding: 14px 18px; margin-bottom: 18px;">
					<p style="margin: 0 0 4px 0; font-size: 15px; font-weight: 800; color: #166534;">✓ Pengajuan Pinjaman Disetujui</p>
					<p style="margin: 0; font-size: 12.5px; color: #15803D;">Dana pinjaman kasbon Anda telah diverifikasi oleh Manajer Keuangan dan siap dicairkan melalui Kasir Utama Pool Cilegon.</p>
				</div>
				<table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden;">
					<tr style="background-color: #F8FAFC; border-bottom: 1px solid #E2E8F0;">
						<td style="padding: 9px 14px; font-weight: 600; color: #64748B; width: 35%;">No. Voucher</td>
						<td style="padding: 9px 14px; font-weight: 700; color: #0F172A; font-family: monospace;">KB-2026-11-004</td>
					</tr>
					<tr style="border-bottom: 1px solid #E2E8F0;">
						<td style="padding: 9px 14px; font-weight: 600; color: #64748B;">Nominal Kasbon</td>
						<td style="padding: 9px 14px; font-weight: 800; color: #059669; font-size: 14px;">Rp 2.500.000</td>
					</tr>
					<tr style="background-color: #F8FAFC; border-bottom: 1px solid #E2E8F0;">
						<td style="padding: 9px 14px; font-weight: 600; color: #64748B;">Metode Potong Gaji</td>
						<td style="padding: 9px 14px; color: #334155;">2x Cicilan (Payroll Nov 2026 & Des 2026)</td>
					</tr>
					<tr style="border-bottom: 1px solid #E2E8F0;">
						<td style="padding: 9px 14px; font-weight: 600; color: #64748B;">Disetujui Oleh</td>
						<td style="padding: 9px 14px; font-weight: 700; color: #0F172A;">Hendra Kusuma, S.E. (Finance Manager)</td>
					</tr>
					<tr style="background-color: #F8FAFC;">
						<td style="padding: 9px 14px; font-weight: 600; color: #64748B;">Lokasi Pencairan</td>
						<td style="padding: 9px 14px; color: #334155;">Kasir Pool Utama BCS Logistics Cilegon</td>
					</tr>
				</table>
				<div style="text-align: center; margin-top: 10px;">
					<a href="/kasir" style="display: inline-block; background-color: #0F172A; color: #ffffff; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 13px;">Buka Modul Kasir</a>
				</div>
			</div>
		`,
		date: 'Kemarin, 16:40',
		timestamp: Date.now() - 1000 * 60 * 60 * 16,
		isRead: false,
		isStarred: false,
		hasAttachments: true,
		attachments: [
			{ id: 'att-1', filename: 'Voucher_Kasbon_KB004.pdf', size: '245 KB', mimeType: 'application/pdf' }
		],
		priority: 'normal',
		badge: { text: 'Disetujui', variant: 'emerald' }
	},
	{
		id: 'msg-003',
		folder: 'inbox',
		fromName: 'Corporate Communications & IT',
		fromEmail: 'it-support@bcs-logistics.co.id',
		toName: 'Seluruh Karyawan PT BCS',
		toEmail: 'all-staff@bcs-logistics.co.id',
		subject: 'Pengumuman Resmi: Peluncuran Fitur Webmail Korporat & Template Email Baru',
		preview: 'Manajemen IT PT Buana Centra Swakarsa mengumumkan ketersediaan fitur Webmail terintegrasi di portal ERP...',
		bodyHtml: `
			<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1E293B; line-height: 1.6;">
				<h3 style="margin: 0 0 10px 0; font-size: 18px; font-weight: 800; color: #0F172A;">Peluncuran Fitur Webmail Terintegrasi ERP BCS</h3>
				<p style="font-size: 13.5px; color: #334155; margin-bottom: 14px;">
					Dengan bangga Departemen IT menyampaikan pembaruan terbaru pada portal ERP BCS Logistics. Seluruh akun karyawan kini dilengkapi akses langsung ke <strong>Webmail Korporat</strong> yang terhubung dengan notifikasi alur kerja seluruh modul (FMS, OCS, HRIS, Finance, PMS, dan Maintenance).
				</p>
				<div style="background-color: #F1F5F9; border-left: 4px solid #1E3A8A; padding: 12px 16px; border-radius: 6px; margin-bottom: 16px;">
					<p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 800; color: #1E3A8A; text-transform: uppercase;">Poin Utama Pembaruan:</p>
					<ul style="margin: 0; padding-left: 20px; font-size: 12.5px; color: #475569;">
						<li>Akses cepat pembacaan pesan langsung di bawah menu dropdown profil.</li>
						<li>Template email otomatis berstandar branding resmi BCS Logistics (Navy & Orange).</li>
						<li>Konfigurasi protokol IMAP/POP3 & SMTP korporat yang aman.</li>
					</ul>
				</div>
				<p style="font-size: 12px; color: #64748B;">
					Jika menemukan kendala dalam pembacaan pesan, silakan hubungi tim Helpdesk IT di Head Office Cilegon atau melalui saluran WhatsApp IT Support.
				</p>
			</div>
		`,
		date: '2 Nov 2026',
		timestamp: Date.now() - 1000 * 60 * 60 * 48,
		isRead: true,
		isStarred: true,
		hasAttachments: false,
		priority: 'normal',
		badge: { text: 'Pengumuman', variant: 'sky' }
	},
	{
		id: 'msg-004',
		folder: 'inbox',
		fromName: 'PMS Procurement System',
		fromEmail: 'pms-alert@bcs-logistics.co.id',
		toName: 'Pengguna ERP',
		toEmail: 'karyawan@bcs-logistics.co.id',
		subject: 'Purchase Request: PR-2026-11-0082 Pengadaan Ban Radial Tronton Menunggu Approval',
		preview: 'Permohonan pengadaan barang operasional bengkel: 12 Unit Ban Radial Bridgestone 11.00R20...',
		bodyHtml: `
			<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1E293B; line-height: 1.6;">
				<h3 style="margin: 0 0 8px 0; font-size: 17px; font-weight: 800; color: #0F172A;">Purchase Request Baru</h3>
				<p style="font-size: 13px; color: #475569;">Nomor: <strong>PR-2026-11-0082</strong> &bull; Site: <strong>Workshop Cilegon</strong></p>
				<p style="font-size: 13px; color: #334155;">Pengadaan 12 unit ban cadangan untuk unit prime mover rute Cilegon - Cikarang.</p>
				<div style="margin-top: 14px;">
					<a href="/pms/transactions/pr" style="display: inline-block; background-color: #D97706; color: #ffffff; padding: 8px 18px; border-radius: 8px; text-decoration: none; font-size: 12px; font-weight: 700;">Tinjau PR di PMS</a>
				</div>
			</div>
		`,
		date: '31 Okt 2026',
		timestamp: Date.now() - 1000 * 60 * 60 * 96,
		isRead: true,
		isStarred: false,
		hasAttachments: true,
		attachments: [
			{ id: 'att-2', filename: 'Katalog_Ban_Tire_Nov2026.pdf', size: '1.2 MB', mimeType: 'application/pdf' }
		],
		priority: 'normal',
		badge: { text: 'PR Procurement', variant: 'indigo' }
	},
	{
		id: 'msg-005',
		folder: 'sent',
		fromName: 'Saya (Karyawan)',
		fromEmail: 'karyawan@bcs-logistics.co.id',
		toName: 'Bambang Irawan (Workshop Head)',
		toEmail: 'bambang.irawan@bcs-logistics.co.id',
		subject: 'Re: Jadwal P2H Berkala Armada Trailer Batch 2',
		preview: 'Selamat pagi Pak Bambang, berikut laporan hasil pra-inspeksi 5 unit trailer yang siap diberangkatkan...',
		bodyHtml: `
			<p>Selamat pagi Pak Bambang,</p>
			<p>Berikut rekap inspeksi P2H 5 unit trailer yang telah lolos uji kelayakan untuk rute pelabuhan Merak hari ini. Seluruh dokumen STNK dan KIR dalam kondisi aktif.</p>
			<p>Terima kasih,<br>Tim Operasional BCS</p>
		`,
		date: '1 Nov 2026, 14:10',
		timestamp: Date.now() - 1000 * 60 * 60 * 72,
		isRead: true,
		isStarred: false,
		hasAttachments: false
	}
];

const DEFAULT_SERVER_CONFIG: MailServerConfig = {
	inboundProtocol: 'IMAP',
	inboundHost: 'mail.bcs-logistics.co.id',
	inboundPort: 993,
	inboundEncryption: 'SSL',
	inboundUsername: 'erp-inbox@bcs-logistics.co.id',
	smtpHost: 'smtp.bcs-logistics.co.id',
	smtpPort: 587,
	smtpEncryption: 'TLS',
	smtpUsername: 'no-reply@bcs-logistics.co.id',
	smtpFromEmail: 'no-reply@bcs-logistics.co.id',
	smtpFromName: 'PT Buana Centra Swakarsa (BCS Logistics Mailer)',
	corporateDomain: 'bcs-logistics.co.id',
	authRequired: true,
	verifySsl: true,
	timeoutSeconds: 30
};

function createMailStore() {
	let initialEmails = INITIAL_EMAILS;
	let initialConfig = DEFAULT_SERVER_CONFIG;

	if (browser) {
		try {
			const savedEmails = localStorage.getItem(STORAGE_KEY_EMAILS);
			if (savedEmails) {
				initialEmails = JSON.parse(savedEmails);
			}
			const savedConfig = localStorage.getItem(STORAGE_KEY_CONFIG);
			if (savedConfig) {
				initialConfig = { ...DEFAULT_SERVER_CONFIG, ...JSON.parse(savedConfig) };
			}
		} catch (e) {
			console.error('Error loading mail from localStorage:', e);
		}
	}

	const emailsStore = writable<EmailMessage[]>(initialEmails);
	const activeFolder = writable<EmailCategory>('inbox');
	const selectedEmailId = writable<string | null>(initialEmails[0]?.id || null);
	const searchQuery = writable<string>('');
	const filterUnreadOnly = writable<boolean>(false);
	const isComposeOpen = writable<boolean>(false);
	const composeReplyTo = writable<EmailMessage | null>(null);
	const serverConfig = writable<MailServerConfig>(initialConfig);

	function persistEmails(list: EmailMessage[]) {
		if (browser) {
			try {
				localStorage.setItem(STORAGE_KEY_EMAILS, JSON.stringify(list));
			} catch (e) {
				console.error('Error saving emails:', e);
			}
		}
	}

	function persistConfig(cfg: MailServerConfig) {
		if (browser) {
			try {
				localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(cfg));
			} catch (e) {
				console.error('Error saving mail config:', e);
			}
		}
	}

	return {
		emails: {
			subscribe: emailsStore.subscribe,
			markAsRead: (id: string) => {
				emailsStore.update((list) => {
					const updated = list.map((m) => (m.id === id ? { ...m, isRead: true } : m));
					persistEmails(updated);
					return updated;
				});
			},
			markAsUnread: (id: string) => {
				emailsStore.update((list) => {
					const updated = list.map((m) => (m.id === id ? { ...m, isRead: false } : m));
					persistEmails(updated);
					return updated;
				});
			},
			toggleStar: (id: string) => {
				emailsStore.update((list) => {
					const updated = list.map((m) => (m.id === id ? { ...m, isStarred: !m.isStarred } : m));
					persistEmails(updated);
					return updated;
				});
			},
			deleteEmail: (id: string) => {
				emailsStore.update((list) => {
					const updated = list.map((m) => {
						if (m.id === id) {
							// If already in trash, remove permanently, else move to trash
							return m.folder === 'trash' ? null : { ...m, folder: 'trash' as EmailCategory };
						}
						return m;
					}).filter(Boolean) as EmailMessage[];
					persistEmails(updated);
					return updated;
				});
			},
			sendEmail: (newMail: Omit<EmailMessage, 'id' | 'timestamp' | 'date' | 'isRead' | 'isStarred' | 'hasAttachments'>) => {
				const message: EmailMessage = {
					...newMail,
					id: `msg-${Date.now()}`,
					folder: 'sent',
					date: 'Baru saja',
					timestamp: Date.now(),
					isRead: true,
					isStarred: false,
					hasAttachments: (newMail.attachments?.length || 0) > 0
				};
				emailsStore.update((list) => {
					const updated = [message, ...list];
					persistEmails(updated);
					return updated;
				});
				return message;
			},
			resetToDefaults: () => {
				emailsStore.set(INITIAL_EMAILS);
				persistEmails(INITIAL_EMAILS);
			}
		},
		activeFolder,
		selectedEmailId,
		searchQuery,
		filterUnreadOnly,
		isComposeOpen,
		composeReplyTo,
		serverConfig: {
			subscribe: serverConfig.subscribe,
			updateConfig: (cfg: Partial<MailServerConfig>) => {
				serverConfig.update((old) => {
					const next = { ...old, ...cfg };
					persistConfig(next);
					return next;
				});
			}
		}
	};
}

export const mailStore = createMailStore();

// Derived Stores
export const unreadCount = derived(mailStore.emails, ($emails) => {
	return $emails.filter((m) => m.folder === 'inbox' && !m.isRead).length;
});

export const folderCounts = derived(mailStore.emails, ($emails) => {
	return {
		inbox: $emails.filter((m) => m.folder === 'inbox').length,
		inboxUnread: $emails.filter((m) => m.folder === 'inbox' && !m.isRead).length,
		sent: $emails.filter((m) => m.folder === 'sent').length,
		drafts: $emails.filter((m) => m.folder === 'drafts').length,
		trash: $emails.filter((m) => m.folder === 'trash').length,
		approvals: $emails.filter((m) => m.badge?.text.toLowerCase().includes('approval')).length
	};
});

export const filteredEmails = derived(
	[mailStore.emails, mailStore.activeFolder, mailStore.searchQuery, mailStore.filterUnreadOnly],
	([$emails, $folder, $query, $unreadOnly]) => {
		return $emails.filter((m) => {
			// Folder filtering
			if ($folder === 'approvals') {
				if (!m.badge?.text.toLowerCase().includes('approval')) return false;
			} else if (m.folder !== $folder) {
				return false;
			}

			// Unread filter
			if ($unreadOnly && m.isRead) return false;

			// Query filter
			if ($query.trim()) {
				const q = $query.toLowerCase();
				const inSubject = m.subject.toLowerCase().includes(q);
				const inFrom = m.fromName.toLowerCase().includes(q) || m.fromEmail.toLowerCase().includes(q);
				const inPreview = m.preview.toLowerCase().includes(q);
				if (!inSubject && !inFrom && !inPreview) return false;
			}

			return true;
		});
	}
);

export const selectedEmail = derived(
	[mailStore.emails, mailStore.selectedEmailId],
	([$emails, $id]) => {
		if (!$id) return null;
		return $emails.find((m) => m.id === $id) || null;
	}
);
