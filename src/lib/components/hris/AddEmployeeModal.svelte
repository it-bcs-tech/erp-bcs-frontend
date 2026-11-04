<script lang="ts">
	import { enhance } from '$app/forms';
	import { fly, fade } from 'svelte/transition';
	import { addToast } from '$lib/stores/notifications';

	interface Props {
		isOpen: boolean;
		titles?: Array<{ code: string; name: string }>;
		divisions?: Array<{ code: string; name: string }>;
		departments?: Array<{ code: string; name: string; divCode?: string }>;
		supervisorMappings?: Array<{ id: number; titleAtasan: string; titleBawahan: string }>;
		activePersonnel?: Array<{ id: number; payrollId: string; name: string; titleCode: string; avatar?: string; divId?: string; deptId?: string }>;
		locations?: Array<{ code: string; name: string; city?: string }>;
		defaultPayrollId?: string;
		actionUrl?: string;
		onSaved?: (created: any) => void;
	}

	let {
		isOpen = $bindable(false),
		titles = [],
		divisions = [],
		departments = [],
		supervisorMappings = [],
		activePersonnel = [],
		locations = [],
		defaultPayrollId = '',
		actionUrl = '?/createEmployee',
		onSaved
	}: Props = $props();

	let isSubmitting = $state(false);
	let errorMessage = $state('');
	let successMessage = $state('');
	let activeTab = $state<'kepegawaian' | 'pribadi' | 'legalitas' | 'hirarki'>('kepegawaian');

	// Local form state
	let payrollId = $state('');
	let name = $state('');
	let email = $state('');
	let phone = $state('');
	let titleCode = $state('');
	let divCode = $state('');
	let deptCode = $state('');
	let statusKaryawan = $state('PERMANENT');
	let isActive = $state('Y');
	let joinDate = $state('');
	let workLocation = $state('');
	let noKtp = $state('');
	let noNpwp = $state('');
	let birthPlace = $state('');
	let birthDate = $state('');
	let gender = $state('MALE');
	let religion = $state('ISLAM');
	let maritalStatus = $state('TK-0');
	let addressKtp = $state('');
	let cityKtp = $state('Cilegon');
	let education = $state('S1');
	let major = $state('');

	// State Hirarki
	let selectedAtasanTitle = $state('');
	let selectedSubordinateTitles = $state<string[]>([]);
	let newSubordinateToAdd = $state('');

	function syncHierarchyWithTitle(code: string) {
		if (code && supervisorMappings.length > 0) {
			const atasanRel = supervisorMappings.find(m => m.titleBawahan === code);
			selectedAtasanTitle = atasanRel ? atasanRel.titleAtasan : '';

			const subRels = supervisorMappings.filter(m => m.titleAtasan === code);
			selectedSubordinateTitles = Array.from(new Set(subRels.map(m => m.titleBawahan).filter(Boolean)));
		} else {
			selectedAtasanTitle = '';
			selectedSubordinateTitles = [];
		}
	}

	// Reset dan inisialisasi form saat modal dibuka
	$effect(() => {
		if (isOpen) {
			errorMessage = '';
			successMessage = '';
			activeTab = 'kepegawaian';

			payrollId = defaultPayrollId || '';
			name = '';
			email = '';
			phone = '';
			titleCode = '';
			divCode = '';
			deptCode = '';
			statusKaryawan = 'PERMANENT';
			isActive = 'Y';
			joinDate = new Date().toISOString().slice(0, 10);
			workLocation = locations.find(l => l.code === 'LOC_027')?.code || (locations[0]?.code || 'LOC_027');
			noKtp = '';
			noNpwp = '';
			birthPlace = '';
			birthDate = '';
			gender = 'MALE';
			religion = 'ISLAM';
			maritalStatus = 'TK-0';
			addressKtp = '';
			cityKtp = 'Cilegon';
			education = 'S1';
			major = '';

			selectedAtasanTitle = '';
			selectedSubordinateTitles = [];
			newSubordinateToAdd = '';
		}
	});

	// Filter departemen berdasarkan divisi yang dipilih jika ada
	let filteredDepartments = $derived(
		divCode
			? departments.filter(d => d.divCode === divCode || (!d.divCode && d.code === 'D_71'))
			: departments
	);

	// Resolusi Data Atasan Terpilih
	let atasanTitleObj = $derived(titles.find(t => t.code === selectedAtasanTitle));
	let atasanPersonnel = $derived(
		selectedAtasanTitle
			? activePersonnel.filter(p => p.titleCode === selectedAtasanTitle)
			: []
	);

	// Resolusi Data Bawahan Terpilih
	let subordinateListWithPersonnel = $derived(
		selectedSubordinateTitles.map(code => {
			const tObj = titles.find(t => t.code === code);
			const persons = activePersonnel.filter(p => p.titleCode === code);
			return {
				code,
				name: tObj ? tObj.name : code,
				personnel: persons
			};
		})
	);

	// Available titles to add as subordinates (excluding current employee's title and already added)
	let availableTitlesForSubordinate = $derived(
		titles.filter(t => t.code !== titleCode && !selectedSubordinateTitles.includes(t.code))
	);

	function addSubordinateTitle() {
		if (!newSubordinateToAdd) return;
		if (!selectedSubordinateTitles.includes(newSubordinateToAdd)) {
			selectedSubordinateTitles = [...selectedSubordinateTitles, newSubordinateToAdd];
		}
		newSubordinateToAdd = '';
	}

	function removeSubordinateTitle(codeToRemove: string) {
		selectedSubordinateTitles = selectedSubordinateTitles.filter(c => c !== codeToRemove);
	}

	function closeModal() {
		if (isSubmitting) return;
		isOpen = false;
	}
</script>

{#if isOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
		<!-- Backdrop -->
		<button
			type="button"
			aria-label="Tutup Modal"
			class="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity w-full h-full border-none cursor-default"
			onclick={closeModal}
			transition:fade={{ duration: 150 }}
		></button>

		<!-- Modal Container -->
		<div
			class="relative w-full max-w-4xl bg-surface-container-lowest border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] z-10"
			transition:fly={{ y: 20, duration: 200 }}
		>
			<!-- Header -->
			<div class="px-6 py-5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-surface-container-low/40">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-xs">
						<span class="material-symbols-outlined text-xl">person_add</span>
					</div>
					<div>
						<h2 class="text-base font-black text-on-surface tracking-tight">Tambah Karyawan Baru</h2>
						<p class="text-xs text-on-surface-variant font-medium">Lengkapi profil personel dan susunan struktur hirarki organisasi.</p>
					</div>
				</div>
				<button
					type="button"
					onclick={closeModal}
					class="w-8 h-8 rounded-xl flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
					aria-label="Tutup"
				>
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>

			<!-- Navigation Tabs -->
			<div class="px-6 pt-3 pb-2 border-b border-slate-200/80 dark:border-slate-800 flex gap-2 overflow-x-auto bg-surface-container-lowest">
				<button
					type="button"
					onclick={() => activeTab = 'kepegawaian'}
					class="px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap {activeTab === 'kepegawaian' ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}"
				>
					<span class="material-symbols-outlined text-sm">badge</span>
					<span>Kepegawaian & Jabatan</span>
				</button>
				<button
					type="button"
					onclick={() => activeTab = 'pribadi'}
					class="px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap {activeTab === 'pribadi' ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}"
				>
					<span class="material-symbols-outlined text-sm">person</span>
					<span>Data Pribadi</span>
				</button>
				<button
					type="button"
					onclick={() => activeTab = 'legalitas'}
					class="px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap {activeTab === 'legalitas' ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}"
				>
					<span class="material-symbols-outlined text-sm">description</span>
					<span>Legalitas & Alamat</span>
				</button>
				<button
					type="button"
					onclick={() => activeTab = 'hirarki'}
					class="px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap {activeTab === 'hirarki' ? 'bg-indigo-600 text-white shadow-xs' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}"
				>
					<span class="material-symbols-outlined text-sm">account_tree</span>
					<span>Struktur & Hirarki Organisasi</span>
					{#if selectedAtasanTitle || selectedSubordinateTitles.length > 0}
						<span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
					{/if}
				</button>
			</div>

			<!-- In-Modal Alert Banner -->
			{#if errorMessage}
				<div class="mx-6 mt-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2.5 animate-in fade-in duration-150">
					<span class="material-symbols-outlined text-lg shrink-0">error</span>
					<span class="flex-1">{errorMessage}</span>
				</div>
			{/if}
			{#if successMessage}
				<div class="mx-6 mt-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2.5 animate-in fade-in duration-150">
					<span class="material-symbols-outlined text-lg shrink-0">check_circle</span>
					<span class="flex-1">{successMessage}</span>
				</div>
			{/if}

			<!-- Form Content (Scrollable) -->
			<form
				method="POST"
				action={actionUrl}
				id="add-employee-form"
				use:enhance={({ cancel }) => {
					if (!name || !name.trim()) {
						activeTab = 'kepegawaian';
						errorMessage = 'Nama Lengkap Karyawan wajib diisi.';
						cancel();
						return;
					}
					isSubmitting = true;
					errorMessage = '';
					successMessage = '';

					return async ({ result, update }) => {
						isSubmitting = false;
						if (result.type === 'success') {
							const msg = (result.data as any)?.message || 'Karyawan baru berhasil ditambahkan.';
							successMessage = msg;
							addToast({
								title: 'Berhasil',
								message: msg,
								type: 'SUCCESS'
							});
							if (onSaved) onSaved(result.data);
							await update();
							setTimeout(() => {
								if (isOpen) isOpen = false;
							}, 600);
						} else if (result.type === 'failure') {
							const msg = (result.data as any)?.message || 'Gagal menambahkan karyawan baru.';
							errorMessage = msg;
							addToast({
								title: 'Gagal Menambahkan',
								message: msg,
								type: 'CRITICAL'
							});
						} else if (result.type === 'error') {
							const msg = (result.error as any)?.message || 'Terjadi kesalahan sistem saat menghubungi server database.';
							errorMessage = msg;
							addToast({
								title: 'Kesalahan Sistem',
								message: msg,
								type: 'CRITICAL'
							});
						}
					};
				}}
				class="overflow-y-auto p-6 space-y-6 flex-1 text-on-surface"
			>
				<!-- Hidden inputs untuk relasi hirarki yang di-submit form -->
				<input type="hidden" name="title_atasan" value={selectedAtasanTitle} />
				<input type="hidden" name="subordinate_titles" value={JSON.stringify(selectedSubordinateTitles)} />

				<!-- ================= TAB 1: DATA KEPEGAWAIAN ================= -->
				<div class:hidden={activeTab !== 'kepegawaian'}>
					<div class="space-y-4">
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div class="space-y-1.5">
								<div class="flex items-center justify-between">
									<label for="new-emp-payroll" class="text-xs font-bold text-on-surface">Employee ID / Payroll ID</label>
									<span class="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md">Format: YYMM.NNNN</span>
								</div>
								<input
									id="new-emp-payroll"
									type="text"
									name="payrollId"
									bind:value={payrollId}
									placeholder="Contoh: 2611.4399"
									class="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-slate-300 dark:border-slate-700 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
								/>
							</div>

							<div class="space-y-1.5">
								<label for="new-emp-name" class="text-xs font-bold text-on-surface">Nama Lengkap Karyawan <span class="text-rose-500">*</span></label>
								<input
									id="new-emp-name"
									type="text"
									name="nama_karyawan"
									bind:value={name}
									placeholder="Nama lengkap sesuai KTP"
									class="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-slate-300 dark:border-slate-700 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
								/>
							</div>

							<div class="space-y-1.5">
								<label for="new-emp-email" class="text-xs font-bold text-on-surface">Alamat Email Perusahaan / Pribadi</label>
								<input
									id="new-emp-email"
									type="email"
									name="email"
									bind:value={email}
									placeholder="karyawan@bcslabs.tech"
									class="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-slate-300 dark:border-slate-700 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
								/>
							</div>

							<div class="space-y-1.5">
								<label for="new-emp-phone" class="text-xs font-bold text-on-surface">Nomor Telepon / WhatsApp</label>
								<input
									id="new-emp-phone"
									type="text"
									name="telp1"
									bind:value={phone}
									placeholder="081234567890"
									class="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-slate-300 dark:border-slate-700 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
								/>
							</div>

							<div class="space-y-1.5">
								<label for="new-emp-title" class="text-xs font-bold text-on-surface">Jabatan (Title)</label>
								<select
									id="new-emp-title"
									name="title"
									bind:value={titleCode}
									onchange={() => syncHierarchyWithTitle(titleCode)}
									class="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-slate-300 dark:border-slate-700 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
								>
									<option value="">-- Pilih Jabatan --</option>
									{#each titles as t}
										<option value={t.code}>{t.name} ({t.code})</option>
									{/each}
								</select>
							</div>

							<div class="space-y-1.5">
								<label for="new-emp-div" class="text-xs font-bold text-on-surface">Divisi / Direktorat</label>
								<select
									id="new-emp-div"
									name="div_id"
									bind:value={divCode}
									class="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-slate-300 dark:border-slate-700 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
								>
									<option value="">-- Pilih Divisi --</option>
									{#each divisions as d}
										<option value={d.code}>{d.name}</option>
									{/each}
								</select>
							</div>

							<div class="space-y-1.5">
								<label for="new-emp-dept" class="text-xs font-bold text-on-surface">Departemen</label>
								<select
									id="new-emp-dept"
									name="dept_id"
									bind:value={deptCode}
									class="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-slate-300 dark:border-slate-700 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
								>
									<option value="">-- Pilih Departemen --</option>
									{#each filteredDepartments as d}
										<option value={d.code}>{d.name}</option>
									{/each}
								</select>
							</div>

							<div class="space-y-1.5">
								<label for="new-emp-status-karyawan" class="text-xs font-bold text-on-surface">Status Kepegawaian</label>
								<select
									id="new-emp-status-karyawan"
									name="status"
									bind:value={statusKaryawan}
									class="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-slate-300 dark:border-slate-700 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
								>
									<option value="PERMANENT">Karyawan Tetap (PERMANENT / PKWTT)</option>
									<option value="CONTRACT">Karyawan Kontrak (CONTRACT / PKWT)</option>
									<option value="PROBATION">Masa Percobaan (PROBATION)</option>
									<option value="INTERNSHIP">Magang / Prakerin (INTERNSHIP)</option>
									<option value="MITRA KERJA">Mitra Kerja Operasional</option>
									<option value="BORONGAN">Tenaga Borongan</option>
									<option value="HARIAN">Harian Lepas</option>
								</select>
							</div>

							<div class="space-y-1.5">
								<label for="new-emp-aktif" class="text-xs font-bold text-on-surface">Status Aktif Bekerja</label>
								<select
									id="new-emp-aktif"
									name="aktif"
									bind:value={isActive}
									class="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-slate-300 dark:border-slate-700 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
								>
									<option value="Y">Aktif Bekerja (Active)</option>
									<option value="N">Tidak Aktif / Non-Aktif (Inactive)</option>
								</select>
							</div>

							<div class="space-y-1.5">
								<label for="new-emp-lokasi" class="text-xs font-bold text-on-surface">Lokasi Penempatan Kerja</label>
								<select
									id="new-emp-lokasi"
									name="lokasi"
									bind:value={workLocation}
									class="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-slate-300 dark:border-slate-700 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
								>
									{#each locations as loc}
										<option value={loc.code}>{loc.name}{loc.city ? ` (${loc.city})` : ''} - {loc.code}</option>
									{/each}
								</select>
							</div>

							<div class="space-y-1.5">
								<label for="new-emp-join" class="text-xs font-bold text-on-surface">Tanggal Mulai Bekerja (Join Date)</label>
								<input
									id="new-emp-join"
									type="date"
									name="tgl_masuk"
									bind:value={joinDate}
									class="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-slate-300 dark:border-slate-700 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
								/>
							</div>
						</div>
					</div>
				</div>

				<!-- ================= TAB 2: DATA PRIBADI & BIODATA ================= -->
				<div class:hidden={activeTab !== 'pribadi'}>
					<div class="space-y-4">
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div class="space-y-1.5">
								<label for="new-emp-birthplace" class="text-xs font-bold text-on-surface">Tempat Lahir</label>
								<input
									id="new-emp-birthplace"
									type="text"
									name="tempat_lahir"
									bind:value={birthPlace}
									placeholder="Contoh: Cilegon, Serang, Jakarta"
									class="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-slate-300 dark:border-slate-700 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
								/>
							</div>

							<div class="space-y-1.5">
								<label for="new-emp-birthdate" class="text-xs font-bold text-on-surface">Tanggal Lahir</label>
								<input
									id="new-emp-birthdate"
									type="date"
									name="tgl_lahir"
									bind:value={birthDate}
									class="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-slate-300 dark:border-slate-700 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
								/>
							</div>

							<div class="space-y-1.5">
								<label for="new-emp-gender" class="text-xs font-bold text-on-surface">Jenis Kelamin</label>
								<select
									id="new-emp-gender"
									name="jenis_kelamin"
									bind:value={gender}
									class="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-slate-300 dark:border-slate-700 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
								>
									<option value="MALE">Laki-Laki (MALE)</option>
									<option value="FEMALE">Perempuan (FEMALE)</option>
								</select>
							</div>

							<div class="space-y-1.5">
								<label for="new-emp-religion" class="text-xs font-bold text-on-surface">Agama</label>
								<select
									id="new-emp-religion"
									name="agama"
									bind:value={religion}
									class="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-slate-300 dark:border-slate-700 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
								>
									<option value="ISLAM">ISLAM</option>
									<option value="KRISTEN">KRISTEN</option>
									<option value="KATOLIK">KATOLIK</option>
									<option value="HINDU">HINDU</option>
									<option value="BUDDHA">BUDDHA</option>
									<option value="KONGHUCU">KONGHUCU</option>
								</select>
							</div>

							<div class="space-y-1.5">
								<label for="new-emp-marital" class="text-xs font-bold text-on-surface">Status Pernikahan / PTKP</label>
								<select
									id="new-emp-marital"
									name="marital_status"
									bind:value={maritalStatus}
									class="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-slate-300 dark:border-slate-700 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
								>
									<option value="TK-0">Tidak Kawin / Belum Menikah (TK-0)</option>
									<option value="K-0">Kawin / Menikah Tanpa Tanggungan (K-0)</option>
									<option value="K-1">Kawin Tanggungan 1 Anak (K-1)</option>
									<option value="K-2">Kawin Tanggungan 2 Anak (K-2)</option>
									<option value="K-3">Kawin Tanggungan 3 Anak (K-3)</option>
								</select>
							</div>

							<div class="space-y-1.5">
								<label for="new-emp-edu" class="text-xs font-bold text-on-surface">Pendidikan Terakhir</label>
								<select
									id="new-emp-edu"
									name="pendidikan_terakhir"
									bind:value={education}
									class="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-slate-300 dark:border-slate-700 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
								>
									<option value="SMA/SMK">SMA / SMK Sederajat</option>
									<option value="D3">Diploma 3 (D3)</option>
									<option value="D4">Diploma 4 (D4)</option>
									<option value="S1">Strata 1 (S1)</option>
									<option value="S2">Magister / Strata 2 (S2)</option>
									<option value="S3">Doktor / Strata 3 (S3)</option>
								</select>
							</div>

							<div class="space-y-1.5 sm:col-span-2">
								<label for="new-emp-major" class="text-xs font-bold text-on-surface">Jurusan / Program Studi</label>
								<input
									id="new-emp-major"
									type="text"
									name="jurusan"
									bind:value={major}
									placeholder="Contoh: Teknik Informatika, Manajemen, Akuntansi"
									class="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-slate-300 dark:border-slate-700 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
								/>
							</div>
						</div>
					</div>
				</div>

				<!-- ================= TAB 3: LEGALITAS & DOKUMEN ================= -->
				<div class:hidden={activeTab !== 'legalitas'}>
					<div class="space-y-4">
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div class="space-y-1.5">
								<label for="new-emp-ktp" class="text-xs font-bold text-on-surface">Nomor KTP (NIK 16 Digit)</label>
								<input
									id="new-emp-ktp"
									type="text"
									name="no_ktp"
									bind:value={noKtp}
									maxlength="16"
									placeholder="Contoh: 367201..."
									class="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-slate-300 dark:border-slate-700 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono"
								/>
							</div>

							<div class="space-y-1.5">
								<label for="new-emp-npwp" class="text-xs font-bold text-on-surface">Nomor NPWP</label>
								<input
									id="new-emp-npwp"
									type="text"
									name="no_npwp"
									bind:value={noNpwp}
									placeholder="Contoh: 09.123.456.7-412.000"
									class="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-slate-300 dark:border-slate-700 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono"
								/>
							</div>

							<div class="space-y-1.5 sm:col-span-2">
								<label for="new-emp-alamat" class="text-xs font-bold text-on-surface">Alamat Domisili KTP</label>
								<textarea
									id="new-emp-alamat"
									name="alamat_ktp"
									bind:value={addressKtp}
									rows="2"
									placeholder="Nama jalan, RT/RW, Kelurahan, Kecamatan"
									class="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-slate-300 dark:border-slate-700 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
								></textarea>
							</div>

							<div class="space-y-1.5">
								<label for="new-emp-kota" class="text-xs font-bold text-on-surface">Kota / Kabupaten KTP</label>
								<input
									id="new-emp-kota"
									type="text"
									name="kota_ktp"
									bind:value={cityKtp}
									placeholder="Cilegon"
									class="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-slate-300 dark:border-slate-700 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
								/>
							</div>
						</div>
					</div>
				</div>

				<!-- ================= TAB 4: HIRARKI & STRUKTUR ORGANISASI ================= -->
				<div class:hidden={activeTab !== 'hirarki'}>
					<div class="space-y-6">
						<!-- Konfigurasi Atasan & Bawahan -->
						<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
							<!-- Bagian Atasan -->
							<div class="p-4 rounded-2xl bg-surface-container-low/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
								<div class="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
									<span class="material-symbols-outlined text-base">supervisor_account</span>
									<span class="text-xs font-bold uppercase tracking-wider">Atasan Langsung (Direct Manager)</span>
								</div>
								
								<div class="space-y-1.5">
									<label for="new-atasan-title-select" class="text-[11px] font-bold text-on-surface-variant">Jabatan Atasan</label>
									<select
										id="new-atasan-title-select"
										bind:value={selectedAtasanTitle}
										class="w-full px-3 py-2 rounded-xl bg-surface border border-slate-300 dark:border-slate-700 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer"
									>
										<option value="">-- Tanpa Atasan (Direksi / Puncak) --</option>
										{#each titles as t}
											{#if t.code !== titleCode}
												<option value={t.code}>{t.name} ({t.code})</option>
											{/if}
										{/each}
									</select>
								</div>

								{#if selectedAtasanTitle}
									<div class="pt-2 border-t border-slate-200/60 dark:border-slate-800">
										<p class="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant mb-1.5">Personel Pejabat Saat Ini:</p>
										{#if atasanPersonnel.length > 0}
											<div class="space-y-1.5 max-h-32 overflow-y-auto pr-1">
												{#each atasanPersonnel as person}
													<div class="flex items-center gap-2 p-1.5 rounded-lg bg-surface-container text-xs font-semibold">
														<span class="material-symbols-outlined text-sm text-primary">person</span>
														<span class="text-on-surface font-bold">{person.name}</span>
														<span class="text-[10px] text-on-surface-variant font-mono">({person.payrollId})</span>
													</div>
												{/each}
											</div>
										{:else}
											<p class="text-xs text-amber-600 dark:text-amber-400 italic">Posisi jabatan atasan ini saat ini belum memiliki pejabat aktif (kosong).</p>
										{/if}
									</div>
								{/if}
							</div>

							<!-- Bagian Bawahan -->
							<div class="p-4 rounded-2xl bg-surface-container-low/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
								<div class="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
									<span class="material-symbols-outlined text-base">groups</span>
									<span class="text-xs font-bold uppercase tracking-wider">Tim Bawahan Langsung (Subordinates)</span>
								</div>

								<!-- Input Tambah Bawahan -->
								<div class="flex gap-2">
									<select
										bind:value={newSubordinateToAdd}
										class="flex-1 px-3 py-2 rounded-xl bg-surface border border-slate-300 dark:border-slate-700 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer"
									>
										<option value="">-- Pilih Jabatan Bawahan --</option>
										{#each availableTitlesForSubordinate as t}
											<option value={t.code}>{t.name} ({t.code})</option>
										{/each}
									</select>
									<button
										type="button"
										onclick={addSubordinateTitle}
										disabled={!newSubordinateToAdd}
										class="px-3 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shrink-0"
									>
										<span class="material-symbols-outlined text-sm">add</span>
										<span>Tambah</span>
									</button>
								</div>

								<!-- Daftar Bawahan Terpilih -->
								<div class="space-y-1.5 max-h-40 overflow-y-auto pr-1">
									{#if selectedSubordinateTitles.length > 0}
										{#each selectedSubordinateTitles as subCode}
											{@const tObj = titles.find(t => t.code === subCode)}
											{@const persons = activePersonnel.filter(p => p.titleCode === subCode)}
											<div class="flex items-center justify-between p-2 rounded-xl bg-surface border border-slate-200/60 dark:border-slate-800 text-xs">
												<div class="min-w-0 pr-2">
													<p class="font-bold text-on-surface truncate">{tObj ? tObj.name : subCode}</p>
													<p class="text-[10px] text-on-surface-variant font-mono">
														{persons.length > 0 ? `${persons.length} Personel Aktif (${persons.map(p => p.name).slice(0, 2).join(', ')}${persons.length > 2 ? '...' : ''})` : 'Belum ada pejabat aktif'}
													</p>
												</div>
												<button
													type="button"
													onclick={() => removeSubordinateTitle(subCode)}
													class="text-rose-500 hover:text-rose-700 p-1 rounded-lg hover:bg-rose-500/10 transition-colors"
													title="Hapus dari bawahan"
												>
													<span class="material-symbols-outlined text-sm">delete</span>
												</button>
											</div>
										{/each}
									{:else}
										<p class="text-xs text-on-surface-variant italic py-2">Belum ada jabatan bawahan langsung yang ditetapkan.</p>
									{/if}
								</div>
							</div>
						</div>

						<!-- Visual Org Tree Preview -->
						<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200 dark:border-slate-800">
							<div class="flex items-center justify-between mb-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
								<div class="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
									<span class="material-symbols-outlined text-base">schema</span>
									<span>Bagan Hirarki Organisasi Visual</span>
								</div>
								<span class="text-[10px] text-on-surface-variant">Pratinjau struktur pelaporan</span>
							</div>

							<div class="flex flex-col items-center py-2 space-y-4">
								<!-- Level 1: Atasan -->
								<div class="flex flex-col items-center">
									{#if selectedAtasanTitle}
										<div class="px-4 py-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-center shadow-xs min-w-[200px] max-w-xs animate-in fade-in duration-200">
											<span class="text-[10px] font-black tracking-wider uppercase text-indigo-600 dark:text-indigo-400 block mb-0.5">Atasan Langsung</span>
											<p class="text-xs font-bold text-on-surface truncate">{atasanTitleObj ? atasanTitleObj.name : selectedAtasanTitle}</p>
											{#if atasanPersonnel.length > 0}
												<p class="text-[10px] text-on-surface-variant font-medium mt-0.5">
													{atasanPersonnel[0].name} {atasanPersonnel.length > 1 ? `(+${atasanPersonnel.length - 1})` : ''}
												</p>
											{/if}
										</div>
									{:else}
										<div class="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-dashed border-slate-300 dark:border-slate-700 text-center text-on-surface-variant text-[11px] font-medium">
											Level Puncak / Tanpa Atasan
										</div>
									{/if}

									<!-- Garis Penghubung Ke Karyawan -->
									<div class="w-0.5 h-6 bg-slate-300 dark:bg-slate-700"></div>
								</div>

								<!-- Level 2: Karyawan Baru (Fokus) -->
								<div class="px-5 py-3 rounded-2xl bg-primary text-on-primary text-center shadow-md min-w-[220px] max-w-sm ring-4 ring-primary/20">
									<span class="text-[9px] font-black tracking-widest uppercase bg-white/20 text-white px-2 py-0.5 rounded-full inline-block mb-1">
										Karyawan Baru (Target)
									</span>
									<p class="text-sm font-extrabold truncate">{name.trim() || 'Nama Karyawan Baru'}</p>
									<p class="text-xs font-medium text-white/90 mt-0.5 truncate">
										{titles.find(t => t.code === titleCode)?.name || 'Pilih Jabatan'}
									</p>
									{#if payrollId}
										<p class="text-[10px] font-mono opacity-80 mt-0.5">{payrollId}</p>
									{/if}
								</div>

								<!-- Level 3: Bawahan Langsung -->
								{#if selectedSubordinateTitles.length > 0}
									<div class="w-full flex flex-col items-center">
										<!-- Garis Penghubung Ke Bawah -->
										<div class="w-0.5 h-6 bg-slate-300 dark:bg-slate-700"></div>

										<!-- Cabang Horizontal -->
										{#if selectedSubordinateTitles.length > 1}
											<div class="w-3/4 max-w-md h-0.5 bg-slate-300 dark:bg-slate-700 mb-2"></div>
										{/if}

										<!-- Grid Bawahan -->
										<div class="flex flex-wrap justify-center gap-3 w-full">
											{#each subordinateListWithPersonnel as sub}
												<div class="px-3 py-2 rounded-xl bg-surface-container border border-slate-200/80 dark:border-slate-800 text-center shadow-2xs min-w-[150px] max-w-[200px]">
													<span class="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider block mb-0.5">Bawahan</span>
													<p class="text-xs font-bold text-on-surface truncate">{sub.name}</p>
													{#if sub.personnel.length > 0}
														<p class="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium truncate mt-0.5">
															{sub.personnel.length} Orang ({sub.personnel[0].name})
														</p>
													{:else}
														<p class="text-[10px] text-on-surface-variant italic mt-0.5">Posisi Kosong</p>
													{/if}
												</div>
											{/each}
										</div>
									</div>
								{:else}
									<div class="pt-2">
										<span class="text-[11px] text-on-surface-variant italic">Karyawan ini tidak memiliki tim bawahan langsung.</span>
									</div>
								{/if}
							</div>
						</div>
					</div>
				</div>
			</form>

			<!-- Footer Actions -->
			<div class="px-6 py-4 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-surface-container-low/40">
				<div class="text-[11px] text-on-surface-variant">
					<span class="font-bold text-rose-500">*</span> Wajib diisi
				</div>
				<div class="flex items-center gap-2.5">
					<button
						type="button"
						onclick={closeModal}
						disabled={isSubmitting}
						class="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-on-surface hover:bg-surface-container transition-colors cursor-pointer disabled:opacity-50"
					>
						Batal
					</button>
					<button
						type="submit"
						form="add-employee-form"
						disabled={isSubmitting}
						class="px-5 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
					>
						{#if isSubmitting}
							<span class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
							<span>Menyimpan...</span>
						{:else}
							<span class="material-symbols-outlined text-base">save</span>
							<span>Simpan Karyawan Baru</span>
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}