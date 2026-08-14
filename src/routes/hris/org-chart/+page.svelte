<script lang="ts">
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	let activeTab = $state<'tree' | 'table'>('tree');

	let selectedDir = $state(data.dirFilter);
	let selectedDiv = $state(data.divFilter);
	let selectedDept = $state(data.deptFilter);
	let searchQuery = $state(data.searchQuery);

	let selectedEmp = $state<any>(null);
	let showModal = $state(false);
	let selectedNewAtasanTitle = $state('');

	// Node collapse state
	let collapsedNodes = $state<Record<string, boolean>>({});

	function toggleCollapse(nodeId: string) {
		collapsedNodes[nodeId] = !collapsedNodes[nodeId];
	}

	function handleFilterChange() {
		const query = new URLSearchParams();
		if (selectedDir) query.set('dir', selectedDir);
		if (selectedDiv) query.set('div', selectedDiv);
		if (selectedDept) query.set('dept', selectedDept);
		if (searchQuery) query.set('search', searchQuery);

		goto(`/hris/org-chart?${query.toString()}`, { keepFocus: true, noScroll: true });
	}

	function openEditModal(emp: any) {
		selectedEmp = emp;
		selectedNewAtasanTitle = emp.atasan_title_codes?.[0] || '';
		showModal = true;
	}

	function closeModal() {
		showModal = false;
		selectedEmp = null;
		selectedNewAtasanTitle = '';
	}

	// Filter divisi berdasarkan direktorat terpilih
	let availableDivisions = $derived(
		selectedDir ? data.divisions.filter((d: any) => d.dir_code === selectedDir) : data.divisions
	);

	// Filter departemen berdasarkan divisi terpilih
	let availableDepartments = $derived(
		selectedDiv ? data.departments.filter((d: any) => d.div_code === selectedDiv) : data.departments
	);

	// Map atasan-bawahan tree structure
	// Cari top-level Executives (yang tidak punya atasan atau title_atasan paling atas)
	let groupedByDept = $derived.by(() => {
		const map: Record<string, any[]> = {};
		data.employees.forEach((emp: any) => {
			const deptKey = emp.dept_name || emp.div_name || 'Direksi & General';
			if (!map[deptKey]) map[deptKey] = [];
			map[deptKey].push(emp);
		});
		return map;
	});
</script>

<svelte:head>
	<title>Interactive Org Chart & Hierarchy | ERP BCS</title>
</svelte:head>

<div class="space-y-6">
	<!-- Top Header -->
	<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
		<div>
			<div class="flex items-center gap-2">
				<span class="material-symbols-outlined text-primary text-2xl">account_tree</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Org Chart & Hierarchy</h1>
			</div>
			<p class="text-sm text-on-surface-variant font-medium mt-0.5">
				Bagan Organisasi Interaktif & Pemetaan Hirarki Approval Atasan-Bawahan
			</p>
		</div>

		<!-- View Switcher Tabs -->
		<div class="inline-flex p-1 rounded-2xl bg-surface-container border border-slate-200 dark:border-slate-800">
			<button
				onclick={() => (activeTab = 'tree')}
				class="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer {activeTab === 'tree' ? 'bg-surface text-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}"
			>
				<span class="material-symbols-outlined text-sm">schema</span>
				<span>Visual Org Tree</span>
			</button>
			<button
				onclick={() => (activeTab = 'table')}
				class="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer {activeTab === 'table' ? 'bg-surface text-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}"
			>
				<span class="material-symbols-outlined text-sm">table_rows</span>
				<span>Tabel Hirarki Mapping</span>
			</button>
		</div>
	</div>

	<!-- Controls & Filter Bar -->
	<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 flex flex-col lg:flex-row gap-3 items-center justify-between">
		<div class="flex flex-wrap items-center gap-3 w-full lg:w-auto">
			<!-- Direktorat -->
			<div class="flex items-center gap-1.5 text-xs font-medium">
				<span class="material-symbols-outlined text-slate-400 text-sm">corporate_fare</span>
				<select
					bind:value={selectedDir}
					onchange={handleFilterChange}
					class="bg-surface border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-on-surface"
				>
					<option value="">Semua Direktorat</option>
					{#each data.directorates as dir}
						<option value={dir.dir_code}>{dir.dir_name}</option>
					{/each}
				</select>
			</div>

			<!-- Divisi -->
			<div class="flex items-center gap-1.5 text-xs font-medium">
				<select
					bind:value={selectedDiv}
					onchange={handleFilterChange}
					class="bg-surface border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-on-surface"
				>
					<option value="">Semua Divisi</option>
					{#each availableDivisions as div}
						<option value={div.div_code}>{div.div_name}</option>
					{/each}
				</select>
			</div>

			<!-- Departemen -->
			<div class="flex items-center gap-1.5 text-xs font-medium">
				<select
					bind:value={selectedDept}
					onchange={handleFilterChange}
					class="bg-surface border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-on-surface"
				>
					<option value="">Semua Departemen</option>
					{#each availableDepartments as dept}
						<option value={dept.dept_code}>{dept.dept_name}</option>
					{/each}
				</select>
			</div>
		</div>

		<!-- Search Input -->
		<div class="relative w-full lg:w-72">
			<span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
			<input
				type="text"
				placeholder="Cari Nama / NIK / Jabatan..."
				bind:value={searchQuery}
				oninput={handleFilterChange}
				class="w-full bg-surface border border-slate-200 dark:border-slate-700 rounded-xl py-1.5 pl-9 pr-4 text-xs font-medium focus:ring-2 focus:ring-primary/20 placeholder:text-slate-400"
			/>
		</div>
	</div>

	{#if form?.message}
		<div class="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-bold flex items-center gap-2">
			<span class="material-symbols-outlined text-sm">check_circle</span>
			<span>{form.message}</span>
		</div>
	{/if}

	<!-- TAB 1: VISUAL ORG TREE CHART -->
	{#if activeTab === 'tree'}
		<div class="space-y-8">
			{#if Object.keys(groupedByDept).length === 0}
				<div class="p-12 text-center bg-surface-container-low rounded-2xl border border-slate-200/60 dark:border-slate-800/60">
					<span class="material-symbols-outlined text-4xl text-slate-300 block mb-2">account_tree</span>
					<p class="text-sm font-medium text-on-surface-variant">Tidak ada karyawan ditemukan sesuai filter.</p>
				</div>
			{:else}
				{#each Object.entries(groupedByDept) as [deptName, deptEmployees]}
					<div class="p-6 rounded-3xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs space-y-6">
						<!-- Department Header -->
						<div class="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60 pb-4">
							<div class="flex items-center gap-3">
								<div class="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
									<span class="material-symbols-outlined text-lg">domain</span>
								</div>
								<div>
									<h2 class="text-base font-black text-on-surface">{deptName}</h2>
									<p class="text-xs text-on-surface-variant">{deptEmployees.length} Anggota Tim / Karyawan</p>
								</div>
							</div>
							<button
								onclick={() => toggleCollapse(deptName)}
								class="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-on-surface hover:bg-surface-container transition-all flex items-center gap-1 cursor-pointer"
							>
								<span class="material-symbols-outlined text-sm">{collapsedNodes[deptName] ? 'expand_more' : 'expand_less'}</span>
								<span>{collapsedNodes[deptName] ? 'Tampilkan' : 'Sembunyikan'}</span>
							</button>
						</div>

						<!-- Employee Cards Grid in Department -->
						{#if !collapsedNodes[deptName]}
							<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
								{#each deptEmployees as emp}
									<div class="p-4 rounded-2xl bg-surface border border-slate-200 dark:border-slate-800/80 hover:shadow-md transition-all space-y-3 relative group">
										<div class="flex items-start gap-3">
											<!-- Avatar -->
											<div class="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-base shrink-0 border border-primary/20 overflow-hidden">
												{#if emp.foto}
													<img src={emp.foto} alt={emp.nama_karyawan} class="w-full h-full object-cover" />
												{:else}
													{emp.nama_karyawan ? emp.nama_karyawan.charAt(0) : 'U'}
												{/if}
											</div>

											<div class="min-w-0 flex-1">
												<h3 class="font-bold text-sm text-on-surface truncate">{emp.nama_karyawan}</h3>
												<p class="text-xs text-primary font-bold mt-0.5 truncate">{emp.title_name || 'Staff'}</p>
												<p class="text-[10px] text-on-surface-variant font-mono mt-0.5">NIK: {emp.payroll_id}</p>
											</div>
										</div>

										<div class="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
											<span class="text-slate-400 font-medium truncate">
												{emp.div_name || 'BCS Group'}
											</span>
											<button
												onclick={() => openEditModal(emp)}
												class="px-2.5 py-1 rounded-lg bg-surface-container hover:bg-primary hover:text-on-primary text-on-surface font-semibold text-[11px] transition-all cursor-pointer inline-flex items-center gap-1"
											>
												<span class="material-symbols-outlined text-xs">edit</span>
												<span>Atur Atasan</span>
											</button>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/each}
			{/if}
		</div>

	<!-- TAB 2: TABLE HIERARCHY MAPPING -->
	{:else}
		<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs">
			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm">
					<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
						<tr>
							<th class="px-5 py-3.5">Karyawan (Bawahan)</th>
							<th class="px-5 py-3.5">Jabatan / Level</th>
							<th class="px-5 py-3.5">Departemen & Divisi</th>
							<th class="px-5 py-3.5">Title Atasan Langsung</th>
							<th class="px-5 py-3.5 text-right">Aksi</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
						{#if data.employees.length === 0}
							<tr>
								<td colspan="5" class="px-5 py-12 text-center text-on-surface-variant font-medium">
									Tidak ada data hirarki karyawan.
								</td>
							</tr>
						{:else}
							{#each data.employees as emp}
								<tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
									<td class="px-5 py-4">
										<div>
											<p class="font-bold text-on-surface">{emp.nama_karyawan}</p>
											<p class="text-xs text-on-surface-variant font-mono mt-0.5">NIK: {emp.payroll_id}</p>
										</div>
									</td>
									<td class="px-5 py-4">
										<span class="font-semibold text-primary">{emp.title_name}</span>
										<p class="text-[10px] text-slate-400 font-mono">({emp.title_code})</p>
									</td>
									<td class="px-5 py-4 text-xs font-medium text-on-surface-variant">
										<p class="font-semibold text-on-surface">{emp.dept_name || '-'}</p>
										<p class="text-[10px] text-slate-400">{emp.div_name || '-'}</p>
									</td>
									<td class="px-5 py-4">
										{#if emp.atasan_title_codes && emp.atasan_title_codes.length > 0}
											{#each emp.atasan_title_codes as atasanCode}
												{@const atasanObj = data.titles.find((t: any) => t.title_code === atasanCode)}
												<span class="inline-block px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 font-bold text-xs border border-emerald-500/20 mr-1 my-0.5">
													{atasanObj ? atasanObj.title : atasanCode}
												</span>
											{/each}
										{:else}
											<span class="text-slate-400 italic text-xs">Belum diatur</span>
										{/if}
									</td>
									<td class="px-5 py-4 text-right">
										<button
											onclick={() => openEditModal(emp)}
											class="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-primary transition-all cursor-pointer inline-flex items-center gap-1"
										>
											<span class="material-symbols-outlined text-sm">edit</span>
											<span>Ubah Atasan</span>
										</button>
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>

<!-- Modal Quick-Edit Supervisor -->
{#if showModal && selectedEmp}
	<div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
		<div class="bg-surface rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden my-8">
			<div class="bg-slate-900 text-white p-6 flex items-center justify-between">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
						<span class="material-symbols-outlined text-2xl">account_tree</span>
					</div>
					<div>
						<h2 class="text-lg font-bold">ATUR ATASAN LANGSUNG</h2>
						<p class="text-xs text-slate-400">Atur Hirarki Approval Karyawan</p>
					</div>
				</div>
				<button onclick={closeModal} class="text-slate-400 hover:text-white transition-colors cursor-pointer">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<form method="POST" action="?/updateSupervisor" use:enhance={() => {
				return async ({ result, update }) => {
					await update();
					closeModal();
				};
			}} class="p-6 space-y-5">
				<input type="hidden" name="title_bawahan" value={selectedEmp.title_code} />

				<!-- Profile Info Karyawan -->
				<div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 flex items-center gap-3">
					<div class="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg shrink-0">
						{selectedEmp.nama_karyawan ? selectedEmp.nama_karyawan.charAt(0) : 'U'}
					</div>
					<div>
						<h3 class="font-bold text-sm text-on-surface">{selectedEmp.nama_karyawan}</h3>
						<p class="text-xs font-semibold text-primary">{selectedEmp.title_name}</p>
						<p class="text-[10px] text-slate-400 font-mono">NIK: {selectedEmp.payroll_id} | Code: {selectedEmp.title_code}</p>
					</div>
				</div>

				<!-- Select Job Title Atasan -->
				<div class="space-y-1.5">
					<label for="title_atasan_select" class="text-xs font-bold text-on-surface uppercase tracking-wider block">
						Pilih Job Title Atasan (Direct Supervisor):
					</label>
					<select
						id="title_atasan_select"
						name="title_atasan"
						bind:value={selectedNewAtasanTitle}
						required
						class="w-full bg-surface border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-semibold text-on-surface focus:ring-2 focus:ring-primary/20"
					>
						<option value="" disabled>-- Pilih Job Title Atasan --</option>
						{#each data.titles as t}
							<option value={t.title_code}>{t.title} ({t.title_code})</option>
						{/each}
					</select>
					<p class="text-[11px] text-slate-400">
						Atasan ini akan menjadi approver otomatis untuk Cuti, Lembur, Kasbon, dan Penilaian Kinerja karyawan dengan jabatan ini.
					</p>
				</div>

				<!-- Footer Buttons -->
				<div class="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
					<button
						type="button"
						onclick={closeModal}
						class="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-on-surface hover:bg-slate-100 transition-all cursor-pointer"
					>
						Batal
					</button>
					<button
						type="submit"
						class="px-5 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-sm hover:bg-primary/90 transition-all cursor-pointer"
					>
						Simpan Hirarki
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
