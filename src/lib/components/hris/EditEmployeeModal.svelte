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
		actionUrl?: string;
		onSaved?: (updated: any) => void;
	}

	let {
		isOpen = $bindable(false),
		employee = null,
		titles = [],
		divisions = [],
		departments = [],
		actionUrl = '?/updateEmployee',
		onSaved
	}: Props = $props();

	let isSubmitting = $state(false);
	let activeTab = $state<'kepegawaian' | 'pribadi' | 'legalitas'>('kepegawaian');

	// Local form state
	let rawId = $state<number>(0);
	let payrollId = $state('');
	let name = $state('');
	let email = $state('');
	let phone = $state('');
	let titleCode = $state('');
	let divCode = $state('');
	let deptCode = $state('');
	let statusKaryawan = $state('TETAP');
	let isActive = $state('Y');
	let joinDate = $state('');
	let workLocation = $state('');
	let noKtp = $state('');
	let noNpwp = $state('');
	let birthPlace = $state('');
	let birthDate = $state('');
	let gender = $state('L');
	let religion = $state('ISLAM');
	let maritalStatus = $state('TK-0');
	let addressKtp = $state('');
	let cityKtp = $state('');
	let education = $state('S1');
	let major = $state('');

	// Sinkronisasi data saat employee berubah atau modal dibuka
	$effect(() => {
		if (isOpen && employee) {
			const numId = Number(employee.rawId || employee.dbId || String(employee.id || '').replace(/[^0-9]/g, '')) || 0;
			rawId = numId;
			payrollId = employee.payroll_id || employee.payrollId || employee.id || '';
			name = employee.name || employee.nama_karyawan || '';
			email = employee.email || '';
			phone = employee.phone || employee.telp1 || '';
			
			// Temukan title code jika yang dikirim berupa nama
			const matchedTitle = titles.find(t => t.code === employee.title || t.name === employee.role || t.name === employee.job_title);
			titleCode = matchedTitle ? matchedTitle.code : (employee.title || '');

			// Temukan div code
			const matchedDiv = divisions.find(d => d.code === employee.div_id || d.name === employee.directorate || d.name === employee.div_name);
			divCode = matchedDiv ? matchedDiv.code : (employee.div_id || '');

			// Temukan dept code
			const matchedDept = departments.find(d => d.code === employee.dept_id || d.name === employee.department || d.name === employee.dept_name);
			deptCode = matchedDept ? matchedDept.code : (employee.dept_id || '');

			statusKaryawan = employee.status_karyawan || 'TETAP';
			isActive = (employee.status === 'Active' || employee.aktif === 'Y' || employee.aktif === '1') ? 'Y' : 'N';
			
			// Format tanggal YYYY-MM-DD
			joinDate = employee.tgl_masuk ? new Date(employee.tgl_masuk).toISOString().slice(0, 10) : (employee.joinDateRaw || '');
			birthDate = employee.tgl_lahir ? new Date(employee.tgl_lahir).toISOString().slice(0, 10) : (employee.birthDateRaw || '');
			
			workLocation = employee.lokasi || employee.location || 'Head Office Cilegon';
			noKtp = employee.no_ktp || employee.nik || '';
			noNpwp = employee.no_npwp || employee.npwp || '';
			birthPlace = employee.tempat_lahir || employee.birthPlace || '';
			gender = employee.jenis_kelamin || employee.gender || 'L';
			religion = (employee.agama || employee.religion || 'ISLAM').toUpperCase();
			maritalStatus = employee.marital_status || employee.maritalStatus || 'TK-0';
			addressKtp = employee.alamat_ktp || employee.address || '';
			cityKtp = employee.kota_ktp || employee.city || 'Cilegon';
			education = employee.pendidikan_terakhir || employee.education || 'S1';
			major = employee.jurusan || employee.major || '';
		}
	});

	// Filter departemen berdasarkan divisi yang dipilih jika ada
	let filteredDepartments = $derived(
		divCode
			? departments.filter(d => !d.divCode || d.divCode === divCode)
			: departments
	);

	function closeModal() {
		if (isSubmitting) return;
		isOpen = false;
	}
</script>

{#if isOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
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
			class="relative w-full max-w-3xl bg-surface-container-lowest border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] z-10"
			transition:fly={{ y: 20, duration: 200 }}
		>
			<!-- Header -->
			<div class="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-surface-container-lowest">
				<div class="flex items-center gap-3">
					<div class="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-lg border border-primary/20 shrink-0">
						{name ? name.charAt(0).toUpperCase() : 'E'}
					</div>
					<div>
						<div class="flex items-center gap-2">
							<h2 class="text-base sm:text-lg font-black text-on-surface">Edit Data Karyawan</h2>
							<span class="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-on-surface-variant border border-slate-200 dark:border-slate-700">
								{payrollId || 'EMP'}
							</span>
						</div>
						<p class="text-xs text-on-surface-variant mt-0.5">{name || 'Nama Karyawan'}</p>
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

			<!-- Tabs Switcher -->
			<div class="px-6 pt-3 pb-2 border-b border-slate-200/80 dark:border-slate-800/80 bg-surface-container-low flex gap-2 overflow-x-auto">
				<button
					type="button"
					onclick={() => activeTab = 'kepegawaian'}
					class="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap {activeTab === 'kepegawaian' ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}"
				>
					<span class="material-symbols-outlined text-sm">badge</span>
					<span>Kepegawaian & Jabatan</span>
				</button>
				<button
					type="button"
					onclick={() => activeTab = 'pribadi'}
					class="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap {activeTab === 'pribadi' ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}"
				>
					<span class="material-symbols-outlined text-sm">person</span>
					<span>Pribadi & Kontak</span>
				</button>
				<button
					type="button"
					onclick={() => activeTab = 'legalitas'}
					class="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap {activeTab === 'legalitas' ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}"
				>
					<span class="material-symbols-outlined text-sm">description</span>
					<span>Legalitas & Alamat</span>
				</button>
			</div>

			<!-- Form Content (Scrollable) -->
			<form
				method="POST"
				action={actionUrl}
				id="edit-employee-form"
				use:enhance={() => {
					isSubmitting = true;
					return async ({ result, update }) => {
						isSubmitting = false;
						if (result.type === 'success') {
							addToast('Berhasil', 'Data karyawan berhasil diperbarui.', 'SUCCESS');
							isOpen = false;
							if (onSaved) onSaved(result.data);
							await update();
						} else if (result.type === 'failure') {
							addToast('Gagal Memperbarui', (result.data as any)?.message || 'Terjadi kesalahan sistem.', 'CRITICAL');
						} else {
							await update();
						}
					};
				}}
				class="p-6 overflow-y-auto flex-1 space-y-6"
			>
				<input type="hidden" name="id" value={rawId} />

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
									name="status_karyawan"
									bind:value={statusKaryawan}
									class="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-slate-300 dark:border-slate-700 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
								>
									<option value="TETAP">Karyawan Tetap (PKWTT)</option>
									<option value="KONTRAK">Karyawan Kontrak (PKWT)</option>
									<option value="PROBATION">Probation / Percobaan</option>
									<option value="MAGANG">Magang / Internship</option>
								</select>
							</div>

							<div class="space-y-1.5">
								<label for="emp-aktif" class="text-xs font-bold text-on-surface">Status Aktif</label>
								<select
									id="emp-aktif"
									name="aktif"
									bind:value={isActive}
									class="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-slate-300 dark:border-slate-700 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
								>
									<option value="Y">🟢 Aktif Bekerja</option>
									<option value="N">🔴 Non-Aktif / Resigned</option>
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
									<option value="L">Laki-laki</option>
									<option value="P">Perempuan</option>
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
							<span>Simpan Perubahan</span>
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
