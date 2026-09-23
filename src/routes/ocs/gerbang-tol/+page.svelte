<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	// State pencarian dan filter
	let searchQuery = $state('');
	let selectedRuas = $state('ALL');
	let currentPage = $state(1);
	let pageSize = $state(15);

	// State modal form (Tambah / Edit)
	let showModal = $state(false);
	let isEditing = $state(false);
	let isSubmitting = $state(false);

	// Form fields
	let formId = $state<number | null>(null);
	let formRuas = $state('');
	let formAsal = $state('');
	let formTujuan = $state('');
	let formTarif1 = $state<number | string>(0);
	let formTarif23 = $state<number | string>(0);
	let formTarif45 = $state<number | string>(0);

	// State modal konfirmasi hapus
	let showDeleteModal = $state(false);
	let gateToDelete = $state<any>(null);
	let isDeleting = $state(false);

	// Notification feedback
	let bannerMessage = $state<{ type: 'success' | 'error'; text: string } | null>(null);

	// Helper currency formatter
	function formatRupiah(amount: number | string | null | undefined): string {
		const val = Number(amount) || 0;
		return new Intl.NumberFormat('id-ID', {
			style: 'currency',
			currency: 'IDR',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(val);
	}

	// Filtered list
	let filteredList = $derived.by(() => {
		let list = data.gerbangTols || [];

		if (selectedRuas !== 'ALL') {
			list = list.filter((g: any) => g.ruas === selectedRuas);
		}

		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase().trim();
			list = list.filter((g: any) =>
				(g.ruas && g.ruas.toLowerCase().includes(q)) ||
				(g.asal && g.asal.toLowerCase().includes(q)) ||
				(g.tujuan && g.tujuan.toLowerCase().includes(q))
			);
		}

		return list;
	});

	// Pagination calculations
	let totalPages = $derived(Math.max(1, Math.ceil(filteredList.length / pageSize)));
	let paginatedList = $derived.by(() => {
		const start = (currentPage - 1) * pageSize;
		return filteredList.slice(start, start + pageSize);
	});

	// Reset page saat filter/search berubah
	$effect(() => {
		// Akses dependency filter
		const _ = searchQuery + selectedRuas + pageSize;
		currentPage = 1;
	});

	// Sinkronisasi feedback form dari server
	$effect(() => {
		if (form) {
			if (form.success) {
				bannerMessage = { type: 'success', text: form.message || 'Operasi berhasil!' };
				showModal = false;
				showDeleteModal = false;
				gateToDelete = null;
			} else if (form.message) {
				bannerMessage = { type: 'error', text: form.message };
			}
		}
	});

	function openCreateModal() {
		isEditing = false;
		formId = null;
		formRuas = selectedRuas !== 'ALL' ? selectedRuas : '';
		formAsal = '';
		formTujuan = '';
		formTarif1 = 0;
		formTarif23 = 0;
		formTarif45 = 0;
		showModal = true;
	}

	function openEditModal(gate: any) {
		isEditing = true;
		formId = gate.id;
		formRuas = gate.ruas || '';
		formAsal = gate.asal || '';
		formTujuan = gate.tujuan || '';
		formTarif1 = Number(gate.tarif_gol_1) || 0;
		formTarif23 = Number(gate.tarif_gol_2_3) || 0;
		formTarif45 = Number(gate.tarif_gol_4_5) || 0;
		showModal = true;
	}

	function openDeleteConfirm(gate: any) {
		gateToDelete = gate;
		showDeleteModal = true;
	}

	function isGateUsed(id: number): boolean {
		return (data.usedGateIds || []).includes(id);
	}
</script>

<svelte:head>
	<title>Master Gerbang Tol | OCS ERP BCS</title>
</svelte:head>

<div class="space-y-6">
	<!-- Page Header -->
	<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
		<div>
			<div class="flex items-center gap-2 mb-1">
				<span class="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">Master Data Operasional</span>
				<span class="text-slate-300 dark:text-slate-700">•</span>
				<span class="text-xs text-on-surface-variant font-medium">OCS Module</span>
			</div>
			<h1 class="text-2xl font-black text-on-surface tracking-tight flex items-center gap-2">
				<span class="material-symbols-outlined text-sky-600 dark:text-sky-400 text-[28px]">toll</span>
				Master Gerbang Tol
			</h1>
			<p class="text-xs text-on-surface-variant mt-1">
				Database ruas jalan tol, titik gerbang asal-tujuan, dan konfigurasi tarif golongan truk operasional.
			</p>
		</div>

		<div class="flex items-center gap-2">
			<a
				href="/ocs/rute"
				class="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-surface-container-lowest text-xs font-bold text-on-surface hover:bg-surface-container transition-colors flex items-center gap-2 shadow-2xs"
			>
				<span class="material-symbols-outlined text-[18px]">route</span>
				Buka Master Rute & UJO
			</a>
			<button
				onclick={openCreateModal}
				class="bg-sky-600 hover:bg-sky-700 active:scale-98 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
			>
				<span class="material-symbols-outlined text-[18px]">add</span>
				Tambah Gerbang Tol
			</button>
		</div>
	</div>

	<!-- Alert Banner Feedback -->
	{#if bannerMessage}
		<div
			class="px-4 py-3 rounded-xl text-xs font-medium flex items-center justify-between transition-all {bannerMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800'}"
		>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-[18px]">
					{bannerMessage.type === 'success' ? 'check_circle' : 'error'}
				</span>
				<span>{bannerMessage.text}</span>
			</div>
			<button
				onclick={() => { bannerMessage = null; }}
				class="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
				aria-label="Tutup pesan"
			>
				<span class="material-symbols-outlined text-[16px]">close</span>
			</button>
		</div>
	{/if}

	<!-- KPI Metric Cards -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<!-- Total Gerbang -->
		<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 transition-all hover:border-sky-500/30 shadow-2xs">
			<div class="flex items-center justify-between mb-2">
				<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Gerbang Tol</span>
				<div class="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
					<span class="material-symbols-outlined text-[20px]">toll</span>
				</div>
			</div>
			<div class="text-2xl font-black text-on-surface">{data.stats?.totalGerbang ?? 0}</div>
			<p class="text-[11px] text-on-surface-variant mt-1">Titik asal & tujuan terdata</p>
		</div>

		<!-- Total Ruas -->
		<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 transition-all hover:border-indigo-500/30 shadow-2xs">
			<div class="flex items-center justify-between mb-2">
				<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Ruas Jalan Tol</span>
				<div class="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
					<span class="material-symbols-outlined text-[20px]">alt_route</span>
				</div>
			</div>
			<div class="text-2xl font-black text-on-surface">{data.stats?.totalRuas ?? 0}</div>
			<p class="text-[11px] text-on-surface-variant mt-1">Koridor tol terdaftar</p>
		</div>

		<!-- Rata-rata Tarif Truk Gol 2-3 -->
		<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 transition-all hover:border-emerald-500/30 shadow-2xs">
			<div class="flex items-center justify-between mb-2">
				<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Rata-rata Gol 2 & 3</span>
				<div class="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
					<span class="material-symbols-outlined text-[20px]">local_shipping</span>
				</div>
			</div>
			<div class="text-2xl font-black text-on-surface">{formatRupiah(data.stats?.avgTarifGol23 ?? 0)}</div>
			<p class="text-[11px] text-on-surface-variant mt-1">Tarif rata-rata armada BCS</p>
		</div>

		<!-- Tarif Maksimum -->
		<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 transition-all hover:border-amber-500/30 shadow-2xs">
			<div class="flex items-center justify-between mb-2">
				<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Tarif Tertinggi</span>
				<div class="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
					<span class="material-symbols-outlined text-[20px]">payments</span>
				</div>
			</div>
			<div class="text-2xl font-black text-on-surface">{formatRupiah(data.stats?.maxTarif ?? 0)}</div>
			<p class="text-[11px] text-on-surface-variant mt-1">Batas atas tarif terjauh</p>
		</div>
	</div>

	<!-- Filter & Search Bar -->
	<div class="p-4 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 shadow-2xs">
		<div class="flex flex-col sm:flex-row items-center justify-between gap-3">
			<div class="flex flex-1 w-full sm:w-auto items-center gap-3">
				<!-- Search Input -->
				<div class="flex-1 flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 focus-within:ring-2 focus-within:ring-sky-500/20 focus-within:border-sky-500">
					<span class="material-symbols-outlined text-on-surface-variant text-[18px]">search</span>
					<input
						type="text"
						bind:value={searchQuery}
						placeholder="Cari ruas, asal, atau tujuan gerbang tol..."
						class="bg-transparent text-xs text-on-surface outline-none w-full placeholder:text-on-surface-variant/50"
					/>
					{#if searchQuery}
						<button onclick={() => { searchQuery = ''; }} class="text-on-surface-variant hover:text-on-surface text-[14px]">
							<span class="material-symbols-outlined text-[16px]">close</span>
						</button>
					{/if}
				</div>

				<!-- Dropdown Filter Ruas -->
				<div class="w-56">
					<select
						bind:value={selectedRuas}
						class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-xs text-on-surface outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-medium"
					>
						<option value="ALL">Semua Ruas ({data.ruasList?.length || 0})</option>
						{#each data.ruasList as ruas}
							<option value={ruas}>{ruas}</option>
						{/each}
					</select>
				</div>
			</div>

			<!-- Page Size & Counter -->
			<div class="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
				<span class="text-xs text-on-surface-variant font-medium">
					Ditemukan <strong class="text-on-surface">{filteredList.length}</strong> data
				</span>
				<div class="h-4 w-[1px] bg-slate-200 dark:border-slate-800"></div>
				<select
					bind:value={pageSize}
					class="px-2.5 py-1.5 rounded-lg bg-surface-container-low border border-slate-200 dark:border-slate-800 text-xs text-on-surface outline-none font-medium"
				>
					<option value={15}>15 / hal</option>
					<option value={25}>25 / hal</option>
					<option value={50}>50 / hal</option>
					<option value={100}>100 / hal</option>
				</select>
			</div>
		</div>
	</div>

	<!-- Data Table -->
	<div class="rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 overflow-hidden shadow-2xs">
		<div class="overflow-x-auto">
			<table class="w-full text-left border-collapse text-xs">
				<thead>
					<tr class="bg-surface-container-low/70 border-b border-slate-200 dark:border-slate-800 text-on-surface-variant font-bold uppercase tracking-wider text-[10px]">
						<th class="py-3 px-4 w-12 text-center">No</th>
						<th class="py-3 px-4 min-w-[180px]">Ruas Tol</th>
						<th class="py-3 px-4 min-w-[200px]">Gerbang Asal → Tujuan</th>
						<th class="py-3 px-4 text-right min-w-[110px]">Gol. I</th>
						<th class="py-3 px-4 text-right min-w-[120px]">Gol. II & III</th>
						<th class="py-3 px-4 text-right min-w-[120px]">Gol. IV & V</th>
						<th class="py-3 px-4 text-center min-w-[120px]">Status Rute</th>
						<th class="py-3 px-4 text-center w-24">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
					{#if paginatedList.length === 0}
						<tr>
							<td colspan="8" class="text-center py-12 text-on-surface-variant">
								<div class="flex flex-col items-center justify-center gap-2">
									<div class="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
										<span class="material-symbols-outlined text-[24px]">toll</span>
									</div>
									<p class="font-bold text-sm text-on-surface">Tidak ada gerbang tol yang sesuai</p>
									<p class="text-xs text-on-surface-variant/70">Coba ubah kata kunci pencarian atau filter ruas tol.</p>
								</div>
							</td>
						</tr>
					{:else}
						{#each paginatedList as gate, idx}
							{@const isUsed = isGateUsed(gate.id)}
							<tr class="hover:bg-surface-container-low/50 transition-colors">
								<td class="py-3.5 px-4 text-center text-on-surface-variant font-mono">
									{(currentPage - 1) * pageSize + idx + 1}
								</td>
								<td class="py-3.5 px-4 font-semibold text-on-surface">
									<div class="flex items-center gap-1.5">
										<span class="material-symbols-outlined text-[15px] text-sky-600 dark:text-sky-400">add_road</span>
										<span>{gate.ruas || '-'}</span>
									</div>
								</td>
								<td class="py-3.5 px-4">
									<div class="flex items-center gap-1.5 font-medium text-on-surface">
										<span class="font-bold text-slate-800 dark:text-slate-100">{gate.asal || '-'}</span>
										<span class="material-symbols-outlined text-[14px] text-slate-400">arrow_forward</span>
										<span class="font-bold text-slate-800 dark:text-slate-100">{gate.tujuan || '-'}</span>
									</div>
								</td>
								<td class="py-3.5 px-4 text-right font-mono text-on-surface-variant">
									{formatRupiah(gate.tarif_gol_1)}
								</td>
								<td class="py-3.5 px-4 text-right font-mono font-bold text-sky-700 dark:text-sky-300">
									{formatRupiah(gate.tarif_gol_2_3)}
								</td>
								<td class="py-3.5 px-4 text-right font-mono font-bold text-indigo-700 dark:text-indigo-300">
									{formatRupiah(gate.tarif_gol_4_5)}
								</td>
								<td class="py-3.5 px-4 text-center">
									{#if isUsed}
										<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
											<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
											Dipakai di Rute
										</span>
									{:else}
										<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
											Tersedia
										</span>
									{/if}
								</td>
								<td class="py-3.5 px-4 text-center">
									<div class="flex items-center justify-center gap-1">
										<!-- Edit Button -->
										<button
											onclick={() => openEditModal(gate)}
											class="p-1.5 rounded-lg hover:bg-sky-50 dark:hover:bg-sky-950/50 text-sky-600 dark:text-sky-400 transition-colors cursor-pointer"
											title="Edit Gerbang Tol"
										>
											<span class="material-symbols-outlined text-[17px]">edit</span>
										</button>
										<!-- Delete Button -->
										<button
											onclick={() => openDeleteConfirm(gate)}
											class="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
											title={isUsed ? 'Gerbang tol terhubung dengan rute UJO' : 'Hapus Gerbang Tol'}
										>
											<span class="material-symbols-outlined text-[17px]">delete</span>
										</button>
									</div>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>

		<!-- Pagination Bar -->
		{#if totalPages > 1}
			<div class="px-4 py-3 bg-surface-container-low/50 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
				<span class="text-on-surface-variant">
					Menampilkan <strong class="text-on-surface">{(currentPage - 1) * pageSize + 1}</strong> - <strong class="text-on-surface">{Math.min(currentPage * pageSize, filteredList.length)}</strong> dari <strong class="text-on-surface">{filteredList.length}</strong> gerbang
				</span>

				<div class="flex items-center gap-1">
					<button
						onclick={() => { currentPage = Math.max(1, currentPage - 1); }}
						disabled={currentPage === 1}
						class="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-surface-container-lowest hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold flex items-center gap-1 transition-colors"
					>
						<span class="material-symbols-outlined text-[16px]">chevron_left</span>
						Sebelumnya
					</button>

					<div class="flex items-center gap-1 px-2">
						<span class="font-bold text-on-surface">{currentPage}</span>
						<span class="text-on-surface-variant">/</span>
						<span class="text-on-surface-variant">{totalPages}</span>
					</div>

					<button
						onclick={() => { currentPage = Math.min(totalPages, currentPage + 1); }}
						disabled={currentPage === totalPages}
						class="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-surface-container-lowest hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold flex items-center gap-1 transition-colors"
					>
						Berikutnya
						<span class="material-symbols-outlined text-[16px]">chevron_right</span>
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>

<!-- Modal Form Tambah / Edit Gerbang Tol -->
{#if showModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<!-- Backdrop -->
		<div class="absolute inset-0 bg-slate-900/50 backdrop-blur-xs" onclick={() => { if (!isSubmitting) showModal = false; }}></div>

		<!-- Dialog Body -->
		<div class="relative w-full max-w-xl bg-surface-container-lowest rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
			<!-- Modal Header -->
			<div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-surface-container-low/40">
				<div class="flex items-center gap-2.5">
					<div class="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
						<span class="material-symbols-outlined text-[18px]">{isEditing ? 'edit' : 'add'}</span>
					</div>
					<div>
						<h3 class="text-sm font-bold text-on-surface">
							{isEditing ? 'Edit Data Gerbang Tol' : 'Tambah Gerbang Tol Baru'}
						</h3>
						<p class="text-[11px] text-on-surface-variant">
							{isEditing ? 'Perbarui informasi ruas, titik asal/tujuan, atau tarif golongan.' : 'Masukkan titik gerbang dan besaran tarif tol per golongan kendaraan.'}
						</p>
					</div>
				</div>
				<button
					type="button"
					onclick={() => { showModal = false; }}
					disabled={isSubmitting}
					class="w-7 h-7 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors cursor-pointer"
				>
					<span class="material-symbols-outlined text-[18px]">close</span>
				</button>
			</div>

			<!-- Form -->
			<form
				method="POST"
				action={isEditing ? '?/update' : '?/create'}
				use:enhance={() => {
					isSubmitting = true;
					return async ({ update }) => {
						isSubmitting = false;
						await update();
					};
				}}
				class="p-6 space-y-4"
			>
				{#if isEditing}
					<input type="hidden" name="id" value={formId} />
				{/if}

				<!-- Ruas Jalan Tol -->
				<div>
					<label for="modal-ruas" class="block text-xs font-bold text-on-surface mb-1">
						Nama Ruas Tol <span class="text-rose-500">*</span>
					</label>
					<input
						id="modal-ruas"
						type="text"
						name="ruas"
						list="ruas-datalist"
						bind:value={formRuas}
						placeholder="Misal: Cikampek-Palimanan, Jagorawi, Trans Jawa..."
						required
						class="w-full px-3.5 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-xs text-on-surface outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
					/>
					<datalist id="ruas-datalist">
						{#each data.ruasList as r}
							<option value={r}></option>
						{/each}
					</datalist>
					<p class="text-[10px] text-on-surface-variant/70 mt-1">
						Pilih dari daftar ruas yang sudah ada atau ketik nama ruas baru.
					</p>
				</div>

				<!-- Asal & Tujuan (Grid 2 Kolom) -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div>
						<label for="modal-asal" class="block text-xs font-bold text-on-surface mb-1">
							Gerbang Asal (Masuk) <span class="text-rose-500">*</span>
						</label>
						<input
							id="modal-asal"
							type="text"
							name="asal"
							bind:value={formAsal}
							placeholder="Misal: Cawang, Kalihurip..."
							required
							class="w-full px-3.5 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-xs text-on-surface outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
						/>
					</div>

					<div>
						<label for="modal-tujuan" class="block text-xs font-bold text-on-surface mb-1">
							Gerbang Tujuan (Keluar) <span class="text-rose-500">*</span>
						</label>
						<input
							id="modal-tujuan"
							type="text"
							name="tujuan"
							bind:value={formTujuan}
							placeholder="Misal: Pluit, Ciawi, Dawuan..."
							required
							class="w-full px-3.5 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-xs text-on-surface outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
						/>
					</div>
				</div>

				<!-- Bagian Tarif Tol per Golongan -->
				<div class="pt-2 border-t border-slate-200 dark:border-slate-800">
					<p class="text-[10px] font-black text-on-surface-variant/60 uppercase tracking-wider mb-3">
						Konfigurasi Tarif per Golongan Kendaraan (IDR)
					</p>

					<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
						<!-- Golongan 1 -->
						<div class="p-3 rounded-xl bg-surface-container-low/60 border border-slate-200/60 dark:border-slate-800/60">
							<label for="modal-tarif-1" class="block text-[11px] font-bold text-on-surface mb-0.5">
								Golongan I
							</label>
							<span class="text-[9px] text-on-surface-variant/70 block mb-1.5">Sedan, Jip, Pick Up, Bus</span>
							<input
								id="modal-tarif-1"
								type="number"
								name="tarif_gol_1"
								min="0"
								step="500"
								bind:value={formTarif1}
								class="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-lowest border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold text-on-surface outline-none focus:border-sky-500"
							/>
						</div>

						<!-- Golongan 2 & 3 -->
						<div class="p-3 rounded-xl bg-sky-50/50 dark:bg-sky-950/20 border border-sky-200/60 dark:border-sky-800/60">
							<label for="modal-tarif-23" class="block text-[11px] font-bold text-sky-800 dark:text-sky-300 mb-0.5">
								Golongan II & III
							</label>
							<span class="text-[9px] text-sky-600/70 dark:text-sky-400/70 block mb-1.5">Truk 2 As & 3 As (Utama BCS)</span>
							<input
								id="modal-tarif-23"
								type="number"
								name="tarif_gol_2_3"
								min="0"
								step="500"
								bind:value={formTarif23}
								class="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-lowest border border-sky-300 dark:border-sky-700 text-xs font-mono font-bold text-sky-900 dark:text-sky-200 outline-none focus:border-sky-500"
							/>
						</div>

						<!-- Golongan 4 & 5 -->
						<div class="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-800/60">
							<label for="modal-tarif-45" class="block text-[11px] font-bold text-indigo-800 dark:text-indigo-300 mb-0.5">
								Golongan IV & V
							</label>
							<span class="text-[9px] text-indigo-600/70 dark:text-indigo-400/70 block mb-1.5">Truk 4 As, 5 As / Lebih</span>
							<input
								id="modal-tarif-45"
								type="number"
								name="tarif_gol_4_5"
								min="0"
								step="500"
								bind:value={formTarif45}
								class="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-lowest border border-indigo-300 dark:border-indigo-700 text-xs font-mono font-bold text-indigo-900 dark:text-indigo-200 outline-none focus:border-indigo-500"
							/>
						</div>
					</div>
				</div>

				<!-- Modal Actions -->
				<div class="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
					<button
						type="button"
						onclick={() => { showModal = false; }}
						disabled={isSubmitting}
						class="px-4 py-2 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
					>
						Batal
					</button>
					<button
						type="submit"
						disabled={isSubmitting}
						class="bg-sky-600 hover:bg-sky-700 active:scale-98 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
					>
						{#if isSubmitting}
							<span class="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
							Menyimpan...
						{:else}
							<span class="material-symbols-outlined text-[16px]">save</span>
							{isEditing ? 'Simpan Perubahan' : 'Tambahkan Gerbang'}
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Modal Konfirmasi Hapus -->
{#if showDeleteModal && gateToDelete}
	{@const isUsed = isGateUsed(gateToDelete.id)}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<!-- Backdrop -->
		<div class="absolute inset-0 bg-slate-900/50 backdrop-blur-xs" onclick={() => { if (!isDeleting) showDeleteModal = false; }}></div>

		<!-- Dialog Body -->
		<div class="relative w-full max-w-md bg-surface-container-lowest rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
			<div class="p-6">
				<div class="flex items-start gap-3.5">
					<div class="w-10 h-10 rounded-xl {isUsed ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'} flex items-center justify-center flex-shrink-0">
						<span class="material-symbols-outlined text-[22px]">
							{isUsed ? 'warning' : 'delete_forever'}
						</span>
					</div>
					<div>
						<h3 class="text-sm font-bold text-on-surface">
							{isUsed ? 'Gerbang Tol Tidak Dapat Dihapus' : 'Konfirmasi Hapus Gerbang Tol'}
						</h3>
						<p class="text-xs text-on-surface-variant mt-1">
							{#if isUsed}
								Gerbang tol <strong class="text-on-surface">{gateToDelete.asal} → {gateToDelete.tujuan}</strong> ({gateToDelete.ruas}) sedang terhubung dengan <strong>Master Rute UJO</strong> aktif.
								Untuk menjaga keutuhan kalkulasi tarif rute, data ini tidak boleh dihapus.
							{:else}
								Apakah Anda yakin ingin menghapus gerbang tol <strong class="text-on-surface">{gateToDelete.asal} → {gateToDelete.tujuan}</strong> pada ruas <em>{gateToDelete.ruas}</em>?
								Tindakan ini tidak dapat dibatalkan.
							{/if}
						</p>
					</div>
				</div>

				<div class="mt-6 flex items-center justify-end gap-2">
					<button
						type="button"
						onclick={() => { showDeleteModal = false; }}
						disabled={isDeleting}
						class="px-4 py-2 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
					>
						{isUsed ? 'Tutup' : 'Batal'}
					</button>

					{#if !isUsed}
						<form
							method="POST"
							action="?/delete"
							use:enhance={() => {
								isDeleting = true;
								return async ({ update }) => {
									isDeleting = false;
									await update();
								};
							}}
						>
							<input type="hidden" name="id" value={gateToDelete.id} />
							<button
								type="submit"
								disabled={isDeleting}
								class="bg-rose-600 hover:bg-rose-700 active:scale-98 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
							>
								{#if isDeleting}
									<span class="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
									Menghapus...
								{:else}
									<span class="material-symbols-outlined text-[16px]">delete</span>
									Ya, Hapus
								{/if}
							</button>
						</form>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}
