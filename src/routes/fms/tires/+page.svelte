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

	// Multi-Axle Visualizer Configuration State
	let selectedAxleConfig = $state<'AUTO' | '4_WHEELS' | '6_WHEELS' | '10_WHEELS' | '18_WHEELS' | '22_WHEELS'>('AUTO');

	let effectiveAxleConfig = $derived.by(() => {
		if (selectedAxleConfig !== 'AUTO') return selectedAxleConfig;
		const codes = wheelPositions.map((w: any) => w.position_code);
		if (codes.includes('TR3_L_OUT')) return '22_WHEELS';
		if (codes.includes('TR1_L_OUT') || selectedUnitId.includes('TR') || selectedUnitId.includes('TRAILER')) return '18_WHEELS';
		if (codes.includes('RL2_OUT') || codes.includes('RL2_IN')) return '10_WHEELS';
		if (codes.includes('RL_OUT') || codes.includes('RL_IN')) return '6_WHEELS';
		if (codes.includes('RL') || codes.includes('RR')) return '4_WHEELS';
		return '10_WHEELS';
	});

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
		<div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
			<div>
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-blue-600 text-xl">view_column</span>
					<h2 class="text-base font-black text-on-surface tracking-tight">Diagram Visual Posisi Roda (Axle Visualizer)</h2>
				</div>
				<p class="text-xs text-on-surface-variant font-medium mt-0.5">
					Mendukung armada Engkel (4 roda), CDD (6 roda), Tronton (10 roda), hingga Tractor Head + Trailer Gandengan (18–22 roda)
				</p>
			</div>

			<!-- Unit Selector Pill List -->
			<div class="flex items-center gap-2 overflow-x-auto max-w-full pb-1">
				{#each units as u}
					<button
						onclick={() => handleUnitSelect(u.id.toString())}
						class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer {selectedUnitId === u.id.toString() || selectedUnitId === u.nomor_unit
							? 'bg-blue-600 text-white shadow-xs'
							: 'bg-surface border border-slate-200 dark:border-slate-800 text-on-surface hover:bg-surface-container'}"
					>
						{u.display_name || u.nomor_unit || u.id}
					</button>
				{/each}
			</div>
		</div>

		<!-- Active Vehicle Info Banner -->
		{#if data.activeUnit}
			<div class="flex items-center justify-between bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 rounded-2xl px-4 py-2.5">
				<div class="flex items-center gap-3">
					<div class="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
						<span class="material-symbols-outlined text-base">local_shipping</span>
					</div>
					<div>
						<p class="text-xs font-black text-on-surface">Unit: {data.activeUnit.nomor_unit} <span class="text-blue-600 font-mono">({data.activeUnit.nama_tipe})</span></p>
						<p class="text-[10px] text-on-surface-variant font-medium">Konfigurasi Gandar Pabrik: <span class="font-bold text-on-surface uppercase">{data.activeUnit.axle_config}</span> • Total Roda Terpasang: <span class="font-bold text-on-surface">{wheelPositions.length} Ban</span></p>
					</div>
				</div>
				<button 
					onclick={() => goto(`/fms/vehicles`)}
					class="px-3 py-1 rounded-xl bg-surface border border-slate-200 dark:border-slate-800 text-[11px] font-bold text-blue-600 hover:bg-surface-container transition-all cursor-pointer"
				>
					Buka Detail Truk ↗
				</button>
			</div>
		{/if}

		<!-- Axle Layout Mode Selector -->
		<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800/60">
			<div class="flex items-center gap-2">
				<span class="material-symbols-outlined text-blue-600 text-sm">settings_suggest</span>
				<span class="text-xs font-black text-on-surface uppercase tracking-wider">Pilih Konfigurasi Gandar:</span>
			</div>
			<div class="inline-flex p-1 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 overflow-x-auto max-w-full">
				{#each [
					{ key: 'AUTO', label: '⚡ Auto-Detect' },
					{ key: '4_WHEELS', label: '4 Roda (CDE Engkel)' },
					{ key: '6_WHEELS', label: '6 Roda (CDD Double)' },
					{ key: '10_WHEELS', label: '10 Roda (Tronton 6x4)' },
					{ key: '18_WHEELS', label: '18 Roda (Trailer 2-Axle)' },
					{ key: '22_WHEELS', label: '22 Roda (Trailer 3-Axle)' }
				] as opt}
					<button
						onclick={() => selectedAxleConfig = opt.key as any}
						class="px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer {selectedAxleConfig === opt.key
							? 'bg-surface text-blue-600 dark:text-blue-400 shadow-xs'
							: 'text-on-surface-variant hover:text-on-surface'}"
					>
						{opt.label}
					</button>
				{/each}
			</div>
		</div>

		<!-- Visual Truck Chassis Multi-Axle Diagram -->
		<div class="max-w-3xl mx-auto py-4">
			<div class="relative bg-surface rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-inner space-y-8">
				
				<!-- Front Cab Indicator -->
				<div class="w-full flex justify-center">
					<div class="px-6 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 text-xs font-black uppercase tracking-widest flex items-center gap-2">
						<span class="material-symbols-outlined text-sm">arrow_upward</span>
						<span>DEPAN KABIN TRUK ({effectiveAxleConfig.replace('_', ' ')})</span>
						<span class="material-symbols-outlined text-sm">arrow_upward</span>
					</div>
				</div>

				<!-- Chassis Spine & Wheel Snippet -->
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

				<!-- 1. FRONT STEER AXLE (Semua tipe truk memiliki 2 roda depan) -->
				<div>
					<div class="text-center text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">
						GANDAR 1: KEMUDI DEPAN (STEER AXLE)
					</div>
					<div class="flex items-center justify-between gap-4">
						{@render wheelButton('FL', 'FL (Kiri Depan)')}
						<div class="w-16 h-3 bg-slate-400 dark:bg-slate-600 rounded-full flex-shrink-0"></div>
						{@render wheelButton('FR', 'FR (Kanan Depan)')}
					</div>
				</div>

				<!-- 2. REAR AXLES ACCORDING TO CONFIGURATION -->
				{#if effectiveAxleConfig === '4_WHEELS'}
					<!-- 4 Roda (CDE Engkel): Single Rear Wheels -->
					<div>
						<div class="text-center text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">
							GANDAR 2: BELAKANG TUNGGAL (REAR SINGLE AXLE)
						</div>
						<div class="flex items-center justify-between gap-4">
							{@render wheelButton('RL', 'RL (Kiri Belakang)')}
							<div class="w-16 h-3 bg-slate-400 dark:bg-slate-600 rounded-full flex-shrink-0"></div>
							{@render wheelButton('RR', 'RR (Kanan Belakang)')}
						</div>
					</div>

				{:else if effectiveAxleConfig === '6_WHEELS'}
					<!-- 6 Roda (CDD Double): Dual Rear Wheels -->
					<div>
						<div class="text-center text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">
							GANDAR 2: PENGGERAK BELAKANG (REAR DUAL AXLE - 4 RODA)
						</div>
						<div class="grid grid-cols-2 gap-6 items-center">
							<div class="flex gap-2">
								{@render wheelButton('RL_OUT', 'RL-OUT', true)}
								{@render wheelButton('RL_IN', 'RL-IN', true)}
							</div>
							<div class="flex gap-2">
								{@render wheelButton('RR_IN', 'RR-IN', true)}
								{@render wheelButton('RR_OUT', 'RR-OUT', true)}
							</div>
						</div>
					</div>

				{:else if effectiveAxleConfig === '10_WHEELS'}
					<!-- 10 Roda (Tronton 6x4): Drive 1 + Drive 2 -->
					<div class="space-y-6">
						<div>
							<div class="text-center text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">
								GANDAR 2: DRIVE AXLE 1 (TENGAH - 4 RODA GANDA)
							</div>
							<div class="grid grid-cols-2 gap-6 items-center">
								<div class="flex gap-2">
									{@render wheelButton('RL1_OUT', 'RL1-OUT', true)}
									{@render wheelButton('RL1_IN', 'RL1-IN', true)}
								</div>
								<div class="flex gap-2">
									{@render wheelButton('RR1_IN', 'RR1-IN', true)}
									{@render wheelButton('RR1_OUT', 'RR1-OUT', true)}
								</div>
							</div>
						</div>

						<div>
							<div class="text-center text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">
								GANDAR 3: DRIVE AXLE 2 (BELAKANG - 4 RODA GANDA)
							</div>
							<div class="grid grid-cols-2 gap-6 items-center">
								<div class="flex gap-2">
									{@render wheelButton('RL2_OUT', 'RL2-OUT', true)}
									{@render wheelButton('RL2_IN', 'RL2-IN', true)}
								</div>
								<div class="flex gap-2">
									{@render wheelButton('RR2_IN', 'RR2-IN', true)}
									{@render wheelButton('RR2_OUT', 'RR2-OUT', true)}
								</div>
							</div>
						</div>
					</div>

				{:else if effectiveAxleConfig === '18_WHEELS' || effectiveAxleConfig === '22_WHEELS'}
					<!-- 18 - 22 Roda: Tractor Head + Semi-Trailer -->
					<div class="space-y-6">
						<!-- Tractor Drive 1 & 2 -->
						<div>
							<div class="text-center text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">
								TRACTOR HEAD — GANDAR 2 & 3 (PENGGERAK KEPALA PENARIK)
							</div>
							<div class="space-y-4">
								<div class="grid grid-cols-2 gap-6 items-center">
									<div class="flex gap-2">
										{@render wheelButton('RL1_OUT', 'RL1-OUT', true)}
										{@render wheelButton('RL1_IN', 'RL1-IN', true)}
									</div>
									<div class="flex gap-2">
										{@render wheelButton('RR1_IN', 'RR1-IN', true)}
										{@render wheelButton('RR1_OUT', 'RR1-OUT', true)}
									</div>
								</div>
								<div class="grid grid-cols-2 gap-6 items-center">
									<div class="flex gap-2">
										{@render wheelButton('RL2_OUT', 'RL2-OUT', true)}
										{@render wheelButton('RL2_IN', 'RL2-IN', true)}
									</div>
									<div class="flex gap-2">
										{@render wheelButton('RR2_IN', 'RR2-IN', true)}
										{@render wheelButton('RR2_OUT', 'RR2-OUT', true)}
									</div>
								</div>
							</div>
						</div>

						<!-- Visual Kingpin Fifth-Wheel Hitch Turntable -->
						<div class="my-4 p-3 rounded-2xl bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-blue-500/20 border-2 border-dashed border-indigo-500/40 text-center">
							<div class="flex items-center justify-center gap-2">
								<span class="material-symbols-outlined text-indigo-600 text-lg">link</span>
								<span class="text-xs font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-widest">
									KOPEL GANDENGAN / FIFTH-WHEEL KINGPIN HITCH
								</span>
								<span class="material-symbols-outlined text-indigo-600 text-lg">link</span>
							</div>
							<p class="text-[10px] text-on-surface-variant font-medium mt-0.5">Pemisah Fisik Roda Unit Tractor Head & Roda Unit Trailer</p>
						</div>

						<!-- Semi-Trailer Axles -->
						<div class="space-y-4">
							<div class="text-center text-[10px] font-black text-amber-600 uppercase tracking-widest">
								CHASSIS TRAILER GANDENGAN (SEMI-TRAILER AXLES)
							</div>

							<!-- Trailer Axle 1 -->
							<div>
								<p class="text-center text-[9px] font-bold text-on-surface-variant uppercase mb-1">Gandar Gandengan 1 (Axle 4)</p>
								<div class="grid grid-cols-2 gap-6 items-center">
									<div class="flex gap-2">
										{@render wheelButton('TR1_L_OUT', 'TR1-L-OUT', true)}
										{@render wheelButton('TR1_L_IN', 'TR1-L-IN', true)}
									</div>
									<div class="flex gap-2">
										{@render wheelButton('TR1_R_IN', 'TR1-R-IN', true)}
										{@render wheelButton('TR1_R_OUT', 'TR1-R-OUT', true)}
									</div>
								</div>
							</div>

							<!-- Trailer Axle 2 -->
							<div>
								<p class="text-center text-[9px] font-bold text-on-surface-variant uppercase mb-1">Gandar Gandengan 2 (Axle 5)</p>
								<div class="grid grid-cols-2 gap-6 items-center">
									<div class="flex gap-2">
										{@render wheelButton('TR2_L_OUT', 'TR2-L-OUT', true)}
										{@render wheelButton('TR2_L_IN', 'TR2-L-IN', true)}
									</div>
									<div class="flex gap-2">
										{@render wheelButton('TR2_R_IN', 'TR2-R-IN', true)}
										{@render wheelButton('TR2_R_OUT', 'TR2-R-OUT', true)}
									</div>
								</div>
							</div>

							<!-- Trailer Axle 3 (If 22_WHEELS) -->
							{#if effectiveAxleConfig === '22_WHEELS'}
								<div>
									<p class="text-center text-[9px] font-bold text-on-surface-variant uppercase mb-1">Gandar Gandengan 3 (Axle 6)</p>
									<div class="grid grid-cols-2 gap-6 items-center">
										<div class="flex gap-2">
											{@render wheelButton('TR3_L_OUT', 'TR3-L-OUT', true)}
											{@render wheelButton('TR3_L_IN', 'TR3-L-IN', true)}
										</div>
										<div class="flex gap-2">
											{@render wheelButton('TR3_R_IN', 'TR3-R-IN', true)}
											{@render wheelButton('TR3_R_OUT', 'TR3-R-OUT', true)}
										</div>
									</div>
								</div>
							{/if}
						</div>
					</div>
				{/if}

				<!-- 3. SPARE TIRES SECTION (BAN SEREP) -->
				<div class="pt-6 border-t border-slate-200 dark:border-slate-800">
					<div class="text-center text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-3">
						SLOT BAN SEREP (SPARE WHEEL CADANGAN ARMADA)
					</div>
					{#if effectiveAxleConfig === '18_WHEELS' || effectiveAxleConfig === '22_WHEELS'}
						<div class="grid grid-cols-2 gap-4">
							{@render wheelButton('SPARE_1', 'Ban Serep Tractor')}
							{@render wheelButton('SPARE_2', 'Ban Serep Trailer')}
						</div>
					{:else}
						<div class="max-w-xs mx-auto">
							{@render wheelButton('SPARE', 'Ban Serep Utama')}
						</div>
					{/if}
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
								{#if tire.unit_id || tire.unit_display_name}
									<button 
										onclick={() => handleUnitSelect(tire.unit_id)}
										class="px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 font-bold text-xs border border-blue-500/20 transition-all flex items-center gap-1.5 cursor-pointer text-left"
										title="Klik untuk tampilkan diagram unit ini"
									>
										<span class="material-symbols-outlined text-xs">local_shipping</span>
										<span>{tire.unit_display_name || tire.unit_id}</span>
										<span class="text-blue-500 font-mono text-[10px]">({tire.position_code})</span>
									</button>
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
