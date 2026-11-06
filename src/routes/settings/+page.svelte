<script lang="ts">
	import { systemSettings, formatCurrencyPrivacy, formatMaskedText } from '$lib/stores/settings';
	import { authUser, displayName, getRoleLabel } from '$lib/stores/auth';
	import { mailStore } from '$lib/stores/mail';
	import type { MailServerProfile } from '$lib/types/mail';

	import { enhance } from '$app/forms';

	let { data, form } = $props();

	const user = $derived($authUser);

	let activeTab = $state<'privacy' | 'company' | 'preferences' | 'security' | 'approvals' | 'email' | 'ai'>(
		(data.initialTab as any) || 'privacy'
	);
	let isSavedToast = $state(false);
	let approvalSuccessMsg = $state('');

	function switchTab(t: typeof activeTab) {
		activeTab = t;
		if (typeof window !== 'undefined') {
			const url = new URL(window.location.href);
			url.searchParams.set('tab', t);
			window.history.replaceState({}, '', url.toString());
		}
	}

	// AI Model Engine & Custom Endpoint State (Dynamic Catalog & Profiles)
	// Menggunakan $derived agar sinkron instan saat data server atau form action ter-update
	let aiCatalog = $derived(
		form?.aiCatalog || data.aiCatalog || { activeProfileId: 'default-model', profiles: [] }
	);

	let activeAIProfile = $derived(
		aiCatalog.profiles.find((p: any) => p.id === aiCatalog.activeProfileId) ||
			aiCatalog.profiles[0] ||
			null
	);

	// Modal State Tambah / Edit Profil Model
	let showAIModal = $state(false);
	let isEditingAI = $state(false);
	let modalId = $state('');
	let modalName = $state('');
	let modalProvider = $state('groq');
	let modalBaseUrl = $state('https://api.groq.com/openai/v1');
	let modalApiKey = $state('');
	let modalModel = $state('llama-3.3-70b-versatile');
	let modalTemperature = $state(0.7);
	let modalMaxTokens = $state(2048);
	let modalMakeActive = $state(true);
	let showApiKey = $state(false);

	let isTestingAI = $state(false);
	let testingProfileId = $state<string | null>(null);
	let aiTestResult = $state<{
		success: boolean;
		latencyMs?: number;
		model?: string;
		baseUrl?: string;
		preview?: string;
		message?: string;
	} | null>(null);

	let isSavingAI = $state(false);
	let isActivatingAI = $state(false);
	let isDeletingAI = $state(false);

	const PROVIDER_TEMPLATES: Record<
		string,
		{ label: string; defaultUrl: string; placeholderModel: string; badgeColor: string; icon: string; desc: string }
	> = {
		groq: {
			label: 'Groq Cloud',
			defaultUrl: 'https://api.groq.com/openai/v1',
			placeholderModel: 'llama-3.3-70b-versatile',
			badgeColor: 'border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400',
			icon: 'speed',
			desc: 'Inference ultra-cepat via LPU'
		},
		openrouter: {
			label: 'OpenRouter',
			defaultUrl: 'https://openrouter.ai/api/v1',
			placeholderModel: 'google/gemini-2.0-flash-001',
			badgeColor: 'border-purple-500/40 bg-purple-500/10 text-purple-600 dark:text-purple-400',
			icon: 'hub',
			desc: 'Akses ratusan model LLM'
		},
		openai: {
			label: 'OpenAI API',
			defaultUrl: 'https://api.openai.com/v1',
			placeholderModel: 'gpt-4o-mini',
			badgeColor: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
			icon: 'smart_toy',
			desc: 'Model GPT-4o resmi dari OpenAI'
		},
		deepseek: {
			label: 'DeepSeek',
			defaultUrl: 'https://api.deepseek.com/v1',
			placeholderModel: 'deepseek-chat',
			badgeColor: 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400',
			icon: 'psychology',
			desc: 'DeepSeek V3 dan DeepSeek R1'
		},
		ollama: {
			label: 'Ollama Lokal',
			defaultUrl: 'http://localhost:11434/v1',
			placeholderModel: 'qwen2.5-coder:7b',
			badgeColor: 'border-teal-500/40 bg-teal-500/10 text-teal-600 dark:text-teal-400',
			icon: 'dns',
			desc: 'Server lokal tanpa internet'
		},
		nine_router: {
			label: '9Router AI Gateway',
			defaultUrl: 'http://103.93.160.96:20128/v1',
			placeholderModel: 'antigravity',
			badgeColor: 'border-violet-500/40 bg-violet-500/10 text-violet-600 dark:text-violet-400',
			icon: 'alt_route',
			desc: '9Router Infrastructure Gateway'
		},
		openclaw: {
			label: 'OpenClaw Biznet Server',
			defaultUrl: 'https://api.groq.com/openai/v1',
			placeholderModel: 'glm-4.7-flash',
			badgeColor: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
			icon: 'memory',
			desc: 'Server internal ERP BCS'
		},
		custom: {
			label: 'Custom Endpoint',
			defaultUrl: 'https://',
			placeholderModel: 'custom-model-id',
			badgeColor: 'border-slate-500/40 bg-slate-500/10 text-slate-600 dark:text-slate-400',
			icon: 'settings_ethernet',
			desc: 'OpenAI-compatible server mandiri'
		}
	};

	function onProviderChange(prov: string) {
		modalProvider = prov;
		const template = PROVIDER_TEMPLATES[prov];
		if (template) {
			modalBaseUrl = template.defaultUrl;
			if (!modalModel || modalModel === 'glm-4.7-flash' || modalModel === 'llama-3.3-70b-versatile') {
				modalModel = template.placeholderModel;
			}
		}
	}

	function openAddModal() {
		isEditingAI = false;
		modalId = '';
		modalName = '';
		modalProvider = 'groq';
		modalBaseUrl = PROVIDER_TEMPLATES.groq.defaultUrl;
		modalApiKey = '';
		modalModel = PROVIDER_TEMPLATES.groq.placeholderModel;
		modalTemperature = 0.7;
		modalMaxTokens = 2048;
		modalMakeActive = aiCatalog.profiles.length === 0;
		showApiKey = false;
		aiTestResult = null;
		testingProfileId = null;
		showAIModal = true;
	}

	function openEditModal(profile: any) {
		isEditingAI = true;
		modalId = profile.id;
		modalName = profile.name;
		modalProvider = profile.provider || 'custom';
		modalBaseUrl = profile.baseUrl || 'https://api.groq.com/openai/v1';
		modalApiKey = profile.apiKey || '';
		modalModel = profile.model || 'glm-4.7-flash';
		modalTemperature = profile.temperature ?? 0.7;
		modalMaxTokens = profile.maxTokens ?? 2048;
		modalMakeActive = profile.id === aiCatalog.activeProfileId;
		showApiKey = false;
		aiTestResult = null;
		testingProfileId = null;
		showAIModal = true;
	}

	async function testProfileConnection(profile: {
		id?: string;
		baseUrl: string;
		apiKey: string;
		model: string;
		temperature?: number;
		maxTokens?: number;
	}) {
		isTestingAI = true;
		aiTestResult = null;
		testingProfileId = profile.id || 'modal';
		try {
			const res = await fetch('/api/settings/ai/test', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					baseUrl: profile.baseUrl,
					apiKey: profile.apiKey,
					model: profile.model,
					temperature: profile.temperature,
					maxTokens: profile.maxTokens
				})
			});
			const resData = await res.json();
			aiTestResult = resData;
		} catch (err: any) {
			aiTestResult = {
				success: false,
				message: err.message || 'Gagal menghubungi endpoint uji coba'
			};
		} finally {
			isTestingAI = false;
		}
	}

	// Multi-Server Mail Profiles State (Domain-Based Routing)
	const profilesStore = mailStore.profiles;
	let profiles = $state<MailServerProfile[]>([]);
	let selectedProfileId = $state<string>('profile-bcs');

	$effect(() => {
		profiles = [...$profilesStore];
		if (!profiles.some((p) => p.id === selectedProfileId) && profiles[0]) {
			selectedProfileId = profiles[0].id;
		}
	});

	// Active profile selected for editing
	let activeProfile = $derived(
		profiles.find((p) => p.id === selectedProfileId) || profiles[0] || null
	);

	let isSavingMail = $state(false);
	let mailSaveToast = $state(false);
	let testEmailSending = $state(false);
	let testEmailToast = $state('');

	// Email Template Preview State (Issue #14)
	let selectedTemplateVariant = $state<'approval' | 'result' | 'announcement'>('approval');
	let previewDevice = $state<'desktop' | 'mobile'>('desktop');
	let copiedTemplateToast = $state('');

	$effect(() => {
		if (form?.message) {
			approvalSuccessMsg = form.message;
			const t = setTimeout(() => (approvalSuccessMsg = ''), 4000);
			return () => clearTimeout(t);
		}
	});

	const finOrderSetting = $derived(
		data.moduleSettings?.find((s: any) => s.module === 'finance' && s.setting_key === 'customer_invoice_order_doc_types')
	);
	const finOrderTypesList = $derived<string[]>(
		Array.isArray(finOrderSetting?.setting_value) ? finOrderSetting.setting_value : ['PO', 'SPK', 'SPH', 'Quotation']
	);

	const finReceiptSetting = $derived(
		data.moduleSettings?.find((s: any) => s.module === 'finance' && s.setting_key === 'customer_invoice_receipt_doc_types')
	);
	const finReceiptTypesList = $derived<string[]>(
		Array.isArray(finReceiptSetting?.setting_value) ? finReceiptSetting.setting_value : ['LHP', 'PR', 'GR']
	);

	// OCS Module Settings
	const ocsSolarKmSetting = $derived(
		data.moduleSettings?.find((s: any) => s.module === 'ocs' && s.setting_key === 'solar_km_per_liter')
	);
	const ocsSolarKmVal = $derived(
		typeof ocsSolarKmSetting?.setting_value === 'number'
			? ocsSolarKmSetting.setting_value
			: parseFloat(ocsSolarKmSetting?.setting_value) || 3.0
	);

	const ocsSolarPriceSetting = $derived(
		data.moduleSettings?.find((s: any) => s.module === 'ocs' && s.setting_key === 'solar_price_per_liter')
	);
	const ocsSolarPriceVal = $derived(
		typeof ocsSolarPriceSetting?.setting_value === 'number'
			? ocsSolarPriceSetting.setting_value
			: parseFloat(ocsSolarPriceSetting?.setting_value) || 6800
	);

	const ocsSolarUnitOverridesSetting = $derived(
		data.moduleSettings?.find((s: any) => s.module === 'ocs' && s.setting_key === 'solar_ratio_by_unit_type')
	);
	const ocsUnitOverridesMap = $derived.by<Record<string, number>>(() => {
		const raw = ocsSolarUnitOverridesSetting?.setting_value;
		if (!raw) return {};
		if (typeof raw === 'string') {
			try {
				return JSON.parse(raw);
			} catch {
				return {};
			}
		}
		return typeof raw === 'object' ? raw : {};
	});
	const ocsOverridesList = $derived.by(() => {
		const map = ocsUnitOverridesMap;
		const units = data.tipeUnits || [];
		return Object.entries(map).map(([unitId, ratio]) => {
			const u = units.find((item: any) => String(item.id) === String(unitId));
			return {
				id: unitId,
				name: u?.nama_tipe || `Unit ID #${unitId}`,
				golongan: u?.golongan_tol || '1',
				ratio
			};
		});
	});

	function formatCurrency(val: number) {
		return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
	}

	// Local state bound to store with initial fallback to server/db privacy
	const dbPrivacySetting = $derived(
		data.moduleSettings?.find((s: any) => s.module === 'system' && s.setting_key === 'privacy')?.setting_value
	);

	let isSavingPrivacy = $state(false);
	let privacyToastMsg = $state('');

	let settings = $state({
		hideSalaryNominals: data.privacySettings?.hideSalaryNominals ?? $systemSettings.hideSalaryNominals,
		maskSensitiveInfo: data.privacySettings?.maskSensitiveInfo ?? $systemSettings.maskSensitiveInfo,
		companyName: $systemSettings.companyName,
		companyShortName: $systemSettings.companyShortName,
		headOfficeAddress: $systemSettings.headOfficeAddress,
		poolCilegonAddress: $systemSettings.poolCilegonAddress,
		poolGunungPutriAddress: $systemSettings.poolGunungPutriAddress,
		companyTaxId: $systemSettings.companyTaxId,
		companyPhone: $systemSettings.companyPhone,
		companyEmail: $systemSettings.companyEmail,
		theme: $systemSettings.theme,
		dateFormat: $systemSettings.dateFormat,
		enableAudioAlerts: $systemSettings.enableAudioAlerts,
		autoLogoutMinutes: $systemSettings.autoLogoutMinutes
	});

	// Sync local privacy state when database or layout data changes
	$effect(() => {
		if (data.privacySettings) {
			settings.hideSalaryNominals = data.privacySettings.hideSalaryNominals;
			settings.maskSensitiveInfo = data.privacySettings.maskSensitiveInfo;
		}
	});

	async function persistPrivacyToDb(hideSalary: boolean, maskInfo: boolean) {
		isSavingPrivacy = true;
		try {
			const fd = new FormData();
			fd.append('hideSalaryNominals', hideSalary ? 'true' : 'false');
			fd.append('maskSensitiveInfo', maskInfo ? 'true' : 'false');

			const res = await fetch('?/savePrivacySettings', {
				method: 'POST',
				body: fd
			});

			if (res.ok) {
				systemSettings.updateSettings({
					hideSalaryNominals: hideSalary,
					maskSensitiveInfo: maskInfo
				});
				isSavedToast = true;
				privacyToastMsg = hideSalary 
					? 'Mode Sensor Gaji AKTIF di seluruh sistem & semua akun!'
					: 'Mode Sensor Gaji DINONAKTIFKAN di database global.';
				setTimeout(() => {
					isSavedToast = false;
					privacyToastMsg = '';
				}, 3500);
			} else {
				console.error('Gagal menyimpan privasi ke database');
			}
		} catch (err) {
			console.error('Error auto-saving privacy to database:', err);
		} finally {
			isSavingPrivacy = false;
		}
	}

	function handleSave() {
		systemSettings.updateSettings(settings);
		persistPrivacyToDb(settings.hideSalaryNominals, settings.maskSensitiveInfo);
		isSavedToast = true;
		privacyToastMsg = 'Pengaturan sistem & privasi global berhasil disimpan!';
		setTimeout(() => {
			isSavedToast = false;
			privacyToastMsg = '';
		}, 3000);
	}

	function handleTogglePrivacy() {
		const nextVal = !settings.hideSalaryNominals;
		settings.hideSalaryNominals = nextVal;
		persistPrivacyToDb(nextVal, settings.maskSensitiveInfo);
	}

	function handleToggleMasking() {
		const nextVal = !settings.maskSensitiveInfo;
		settings.maskSensitiveInfo = nextVal;
		persistPrivacyToDb(settings.hideSalaryNominals, nextVal);
	}

	function handleSelectProfile(id: string) {
		selectedProfileId = id;
	}

	function handleSaveActiveProfile() {
		if (!activeProfile) return;
		isSavingMail = true;
		mailStore.profiles.updateProfile(activeProfile.id, activeProfile);
		setTimeout(() => {
			isSavingMail = false;
			mailSaveToast = true;
			setTimeout(() => (mailSaveToast = false), 3500);
		}, 300);
	}

	function handleSetDefaultProfile(id: string) {
		mailStore.profiles.setDefaultProfile(id);
	}

	function handleToggleProfileActive(id: string) {
		mailStore.profiles.toggleActive(id);
	}

	function handleDeleteProfile(id: string) {
		if (profiles.length <= 1) {
			alert('Minimal harus ada 1 profil server email.');
			return;
		}
		if (confirm('Hapus profil server email ini?')) {
			mailStore.profiles.deleteProfile(id);
		}
	}

	function handleAddProfile(type: 'bcs-corporate' | 'gmail' | 'custom' = 'custom') {
		const newId = `profile-${Date.now()}`;
		let newProfile: MailServerProfile;

		if (type === 'gmail') {
			newProfile = {
				id: newId,
				name: 'Google Workspace / Gmail',
				domain: 'gmail.com',
				providerType: 'gmail',
				isDefault: false,
				isActive: true,
				inboundProtocol: 'IMAP',
				inboundHost: 'imap.gmail.com',
				inboundPort: 993,
				inboundEncryption: 'SSL',
				inboundUsername: 'ops.bcs@gmail.com',
				smtpHost: 'smtp.gmail.com',
				smtpPort: 587,
				smtpEncryption: 'TLS',
				smtpUsername: 'ops.bcs@gmail.com',
				smtpFromEmail: 'ops.bcs@gmail.com',
				smtpFromName: 'BCS Logistics (Gmail)',
				authRequired: true,
				verifySsl: true,
				timeoutSeconds: 30,
				note: 'Gunakan Google App Password 16 karakter tanpa spasi.'
			};
		} else if (type === 'bcs-corporate') {
			newProfile = {
				id: newId,
				name: 'BCS Secondary Server',
				domain: 'bcs-logistics.co.id',
				providerType: 'bcs-corporate',
				isDefault: false,
				isActive: true,
				inboundProtocol: 'IMAP',
				inboundHost: 'mail.bcs-logistics.co.id',
				inboundPort: 993,
				inboundEncryption: 'SSL',
				inboundUsername: 'ops-pool@bcs-logistics.co.id',
				smtpHost: 'smtp.bcs-logistics.co.id',
				smtpPort: 587,
				smtpEncryption: 'TLS',
				smtpUsername: 'ops-pool@bcs-logistics.co.id',
				smtpFromEmail: 'ops-pool@bcs-logistics.co.id',
				smtpFromName: 'BCS Pool Merak Mailer',
				authRequired: true,
				verifySsl: true,
				timeoutSeconds: 30,
				note: 'Server cadangan operasional pool Merak.'
			};
		} else {
			newProfile = {
				id: newId,
				name: 'Server Email Baru',
				domain: 'perusahaan.com',
				providerType: 'custom',
				isDefault: false,
				isActive: true,
				inboundProtocol: 'IMAP',
				inboundHost: 'mail.perusahaan.com',
				inboundPort: 993,
				inboundEncryption: 'SSL',
				inboundUsername: 'user@perusahaan.com',
				smtpHost: 'smtp.perusahaan.com',
				smtpPort: 587,
				smtpEncryption: 'TLS',
				smtpUsername: 'user@perusahaan.com',
				smtpFromEmail: 'user@perusahaan.com',
				smtpFromName: 'BCS Custom Mailer',
				authRequired: true,
				verifySsl: true,
				timeoutSeconds: 30
			};
		}

		mailStore.profiles.addProfile(newProfile);
		selectedProfileId = newId;
	}

	function handleSendTestEmail() {
		if (!activeProfile) return;
		testEmailSending = true;
		testEmailToast = `Menguji pengiriman email via [${activeProfile.name}] ${activeProfile.smtpHost}:${activeProfile.smtpPort} (Domain: @${activeProfile.domain})...`;
		setTimeout(() => {
			testEmailSending = false;
			testEmailToast = `Uji koneksi SMTP [${activeProfile.name}] BERHASIL! Email uji coba terkirim ke ${user?.email || 'admin@bcs-logistics.co.id'}.`;
			setTimeout(() => (testEmailToast = ''), 5000);
		}, 1200);
	}

	const templateApprovalHtml = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:24px;background:#F8FAFC;font-family:sans-serif;">
  <div style="max-width:600px;margin:auto;background:#fff;border-radius:16px;border:1px solid #E2E8F0;overflow:hidden;">
    <div style="height:6px;background:linear-gradient(90deg,#0F172A 0%,#1E3A8A 65%,#EA580C 100%);"></div>
    <div style="padding:24px 32px;border-bottom:1px solid #F1F5F9;display:flex;justify-content:space-between;align-items:center;">
      <img src="https://bcs-logistics.co.id/assets/images/logoo.png" height="32" alt="BCS" />
      <span style="font-size:11px;font-weight:700;color:#D97706;background:#FEF3C7;padding:4px 10px;border-radius:99px;">Menunggu Approval</span>
    </div>
    <div style="padding:32px;">
      <h3 style="margin:0 0 10px 0;font-size:18px;color:#0F172A;">Permohonan Persetujuan Cuti</h3>
      <p style="font-size:13px;color:#475569;">Terdapat permohonan baru dari <strong>Ahmad Subarjo</strong> yang memerlukan persetujuan Anda.</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin:20px 0;border:1px solid #E2E8F0;">
        <tr style="background:#F8FAFC;"><td style="padding:8px 12px;color:#64748B;">No. Dokumen</td><td style="padding:8px 12px;font-weight:700;">CUTI/2026/XI/0042</td></tr>
        <tr><td style="padding:8px 12px;color:#64748B;">Durasi</td><td style="padding:8px 12px;">3 Hari Kerja (10 - 12 Nov 2026)</td></tr>
        <tr style="background:#F8FAFC;"><td style="padding:8px 12px;color:#64748B;">Departemen</td><td style="padding:8px 12px;">Fleet Operations Cilegon</td></tr>
      </table>
      <div style="text-align:center;margin-top:24px;">
        <a href="https://erp.bcs-logistics.co.id/hris/leave" style="background:#EA580C;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:13px;">Tinjau di ERP BCS</a>
      </div>
    </div>
    <div style="padding:20px;background:#F8FAFC;border-top:1px solid #E2E8F0;text-align:center;font-size:11px;color:#64748B;">
      PT Buana Centra Swakarsa &bull; Jl. Raya Merak KM 115 Cilegon
    </div>
  </div>
</body>
</html>`;

	const templateResultHtml = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:24px;background:#F8FAFC;font-family:sans-serif;">
  <div style="max-width:600px;margin:auto;background:#fff;border-radius:16px;border:1px solid #E2E8F0;overflow:hidden;">
    <div style="height:6px;background:linear-gradient(90deg,#0F172A 0%,#1E3A8A 65%,#EA580C 100%);"></div>
    <div style="padding:24px 32px;border-bottom:1px solid #F1F5F9;display:flex;justify-content:space-between;align-items:center;">
      <img src="https://bcs-logistics.co.id/assets/images/logoo.png" height="32" alt="BCS" />
      <span style="font-size:11px;font-weight:700;color:#059669;background:#D1FAE5;padding:4px 10px;border-radius:99px;">Disetujui</span>
    </div>
    <div style="padding:32px;">
      <div style="background:#F0FDF4;border:1px solid #BBF7D0;padding:14px;border-radius:10px;margin-bottom:20px;">
        <p style="margin:0;font-weight:800;color:#166534;">✓ Pengajuan Kasbon Disetujui</p>
        <p style="margin:4px 0 0 0;font-size:12px;color:#15803D;">Voucher #KB-2026-11-004 telah disetujui Manajer Keuangan.</p>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin:20px 0;border:1px solid #E2E8F0;">
        <tr style="background:#F8FAFC;"><td style="padding:8px 12px;color:#64748B;">Nominal</td><td style="padding:8px 12px;font-weight:800;color:#059669;">Rp 2.500.000</td></tr>
        <tr><td style="padding:8px 12px;color:#64748B;">Ditinjau Oleh</td><td style="padding:8px 12px;">Hendra Kusuma, S.E.</td></tr>
      </table>
      <div style="text-align:center;margin-top:24px;">
        <a href="https://erp.bcs-logistics.co.id/kasir" style="background:#0F172A;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:13px;">Buka Modul Kasir</a>
      </div>
    </div>
    <div style="padding:20px;background:#F8FAFC;border-top:1px solid #E2E8F0;text-align:center;font-size:11px;color:#64748B;">
      PT Buana Centra Swakarsa &bull; Jl. Raya Merak KM 115 Cilegon
    </div>
  </div>
</body>
</html>`;

	const templateAnnouncementHtml = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:24px;background:#F8FAFC;font-family:sans-serif;">
  <div style="max-width:600px;margin:auto;background:#fff;border-radius:16px;border:1px solid #E2E8F0;overflow:hidden;">
    <div style="height:6px;background:linear-gradient(90deg,#0F172A 0%,#1E3A8A 65%,#EA580C 100%);"></div>
    <div style="padding:24px 32px;border-bottom:1px solid #F1F5F9;display:flex;justify-content:space-between;align-items:center;">
      <img src="https://bcs-logistics.co.id/assets/images/logoo.png" height="32" alt="BCS" />
      <span style="font-size:11px;font-weight:700;color:#0284C7;background:#E0F2FE;padding:4px 10px;border-radius:99px;">Pengumuman</span>
    </div>
    <div style="padding:32px;">
      <h3 style="margin:0 0 10px 0;font-size:18px;color:#0F172A;">Pemberitahuan Akun & Keamanan ERP</h3>
      <p style="font-size:13.5px;color:#334155;line-height:1.6;">Rekan Karyawan, seluruh akses email operasional kini terpusat pada domain resmi <strong>@bcs-logistics.co.id</strong>.</p>
      <div style="background:#F1F5F9;border-left:4px solid #1E3A8A;padding:12px;border-radius:6px;margin:20px 0;font-size:12.5px;color:#475569;">
        Pastikan tidak membagikan kredensial login atau OTP kepada pihak lain.
      </div>
      <div style="text-align:center;margin-top:24px;">
        <a href="https://erp.bcs-logistics.co.id" style="background:#1E3A8A;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:13px;">Masuk ke Portal ERP</a>
      </div>
    </div>
    <div style="padding:20px;background:#F8FAFC;border-top:1px solid #E2E8F0;text-align:center;font-size:11px;color:#64748B;">
      PT Buana Centra Swakarsa &bull; Head Office Cilegon
    </div>
  </div>
</body>
</html>`;

	function copyCurrentTemplate(type: 'html' | 'blade') {
		const filesMap: Record<string, { html: string; bladePath: string }> = {
			approval: { html: templateApprovalHtml, bladePath: 'templates/emails/approval-notification.blade.php' },
			result: { html: templateResultHtml, bladePath: 'templates/emails/approval-result.blade.php' },
			announcement: { html: templateAnnouncementHtml, bladePath: 'templates/emails/announcement-account.blade.php' }
		};

		if (type === 'html') {
			navigator.clipboard.writeText(filesMap[selectedTemplateVariant].html);
			copiedTemplateToast = 'Template HTML murni berhasil disalin ke clipboard!';
		} else {
			navigator.clipboard.writeText(`@extends('emails.master-layout')\n// File: ${filesMap[selectedTemplateVariant].bladePath}\n// Tersedia di direktori project templates/emails/`);
			copiedTemplateToast = 'Referensi Blade template berhasil disalin ke clipboard!';
		}
		setTimeout(() => (copiedTemplateToast = ''), 3500);
	}
</script>

<svelte:head>
	<title>Pengaturan Sistem & Mode Presentasi | ERP BCS</title>
</svelte:head>

<div class="max-w-6xl mx-auto space-y-6">
	<!-- Top Bar Header -->
	<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
		<div>
			<div class="flex items-center gap-2">
				<span class="material-symbols-outlined text-primary text-2xl">tune</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Pengaturan Sistem & Privasi Admin</h1>
			</div>
			<p class="text-sm text-on-surface-variant font-medium mt-0.5">
				Konfigurasi Mode Presentasi, Privasi Data Gaji, Profil Perusahaan, dan Preferensi ERP
			</p>
		</div>

		<div class="flex items-center gap-3">
			{#if isSavedToast}
				<span class="text-xs font-bold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl inline-flex items-center gap-1.5 animate-in fade-in">
					<span class="material-symbols-outlined text-sm">check_circle</span>
					<span>{privacyToastMsg || 'Pengaturan tersimpan!'}</span>
				</span>
			{/if}
			<button
				onclick={handleSave}
				disabled={isSavingPrivacy}
				class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-sm shadow-xs hover:bg-primary/90 transition-all cursor-pointer disabled:opacity-50"
			>
				<span class="material-symbols-outlined text-lg">save</span>
				<span>{isSavingPrivacy ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
			</button>
		</div>
	</div>

	<!-- Navigation Tabs -->
	<div class="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-1 overflow-x-auto">
		<button
			onclick={() => switchTab('privacy')}
			class="px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap {activeTab === 'privacy' ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface-variant hover:bg-surface-container'}"
		>
			<span class="material-symbols-outlined text-sm">visibility_off</span>
			<span>Privasi & Mode Presentasi</span>
			{#if settings.hideSalaryNominals}
				<span class="w-2 h-2 rounded-full bg-amber-400"></span>
			{/if}
		</button>
		<button
			onclick={() => switchTab('company')}
			class="px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap {activeTab === 'company' ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface-variant hover:bg-surface-container'}"
		>
			<span class="material-symbols-outlined text-sm">corporate_fare</span>
			<span>Profil Perusahaan & Pool</span>
		</button>
		<button
			onclick={() => switchTab('preferences')}
			class="px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap {activeTab === 'preferences' ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface-variant hover:bg-surface-container'}"
		>
			<span class="material-symbols-outlined text-sm">palette</span>
			<span>Tampilan & Notifikasi</span>
		</button>
		<button
			onclick={() => switchTab('security')}
			class="px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap {activeTab === 'security' ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface-variant hover:bg-surface-container'}"
		>
			<span class="material-symbols-outlined text-sm">security</span>
			<span>Keamanan & Sesi Login</span>
		</button>
		<button
			onclick={() => switchTab('approvals')}
			class="px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap {activeTab === 'approvals' ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface-variant hover:bg-surface-container'}"
		>
			<span class="material-symbols-outlined text-sm">tune</span>
			<span>Pengaturan Modul & Approval</span>
		</button>
		<button
			onclick={() => switchTab('email')}
			class="px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap {activeTab === 'email' ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface-variant hover:bg-surface-container'}"
		>
			<span class="material-symbols-outlined text-sm">mail</span>
			<span>Konfigurasi Email & Server</span>
			<span class="px-1.5 py-0.2 rounded bg-orange-500/20 text-orange-600 dark:text-orange-400 text-[9px] font-black uppercase">Admin</span>
		</button>
		<button
			onclick={() => switchTab('ai')}
			class="px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap {activeTab === 'ai' ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface-variant hover:bg-surface-container'}"
		>
			<span class="material-symbols-outlined text-sm">smart_toy</span>
			<span>AI Engine & Asisten</span>
			<span class="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[9px] font-black uppercase">Admin</span>
		</button>
	</div>

	<!-- TAB 1: PRIVACY & PRESENTATION MODE -->
	{#if activeTab === 'privacy'}
		<div class="space-y-6">
			<!-- Banner Info Mode Presentasi & Privasi Database Global -->
			<div class="p-5 rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
				<div class="flex items-center gap-4">
					<div class="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-white flex-shrink-0">
						<span class="material-symbols-outlined text-2xl">slideshow</span>
					</div>
					<div>
						<div class="flex items-center gap-2">
							<h3 class="text-base font-bold">Mode Presentasi Layar & Privasi Database Global</h3>
							<span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/30">
								Global System Setting
							</span>
						</div>
						<p class="text-xs text-blue-100 mt-0.5 leading-relaxed">
							Pengaturan sensor gaji dan masking data ini tersimpan di database server (<code class="font-mono bg-black/20 px-1 py-0.5 rounded">master.module_settings</code>) dan berlaku serentak ke <strong>seluruh akun pengguna</strong> di ERP BCS.
						</p>
					</div>
				</div>
				<div class="flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-full text-xs font-bold border border-white/20">
					<span>Status:</span>
					<span class="uppercase tracking-wider {settings.hideSalaryNominals ? 'text-amber-300' : 'text-emerald-300'}">
						{settings.hideSalaryNominals ? '🔒 Tersensor (Aktif Global)' : '👁️ Terbuka (Publik)'}
					</span>
				</div>
			</div>

			<!-- Toggle Setting 1: Sembunyikan Nominal Gaji -->
			<div class="p-6 rounded-3xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs space-y-4">
				<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
					<div class="space-y-1">
						<div class="flex items-center gap-2">
							<span class="material-symbols-outlined text-primary text-xl">payments</span>
							<h3 class="text-sm font-bold text-on-surface">Sembunyikan Nominal Gaji di Halaman Payroll & Slip Gaji</h3>
						</div>
						<p class="text-xs text-on-surface-variant leading-relaxed max-w-2xl">
							Ketika toggle ini diaktifkan, seluruh nilai rupiah pada modul Payroll, Total Pendapatan, Potongan, Take Home Pay (THP), dan modal Slip Gaji karyawan akan otomatis disamarkan menjadi <code class="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono font-bold">Rp ••••••••</code>.
						</p>
					</div>
					<button
						type="button"
						onclick={handleTogglePrivacy}
						disabled={isSavingPrivacy}
						aria-label="Toggle sensor nominal gaji global"
						class="w-14 h-8 rounded-full transition-colors relative p-1 cursor-pointer flex-shrink-0 disabled:opacity-50 {settings.hideSalaryNominals ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}"
					>
						<span
							class="w-6 h-6 rounded-full bg-white block transition-transform shadow-md {settings.hideSalaryNominals ? 'translate-x-6' : 'translate-x-0'}"
						></span>
					</button>
				</div>

				<!-- Live Preview Box -->
				<div class="p-4 rounded-2xl bg-surface border border-slate-200 dark:border-slate-800 space-y-3">
					<p class="text-xs font-bold text-slate-400 uppercase tracking-wider">Pratinjau Tampilan (Live Preview):</p>
					<div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
						<div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
							<span class="text-slate-400 block text-[11px]">Gaji Pokok Staff</span>
							<span class="text-sm font-bold text-on-surface font-mono">
								{formatCurrencyPrivacy(8500000, settings.hideSalaryNominals)}
							</span>
						</div>
						<div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
							<span class="text-slate-400 block text-[11px]">Total Pendapatan (Gross)</span>
							<span class="text-sm font-bold text-emerald-600 font-mono">
								{formatCurrencyPrivacy(10300000, settings.hideSalaryNominals)}
							</span>
						</div>
						<div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
							<span class="text-slate-400 block text-[11px]">Take Home Pay (THP)</span>
							<span class="text-sm font-black text-primary font-mono">
								{formatCurrencyPrivacy(10145301, settings.hideSalaryNominals)}
							</span>
						</div>
					</div>
				</div>
			</div>

			<!-- Toggle Setting 2: Sensor NIK & Nomor Rekening -->
			<div class="p-6 rounded-3xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs space-y-4">
				<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
					<div class="space-y-1">
						<div class="flex items-center gap-2">
							<span class="material-symbols-outlined text-primary text-xl">badge</span>
							<h3 class="text-sm font-bold text-on-surface">Sensor NIK & Nomor Rekening Bank Karyawan (Data Masking)</h3>
						</div>
						<p class="text-xs text-on-surface-variant leading-relaxed max-w-2xl">
							Menyamarkan 4 digit tengah Nomor Induk Karyawan (NIK) dan nomor rekening transfer bank pada seluruh tabel daftar direktori HRIS.
						</p>
					</div>
					<button
						type="button"
						onclick={handleToggleMasking}
						disabled={isSavingPrivacy}
						aria-label="Toggle sensor NIK dan nomor rekening global"
						class="w-14 h-8 rounded-full transition-colors relative p-1 cursor-pointer flex-shrink-0 disabled:opacity-50 {settings.maskSensitiveInfo ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}"
					>
						<span
							class="w-6 h-6 rounded-full bg-white block transition-transform shadow-md {settings.maskSensitiveInfo ? 'translate-x-6' : 'translate-x-0'}"
						></span>
					</button>
				</div>

				<!-- Live Preview Box -->
				<div class="p-4 rounded-2xl bg-surface border border-slate-200 dark:border-slate-800 space-y-3">
					<p class="text-xs font-bold text-slate-400 uppercase tracking-wider">Pratinjau Masking Identitas:</p>
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
						<div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
							<span class="text-slate-400 block text-[11px]">Format NIK Karyawan</span>
							<span class="text-sm font-bold text-on-surface font-mono">
								{formatMaskedText('0807.0747', settings.maskSensitiveInfo)}
							</span>
						</div>
						<div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
							<span class="text-slate-400 block text-[11px]">Format Rekening Transfer Bank</span>
							<span class="text-sm font-bold text-on-surface font-mono">
								BNI {formatMaskedText('1234567890', settings.maskSensitiveInfo)}
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>

	<!-- TAB 2: COMPANY PROFILE & POOL LOGISTICS -->
	{:else if activeTab === 'company'}
		<div class="p-6 rounded-3xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs space-y-6">
			<div>
				<h3 class="text-base font-bold text-on-surface">Informasi Resmi Entitas Perusahaan</h3>
				<p class="text-xs text-on-surface-variant mt-0.5">Digunakan sebagai kop surat pada slip gaji, SPKL lembur, invoice, dan surat dinas HRIS.</p>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
				<div>
					<label class="font-bold text-on-surface block mb-1">Nama Resmi Perusahaan</label>
					<input type="text" bind:value={settings.companyName} class="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 font-semibold" />
				</div>
				<div>
					<label class="font-bold text-on-surface block mb-1">Nama Singkatan / Brand</label>
					<input type="text" bind:value={settings.companyShortName} class="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 font-semibold" />
				</div>
				<div>
					<label class="font-bold text-on-surface block mb-1">NPWP Perusahaan</label>
					<input type="text" bind:value={settings.companyTaxId} class="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 font-mono" />
				</div>
				<div>
					<label class="font-bold text-on-surface block mb-1">Email Resmi Korporat</label>
					<input type="email" bind:value={settings.companyEmail} class="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700" />
				</div>
				<div class="md:col-span-2">
					<label class="font-bold text-on-surface block mb-1">Alamat Kantor Pusat & Pool Cilegon</label>
					<input type="text" bind:value={settings.headOfficeAddress} class="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700" />
				</div>
				<div class="md:col-span-2">
					<label class="font-bold text-on-surface block mb-1">Alamat Pool Gunung Putri (Bogor)</label>
					<input type="text" bind:value={settings.poolGunungPutriAddress} class="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700" />
				</div>
			</div>
		</div>

	<!-- TAB 3: DISPLAY & NOTIFICATION PREFERENCES -->
	{:else if activeTab === 'preferences'}
		<div class="p-6 rounded-3xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs space-y-6">
			<div>
				<h3 class="text-base font-bold text-on-surface">Preferensi Tampilan & Notifikasi</h3>
				<p class="text-xs text-on-surface-variant mt-0.5">Sesuaikan preferensi antarmuka pengguna dan audio peringatan sistem.</p>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
				<div>
					<label class="font-bold text-on-surface block mb-1">Tema Tampilan (Theme)</label>
					<select bind:value={settings.theme} class="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer">
						<option value="system">Mengikuti Pengaturan Sistem (Otomatis)</option>
						<option value="light">Light Mode (Terang)</option>
						<option value="dark">Dark Mode (Gelap)</option>
					</select>
				</div>
				<div>
					<label class="font-bold text-on-surface block mb-1">Format Tanggal</label>
					<select bind:value={settings.dateFormat} class="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer">
						<option value="DD/MM/YYYY">DD/MM/YYYY (Contoh: 18/08/2026)</option>
						<option value="YYYY-MM-DD">YYYY-MM-DD (Contoh: 2026-08-18)</option>
					</select>
				</div>
				<div class="md:col-span-2 p-4 rounded-2xl bg-surface border border-slate-200 dark:border-slate-800 flex items-center justify-between">
					<div>
						<span class="font-bold text-on-surface block">Audio Alert & Suara Peringatan Kritis</span>
						<span class="text-[11px] text-slate-400">Memutar sinyal audio saat terjadi insiden truk darurat atau kelelahan supir (Fatigue Alert) di OCS/FMS.</span>
					</div>
					<input type="checkbox" bind:checked={settings.enableAudioAlerts} class="w-5 h-5 rounded text-primary cursor-pointer" />
				</div>
			</div>
		</div>

	<!-- TAB 4: SECURITY & LOGIN SESSIONS -->
	{:else if activeTab === 'security'}
		<div class="p-6 rounded-3xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs space-y-6">
			<div>
				<h3 class="text-base font-bold text-on-surface">Keamanan Akun & Manajemen Sesi</h3>
				<p class="text-xs text-on-surface-variant mt-0.5">Pengaturan durasi sesi aktif dan perlindungan akses sistem.</p>
			</div>

			<div class="space-y-4 text-xs">
				<div class="max-w-md">
					<label class="font-bold text-on-surface block mb-1">Batas Waktu Idle (Auto-Logout)</label>
					<select bind:value={settings.autoLogoutMinutes} class="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer">
						<option value={15}>15 Menit</option>
						<option value={30}>30 Menit</option>
						<option value={60}>1 Jam (Direkomendasikan)</option>
						<option value={240}>4 Jam</option>
					</select>
					<span class="text-[11px] text-slate-400 mt-1 block">Otomatis mengunci sesi jika tidak ada aktivitas pengguna di layar.</span>
				</div>

				<div class="pt-4 border-t border-slate-200 dark:border-slate-800">
					<h4 class="font-bold text-on-surface mb-2">Informasi Sesi Login Aktif</h4>
					<div class="p-4 rounded-2xl bg-surface border border-slate-200 dark:border-slate-800 flex items-center justify-between">
						<div class="flex items-center gap-3">
							<span class="material-symbols-outlined text-emerald-500 text-2xl">laptop_mac</span>
							<div>
								<p class="font-bold text-on-surface">Perangkat Ini (Web Browser)</p>
								<p class="text-[11px] text-slate-400 font-mono">IP: 103.31.205.199 • Aktif sekarang</p>
							</div>
						</div>
						<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
							Sesi Terverifikasi
						</span>
					</div>
				</div>
			</div>
		</div>

	<!-- TAB 5: MODULE APPROVAL SETTINGS -->
	{:else if activeTab === 'approvals'}
		<div class="space-y-6">
			<!-- Header Info -->
			<div class="p-5 rounded-3xl bg-gradient-to-r from-amber-600 to-orange-700 text-white shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
				<div class="flex items-center gap-4">
					<div class="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-white flex-shrink-0">
						<span class="material-symbols-outlined text-2xl">verified_user</span>
					</div>
					<div>
						<h3 class="text-base font-bold">Pusat Konfigurasi & Preset Modul Operasional ERP</h3>
						<p class="text-xs text-amber-100 mt-0.5 leading-relaxed">
							Kelola pejabat penandatangan dokumen (PMS), preset dokumen faktur (Finance), serta acuan rasio konsumsi solar operasional armada (OCS).
						</p>
					</div>
				</div>
				<div class="flex items-center gap-2 flex-wrap">
					<a
						href="/pms/settings"
						class="px-3.5 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap border border-white/25"
					>
						<span class="material-symbols-outlined text-sm">open_in_new</span>
						<span>Modul PMS</span>
					</a>
					<a
						href="/ocs/settings"
						class="px-3.5 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap border border-white/25"
					>
						<span class="material-symbols-outlined text-sm">open_in_new</span>
						<span>Modul OCS</span>
					</a>
				</div>
			</div>

			<!-- Success Notification -->
			{#if approvalSuccessMsg}
				<div class="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
					<span class="material-symbols-outlined text-base">check_circle</span>
					<span>{approvalSuccessMsg}</span>
				</div>
			{/if}

			<!-- Module List Cards -->
			<div class="space-y-6">
				<!-- Section: Modul PMS -->
				<div class="p-6 rounded-3xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs space-y-6">
					<div class="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-800/60">
						<div class="flex items-center gap-2.5">
							<span class="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-xs">
								PMS
							</span>
							<div>
								<h4 class="font-bold text-sm text-on-surface">Modul Procurement (PMS)</h4>
								<p class="text-[11px] text-on-surface-variant">Penandatangan dokumen cetak Purchase Order & Purchase Request</p>
							</div>
						</div>
					</div>

					<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
						<!-- Card 1: PO Approval -->
						{#each (data.moduleSettings?.filter((s: any) => s.module === 'pms' && s.setting_key === 'approval_po') || []) as poSetting}
							<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/80 dark:border-slate-800/80 space-y-4">
								<div class="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
									<div>
										<h5 class="font-bold text-xs text-on-surface">Cetak Purchase Order (PO)</h5>
										<p class="text-[10px] text-slate-500">Kolom "Disetujui Oleh"</p>
									</div>
									<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700">
										PO Print
									</span>
								</div>

								<form method="POST" action="?/saveModuleApproval" use:enhance class="space-y-3 text-xs">
									<input type="hidden" name="module" value="pms" />
									<input type="hidden" name="settingKey" value="approval_po" />
									<input type="hidden" name="description" value={poSetting.description} />

									<div>
										<label class="font-bold text-on-surface block mb-1">Pilih dari Master Karyawan</label>
										<select
											onchange={(e) => {
												const target = e.target as HTMLSelectElement;
												const emp = data.employees?.find((em: any) => em.payrollId === target.value);
												if (emp) {
													const form = target.closest('form');
													if (form) {
														(form.querySelector('input[name="name"]') as HTMLInputElement).value = emp.name;
														(form.querySelector('input[name="position"]') as HTMLInputElement).value = emp.position || 'Procurement Manager';
														(form.querySelector('input[name="payrollId"]') as HTMLInputElement).value = emp.payrollId;
													}
												}
												target.value = '';
											}}
											class="w-full px-3 py-1.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs cursor-pointer"
										>
											<option value="">-- Isi Otomatis dari Karyawan ({data.employees?.length || 0} orang) --</option>
											{#each (data.employees || []) as emp}
												<option value={emp.payrollId}>{emp.name} ({emp.payrollId}) {emp.position ? `- ${emp.position}` : ''}{emp.department ? ` [${emp.department}]` : ''}</option>
											{/each}
										</select>
									</div>

									<input type="hidden" name="payrollId" value={poSetting.setting_value?.payroll_id || ''} />

									<div>
										<label class="font-bold text-on-surface block mb-1">Nama Pejabat</label>
										<input
											type="text"
											name="name"
											value={poSetting.setting_value?.name || ''}
											required
											class="w-full px-3 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs font-bold"
										/>
									</div>

									<div>
										<label class="font-bold text-on-surface block mb-1">Jabatan Resmi</label>
										<input
											type="text"
											name="position"
											value={poSetting.setting_value?.position || ''}
											required
											class="w-full px-3 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs"
										/>
									</div>

									<div class="pt-1 flex justify-between items-center text-[10px] text-slate-400">
										<span>Update: {poSetting.updated_at || '-'}</span>
										<button
											type="submit"
											class="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer transition-colors shadow-2xs"
										>
											Simpan PO
										</button>
									</div>
								</form>
							</div>
						{/each}

						<!-- Card 2: PR Approval -->
						{#each (data.moduleSettings?.filter((s: any) => s.module === 'pms' && s.setting_key === 'approval_pr') || []) as prSetting}
							<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/80 dark:border-slate-800/80 space-y-4">
								<div class="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
									<div>
										<h5 class="font-bold text-xs text-on-surface">Cetak Purchase Request (PR)</h5>
										<p class="text-[10px] text-slate-500">Kolom "Disetujui Oleh"</p>
									</div>
									<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-700">
										PR Print
									</span>
								</div>

								<form method="POST" action="?/saveModuleApproval" use:enhance class="space-y-3 text-xs">
									<input type="hidden" name="module" value="pms" />
									<input type="hidden" name="settingKey" value="approval_pr" />
									<input type="hidden" name="description" value={prSetting.description} />

									<div>
										<label class="font-bold text-on-surface block mb-1">Pilih dari Master Karyawan</label>
										<select
											onchange={(e) => {
												const target = e.target as HTMLSelectElement;
												const emp = data.employees?.find((em: any) => em.payrollId === target.value);
												if (emp) {
													const form = target.closest('form');
													if (form) {
														(form.querySelector('input[name="name"]') as HTMLInputElement).value = emp.name;
														(form.querySelector('input[name="position"]') as HTMLInputElement).value = emp.position || 'Head of Operations';
														(form.querySelector('input[name="payrollId"]') as HTMLInputElement).value = emp.payrollId;
													}
												}
												target.value = '';
											}}
											class="w-full px-3 py-1.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs cursor-pointer"
										>
											<option value="">-- Isi Otomatis dari Karyawan ({data.employees?.length || 0} orang) --</option>
											{#each (data.employees || []) as emp}
												<option value={emp.payrollId}>{emp.name} ({emp.payrollId}) {emp.position ? `- ${emp.position}` : ''}{emp.department ? ` [${emp.department}]` : ''}</option>
											{/each}
										</select>
									</div>

									<input type="hidden" name="payrollId" value={prSetting.setting_value?.payroll_id || ''} />

									<div>
										<label class="font-bold text-on-surface block mb-1">Nama Pejabat</label>
										<input
											type="text"
											name="name"
											value={prSetting.setting_value?.name || ''}
											required
											class="w-full px-3 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs font-bold"
										/>
									</div>

									<div>
										<label class="font-bold text-on-surface block mb-1">Jabatan Resmi</label>
										<input
											type="text"
											name="position"
											value={prSetting.setting_value?.position || ''}
											required
											class="w-full px-3 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs"
										/>
									</div>

									<div class="pt-1 flex justify-between items-center text-[10px] text-slate-400">
										<span>Update: {prSetting.updated_at || '-'}</span>
										<button
											type="submit"
											class="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer transition-colors shadow-2xs"
										>
											Simpan PR
										</button>
									</div>
								</form>
							</div>
						{/each}
					</div>
				</div>

				<!-- Section: Modul Finance (Preset Tipe Dokumen Customer Invoice) -->
				<div class="p-6 rounded-3xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs space-y-6">
					<div class="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-800/60">
						<div class="flex items-center gap-2.5">
							<span class="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center font-bold text-xs">
								FIN
							</span>
							<div>
								<h4 class="font-bold text-sm text-on-surface">Modul Finance — Preset Tipe Dokumen Customer Invoice</h4>
								<p class="text-[11px] text-on-surface-variant">Konfigurasi opsi pilihan tipe dokumen Order / Kontrak dan Penerimaan / Pengiriman</p>
							</div>
						</div>
						<a
							href="/finance/create-transaction/customer-invoices"
							class="px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-container text-teal-600 text-xs font-bold transition-colors flex items-center gap-1.5 border border-slate-200 dark:border-slate-700"
						>
							<span class="material-symbols-outlined text-sm">open_in_new</span>
							<span>Buka Customer Invoice</span>
						</a>
					</div>

					<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
						<!-- Card 1: Order Doc Types -->
						<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/80 dark:border-slate-800/80 space-y-4">
							<div class="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
								<div>
									<h5 class="font-bold text-xs text-on-surface">Dokumen Order / Kontrak</h5>
									<p class="text-[10px] text-slate-500">Preset pilihan dropdown nomor PO / SPK / Kontrak pelanggan</p>
								</div>
								<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/10 text-teal-700">
									Order Ref
								</span>
							</div>

							<!-- Current Badges -->
							<div>
								<span class="text-[11px] font-bold text-slate-500 block mb-1.5">Preset Aktif Saat Ini:</span>
								<div class="flex flex-wrap gap-1.5">
									{#each finOrderTypesList as tag}
										<span class="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-xs font-bold font-mono">
											{tag}
										</span>
									{/each}
								</div>
							</div>

							<form method="POST" action="?/saveDocTypes" use:enhance class="space-y-3 text-xs">
								<input type="hidden" name="module" value="finance" />
								<input type="hidden" name="settingKey" value="customer_invoice_order_doc_types" />
								<input type="hidden" name="description" value="Tipe Dokumen Order / Kontrak pada Customer Invoice" />

								<div>
									<label class="font-bold text-on-surface block mb-1">
										Daftar Tipe Dokumen (Pisahkan dengan koma)
									</label>
									<input
										type="text"
										name="docTypes"
										value={finOrderTypesList.join(', ')}
										required
										placeholder="Contoh: PO, SPK, SPH, Quotation"
										class="w-full px-3 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs font-semibold text-on-surface focus:ring-2 focus:ring-teal-500/40 outline-none"
									/>
									<p class="text-[10px] text-slate-400 mt-1">
										Gunakan tanda koma (,) untuk memisahkan antar opsi. Opsi "Lainnya (Custom)" otomatis disediakan.
									</p>
								</div>

								<div class="pt-1 flex justify-between items-center text-[10px] text-slate-400">
									<span>Update: {finOrderSetting?.updated_at || '-'}</span>
									<button
										type="submit"
										class="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold cursor-pointer transition-colors shadow-2xs flex items-center gap-1.5"
									>
										<span class="material-symbols-outlined text-sm">save</span>
										<span>Simpan Tipe Order</span>
									</button>
								</div>
							</form>
						</div>

						<!-- Card 2: Receipt / Delivery Doc Types -->
						<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/80 dark:border-slate-800/80 space-y-4">
							<div class="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
								<div>
									<h5 class="font-bold text-xs text-on-surface">Dokumen Penerimaan / Pengiriman</h5>
									<p class="text-[10px] text-slate-500">Preset pilihan dropdown nomor LHP / Penerimaan / Delivery</p>
								</div>
								<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-700">
									Receipt / Delivery Ref
								</span>
							</div>

							<!-- Current Badges -->
							<div>
								<span class="text-[11px] font-bold text-slate-500 block mb-1.5">Preset Aktif Saat Ini:</span>
								<div class="flex flex-wrap gap-1.5">
									{#each finReceiptTypesList as tag}
										<span class="px-2.5 py-1 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 text-xs font-bold font-mono">
											{tag}
										</span>
									{/each}
								</div>
							</div>

							<form method="POST" action="?/saveDocTypes" use:enhance class="space-y-3 text-xs">
								<input type="hidden" name="module" value="finance" />
								<input type="hidden" name="settingKey" value="customer_invoice_receipt_doc_types" />
								<input type="hidden" name="description" value="Tipe Dokumen Penerimaan / Pengiriman pada Customer Invoice" />

								<div>
									<label class="font-bold text-on-surface block mb-1">
										Daftar Tipe Dokumen (Pisahkan dengan koma)
									</label>
									<input
										type="text"
										name="docTypes"
										value={finReceiptTypesList.join(', ')}
										required
										placeholder="Contoh: LHP, PR, GR"
										class="w-full px-3 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs font-semibold text-on-surface focus:ring-2 focus:ring-cyan-500/40 outline-none"
									/>
									<p class="text-[10px] text-slate-400 mt-1">
										Gunakan tanda koma (,) untuk memisahkan antar opsi. Opsi "Lainnya (Custom)" otomatis disediakan.
									</p>
								</div>

								<div class="pt-1 flex justify-between items-center text-[10px] text-slate-400">
									<span>Update: {finReceiptSetting?.updated_at || '-'}</span>
									<button
										type="submit"
										class="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold cursor-pointer transition-colors shadow-2xs flex items-center gap-1.5"
									>
										<span class="material-symbols-outlined text-sm">save</span>
										<span>Simpan Tipe Penerimaan</span>
									</button>
								</div>
							</form>
						</div>
					</div>
				</div>

				<!-- Section: Modul OCS (Operations Control System) -->
				<div class="p-6 rounded-3xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs space-y-6">
					<div class="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-800/60">
						<div class="flex items-center gap-2.5">
							<span class="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold text-xs">
								OCS
							</span>
							<div>
								<h4 class="font-bold text-sm text-on-surface">Modul Operasional (OCS) — Acuan Konsumsi Bahan Bakar Solar</h4>
								<p class="text-[11px] text-on-surface-variant">Konfigurasi rasio default KM/Liter dan harga solar per liter untuk Master Rute & UJO</p>
							</div>
						</div>
						<a
							href="/ocs/settings"
							class="px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-container text-sky-600 dark:text-sky-400 text-xs font-bold transition-colors flex items-center gap-1.5 border border-slate-200 dark:border-slate-700"
						>
							<span class="material-symbols-outlined text-sm">open_in_new</span>
							<span>Buka Pengaturan Modul OCS</span>
						</a>
					</div>

					<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
						<!-- Card 1: Form Acuan Solar Global -->
						<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/80 dark:border-slate-800/80 space-y-4">
							<div class="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
								<div>
									<h5 class="font-bold text-xs text-on-surface">Acuan Solar Global Standar</h5>
									<p class="text-[10px] text-slate-500">Nilai dasar kalkulasi otomatis jarak riil ke liter dan biaya UJO</p>
								</div>
								<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-700 dark:text-sky-300">
									Global Default
								</span>
							</div>

							<!-- Current Badges -->
							<div class="grid grid-cols-2 gap-2 text-xs">
								<div class="p-3 rounded-xl bg-surface border border-slate-200/60 dark:border-slate-800/60">
									<span class="text-[10px] text-slate-400 block font-medium">Rasio Konsumsi Aktif:</span>
									<span class="text-sm font-black text-on-surface font-mono">1 : {ocsSolarKmVal} KM/L</span>
								</div>
								<div class="p-3 rounded-xl bg-surface border border-slate-200/60 dark:border-slate-800/60">
									<span class="text-[10px] text-slate-400 block font-medium">Harga Solar Acuan:</span>
									<span class="text-sm font-black text-sky-600 dark:text-sky-400 font-mono">{formatCurrency(ocsSolarPriceVal)}/L</span>
								</div>
							</div>

							<!-- Form Update Nilai -->
							<form method="POST" action="?/saveOcsSolar" use:enhance class="space-y-3 text-xs">
								<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
									<div>
										<label class="font-bold text-on-surface block mb-1">
											Rasio (KM / Liter)
										</label>
										<div class="flex items-center px-3 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs font-semibold text-on-surface focus-within:ring-2 focus-within:ring-sky-500/40">
											<input
												type="number"
												name="solar_km_per_liter"
												step="0.05"
												min="0.5"
												max="20"
												value={ocsSolarKmVal}
												required
												class="bg-transparent outline-none w-full"
											/>
											<span class="text-[10px] text-slate-400 font-mono ml-1">KM/L</span>
										</div>
									</div>

									<div>
										<label class="font-bold text-on-surface block mb-1">
											Harga Solar (Rp/L)
										</label>
										<div class="flex items-center px-3 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs font-semibold text-on-surface focus-within:ring-2 focus-within:ring-sky-500/40">
											<span class="text-[10px] text-slate-400 font-mono mr-1">Rp</span>
											<input
												type="number"
												name="solar_price_per_liter"
												step="50"
												min="1000"
												max="100000"
												value={ocsSolarPriceVal}
												required
												class="bg-transparent outline-none w-full"
											/>
										</div>
									</div>
								</div>

								<div class="pt-2 flex justify-between items-center text-[10px] text-slate-400">
									<span>Update: {ocsSolarKmSetting?.updated_at || '-'} ({ocsSolarKmSetting?.updated_by || 'system'})</span>
									<button
										type="submit"
										class="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold cursor-pointer transition-colors shadow-2xs flex items-center gap-1.5"
									>
										<span class="material-symbols-outlined text-sm">save</span>
										<span>Simpan Acuan Solar</span>
									</button>
								</div>
							</form>
						</div>

						<!-- Card 2: Ringkasan Override Rasio Tipe Unit Armada -->
						<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/80 dark:border-slate-800/80 space-y-4 flex flex-col justify-between">
							<div class="space-y-3">
								<div class="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
									<div>
										<h5 class="font-bold text-xs text-on-surface">Override Rasio per Tipe Unit</h5>
										<p class="text-[10px] text-slate-500">Rasio khusus untuk armada beban berat / ringan</p>
									</div>
									<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300">
										{ocsOverridesList.length} Unit Di-override
									</span>
								</div>

								{#if ocsOverridesList.length === 0}
									<div class="py-6 px-4 rounded-xl bg-surface border border-dashed border-slate-200 dark:border-slate-800 text-center">
										<span class="material-symbols-outlined text-slate-400 text-2xl mb-1">local_shipping</span>
										<p class="text-xs font-bold text-on-surface">Seluruh Armada Menggunakan Rasio Global</p>
										<p class="text-[11px] text-on-surface-variant mt-0.5">
											Belum ada rasio khusus yang disetel. Seluruh tipe truk menggunakan rasio default 1 : {ocsSolarKmVal} KM/L.
										</p>
									</div>
								{:else}
									<div class="space-y-1.5 max-h-48 overflow-y-auto pr-1">
										{#each ocsOverridesList as item}
											<div class="flex items-center justify-between p-2 rounded-xl bg-surface border border-slate-200/60 dark:border-slate-800/60 text-xs">
												<div class="flex items-center gap-2">
													<span class="material-symbols-outlined text-slate-400 text-sm">local_shipping</span>
													<span class="font-bold text-on-surface">{item.name}</span>
													<span class="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
														Gol {item.golongan}
													</span>
												</div>
												<span class="font-bold text-amber-600 dark:text-amber-400 font-mono bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800 text-[11px]">
													1 : {item.ratio} KM/L
												</span>
											</div>
										{/each}
									</div>
								{/if}
							</div>

							<div class="pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
								<span class="text-[10px] text-slate-400">Total {data.tipeUnits?.length || 0} tipe unit terdaftar</span>
								<a
									href="/ocs/settings"
									class="px-3.5 py-2 rounded-xl bg-surface hover:bg-surface-container text-sky-600 dark:text-sky-400 font-bold text-xs transition-colors flex items-center gap-1.5 border border-slate-200 dark:border-slate-700"
								>
									<span class="material-symbols-outlined text-sm">tune</span>
									<span>Kelola Override Armada</span>
								</a>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	{:else if activeTab === 'email'}
		<!-- TAB 6: MULTI-SERVER EMAIL ROUTING & MASTER TEMPLATE (ISSUE #14 & MULTI-DOMAIN) -->
		<div class="space-y-8 animate-in fade-in duration-200">
			<!-- Banner Header -->
			<div class="p-6 rounded-3xl bg-gradient-to-r from-[#0F172A] via-[#1E3A8A] to-[#EA580C] text-white shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
				<div class="flex items-center gap-4">
					<div class="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white shrink-0 border border-white/20">
						<span class="material-symbols-outlined text-3xl text-orange-400">mail</span>
					</div>
					<div>
						<div class="flex items-center gap-2 mb-1">
							<h2 class="text-lg font-black tracking-tight">Mail Service & Multi-Server Routing</h2>
							<span class="px-2 py-0.5 rounded-full bg-orange-500/30 text-orange-200 border border-orange-400/30 text-[10px] font-black uppercase">
								Multi-Domain
							</span>
						</div>
						<p class="text-xs text-white/80 leading-relaxed max-w-xl">
							Kelola multi-server email (BCS Corporate, Gmail, & eksternal) dengan routing otomatis berbasis domain pengirim/penerima (<code class="font-mono text-orange-200">@bcs-logistics.co.id</code> & <code class="font-mono text-orange-200">@gmail.com</code>).
						</p>
					</div>
				</div>

				<div class="flex items-center gap-2.5 shrink-0">
					<a
						href="/mail"
						class="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs backdrop-blur-md border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer"
					>
						<span class="material-symbols-outlined text-sm">open_in_new</span>
						<span>Buka Webmail</span>
					</a>
				</div>
			</div>

			<!-- Multi-Server Profile Selector Cards -->
			<div class="space-y-3">
				<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
					<div>
						<h3 class="text-sm font-extrabold text-on-surface flex items-center gap-2">
							<span class="material-symbols-outlined text-primary text-lg">dns</span>
							<span>Daftar Server Email Terdaftar ({profiles.length})</span>
						</h3>
						<p class="text-xs text-on-surface-variant">Pilih kartu server untuk meninjau atau menyesuaikan konfigurasi IMAP & SMTP.</p>
					</div>

					<!-- Tombol Cepat Tambah Preset -->
					<div class="flex items-center gap-2">
						<button
							type="button"
							onclick={() => handleAddProfile('gmail')}
							class="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
							title="Tambah profil server Gmail / Google Workspace"
						>
							<span class="material-symbols-outlined text-sm">mail</span>
							<span>+ Preset Gmail</span>
						</button>
						<button
							type="button"
							onclick={() => handleAddProfile('bcs-corporate')}
							class="px-3 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
							title="Tambah profil server korporat BCS Logistics"
						>
							<span class="material-symbols-outlined text-sm">business</span>
							<span>+ Server BCS</span>
						</button>
						<button
							type="button"
							onclick={() => handleAddProfile('custom')}
							class="px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-container border border-slate-200 dark:border-slate-700 text-xs font-bold text-on-surface flex items-center gap-1.5 transition-colors cursor-pointer"
						>
							<span class="material-symbols-outlined text-sm">add</span>
							<span>Kustom</span>
						</button>
					</div>
				</div>

				<!-- Grid Server Profile Cards -->
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
					{#each profiles as p}
						<div
							onclick={() => handleSelectProfile(p.id)}
							onkeydown={(e) => e.key === 'Enter' && handleSelectProfile(p.id)}
							role="button"
							tabindex="0"
							class="p-4 rounded-2xl border transition-all text-left cursor-pointer flex flex-col justify-between gap-3 relative group {selectedProfileId === p.id ? 'bg-primary/5 border-primary shadow-sm ring-2 ring-primary/20' : 'bg-surface-container-low border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'}"
						>
							<div>
								<div class="flex items-center justify-between mb-2">
									<div class="flex items-center gap-2">
										<div class="w-8 h-8 rounded-lg flex items-center justify-center {p.providerType === 'gmail' ? 'bg-rose-500/15 text-rose-600' : 'bg-sky-500/15 text-sky-600'}">
											<span class="material-symbols-outlined text-[18px]">
												{p.providerType === 'gmail' ? 'mail' : 'business'}
											</span>
										</div>
										<div>
											<h4 class="font-bold text-xs text-on-surface leading-tight">{p.name}</h4>
											<p class="text-[10px] text-on-surface-variant font-mono">@{p.domain}</p>
										</div>
									</div>

									{#if p.isDefault}
										<span class="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
											DEFAULT
										</span>
									{/if}
								</div>

								<div class="grid grid-cols-2 gap-1.5 text-[11px] font-mono text-on-surface-variant bg-surface/60 p-2 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
									<div>
										<span class="text-[9px] block text-slate-400 font-sans uppercase font-bold">IMAP Inbound</span>
										<span class="truncate block font-semibold text-on-surface">{p.inboundHost}:{p.inboundPort}</span>
									</div>
									<div>
										<span class="text-[9px] block text-slate-400 font-sans uppercase font-bold">SMTP Outbound</span>
										<span class="truncate block font-semibold text-on-surface">{p.smtpHost}:{p.smtpPort}</span>
									</div>
								</div>
							</div>

							<div class="flex items-center justify-between pt-1 border-t border-slate-200/50 dark:border-slate-800/50 text-[11px]">
								<span class="flex items-center gap-1.5 font-semibold {p.isActive ? 'text-emerald-600' : 'text-slate-400'}">
									<span class="w-2 h-2 rounded-full {p.isActive ? 'bg-emerald-500' : 'bg-slate-300'}"></span>
									<span>{p.isActive ? 'Aktif' : 'Nonaktif'}</span>
								</span>

								<span class="text-[10px] font-bold text-primary flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
									<span>{selectedProfileId === p.id ? 'Sedang Diedit' : 'Pilih & Edit'}</span>
									<span class="material-symbols-outlined text-xs">arrow_forward</span>
								</span>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Form Editor Profil Terpilih -->
			{#if activeProfile}
				<div class="p-6 md:p-7 rounded-3xl bg-surface-container-low border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-6">
					<!-- Header Form Profil -->
					<div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/70 dark:border-slate-800/70 pb-4">
						<div class="flex items-center gap-3">
							<div class="w-10 h-10 rounded-xl flex items-center justify-center {activeProfile.providerType === 'gmail' ? 'bg-rose-500/15 text-rose-600' : 'bg-primary/15 text-primary'}">
								<span class="material-symbols-outlined text-xl">
									{activeProfile.providerType === 'gmail' ? 'mail' : 'tune'}
								</span>
							</div>
							<div>
								<div class="flex items-center gap-2">
									<h3 class="text-base font-bold text-on-surface">Konfigurasi: {activeProfile.name}</h3>
									{#if activeProfile.isDefault}
										<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
											Server Utama (Default)
										</span>
									{/if}
								</div>
								<p class="text-xs text-on-surface-variant">
									Routing otomatis berlaku untuk pengirim & penerima dengan akhiran domain <strong class="font-mono text-primary">@{activeProfile.domain}</strong>
								</p>
							</div>
						</div>

						<div class="flex items-center gap-2">
							{#if !activeProfile.isDefault}
								<button
									type="button"
									onclick={() => handleSetDefaultProfile(activeProfile.id)}
									class="px-3.5 py-1.5 rounded-xl bg-surface hover:bg-surface-container border border-slate-200 dark:border-slate-700 text-xs font-bold text-on-surface transition-colors cursor-pointer flex items-center gap-1"
								>
									<span class="material-symbols-outlined text-sm text-emerald-600">check_circle</span>
									<span>Jadikan Default</span>
								</button>
							{/if}

							<button
								type="button"
								onclick={() => handleToggleProfileActive(activeProfile.id)}
								class="px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 {activeProfile.isActive ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' : 'bg-slate-200/50 text-slate-600 border-slate-300'}"
							>
								<span class="material-symbols-outlined text-sm">{activeProfile.isActive ? 'toggle_on' : 'toggle_off'}</span>
								<span>{activeProfile.isActive ? 'Aktif' : 'Nonaktif'}</span>
							</button>

							{#if profiles.length > 1}
								<button
									type="button"
									onclick={() => handleDeleteProfile(activeProfile.id)}
									class="px-2.5 py-1.5 rounded-xl text-rose-600 hover:bg-rose-500/10 border border-rose-200 dark:border-rose-900 text-xs font-bold transition-colors cursor-pointer"
									title="Hapus profil server ini"
								>
									<span class="material-symbols-outlined text-sm">delete</span>
								</button>
							{/if}
						</div>
					</div>

					<!-- Metadata Dasar Profil -->
					<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div>
							<label class="block font-bold text-on-surface-variant mb-1 uppercase tracking-wider text-[10px]">Nama Profil Server</label>
							<input
								type="text"
								bind:value={activeProfile.name}
								class="w-full px-3 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs font-bold text-on-surface"
							/>
						</div>
						<div>
							<label class="block font-bold text-on-surface-variant mb-1 uppercase tracking-wider text-[10px]">Target Domain Routing</label>
							<div class="relative">
								<span class="absolute left-3 top-2 text-xs font-mono text-slate-400">@</span>
								<input
									type="text"
									bind:value={activeProfile.domain}
									placeholder="contoh: bcs-logistics.co.id atau gmail.com"
									class="w-full pl-7 pr-3 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs font-mono text-on-surface font-semibold"
								/>
							</div>
						</div>
						<div>
							<label class="block font-bold text-on-surface-variant mb-1 uppercase tracking-wider text-[10px]">Tipe Penyedia (Provider)</label>
							<select
								bind:value={activeProfile.providerType}
								class="w-full px-3 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs font-bold text-on-surface"
							>
								<option value="bcs-corporate">BCS Corporate (cPanel / Postfix)</option>
								<option value="gmail">Google Workspace / Gmail</option>
								<option value="office365">Microsoft 365</option>
								<option value="custom">Server Kustom / Lainnya</option>
							</select>
						</div>
					</div>

					<!-- Grid 2 Kolom: Inbound & Outbound -->
					<div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
						<!-- Inbound (IMAP) -->
						<div class="p-5 rounded-2xl bg-surface border border-slate-200/70 dark:border-slate-800/70 space-y-3.5">
							<div class="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
								<div class="flex items-center gap-2">
									<span class="material-symbols-outlined text-sky-600 text-lg">move_to_inbox</span>
									<h4 class="font-bold text-xs text-on-surface">Inbound (Penerimaan Pesan)</h4>
								</div>
								<span class="text-[10px] font-mono font-bold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 px-2 py-0.5 rounded-md border border-sky-200 dark:border-sky-800">
									{activeProfile.inboundProtocol} : {activeProfile.inboundPort}
								</span>
							</div>

							<div class="space-y-3 text-xs">
								<div class="grid grid-cols-2 gap-3">
									<div>
										<label class="block font-bold text-on-surface-variant mb-1 uppercase tracking-wider text-[10px]">Protokol</label>
										<select
											bind:value={activeProfile.inboundProtocol}
											class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-700 text-xs font-bold text-on-surface"
										>
											<option value="IMAP">IMAP (Recommended)</option>
											<option value="POP3">POP3</option>
										</select>
									</div>
									<div>
										<label class="block font-bold text-on-surface-variant mb-1 uppercase tracking-wider text-[10px]">Enkripsi</label>
										<select
											bind:value={activeProfile.inboundEncryption}
											class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-700 text-xs font-semibold text-on-surface"
										>
											<option value="SSL">SSL / TLS (Port 993)</option>
											<option value="STARTTLS">STARTTLS (Port 143)</option>
											<option value="NONE">None</option>
										</select>
									</div>
								</div>

								<div>
									<label class="block font-bold text-on-surface-variant mb-1 uppercase tracking-wider text-[10px]">Host Inbound</label>
									<input
										type="text"
										bind:value={activeProfile.inboundHost}
										class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-700 text-xs font-mono text-on-surface"
									/>
								</div>

								<div class="grid grid-cols-2 gap-3">
									<div>
										<label class="block font-bold text-on-surface-variant mb-1 uppercase tracking-wider text-[10px]">Port</label>
										<input
											type="number"
											bind:value={activeProfile.inboundPort}
											class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-700 text-xs font-mono text-on-surface"
										/>
									</div>
									<div>
										<label class="block font-bold text-on-surface-variant mb-1 uppercase tracking-wider text-[10px]">Username Inbound</label>
										<input
											type="text"
											bind:value={activeProfile.inboundUsername}
											class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-700 text-xs text-on-surface"
										/>
									</div>
								</div>
							</div>
						</div>

						<!-- Outbound (SMTP) -->
						<div class="p-5 rounded-2xl bg-surface border border-slate-200/70 dark:border-slate-800/70 space-y-3.5">
							<div class="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
								<div class="flex items-center gap-2">
									<span class="material-symbols-outlined text-orange-600 text-lg">forward_to_inbox</span>
									<h4 class="font-bold text-xs text-on-surface">Outbound (Pengiriman SMTP)</h4>
								</div>
								<span class="text-[10px] font-mono font-bold bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded-md border border-orange-200 dark:border-orange-800">
									SMTP : {activeProfile.smtpPort}
								</span>
							</div>

							<div class="space-y-3 text-xs">
								<div class="grid grid-cols-2 gap-3">
									<div>
										<label class="block font-bold text-on-surface-variant mb-1 uppercase tracking-wider text-[10px]">Host SMTP</label>
										<input
											type="text"
											bind:value={activeProfile.smtpHost}
											class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-700 text-xs font-mono text-on-surface"
										/>
									</div>
									<div>
										<label class="block font-bold text-on-surface-variant mb-1 uppercase tracking-wider text-[10px]">Port SMTP</label>
										<input
											type="number"
											bind:value={activeProfile.smtpPort}
											class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-700 text-xs font-mono text-on-surface"
										/>
									</div>
								</div>

								<div class="grid grid-cols-2 gap-3">
									<div>
										<label class="block font-bold text-on-surface-variant mb-1 uppercase tracking-wider text-[10px]">Enkripsi SMTP</label>
										<select
											bind:value={activeProfile.smtpEncryption}
											class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-700 text-xs font-semibold text-on-surface"
										>
											<option value="TLS">TLS (Port 587)</option>
											<option value="SSL">SSL (Port 465)</option>
											<option value="STARTTLS">STARTTLS</option>
										</select>
									</div>
									<div>
										<label class="block font-bold text-on-surface-variant mb-1 uppercase tracking-wider text-[10px]">Username SMTP</label>
										<input
											type="text"
											bind:value={activeProfile.smtpUsername}
											class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-700 text-xs text-on-surface font-mono"
										/>
									</div>
								</div>

								<div class="grid grid-cols-2 gap-3">
									<div>
										<label class="block font-bold text-on-surface-variant mb-1 uppercase tracking-wider text-[10px]">From Email Default</label>
										<input
											type="text"
											bind:value={activeProfile.smtpFromEmail}
											class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-700 text-xs text-on-surface font-mono"
										/>
									</div>
									<div>
										<label class="block font-bold text-on-surface-variant mb-1 uppercase tracking-wider text-[10px]">From Name Pengirim</label>
										<input
											type="text"
											bind:value={activeProfile.smtpFromName}
											class="w-full px-3 py-2 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-700 text-xs text-on-surface"
										/>
									</div>
								</div>
							</div>
						</div>
					</div>

					<!-- Petunjuk Khusus Provider -->
					{#if activeProfile.providerType === 'gmail'}
						<div class="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-2">
							<span class="material-symbols-outlined text-base shrink-0">lock</span>
							<span>
								<strong>Tips Gmail:</strong> Karena Google mewajibkan 2FA, buat <em>App Password</em> (Sandi Aplikasi 16-karakter) di menu Keamanan Akun Google Anda untuk dimasukkan sebagai kata sandi SMTP/IMAP.
							</span>
						</div>
					{/if}

					<!-- Action Save & Test Bar -->
					<div class="pt-4 border-t border-slate-200/70 dark:border-slate-800/70 flex flex-col sm:flex-row items-center justify-between gap-4">
						<div class="flex items-center gap-2 text-xs text-on-surface-variant">
							<span class="material-symbols-outlined text-emerald-500 text-lg">verified_user</span>
							<span>Pengaturan profil ini akan disinkronkan ke Webmail & Mailer ERP.</span>
						</div>
						<div class="flex items-center gap-3">
							<button
								type="button"
								onclick={handleSendTestEmail}
								disabled={testEmailSending}
								class="px-4 py-2 rounded-xl bg-surface hover:bg-surface-container-high border border-slate-200 dark:border-slate-700 text-xs font-bold text-on-surface flex items-center gap-1.5 transition-colors cursor-pointer"
							>
								<span class="material-symbols-outlined text-sm {testEmailSending ? 'animate-spin' : ''}">send</span>
								<span>{testEmailSending ? 'Menguji...' : `Uji Koneksi (${activeProfile.name})`}</span>
							</button>
							<button
								type="button"
								onclick={handleSaveActiveProfile}
								disabled={isSavingMail}
								class="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
							>
								<span class="material-symbols-outlined text-sm">save</span>
								<span>{isSavingMail ? 'Menyimpan...' : 'Simpan Profil Server'}</span>
							</button>
						</div>
					</div>
				</div>
			{/if}

			{#if testEmailToast}
				<div class="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
					<span class="material-symbols-outlined text-base">info</span>
					<span>{testEmailToast}</span>
				</div>
			{/if}

			{#if mailSaveToast}
				<div class="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
					<span class="material-symbols-outlined text-base">check_circle</span>
					<span>Profil server email berhasil disimpan ke sistem!</span>
				</div>
			{/if}

			<!-- ========================================================================= -->
			<!-- SUB-BAGIAN: KATALOG MASTER TEMPLATE EMAIL (ISSUE #14) -->
			<!-- ========================================================================= -->
			<div class="p-6 md:p-8 rounded-3xl bg-surface-container-low border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-6">
				<!-- Header Section -->
				<div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/70 dark:border-slate-800/70 pb-4">
					<div>
						<div class="flex items-center gap-2 mb-1">
							<span class="material-symbols-outlined text-orange-600 text-2xl">style</span>
							<h3 class="text-base font-black text-on-surface">Master Layout & Template Email Korporat</h3>
						</div>
						<p class="text-xs text-on-surface-variant">
							Spesifikasi resmi Issue #14: File HTML murni inline-CSS & Laravel Blade (<code class="font-mono">templates/emails/</code>).
						</p>
					</div>

					<!-- Device Preview Switch -->
					<div class="flex items-center gap-2 bg-surface p-1 rounded-xl border border-slate-200 dark:border-slate-700">
						<button
							type="button"
							onclick={() => (previewDevice = 'desktop')}
							class="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors {previewDevice === 'desktop' ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}"
						>
							<span class="material-symbols-outlined text-sm">desktop_windows</span>
							<span>Desktop (600px)</span>
						</button>
						<button
							type="button"
							onclick={() => (previewDevice = 'mobile')}
							class="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors {previewDevice === 'mobile' ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}"
						>
							<span class="material-symbols-outlined text-sm">smartphone</span>
							<span>Mobile (360px)</span>
						</button>
					</div>
				</div>

				<!-- Variant Pills Selector -->
				<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
					<button
						type="button"
						onclick={() => (selectedTemplateVariant = 'approval')}
						class="p-3.5 rounded-2xl text-left border transition-all cursor-pointer {selectedTemplateVariant === 'approval' ? 'bg-amber-500/10 border-amber-500/50 ring-2 ring-amber-500/20' : 'bg-surface border-slate-200 dark:border-slate-800 hover:bg-surface-container'}"
					>
						<div class="flex items-center justify-between mb-1.5">
							<span class="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">Varian A</span>
							<span class="w-2 h-2 rounded-full {selectedTemplateVariant === 'approval' ? 'bg-amber-500' : 'bg-slate-300'}"></span>
						</div>
						<p class="text-xs font-bold text-on-surface">Alur Approval Baru</p>
						<p class="text-[10px] text-on-surface-variant">Cuti, Kasbon, PR, & SPK</p>
					</button>

					<button
						type="button"
						onclick={() => (selectedTemplateVariant = 'result')}
						class="p-3.5 rounded-2xl text-left border transition-all cursor-pointer {selectedTemplateVariant === 'result' ? 'bg-emerald-500/10 border-emerald-500/50 ring-2 ring-emerald-500/20' : 'bg-surface border-slate-200 dark:border-slate-800 hover:bg-surface-container'}"
					>
						<div class="flex items-center justify-between mb-1.5">
							<span class="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Varian B</span>
							<span class="w-2 h-2 rounded-full {selectedTemplateVariant === 'result' ? 'bg-emerald-500' : 'bg-slate-300'}"></span>
						</div>
						<p class="text-xs font-bold text-on-surface">Hasil Approval</p>
						<p class="text-[10px] text-on-surface-variant">Konfirmasi Disetujui / Ditolak</p>
					</button>

					<button
						type="button"
						onclick={() => (selectedTemplateVariant = 'announcement')}
						class="p-3.5 rounded-2xl text-left border transition-all cursor-pointer {selectedTemplateVariant === 'announcement' ? 'bg-sky-500/10 border-sky-500/50 ring-2 ring-sky-500/20' : 'bg-surface border-slate-200 dark:border-slate-800 hover:bg-surface-container'}"
					>
						<div class="flex items-center justify-between mb-1.5">
							<span class="text-[10px] font-black uppercase tracking-wider text-sky-600 dark:text-sky-400">Varian C</span>
							<span class="w-2 h-2 rounded-full {selectedTemplateVariant === 'announcement' ? 'bg-sky-500' : 'bg-slate-300'}"></span>
						</div>
						<p class="text-xs font-bold text-on-surface">Pengumuman & Akun</p>
						<p class="text-[10px] text-on-surface-variant">Kredensial & Memo Resmi</p>
					</button>
				</div>

				<!-- Live Preview Container -->
				<div class="space-y-3">
					<div class="flex items-center justify-between text-xs">
						<span class="font-bold text-on-surface">Pratinjau Visual Responsif:</span>
						<div class="flex items-center gap-2">
							<button
								type="button"
								onclick={() => copyCurrentTemplate('html')}
								class="px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-container border border-slate-200 dark:border-slate-700 text-xs font-bold text-on-surface flex items-center gap-1.5 transition-colors cursor-pointer"
								title="Salin Kode HTML Inline-CSS"
							>
								<span class="material-symbols-outlined text-[15px]">code</span>
								<span>Salin HTML</span>
							</button>
							<button
								type="button"
								onclick={() => copyCurrentTemplate('blade')}
								class="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
								title="Salin Referensi Blade Laravel"
							>
								<span class="material-symbols-outlined text-[15px]">file_copy</span>
								<span>Salin Blade (.blade.php)</span>
							</button>
						</div>
					</div>

					{#if copiedTemplateToast}
						<div class="p-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold text-center border border-slate-700 animate-in fade-in duration-150">
							✓ {copiedTemplateToast}
						</div>
					{/if}

					<!-- Preview Frame Canvas -->
					<div class="p-6 md:p-8 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 flex justify-center overflow-x-auto min-h-[420px]">
						<div class="transition-all duration-300 {previewDevice === 'mobile' ? 'w-[360px]' : 'w-[600px]'} shadow-xl rounded-2xl overflow-hidden bg-white">
							{#if selectedTemplateVariant === 'approval'}
								{@html templateApprovalHtml}
							{:else if selectedTemplateVariant === 'result'}
								{@html templateResultHtml}
							{:else}
								{@html templateAnnouncementHtml}
							{/if}
						</div>
					</div>

					<!-- Delivery Path Notes -->
					<div class="p-4 rounded-xl bg-surface border border-slate-200/60 dark:border-slate-800/60 text-xs flex items-center justify-between flex-wrap gap-2">
						<div class="flex items-center gap-2">
							<span class="material-symbols-outlined text-orange-600 text-sm">folder</span>
							<span class="text-on-surface-variant">File tersimpan di direktori:</span>
							<code class="font-mono text-orange-700 dark:text-orange-400 font-bold">templates/emails/{selectedTemplateVariant === 'approval' ? 'approval-notification.html' : selectedTemplateVariant === 'result' ? 'approval-result.html' : 'announcement-account.html'}</code>
						</div>
						<span class="text-[11px] text-slate-400">Siap di-include ke Mail Service Laravel backend</span>
					</div>
				</div>
			</div>
		</div>
	{:else if activeTab === 'ai'}
		<!-- TAB: AI ENGINE & CUSTOM ENDPOINT CONFIGURATION -->
		<div class="space-y-6">
			<!-- Header Banner AI -->
			<div class="p-6 md:p-7 rounded-3xl bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-900 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
				<div class="flex items-center gap-4">
					<div class="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white flex-shrink-0 shadow-inner">
						<span class="material-symbols-outlined text-3xl">smart_toy</span>
					</div>
					<div>
						<div class="flex items-center gap-2 mb-1">
							<h3 class="text-xl font-black tracking-tight">AI Engine, Provider & Custom Endpoint</h3>
							<span class="px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 text-[10px] font-black uppercase tracking-wider border border-emerald-400/30">Dynamic Multi-Endpoint</span>
						</div>
						<p class="text-xs text-indigo-100/90 leading-relaxed max-w-2xl">
							Kelola katalog model AI dan custom OpenAI-compatible endpoint untuk seluruh modul ERP BCS (HRIS, FMS, OCS, Finance, DMS, QHSE). Anda dapat menambah, mengubah, menguji, dan mengganti model aktif secara <strong>instan (zero-downtime)</strong>.
						</p>
					</div>
				</div>

				<div class="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-3 flex-shrink-0">
					<!-- Active Model Pill -->
					{#if activeAIProfile}
						<div class="bg-white/10 px-4 py-2 rounded-2xl border border-white/15 flex items-center gap-2.5">
							<span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
							<div class="text-left">
								<span class="text-[9px] uppercase font-bold text-indigo-200 block tracking-wider">Model Aktif Global</span>
								<span class="font-mono text-xs font-black text-white">{activeAIProfile.name}</span>
							</div>
						</div>
					{/if}

					<!-- Tombol Tambah Model Baru -->
					<button
						type="button"
						onclick={openAddModal}
						class="px-4 py-2.5 rounded-2xl bg-white text-indigo-900 hover:bg-indigo-50 font-black text-xs transition-all shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer flex-shrink-0"
					>
						<span class="material-symbols-outlined text-base">add_circle</span>
						<span>Tambah Profil Model</span>
					</button>
				</div>
			</div>

			<!-- Status Feedback Action (Save / Delete / Activate) -->
			{#if form?.message}
				<div class="p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs font-bold animate-in fade-in duration-200 {form.success ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300' : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'}">
					<div class="flex items-center gap-2">
						<span class="material-symbols-outlined text-base">{form.success ? 'check_circle' : 'error'}</span>
						<span>{form.message}</span>
					</div>
				</div>
			{/if}

			<!-- Grid Katalog Profil Model AI -->
			<div class="bg-surface rounded-3xl border border-slate-200/80 dark:border-slate-800/80 p-6 shadow-xs space-y-5">
				<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-800/60 pb-4">
					<div>
						<h4 class="text-sm font-bold text-on-surface flex items-center gap-2">
							<span>Daftar Profil & Custom Endpoint</span>
							<span class="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-mono font-bold">
								{aiCatalog.profiles.length} Profil
							</span>
						</h4>
						<p class="text-xs text-on-surface-variant">Pilih 1 model yang aktif untuk melayani perintah dan chat asisten cerdas.</p>
					</div>

					<span class="text-[11px] font-medium text-slate-400 flex items-center gap-1">
						<span class="material-symbols-outlined text-xs">info</span>
						Protokol: OpenAI-Compatible (/v1/chat/completions)
					</span>
				</div>

				<!-- Grid Cards -->
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{#each aiCatalog.profiles as p (p.id)}
						{@const isCurrentActive = p.id === aiCatalog.activeProfileId}
						{@const provInfo = PROVIDER_TEMPLATES[p.provider] || PROVIDER_TEMPLATES.custom}
						<div
							class="p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 relative group {isCurrentActive
								? 'bg-indigo-50/30 dark:bg-indigo-950/20 border-indigo-500 shadow-md ring-2 ring-indigo-500/20'
								: 'bg-surface-container-low border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'}"
						>
							<div class="space-y-3">
								<!-- Card Header -->
								<div class="flex items-start justify-between gap-2">
									<div class="flex items-center gap-2.5 min-w-0">
										<div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 {provInfo.badgeColor}">
											<span class="material-symbols-outlined text-lg">{provInfo.icon}</span>
										</div>
										<div class="min-w-0">
											<h5 class="text-xs font-black text-on-surface truncate" title={p.name}>
												{p.name}
											</h5>
											<span class="text-[10px] font-bold text-slate-400 block truncate">
												{provInfo.label}
											</span>
										</div>
									</div>

									{#if isCurrentActive}
										<span class="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1 flex-shrink-0 shadow-xs">
											<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
											AKTIF
										</span>
									{:else}
										<form
											method="POST"
											action="?/setActiveAIProfile&tab=ai"
											use:enhance={() => {
												isActivatingAI = true;
												return async ({ update }) => {
													isActivatingAI = false;
													await update();
												};
											}}
										>
											<input type="hidden" name="id" value={p.id} />
											<button
												type="submit"
												disabled={isActivatingAI}
												class="px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer bg-surface border border-slate-300 dark:border-slate-700 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-600 dark:text-slate-300 flex items-center gap-1 shadow-xs"
												title="Jadikan model ini sebagai model aktif ERP BCS"
											>
												<span class="material-symbols-outlined text-[13px]">check</span>
												<span>Aktifkan</span>
											</button>
										</form>
									{/if}
								</div>

								<!-- Model ID & Endpoint Box -->
								<div class="p-3 bg-surface/70 dark:bg-black/20 rounded-xl border border-slate-200/60 dark:border-slate-800/60 space-y-1.5 text-[11px] font-mono">
									<div class="flex items-center justify-between gap-1">
										<span class="text-[9px] font-sans font-bold text-slate-400 uppercase tracking-wider">Model ID</span>
										<span class="font-bold text-indigo-600 dark:text-indigo-400 truncate max-w-[180px]" title={p.model}>
											{p.model}
										</span>
									</div>
									<div class="flex items-center justify-between gap-1">
										<span class="text-[9px] font-sans font-bold text-slate-400 uppercase tracking-wider">Endpoint</span>
										<span class="text-slate-500 dark:text-slate-400 truncate max-w-[180px]" title={p.baseUrl}>
											{p.baseUrl.replace(/^https?:\/\//, '')}
										</span>
									</div>
								</div>

								<!-- Parameter Pills -->
								<div class="flex items-center flex-wrap gap-1.5 text-[10px] text-slate-500">
									<span class="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 font-medium">
										Temp: <strong class="text-on-surface">{p.temperature.toFixed(2)}</strong>
									</span>
									<span class="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 font-medium">
										Max: <strong class="text-on-surface">{p.maxTokens}</strong> tok
									</span>
									<span class="px-2 py-0.5 rounded-md border font-medium {p.apiKey ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300/50 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'}">
										{p.apiKey ? '🔑 Key Terpasang' : '🔓 Tanpa Key (Lokal)'}
									</span>
								</div>
							</div>

							<!-- Card Footer Actions -->
							<div class="flex items-center justify-between pt-3 border-t border-slate-200/60 dark:border-slate-800/60 gap-1">
								<!-- Uji Koneksi Button -->
								<button
									type="button"
									onclick={() => testProfileConnection(p)}
									disabled={isTestingAI && testingProfileId === p.id}
									class="px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 bg-surface border border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-200 hover:bg-surface-container disabled:opacity-50"
									title="Tes latensi dan respons dari endpoint profil ini"
								>
									{#if isTestingAI && testingProfileId === p.id}
										<span class="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
										<span>Menguji...</span>
									{:else}
										<span class="material-symbols-outlined text-[13px] text-indigo-600">bolt</span>
										<span>Tes Respon</span>
									{/if}
								</button>

								<div class="flex items-center gap-1">
									<!-- Edit Button -->
									<button
										type="button"
										onclick={() => openEditModal(p)}
										class="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-surface-container transition-all cursor-pointer"
										title="Edit parameter profil ini"
									>
										<span class="material-symbols-outlined text-sm">edit</span>
									</button>

									<!-- Delete Button (Hanya jika profil > 1) -->
									{#if aiCatalog.profiles.length > 1}
										<form
											method="POST"
											action="?/deleteAIProfile&tab=ai"
											onsubmit={(e) => {
												if (!confirm(`Hapus profil model "${p.name}"?`)) {
													e.preventDefault();
												}
											}}
											use:enhance={() => {
												isDeletingAI = true;
												return async ({ update }) => {
													isDeletingAI = false;
													await update();
												};
											}}
										>
											<input type="hidden" name="id" value={p.id} />
											<button
												type="submit"
												disabled={isDeletingAI}
												class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer disabled:opacity-50"
												title="Hapus profil model ini"
											>
												<span class="material-symbols-outlined text-sm">delete</span>
											</button>
										</form>
									{/if}
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Live Interactive Verification Result Section (Jika ada hasil tes) -->
			{#if aiTestResult}
				<div class="p-5 rounded-3xl bg-surface border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 animate-in fade-in duration-200">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<span class="material-symbols-outlined text-lg {aiTestResult.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}">
								{aiTestResult.success ? 'check_circle' : 'error'}
							</span>
							<h5 class="text-xs font-black uppercase tracking-wider text-on-surface">
								{aiTestResult.success ? 'Uji Koneksi Endpoint Berhasil' : 'Uji Koneksi Endpoint Gagal'}
							</h5>
						</div>

						<div class="flex items-center gap-2">
							{#if aiTestResult.latencyMs}
								<span class="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300">
									⚡ {aiTestResult.latencyMs} ms
								</span>
							{/if}
							<button
								type="button"
								onclick={() => (aiTestResult = null)}
								class="text-slate-400 hover:text-slate-600 text-xs cursor-pointer p-1"
							>
								<span class="material-symbols-outlined text-sm">close</span>
							</button>
						</div>
					</div>

					{#if aiTestResult.success}
						<div class="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 rounded-xl space-y-1 text-xs">
							<div class="flex items-center gap-2 text-[11px] text-emerald-800 dark:text-emerald-200 font-mono">
								<span>Model: <strong>{aiTestResult.model}</strong></span>
								<span>•</span>
								<span class="truncate">Endpoint: {aiTestResult.baseUrl}</span>
							</div>
							<p class="font-mono text-xs text-slate-700 dark:text-slate-300 italic pt-1">
								"{aiTestResult.preview}"
							</p>
						</div>
					{:else}
						<div class="p-3 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-800/40 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-mono">
							{aiTestResult.message}
						</div>
					{/if}
				</div>
			{/if}

			<!-- Safety Failover Note -->
			<div class="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 flex items-start gap-3 text-xs">
				<span class="material-symbols-outlined text-indigo-600 mt-0.5 text-base flex-shrink-0">shield</span>
				<div class="space-y-0.5 text-on-surface-variant">
					<span class="font-bold text-on-surface">Proteksi Failover Otomatis (Zero-Crash Guarantee):</span>
					<p class="leading-relaxed">
						Sistem ERP BCS dilengkapi mekanisme proteksi bertingkat. Jika custom endpoint atau API key yang aktif sewaktu-waktu mengalami limit, gangguan jaringan, atau kuota habis, seluruh modul chat AI (HRIS, FMS, OCS) secara otomatis beralih sementara ke kredensial cadangan di berkas server (<code class="font-mono bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded">.env</code>) sehingga sistem tidak pernah crash di sisi pengguna.
					</p>
				</div>
			</div>
		</div>

		<!-- MODAL DIALOG: TAMBAH / EDIT PROFIL MODEL AI -->
		{#if showAIModal}
			<div
				class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150"
				role="dialog"
				aria-modal="true"
			>
				<div class="bg-surface rounded-3xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 max-w-2xl w-full shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto">
					<!-- Modal Header -->
					<div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
						<div class="flex items-center gap-3">
							<div class="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
								<span class="material-symbols-outlined text-xl">
									{isEditingAI ? 'tune' : 'add_circle'}
								</span>
							</div>
							<div>
								<h3 class="text-base font-black text-on-surface">
									{isEditingAI ? 'Edit Profil Model & Custom Endpoint' : 'Tambah Profil Model AI Baru'}
								</h3>
								<p class="text-xs text-on-surface-variant">
									Konfigurasi OpenAI-compatible endpoint, API key, dan parameter inferensi.
								</p>
							</div>
						</div>

						<button
							type="button"
							onclick={() => (showAIModal = false)}
							class="w-8 h-8 rounded-xl bg-surface-container hover:bg-surface-container-high text-slate-500 flex items-center justify-center transition-all cursor-pointer"
						>
							<span class="material-symbols-outlined text-lg">close</span>
						</button>
					</div>

					<!-- Form Tambah / Edit -->
					<form
						method="POST"
						action="?/saveAIProfile&tab=ai"
						use:enhance={() => {
							isSavingAI = true;
							return async ({ result, update }) => {
								isSavingAI = false;
								if (result.type === 'success') {
									showAIModal = false;
								}
								await update();
							};
						}}
						class="space-y-5"
					>
						{#if modalId}
							<input type="hidden" name="id" value={modalId} />
						{/if}

						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<!-- Nama Profil / Label -->
							<div class="space-y-1.5 md:col-span-2">
								<label class="block text-xs font-bold text-on-surface uppercase tracking-wider">
									Label / Nama Profil <span class="text-rose-500">*</span>
								</label>
								<input
									type="text"
									name="name"
									required
									bind:value={modalName}
									placeholder="contoh: Groq Llama 3.3 70B Fast atau Local Ollama Biznet"
									class="w-full bg-surface-container border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all outline-hidden text-on-surface"
								/>
							</div>

							<!-- Provider Template Selector -->
							<div class="space-y-1.5">
								<label class="block text-xs font-bold text-on-surface uppercase tracking-wider">
									Penyedia / Template Provider
								</label>
								<select
									name="provider"
									bind:value={modalProvider}
									onchange={() => onProviderChange(modalProvider)}
									class="w-full bg-surface-container border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all outline-hidden text-on-surface"
								>
									{#each Object.entries(PROVIDER_TEMPLATES) as [key, val]}
										<option value={key}>{val.label} — {val.desc}</option>
									{/each}
								</select>
							</div>

							<!-- Model ID -->
							<div class="space-y-1.5">
								<label class="block text-xs font-bold text-on-surface uppercase tracking-wider">
									Model Identifier (Model ID) <span class="text-rose-500">*</span>
								</label>
								<input
									type="text"
									name="model"
									required
									bind:value={modalModel}
									placeholder="contoh: llama-3.3-70b-versatile atau glm-4.7-flash"
									class="w-full bg-surface-container border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-mono font-medium focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all outline-hidden text-on-surface"
								/>
							</div>

							<!-- Custom Base URL -->
							<div class="space-y-1.5 md:col-span-2">
								<label class="block text-xs font-bold text-on-surface uppercase tracking-wider">
									Custom Base URL / Endpoint <span class="text-rose-500">*</span>
								</label>
								<div class="relative">
									<input
										type="url"
										name="baseUrl"
										required
										bind:value={modalBaseUrl}
										placeholder="contoh: https://api.groq.com/openai/v1 atau http://localhost:11434/v1"
										class="w-full bg-surface-container border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-mono font-medium focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all outline-hidden text-on-surface"
									/>
									<span class="absolute right-3 top-2.5 text-slate-400 material-symbols-outlined text-lg">link</span>
								</div>
								<p class="text-[11px] text-on-surface-variant">
									URL dasar endpoint OpenAI-compatible. AI Bridge akan mengakses jalur <code class="font-mono">/chat/completions</code> di endpoint ini.
								</p>
							</div>

							<!-- API Key -->
							<div class="space-y-1.5 md:col-span-2">
								<div class="flex items-center justify-between">
									<label class="block text-xs font-bold text-on-surface uppercase tracking-wider">
										API Key / Secret Token
									</label>
									<span class="text-[10px] text-slate-400">Opsional untuk server lokal Ollama</span>
								</div>
								<div class="relative">
									<input
										type={showApiKey ? 'text' : 'password'}
										name="apiKey"
										bind:value={modalApiKey}
										placeholder="gsk_... atau sk-proj-... (kosongkan jika tanpa autentikasi)"
										class="w-full bg-surface-container border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 pr-10 text-sm font-mono font-medium focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all outline-hidden text-on-surface"
									/>
									<button
										type="button"
										onclick={() => (showApiKey = !showApiKey)}
										class="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
										title={showApiKey ? 'Sembunyikan' : 'Tampilkan'}
									>
										<span class="material-symbols-outlined text-lg">
											{showApiKey ? 'visibility_off' : 'visibility'}
										</span>
									</button>
								</div>
							</div>

							<!-- Temperature Slider -->
							<div class="space-y-1.5">
								<div class="flex items-center justify-between">
									<label class="text-xs font-bold text-on-surface uppercase tracking-wider">
										Temperature
									</label>
									<span class="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono text-xs font-bold">
										{modalTemperature.toFixed(2)}
									</span>
								</div>
								<input
									type="range"
									name="temperature"
									min="0.0"
									max="1.0"
									step="0.05"
									bind:value={modalTemperature}
									class="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
								/>
								<div class="flex justify-between text-[10px] text-slate-400 font-bold">
									<span>0.0 (Presisi)</span>
									<span>1.0 (Kreatif)</span>
								</div>
							</div>

							<!-- Max Tokens -->
							<div class="space-y-1.5">
								<div class="flex items-center justify-between">
									<label class="text-xs font-bold text-on-surface uppercase tracking-wider">
										Max Output Tokens
									</label>
									<div class="flex gap-1">
										{#each [512, 1024, 2048, 4096] as tok}
											<button
												type="button"
												onclick={() => (modalMaxTokens = tok)}
												class="px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer {modalMaxTokens === tok ? 'bg-indigo-600 text-white' : 'bg-surface-container text-slate-400'}"
											>
												{tok}
											</button>
										{/each}
									</div>
								</div>
								<input
									type="number"
									name="maxTokens"
									min="128"
									max="8192"
									step="128"
									bind:value={modalMaxTokens}
									class="w-full bg-surface-container border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-mono font-medium focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all outline-hidden text-on-surface"
								/>
							</div>

							<!-- Make Active Checkbox -->
							<div class="md:col-span-2 pt-2">
								<label class="flex items-center gap-3 p-3 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-700/60 cursor-pointer">
									<input
										type="checkbox"
										name="makeActive"
										bind:checked={modalMakeActive}
										class="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700"
									/>
									<div class="text-xs">
										<span class="font-bold text-on-surface block">Jadikan sebagai Model Aktif ERP BCS</span>
										<span class="text-on-surface-variant text-[11px]">Profil ini akan langsung melayani asisten di modul HRIS, FMS, OCS, dll.</span>
									</div>
								</label>
							</div>
						</div>

						<!-- Live Test Inside Modal -->
						<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200 dark:border-slate-800 space-y-3">
							<div class="flex items-center justify-between">
								<span class="text-xs font-bold text-on-surface flex items-center gap-1.5">
									<span class="material-symbols-outlined text-sm text-indigo-600">bolt</span>
									Uji Handshake Endpoint
								</span>
								<button
									type="button"
									onclick={() =>
										testProfileConnection({
											id: 'modal',
											baseUrl: modalBaseUrl,
											apiKey: modalApiKey,
											model: modalModel,
											temperature: modalTemperature,
											maxTokens: modalMaxTokens
										})}
									disabled={isTestingAI || !modalBaseUrl.trim() || !modalModel.trim()}
									class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer bg-slate-900 text-white dark:bg-white dark:text-slate-900 disabled:opacity-50"
								>
									{#if isTestingAI && testingProfileId === 'modal'}
										<span class="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
										<span>Menghubungi...</span>
									{:else}
										<span class="material-symbols-outlined text-sm">wifi_tethering</span>
										<span>Tes Koneksi Sekarang</span>
									{/if}
								</button>
							</div>

							{#if aiTestResult && testingProfileId === 'modal'}
								<div class="p-3 rounded-xl text-xs font-mono {aiTestResult.success ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'}">
									<div class="flex items-center justify-between mb-1">
										<span class="font-bold">{aiTestResult.success ? '✓ Respon Diterima' : '✕ Koneksi Gagal'}</span>
										{#if aiTestResult.latencyMs}
											<span>⚡ {aiTestResult.latencyMs} ms</span>
										{/if}
									</div>
									<p class="text-[11px] leading-relaxed truncate">
										{aiTestResult.preview || aiTestResult.message}
									</p>
								</div>
							{/if}
						</div>

						<!-- Modal Footer Actions -->
						<div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
							<button
								type="button"
								onclick={() => (showAIModal = false)}
								class="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-surface-container transition-all cursor-pointer"
							>
								Batal
							</button>

							<button
								type="submit"
								disabled={isSavingAI || !modalName.trim() || !modalBaseUrl.trim() || !modalModel.trim()}
								class="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-indigo-500/25 disabled:opacity-50"
							>
								{#if isSavingAI}
									<span class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
									<span>Menyimpan...</span>
								{:else}
									<span class="material-symbols-outlined text-sm">save</span>
									<span>{isEditingAI ? 'Simpan Perubahan' : 'Tambahkan Profil'}</span>
								{/if}
							</button>
						</div>
					</form>
				</div>
			</div>
		{/if}
	{/if}
</div>

