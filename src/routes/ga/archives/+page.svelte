<script lang="ts">
	import { enhance } from '$app/forms';
	import Pagination from '$lib/components/Pagination.svelte';

	let { data } = $props();

	let activeTab = $state<'CATALOG' | 'RACKS'>('CATALOG');
	let searchQuery = $state('');
	let rackFilter = $state('All');
	let shelfFilter = $state('All');
	let deptFilter = $state('All');
	let retentionFilter = $state('All');

	let isCreateArchiveOpen = $state(false);
	let isCreateRackOpen = $state(false);
	let selectedRackForForm = $state<number>(data.racks[0]?.id || 1);

	const availableShelvesForFilter = $derived(
		rackFilter === 'All'
			? data.shelves
			: data.shelves.filter((s: any) => String(s.rack_id) === String(rackFilter))
	);

	const availableShelvesForForm = $derived(
		data.shelves.filter((s: any) => Number(s.rack_id) === Number(selectedRackForForm))
	);

	function jumpToShelf(rackId: number, shelfId?: number) {
		rackFilter = String(rackId);
		shelfFilter = shelfId ? String(shelfId) : 'All';
		activeTab = 'CATALOG';
	}

	const filteredArchives = $derived(
		data.archives.filter((a: any) => {
			const q = searchQuery.toLowerCase();
			const matchQ =
				!q ||
				a.document_name?.toLowerCase().includes(q) ||
				a.archive_number?.toLowerCase().includes(q) ||
				a.department?.toLowerCase().includes(q) ||
				String(a.document_year).includes(q);
			const matchRack = rackFilter === 'All' || String(a.rack_id) === String(rackFilter);
			const matchShelf = shelfFilter === 'All' || String(a.shelf_id) === String(shelfFilter);
			const matchDept = deptFilter === 'All' || a.department === deptFilter;
			const matchRet =
				retentionFilter === 'All' ||
				(retentionFilter === 'DUE' && a.is_due_destruction && a.status === 'aktif') ||
				(retentionFilter === 'ACTIVE' && !a.is_due_destruction && a.status === 'aktif');
			return matchQ && matchRack && matchShelf && matchDept && matchRet;
		})
	);

	let currentPage = $state(1);
	const perPage = 15;
	const totalPages = $derived(Math.max(1, Math.ceil(filteredArchives.length / perPage)));
	const paginatedArchives = $derived(
		filteredArchives.slice((currentPage - 1) * perPage, currentPage * perPage)
	);

	$effect(() => {
		const _ = [searchQuery, rackFilter, shelfFilter, deptFilter, retentionFilter];
		currentPage = 1;
	});
</script>

<svelte:head>
	<title>Document Archive | General Affair | ERP BCS</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/60 dark:border-slate-800/60 pb-5">
		<div>
			<div class="flex items-center gap-2 text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest mb-1">
				<span class="material-symbols-outlined text-sm">inventory</span>
				<span>General Affair • Penyimpanan & Retensi Berkas Fisik</span>
			</div>
			<h1 class="text-3xl font-black text-on-surface tracking-tight">Document Archive (Gudang Arsip)</h1>
			<p class="text-xs text-on-surface-variant mt-1">
				Manajemen penempatan box dokumen fisik per Rak & Lantai, kontrol masa retensi simpan, dan jadwal pemusnahan berkas lintas departemen.
			</p>
		</div>

		<div class="flex items-center gap-2.5 self-start md:self-auto">
			<button
				onclick={() => (isCreateArchiveOpen = true)}
				class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
			>
				<span class="material-symbols-outlined text-base">add_box</span>
				<span>+ Registrasi Berkas Arsip</span>
			</button>
			<button
				onclick={() => (isCreateRackOpen = true)}
				class="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-bold border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
			>
				<span class="material-symbols-outlined text-base text-teal-600">shelves</span>
				<span>+ Tambah Rak</span>
			</button>
		</div>
	</div>

	<!-- KPI Cards -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70">
			<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Berkas Tersimpan</span>
			<div class="text-2xl font-black text-on-surface mt-1">
				{data.stats.totalDocs} <span class="text-sm font-normal text-on-surface-variant">bundel/box</span>
			</div>
			<p class="text-[11px] text-teal-600 font-semibold mt-1">
				{data.stats.activeDocs} berstatus aktif di gudang
			</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-lowest border border-amber-300 dark:border-amber-900/60 bg-gradient-to-br from-amber-50/30 to-transparent">
			<div class="flex items-center justify-between">
				<span class="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Jatuh Tempo Pemusnahan</span>
				{#if data.stats.dueDestructionCount > 0}
					<span class="w-2.5 h-2.5 rounded-full bg-amber-600 animate-ping"></span>
				{/if}
			</div>
			<div class="text-2xl font-black text-amber-700 dark:text-amber-400 mt-1">
				{data.stats.dueDestructionCount} <span class="text-sm font-normal text-on-surface-variant">berkas</span>
			</div>
			<p class="text-[11px] text-amber-700 font-medium mt-1">
				Melewati masa retensi simpan
			</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70">
			<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Kapasitas Rak & Lantai</span>
			<div class="text-2xl font-black text-cyan-600 mt-1">
				{data.stats.totalRacks} <span class="text-sm font-normal text-on-surface-variant">Rak ({data.stats.totalShelves} Lantai)</span>
			</div>
			<p class="text-[11px] text-on-surface-variant mt-1">
				Struktur Rak 1 s/d Rak 10 (LT 1 - LT 5)
			</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70">
			<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Departemen Pemilik Arsip</span>
			<div class="text-2xl font-black text-indigo-600 mt-1">
				{data.departments.length} <span class="text-sm font-normal text-on-surface-variant">divisi/dept</span>
			</div>
			<p class="text-[11px] text-on-surface-variant mt-1 truncate">
				Finance, Procurement, HRD, Transport, dll.
			</p>
		</div>
	</div>

	<!-- Tab Switcher -->
	<div class="flex items-center gap-2 border-b border-slate-200/60 dark:border-slate-800/60 pb-2">
		<button
			onclick={() => (activeTab = 'CATALOG')}
			class="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer {activeTab === 'CATALOG'
				? 'bg-teal-600 text-white shadow-xs'
				: 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'}"
		>
			<span class="material-symbols-outlined text-[17px]">folder_Special</span>
			<span>Katalog Berkas Arsip ({filteredArchives.length})</span>
		</button>

		<button
			onclick={() => (activeTab = 'RACKS')}
			class="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer {activeTab === 'RACKS'
				? 'bg-teal-600 text-white shadow-xs'
				: 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'}"
		>
			<span class="material-symbols-outlined text-[17px]">shelves</span>
			<span>Visualisasi Kapasitas Rak & Lantai ({data.racks.length} Rak)</span>
		</button>
	</div>

	<!-- TAB 1: KATALOG BERKAS ARSIP -->
	{#if activeTab === 'CATALOG'}
		<div class="flex flex-col lg:flex-row gap-3 items-center justify-between p-4 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 shadow-2xs">
			<div class="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-surface-container-low w-full lg:w-80 focus-within:ring-2 focus-within:ring-teal-500/20 transition-all">
				<span class="material-symbols-outlined text-on-surface-variant text-[18px]">search</span>
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Cari no arsip, nama dokumen, tahun..."
					class="bg-transparent text-xs text-on-surface border-0 outline-none w-full placeholder:text-on-surface-variant/50 focus:ring-0"
				/>
			</div>

			<div class="flex flex-wrap items-center gap-2 w-full lg:w-auto">
				<select
					bind:value={rackFilter}
					onchange={() => (shelfFilter = 'All')}
					class="px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-teal-500/20 text-xs text-on-surface font-medium cursor-pointer"
				>
					<option value="All">Semua Rak</option>
					{#each data.racks as r (r.id)}
						<option value={String(r.id)}>{r.rack_name} ({r.doc_count})</option>
					{/each}
				</select>

				<select
					bind:value={shelfFilter}
					class="px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-teal-500/20 text-xs text-on-surface font-medium cursor-pointer"
				>
					<option value="All">Semua Lantai</option>
					{#each availableShelvesForFilter as s (s.id)}
						<option value={String(s.id)}>{s.rack_name} - {s.shelf_name} ({s.doc_count})</option>
					{/each}
				</select>

				<select
					bind:value={deptFilter}
					class="px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-teal-500/20 text-xs text-on-surface font-medium cursor-pointer"
				>
					<option value="All">Semua Departemen</option>
					{#each data.departments as d}
						<option value={d}>{d}</option>
					{/each}
				</select>

				<select
					bind:value={retentionFilter}
					class="px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-teal-500/20 text-xs text-on-surface font-medium cursor-pointer"
				>
					<option value="All">Semua Status Retensi</option>
					<option value="DUE">Jatuh Tempo Pemusnahan ({data.stats.dueDestructionCount})</option>
					<option value="ACTIVE">Masa Simpan Aktif</option>
				</select>
			</div>
		</div>

		<div class="rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 shadow-2xs overflow-hidden">
			<div class="overflow-x-auto">
				<table class="w-full text-left text-xs">
					<thead class="bg-surface-container-low text-on-surface-variant uppercase text-[10px] font-bold tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
						<tr>
							<th class="py-3 px-4">No. Arsip</th>
							<th class="py-3 px-4">Lokasi Rak & Lantai</th>
							<th class="py-3 px-4">Departemen</th>
							<th class="py-3 px-4">Nama Dokumen / Bundel</th>
							<th class="py-3 px-4 text-center">Tahun Dokumen</th>
							<th class="py-3 px-4 text-center">Retensi</th>
							<th class="py-3 px-4 text-center">Jadwal Pemusnahan</th>
							<th class="py-3 px-4 text-center">Status</th>
							<th class="py-3 px-4 text-center">Aksi</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
						{#each paginatedArchives as a (a.id)}
							<tr class="hover:bg-surface-container transition-colors">
								<td class="py-3 px-4 font-mono font-black text-on-surface">
									#{a.archive_number}
								</td>
								<td class="py-3 px-4 whitespace-nowrap">
									<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 font-bold text-[11px]">
										<span class="material-symbols-outlined text-[13px]">shelves</span>
										{a.rack_name} • {a.shelf_name}
									</span>
								</td>
								<td class="py-3 px-4 font-bold text-on-surface-variant">
									{a.department}
								</td>
								<td class="py-3 px-4 font-bold text-on-surface max-w-md">
									{a.document_name}
								</td>
								<td class="py-3 px-4 text-center font-mono font-bold text-on-surface">
									{a.document_year}
								</td>
								<td class="py-3 px-4 text-center font-mono text-on-surface-variant">
									{a.retention_years} thn
								</td>
								<td class="py-3 px-4 text-center whitespace-nowrap">
									{#if a.destruction_date}
										{#if a.is_due_destruction && a.status === 'aktif'}
											<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300">
												Jatuh Tempo: {a.destruction_date}
											</span>
										{:else}
											<span class="font-mono text-[11px] text-on-surface-variant">{a.destruction_date}</span>
										{/if}
									{:else}
										<span class="text-[10px] text-on-surface-variant italic">Menunggu</span>
									{/if}
								</td>
								<td class="py-3 px-4 text-center">
									<span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase {a.status === 'aktif' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-200 text-slate-700'}">
										{a.status}
									</span>
								</td>
								<td class="py-3 px-4 text-center whitespace-nowrap">
									<div class="flex items-center justify-center gap-1">
										{#if a.status === 'aktif' && a.is_due_destruction}
											<form method="POST" action="?/updateArchiveStatus" use:enhance class="inline">
												<input type="hidden" name="id" value={a.id} />
												<input type="hidden" name="status" value="dimusnahkan" />
												<button
													type="submit"
													title="Tandai Sudah Dimusnahkan"
													class="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-[10px] cursor-pointer"
												>
													Musnahkan
												</button>
											</form>
										{/if}
										<form
											method="POST"
											action="?/deleteArchive"
											use:enhance={() => {
												if (!confirm(`Hapus arsip #${a.archive_number} - ${a.document_name}?`)) return ({ cancel }: any) => cancel();
											}}
											class="inline"
										>
											<input type="hidden" name="id" value={a.id} />
											<button type="submit" class="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 cursor-pointer" title="Hapus">
												<span class="material-symbols-outlined text-[15px]">delete</span>
											</button>
										</form>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<Pagination
				currentPage={currentPage}
				totalPages={totalPages}
				totalItems={filteredArchives.length}
				perPage={perPage}
				itemLabel="berkas arsip"
				onPageChange={(p) => (currentPage = p)}
			/>
		</div>
	{/if}

	<!-- TAB 2: VISUALISASI KAPASITAS RAK & LANTAI -->
	{#if activeTab === 'RACKS'}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			{#each data.racks as rack (rack.id)}
				{@const rackShelves = data.shelves.filter((s: any) => s.rack_id === rack.id)}
				<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 shadow-2xs space-y-3">
					<div class="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60 pb-3">
						<div class="flex items-center gap-2.5">
							<div class="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center font-black">
								<span class="material-symbols-outlined text-[20px]">shelves</span>
							</div>
							<div>
								<h3 class="font-black text-sm text-on-surface">{rack.rack_name}</h3>
								<p class="text-[10px] text-on-surface-variant">{rackShelves.length} Lantai Penyimpanan</p>
							</div>
						</div>
						<button
							onclick={() => jumpToShelf(rack.id)}
							class="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold text-xs cursor-pointer"
						>
							{rack.doc_count} Berkas →
						</button>
					</div>

					<div class="space-y-1.5">
						{#each rackShelves as sh (sh.id)}
							<button
								onclick={() => jumpToShelf(rack.id, sh.id)}
								class="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors text-xs cursor-pointer"
							>
								<span class="font-bold text-on-surface">{sh.shelf_name}</span>
								<span class="font-mono text-[11px] font-bold {sh.doc_count > 0 ? 'text-teal-600' : 'text-on-surface-variant/50'}">
									{sh.doc_count} bundel
								</span>
							</button>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- MODAL: REGISTRASI BERKAS ARSIP BARU -->
{#if isCreateArchiveOpen}
	<div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
		<div class="bg-surface-container-lowest rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden">
			<div class="p-5 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
				<h3 class="font-bold text-base text-on-surface">Registrasi Berkas Arsip Baru</h3>
				<button onclick={() => (isCreateArchiveOpen = false)} class="text-on-surface-variant hover:text-on-surface cursor-pointer">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<form
				method="POST"
				action="?/createArchive"
				use:enhance={() => {
					return async ({ result, update }) => {
						await update();
						if (result.type === 'success') isCreateArchiveOpen = false;
					};
				}}
				class="p-6 space-y-3.5 text-xs"
			>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="arc_rack" class="block font-bold mb-1">Pilih Rak *</label>
						<select
							id="arc_rack"
							name="rack_id"
							bind:value={selectedRackForForm}
							class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-teal-500/20"
						>
							{#each data.racks as r (r.id)}
								<option value={r.id}>{r.rack_name}</option>
							{/each}
						</select>
					</div>
					<div>
						<label for="arc_shelf" class="block font-bold mb-1">Pilih Lantai *</label>
						<select
							id="arc_shelf"
							name="shelf_id"
							class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-teal-500/20"
						>
							{#each availableShelvesForForm as s (s.id)}
								<option value={s.id}>{s.shelf_name}</option>
							{/each}
						</select>
					</div>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="arc_no" class="block font-bold mb-1">Nomor Arsip / Box *</label>
						<input id="arc_no" type="text" name="archive_number" required placeholder="Misal: 051" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-teal-500/20 font-mono" />
					</div>
					<div>
						<label for="arc_dept" class="block font-bold mb-1">Departemen Pemilik *</label>
						<input id="arc_dept" type="text" name="department" required value="FINANCE" placeholder="FINANCE / HRD / PROCUREMENT" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-teal-500/20" />
					</div>
				</div>

				<div>
					<label for="arc_name" class="block font-bold mb-1">Nama Dokumen / Uraian Bundel *</label>
					<input id="arc_name" type="text" name="document_name" required placeholder="Misal: BDV A/P SUPPLIER JAN-MAR 2025" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-teal-500/20" />
				</div>

				<div class="grid grid-cols-3 gap-3">
					<div>
						<label for="arc_yr" class="block font-bold mb-1">Tahun Dokumen *</label>
						<input id="arc_yr" type="number" name="document_year" required value="2025" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-teal-500/20 font-mono" />
					</div>
					<div>
						<label for="arc_ret" class="block font-bold mb-1">Masa Simpan (Thn)</label>
						<input id="arc_ret" type="number" name="retention_years" value="10" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-teal-500/20 font-mono" />
					</div>
					<div>
						<label for="arc_dest" class="block font-bold mb-1">Tgl Pemusnahan</label>
						<input id="arc_dest" type="date" name="destruction_date" class="w-full px-3 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-teal-500/20" />
					</div>
				</div>

				<div class="flex justify-end gap-2 pt-3">
					<button type="button" onclick={() => (isCreateArchiveOpen = false)} class="px-4 py-2 rounded-xl bg-surface-container-low font-bold cursor-pointer">Batal</button>
					<button type="submit" class="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold cursor-pointer">Simpan Arsip</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- MODAL: TAMBAH RAK BARU -->
{#if isCreateRackOpen}
	<div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
		<div class="bg-surface-container-lowest rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden">
			<div class="p-5 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
				<h3 class="font-bold text-base text-on-surface">Tambah Rak Gudang Arsip</h3>
				<button onclick={() => (isCreateRackOpen = false)} class="text-on-surface-variant hover:text-on-surface cursor-pointer">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>
			<form
				method="POST"
				action="?/createRack"
				use:enhance={() => {
					return async ({ result, update }) => {
						await update();
						if (result.type === 'success') isCreateRackOpen = false;
					};
				}}
				class="p-6 space-y-3.5 text-xs"
			>
				<div>
					<label for="rk_name" class="block font-bold mb-1">Nama Rak *</label>
					<input id="rk_name" type="text" name="rack_name" required placeholder="Misal: Rak 11" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-teal-500/20" />
				</div>
				<div>
					<label for="rk_cnt" class="block font-bold mb-1">Jumlah Lantai Otomatis (LT 1..N)</label>
					<input id="rk_cnt" type="number" min="1" max="10" name="shelf_count" value="5" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-teal-500/20 font-mono" />
				</div>
				<div class="flex justify-end gap-2 pt-3">
					<button type="button" onclick={() => (isCreateRackOpen = false)} class="px-4 py-2 rounded-xl bg-surface-container-low font-bold cursor-pointer">Batal</button>
					<button type="submit" class="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold cursor-pointer">Buat Rak</button>
				</div>
			</form>
		</div>
	</div>
{/if}
