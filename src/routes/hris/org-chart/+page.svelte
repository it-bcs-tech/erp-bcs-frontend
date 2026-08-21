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

	// Expanded managers state for on-demand subordinate tree expansion
	let expandedManagers = $state<Record<string, boolean>>({});
	let managerSearchQueries = $state<Record<string, string>>({});

	// Zoom and Pan canvas state
	let zoomLevel = $state(1);
	let panOffset = $state({ x: 0, y: 0 });
	let isPanning = $state(false);
	let panStart = $state({ x: 0, y: 0 });

	function toggleManagerExpand(managerId: string) {
		expandedManagers[managerId] = !expandedManagers[managerId];
	}

	function expandAllManagers() {
		const newMap: Record<string, boolean> = {};
		orgTree.directors.forEach((dir: any) => {
			(dir.generalManagers || []).forEach((gm: any) => {
				(gm.managers || []).forEach((mgr: any) => {
					newMap[mgr.id.toString()] = true;
				});
			});
			(dir.directManagers || []).forEach((mgr: any) => {
				newMap[mgr.id.toString()] = true;
			});
		});
		expandedManagers = newMap;
	}

	function collapseAllManagers() {
		expandedManagers = {};
	}

	// Zoom and Pan controls
	function handleZoomIn() {
		zoomLevel = Math.min(zoomLevel + 0.15, 1.8);
	}

	function handleZoomOut() {
		zoomLevel = Math.max(zoomLevel - 0.15, 0.45);
	}

	function handleResetView() {
		zoomLevel = 1;
		panOffset = { x: 0, y: 0 };
	}

	function handleMouseDown(e: MouseEvent) {
		if ((e.target as HTMLElement).closest('button, select, input, a, .no-pan')) return;
		isPanning = true;
		panStart = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
	}

	function handleMouseMove(e: MouseEvent) {
		if (!isPanning) return;
		panOffset = {
			x: e.clientX - panStart.x,
			y: e.clientY - panStart.y
		};
	}

	function handleMouseUp() {
		isPanning = false;
	}

	function handleWheel(e: WheelEvent) {
		if (e.ctrlKey || e.metaKey) {
			e.preventDefault();
			const zoomDelta = e.deltaY < 0 ? 0.1 : -0.1;
			zoomLevel = Math.min(Math.max(zoomLevel + zoomDelta, 0.45), 1.8);
		}
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

	// ── MEMBANGUN STRUKTUR POHON 4-TIER ORGANISASI (DIRUT -> DIREKTUR -> GM -> MANAGER) ──
	let orgTree = $derived.by(() => {
		const allEmps = data.employees || [];
		if (allEmps.length === 0) return { root: null, directors: [], totalEmployees: 0 };

		// 1. Ambil President Director (Dirut / Tier 1)
		let root = allEmps.find((e: any) => e.tier === 1);
		if (!root) {
			root = allEmps.find((e: any) => (e.title_name || '').toUpperCase().includes('PRESIDENT DIRECTOR') || e.title_code === 'JB_363') || allEmps[0];
		}

		// 2. Ambil Directors (Tier 2 - Direktur Bagian)
		const directorsList = allEmps.filter((e: any) => e.tier === 2 && e.id !== root?.id);

		// 3. Ambil General Managers (Tier 3 - GMs)
		const gmList = allEmps.filter((e: any) => e.tier === 3);

		// 4. Ambil Managers & Dept Heads (Tier 4)
		const managersList = allEmps.filter((e: any) => e.tier === 4);

		// 5. Ambil Subordinates (Tier 5 Supervisors & Tier 6 Staff)
		const subordinatesList = allEmps.filter((e: any) => e.tier >= 5);

		// Map title_bawahan -> list of title_atasan
		const atasanByBawahanMap = new Map<string, string[]>();
		(data.supervisorMappings || []).forEach((m: any) => {
			if (m.title_bawahan && m.title_atasan) {
				const existing = atasanByBawahanMap.get(m.title_bawahan) || [];
				if (!existing.includes(m.title_atasan)) existing.push(m.title_atasan);
				atasanByBawahanMap.set(m.title_bawahan, existing);
			}
		});

		// Map title_atasan -> list of subordinates employees
		const subordinatesByAtasanTitleMap = new Map<string, any[]>();
		subordinatesList.forEach((sub: any) => {
			const atasanCodes = atasanByBawahanMap.get(sub.title_code) || [];
			atasanCodes.forEach((ac: string) => {
				const existing = subordinatesByAtasanTitleMap.get(ac) || [];
				if (!existing.some((x: any) => x.id === sub.id)) existing.push(sub);
				subordinatesByAtasanTitleMap.set(ac, existing);
			});
		});

		// Helper recursive team hierarchy per manager
		function getSubordinatesForManager(mgr: any) {
			const directTeam = subordinatesByAtasanTitleMap.get(mgr.title_code) || [];
			
			// Tambahkan karyawan dengan dept/divisi sama jika belum terpetakan di atasan spesifik
			const sameDeptStaff = subordinatesList.filter((s: any) => 
				(s.dept_id && s.dept_id === mgr.dept_id) || (s.div_id && s.div_id === mgr.div_id)
			);

			const combinedTeamMap = new Map<number, any>();
			directTeam.forEach((t: any) => combinedTeamMap.set(t.id, t));
			sameDeptStaff.forEach((t: any) => {
				if (!combinedTeamMap.has(t.id)) combinedTeamMap.set(t.id, t);
			});

			const allTeam = Array.from(combinedTeamMap.values());

			// Pisahkan menjadi Tier 5 (Supervisors/Foreman) dan Tier 6 (Officers/Staff/Operators)
			const supervisors = allTeam.filter((m: any) => m.tier === 5);
			const directStaff = allTeam.filter((m: any) => m.tier >= 6);

			// Susun bawahan di bawah tiap supervisor
			const supervisorsWithStaff = supervisors.map((spv: any) => {
				const spvDirectStaff = subordinatesByAtasanTitleMap.get(spv.title_code) || [];
				return {
					...spv,
					staff: spvDirectStaff
				};
			});

			return {
				totalCount: allTeam.length,
				supervisors: supervisorsWithStaff,
				directStaff: directStaff,
				allTeam: allTeam
			};
		}

		// Pasangkan Managers ke GM atau Director terkait
		const assignedManagerIds = new Set<number>();
		const assignedGmIds = new Set<number>();

		// Helper memasangkan managers ke GM
		function getManagersForGm(gm: any) {
			const gmManagers = managersList.filter((mgr: any) => {
				const isDirectSub = (mgr.atasan_title_codes || []).includes(gm.title_code);
				const isSameDiv = (mgr.div_id && mgr.div_id === gm.div_id) || (mgr.dir_id && mgr.dir_id === gm.dir_id);
				return isDirectSub || isSameDiv;
			});

			gmManagers.forEach((m: any) => assignedManagerIds.add(m.id));

			return gmManagers.map((mgr: any) => ({
				...mgr,
				subordinatesInfo: getSubordinatesForManager(mgr)
			}));
		}

		// Susun struktur per Direktur (Tier 2)
		const directorsHierarchy = directorsList.map((dir: any) => {
			// Cari GM di bawah Direktur ini
			const dirGms = gmList.filter((gm: any) => {
				const isDirectSub = (gm.atasan_title_codes || []).includes(dir.title_code);
				const isSameDir = (gm.dir_id && gm.dir_id === dir.dir_id);
				return isDirectSub || isSameDir;
			});

			dirGms.forEach((gm: any) => assignedGmIds.add(gm.id));

			const gmsWithManagers = dirGms.map((gm: any) => ({
				...gm,
				managers: getManagersForGm(gm)
			}));

			// Cari Manager yang langsung lapor ke Direktur (tanpa GM)
			const directManagers = managersList.filter((mgr: any) => {
				if (assignedManagerIds.has(mgr.id)) return false;
				const isDirectSub = (mgr.atasan_title_codes || []).includes(dir.title_code);
				const isSameDir = (mgr.dir_id && mgr.dir_id === dir.dir_id);
				return isDirectSub || isSameDir;
			});

			directManagers.forEach((m: any) => assignedManagerIds.add(m.id));

			const directManagersWithSubTree = directManagers.map((mgr: any) => ({
				...mgr,
				subordinatesInfo: getSubordinatesForManager(mgr)
			}));

			return {
				...dir,
				generalManagers: gmsWithManagers,
				directManagers: directManagersWithSubTree
			};
		});

		// GM / Manager yang lapor langsung ke Direktur Utama / Corporate Support
		const unassignedGms = gmList
			.filter((gm: any) => !assignedGmIds.has(gm.id))
			.map((gm: any) => ({
				...gm,
				managers: getManagersForGm(gm)
			}));

		const unassignedManagers = managersList
			.filter((mgr: any) => !assignedManagerIds.has(mgr.id))
			.map((mgr: any) => ({
				...mgr,
				subordinatesInfo: getSubordinatesForManager(mgr)
			}));

		if (unassignedGms.length > 0 || unassignedManagers.length > 0) {
			directorsHierarchy.push({
				id: 999999,
				nama_karyawan: 'Unit Khusus & Pendukung Direksi',
				payroll_id: 'EXECUTIVE-UNIT',
				title_name: 'Corporate & Support Units',
				title_code: 'DIR_SPECIAL',
				dir_name: 'Direksi & SPI',
				div_name: 'Corporate Affairs',
				tier: 2,
				generalManagers: unassignedGms,
				directManagers: unassignedManagers
			});
		}

		return {
			root,
			directors: directorsHierarchy,
			totalEmployees: allEmps.length
		};
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

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- TAB 1: VISUAL ORG TREE CANVAS (DIRUT -> DIREKTUR -> MANAGER) -->
	<!-- ═══════════════════════════════════════════════════════════════ -->
	{#if activeTab === 'tree'}
		<div class="relative rounded-3xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-sm overflow-hidden select-none">
			<!-- Canvas Top Bar Controls (Zoom, Pan, Expand All) -->
			<div class="absolute top-4 left-4 z-20 flex items-center gap-2">
				<div class="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-surface/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-700/80 shadow-md text-xs font-bold text-on-surface">
					<span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
					<span>{orgTree.totalEmployees || 0} Total Personel</span>
				</div>
			</div>

			<div class="absolute top-4 right-4 z-20 flex items-center gap-2">
				<!-- Expand / Collapse All Quick Actions -->
				<div class="flex items-center gap-1 p-1 rounded-2xl bg-surface/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-700/80 shadow-md">
					<button
						onclick={expandAllManagers}
						title="Buka Semua Tim Manager"
						class="px-2.5 py-1 rounded-xl text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
					>
						<span class="material-symbols-outlined text-sm">unfold_more</span>
						<span class="hidden sm:inline">Buka Semua</span>
					</button>
					<button
						onclick={collapseAllManagers}
						title="Tutup Semua Tim Manager (Tampilan Top Level)"
						class="px-2.5 py-1 rounded-xl text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
					>
						<span class="material-symbols-outlined text-sm">unfold_less</span>
						<span class="hidden sm:inline">Tutup Semua</span>
					</button>
				</div>

				<!-- Zoom Controls -->
				<div class="flex items-center gap-1 p-1 rounded-2xl bg-surface/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-700/80 shadow-md">
					<button
						onclick={handleZoomIn}
						title="Zoom In (Perbesar)"
						class="w-8 h-8 rounded-xl flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
					>
						<span class="material-symbols-outlined text-base">zoom_in</span>
					</button>
					<button
						onclick={handleZoomOut}
						title="Zoom Out (Perkecil)"
						class="w-8 h-8 rounded-xl flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
					>
						<span class="material-symbols-outlined text-base">zoom_out</span>
					</button>
					<button
						onclick={handleResetView}
						title="Reset Skala & Posisi (100%)"
						class="px-2 h-8 rounded-xl flex items-center justify-center text-xs font-mono font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
					>
						{Math.round(zoomLevel * 100)}%
					</button>
				</div>
			</div>

			<!-- Pan & Zoom Canvas Area -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="w-full min-h-[720px] max-h-[880px] overflow-hidden relative cursor-grab active:cursor-grabbing bg-slate-50/50 dark:bg-slate-900/30 flex items-start justify-center p-8"
				onmousedown={handleMouseDown}
				onmousemove={handleMouseMove}
				onmouseup={handleMouseUp}
				onmouseleave={handleMouseUp}
				onwheel={handleWheel}
			>
				<!-- Subtle Grid Lines Background -->
				<div class="absolute inset-0 pointer-events-none opacity-20 dark:opacity-10 bg-[radial-gradient(#64748b_1px,transparent_1px)] [background-size:24px_24px]"></div>

				<!-- Transform Container -->
				<div
					class="transition-transform duration-75 origin-top flex flex-col items-center pt-8 pb-32"
					style="transform: translate({panOffset.x}px, {panOffset.y}px) scale({zoomLevel});"
				>
					{#if !orgTree.root}
						<div class="p-12 text-center bg-surface rounded-2xl border border-slate-200 shadow-sm">
							<span class="material-symbols-outlined text-4xl text-slate-300 block mb-2">account_tree</span>
							<p class="text-sm font-medium text-on-surface-variant">Tidak ada data organisasi yang sesuai filter.</p>
						</div>
					{:else}
						<!-- ═══════════════════════════════════════════ -->
						<!-- LEVEL 1: DIREKTUR UTAMA (PRESIDENT DIRECTOR) -->
						<!-- ═══════════════════════════════════════════ -->
						<div class="flex flex-col items-center relative">
							<!-- Card Dirut -->
							<div class="w-80 p-5 rounded-3xl bg-gradient-to-b from-amber-500/10 via-surface to-surface border-2 border-amber-500/60 shadow-xl relative z-10 transition-all hover:scale-105 hover:shadow-2xl">
								<!-- Level Badge -->
								<div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] tracking-wider uppercase shadow-xs mb-3">
									<span class="material-symbols-outlined text-xs">crown</span>
									<span>DIREKTUR UTAMA</span>
								</div>

								<div class="flex items-center gap-3.5">
									<!-- Avatar -->
									<div class="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-300 flex items-center justify-center font-black text-xl shrink-0 border-2 border-amber-500/40 shadow-inner overflow-hidden">
										{#if orgTree.root.foto}
											<img src={orgTree.root.foto} alt={orgTree.root.nama_karyawan} class="w-full h-full object-cover" />
										{:else}
											{orgTree.root.nama_karyawan ? orgTree.root.nama_karyawan.charAt(0) : 'D'}
										{/if}
									</div>

									<div class="min-w-0 flex-1">
										<h2 class="font-black text-base text-on-surface truncate" title={orgTree.root.nama_karyawan}>
											{orgTree.root.nama_karyawan}
										</h2>
										<p class="text-xs font-bold text-amber-600 dark:text-amber-400 truncate mt-0.5">
											{orgTree.root.title_name}
										</p>
										<p class="text-[10px] text-on-surface-variant font-mono mt-0.5">
											NIK: {orgTree.root.payroll_id}
										</p>
									</div>
								</div>

								<div class="mt-3 pt-2.5 border-t border-amber-500/20 flex items-center justify-between text-[11px]">
									<span class="text-slate-400 font-medium">PT BCS Logistics</span>
									<button
										onclick={() => openEditModal(orgTree.root)}
										class="px-2.5 py-1 rounded-lg bg-surface-container hover:bg-amber-500 hover:text-slate-950 text-on-surface font-bold text-[10px] transition-all cursor-pointer inline-flex items-center gap-1"
									>
										<span class="material-symbols-outlined text-[12px]">edit</span>
										<span>Detail</span>
									</button>
								</div>
							</div>

							<!-- Connecting Line from Level 1 to Level 2 -->
							<div class="w-0.5 h-12 bg-slate-300 dark:bg-slate-700"></div>
						</div>

						<!-- ═══════════════════════════════════════════ -->
						<!-- LEVEL 2: DIREKTUR & GENERAL MANAGERS        -->
						<!-- ═══════════════════════════════════════════ -->
						<div class="relative flex justify-center">
							<!-- Horizontal Header Line linking Directors -->
							{#if orgTree.directors.length > 1}
								<div class="absolute top-0 left-16 right-16 h-0.5 bg-slate-300 dark:bg-slate-700"></div>
							{/if}

							<div class="flex flex-wrap items-start justify-center gap-8 lg:gap-12 pt-0">
								{#each orgTree.directors as director}
									<div class="flex flex-col items-center relative">
										<!-- Vertical drop line into Director card -->
										<div class="w-0.5 h-8 bg-slate-300 dark:bg-slate-700"></div>

										<!-- Director Card -->
										<div class="w-72 p-4 rounded-3xl bg-gradient-to-b from-blue-500/10 via-surface to-surface border-2 border-blue-500/40 shadow-lg relative z-10 transition-all hover:scale-105 hover:shadow-xl">
											<!-- Level Badge -->
											<div class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-300 border border-blue-500/30 font-extrabold text-[9px] tracking-wider uppercase mb-2.5">
												<span class="material-symbols-outlined text-xs">shield_person</span>
												<span>DIREKTORAT / GM</span>
											</div>

											<div class="flex items-center gap-3">
												<div class="w-11 h-11 rounded-2xl bg-blue-500/20 text-blue-600 dark:text-blue-300 flex items-center justify-center font-black text-base shrink-0 border border-blue-500/30 overflow-hidden">
													{#if director.foto}
														<img src={director.foto} alt={director.nama_karyawan} class="w-full h-full object-cover" />
													{:else}
														{director.nama_karyawan ? director.nama_karyawan.charAt(0) : 'D'}
													{/if}
												</div>

												<div class="min-w-0 flex-1">
													<h3 class="font-bold text-sm text-on-surface truncate" title={director.nama_karyawan}>
														{director.nama_karyawan}
													</h3>
													<p class="text-xs font-bold text-blue-600 dark:text-blue-400 truncate mt-0.5">
														{director.title_name}
													</p>
													<p class="text-[10px] text-on-surface-variant font-mono mt-0.5">
														{director.payroll_id}
													</p>
												</div>
											</div>

											<div class="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-semibold">
												<span class="truncate">{director.dir_name || director.div_name || 'Direktorat'}</span>
												<span class="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-300 font-bold font-mono">
													{director.managers.length} Dept/Div
												</span>
											</div>
										</div>

										<!-- Connecting Line from Director to GM & Managers -->
										{#if (director.generalManagers && director.generalManagers.length > 0) || (director.directManagers && director.directManagers.length > 0)}
											<div class="w-0.5 h-8 bg-slate-300 dark:bg-slate-700"></div>

											<div class="flex flex-col items-center gap-8 pt-0">
												<!-- ═══════════════════════════════════════════ -->
												<!-- LEVEL 3: GENERAL MANAGERS (GM) JIKA ADA     -->
												<!-- ═══════════════════════════════════════════ -->
												{#if director.generalManagers && director.generalManagers.length > 0}
													<div class="relative flex justify-center">
														{#if director.generalManagers.length > 1}
															<div class="absolute top-0 left-12 right-12 h-0.5 bg-slate-300 dark:bg-slate-700"></div>
														{/if}

														<div class="flex flex-wrap items-start justify-center gap-8 pt-0">
															{#each director.generalManagers as gm}
																<div class="flex flex-col items-center relative">
																	<div class="w-0.5 h-6 bg-slate-300 dark:bg-slate-700"></div>

																	<!-- GM Card -->
																	<div class="w-68 p-3.5 rounded-3xl bg-gradient-to-b from-indigo-500/10 via-surface to-surface border-2 border-indigo-500/40 shadow-md relative z-10 transition-all hover:scale-105 hover:shadow-lg">
																		<div class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-500/25 font-black text-[8px] tracking-wider uppercase mb-2">
																			<span class="material-symbols-outlined text-[10px]">corporate_fare</span>
																			<span>GENERAL MANAGER</span>
																		</div>

																		<div class="flex items-center gap-2.5">
																			<div class="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-black text-sm shrink-0 border border-indigo-500/30 overflow-hidden">
																				{#if gm.foto}
																					<img src={gm.foto} alt={gm.nama_karyawan} class="w-full h-full object-cover" />
																				{:else}
																					{gm.nama_karyawan ? gm.nama_karyawan.charAt(0) : 'G'}
																				{/if}
																			</div>

																			<div class="min-w-0 flex-1">
																				<h4 class="font-bold text-xs text-on-surface truncate" title={gm.nama_karyawan}>
																					{gm.nama_karyawan}
																				</h4>
																				<p class="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 truncate mt-0.5" title={gm.title_name}>
																					{gm.title_name}
																				</p>
																				<p class="text-[9px] text-slate-400 font-mono mt-0.5">
																					{gm.payroll_id}
																				</p>
																			</div>
																		</div>

																		<div class="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-semibold">
																			<span>{gm.div_name || 'Divisi GM'}</span>
																			<span class="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 font-bold font-mono">
																				{gm.managers.length} Manager
																			</span>
																		</div>
																	</div>

																	<!-- Connecting Line from GM to Managers under GM -->
																	{#if gm.managers && gm.managers.length > 0}
																		<div class="w-0.5 h-6 bg-slate-300 dark:bg-slate-700"></div>

																		<div class="relative flex justify-center">
																			{#if gm.managers.length > 1}
																				<div class="absolute top-0 left-10 right-10 h-0.5 bg-slate-300 dark:bg-slate-700"></div>
																			{/if}

																			<div class="flex flex-wrap items-start justify-center gap-6 pt-0">
																				{#each gm.managers as mgr}
																					{@const isExpanded = expandedManagers[mgr.id.toString()]}
																					{@const subInfo = mgr.subordinatesInfo || { totalCount: 0, supervisors: [], directStaff: [], allTeam: [] }}
																					{@const searchQueryMgr = (managerSearchQueries[mgr.id.toString()] || '').toLowerCase()}
																					{@const filteredSupervisors = subInfo.supervisors.filter((s: any) => !searchQueryMgr || s.nama_karyawan.toLowerCase().includes(searchQueryMgr) || s.title_name.toLowerCase().includes(searchQueryMgr))}
																					{@const filteredStaff = subInfo.directStaff.filter((s: any) => !searchQueryMgr || s.nama_karyawan.toLowerCase().includes(searchQueryMgr) || s.title_name.toLowerCase().includes(searchQueryMgr) || s.payroll_id.toLowerCase().includes(searchQueryMgr))}

																					<div class="flex flex-col items-center relative">
																						<div class="w-0.5 h-6 bg-slate-300 dark:bg-slate-700"></div>

																						<!-- Manager Card -->
																						<div class="w-64 p-3.5 rounded-3xl bg-surface border-2 {isExpanded ? 'border-purple-500 ring-2 ring-purple-500/20 shadow-xl' : 'border-purple-500/30 hover:border-purple-500/70 shadow-md'} transition-all relative z-10">
																							<div class="flex items-center justify-between mb-2">
																								<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/20 font-bold text-[8px] tracking-wider uppercase">
																									<span class="material-symbols-outlined text-[10px]">manage_accounts</span>
																									MANAGER
																								</span>

																								<button
																									onclick={() => openEditModal(mgr)}
																									class="text-slate-400 hover:text-primary transition-colors p-1"
																									title="Atur Atasan"
																								>
																									<span class="material-symbols-outlined text-xs">edit</span>
																								</button>
																							</div>

																							<div class="flex items-center gap-2.5">
																								<div class="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-300 flex items-center justify-center font-black text-sm shrink-0 border border-purple-500/30 overflow-hidden">
																									{#if mgr.foto}
																										<img src={mgr.foto} alt={mgr.nama_karyawan} class="w-full h-full object-cover" />
																									{:else}
																										{mgr.nama_karyawan ? mgr.nama_karyawan.charAt(0) : 'M'}
																									{/if}
																								</div>

																								<div class="min-w-0 flex-1">
																									<h4 class="font-bold text-xs text-on-surface truncate" title={mgr.nama_karyawan}>
																										{mgr.nama_karyawan}
																									</h4>
																									<p class="text-[11px] font-bold text-purple-600 dark:text-purple-400 truncate mt-0.5" title={mgr.title_name}>
																										{mgr.title_name}
																									</p>
																									<p class="text-[9px] text-slate-400 font-mono mt-0.5">
																										{mgr.payroll_id}
																									</p>
																								</div>
																							</div>

																							<!-- Expand / Collapse Subordinates Button -->
																							<div class="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
																								<button
																									onclick={() => toggleManagerExpand(mgr.id.toString())}
																									class="w-full py-1.5 px-2.5 rounded-xl font-bold text-[11px] transition-all flex items-center justify-between cursor-pointer {isExpanded ? 'bg-purple-600 text-white shadow-xs' : 'bg-purple-500/10 text-purple-700 dark:text-purple-300 hover:bg-purple-500/20'}"
																								>
																									<div class="flex items-center gap-1">
																										<span class="material-symbols-outlined text-xs">groups</span>
																										<span>{subInfo.totalCount} Personel Staf</span>
																									</div>
																									<span class="material-symbols-outlined text-xs transition-transform {isExpanded ? 'rotate-180' : ''}">
																										expand_more
																									</span>
																								</button>
																							</div>
																						</div>

																						<!-- LEVEL 5+: EXPANDED SUBORDINATES -->
																						{#if isExpanded}
																							<div class="flex flex-col items-center pt-0 animate-in fade-in slide-in-from-top-4 duration-200">
																								<div class="w-0.5 h-6 bg-purple-400 dark:bg-purple-600"></div>

																								{#if subInfo.totalCount === 0}
																									<div class="p-3 rounded-2xl bg-surface border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400 font-medium shadow-sm">
																										Belum ada staf/bawahan yang terdaftar.
																									</div>
																								{:else}
																									<div class="p-4 rounded-3xl bg-surface-container/80 border border-purple-500/30 shadow-xl space-y-3.5 w-80 sm:w-96 max-w-lg">
																										<div class="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-2.5">
																											<div class="flex items-center gap-1.5 text-xs font-black text-on-surface">
																												<span class="material-symbols-outlined text-purple-600 text-sm">badge</span>
																												<span>Tim {mgr.dept_name || mgr.title_name}</span>
																											</div>
																											<span class="px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-300 font-mono font-bold text-[10px]">
																												{subInfo.totalCount} Staf
																											</span>
																										</div>

																										<!-- Mini Search in Manager Team -->
																										{#if subInfo.totalCount > 6}
																											<div class="relative">
																												<span class="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">search</span>
																												<input
																													type="text"
																													placeholder="Cari nama / jabatan staf..."
																													bind:value={managerSearchQueries[mgr.id.toString()]}
																													class="w-full bg-surface border border-slate-200 dark:border-slate-700 rounded-xl py-1 pl-7 pr-3 text-[11px] font-medium placeholder:text-slate-400"
																												/>
																											</div>
																										{/if}

																										<!-- 1. Supervisors Level (Tier 5) -->
																										{#if filteredSupervisors.length > 0}
																											<div class="space-y-2">
																												<p class="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider flex items-center gap-1">
																													<span class="material-symbols-outlined text-xs">verified_user</span>
																													<span>Supervisor & Koordinator ({filteredSupervisors.length})</span>
																												</p>

																												<div class="space-y-2">
																													{#each filteredSupervisors as spv}
																														<div class="p-2.5 rounded-2xl bg-surface border border-emerald-500/30 shadow-2xs space-y-1.5">
																															<div class="flex items-center gap-2">
																																<div class="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0">
																																	{spv.nama_karyawan ? spv.nama_karyawan.charAt(0) : 'S'}
																																</div>
																																<div class="min-w-0 flex-1">
																																	<p class="font-bold text-xs text-on-surface truncate">{spv.nama_karyawan}</p>
																																	<p class="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold truncate">{spv.title_name}</p>
																																</div>
																																<button onclick={() => openEditModal(spv)} class="text-slate-400 hover:text-primary p-1">
																																	<span class="material-symbols-outlined text-xs">edit</span>
																																</button>
																															</div>

																															{#if spv.staff && spv.staff.length > 0}
																																<div class="pl-2.5 border-l-2 border-emerald-500/30 space-y-1 pt-1">
																																	<p class="text-[8px] font-bold text-slate-400 uppercase">Staf Langsung ({spv.staff.length}):</p>
																																	<div class="flex flex-wrap gap-1">
																																		{#each spv.staff as stf}
																																			<span
																																				class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-medium text-on-surface border border-slate-200/80 dark:border-slate-700"
																																				title="{stf.nama_karyawan} ({stf.title_name} - NIK: {stf.payroll_id})"
																																			>
																																				<span class="truncate max-w-[110px]">{stf.nama_karyawan}</span>
																																			</span>
																																		{/each}
																																	</div>
																																</div>
																															{/if}
																														</div>
																													{/each}
																												</div>
																											</div>
																										{/if}

																										<!-- 2. Direct Staff / Officers / Drivers / Helpers (Tier 6) -->
																										{#if filteredStaff.length > 0}
																											<div class="space-y-1.5 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60">
																												<p class="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider flex items-center gap-1">
																													<span class="material-symbols-outlined text-xs">badge</span>
																													<span>Staff, Officer, Driver & Helper ({filteredStaff.length})</span>
																												</p>

																												<div class="flex flex-wrap gap-1 max-h-52 overflow-y-auto p-0.5 pr-1">
																													{#each filteredStaff as stf}
																														<div
																															class="inline-flex items-center gap-1.5 px-2 py-1 rounded-xl bg-surface border border-slate-200 dark:border-slate-700/80 text-[10px] shadow-2xs hover:border-primary transition-all group"
																														>
																															<div class="w-4 h-4 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-[8px] text-slate-600 dark:text-slate-300">
																																{stf.nama_karyawan ? stf.nama_karyawan.charAt(0) : 'O'}
																															</div>
																															<div class="flex flex-col">
																																<span class="font-bold text-on-surface leading-none truncate max-w-[110px]">{stf.nama_karyawan}</span>
																																<span class="text-[8px] text-slate-400 leading-tight truncate max-w-[110px]">{stf.title_name}</span>
																															</div>
																															<button
																																onclick={() => openEditModal(stf)}
																																class="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-primary transition-opacity ml-0.5"
																																title="Atur Atasan"
																															>
																																<span class="material-symbols-outlined text-[10px]">edit</span>
																															</button>
																														</div>
																													{/each}
																												</div>
																											</div>
																										{/if}
																									</div>
																								{/if}
																							</div>
																						{/if}
																					</div>
																				{/each}
																			</div>
																		</div>
																	{/if}
																</div>
															{/each}
														</div>
													</div>
												{/if}

												<!-- ═══════════════════════════════════════════ -->
												<!-- LEVEL 4: MANAGERS LANGSUNG DI BAWAH DIREKTUR -->
												<!-- ═══════════════════════════════════════════ -->
												{#if director.directManagers && director.directManagers.length > 0}
													<div class="relative flex justify-center">
														{#if director.directManagers.length > 1}
															<div class="absolute top-0 left-10 right-10 h-0.5 bg-slate-300 dark:bg-slate-700"></div>
														{/if}

														<div class="flex flex-wrap items-start justify-center gap-6 pt-0">
															{#each director.directManagers as mgr}
																{@const isExpanded = expandedManagers[mgr.id.toString()]}
																{@const subInfo = mgr.subordinatesInfo || { totalCount: 0, supervisors: [], directStaff: [], allTeam: [] }}
																{@const searchQueryMgr = (managerSearchQueries[mgr.id.toString()] || '').toLowerCase()}
																{@const filteredSupervisors = subInfo.supervisors.filter((s: any) => !searchQueryMgr || s.nama_karyawan.toLowerCase().includes(searchQueryMgr) || s.title_name.toLowerCase().includes(searchQueryMgr))}
																{@const filteredStaff = subInfo.directStaff.filter((s: any) => !searchQueryMgr || s.nama_karyawan.toLowerCase().includes(searchQueryMgr) || s.title_name.toLowerCase().includes(searchQueryMgr) || s.payroll_id.toLowerCase().includes(searchQueryMgr))}

																<div class="flex flex-col items-center relative">
																	<div class="w-0.5 h-6 bg-slate-300 dark:bg-slate-700"></div>

																	<!-- Manager Card -->
																	<div class="w-64 p-3.5 rounded-3xl bg-surface border-2 {isExpanded ? 'border-purple-500 ring-2 ring-purple-500/20 shadow-xl' : 'border-purple-500/30 hover:border-purple-500/70 shadow-md'} transition-all relative z-10">
																		<div class="flex items-center justify-between mb-2">
																			<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/20 font-bold text-[8px] tracking-wider uppercase">
																				<span class="material-symbols-outlined text-[10px]">manage_accounts</span>
																				MANAGER
																			</span>

																			<button
																				onclick={() => openEditModal(mgr)}
																				class="text-slate-400 hover:text-primary transition-colors p-1"
																				title="Atur Atasan"
																			>
																				<span class="material-symbols-outlined text-xs">edit</span>
																			</button>
																		</div>

																		<div class="flex items-center gap-2.5">
																			<div class="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-300 flex items-center justify-center font-black text-sm shrink-0 border border-purple-500/30 overflow-hidden">
																				{#if mgr.foto}
																					<img src={mgr.foto} alt={mgr.nama_karyawan} class="w-full h-full object-cover" />
																				{:else}
																					{mgr.nama_karyawan ? mgr.nama_karyawan.charAt(0) : 'M'}
																				{/if}
																			</div>

																			<div class="min-w-0 flex-1">
																				<h4 class="font-bold text-xs text-on-surface truncate" title={mgr.nama_karyawan}>
																					{mgr.nama_karyawan}
																				</h4>
																				<p class="text-[11px] font-bold text-purple-600 dark:text-purple-400 truncate mt-0.5" title={mgr.title_name}>
																					{mgr.title_name}
																				</p>
																				<p class="text-[9px] text-slate-400 font-mono mt-0.5">
																					{mgr.payroll_id}
																				</p>
																			</div>
																		</div>

																		<!-- Expand / Collapse Subordinates Button -->
																		<div class="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
																			<button
																				onclick={() => toggleManagerExpand(mgr.id.toString())}
																				class="w-full py-1.5 px-2.5 rounded-xl font-bold text-[11px] transition-all flex items-center justify-between cursor-pointer {isExpanded ? 'bg-purple-600 text-white shadow-xs' : 'bg-purple-500/10 text-purple-700 dark:text-purple-300 hover:bg-purple-500/20'}"
																			>
																				<div class="flex items-center gap-1">
																					<span class="material-symbols-outlined text-xs">groups</span>
																					<span>{subInfo.totalCount} Personel Staf</span>
																				</div>
																				<span class="material-symbols-outlined text-xs transition-transform {isExpanded ? 'rotate-180' : ''}">
																					expand_more
																				</span>
																			</button>
																		</div>
																	</div>

																	<!-- LEVEL 5+: EXPANDED SUBORDINATES -->
																	{#if isExpanded}
																		<div class="flex flex-col items-center pt-0 animate-in fade-in slide-in-from-top-4 duration-200">
																			<div class="w-0.5 h-6 bg-purple-400 dark:bg-purple-600"></div>

																			{#if subInfo.totalCount === 0}
																				<div class="p-3 rounded-2xl bg-surface border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400 font-medium shadow-sm">
																					Belum ada staf/bawahan yang terdaftar.
																				</div>
																			{:else}
																				<div class="p-4 rounded-3xl bg-surface-container/80 border border-purple-500/30 shadow-xl space-y-3.5 w-80 sm:w-96 max-w-lg">
																					<div class="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-2.5">
																						<div class="flex items-center gap-1.5 text-xs font-black text-on-surface">
																							<span class="material-symbols-outlined text-purple-600 text-sm">badge</span>
																							<span>Tim {mgr.dept_name || mgr.title_name}</span>
																						</div>
																						<span class="px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-300 font-mono font-bold text-[10px]">
																							{subInfo.totalCount} Staf
																						</span>
																					</div>

																					<!-- Mini Search in Manager Team -->
																					{#if subInfo.totalCount > 6}
																						<div class="relative">
																							<span class="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">search</span>
																							<input
																								type="text"
																								placeholder="Cari nama / jabatan staf..."
																								bind:value={managerSearchQueries[mgr.id.toString()]}
																								class="w-full bg-surface border border-slate-200 dark:border-slate-700 rounded-xl py-1 pl-7 pr-3 text-[11px] font-medium placeholder:text-slate-400"
																							/>
																						</div>
																					{/if}

																					<!-- 1. Supervisors Level (Tier 5) -->
																					{#if filteredSupervisors.length > 0}
																						<div class="space-y-2">
																							<p class="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider flex items-center gap-1">
																								<span class="material-symbols-outlined text-xs">verified_user</span>
																								<span>Supervisor & Koordinator ({filteredSupervisors.length})</span>
																							</p>

																							<div class="space-y-2">
																								{#each filteredSupervisors as spv}
																									<div class="p-2.5 rounded-2xl bg-surface border border-emerald-500/30 shadow-2xs space-y-1.5">
																										<div class="flex items-center gap-2">
																											<div class="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0">
																												{spv.nama_karyawan ? spv.nama_karyawan.charAt(0) : 'S'}
																											</div>
																											<div class="min-w-0 flex-1">
																												<p class="font-bold text-xs text-on-surface truncate">{spv.nama_karyawan}</p>
																												<p class="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold truncate">{spv.title_name}</p>
																											</div>
																											<button onclick={() => openEditModal(spv)} class="text-slate-400 hover:text-primary p-1">
																												<span class="material-symbols-outlined text-xs">edit</span>
																											</button>
																										</div>

																										{#if spv.staff && spv.staff.length > 0}
																											<div class="pl-2.5 border-l-2 border-emerald-500/30 space-y-1 pt-1">
																												<p class="text-[8px] font-bold text-slate-400 uppercase">Staf Langsung ({spv.staff.length}):</p>
																												<div class="flex flex-wrap gap-1">
																													{#each spv.staff as stf}
																														<span
																															class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-medium text-on-surface border border-slate-200/80 dark:border-slate-700"
																															title="{stf.nama_karyawan} ({stf.title_name} - NIK: {stf.payroll_id})"
																														>
																															<span class="truncate max-w-[110px]">{stf.nama_karyawan}</span>
																														</span>
																													{/each}
																												</div>
																											</div>
																										{/if}
																									</div>
																								{/each}
																							</div>
																						</div>
																					{/if}

																					<!-- 2. Direct Staff / Officers / Drivers / Helpers (Tier 6) -->
																					{#if filteredStaff.length > 0}
																						<div class="space-y-1.5 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60">
																							<p class="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider flex items-center gap-1">
																								<span class="material-symbols-outlined text-xs">badge</span>
																								<span>Staff, Officer, Driver & Helper ({filteredStaff.length})</span>
																							</p>

																							<div class="flex flex-wrap gap-1 max-h-52 overflow-y-auto p-0.5 pr-1">
																								{#each filteredStaff as stf}
																									<div
																										class="inline-flex items-center gap-1.5 px-2 py-1 rounded-xl bg-surface border border-slate-200 dark:border-slate-700/80 text-[10px] shadow-2xs hover:border-primary transition-all group"
																									>
																										<div class="w-4 h-4 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-[8px] text-slate-600 dark:text-slate-300">
																											{stf.nama_karyawan ? stf.nama_karyawan.charAt(0) : 'O'}
																										</div>
																										<div class="flex flex-col">
																											<span class="font-bold text-on-surface leading-none truncate max-w-[110px]">{stf.nama_karyawan}</span>
																											<span class="text-[8px] text-slate-400 leading-tight truncate max-w-[110px]">{stf.title_name}</span>
																										</div>
																										<button
																											onclick={() => openEditModal(stf)}
																											class="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-primary transition-opacity ml-0.5"
																											title="Atur Atasan"
																										>
																											<span class="material-symbols-outlined text-[10px]">edit</span>
																										</button>
																									</div>
																								{/each}
																							</div>
																						</div>
																					{/if}
																				</div>
																			{/if}
																		</div>
																	{/if}
																</div>
															{/each}
														</div>
													</div>
												{/if}
											</div>
										{/if}
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			</div>
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
