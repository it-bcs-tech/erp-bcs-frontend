<script lang="ts">
	// Sample Recruitment Pipeline Data with Logistics & Tech roles
	let pipeline = $state([
		{
			id: 'col-1',
			title: 'Applied',
			count: 14,
			color: 'surface-variant',
			candidates: [
				{ id: 'C-001', name: 'Agus Setiawan', role: 'Driver Trailer Heavy Equipment', experience: '6 Thn', status: 'SIM B2 Umum Valid', avatar: 'https://ui-avatars.com/api/?name=Agus+Setiawan&background=0284c7&color=fff' },
				{ id: 'C-002', name: 'Rian Hidayat', role: 'Mekanik Mesin Hino & Volvo', experience: '4 Thn', status: 'Sertifikat Otomotif', avatar: 'https://ui-avatars.com/api/?name=Rian+Hidayat&background=10b981&color=fff' },
				{ id: 'C-003', name: 'Jessica Parker', role: 'Operations Dispatcher', experience: '3 Thn', status: 'Review CV', avatar: 'https://ui-avatars.com/api/?name=Jessica+Parker&background=f59e0b&color=fff' }
			]
		},
		{
			id: 'col-2',
			title: 'Screening & Test Fisik/SIM',
			count: 6,
			color: 'secondary',
			candidates: [
				{ id: 'C-004', name: 'Bambang Sudiro', role: 'Driver Tangki B3', experience: '8 Thn', status: 'MCU Lolos', avatar: 'https://ui-avatars.com/api/?name=Bambang+Sudiro&background=8b5cf6&color=fff' },
				{ id: 'C-005', name: 'Thomas Wright', role: 'Fleet Maintenance Officer', experience: '5 Thn', status: 'Technical Test Passed', avatar: 'https://ui-avatars.com/api/?name=Thomas+Wright&background=ec4899&color=fff' }
			]
		},
		{
			id: 'col-3',
			title: 'Driving / User Interview',
			count: 4,
			color: 'tertiary',
			candidates: [
				{ id: 'C-006', name: 'Wahyu Hidayat', role: 'Driver Tronton Wingbox', experience: '7 Thn', status: 'Simulasi Jalan Raya', avatar: 'https://ui-avatars.com/api/?name=Wahyu+Hidayat&background=06b6d4&color=fff' }
			]
		},
		{
			id: 'col-4',
			title: 'Offering & Hired',
			count: 2,
			color: 'primary',
			candidates: [
				{ id: 'C-008', name: 'Arief Budiman', role: 'Senior Driver Trailer', experience: '9 Thn', status: 'Offering Signed', avatar: 'https://ui-avatars.com/api/?name=Arief+Budiman&background=10b981&color=fff' }
			]
		}
	]);

	let showOnboardModal = $state(false);
	let selectedCandidateForOnboard = $state<any>(null);
	let assignedNik = $state('EMP-2026-088');
	let assignedPool = $state('Pool Cilegon Utama');
	let assignedDivision = $state('Logistik & Operasional Armada');
	let successToast = $state(false);

	function openOnboardModal(candidate: any) {
		selectedCandidateForOnboard = candidate;
		assignedNik = `EMP-2026-${Math.floor(100 + Math.random() * 900)}`;
		showOnboardModal = true;
	}

	function confirmOnboard() {
		showOnboardModal = false;
		successToast = true;
		setTimeout(() => {
			successToast = false;
		}, 4000);
	}
</script>

<svelte:head>
	<title>Recruitment Pipeline & ATS | HRIS BCS</title>
</svelte:head>

<div class="flex flex-col h-[calc(100vh-120px)] space-y-6">
	<!-- Toast Notifikasi Sukses -->
	{#if successToast}
		<div class="fixed top-6 right-6 z-50 p-4 rounded-2xl bg-emerald-600 text-white shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-200">
			<span class="material-symbols-outlined text-2xl">check_circle</span>
			<div>
				<p class="font-bold text-sm">Karyawan Berhasil Di-Onboard!</p>
				<p class="text-xs text-emerald-100">{selectedCandidateForOnboard?.name} terdaftar dengan NIK {assignedNik}.</p>
			</div>
		</div>
	{/if}

	<!-- Header & Actions -->
	<header class="flex flex-col md:flex-row md:items-end justify-between gap-4 flex-shrink-0">
		<div>
			<div class="flex items-center gap-2">
				<span class="material-symbols-outlined text-primary text-2xl">person_search</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Recruitment Pipeline & ATS</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-sm mt-0.5">
				Tracking Pelamar, Uji SIM B2/Mekanik, Offering, & Auto-Onboard Karyawan BCS
			</p>
		</div>
		<div class="flex gap-2">
			<button class="bg-surface-container-low border border-slate-200 dark:border-slate-800 text-on-surface px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-surface-container transition-colors shadow-xs">
				<span class="material-symbols-outlined text-lg">work</span>
				<span>Lowongan Aktif (5)</span>
			</button>
			<button class="bg-primary text-on-primary px-4 py-2.5 rounded-xl text-sm font-bold shadow-xs flex items-center gap-2 hover:bg-primary/90 transition-colors cursor-pointer">
				<span class="material-symbols-outlined text-lg">post_add</span>
				<span>Buka Lowongan Baru</span>
			</button>
		</div>
	</header>

	<!-- Kanban Board -->
	<div class="flex-1 overflow-x-auto overflow-y-hidden pb-4 hide-scrollbar">
		<div class="flex h-full gap-5 min-w-max px-1">
			{#each pipeline as column}
				<!-- Column -->
				<div class="w-80 flex flex-col h-full bg-surface-container-low/70 rounded-3xl border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
					<!-- Column Header -->
					<div class="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-surface-container-low rounded-t-3xl z-10">
						<div class="flex items-center gap-2.5">
							<span class="w-2.5 h-2.5 rounded-full bg-primary"></span>
							<h3 class="font-bold text-on-surface text-xs uppercase tracking-wider">{column.title}</h3>
						</div>
						<span class="px-2 py-0.5 rounded-lg bg-surface-container text-xs font-bold text-on-surface-variant font-mono">{column.count}</span>
					</div>

					<!-- Cards Container -->
					<div class="p-3 flex-1 overflow-y-auto space-y-3">
						{#each column.candidates as candidate}
							<!-- Candidate Card -->
							<div class="bg-surface rounded-2xl p-4 shadow-xs hover:shadow-md transition-shadow border border-slate-200/60 dark:border-slate-800/60 group">
								<div class="flex justify-between items-start mb-3">
									<div class="flex items-center gap-3">
										<div class="w-10 h-10 rounded-full overflow-hidden border border-slate-200 flex-shrink-0">
											<img src={candidate.avatar} alt={candidate.name} class="w-full h-full object-cover" />
										</div>
										<div>
											<p class="text-sm font-bold text-on-surface group-hover:text-primary transition-colors">{candidate.name}</p>
											<p class="text-[10px] text-on-surface-variant font-mono">{candidate.id}</p>
										</div>
									</div>
									<button 
										onclick={() => openOnboardModal(candidate)}
										class="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors cursor-pointer"
										title="Onboard ke Direktori Karyawan"
									>
										<span class="material-symbols-outlined text-lg">badge</span>
									</button>
								</div>
								
								<div class="space-y-1.5 mb-3 text-xs">
									<p class="font-bold text-on-surface flex items-center gap-1.5">
										<span class="material-symbols-outlined text-sm text-slate-400">work_outline</span>
										<span>{candidate.role}</span>
									</p>
									<p class="text-[11px] text-slate-400 flex items-center gap-1.5">
										<span class="material-symbols-outlined text-sm">schedule</span>
										<span>Pengalaman: {candidate.experience}</span>
									</p>
								</div>

								<div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
									<span class="text-[10px] font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md">
										{candidate.status}
									</span>
									<button
										onclick={() => openOnboardModal(candidate)}
										class="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
									>
										<span>Onboard</span>
										<span class="material-symbols-outlined text-xs">arrow_forward</span>
									</button>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>

<!-- Modal Onboard Karyawan Baru -->
{#if showOnboardModal && selectedCandidateForOnboard}
	<div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
		<div class="bg-surface rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-150">
			<div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
				<div class="flex items-center gap-2.5">
					<div class="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
						<span class="material-symbols-outlined text-xl">how_to_reg</span>
					</div>
					<div>
						<h3 class="font-bold text-sm text-on-surface">Onboard ke Direktori Karyawan</h3>
						<p class="text-[11px] text-on-surface-variant">Konversi pelamar terpilih menjadi staf/driver aktif BCS</p>
					</div>
				</div>
				<button onclick={() => (showOnboardModal = false)} class="text-slate-400 hover:text-slate-600 cursor-pointer">
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>

			<div class="space-y-3 text-xs">
				<div class="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
					<p class="text-slate-400 text-[11px]">Nama Kandidat:</p>
					<p class="font-bold text-sm text-on-surface">{selectedCandidateForOnboard.name}</p>
					<p class="text-primary font-semibold">{selectedCandidateForOnboard.role}</p>
				</div>

				<div class="space-y-1">
					<label class="font-bold text-on-surface block">Nomor Induk Karyawan (NIK Otomatis)</label>
					<input type="text" bind:value={assignedNik} class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 font-mono font-bold text-primary" />
				</div>

				<div class="space-y-1">
					<label class="font-bold text-on-surface block">Penempatan Lokasi / Pool</label>
					<select bind:value={assignedPool} class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 font-semibold cursor-pointer">
						<option value="Pool Cilegon Utama">Pool Cilegon Utama</option>
						<option value="Pool Gunung Putri">Pool Gunung Putri</option>
						<option value="Workshop Cilegon">Workshop Cilegon</option>
						<option value="Kantor Pusat Jakarta">Kantor Pusat Jakarta</option>
					</select>
				</div>

				<div class="space-y-1">
					<label class="font-bold text-on-surface block">Divisi Kepegawaian</label>
					<select bind:value={assignedDivision} class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 font-semibold cursor-pointer">
						<option value="Logistik & Operasional Armada">Logistik & Operasional Armada (Driver)</option>
						<option value="Workshop & Pemeliharaan Armada">Workshop & Pemeliharaan Armada (Mekanik)</option>
						<option value="Operational Control Room (OCS)">Operational Control Room (OCS Dispatcher)</option>
						<option value="Head Office & Finance">Head Office & Finance</option>
					</select>
				</div>
			</div>

			<div class="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
				<button
					onclick={() => (showOnboardModal = false)}
					class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 cursor-pointer"
				>
					Batal
				</button>
				<button
					onclick={confirmOnboard}
					class="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 cursor-pointer shadow-xs flex items-center gap-1.5"
				>
					<span class="material-symbols-outlined text-sm">check</span>
					<span>Terbitkan NIK & Onboard</span>
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.hide-scrollbar::-webkit-scrollbar {
		display: none;
	}
	.hide-scrollbar {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}
</style>

