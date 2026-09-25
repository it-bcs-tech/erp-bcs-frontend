<script lang="ts">
	import { systemSettings, formatCurrencyPrivacy, formatMaskedText } from '$lib/stores/settings';
	import { authUser, displayName, getRoleLabel } from '$lib/stores/auth';

	import { enhance } from '$app/forms';

	let { data, form } = $props();

	let activeTab = $state<'privacy' | 'company' | 'preferences' | 'security' | 'approvals'>('privacy');
	let isSavedToast = $state(false);
	let approvalSuccessMsg = $state('');

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

	// Local state bound to store
	let settings = $state({
		hideSalaryNominals: $systemSettings.hideSalaryNominals,
		maskSensitiveInfo: $systemSettings.maskSensitiveInfo,
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

	// Sync local state when store changes
	$effect(() => {
		settings = {
			hideSalaryNominals: $systemSettings.hideSalaryNominals,
			maskSensitiveInfo: $systemSettings.maskSensitiveInfo,
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
		};
	});

	function handleSave() {
		systemSettings.updateSettings(settings);
		isSavedToast = true;
		setTimeout(() => {
			isSavedToast = false;
		}, 3000);
	}

	function handleTogglePrivacy() {
		settings.hideSalaryNominals = !settings.hideSalaryNominals;
		systemSettings.updateSettings({ hideSalaryNominals: settings.hideSalaryNominals });
		isSavedToast = true;
		setTimeout(() => {
			isSavedToast = false;
		}, 2500);
	}

	function handleToggleMasking() {
		settings.maskSensitiveInfo = !settings.maskSensitiveInfo;
		systemSettings.updateSettings({ maskSensitiveInfo: settings.maskSensitiveInfo });
		isSavedToast = true;
		setTimeout(() => {
			isSavedToast = false;
		}, 2500);
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
					<span>Pengaturan tersimpan!</span>
				</span>
			{/if}
			<button
				onclick={handleSave}
				class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-sm shadow-xs hover:bg-primary/90 transition-all cursor-pointer"
			>
				<span class="material-symbols-outlined text-lg">save</span>
				<span>Simpan Perubahan</span>
			</button>
		</div>
	</div>

	<!-- Navigation Tabs -->
	<div class="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-1 overflow-x-auto">
		<button
			onclick={() => (activeTab = 'privacy')}
			class="px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap {activeTab === 'privacy' ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface-variant hover:bg-surface-container'}"
		>
			<span class="material-symbols-outlined text-sm">visibility_off</span>
			<span>Privasi & Mode Presentasi</span>
			{#if settings.hideSalaryNominals}
				<span class="w-2 h-2 rounded-full bg-amber-400"></span>
			{/if}
		</button>
		<button
			onclick={() => (activeTab = 'company')}
			class="px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap {activeTab === 'company' ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface-variant hover:bg-surface-container'}"
		>
			<span class="material-symbols-outlined text-sm">corporate_fare</span>
			<span>Profil Perusahaan & Pool</span>
		</button>
		<button
			onclick={() => (activeTab = 'preferences')}
			class="px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap {activeTab === 'preferences' ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface-variant hover:bg-surface-container'}"
		>
			<span class="material-symbols-outlined text-sm">palette</span>
			<span>Tampilan & Notifikasi</span>
		</button>
		<button
			onclick={() => (activeTab = 'security')}
			class="px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap {activeTab === 'security' ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface-variant hover:bg-surface-container'}"
		>
			<span class="material-symbols-outlined text-sm">security</span>
			<span>Keamanan & Sesi Login</span>
		</button>
		<button
			onclick={() => (activeTab = 'approvals')}
			class="px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap {activeTab === 'approvals' ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface-variant hover:bg-surface-container'}"
		>
			<span class="material-symbols-outlined text-sm">tune</span>
			<span>Pengaturan Modul & Approval</span>
		</button>
	</div>

	<!-- TAB 1: PRIVACY & PRESENTATION MODE -->
	{#if activeTab === 'privacy'}
		<div class="space-y-6">
			<!-- Banner Info Mode Presentasi -->
			<div class="p-5 rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
				<div class="flex items-center gap-4">
					<div class="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-white flex-shrink-0">
						<span class="material-symbols-outlined text-2xl">slideshow</span>
					</div>
					<div>
						<h3 class="text-base font-bold">Mode Presentasi Layar (Screen Privacy Mode)</h3>
						<p class="text-xs text-blue-100 mt-0.5 leading-relaxed">
							Gunakan fitur ini ketika sedang melakukan presentasi layar, demo sistem, atau sharing screen agar nominal gaji dan data finansial sensitif tidak terlihat oleh audiens.
						</p>
					</div>
				</div>
				<div class="flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-full text-xs font-bold border border-white/20">
					<span>Status:</span>
					<span class="uppercase tracking-wider {settings.hideSalaryNominals ? 'text-amber-300' : 'text-emerald-300'}">
						{settings.hideSalaryNominals ? '🔒 Tersensor (Aktif)' : '👁️ Terbuka (Publik)'}
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
						onclick={handleTogglePrivacy}
						class="w-14 h-8 rounded-full transition-colors relative p-1 cursor-pointer flex-shrink-0 {settings.hideSalaryNominals ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}"
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
						onclick={handleToggleMasking}
						class="w-14 h-8 rounded-full transition-colors relative p-1 cursor-pointer flex-shrink-0 {settings.maskSensitiveInfo ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}"
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
	{/if}
</div>

