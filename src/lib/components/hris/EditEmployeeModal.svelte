<script lang="ts">
	import { enhance } from '$app/forms';
	import { fly, fade } from 'svelte/transition';
	import { addToast } from '$lib/stores/notifications';

	interface Props {
		isOpen: boolean;
		employee: any;
		titles?: Array<{ code: string; name: string }>;
		divisions?: Array<{ code: string; name: string }>;
		departments?: Array<{ code: string; name: string; divCode?: string }>;
		supervisorMappings?: Array<{ id: number; titleAtasan: string; titleBawahan: string }>;
		activePersonnel?: Array<{ id: number; payrollId: string; name: string; titleCode: string; avatar?: string; divId?: string; deptId?: string }>;
		actionUrl?: string;
		onSaved?: (updated: any) => void;
	}

	let {
		isOpen = $bindable(false),
		employee = null,
		titles = [],
		divisions = [],
		departments = [],
		supervisorMappings = [],
		activePersonnel = [],
		actionUrl = '?/updateEmployee',
		onSaved
	}: Props = $props();

	let isSubmitting = $state(false);
	let errorMessage = $state('');
	let successMessage = $state('');
	let activeTab = $state<'kepegawaian' | 'pribadi' | 'legalitas' | 'hirarki'>('kepegawaian');

	// Local form state
	let rawId = $state<number>(0);
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
	let cityKtp = $state('');
	let education = $state('S1');
	let major = $state('');

	// State Hirarki Atasan & Bawahan
	let selectedAtasanTitle = $state('');
	let selectedSubordinateTitles = $state<string[]>([]);
	let newSubordinateToAdd = $state('');

	// Sinkronisasi data saat employee berubah atau modal dibuka
	$effect(() => {
		if (isOpen && employee) {
			errorMessage = '';
			successMessage = '';

			const numId = Number(employee.rawId || employee.dbId || String(employee.id || '').replace(/[^0-9]/g, '')) || 0;
			rawId = numId;
			payrollId = employee.payroll_id || employee.payrollId || employee.id || '';
			name = employee.name || employee.nama_karyawan || '';
			email = employee.email || '';
			phone = employee.phone || employee.telp1 || '';
			
			// Temukan title code
			const matchedTitle = titles.find(t => t.code === employee.title || t.name === employee.role || t.name === employee.job_title);
			titleCode = matchedTitle ? matchedTitle.code : (employee.title || '');

			// Temukan div code
			const matchedDiv = divisions.find(d => d.code === employee.div_id || d.name === employee.directorate || d.name === employee.div_name);
			divCode = matchedDiv ? matchedDiv.code : (employee.div_id || '');

			// Temukan dept code
			const matchedDept = departments.find(d => d.code === employee.dept_id || d.name === employee.department || d.name === employee.dept_name);
			deptCode = matchedDept ? matchedDept.code : (employee.dept_id || '');

			// Normalisasi status kepegawaian
			const rawStatus = (employee.status || employee.status_karyawan || 'PERMANENT').toUpperCase();
			if (rawStatus.includes('CONTRACT') || rawStatus.includes('KONTRAK')) statusKaryawan = 'CONTRACT';
			else if (rawStatus.includes('PROBATION') || rawStatus.includes('PERCOBAAN')) statusKaryawan = 'PROBATION';
			else if (rawStatus.includes('INTERN') || rawStatus.includes('MAGANG')) statusKaryawan = 'INTERNSHIP';
			else if (rawStatus.includes('MITRA')) statusKaryawan = 'MITRA KERJA';
			else if (rawStatus.includes('BORONGAN')) statusKaryawan = 'BORONGAN';
			else if (rawStatus.includes('HARIAN')) statusKaryawan = 'HARIAN';
			else statusKaryawan = 'PERMANENT';

			isActive = (employee.status === 'Active' || employee.aktif === 'Y' || employee.aktif === '1') ? 'Y' : 'N';
			
			// Format tanggal YYYY-MM-DD
			joinDate = employee.tgl_masuk ? new Date(employee.tgl_masuk).toISOString().slice(0, 10) : (employee.joinDateRaw || '');
			birthDate = employee.tgl_lahir ? new Date(employee.tgl_lahir).toISOString().slice(0, 10) : (employee.birthDateRaw || '');
			
			workLocation = employee.lokasi || employee.location || 'Head Office Cilegon';
			noKtp = employee.no_ktp || employee.nik || '';
			noNpwp = employee.no_npwp || employee.npwp || '';
			birthPlace = employee.tempat_lahir || employee.birthPlace || '';

			// Normalisasi jenis kelamin (MALE / FEMALE)
			const rawGender = (employee.jenis_kelamin || employee.gender || 'MALE').toUpperCase();
			gender = (rawGender === 'FEMALE' || rawGender === 'P' || rawGender === 'WANITA' || rawGender === 'PEREMPUAN') ? 'FEMALE' : 'MALE';

			religion = (employee.agama || employee.religion || 'ISLAM').toUpperCase();
			maritalStatus = employee.marital_status || employee.maritalStatus || 'TK-0';
			addressKtp = employee.alamat_ktp || employee.address || '';
			cityKtp = employee.kota_ktp || employee.city || 'Cilegon';
			education = employee.pendidikan_terakhir || employee.education || 'S1';
			major = employee.jurusan || employee.major || '';

			// Inisialisasi Atasan Langsung dari supervisorMappings
			if (titleCode && supervisorMappings.length > 0) {
				const atasanRel = supervisorMappings.find(m => m.titleBawahan === titleCode);
				selectedAtasanTitle = atasanRel ? atasanRel.titleAtasan : '';

				const subRels = supervisorMappings.filter(m => m.titleAtasan === titleCode);
				selectedSubordinateTitles = Array.from(new Set(subRels.map(m => m.titleBawahan).filter(Boolean)));
			} else {
				selectedAtasanTitle = '';
				selectedSubordinateTitles = [];
			}
		}
	});

	// Filter departemen berdasarkan divisi yang dipilih jika ada
	let filteredDepartments = $derived(
		divCode
			? departments.filter(d => !d.divCode || d.divCode === divCode)
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
			<div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-surface-container-lowest">
				<div class="flex items-center gap-3">
					<div class="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-base border border-primary/20 shrink-0">
						{name ? name.charAt(0).toUpperCase() : 'E'}
					</div>
					<div>
						<div class="flex items-center gap-2">
							<h2 class="text-base sm:text-lg font-black text-on-surface">Edit Data Karyawan</h2>
							<span class="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-on-surface-variant border border-slate-200 dark:border-slate-700">
								{payrollId || 'EMP'}
							</span>
						</div>
						<p class="text-xs text-on-surface-variant mt-0.5 font-medium">{name || 'Nama Karyawan'}</p>
					</div>
				</div>
				<button
					type="button"
					onclick={closeModal}
					class="w-9 h-9 rounded-xl flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
					title="Tutup"
				>
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>

			<!-- Tabs Switcher (4 Tabs) -->
			<div class="px-6 pt-3 pb-2 border-b border-slate-200/80 dark:border-slate-800/80 bg-surface-container-low flex gap-2 overflow-x-auto">
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
					<span>Pribadi & Kontak</span>
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
				id="edit-employee-form"
				use:enhance={() => {
					isSubmitting = true;
					errorMessage = '';
					successMessage = '';
					return async ({ result, update }) => {
						isSubmitting = false;
						if (result.type === 'success') {
							const msg = (result.data as any)?.message || 'Data karyawan dan struktur hirarki berhasil diperbarui.';
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
							const msg = (result.data as any)?.message || 'Gagal memperbarui data karyawan.';
							errorMessage = msg;
							addToast({
								title: 'Gagal Memperbarui',
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
						} else {
							await update();
						}
					};
				}}
				class="p-6 overflow-y-auto flex-1 space-y-6"
			>
				<input type="hidden" name="id" value={rawId} />
				<input type="hidden" name="title_atasan" value={selectedAtasanTitle} />
				<input type="hidden" name="subordinate_titles" value={JSON.stringify(selectedSubordinateTitles)} />

				<!-- TAB 1: KEPEGAWAIAN -->
				{#if activeTab === 'kepegawaian'}
					<div class="space-y-4 animate-in fade-in duration-150">
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div class="space-y-1.5">
								<label for="emp-payroll-id" class="text-xs font-bold text-on-surface">Payroll ID / NIK Perusahaan</label>
								<input
									id="emp-payroll-id"
									type="text"
									name="payrollId"
									value={payrollId}
									readonly
									class="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-500 cursor-not-allowed"
								/>
								<p class="text-[10px] text-slate-400">NIK utama tidak dapat diubah sembarangan untuk integritas payroll.</p>
							</div>

							<div class="space-y-1.5">
								<label for="emp-name" class="text-xs font-bold text-on-surface">Nama Lengkap Karyawan *</label>
								<input
									id="emp-name"
									type="text"
									name="nama_karyawan"
									bind:value={name}
									required
									placeholder="Contoh: Budi Santoso"
									class="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-slate-300 dark:border-slate-700 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
								/>
							</div>

							<div class="space-y-1.5">
								<label for="emp-title" class="text-xs font-bold text-on-surface">Jabatan / Posisi *</label>
								<select
									id="emp-title"
									name="title"
									bind:value={titleCode}
									class="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-slate-300 dark:border-slate-700 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
								>
									<option value="">-- Pilih Jabatan --</option>
									{#each titles as t}
										<option value={t.code}>{t.name} ({t.code})</option>
									{/each}
								</select>
							</div>

							<div class="space-y-1.5">
								<label for="emp-div" class="text-xs font-bold text-on-surface">Direktorat / Divisi *</label>
								<select
									id="emp-div"
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
								<label for="emp-dept" class="text-xs font-bold text-on-surface">Departemen</label>
								<select
									id="emp-dept"
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
								<label for="emp-status-karyawan" class="text-xs font-bold text-on-surface">Status Kepegawaian</label>
								<select
									id="emp-status-karyawan"
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
								<label for="emp-aktif" class="text-xs font-bold text-on-surface">Status Aktif Bekerja</label>
								<select
									id="emp-aktif"
									name="aktif"
									bind:value={isActive}
									class="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-slate-300 dark:border-slate-700 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
								>
									<option value="Y">🟢 Aktif Bekerja (Y)</option>
									<option value="N">🔴 Non-Aktif / Resigned (N)</option>
								</select>
							</div>

							<div class="space-y-1.5">
								<label for="emp-tgl-masuk" class="text-xs font-bold text-on-surface">Tanggal Bergabung (Join Date)</label>
								<input
									id="emp-tgl-masuk"
									type="date"
									name="tgl_masuk"
									bind:value={joinDate}
									class="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-slate-300 dark:border-slate-700 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
								/>
							</div>

							<div class="space-y-1.5 sm:col-span-2">
								<label for="emp-lokasi" class="text-xs font-bold text-on-surface">Lokasi Penempatan Kerja</label>
								<input
									id="emp-lokasi"
									type="text"
									name="lokasi"
									bind:value={workLocation}
									placeholder="Contoh: Head Office Cilegon / Site Ciwandan"
									class="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-slate-300 dark:border-slate-700 text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
								/>
							</div>
						</div>
					</div>
				{/if}

				<!-- TAB 2: PRIBADI & KONTAK -->
				{#if activeTab === 'pribadi'}
					<div class="space-y-4 animate-in fade-in duration-150">
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div class="space-y-1.5">
								<label for="emp-email" class="text-xs font-bold text-on-surface">Email Perusahaan / Pribadi</label>
								<input
									id="emp-email"
									type="email"
									name="email"
									bind:value={email}
									placeholder="nama@bcs-logistics.co.id"
									class="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-slate-300 dark:border-slate-700 text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
								/>
							</div>

							<div class="space-y-1.5">
								<label for="emp-phone" class="text-xs font-bold text-on-surface">Nomor Telepon / WhatsApp</label>
								<input
									id="emp-phone"
									type="tel"
									name="telp1"
									bind:value={phone}
									placeholder="Contoh: 08123456789"
									class="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-slate-300 dark:border-slate-700 text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
								/>
							</div>

							<div class="space-y-1.5">
								<label for="emp-birth-place" class="text-xs font-bold text-on-surface">Tempat Lahir</label>
								<input
									id="emp-birth-place"
									type="text"
									name="tempat_lahir"
									bind:value={birthPlace}
									placeholder="Contoh: Cilegon / Serang / Jakarta"
									class="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-slate-300 dark:border-slate-700 text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
								/>
							</div>

							<div class="space-y-1.5">
								<label for="emp-birth-date" class="text-xs font-bold text-on-surface">Tanggal Lahir</label>
								<input
									id="emp-birth-date"
									type="date"
									name="tgl_lahir"
									bind:value={birthDate}
									class="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-slate-300 dark:border-slate-700 text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
								/>
							</div>

							<div class="space-y-1.5">
								<label for="emp-gender" class="text-xs font-bold text-on-surface">Jenis Kelamin</label>
								<select
									id="emp-gender"
									name="jenis_kelamin"
									bind:value={gender}
									class="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-slate-300 dark:border-slate-700 text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
								>
									<option value="MALE">Laki-laki (MALE)</option>
									<option value="FEMALE">Perempuan (FEMALE)</option>
								</select>
							</div>

							<div class="space-y-1.5">
								<label for="emp-religion" class="text-xs font-bold text-on-surface">Agama</label>
								<select
									id="emp-religion"
									name="agama"
									bind:value={religion}
									class="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-slate-300 dark:border-slate-700 text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
								>
									<option value="ISLAM">Islam</option>
									<option value="KRISTEN">Kristen Protestan</option>
									<option value="KATOLIK">Katolik</option>
									<option value="HINDU">Hindu</option>
									<option value="BUDDHA">Buddha</option>
									<option value="KONGHUCU">Konghucu</option>
								</select>
							</div>

							<div class="space-y-1.5 sm:col-span-2">
								<label for="emp-marital" class="text-xs font-bold text-on-surface">Status Pernikahan / PTKP</label>
								<select
									id="emp-marital"
									name="marital_status"
									bind:value={maritalStatus}
									class="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-slate-300 dark:border-slate-700 text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
								>
									<option value="TK-0">TK/0 - Tidak Kawin (Tanpa Tanggungan)</option>
									<option value="TK-1">TK/1 - Tidak Kawin (1 Tanggungan)</option>
									<option value="TK-2">TK/2 - Tidak Kawin (2 Tanggungan)</option>
									<option value="TK-3">TK/3 - Tidak Kawin (3 Tanggungan)</option>
									<option value="K-0">K/0 - Kawin (Tanpa Tanggungan)</option>
									<option value="K-1">K/1 - Kawin (1 Tanggungan)</option>
									<option value="K-2">K/2 - Kawin (2 Tanggungan)</option>
									<option value="K-3">K/3 - Kawin (3 Tanggungan)</option>
								</select>
							</div>
						</div>
					</div>
				{/if}

				<!-- TAB 3: LEGALITAS & ALAMAT -->
				{#if activeTab === 'legalitas'}
					<div class="space-y-4 animate-in fade-in duration-150">
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div class="space-y-1.5">
								<label for="emp-no-ktp" class="text-xs font-bold text-on-surface">Nomor Induk Kependudukan (NIK KTP)</label>
								<input
									id="emp-no-ktp"
									type="text"
									name="no_ktp"
									bind:value={noKtp}
									placeholder="16 Digit Nomor KTP"
									maxlength="20"
									class="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-slate-300 dark:border-slate-700 text-xs font-mono font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
								/>
							</div>

							<div class="space-y-1.5">
								<label for="emp-no-npwp" class="text-xs font-bold text-on-surface">Nomor Pokok Wajib Pajak (NPWP)</label>
								<input
									id="emp-no-npwp"
									type="text"
									name="no_npwp"
									bind:value={noNpwp}
									placeholder="Nomor NPWP"
									class="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-slate-300 dark:border-slate-700 text-xs font-mono font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
								/>
							</div>

							<div class="space-y-1.5">
								<label for="emp-education" class="text-xs font-bold text-on-surface">Pendidikan Terakhir</label>
								<select
									id="emp-education"
									name="pendidikan_terakhir"
									bind:value={education}
									class="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-slate-300 dark:border-slate-700 text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
								>
									<option value="SMA">SMA / SMK / Sederajat</option>
									<option value="D3">Diploma 3 (D3)</option>
									<option value="D4">Diploma 4 (D4)</option>
									<option value="S1">Sarjana (S1)</option>
									<option value="S2">Magister (S2)</option>
									<option value="S3">Doktor (S3)</option>
								</select>
							</div>

							<div class="space-y-1.5">
								<label for="emp-major" class="text-xs font-bold text-on-surface">Jurusan / Program Studi</label>
								<input
									id="emp-major"
									type="text"
									name="jurusan"
									bind:value={major}
									placeholder="Contoh: Teknik Informatika / Manajemen Logistik"
									class="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-slate-300 dark:border-slate-700 text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
								/>
							</div>

							<div class="space-y-1.5 sm:col-span-2">
								<label for="emp-address-ktp" class="text-xs font-bold text-on-surface">Alamat Lengkap Sesuai KTP</label>
								<textarea
									id="emp-address-ktp"
									name="alamat_ktp"
									bind:value={addressKtp}
									rows="2"
									placeholder="Jalan, RT/RW, Kelurahan, Kecamatan"
									class="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-slate-300 dark:border-slate-700 text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
								></textarea>
							</div>

							<div class="space-y-1.5 sm:col-span-2">
								<label for="emp-city-ktp" class="text-xs font-bold text-on-surface">Kota / Kabupaten KTP</label>
								<input
									id="emp-city-ktp"
									type="text"
									name="kota_ktp"
									bind:value={cityKtp}
									placeholder="Contoh: Cilegon"
									class="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-slate-300 dark:border-slate-700 text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
								/>
							</div>
						</div>
					</div>
				{/if}

				<!-- TAB 4: STRUKTUR & HIRARKI ORGANISASI (DIAGRAM POHON 3-LEVEL) -->
				{#if activeTab === 'hirarki'}
					<div class="space-y-6 animate-in fade-in duration-150">
						<!-- Konfigurasi Atasan & Bawahan Form Box -->
						<div class="p-5 rounded-2xl bg-surface border border-slate-200 dark:border-slate-800 space-y-4">
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-2">
									<span class="material-symbols-outlined text-primary text-xl">tune</span>
									<h3 class="text-xs font-black uppercase tracking-wider text-on-surface">Pengaturan Relasi Hirarki</h3>
								</div>
								<span class="text-[11px] text-on-surface-variant font-mono">Tersimpan ke master.m_atasan</span>
							</div>

							<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<!-- Pilih Atasan Langsung -->
								<div class="space-y-1.5">
									<label for="select-atasan-title" class="text-xs font-bold text-on-surface flex items-center gap-1.5">
										<span class="material-symbols-outlined text-sm text-blue-500">supervisor_account</span>
										<span>Pilih Jabatan Atasan Langsung</span>
									</label>
									<select
										id="select-atasan-title"
										bind:value={selectedAtasanTitle}
										class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container border border-slate-300 dark:border-slate-700 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
									>
										<option value="">-- Belum Ada Atasan (Level Tertinggi) --</option>
										{#each titles as t}
											{#if t.code !== titleCode}
												<option value={t.code}>{t.name} ({t.code})</option>
											{/if}
										{/each}
									</select>
									<p class="text-[10px] text-slate-400 leading-tight">
										Atasan ini menjadi approver resmi untuk asesmen kinerja Kirkpatrick L3/L4, cuti, dan persetujuan kerja.
									</p>
								</div>

								<!-- Tambah Jabatan Bawahan -->
								<div class="space-y-1.5">
									<label for="select-sub-to-add" class="text-xs font-bold text-on-surface flex items-center gap-1.5">
										<span class="material-symbols-outlined text-sm text-emerald-500">group_add</span>
										<span>Tambah Jabatan Bawahan Langsung</span>
									</label>
									<div class="flex gap-2">
										<select
											id="select-sub-to-add"
											bind:value={newSubordinateToAdd}
											class="flex-1 px-3.5 py-2.5 rounded-xl bg-surface-container border border-slate-300 dark:border-slate-700 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
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
											class="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shrink-0"
											title="Tambahkan Jabatan Bawahan"
										>
											<span class="material-symbols-outlined text-sm">add</span>
											<span>Tambah</span>
										</button>
									</div>
									<p class="text-[10px] text-slate-400 leading-tight">
										Jabatan yang dipilih akan melapor langsung ke jabatan {name || 'karyawan ini'}.
									</p>
								</div>
							</div>
						</div>

						<!-- DIAGRAM POHON VISUAL 3-LEVEL -->
						<div class="p-6 rounded-3xl bg-surface-container-low border border-slate-200/80 dark:border-slate-800/80 space-y-4">
							<div class="text-center space-y-1">
								<span class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary border border-primary/20 inline-block">
									Visual Diagram Pohon Hirarki
								</span>
								<h3 class="text-sm font-black text-on-surface">Struktur Lini Komando 3-Tingkat</h3>
							</div>

							<div class="flex flex-col items-center max-w-xl mx-auto pt-2">
								<!-- LEVEL 1: ATASAN LANGSUNG -->
								<div class="w-full sm:w-80 p-4 rounded-2xl border transition-all {selectedAtasanTitle ? 'bg-surface border-blue-500/40 shadow-xs' : 'bg-slate-100/60 dark:bg-slate-900/40 border-dashed border-slate-300 dark:border-slate-700 text-center'}">
									<div class="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/60 dark:border-slate-800/60">
										<span class="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-600 border border-blue-500/20">
											Level 1: Atasan Langsung
										</span>
										{#if selectedAtasanTitle}
											<button 
												type="button" 
												onclick={() => selectedAtasanTitle = ''}
												class="text-[10px] text-rose-500 hover:underline font-bold"
												title="Hapus Atasan"
											>
												Lepas
											</button>
										{/if}
									</div>

									{#if selectedAtasanTitle}
										<div class="flex items-start gap-3">
											<div class="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0 border border-blue-500/20">
												<span class="material-symbols-outlined text-lg">military_tech</span>
											</div>
											<div class="flex-1 min-w-0">
												<h4 class="text-xs font-bold text-on-surface truncate">
													{atasanTitleObj?.name || selectedAtasanTitle}
												</h4>
												<p class="text-[10px] font-mono text-slate-400">{selectedAtasanTitle}</p>
												
												<!-- Pejabat Aktif -->
												<div class="mt-2 pt-1.5 border-t border-slate-200/40 dark:border-slate-800/40">
													<p class="text-[10px] font-bold text-slate-500">Pejabat Aktif:</p>
													{#if atasanPersonnel.length > 0}
														<div class="flex flex-col gap-1 mt-1">
															{#each atasanPersonnel as person}
																<div class="flex items-center gap-1.5 text-xs text-on-surface font-semibold truncate">
																	<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
																	<span class="truncate">{person.name}</span>
																	<span class="text-[9px] text-slate-400 font-mono">({person.payrollId})</span>
																</div>
															{/each}
														</div>
													{:else}
														<p class="text-[10px] text-amber-600 italic">Belum ada karyawan aktif di jabatan ini</p>
													{/if}
												</div>
											</div>
										</div>
									{:else}
										<div class="py-2 text-on-surface-variant">
											<span class="material-symbols-outlined text-2xl text-slate-400 mb-1">domain</span>
											<p class="text-xs font-bold text-on-surface">Posisi Puncak / Mandiri</p>
											<p class="text-[10px] text-slate-400">Tidak ada atasan langsung di atas jabatan ini</p>
										</div>
									{/if}
								</div>

								<!-- KONEKTOR 1 -> 2 -->
								<div class="flex flex-col items-center my-1.5">
									<div class="w-0.5 h-6 bg-primary/40"></div>
									<span class="px-2 py-0.5 rounded-full bg-surface border border-slate-200 dark:border-slate-700 text-[9px] font-black text-slate-400 -my-2.5 z-10">
										MELAPOR KE ⬇
									</span>
									<div class="w-0.5 h-6 bg-primary/40"></div>
								</div>

								<!-- LEVEL 2: KARYAWAN INI (CURRENT EMPLOYEE) -->
								<div class="w-full sm:w-80 p-4 rounded-2xl bg-surface border-2 border-primary shadow-md relative overflow-hidden">
									<div class="absolute top-0 right-0 px-2.5 py-0.5 rounded-bl-xl text-[9px] font-black uppercase tracking-wider bg-primary text-on-primary">
										Karyawan Ini
									</div>

									<div class="flex items-start gap-3">
										<div class="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-base shrink-0 border border-primary/20">
											{name ? name.charAt(0).toUpperCase() : 'E'}
										</div>
										<div class="flex-1 min-w-0 pr-12">
											<h4 class="text-xs font-black text-on-surface truncate">
												{name || 'Nama Karyawan'}
											</h4>
											<p class="text-[11px] font-bold text-primary truncate mt-0.5">
												{titles.find(t => t.code === titleCode)?.name || titleCode || 'Belum Ditentukan'}
											</p>
											<p class="text-[10px] font-mono text-slate-400 mt-0.5">
												NIK: {payrollId || 'EMP'}
											</p>
										</div>
									</div>
								</div>

								<!-- KONEKTOR 2 -> 3 -->
								<div class="flex flex-col items-center my-1.5">
									<div class="w-0.5 h-6 bg-emerald-500/40"></div>
									<span class="px-2 py-0.5 rounded-full bg-surface border border-slate-200 dark:border-slate-700 text-[9px] font-black text-emerald-600 -my-2.5 z-10">
										MEMBAWAHI ⬇
									</span>
									<div class="w-0.5 h-6 bg-emerald-500/40"></div>
								</div>

								<!-- LEVEL 3: TIM BAWAHAN LANGSUNG -->
								<div class="w-full space-y-3">
									<div class="flex items-center justify-between px-2">
										<span class="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
											Level 3: Tim Bawahan Langsung ({subordinateListWithPersonnel.length} Jabatan)
										</span>
									</div>

									{#if subordinateListWithPersonnel.length > 0}
										<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
											{#each subordinateListWithPersonnel as sub}
												<div class="p-3 rounded-2xl bg-surface border border-slate-200 dark:border-slate-800 shadow-2xs relative group">
													<div class="flex items-start justify-between gap-2">
														<div class="flex items-start gap-2.5 min-w-0">
															<div class="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
																<span class="material-symbols-outlined text-sm">person</span>
															</div>
															<div class="min-w-0">
																<h5 class="text-xs font-bold text-on-surface truncate">{sub.name}</h5>
																<p class="text-[10px] font-mono text-slate-400">{sub.code}</p>
															</div>
														</div>
														<button
															type="button"
															onclick={() => removeSubordinateTitle(sub.code)}
															class="w-6 h-6 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 flex items-center justify-center transition-colors cursor-pointer shrink-0"
															title="Hapus Jabatan Bawahan Ini"
														>
															<span class="material-symbols-outlined text-xs">close</span>
														</button>
													</div>

													<!-- Daftar Personel di Jabatan Bawahan -->
													<div class="mt-2 pt-2 border-t border-slate-200/50 dark:border-slate-800/50 text-[10px]">
														{#if sub.personnel.length > 0}
															<div class="flex items-center gap-1 text-slate-500 mb-1">
																<span class="font-bold">{sub.personnel.length} Personel Aktif:</span>
															</div>
															<div class="flex flex-wrap gap-1">
																{#each sub.personnel as p}
																	<span class="px-1.5 py-0.5 rounded bg-surface-container text-on-surface text-[10px] font-medium truncate max-w-[150px]">
																		{p.name}
																	</span>
																{/each}
															</div>
														{:else}
															<span class="text-slate-400 italic">0 personel saat ini</span>
														{/if}
													</div>
												</div>
											{/each}
										</div>
									{:else}
										<div class="p-4 rounded-2xl bg-surface border border-dashed border-slate-200 dark:border-slate-800 text-center text-on-surface-variant">
											<span class="material-symbols-outlined text-xl text-slate-400 mb-1">group_off</span>
											<p class="text-xs font-bold text-on-surface">Belum Ada Bawahan Langsung</p>
											<p class="text-[10px] text-slate-400">Gunakan dropdown di atas untuk menambahkan jabatan yang melapor ke karyawan ini.</p>
										</div>
									{/if}
								</div>
							</div>
						</div>
					</div>
				{/if}
			</form>

			<!-- Footer -->
			<div class="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-surface-container-lowest flex items-center justify-between">
				<div class="text-[11px] text-slate-400">
					* Kolom dengan tanda bintang wajib diisi
				</div>
				<div class="flex items-center gap-2.5">
					<button
						type="button"
						onclick={closeModal}
						disabled={isSubmitting}
						class="px-4 py-2 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer disabled:opacity-50"
					>
						Batal
					</button>
					<button
						type="submit"
						form="edit-employee-form"
						disabled={isSubmitting}
						class="px-5 py-2 rounded-xl text-xs font-bold bg-primary text-on-primary hover:bg-primary/90 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
					>
						{#if isSubmitting}
							<span class="material-symbols-outlined text-sm animate-spin">progress_activity</span>
							<span>Menyimpan...</span>
						{:else}
							<span class="material-symbols-outlined text-sm">save</span>
							<span>Simpan Perubahan & Hirarki</span>
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
