<script lang="ts">
	import type { PageData } from './$types';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';

	let { data }: { data: PageData } = $props();

	let metrics = $derived(data.metrics);
	let units = $derived(data.units || []);
	let selectedUnitId = $state(data.selectedUnitId || 'DT-01');
	let wheelPositions = $derived(data.wheelPositions || []);
	let tires = $derived(data.tires || []);

	// Filter state
	let searchQuery = $state($page.url.searchParams.get('search') || '');
	let activeStatus = $state($page.url.searchParams.get('status') || 'All');

	let searchTimer: ReturnType<typeof setTimeout>;

	function updateQueryParams() {
		const url = new URL(window.location.href);
		if (searchQuery) url.searchParams.set('search', searchQuery);
		else url.searchParams.delete('search');

		if (activeStatus && activeStatus !== 'All') url.searchParams.set('status', activeStatus);
		else url.searchParams.delete('status');

		url.searchParams.set('unit', selectedUnitId);
		goto(url.toString(), { keepFocus: true, noScroll: true });
	}

	function handleSearchInput() {
		clearTimeout(searchTimer);
		searchTimer = setTimeout(updateQueryParams, 400);
	}

	function handleStatusFilter(st: string) {
		activeStatus = st;
		updateQueryParams();
	}

	function handleUnitSelect(uId: string) {
		selectedUnitId = uId;
		updateQueryParams();
	}

	// Modal State: Inspect / Rotate
	let showInspectModal = $state(false);
	let selectedWheelForAction = $state<any | null>(null);
	let inspectTreadDepth = $state(12.0);
	let inspectNotes = $state('');
	let isSubmitting = $state(false);
	let actionFeedbackMessage = $state('');

	// Rotation modal state
	let showRotateModal = $state(false);
	let rotateFromPos = $state('FL');
	let rotateToPos = $state('FR');

	function openInspectModal(wheel: any) {
		if (!wheel || !wheel.tire_id) return;
		selectedWheelForAction = wheel;
		inspectTreadDepth = parseFloat(wheel.current_tread_depth_mm) || 10.0;
		inspectNotes = '';
		showInspectModal = true;
	}

	async function submitInspection() {
		if (!selectedWheelForAction) return;
		isSubmitting = true;
		try {
			const res = await fetch('/api/fms/tires/action', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'INSPECT',
					tire_id: selectedWheelForAction.tire_id,
					unit_id: selectedUnitId,
					from_pos: selectedWheelForAction.position_code,
					tread_depth: inspectTreadDepth,
					notes: inspectNotes
				})
			});
			const d = await res.json();
			if (d.success) {
				actionFeedbackMessage = d.message;
				showInspectModal = false;
				invalidateAll();
				setTimeout(() => actionFeedbackMessage = '', 4000);
			} else {
				alert(d.message);
			}
		} catch (e) {
			console.error(e);
		} finally {
			isSubmitting = false;
		}
	}

	async function submitRotation() {
		if (!rotateFromPos || !rotateToPos || rotateFromPos === rotateToPos) {
			alert('Pilih dua posisi roda yang berbeda untuk dirotasi.');
			return;
		}
		isSubmitting = true;
		try {
			const res = await fetch('/api/fms/tires/action', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'ROTATE',
					unit_id: selectedUnitId,
					from_pos: rotateFromPos,
					to_pos: rotateToPos,
					notes: `Rotasi roda ${rotateFromPos} <-> ${rotateToPos}`
				})
			});
			const d = await res.json();
			if (d.success) {
				actionFeedbackMessage = d.message;
				showRotateModal = false;
				invalidateAll();
				setTimeout(() => actionFeedbackMessage = '', 4000);
			} else {
				alert(d.message);
			}
		} catch (e) {
			console.error(e);
		} finally {
			isSubmitting = false;
		}
	}

	function getTreadDepthColor(mm: number): { bg: string; text: string; bar: string; label: string } {
		if (mm >= 8.0) {
			return { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', bar: 'bg-emerald-500', label: 'Tebal (Aman)' };
		} else if (mm >= 4.0) {
			return { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', bar: 'bg-amber-500', label: 'Sedang (Perlu Pantau)' };
		} else {
			return { bg: 'bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400', bar: 'bg-rose-500', label: 'Kritis (Harus Diganti/Vulkanisir)' };
		}
	}

	function getWheelByPos(code: string) {
		return wheelPositions.find((w: any) => w.position_code === code);
	}
</script>

<svelte:head>
	<title>Tire Management System (TMS) | ERP BCS</title>
</svelte:head>

<div class="flex flex-col space-y-6">
	<!-- Header & Actions -->
	<header class="flex flex-col md:flex-row md:items-end justify-between gap-4 flex-shrink-0">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-blue-600 dark:text-blue-400 text-2xl">tire_repair</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Tire Management System (TMS)</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-sm mt-0.5">
				Diagram visual posisi ban armada, monitoring kedalaman alur (tread depth), tracking vulkanisir & kalkulasi CPK
			</p>
		</div>
		<div class="flex gap-2.5">
			<button 
				onclick={() => showRotateModal = true}
				class="bg-surface-container-low border border-slate-200 dark:border-slate-800 text-on-surface px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-surface-container transition-colors shadow-xs cursor-pointer"
			>
				<span class="material-symbols-outlined text-lg">sync_alt</span>
				<span>Rotasi Posisi Ban</span>
			</button>
		</div>
	</header>

	{#if actionFeedbackMessage}
		<div class="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-sm flex items-center gap-2 animate-in fade-in">
			<span class="material-symbols-outlined text-lg">check_circle</span>
			<span>{actionFeedbackMessage}</span>
		</div>
	{/if}

	<!-- Bento Metrics Grid -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
		<!-- Total Ban -->
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Ban Master</p>
					<h3 class="text-2xl font-black text-on-surface mt-1 font-mono">{metrics.total}</h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">tire_repair</span>
				</div>
			</div>
			<p class="text-xs text-on-surface-variant mt-2">Seluruh aset ban terdaftar</p>
		</div>

		<!-- Terpasang di Armada -->
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Terpasang di Unit</p>
					<h3 class="text-2xl font-black text-emerald-600 mt-1 font-mono">{metrics.mounted}</h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">local_shipping</span>
				</div>
			</div>
			<p class="text-xs text-emerald-600 font-medium mt-2">Aktif berjalan di rute</p>
		</div>

		<!-- Stok Gudang Pool -->
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Stok Gudang Pool</p>
					<h3 class="text-2xl font-black text-blue-600 mt-1 font-mono">{metrics.spareStock}</h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">warehouse</span>
				</div>
			</div>
			<p class="text-xs text-blue-600 font-medium mt-2">Ban cadangan siap pasang</p>
		</div>

		<!-- Antrean Vulkanisir -->
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Proses Vulkanisir</p>
					<h3 class="text-2xl font-black text-amber-600 mt-1 font-mono">{metrics.retreading}</h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">autorenew</span>
				</div>
			</div>
			<p class="text-xs text-amber-600 font-medium mt-2">Sedang di pabrik retread</p>
		</div>

		<!-- Alur Kritis Alert -->
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Alur Kritis (&lt;4mm)</p>
					<h3 class="text-2xl font-black {metrics.criticalTread > 0 ? 'text-rose-600' : 'text-on-surface'} mt-1 font-mono">{metrics.criticalTread}</h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">warning</span>
				</div>
			</div>
			<p class="text-xs text-rose-600 font-medium mt-2">Wajib segera diganti</p>
		</div>
	</div>

	<!-- SECTION: INTERACTIVE AXLE WHEEL VISUALIZER -->
	<div class="p-6 rounded-3xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs space-y-6">
		<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
			<div>
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-blue-600 text-xl">view_column</span>
					<h2 class="text-base font-black text-on-surface tracking-tight">Diagram Visual Posisi Roda (Axle Visualizer)</h2>
				</div>
				<p class="text-xs text-on-surface-variant font-medium mt-0.5">
					Pilih armada truk untuk memantau status keausan alur tapak ban per slot roda secara interaktif
				</p>
			</div>

			<!-- Unit Selector Pill List -->
			<div class="flex items-center gap-2 overflow-x-auto max-w-full pb-1">
				{#each units as u}
					<button
						onclick={() => handleUnitSelect(u.id)}
						class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer {selectedUnitId === u.id
							? 'bg-blue-600 text-white shadow-xs'
							: 'bg-surface border border-slate-200 dark:border-slate-800 text-on-surface hover:bg-surface-container'}"
					>
						{u.id}
					</button>
				{/each}
			</div>
		</div>

		<!-- Visual Truck Chassis 10 Wheels Diagram -->
		<div class="max-w-3xl mx-auto py-4">
			<div class="relative bg-surface rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-inner">
				
				<!-- Front Cab Indicator -->
				<div class="w-full flex justify-center mb-6">
					<div class="px-6 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 text-xs font-black uppercase tracking-widest flex items-center gap-2">
						<span class="material-symbols-outlined text-sm">arrow_upward</span>
						<span>DEPAN KABIN TRUK (FRONT CABIN)</span>
						<span class="material-symbols-outlined text-sm">arrow_upward</span>
					</div>
				</div>

				<!-- Chassis Spine (Center Beam) -->
				{#snippet wheelButton(posCode: string, label: string, isCompact: boolean = false)}
					{@const w = getWheelByPos(posCode)}
					{#if isCompact}
						<button onclick={() => openInspectModal(w)} class="flex-1 p-2.5 rounded-xl border bg-surface-container-low hover:border-blue-500 text-left cursor-pointer transition-all">
							<div class="flex justify-between items-center text-[9px] font-black">
								<span class="text-blue-600">{posCode}</span>
								<span class="{w ? getTreadDepthColor(parseFloat(w.current_tread_depth_mm)).text : 'text-slate-400'} font-mono">{w ? w.current_tread_depth_mm + 'mm' : '—'}</span>
							</div>
							<p class="text-[11px] font-bold text-on-surface truncate mt-1">{w?.brand || 'Slot Kosong'}</p>
						</button>
					{:else}
						<button 
							onclick={() => openInspectModal(w)}
							class="flex-1 p-3.5 rounded-2xl border transition-all text-left cursor-pointer {w ? 'bg-surface-container-low hover:border-blue-500 shadow-xs' : 'bg-slate-100/50 dark:bg-slate-800/30 border-dashed border-slate-300'}"
						>
							{#if w}
								{@const clr = getTreadDepthColor(parseFloat(w.current_tread_depth_mm))}
								<div class="flex justify-between items-start">
									<span class="text-[10px] font-black px-2 py-0.5 rounded bg-blue-500/10 text-blue-600">{label}</span>
									<span class="text-xs font-black font-mono {clr.text}">{w.current_tread_depth_mm} mm</span>
								</div>
								<p class="text-xs font-bold text-on-surface mt-2 truncate">{w.brand}</p>
								<p class="text-[10px] text-on-surface-variant font-mono truncate">{w.serial_number}</p>
								<div class="mt-2 w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
									<div class="{clr.bar} h-full" style="width: {(parseFloat(w.current_tread_depth_mm) / 16.0) * 100}%"></div>
								</div>
							{:else}
								<p class="text-xs text-center text-on-surface-variant">Slot Kosong ({posCode})</p>
							{/if}
						</button>
					{/if}
				{/snippet}

				<div class="space-y-8 relative">
					<!-- Axle 1: Front Steer (2 wheels: FL, FR) -->
					<div>
						<div class="text-center text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">
							GANDAR 1: KEMUDI DEPAN (STEER AXLE)
						</div>
						<div class="flex items-center justify-between gap-4">
							{@render wheelButton('FL', 'FL (Kiri Depan)')}
							<!-- Center Axle Beam -->
							<div class="w-16 h-3 bg-slate-400 dark:bg-slate-600 rounded-full flex-shrink-0"></div>
							{@render wheelButton('FR', 'FR (Kanan Depan)')}
						</div>
					</div>

					<!-- Axle 2: Drive Axle 1 (Dual Wheels: RL1_OUT, RL1_IN | RR1_IN, RR1_OUT) -->
					<div>
						<div class="text-center text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">
							GANDAR 2: DRIVE AXLE 1 (TENGAH - 4 RODA GANDA)
						</div>
						<div class="grid grid-cols-2 gap-6 items-center">
							<!-- Left Dual Wheels -->
							<div class="flex gap-2">
								{@render wheelButton('RL1_OUT', 'RL1-OUT', true)}
								{@render wheelButton('RL1_IN', 'RL1-IN', true)}
							</div>
							<!-- Right Dual Wheels -->
							<div class="flex gap-2">
								{@render wheelButton('RR1_IN', 'RR1-IN', true)}
								{@render wheelButton('RR1_OUT', 'RR1-OUT', true)}
							</div>
						</div>
					</div>

					<!-- Axle 3: Drive Axle 2 (Dual Wheels: RL2_OUT, RL2_IN | RR2_IN, RR2_OUT) -->
					<div>
						<div class="text-center text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">
							GANDAR 3: DRIVE AXLE 2 (BELAKANG - 4 RODA GANDA)
						</div>
						<div class="grid grid-cols-2 gap-6 items-center">
							<!-- Left Dual Wheels -->
							<div class="flex gap-2">
								{@render wheelButton('RL2_OUT', 'RL2-OUT', true)}
								{@render wheelButton('RL2_IN', 'RL2-IN', true)}
							</div>
							<!-- Right Dual Wheels -->
							<div class="flex gap-2">
								{@render wheelButton('RR2_IN', 'RR2-IN', true)}
								{@render wheelButton('RR2_OUT', 'RR2-OUT', true)}
							</div>
						</div>
					</div>
				</div>

				<!-- Legend -->
				<div class="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-center gap-6 flex-wrap text-xs font-bold text-on-surface-variant">
					<div class="flex items-center gap-2">
						<span class="w-3 h-3 rounded-full bg-emerald-500"></span>
						<span>Tebal (>8mm)</span>
					</div>
					<div class="flex items-center gap-2">
						<span class="w-3 h-3 rounded-full bg-amber-500"></span>
						<span>Sedang (4-8mm)</span>
					</div>
					<div class="flex items-center gap-2">
						<span class="w-3 h-3 rounded-full bg-rose-500"></span>
						<span>Kritis (&lt;4mm)</span>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Unified Filter & Search Bar for Master Tire Table -->
	<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 flex flex-col md:flex-row gap-4 items-center justify-between shadow-xs">
		<!-- Tabs (Segmented Control Status Ban) -->
		<div class="inline-flex p-1 rounded-2xl bg-surface-container border border-slate-200 dark:border-slate-800 overflow-x-auto max-w-full">
			{#each [
				{ key: 'All', label: 'Semua Status' },
				{ key: 'MOUNTED', label: 'Terpasang' },
				{ key: 'SPARE_STOCK', label: 'Stok Pool' },
				{ key: 'RETREADING', label: 'Vulkanisir' },
				{ key: 'SCRAPPED', label: 'Afkir' }
			] as tab}
				<button
					class="px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer {activeStatus === tab.key
						? 'bg-surface text-blue-600 dark:text-blue-400 shadow-xs'
						: 'text-on-surface-variant hover:text-on-surface'}"
					onclick={() => handleStatusFilter(tab.key)}
				>
					{tab.label}
				</button>
			{/each}
		</div>

		<!-- Search Input -->
		<div class="relative w-full md:w-80 flex-shrink-0">
			<span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
			<input 
				type="text" 
				bind:value={searchQuery}
				oninput={handleSearchInput}
				placeholder="Cari Serial No, Merk, Unit..." 
				class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl py-2 pl-10 pr-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/40 placeholder:text-slate-400"
			/>
		</div>
	</div>

	<!-- Master Tire Data Table -->
	<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs flex-1 flex flex-col">
		<div class="overflow-x-auto flex-1">
			<table class="w-full text-left text-sm min-w-[1000px]">
				<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
					<tr>
						<th class="py-3.5 px-5">Serial Number & Merk</th>
						<th class="py-3.5 px-5">Posisi Terpasang</th>
						<th class="py-3.5 px-5">Kedalaman Alur (Tread Depth)</th>
						<th class="py-3.5 px-5">Status Casing / Vulkanisir</th>
						<th class="py-3.5 px-5">Total Jarak & CPK</th>
						<th class="py-3.5 px-5 text-right">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
					{#each tires as tire}
						{@const clr = getTreadDepthColor(parseFloat(tire.current_tread_depth_mm))}
						<tr class="hover:bg-surface-container transition-colors">
							<!-- Serial & Brand -->
							<td class="py-4 px-5">
								<div class="flex items-center gap-3">
									<div class="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
										<span class="material-symbols-outlined text-lg">tire_repair</span>
									</div>
									<div>
										<p class="font-black text-on-surface font-mono text-xs">{tire.serial_number}</p>
										<p class="text-xs text-on-surface-variant font-medium">{tire.brand} • <span class="text-[11px] text-slate-500">{tire.size_spec}</span></p>
									</div>
								</div>
							</td>

							<!-- Unit & Position -->
							<td class="py-4 px-5">
								{#if tire.unit_id}
									<span class="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 font-bold text-xs border border-blue-500/20">
										{tire.unit_id} ({tire.position_code})
									</span>
								{:else if tire.status === 'SPARE_STOCK'}
									<span class="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 font-bold text-xs">
										Stok Pool
									</span>
								{:else if tire.status === 'RETREADING'}
									<span class="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 font-bold text-xs">
										Di Vendor Retread
									</span>
								{:else}
									<span class="px-2 py-0.5 rounded-md bg-slate-500/10 text-slate-500 font-bold text-xs">
										{tire.status}
									</span>
								{/if}
							</td>

							<!-- Tread Depth Gauge -->
							<td class="py-4 px-5">
								<div class="w-36 space-y-1">
									<div class="flex justify-between text-xs font-mono">
										<span class="font-black {clr.text}">{tire.current_tread_depth_mm} mm</span>
										<span class="text-[10px] text-on-surface-variant">/ {tire.original_tread_depth_mm} mm</span>
									</div>
									<div class="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
										<div class="{clr.bar} h-full rounded-full transition-all" style="width: {(parseFloat(tire.current_tread_depth_mm) / parseFloat(tire.original_tread_depth_mm)) * 100}%"></div>
									</div>
								</div>
							</td>

							<!-- Retread Count -->
							<td class="py-4 px-5">
								{#if tire.retread_count === 0}
									<span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20">
										Original (Casing Asli)
									</span>
								{:else if tire.retread_count === 1}
									<span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
										Vulkanisir I (R1)
									</span>
								{:else}
									<span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-600 border border-purple-500/20">
										Vulkanisir II (R2)
									</span>
								{/if}
							</td>

							<!-- Total KM & CPK -->
							<td class="py-4 px-5">
								<p class="font-bold text-on-surface font-mono text-xs">{Number(tire.total_km_run).toLocaleString('id-ID')} km</p>
								<p class="text-[11px] text-emerald-600 font-bold font-mono">CPK: Rp {tire.cost_per_km}/km</p>
							</td>

							<!-- Action -->
							<td class="py-4 px-5 text-right">
								<button 
									onclick={() => openInspectModal({ tire_id: tire.id, serial_number: tire.serial_number, brand: tire.brand, current_tread_depth_mm: tire.current_tread_depth_mm, position_code: tire.position_code })}
									class="px-3 py-1.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-surface-container transition-colors cursor-pointer"
								>
									Ukur Alur
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>

<!-- MODAL 1: INSPEKSI KEDALAMAN ALUR BAN (TREAD DEPTH) -->
{#if showInspectModal && selectedWheelForAction}
	<div class="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
		<div class="bg-surface-container-low border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl max-w-md w-full space-y-5 animate-in zoom-in-95">
			<div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-blue-600 text-xl">straighten</span>
					<h3 class="text-base font-black text-on-surface">Catat Kedalaman Alur (Tread Depth)</h3>
				</div>
				<button onclick={() => showInspectModal = false} class="text-on-surface-variant hover:text-on-surface cursor-pointer">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<div class="p-3.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-800">
				<p class="text-xs font-black text-on-surface font-mono">{selectedWheelForAction.serial_number}</p>
				<p class="text-xs text-on-surface-variant mt-0.5">{selectedWheelForAction.brand} • Posisi: {selectedWheelForAction.position_code || 'Gudang'}</p>
			</div>

			<div class="space-y-2">
				<label class="text-xs font-bold text-on-surface uppercase tracking-wider block">
					Kedalaman Alur Tapak Terukur (mm):
				</label>
				<div class="flex items-center gap-3">
					<input 
						type="number" 
						step="0.1" 
						min="0.5" 
						max="25.0"
						bind:value={inspectTreadDepth} 
						class="flex-1 bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl p-3 text-lg font-black font-mono focus:ring-2 focus:ring-blue-500"
					/>
					<span class="text-sm font-bold text-on-surface-variant">milimeter</span>
				</div>
				<p class="text-[11px] text-on-surface-variant">Batas minimum kelayakan jalan regulasi Kemenhub & standar BCS: <strong>3.0 mm</strong>.</p>
			</div>

			<div class="space-y-1">
				<label class="text-xs font-bold text-on-surface uppercase tracking-wider block">Catatan Pemeriksaan / Temuan Fisik:</label>
				<textarea 
					bind:value={inspectNotes}
					placeholder="Contoh: Aus merata, tidak ada robekan kawat samping..."
					class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl p-3 text-xs font-medium focus:ring-2 focus:ring-blue-500"
					rows="2"
				></textarea>
			</div>

			<div class="flex gap-3 pt-2">
				<button 
					type="button" 
					onclick={() => showInspectModal = false}
					class="flex-1 py-2.5 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-surface-container-high transition-colors cursor-pointer"
				>
					Batal
				</button>
				<button 
					type="button" 
					disabled={isSubmitting}
					onclick={submitInspection}
					class="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
				>
					{isSubmitting ? 'Menyimpan...' : 'Simpan Hasil Ukur'}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- MODAL 2: ROTASI POSISI BAN (TIRE ROTATION / SWAP) -->
{#if showRotateModal}
	<div class="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
		<div class="bg-surface-container-low border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl max-w-md w-full space-y-5 animate-in zoom-in-95">
			<div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-blue-600 text-xl">sync_alt</span>
					<h3 class="text-base font-black text-on-surface">Rotasi Posisi Ban ({selectedUnitId})</h3>
				</div>
				<button onclick={() => showRotateModal = false} class="text-on-surface-variant hover:text-on-surface cursor-pointer">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<p class="text-xs text-on-surface-variant leading-relaxed">
				Tukar posisi ban untuk meratakan tingkat keausan tapak roda (misal: tukar roda kemudi depan FL dengan FR atau silang ke Drive Axle).
			</p>

			<div class="grid grid-cols-2 gap-4">
				<div class="space-y-1">
					<label class="text-[10px] font-black text-on-surface uppercase tracking-wider block">Posisi Asal (A):</label>
					<select bind:value={rotateFromPos} class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl p-2.5 text-xs font-bold">
						{#each wheelPositions as w}
							<option value={w.position_code}>{w.position_code} ({w.brand || 'Kosong'})</option>
						{/each}
					</select>
				</div>
				<div class="space-y-1">
					<label class="text-[10px] font-black text-on-surface uppercase tracking-wider block">Tukar dengan (B):</label>
					<select bind:value={rotateToPos} class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl p-2.5 text-xs font-bold">
						{#each wheelPositions as w}
							<option value={w.position_code}>{w.position_code} ({w.brand || 'Kosong'})</option>
						{/each}
					</select>
				</div>
			</div>

			<div class="flex gap-3 pt-2">
				<button 
					type="button" 
					onclick={() => showRotateModal = false}
					class="flex-1 py-2.5 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-surface-container-high transition-colors cursor-pointer"
				>
					Batal
				</button>
				<button 
					type="button" 
					disabled={isSubmitting}
					onclick={submitRotation}
					class="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
				>
					{isSubmitting ? 'Memproses...' : 'Lakukan Rotasi Ban'}
				</button>
			</div>
		</div>
	</div>
{/if}
