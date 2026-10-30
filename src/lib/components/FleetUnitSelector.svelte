<script lang="ts">
	let {
		units = [],
		multiple = true,
		value = $bindable<string[]>([]),
		singleValue = $bindable<string>(''),
		accentColor = 'blue',
		recommendedUnitId = '',
		onSelectSingle
	}: {
		units: any[];
		multiple?: boolean;
		value?: string[];
		singleValue?: string;
		accentColor?: 'blue' | 'indigo' | 'amber';
		recommendedUnitId?: string;
		onSelectSingle?: (unit: any) => void;
	} = $props();

	let searchQuery = $state('');
	let selectedTypeFilter = $state('ALL');

	// Unique truck types for quick filter pills
	let truckTypes = $derived.by(() => {
		const map = new Map<string, number>();
		for (const u of units) {
			const t = u.type || 'Dump Truck';
			map.set(t, (map.get(t) || 0) + 1);
		}
		return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
	});

	function getUnitKey(u: any): string {
		const dId = u.driverId && u.driverId !== 'null' && u.driverId !== 'undefined' ? u.driverId : '';
		return `${u.unitId}|${dId}`;
	}

	function isUnitCompliant(u: any): boolean {
		return !u.has_expired_doc && !u.has_expired_sim;
	}

	function isUnitSelected(u: any): boolean {
		if (multiple) {
			const key = getUnitKey(u);
			return value.includes(key) || value.some((v) => v.startsWith(`${u.unitId}|`));
		} else {
			return singleValue === u.id || singleValue === String(u.unitId);
		}
	}

	function toggleUnit(u: any) {
		if (!isUnitCompliant(u)) return;

		if (multiple) {
			const key = getUnitKey(u);
			const exists = value.some((v) => v === key || v.startsWith(`${u.unitId}|`));
			if (exists) {
				value = value.filter((v) => v !== key && !v.startsWith(`${u.unitId}|`));
			} else {
				value = [...value, key];
			}
		} else {
			if (singleValue === u.id) {
				singleValue = '';
			} else {
				singleValue = u.id;
				if (onSelectSingle) onSelectSingle(u);
			}
		}
	}

	function clearSelection() {
		if (multiple) {
			value = [];
		} else {
			singleValue = '';
		}
	}

	function matchesFilter(u: any): boolean {
		if (selectedTypeFilter !== 'ALL' && (u.type || 'Dump Truck') !== selectedTypeFilter) {
			return false;
		}
		if (!searchQuery.trim()) return true;
		const q = searchQuery.toLowerCase().trim();
		return (
			(u.id && u.id.toLowerCase().includes(q)) ||
			(u.noLambung && u.noLambung.toLowerCase().includes(q)) ||
			(u.driver && u.driver.toLowerCase().includes(q)) ||
			(u.brand && u.brand.toLowerCase().includes(q)) ||
			(u.modelName && u.modelName.toLowerCase().includes(q)) ||
			(u.type && u.type.toLowerCase().includes(q))
		);
	}

	// Separate ready vs locked units, keeping recommended unit at the very top
	let readyUnits = $derived(
		units
			.filter((u) => isUnitCompliant(u) && matchesFilter(u))
			.sort((a, b) => {
				const aRec = recommendedUnitId && (String(a.unitId) === String(recommendedUnitId) || a.id === recommendedUnitId) ? 1 : 0;
				const bRec = recommendedUnitId && (String(b.unitId) === String(recommendedUnitId) || b.id === recommendedUnitId) ? 1 : 0;
				if (aRec !== bRec) return bRec - aRec;
				const aSel = isUnitSelected(a) ? 1 : 0;
				const bSel = isUnitSelected(b) ? 1 : 0;
				if (aSel !== bSel) return bSel - aSel;
				return String(a.id || '').localeCompare(String(b.id || ''));
			})
	);

	let lockedUnits = $derived(
		units.filter((u) => !isUnitCompliant(u) && matchesFilter(u))
	);

	let totalReadyCount = $derived(units.filter((u) => isUnitCompliant(u)).length);
	let totalLockedCount = $derived(units.filter((u) => !isUnitCompliant(u)).length);
	let selectedCount = $derived(multiple ? value.length : singleValue ? 1 : 0);

	// Dynamic theme classes based on accentColor
	let theme = $derived.by(() => {
		if (accentColor === 'indigo') {
			return {
				ring: 'focus-within:ring-indigo-500/20',
				pillActive: 'bg-indigo-600 text-white',
				cardSelected: 'bg-indigo-50/70 dark:bg-indigo-950/30 ring-2 ring-indigo-600 dark:ring-indigo-500',
				checkActive: 'bg-indigo-600 text-white border-indigo-600',
				badgeSelected: 'bg-indigo-600 text-white',
				truckCabSelected: '#4f46e5',
				truckBedSelected: '#6366f1'
			};
		}
		if (accentColor === 'amber') {
			return {
				ring: 'focus-within:ring-amber-500/20',
				pillActive: 'bg-amber-600 text-white',
				cardSelected: 'bg-amber-50/70 dark:bg-amber-950/30 ring-2 ring-amber-600 dark:ring-amber-500',
				checkActive: 'bg-amber-600 text-white border-amber-600',
				badgeSelected: 'bg-amber-600 text-white',
				truckCabSelected: '#d97706',
				truckBedSelected: '#f59e0b'
			};
		}
		return {
			ring: 'focus-within:ring-blue-500/20',
			pillActive: 'bg-blue-600 text-white',
			cardSelected: 'bg-blue-50/70 dark:bg-blue-950/30 ring-2 ring-blue-600 dark:ring-blue-500',
			checkActive: 'bg-blue-600 text-white border-blue-600',
			badgeSelected: 'bg-blue-600 text-white',
			truckCabSelected: '#2563eb',
			truckBedSelected: '#3b82f6'
		};
	});
</script>

<div class="flex flex-col h-full bg-surface-container-low/50 rounded-2xl p-4">
	<!-- Top Header & Counters -->
	<div class="flex flex-wrap items-center justify-between gap-2 mb-3">
		<div class="flex items-center gap-2">
			<span class="material-symbols-outlined text-on-surface-variant text-lg">local_shipping</span>
			<h4 class="text-xs font-black text-on-surface uppercase tracking-wider">
				Katalog Armada Dump Truck
			</h4>
			<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
				{totalReadyCount} Siap Jalan
			</span>
			{#if totalLockedCount > 0}
				<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
					{totalLockedCount} Terkunci
				</span>
			{/if}
		</div>

		<div class="flex items-center gap-2">
			{#if selectedCount > 0}
				<span class="px-2.5 py-0.5 rounded-lg text-[11px] font-black {theme.badgeSelected}">
					{selectedCount} Unit Terpilih
				</span>
				<button
					type="button"
					onclick={clearSelection}
					class="text-[11px] font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 px-2 py-0.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
				>
					Reset
				</button>
			{/if}
		</div>
	</div>

	<!-- Search Bar (Borderless Standard) -->
	<div class="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-surface-container-lowest focus-within:ring-2 {theme.ring} transition-all mb-2.5">
		<span class="material-symbols-outlined text-on-surface-variant text-[18px]">search</span>
		<input
			type="text"
			bind:value={searchQuery}
			placeholder="Cari Nopol (A 9512 TX), No. Lambung, Nama Sopir, atau Merk..."
			class="bg-transparent text-xs font-medium text-on-surface border-0 outline-none w-full placeholder:text-on-surface-variant/50 focus:ring-0 p-0"
		/>
		{#if searchQuery}
			<button
				type="button"
				onclick={() => (searchQuery = '')}
				class="text-on-surface-variant hover:text-rose-500 transition-colors cursor-pointer flex items-center"
			>
				<span class="material-symbols-outlined text-[16px]">close</span>
			</button>
		{/if}
	</div>

	<!-- Type Filter Pills -->
	{#if truckTypes.length > 1}
		<div class="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 no-scrollbar">
			<button
				type="button"
				onclick={() => (selectedTypeFilter = 'ALL')}
				class="px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer {selectedTypeFilter === 'ALL'
					? theme.pillActive
					: 'bg-surface-container-lowest text-on-surface-variant hover:text-on-surface'}"
			>
				Semua ({units.length})
			</button>
			{#each truckTypes as tt}
				<button
					type="button"
					onclick={() => (selectedTypeFilter = tt.name)}
					class="px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer {selectedTypeFilter === tt.name
						? theme.pillActive
						: 'bg-surface-container-lowest text-on-surface-variant hover:text-on-surface'}"
				>
					{tt.name} ({tt.count})
				</button>
			{/each}
		</div>
	{/if}

	<!-- Scrollable Fleet Cards List -->
	<div class="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar max-h-[430px]">
		{#if readyUnits.length === 0 && lockedUnits.length === 0}
			<div class="py-12 px-4 text-center rounded-2xl bg-surface-container-lowest">
				<span class="material-symbols-outlined text-3xl text-on-surface-variant/40 mb-1">local_shipping</span>
				<p class="text-xs font-bold text-on-surface">Armada Tidak Ditemukan</p>
				<p class="text-[11px] text-on-surface-variant mt-0.5">
					Tidak ada Dump Truck yang cocok dengan kata kunci "{searchQuery}".
				</p>
			</div>
		{/if}

		<!-- 1. READY & COMPLIANT DUMP TRUCKS -->
		{#each readyUnits as unit (unit.unitId || unit.id)}
			{@const selected = isUnitSelected(unit)}
			{@const isRecommended = recommendedUnitId && (String(unit.unitId) === String(recommendedUnitId) || unit.id === recommendedUnitId)}
			{@const daysWorked = Number(unit.days_worked || 0)}
			{@const hasDriver = unit.driverId && unit.driver && !unit.driver.includes('Sopir Libur')}

			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				onclick={() => toggleUnit(unit)}
				class="group relative flex items-center gap-3.5 p-3 rounded-2xl transition-all duration-150 cursor-pointer select-none {selected
					? theme.cardSelected
					: 'bg-surface-container-lowest hover:bg-surface-container-high/60'}"
			>
				<!-- Left: Dump Truck Visual Illustration Box -->
				<div
					class="relative w-28 h-20 rounded-xl flex flex-col items-center justify-center shrink-0 overflow-hidden transition-colors {selected
						? 'bg-white/90 dark:bg-slate-900/80'
						: 'bg-surface-container-low group-hover:bg-surface-container'}"
				>
					<!-- Side-Profile Dump Truck Vector Illustration -->
					<svg viewBox="0 0 140 76" class="w-24 h-14 drop-shadow-xs transition-transform duration-200 group-hover:scale-105" fill="none" xmlns="http://www.w3.org/2000/svg">
						<!-- Ground shadow -->
						<ellipse cx="70" cy="67" rx="58" ry="3.5" fill="currentColor" class="text-slate-900/10 dark:text-black/30" />

						<!-- Chassis Frame -->
						<rect x="14" y="47" width="110" height="5" rx="2" fill="#334155" />

						<!-- Hydraulic Lift Cylinder -->
						<rect x="85" y="24" width="4" height="24" rx="1" transform="rotate(-8 85 24)" fill="#94a3b8" />

						<!-- Dump Bed (Bak Truk) -->
						<path
							d="M10 18 L86 18 L86 46 L14 46 Z"
							fill={selected ? theme.truckBedSelected : '#0ea5e9'}
						/>
						<!-- Dump Bed Canopy / Pelindung Kabin -->
						<path
							d="M84 18 L96 14 L96 18 L84 22 Z"
							fill={selected ? theme.truckCabSelected : '#0284c7'}
						/>
						<!-- Dump Bed Structural Ribs (Tulang Bak) -->
						<rect x="24" y="21" width="3.5" height="22" rx="1" fill="white" fill-opacity="0.28" />
						<rect x="39" y="21" width="3.5" height="22" rx="1" fill="white" fill-opacity="0.28" />
						<rect x="54" y="21" width="3.5" height="22" rx="1" fill="white" fill-opacity="0.28" />
						<rect x="69" y="21" width="3.5" height="22" rx="1" fill="white" fill-opacity="0.28" />
						<!-- Dump Bed Bottom Rail -->
						<rect x="13" y="43" width="74" height="3.5" fill={selected ? theme.truckCabSelected : '#0369a1'} />

						<!-- Truck Cabin (Kabin Kepala Truk) -->
						<path
							d="M90 21 H114 C118 21 122 25 124 31 L126 39 C126.5 41 127 43 127 47 H90 V21 Z"
							fill={selected ? theme.truckCabSelected : '#1e293b'}
						/>
						<!-- Windshield / Kaca Kabin -->
						<path
							d="M95 25 H112 C115 25 118 28 119.5 33 H95 V25 Z"
							fill="#bae6fd"
						/>
						<!-- Door Line & Handle -->
						<rect x="96" y="36" width="5" height="1.5" rx="0.75" fill="#94a3b8" />
						<!-- Headlight & Bumper -->
						<rect x="123" y="41" width="4" height="4" rx="1" fill="#fde047" />
						<rect x="122" y="46" width="6" height="4" rx="1.5" fill="#475569" />

						<!-- Rear Tandem Axle Wheel 1 -->
						<circle cx="27" cy="55" r="10.5" fill="#1e293b" />
						<circle cx="27" cy="55" r="5.5" fill="#cbd5e1" />
						<circle cx="27" cy="55" r="2" fill="#475569" />

						<!-- Rear Tandem Axle Wheel 2 -->
						<circle cx="51" cy="55" r="10.5" fill="#1e293b" />
						<circle cx="51" cy="55" r="5.5" fill="#cbd5e1" />
						<circle cx="51" cy="55" r="2" fill="#475569" />

						<!-- Front Steering Wheel -->
						<circle cx="109" cy="55" r="10.5" fill="#1e293b" />
						<circle cx="109" cy="55" r="5.5" fill="#cbd5e1" />
						<circle cx="109" cy="55" r="2" fill="#475569" />
					</svg>

					<!-- Spec Overlay Pill (Tonase & Axle) -->
					<div class="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900/75 text-white text-[9px] font-black tracking-wider uppercase">
						<span>{unit.capacity || 35}T</span>
						{#if unit.axleConfig}
							<span>• {unit.axleConfig}</span>
						{/if}
					</div>
				</div>

				<!-- Center: Truck & Driver Information -->
				<div class="flex-1 min-w-0">
					<!-- Row 1: License Plate, Hull Number, Recommended Badge -->
					<div class="flex flex-wrap items-center gap-1.5">
						<span class="px-2 py-0.5 rounded-md bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-mono text-xs font-black tracking-wide">
							{unit.id}
						</span>
						{#if unit.noLambung}
							<span class="px-1.5 py-0.5 rounded-md bg-surface-container text-on-surface font-mono text-[10px] font-bold">
								#{unit.noLambung}
							</span>
						{/if}
						<span class="px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 text-[10px] font-bold">
							{unit.type || 'Dump Truck'}
						</span>
						{#if isRecommended}
							<span class="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[10px] font-black flex items-center gap-0.5">
								<span class="material-symbols-outlined text-[12px]">auto_awesome</span>
								Rekomendasi
							</span>
						{/if}
					</div>

					<!-- Row 2: Brand, Model & Year -->
					<p class="text-xs font-bold text-on-surface mt-1 truncate">
						{unit.brand || 'Armada BCS'}
						{#if unit.modelName && unit.modelName !== unit.brand}
							<span class="font-medium text-on-surface-variant">• {unit.modelName}</span>
						{/if}
						{#if unit.tahun}
							<span class="text-[11px] font-mono text-on-surface-variant">({unit.tahun})</span>
						{/if}
					</p>

					<!-- Row 3: Driver Info, Work Quota, Location -->
					<div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px]">
						<span class="flex items-center gap-1 font-semibold {hasDriver ? 'text-on-surface' : 'text-amber-600 dark:text-amber-400'}">
							<span class="material-symbols-outlined text-[14px] {hasDriver ? 'text-emerald-600' : 'text-amber-500'}">person</span>
							<span class="truncate max-w-[160px]">{unit.driver || 'Tanpa Sopir'}</span>
						</span>

						<span
							class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold {daysWorked >= 12
								? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
								: 'bg-surface-container text-on-surface-variant'}"
							title="Jumlah hari kerja sopir di bulan ini (Maks. 14 Hari)"
						>
							<span class="material-symbols-outlined text-[12px]">calendar_month</span>
							{daysWorked}/14 Hari
						</span>

						<span class="flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
							<span class="material-symbols-outlined text-[13px]">location_on</span>
							{unit.location || 'Pool'}
						</span>
					</div>
				</div>

				<!-- Right: Selection Check Indicator -->
				<div class="shrink-0 pl-1">
					<div
						class="w-7 h-7 rounded-xl border flex items-center justify-center transition-all {selected
							? theme.checkActive
							: 'border-slate-300 dark:border-slate-700 bg-surface-container-low group-hover:border-slate-400'}"
					>
						{#if selected}
							<span class="material-symbols-outlined text-[18px] font-black">check</span>
						{:else}
							<span class="material-symbols-outlined text-[16px] text-transparent group-hover:text-slate-400">add</span>
						{/if}
					</div>
				</div>
			</div>
		{/each}

		<!-- 2. LOCKED / EXPIRED DUMP TRUCKS (DISABLED AT THE BOTTOM) -->
		{#if lockedUnits.length > 0}
			<div class="pt-3">
				<div class="flex items-center gap-2 mb-2 px-1">
					<span class="material-symbols-outlined text-rose-500 text-sm">lock</span>
					<span class="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-wider">
						Unit Terkunci — Dokumen / SIM Kadaluarsa ({lockedUnits.length})
					</span>
					<div class="flex-1 h-px bg-rose-200/60 dark:bg-rose-900/40"></div>
				</div>

				<div class="space-y-2">
					{#each lockedUnits as unit (unit.unitId || unit.id)}
						<div
							class="flex items-center gap-3.5 p-3 rounded-2xl bg-surface-container-lowest/60 opacity-65 cursor-not-allowed select-none"
							title="Unit ini tidak dapat dipilih karena dokumen kendaraan atau SIM pengemudi telah kadaluarsa"
						>
							<!-- Grayscale Dump Truck Illustration -->
							<div class="w-24 h-16 rounded-xl bg-surface-container flex flex-col items-center justify-center shrink-0 grayscale">
								<svg viewBox="0 0 140 76" class="w-20 h-11 opacity-60" fill="none" xmlns="http://www.w3.org/2000/svg">
									<rect x="14" y="47" width="110" height="5" rx="2" fill="#64748b" />
									<path d="M10 18 L86 18 L86 46 L14 46 Z" fill="#94a3b8" />
									<path d="M90 21 H114 C118 21 122 25 124 31 L126 39 C126.5 41 127 43 127 47 H90 V21 Z" fill="#64748b" />
									<circle cx="27" cy="55" r="10" fill="#475569" />
									<circle cx="51" cy="55" r="10" fill="#475569" />
									<circle cx="109" cy="55" r="10" fill="#475569" />
								</svg>
								<span class="text-[9px] font-bold text-on-surface-variant">{unit.capacity || 35}T</span>
							</div>

							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-1.5">
									<span class="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-on-surface font-mono text-xs font-bold">
										{unit.id}
									</span>
									{#if unit.noLambung}
										<span class="text-[10px] font-mono text-on-surface-variant">#{unit.noLambung}</span>
									{/if}
									<span class="text-[11px] font-semibold text-on-surface-variant truncate">
										• {unit.brand || ''} ({unit.type || 'Dump Truck'})
									</span>
								</div>

								<p class="text-[11px] text-on-surface-variant mt-0.5">
									Sopir: <strong class="text-on-surface">{unit.driver || '-'}</strong>
								</p>

								<!-- Lock Reason Badges -->
								<div class="flex flex-wrap gap-1.5 mt-1.5">
									{#if unit.has_expired_doc}
										<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
											<span class="material-symbols-outlined text-[12px]">gpp_bad</span>
											{unit.expired_doc_details || 'Dokumen Unit Expired'}
										</span>
									{/if}
									{#if unit.has_expired_sim}
										<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
											<span class="material-symbols-outlined text-[12px]">badge</span>
											{unit.expired_sim_details || 'SIM Sopir Expired'}
										</span>
									{/if}
								</div>
							</div>

							<div class="shrink-0 pl-1">
								<div class="w-7 h-7 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
									<span class="material-symbols-outlined text-[16px]">lock</span>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>
