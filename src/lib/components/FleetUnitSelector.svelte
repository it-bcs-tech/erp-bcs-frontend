<script lang="ts">
	let {
		units = [],
		multiple = true,
		value = $bindable<string[]>([]),
		singleValue = $bindable<string>(''),
		accentColor = 'blue',
		recommendedUnitId = '',
		maxHeight = '430px',
		gridCols = 2,
		isFullscreen = $bindable<boolean>(false),
		onSelectSingle
	}: {
		units: any[];
		multiple?: boolean;
		value?: string[];
		singleValue?: string;
		accentColor?: 'blue' | 'indigo' | 'amber';
		recommendedUnitId?: string;
		maxHeight?: string;
		gridCols?: 1 | 2;
		isFullscreen?: boolean;
		onSelectSingle?: (unit: any) => void;
	} = $props();

	let searchQuery = $state('');
	let selectedStatusFilter = $state<'ALL' | 'READY' | 'ON_TRIP' | 'WORK_ORDER' | 'EXPIRED'>('ALL');
	let selectedTypeFilter = $state('ALL');

	function getOperationalGroup(u: any): 'READY' | 'ON_TRIP' | 'WORK_ORDER' | 'EXPIRED' {
		if (u.operational_group) return u.operational_group;
		if (u.has_active_wo) return 'WORK_ORDER';
		if (u.has_active_trip) return 'ON_TRIP';
		const hasNoDriver = !u.driverId || String(u.driver || '').includes('Libur');
		if (u.has_expired_doc || u.has_expired_sim || hasNoDriver) return 'EXPIRED';
		return 'READY';
	}

	function isUnitSelectable(u: any): boolean {
		return getOperationalGroup(u) === 'READY';
	}

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

	function isUnitSelected(u: any): boolean {
		if (multiple) {
			const key = getUnitKey(u);
			return value.includes(key) || value.some((v) => v.startsWith(`${u.unitId}|`));
		} else {
			return singleValue === u.id || singleValue === String(u.unitId);
		}
	}

	function toggleUnit(u: any) {
		if (!isUnitSelectable(u)) return;

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
		const grp = getOperationalGroup(u);
		if (selectedStatusFilter !== 'ALL' && grp !== selectedStatusFilter) {
			return false;
		}
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
			(u.type && u.type.toLowerCase().includes(q)) ||
			(u.wo_no && u.wo_no.toLowerCase().includes(q)) ||
			(u.wo_complaint && u.wo_complaint.toLowerCase().includes(q)) ||
			(u.trip_customer_name && u.trip_customer_name.toLowerCase().includes(q)) ||
			(u.trip_route && u.trip_route.toLowerCase().includes(q))
		);
	}

	// Counts per status group (unfiltered by status pill so badges stay informative)
	let totalReadyCount = $derived(units.filter((u) => getOperationalGroup(u) === 'READY').length);
	let totalOnTripCount = $derived(units.filter((u) => getOperationalGroup(u) === 'ON_TRIP').length);
	let totalWoCount = $derived(units.filter((u) => getOperationalGroup(u) === 'WORK_ORDER').length);
	let totalExpiredCount = $derived(units.filter((u) => getOperationalGroup(u) === 'EXPIRED').length);

	// Filtered & sorted arrays per group
	let readyUnits = $derived(
		units
			.filter((u) => getOperationalGroup(u) === 'READY' && matchesFilter(u))
			.sort((a, b) => {
				const aRec =
					recommendedUnitId && (String(a.unitId) === String(recommendedUnitId) || a.id === recommendedUnitId) ? 1 : 0;
				const bRec =
					recommendedUnitId && (String(b.unitId) === String(recommendedUnitId) || b.id === recommendedUnitId) ? 1 : 0;
				if (aRec !== bRec) return bRec - aRec;
				const aSel = isUnitSelected(a) ? 1 : 0;
				const bSel = isUnitSelected(b) ? 1 : 0;
				if (aSel !== bSel) return bSel - aSel;
				return String(a.id || '').localeCompare(String(b.id || ''));
			})
	);

	let onTripUnits = $derived(
		units.filter((u) => getOperationalGroup(u) === 'ON_TRIP' && matchesFilter(u))
	);

	let woUnits = $derived(
		units.filter((u) => getOperationalGroup(u) === 'WORK_ORDER' && matchesFilter(u))
	);

	let expiredUnits = $derived(
		units.filter((u) => getOperationalGroup(u) === 'EXPIRED' && matchesFilter(u))
	);

	let totalVisibleCount = $derived(
		readyUnits.length + onTripUnits.length + woUnits.length + expiredUnits.length
	);
	let selectedCount = $derived(multiple ? value.length : singleValue ? 1 : 0);

	// Dynamic theme classes based on accentColor
	let theme = $derived.by(() => {
		if (accentColor === 'indigo') {
			return {
				ring: 'focus-within:ring-indigo-500/20',
				pillActive: 'bg-indigo-600 text-white shadow-xs',
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
				pillActive: 'bg-amber-600 text-white shadow-xs',
				cardSelected: 'bg-amber-50/70 dark:bg-amber-950/30 ring-2 ring-amber-600 dark:ring-amber-500',
				checkActive: 'bg-amber-600 text-white border-amber-600',
				badgeSelected: 'bg-amber-600 text-white',
				truckCabSelected: '#d97706',
				truckBedSelected: '#f59e0b'
			};
		}
		return {
			ring: 'focus-within:ring-blue-500/20',
			pillActive: 'bg-blue-600 text-white shadow-xs',
			cardSelected: 'bg-blue-50/70 dark:bg-blue-950/30 ring-2 ring-blue-600 dark:ring-blue-500',
			checkActive: 'bg-blue-600 text-white border-blue-600',
			badgeSelected: 'bg-blue-600 text-white',
			truckCabSelected: '#2563eb',
			truckBedSelected: '#3b82f6'
		};
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && isFullscreen) {
			isFullscreen = false;
		}
	}

	let totalSelectedTons = $derived.by(() => {
		if (multiple) {
			return value.reduce((acc, val) => {
				const uId = val.split('|')[0];
				const found = units.find((u) => String(u.unitId) === uId || u.id === uId);
				return acc + (Number(found?.capacity) || 35);
			}, 0);
		} else {
			if (!singleValue) return 0;
			const found = units.find((u) => String(u.unitId) === singleValue || u.id === singleValue);
			return Number(found?.capacity) || 35;
		}
	});

	let selectedUnitObjects = $derived.by(() => {
		if (multiple) {
			return value.map((val) => {
				const uId = val.split('|')[0];
				const found = units.find((u) => String(u.unitId) === uId || u.id === uId);
				return {
					key: val,
					id: found?.id || uId,
					driver: found?.driver,
					capacity: found?.capacity || 35
				};
			});
		} else if (singleValue) {
			const found = units.find((u) => String(u.unitId) === singleValue || u.id === singleValue);
			return [{
				key: singleValue,
				id: found?.id || singleValue,
				driver: found?.driver,
				capacity: found?.capacity || 35
			}];
		}
		return [];
	});
</script>

<svelte:window onkeydown={handleKeydown} />

{#snippet filterBar()}
<!-- Status Filter Pills (Ready, On-Trip, Bengkel/WO, Dokumen/SIM) -->
	<div class="flex items-center gap-1.5 overflow-x-auto pb-1.5 mb-1.5 no-scrollbar">
		<button
			type="button"
			onclick={() => (selectedStatusFilter = 'ALL')}
			class="px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 {selectedStatusFilter === 'ALL'
				? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
				: 'bg-surface-container-lowest text-on-surface-variant hover:text-on-surface'}"
		>
			<span>Semua</span>
			<span class="text-[10px] opacity-80">({units.length})</span>
		</button>

		<button
			type="button"
			onclick={() => (selectedStatusFilter = 'READY')}
			class="px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 {selectedStatusFilter === 'READY'
				? 'bg-emerald-600 text-white shadow-xs'
				: 'bg-emerald-50/80 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 hover:bg-emerald-100'}"
		>
			<span class="material-symbols-outlined text-[13px]">check_circle</span>
			<span>Ready</span>
			<span class="text-[10px] font-black">({totalReadyCount})</span>
		</button>

		<button
			type="button"
			onclick={() => (selectedStatusFilter = 'ON_TRIP')}
			class="px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 {selectedStatusFilter === 'ON_TRIP'
				? 'bg-sky-600 text-white shadow-xs'
				: 'bg-sky-50/80 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 hover:bg-sky-100'}"
		>
			<span class="material-symbols-outlined text-[13px]">local_shipping</span>
			<span>Sedang Jalan</span>
			<span class="text-[10px] font-black">({totalOnTripCount})</span>
		</button>

		<button
			type="button"
			onclick={() => (selectedStatusFilter = 'WORK_ORDER')}
			class="px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 {selectedStatusFilter === 'WORK_ORDER'
				? 'bg-amber-600 text-white shadow-xs'
				: 'bg-amber-50/80 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 hover:bg-amber-100'}"
		>
			<span class="material-symbols-outlined text-[13px]">build_circle</span>
			<span>Bengkel / WO</span>
			<span class="text-[10px] font-black">({totalWoCount})</span>
		</button>

		{#if totalExpiredCount > 0}
			<button
				type="button"
				onclick={() => (selectedStatusFilter = 'EXPIRED')}
				class="px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 {selectedStatusFilter === 'EXPIRED'
					? 'bg-rose-600 text-white shadow-xs'
					: 'bg-rose-50/80 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 hover:bg-rose-100'}"
			>
				<span class="material-symbols-outlined text-[13px]">lock</span>
				<span>Terkunci</span>
				<span class="text-[10px] font-black">({totalExpiredCount})</span>
			</button>
		{/if}
	</div>

	<!-- Type Filter Pills -->
	{#if truckTypes.length > 1}
		<div class="flex items-center gap-1.5 overflow-x-auto pb-2 mb-1.5 no-scrollbar">
			<button
				type="button"
				onclick={() => (selectedTypeFilter = 'ALL')}
				class="px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap transition-all cursor-pointer {selectedTypeFilter === 'ALL'
					? theme.pillActive
					: 'bg-surface-container-lowest text-on-surface-variant hover:text-on-surface'}"
			>
				Semua Tipe
			</button>
			{#each truckTypes as tt}
				<button
					type="button"
					onclick={() => (selectedTypeFilter = tt.name)}
					class="px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap transition-all cursor-pointer {selectedTypeFilter === tt.name
						? theme.pillActive
						: 'bg-surface-container-lowest text-on-surface-variant hover:text-on-surface'}"
				>
					{tt.name} ({tt.count})
				</button>
			{/each}
		</div>
	{/if}

	
{/snippet}

{#snippet fleetCards(activeColsClass: string)}
{#if totalVisibleCount === 0}
			<div class="py-12 px-4 text-center rounded-2xl bg-surface-container-lowest">
				<span class="material-symbols-outlined text-3xl text-on-surface-variant/40 mb-1">local_shipping</span>
				<p class="text-xs font-bold text-on-surface">Armada Tidak Ditemukan</p>
				<p class="text-[11px] text-on-surface-variant mt-0.5">
					Tidak ada Dump Truck pada kategori ini yang cocok dengan filter pencarian.
				</p>
			</div>
		{/if}

		<!-- ========================================================= -->
		<!-- 1. READY & COMPLIANT DUMP TRUCKS (SELECTABLE)             -->
		<!-- ========================================================= -->
		{#if readyUnits.length > 0}
			{#if selectedStatusFilter === 'ALL'}
				<div class="flex items-center gap-2 px-1 pt-0.5">
					<span class="material-symbols-outlined text-emerald-600 text-sm">check_circle</span>
					<span class="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
						Siap Ditugaskan di Pool ({readyUnits.length} Unit)
					</span>
					<div class="flex-1 h-px bg-emerald-200/60 dark:bg-emerald-900/40"></div>
				</div>
			{/if}

			<div class="{activeColsClass}">
				{#each readyUnits as unit (unit.unitId || unit.id)}
				{@const selected = isUnitSelected(unit)}
				{@const isRecommended =
					recommendedUnitId && (String(unit.unitId) === String(recommendedUnitId) || unit.id === recommendedUnitId)}
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
						<svg
							viewBox="0 0 140 76"
							class="w-24 h-14 drop-shadow-xs transition-transform duration-200 group-hover:scale-105"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
						>
							<ellipse cx="70" cy="67" rx="58" ry="3.5" fill="currentColor" class="text-slate-900/10 dark:text-black/30" />
							<rect x="14" y="47" width="110" height="5" rx="2" fill="#334155" />
							<rect x="85" y="24" width="4" height="24" rx="1" transform="rotate(-8 85 24)" fill="#94a3b8" />
							<path d="M10 18 L86 18 L86 46 L14 46 Z" fill={selected ? theme.truckBedSelected : '#0ea5e9'} />
							<path d="M84 18 L96 14 L96 18 L84 22 Z" fill={selected ? theme.truckCabSelected : '#0284c7'} />
							<rect x="24" y="21" width="3.5" height="22" rx="1" fill="white" fill-opacity="0.28" />
							<rect x="39" y="21" width="3.5" height="22" rx="1" fill="white" fill-opacity="0.28" />
							<rect x="54" y="21" width="3.5" height="22" rx="1" fill="white" fill-opacity="0.28" />
							<rect x="69" y="21" width="3.5" height="22" rx="1" fill="white" fill-opacity="0.28" />
							<rect x="13" y="43" width="74" height="3.5" fill={selected ? theme.truckCabSelected : '#0369a1'} />
							<path
								d="M90 21 H114 C118 21 122 25 124 31 L126 39 C126.5 41 127 43 127 47 H90 V21 Z"
								fill={selected ? theme.truckCabSelected : '#1e293b'}
							/>
							<path d="M95 25 H112 C115 25 118 28 119.5 33 H95 V25 Z" fill="#bae6fd" />
							<rect x="96" y="36" width="5" height="1.5" rx="0.75" fill="#94a3b8" />
							<rect x="123" y="41" width="4" height="4" rx="1" fill="#fde047" />
							<rect x="122" y="46" width="6" height="4" rx="1.5" fill="#475569" />
							<circle cx="27" cy="55" r="10.5" fill="#1e293b" />
							<circle cx="27" cy="55" r="5.5" fill="#cbd5e1" />
							<circle cx="27" cy="55" r="2" fill="#475569" />
							<circle cx="51" cy="55" r="10.5" fill="#1e293b" />
							<circle cx="51" cy="55" r="5.5" fill="#cbd5e1" />
							<circle cx="51" cy="55" r="2" fill="#475569" />
							<circle cx="109" cy="55" r="10.5" fill="#1e293b" />
							<circle cx="109" cy="55" r="5.5" fill="#cbd5e1" />
							<circle cx="109" cy="55" r="2" fill="#475569" />
						</svg>

						<div class="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900/75 text-white text-[9px] font-black tracking-wider uppercase">
							<span>{unit.capacity || 35}T</span>
							{#if unit.axleConfig}
								<span>• {unit.axleConfig}</span>
							{/if}
						</div>
					</div>

					<!-- Center: Truck & Driver Information -->
					<div class="flex-1 min-w-0">
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

						<p class="text-xs font-bold text-on-surface mt-1 truncate">
							{unit.brand || 'Armada BCS'}
							{#if unit.modelName && unit.modelName !== unit.brand}
								<span class="font-medium text-on-surface-variant">• {unit.modelName}</span>
							{/if}
							{#if unit.tahun}
								<span class="text-[11px] font-mono text-on-surface-variant">({unit.tahun})</span>
							{/if}
						</p>

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
			</div>
		{/if}

		<!-- ========================================================= -->
		<!-- 2. ON-TRIP / SEDANG JALAN (VIEW-ONLY + PROGRESS BAR)      -->
		<!-- ========================================================= -->
		{#if onTripUnits.length > 0}
			<div class="pt-2">
				{#if selectedStatusFilter === 'ALL'}
					<div class="flex items-center gap-2 mb-2 px-1">
						<span class="material-symbols-outlined text-sky-600 text-sm">local_shipping</span>
						<span class="text-[10px] font-black text-sky-700 dark:text-sky-400 uppercase tracking-wider">
							Sedang Beroperasi / On-Trip ({onTripUnits.length} Unit — View-Only)
						</span>
						<div class="flex-1 h-px bg-sky-200/60 dark:bg-sky-900/40"></div>
					</div>
				{/if}

				<div class="{activeColsClass}">
					{#each onTripUnits as unit (unit.unitId || unit.id)}
						{@const pct = Number(unit.trip_progress_pct || 50)}
						<div
							class="flex items-center gap-3.5 p-3 rounded-2xl bg-sky-50/40 dark:bg-sky-950/15 border border-sky-200/70 dark:border-sky-900/40 select-none"
							title="Armada ini sedang dalam penugasan aktif dan tidak dapat dipilih ganda"
						>
							<!-- Left: Sky Operational Dump Truck Illustration -->
							<div class="relative w-28 h-20 rounded-xl bg-sky-500/10 flex flex-col items-center justify-center shrink-0 overflow-hidden">
								<svg viewBox="0 0 140 76" class="w-24 h-14" fill="none" xmlns="http://www.w3.org/2000/svg">
									<ellipse cx="70" cy="67" rx="58" ry="3.5" fill="currentColor" class="text-sky-900/15" />
									<rect x="14" y="47" width="110" height="5" rx="2" fill="#0369a1" />
									<!-- Cargo mound inside dump bed -->
									<path d="M18 18 Q50 8 82 18 Z" fill="#f59e0b" fill-opacity="0.85" />
									<path d="M10 18 L86 18 L86 46 L14 46 Z" fill="#0284c7" />
									<path d="M84 18 L96 14 L96 18 L84 22 Z" fill="#0369a1" />
									<rect x="24" y="21" width="3.5" height="22" rx="1" fill="white" fill-opacity="0.25" />
									<rect x="44" y="21" width="3.5" height="22" rx="1" fill="white" fill-opacity="0.25" />
									<rect x="64" y="21" width="3.5" height="22" rx="1" fill="white" fill-opacity="0.25" />
									<path d="M90 21 H114 C118 21 122 25 124 31 L126 39 C126.5 41 127 43 127 47 H90 V21 Z" fill="#0c4a6e" />
									<path d="M95 25 H112 C115 25 118 28 119.5 33 H95 V25 Z" fill="#e0f2fe" />
									<circle cx="27" cy="55" r="10.5" fill="#0f172a" />
									<circle cx="27" cy="55" r="5" fill="#bae6fd" />
									<circle cx="51" cy="55" r="10.5" fill="#0f172a" />
									<circle cx="51" cy="55" r="5" fill="#bae6fd" />
									<circle cx="109" cy="55" r="10.5" fill="#0f172a" />
									<circle cx="109" cy="55" r="5" fill="#bae6fd" />
								</svg>
								<div class="px-2 py-0.5 rounded-md bg-sky-700 text-white text-[9px] font-black uppercase tracking-wider">
									ON-TRIP • {pct}%
								</div>
							</div>

							<!-- Center: Trip Route & Progress Bar -->
							<div class="flex-1 min-w-0">
								<div class="flex flex-wrap items-center gap-1.5">
									<span class="px-2 py-0.5 rounded-md bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-mono text-xs font-black">
										{unit.id}
									</span>
									{#if unit.noLambung}
										<span class="text-[10px] font-mono font-bold text-on-surface-variant">#{unit.noLambung}</span>
									{/if}
									<span class="px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200 text-[10px] font-black flex items-center gap-1">
										<span class="material-symbols-outlined text-[12px]">moving</span>
										{unit.trip_stage_label || 'Sedang Jalan'}
									</span>
								</div>

								<p class="text-xs font-bold text-on-surface mt-1 truncate">
									{unit.trip_customer_name || 'Pelanggan'} • <span class="text-sky-700 dark:text-sky-300">{unit.trip_route || '-'}</span>
								</p>

								<p class="text-[11px] text-on-surface-variant truncate mt-0.5">
									Sopir: <strong class="text-on-surface">{unit.driver || '-'}</strong> • {unit.trip_detail_text || ''}
								</p>

								<!-- Progress Bar Operasional -->
								<div class="mt-2">
									<div class="flex items-center justify-between text-[10px] font-bold mb-1">
										<span class="text-sky-700 dark:text-sky-300">Progres Pengiriman / Ritase</span>
										<span class="font-mono text-sky-700 dark:text-sky-300">{pct}%</span>
									</div>
									<div class="w-full h-1.5 rounded-full bg-sky-200/70 dark:bg-sky-950 overflow-hidden">
										<div
											class="h-full rounded-full bg-sky-600 dark:bg-sky-400 transition-all duration-300"
											style="width: {pct}%"
										></div>
									</div>
								</div>
							</div>

							<div class="shrink-0 pl-1">
								<div class="w-7 h-7 rounded-xl bg-sky-500/15 text-sky-600 flex items-center justify-center" title="Sedang Beroperasi">
									<span class="material-symbols-outlined text-[16px]">local_shipping</span>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- ========================================================= -->
		<!-- 3. WORK ORDER BENGKEL: OPEN / PROSES (VIEW-ONLY + BAR)    -->
		<!-- ========================================================= -->
		{#if woUnits.length > 0}
			<div class="pt-2">
				{#if selectedStatusFilter === 'ALL'}
					<div class="flex items-center gap-2 mb-2 px-1">
						<span class="material-symbols-outlined text-amber-600 text-sm">build_circle</span>
						<span class="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider">
							Dalam Perbaikan / Work Order Open & Proses ({woUnits.length} Unit — View-Only)
						</span>
						<div class="flex-1 h-px bg-amber-200/60 dark:bg-amber-900/40"></div>
					</div>
				{/if}

				<div class="{activeColsClass}">
					{#each woUnits as unit (unit.unitId || unit.id)}
						{@const woPct = Number(unit.wo_progress_pct || 20)}
						{@const woTotal = Number(unit.wo_total_items || 0)}
						{@const woDone = Number(unit.wo_resolved_items || 0)}
						<div
							class="flex items-center gap-3.5 p-3 rounded-2xl bg-amber-50/40 dark:bg-amber-950/15 border border-amber-200/70 dark:border-amber-900/40 select-none"
							title="Armada sedang dalam pengerjaan Work Order Maintenance dan belum dapat ditugaskan"
						>
							<!-- Left: Amber Maintenance Dump Truck Illustration (Raised Bed / Service Mode) -->
							<div class="relative w-28 h-20 rounded-xl bg-amber-500/10 flex flex-col items-center justify-center shrink-0 overflow-hidden">
								<svg viewBox="0 0 140 76" class="w-24 h-14" fill="none" xmlns="http://www.w3.org/2000/svg">
									<ellipse cx="70" cy="67" rx="58" ry="3.5" fill="currentColor" class="text-amber-900/15" />
									<rect x="14" y="47" width="110" height="5" rx="2" fill="#78350f" />
									<rect x="82" y="20" width="3.5" height="28" rx="1" transform="rotate(-14 82 20)" fill="#f59e0b" />
									<!-- Slightly tilted dump bed indicating service/inspection -->
									<g transform="rotate(-8 18 46)">
										<path d="M10 20 L86 20 L86 46 L14 46 Z" fill="#d97706" />
										<rect x="25" y="23" width="3.5" height="20" rx="1" fill="white" fill-opacity="0.3" />
										<rect x="45" y="23" width="3.5" height="20" rx="1" fill="white" fill-opacity="0.3" />
										<rect x="65" y="23" width="3.5" height="20" rx="1" fill="white" fill-opacity="0.3" />
									</g>
									<path d="M90 21 H114 C118 21 122 25 124 31 L126 39 C126.5 41 127 43 127 47 H90 V21 Z" fill="#92400e" />
									<path d="M95 25 H112 C115 25 118 28 119.5 33 H95 V25 Z" fill="#fef3c7" />
									<circle cx="27" cy="55" r="10.5" fill="#451a03" />
									<circle cx="27" cy="55" r="5" fill="#fde68a" />
									<circle cx="51" cy="55" r="10.5" fill="#451a03" />
									<circle cx="51" cy="55" r="5" fill="#fde68a" />
									<circle cx="109" cy="55" r="10.5" fill="#451a03" />
									<circle cx="109" cy="55" r="5" fill="#fde68a" />
								</svg>
								<div class="px-2 py-0.5 rounded-md bg-amber-600 text-white text-[9px] font-black uppercase tracking-wider">
									WO {unit.wo_status || 'Open'}
								</div>
							</div>

							<!-- Center: Work Order Details & Repair Progress Bar -->
							<div class="flex-1 min-w-0">
								<div class="flex flex-wrap items-center gap-1.5">
									<span class="px-2 py-0.5 rounded-md bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-mono text-xs font-black">
										{unit.id}
									</span>
									<span class="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 font-mono text-[10px] font-black">
										{unit.wo_no}
									</span>
									<span class="px-2 py-0.5 rounded-md bg-surface-container text-on-surface-variant text-[10px] font-bold">
										{unit.wo_category || 'Maintenance'}
									</span>
								</div>

								<p class="text-xs font-bold text-on-surface mt-1 truncate">
									Keluhan: <span class="font-medium text-on-surface-variant">{unit.wo_complaint || '-'}</span>
								</p>

								<p class="text-[11px] text-on-surface-variant mt-0.5">
									Mekanik: <strong class="text-on-surface">{unit.wo_mechanic || 'Tim Mekanik'}</strong> • Sopir: {unit.driver || '-'}
								</p>

								<!-- Progress Bar Pengerjaan Bengkel -->
								<div class="mt-2">
									<div class="flex items-center justify-between text-[10px] font-bold mb-1">
										<span class="text-amber-800 dark:text-amber-300">
											Progres Pengerjaan:
											{#if woTotal > 0}
												{woDone}/{woTotal} Item Selesai
											{:else}
												Status {unit.wo_status}
											{/if}
										</span>
										<span class="font-mono text-amber-800 dark:text-amber-300">{woPct}%</span>
									</div>
									<div class="w-full h-1.5 rounded-full bg-amber-200/70 dark:bg-amber-950 overflow-hidden">
										<div
											class="h-full rounded-full bg-amber-600 dark:bg-amber-400 transition-all duration-300"
											style="width: {woPct}%"
										></div>
									</div>
								</div>
							</div>

							<div class="shrink-0 pl-1">
								<div class="w-7 h-7 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center" title="Sedang Diperbaiki di Bengkel">
									<span class="material-symbols-outlined text-[16px]">handyman</span>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- ========================================================= -->
		<!-- 4. LOCKED / EXPIRED DUMP TRUCKS (DISABLED AT THE BOTTOM)  -->
		<!-- ========================================================= -->
		{#if expiredUnits.length > 0}
			<div class="pt-2">
				{#if selectedStatusFilter === 'ALL'}
					<div class="flex items-center gap-2 mb-2 px-1">
						<span class="material-symbols-outlined text-rose-500 text-sm">lock</span>
						<span class="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-wider">
							Unit Terkunci — Dokumen / SIM / Kuota Sopir ({expiredUnits.length})
						</span>
						<div class="flex-1 h-px bg-rose-200/60 dark:bg-rose-900/40"></div>
					</div>
				{/if}

				<div class="{activeColsClass}">
					{#each expiredUnits as unit (unit.unitId || unit.id)}
						<div
							class="flex items-center gap-3.5 p-3 rounded-2xl bg-surface-container-lowest/60 opacity-65 cursor-not-allowed select-none"
							title="Unit ini tidak dapat dipilih karena dokumen kendaraan, SIM pengemudi, atau kuota hari kerja sopir tidak memenuhi syarat"
						>
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
									{#if !unit.has_expired_doc && !unit.has_expired_sim && (!unit.driverId || String(unit.driver || '').includes('Libur'))}
										<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
											<span class="material-symbols-outlined text-[12px]">person_off</span>
											Sopir Libur / Belum Ada Supir Aktif
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
{/snippet}

<div class="flex flex-col h-full bg-surface-container-low/50 rounded-2xl p-4">
	<!-- Top Header & Selected Counter -->
	<div class="flex flex-wrap items-center justify-between gap-2 mb-2.5">
		<div class="flex items-center gap-2">
			<span class="material-symbols-outlined text-on-surface-variant text-lg">local_shipping</span>
			<h4 class="text-xs font-black text-on-surface uppercase tracking-wider">
				Katalog & Status Armada ({units.length} Unit)
			</h4>
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

			<button
				type="button"
				onclick={() => (isFullscreen = true)}
				class="px-2.5 py-1 rounded-xl text-xs font-bold bg-surface-container hover:bg-surface-container-high text-on-surface transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
				title="Buka pilihan armada dalam layar penuh (Fullscreen 3-4 kolom)"
			>
				<span class="material-symbols-outlined text-[15px]">open_in_full</span>
				<span class="hidden sm:inline">Layar Penuh</span>
			</button>
		</div>
	</div>

	<!-- Search Bar (Borderless Standard) -->
	<div class="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-surface-container-lowest focus-within:ring-2 {theme.ring} transition-all mb-2.5">
		<span class="material-symbols-outlined text-on-surface-variant text-[18px]">search</span>
		<input
			type="text"
			bind:value={searchQuery}
			placeholder="Cari Nopol (A 9512 TX), No. Lambung, Sopir, Nomor WO, atau Rute..."
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

	{@render filterBar()}

	<!-- Scrollable Fleet Cards List (Normal View) -->
	<div class="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar" style="max-height: {maxHeight};">
		{@render fleetCards(gridCols === 2 ? 'grid grid-cols-1 md:grid-cols-2 gap-3' : 'space-y-2.5')}
	</div>
</div>

<!-- Fullscreen Overlay Modal (3 to 4 Columns) -->
{#if isFullscreen}
	<div class="fixed inset-0 z-[100] flex flex-col bg-surface-container-lowest animate-in fade-in duration-150">
		<!-- Header Fullscreen -->
		<div class="px-6 py-4 border-b border-surface-container bg-surface-container-low/70 backdrop-blur-md flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-xs">
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 rounded-xl {accentColor === 'blue' ? 'bg-blue-600' : accentColor === 'indigo' ? 'bg-indigo-600' : 'bg-amber-600'} text-white flex items-center justify-center shadow-xs">
					<span class="material-symbols-outlined text-2xl">local_shipping</span>
				</div>
				<div>
					<div class="flex items-center gap-2">
						<h3 class="text-base font-extrabold text-on-surface">Katalog Armada Dump Truck & Sopir BCS</h3>
						<span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-surface-container-high text-on-surface">
							Mode Layar Penuh (3-4 Kolom)
						</span>
					</div>
					<p class="text-xs text-on-surface-variant mt-0.5">
						Total {units.length} Armada BCS • Siap Ditugaskan: <span class="font-bold text-emerald-600">{totalReadyCount}</span> • On-Trip: <span class="font-bold text-sky-600">{totalOnTripCount}</span> • Bengkel WO: <span class="font-bold text-amber-600">{totalWoCount}</span>
					</p>
				</div>
			</div>

			<div class="flex items-center gap-3">
				<span class="text-xs text-on-surface-variant font-medium hidden md:inline">
					Tekan <kbd class="px-1.5 py-0.5 rounded bg-surface-container border border-surface-container-high font-mono text-[10px]">ESC</kbd> untuk kembali
				</span>
				<button
					type="button"
					onclick={() => (isFullscreen = false)}
					class="px-5 py-2.5 rounded-xl text-xs font-bold {accentColor === 'blue' ? 'bg-blue-600 hover:bg-blue-700' : accentColor === 'indigo' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-amber-600 hover:bg-amber-700'} text-white transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
				>
					<span class="material-symbols-outlined text-[16px]">check_circle</span>
					<span>Selesai Memilih ({selectedCount} Unit)</span>
				</button>
			</div>
		</div>

		<!-- Pinned Search & Filter Ribbon in Fullscreen -->
		<div class="px-6 py-3 border-b border-surface-container bg-surface-container-lowest flex flex-wrap items-center justify-between gap-4 shrink-0">
			<!-- Search Bar -->
			<div class="flex-1 min-w-[280px] max-w-xl flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-surface-container-low focus-within:ring-2 {theme.ring} transition-all">
				<span class="material-symbols-outlined text-on-surface-variant text-[18px]">search</span>
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Cari Nopol (A 9512 TX), No. Lambung, Sopir, Nomor WO, atau Rute..."
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

			<!-- Filter Bar -->
			<div class="flex items-center gap-2 flex-wrap">
				{@render filterBar()}
			</div>
		</div>

		<!-- Main Scrollable Grid in Fullscreen (3 to 4 Columns) -->
		<div class="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar bg-surface-container-lowest">
			{@render fleetCards('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5')}
		</div>

		<!-- Sticky Bottom Cart Bar in Fullscreen -->
		<div class="px-6 py-3.5 border-t border-surface-container bg-surface-container-lowest shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
			{#if selectedCount === 0}
				<div class="flex items-center gap-2.5 text-on-surface-variant">
					<div class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center shrink-0">
						<span class="material-symbols-outlined text-[18px]">shopping_cart</span>
					</div>
					<div>
						<p class="text-xs font-bold text-on-surface">Keranjang Armada Masih Kosong</p>
						<p class="text-[11px] text-on-surface-variant">Klik kartu armada di atas untuk menambahkan unit ke penugasan ini.</p>
					</div>
				</div>
				<button
					type="button"
					onclick={() => (isFullscreen = false)}
					class="px-5 py-2.5 rounded-xl text-xs font-bold bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors cursor-pointer self-end sm:self-auto"
				>
					Kembali ke Form
				</button>
			{:else}
				<div class="flex-1 min-w-0 space-y-1.5">
					<div class="flex items-center justify-between gap-2">
						<div class="flex items-center gap-2">
							<span class="px-2 py-0.5 rounded-md text-white text-[11px] font-black uppercase tracking-wider {theme.badgeSelected}">
								{selectedCount} Unit Terpilih
							</span>
							<span class="text-xs font-bold text-on-surface">
								Est. Kapasitas: <span class="font-extrabold {accentColor === 'blue' ? 'text-blue-600' : accentColor === 'indigo' ? 'text-indigo-600' : 'text-amber-600'}">{totalSelectedTons} Ton</span>
							</span>
						</div>
						<button type="button" onclick={clearSelection} class="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer">
							Kosongkan Keranjang
						</button>
					</div>

					<!-- Horizontal Scrollable Chips with Remove (x) -->
					<div class="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
						{#each selectedUnitObjects as u}
							<span class="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg text-xs font-bold bg-surface-container border border-surface-container-high text-on-surface shrink-0">
								<span class="font-mono">{u.id}</span>
								{#if u.driver}
									<span class="text-[10px] font-normal opacity-85 truncate max-w-[90px]">• {u.driver}</span>
								{/if}
								<button
									type="button"
									onclick={() => {
										if (multiple) {
											value = value.filter((v) => v !== u.key && !v.startsWith(`${u.id}|`));
										} else {
											singleValue = '';
										}
									}}
									class="w-4 h-4 rounded-full hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant cursor-pointer"
									title="Hapus unit ini"
								>
									<span class="material-symbols-outlined text-[13px]">close</span>
								</button>
							</span>
						{/each}
					</div>
				</div>

				<div class="flex items-center gap-3 shrink-0 self-end sm:self-center">
					<button
						type="button"
						onclick={() => (isFullscreen = false)}
						class="px-6 py-2.5 rounded-xl text-xs font-bold {accentColor === 'blue' ? 'bg-blue-600 hover:bg-blue-700' : accentColor === 'indigo' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-amber-600 hover:bg-amber-700'} text-white transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
					>
						<span class="material-symbols-outlined text-[16px]">check_circle</span>
						<span>Selesai Memilih & Simpan ({selectedCount} Unit)</span>
					</button>
				</div>
			{/if}
		</div>
	</div>
{/if}
