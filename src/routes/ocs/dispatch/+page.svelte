<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';
	import SearchableSelect from '$lib/components/SearchableSelect.svelte';
	import MultiSearchableSelect from '$lib/components/MultiSearchableSelect.svelte';
	
	let { data, form }: { data: PageData, form: ActionData } = $props();
	let availableUnits = $derived(data.availableUnits || []);
	let orders = $derived(data.orders || []);
	let products = $derived(data.products || []);

	let statusFilter = $state($page.url.searchParams.get('status') || 'All');

	// Kalkulator Jarak Bumi (Haversine)
	function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
		const R = 6371e3; // metres
		const toRad = (val: number) => val * Math.PI / 180;
		const phi1 = toRad(lat1);
		const phi2 = toRad(lat2);
		const deltaPhi = toRad(lat2-lat1);
		const deltaLambda = toRad(lon2-lon1);

		const a = Math.sin(deltaPhi/2) * Math.sin(deltaPhi/2) +
				  Math.cos(phi1) * Math.cos(phi2) *
				  Math.sin(deltaLambda/2) * Math.sin(deltaLambda/2);
		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
		return R * c;
	}

	function checkIsInsideNonDestinationPool(order: any) {
		console.log("Checking order:", order.id, "last_lat:", order.last_lat, "last_lon:", order.last_lon);
		if (!order.last_lat || !order.last_lon) return false;
		if (!data.pools || data.pools.length === 0) return false;

		let isInsideOtherPool = false;
		for (const p of data.pools) {
			if (!p.latitude || !p.longitude) continue;
			const dist = haversine(parseFloat(order.last_lat), parseFloat(order.last_lon), parseFloat(p.latitude), parseFloat(p.longitude));
			console.log(`Dist to ${p.nama_pool}: ${dist} (radius: ${p.radius})`);
			if (dist <= p.radius) {
				// Cek apakah ini pool tujuannya?
				console.log(`Is pool tujuan? p.id=${p.id}, order.pool_tujuan_id=${order.pool_tujuan_id}`);
				if (String(p.id) !== String(order.pool_tujuan_id)) {
					isInsideOtherPool = true;
					order.matched_pool_name = p.nama_pool;
					console.log("-> TRUE! Matched transit pool:", p.nama_pool);
					break;
				}
			}
		}
		console.log("Result:", isInsideOtherPool);
		return isInsideOtherPool;
	}

	// Modal States
	let isAiSectionOpen = $state(true);
	let showUjoModal = $state(false);
	let showClosingModal = $state(false);
	let selectedOrder = $state<any>(null);

	// UJO Form State
	let ujoUnit = $state('');
	let ujoAmount = $state('');
	let ujoMakan = $state('');
	let ujoTol = $state('');
	let isSubmitting = $state(false);

	let aiReason = $state('');
	let isAiLoading = $state(false);

	async function getSmartDispatch() {
		if (!selectedOrder) return;
		isAiLoading = true;
		aiReason = '';
		try {
			const res = await fetch('/api/fms/smart-dispatch', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ orderId: selectedOrder.id })
			});
			if (res.ok) {
				const data = await res.json();
				if (data.recommended_unit) {
					ujoUnit = data.recommended_unit;
					const unit = availableUnits.find((u: any) => u.id === data.recommended_unit);
					if (unit) {
						unitSearch = `${unit.id} • ${unit.driver} (${unit.type})`;
					} else {
						unitSearch = data.recommended_unit;
					}
				}
				aiReason = data.reason || '';
			} else {
				aiReason = 'Gagal memuat rekomendasi AI.';
			}
		} catch (e) {
			aiReason = 'Terjadi kesalahan jaringan saat memanggil AI.';
		} finally {
			isAiLoading = false;
		}
	}

	let unitSearch = $state('');
	let showUnitDropdown = $state(false);
	let filteredUnits = $derived(availableUnits.filter(u => 
		(u.id && u.id.toLowerCase().includes(unitSearch.toLowerCase())) || 
		(u.driver && u.driver.toLowerCase().includes(unitSearch.toLowerCase())) ||
		(u.type && u.type.toLowerCase().includes(unitSearch.toLowerCase()))
	));

	// Closing Form State
	let closeWeight = $state('');
	let closeCost = $state('');
	let closeDesc = $state('');

	// Manual Dispatch Form State
	let showManualDispatchModal = $state(false);
	let manualDispatchOrder = $state<any>(null);
	let manualDispatchUnitIds = $state<string[]>([]);
	let manualDispatchCargoName = $state('');
	let manualDispatchLoadingDate = $state('');
	let manualDispatchUnloadingDate = $state('');

	// Dropdown Options
	let unitOpts = $derived(availableUnits.map(u => {
		const warnings: string[] = [];
		if (u.has_expired_doc) warnings.push('⚠️ Dokumen Expired');
		if (u.has_expired_sim) warnings.push('⚠️ SIM Expired');
		const warnTag = warnings.length > 0 ? ` [${warnings.join(', ')}]` : '';
		const dId = (u.driverId && u.driverId !== 'null' && u.driverId !== 'undefined') ? u.driverId : '';
		return {
			value: `${u.unitId}|${dId}`,
			label: `${u.id} • ${u.driver || 'Tanpa Sopir'} • ${u.brand || ''} ${u.type || ''}${warnTag}`
		};
	}));
	let productOpts = $derived(products.map(p => ({ value: p.name, label: p.name })));
	let activeMode = $state($page.url.searchParams.get('mode') || 'reguler');
	let ngepokBatches = $derived(data.ngepokBatches || []);
	let dedicatedDispatches = $derived(data.dedicatedDispatches || []);
	let customers = $derived(data.customers || []);
	let customerOpts = $derived((data.customers || []).map(c => ({ value: String(c.id), label: c.nama_kustomer })));
	let contractOpts = $derived((data.contractOrders || []).map(co => ({ value: String(co.contract_id), label: `${co.customer} (${co.cargo}) • ${co.origin} -> ${co.destination}` })));

	function setMode(m: string) {
		activeMode = m;
		const url = new URL(window.location.href);
		url.searchParams.set('mode', m);
		goto(url.toString(), { keepFocus: true, noScroll: true });
	}

	// Mode 2: Ngepok State
	let showNgepokModal = $state(false);
	let ngepokCustomerId = $state('');
	let ngepokContractId = $state('');
	let ngepokUnitAssignment = $state('');
	let ngepokOriginId = $state('');
	let ngepokDestId = $state('');
	let ngepokCargo = $state('');
	let ngepokDate = $state(new Date().toISOString().split('T')[0]);
	let ngepokPlanRit = $state(1);
	let ngepokUjoPerRit = $state(250000);
	let ngepokUjoMakan = $state(50000);
	let ngepokUjoTol = $state(0);
	let expandedBatches: Record<string, boolean> = $state({});

	function toggleBatch(gid: string) {
		expandedBatches[gid] = !expandedBatches[gid];
	}

	function openNgepokModal() {
		ngepokCustomerId = '';
		ngepokContractId = '';
		ngepokUnitAssignment = '';
		ngepokOriginId = '';
		ngepokDestId = '';
		ngepokCargo = 'Muatan Shuttle / Ngepok';
		ngepokDate = new Date().toISOString().split('T')[0];
		ngepokPlanRit = 1;
		ngepokUjoPerRit = 250000;
		ngepokUjoMakan = 50000;
		ngepokUjoTol = 0;
		showNgepokModal = true;
	}

	function closeNgepokModal() {
		showNgepokModal = false;
	}

	// Add Susulan Rit State
	let showAddSusulanModal = $state(false);
	let susulanBatch = $state<any>(null);
	let susulanCount = $state(1);

	function openAddSusulanModal(batch: any) {
		susulanBatch = batch;
		susulanCount = 1;
		showAddSusulanModal = true;
	}

	function closeAddSusulanModal() {
		showAddSusulanModal = false;
		susulanBatch = null;
		susulanCount = 1;
	}

	// Void Rit State
	let showVoidModal = $state(false);
	let voidTripId = $state<number | null>(null);
	let voidTripSt = $state('');
	let voidReason = $state('');

	function openVoidModal(trip: any) {
		voidTripId = trip.trip_id || trip.id;
		voidTripSt = trip.no_surat_tugas;
		voidReason = '';
		showVoidModal = true;
	}

	function closeVoidModal() {
		showVoidModal = false;
		voidTripId = null;
	}

	// Complete Rit State
	let showCompleteModal = $state(false);
	let completeTripId = $state<number | null>(null);
	let completeTripSt = $state('');
	let completeNoSj = $state('');
	let completeWeight = $state('');

	function openCompleteModal(trip: any) {
		completeTripId = trip.trip_id || trip.id;
		completeTripSt = trip.no_surat_tugas;
		completeNoSj = trip.no_surat_jalan_customer || '';
		completeWeight = trip.actual_weight ? String(trip.actual_weight) : '';
		showCompleteModal = true;
	}

	function closeCompleteModal() {
		showCompleteModal = false;
		completeTripId = null;
	}

	// Print Batch State
	let showPrintModal = $state(false);
	let printBatch = $state<any>(null);
	let printSelectedRit = $state<'all' | number>('all');

	function openBatchPrintModal(batch: any, tripId?: number) {
		printBatch = batch;
		printSelectedRit = tripId ? tripId : 'all';
		showPrintModal = true;
	}

	function closeBatchPrintModal() {
		showPrintModal = false;
		printBatch = null;
	}

	function executeBatchPrint() {
		const printContent = document.getElementById('ngepok-print-area');
		if (!printContent) return;

		let printIframe = document.getElementById('print-iframe') as HTMLIFrameElement;
		if (!printIframe) {
			printIframe = document.createElement('iframe');
			printIframe.id = 'print-iframe';
			printIframe.style.position = 'fixed';
			printIframe.style.right = '0';
			printIframe.style.bottom = '0';
			printIframe.style.width = '0';
			printIframe.style.height = '0';
			printIframe.style.border = '0';
			document.body.appendChild(printIframe);
		}

		const doc = printIframe.contentWindow?.document;
		if (!doc) return;

		doc.open();
		doc.write(`
			<!DOCTYPE html>
			<html>
			<head>
				<title>Batch Surat Tugas</title>
				<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet">
				<script src="https://cdn.tailwindcss.com"><\/script>
				<style>
					@page { size: A4 portrait; margin: 10mm 10mm 10mm 10mm; }
					body { font-family: 'Plus Jakarta Sans', sans-serif; background: white; color: black; }
					.page-break { page-break-after: always; }
				</style>
			</head>
			<body class="p-4">
				\${printContent.innerHTML}
			</body>
			</html>
		`);
		doc.close();

		setTimeout(() => {
			printIframe.contentWindow?.focus();
			printIframe.contentWindow?.print();
		}, 500);
	}

	// Mode 3: Dedicated On-Site State
	let showDedicatedModal = $state(false);
	let dedSpkInduk = $state('');
	let dedShift = $state('Shift 1 (08:00 - 16:00)');
	let dedCustomerId = $state('');
	let dedUnitAssignment = $state('');
	let dedOriginId = $state('');
	let dedDestId = $state('');
	let dedCargo = $state('');
	let dedDate = $state(new Date().toISOString().split('T')[0]);
	let expandedDedicated: Record<number, boolean> = $state({});

	function toggleDedicated(tripId: number) {
		expandedDedicated[tripId] = !expandedDedicated[tripId];
	}

	function openDedicatedModal() {
		dedSpkInduk = 'SPK-DED-' + Date.now().toString().slice(-6);
		dedShift = 'Shift 1 (08:00 - 16:00)';
		dedCustomerId = '';
		dedUnitAssignment = '';
		dedOriginId = '';
		dedDestId = '';
		dedCargo = 'Muatan On-Site Pelabuhan / Stevedoring';
		dedDate = new Date().toISOString().split('T')[0];
		showDedicatedModal = true;
	}

	function closeDedicatedModal() {
		showDedicatedModal = false;
	}

	// Add Logsheet State
	let showLogsheetModal = $state(false);
	let logsheetTripId = $state<number | null>(null);
	let logsheetSpkNomor = $state('');
	let lsJamMuat = $state('');
	let lsJamBongkar = $state('');
	let lsNoSj = $state('');
	let lsTonase = $state('');
	let lsCatatan = $state('');

	function openLogsheetModal(dispatch: any) {
		logsheetTripId = dispatch.trip_id;
		logsheetSpkNomor = dispatch.spk_induk_nomor || dispatch.no_surat_tugas;
		lsJamMuat = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');
		lsJamBongkar = '';
		lsNoSj = '';
		lsTonase = '';
		lsCatatan = '';
		showLogsheetModal = true;
	}

	function closeLogsheetModal() {
		showLogsheetModal = false;
		logsheetTripId = null;
	}

	function openManualDispatchModal(order: any) {
		manualDispatchOrder = order;
		const uId = (order.ai_recommended_unit_id && order.ai_recommended_unit_id !== 'null' && order.ai_recommended_unit_id !== 'undefined') ? order.ai_recommended_unit_id : '';
		const dId = (order.ai_recommended_driver_id && order.ai_recommended_driver_id !== 'null' && order.ai_recommended_driver_id !== 'undefined') ? order.ai_recommended_driver_id : '';
		manualDispatchUnitIds = uId ? [`${uId}|${dId}`] : [];
		manualDispatchCargoName = '';
		manualDispatchLoadingDate = '';
		manualDispatchUnloadingDate = '';
		showManualDispatchModal = true;
	}

	function closeManualDispatchModal() {
		showManualDispatchModal = false;
		manualDispatchOrder = null;
	}

	function openUjoModal(order: any) {
		selectedOrder = order;
		ujoUnit = order.assignedUnit || '';
		unitSearch = order.assignedUnit ? `${order.assignedUnit} • ${order.assignedDriver || ''}` : '';
		ujoMakan = order.ujoMakan ? String(order.ujoMakan) : '';
		ujoTol = order.ujoTol ? String(order.ujoTol) : '';
		
		if (order.estimatedUjo) {
			ujoAmount = String(order.estimatedUjo - (order.ujoMakan || 0) - (order.ujoTol || 0));
		} else {
			ujoAmount = '';
		}
		aiReason = '';
		showUjoModal = true;
	}

	function closeUjoModal() {
		showUjoModal = false;
		selectedOrder = null;
	}

	function openClosingModal(order: any) {
		selectedOrder = order;
		closeWeight = '';
		closeCost = '';
		closeDesc = '';
		showClosingModal = true;
	}

	function closeClosingModal() {
		showClosingModal = false;
		selectedOrder = null;
	}

	function handleStatusClick(s: string) {
		statusFilter = s;
		const url = new URL(window.location.href);
		if (s !== 'All') url.searchParams.set('status', s);
		else url.searchParams.delete('status');
		goto(url.toString(), { keepFocus: true, noScroll: true });
	}

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
	};

	let filteredOrders = $derived.by(() => {
		let result = orders.filter(o => o.status !== 'COMPLETED');
		if (statusFilter === 'New Order') result = result.filter(o => o.status === 'WAITING_UJO');
		else if (statusFilter === 'Waiting Marketing') result = result.filter(o => o.status === 'WAITING_TARIFF' || o.status === 'WAITING_CUSTOMER');
		else if (statusFilter === 'Ready to Dispatch') result = result.filter(o => o.status === 'READY_TO_DISPATCH');
		else if (statusFilter === 'Dispatched') result = result.filter(o => o.status === 'DISPATCHED');
		else if (statusFilter === 'Closing') result = result.filter(o => o.status === 'CLOSING');
		return result;
	});

	let summary = $derived.by(() => {
		const all = orders;
		return {
			newOrder: all.filter(o => o.status === 'WAITING_UJO').length,
			ready: all.filter(o => o.status === 'READY_TO_DISPATCH').length,
			closing: all.filter(o => o.status === 'CLOSING').length,
			availableUnits: availableUnits.length
		};
	});

	let showAlternatives: Record<string, boolean> = $state({});
	let showSearchBox: Record<string, boolean> = $state({});
	let contractSearchQuery: Record<string, string> = $state({});

	let localContractOrders = $state<any[]>([]);

	$effect(() => {
		if (data.contractOrders) {
			localContractOrders = JSON.parse(JSON.stringify(data.contractOrders));
		}
	});

	function skipRecommendation(orderId: string) {
		const order = localContractOrders.find(o => o.id === orderId);
		if (order && order.alternatives && order.alternatives.length > 0) {
			const oldUnit = {
				unitId: order.ai_recommended_unit_id,
				unitName: order.ai_recommended_unit,
				driverId: order.ai_recommended_driver_id,
				driverName: order.ai_recommended_driver,
				reason: order.ai_reason || 'Di-skip'
			};
			const nextUnit = order.alternatives.shift();
			
			order.ai_recommended_unit = nextUnit.unitName;
			order.ai_recommended_unit_id = nextUnit.unitId;
			order.ai_recommended_driver = nextUnit.driverName;
			order.ai_recommended_driver_id = nextUnit.driverId;
			order.ai_reason = "Manual Skip: " + nextUnit.reason;
			
			if (oldUnit.unitId) {
				order.alternatives.push(oldUnit);
			}
		}
	}

	function selectAlternative(orderId: string, altIndex: number) {
		const order = localContractOrders.find(o => o.id === orderId);
		if (order && order.alternatives) {
			const oldUnit = {
				unitId: order.ai_recommended_unit_id,
				unitName: order.ai_recommended_unit,
				driverId: order.ai_recommended_driver_id,
				driverName: order.ai_recommended_driver,
				reason: order.ai_reason || 'Pilihan sebelumnya'
			};
			const selectedUnit = order.alternatives.splice(altIndex, 1)[0];
			
			order.ai_recommended_unit = selectedUnit.unitName;
			order.ai_recommended_unit_id = selectedUnit.unitId;
			order.ai_recommended_driver = selectedUnit.driverName;
			order.ai_recommended_driver_id = selectedUnit.driverId;
			order.ai_reason = "Manual Select: " + selectedUnit.reason;
			
			if (oldUnit.unitId) {
				order.alternatives.push(oldUnit);
			}
			showAlternatives[orderId] = false;
			showSearchBox[orderId] = false;
		}
	}

	function selectManualUnit(orderId: string, unit: any) {
		const order = localContractOrders.find(o => o.id === orderId);
		if (order) {
			const oldUnit = {
				unitId: order.ai_recommended_unit_id,
				unitName: order.ai_recommended_unit,
				driverId: order.ai_recommended_driver_id,
				driverName: order.ai_recommended_driver,
				reason: order.ai_reason || 'Pilihan sebelumnya'
			};
			
			order.ai_recommended_unit = unit.id;
			order.ai_recommended_unit_id = unit.unitId || unit.id;
			order.ai_recommended_driver = unit.driver;
			order.ai_recommended_driver_id = unit.driverId;
			order.ai_reason = "Manual Search: Dipilih langsung oleh Dispatcher";
			
			if (oldUnit.unitId) {
				if (!order.alternatives) order.alternatives = [];
				order.alternatives.push(oldUnit);
			}
			showSearchBox[orderId] = false;
		}
	}

	$effect(() => {
		if (form?.success) {
			closeUjoModal();
			closeClosingModal();
			closeNgepokModal();
			closeAddSusulanModal();
			closeVoidModal();
			closeCompleteModal();
			closeDedicatedModal();
			closeLogsheetModal();
			isSubmitting = false;
		}
		if (form?.error) {
			alert(form.error);
			isSubmitting = false;
		}
	});
</script>

<svelte:head>
	<title>Dispatch | OCS</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Header & Actions -->
	<header class="flex flex-col md:flex-row md:items-end justify-between gap-4 flex-shrink-0">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-blue-600 dark:text-blue-400 text-2xl">local_shipping</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Dispatch Center & Surat Jalan</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-sm mt-0.5">
				Penugasan unit armada, approval dispatch otomatis dari kontrak, dan monitoring status Surat Jalan
			</p>
		</div>
		<div class="flex items-center gap-3">
			{#if activeMode === 'ngepok'}
				<button onclick={openNgepokModal} class="bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-xs flex items-center gap-2 hover:bg-indigo-700 transition-colors cursor-pointer">
					<span class="material-symbols-outlined text-lg">add_circle</span>
					<span>Buat Penugasan Ngepok</span>
				</button>
			{:else if activeMode === 'dedicated'}
				<button onclick={openDedicatedModal} class="bg-amber-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-xs flex items-center gap-2 hover:bg-amber-700 transition-colors cursor-pointer">
					<span class="material-symbols-outlined text-lg">add_circle</span>
					<span>Penugasan Dedicated Baru</span>
				</button>
			{:else}
				<button class="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-xs flex items-center gap-2 hover:bg-blue-700 transition-colors">
					<span class="material-symbols-outlined text-lg">auto_fix_high</span>
					<span>Auto-Assign AI</span>
				</button>
			{/if}
		</div>
	</header>

	<!-- Multi-Mode Dispatch Tabs -->
	<div class="flex items-center gap-2 border-b border-surface-container pb-3 overflow-x-auto">
		<button 
			type="button"
			onclick={() => setMode('reguler')}
			class="flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer {activeMode === 'reguler' ? 'bg-primary text-on-primary shadow-sm' : 'bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'}"
		>
			<span class="material-symbols-outlined text-lg">local_shipping</span>
			<span>Mode 1: Dispatch Reguler</span>
			<span class="px-2 py-0.5 rounded-full text-xs font-black {activeMode === 'reguler' ? 'bg-on-primary/20 text-on-primary' : 'bg-surface-container-highest text-on-surface-variant'}">
				{orders.length}
			</span>
		</button>

		<button 
			type="button"
			onclick={() => setMode('ngepok')}
			class="flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer {activeMode === 'ngepok' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'}"
		>
			<span class="material-symbols-outlined text-lg">sync_alt</span>
			<span>Mode 2: Ngepok / Shuttle Multi-Rit</span>
			<span class="px-2 py-0.5 rounded-full text-xs font-black {activeMode === 'ngepok' ? 'bg-white/20 text-white' : 'bg-surface-container-highest text-on-surface-variant'}">
				{ngepokBatches.length}
			</span>
		</button>

		<button 
			type="button"
			onclick={() => setMode('dedicated')}
			class="flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer {activeMode === 'dedicated' ? 'bg-amber-600 text-white shadow-sm' : 'bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'}"
		>
			<span class="material-symbols-outlined text-lg">warehouse</span>
			<span>Mode 3: Dedicated On-Site Shuttling</span>
			<span class="px-2 py-0.5 rounded-full text-xs font-black {activeMode === 'dedicated' ? 'bg-white/20 text-white' : 'bg-surface-container-highest text-on-surface-variant'}">
				{dedicatedDispatches.length}
			</span>
		</button>
	</div>

	{#if activeMode === 'reguler'}
		<!-- Summary Cards (Bento) -->
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">New Orders</p>
					<h3 class="text-2xl font-black text-on-surface mt-1">{summary.newOrder}</h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-slate-500/10 text-slate-600 dark:text-slate-400 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">new_releases</span>
				</div>
			</div>
			<p class="text-xs text-on-surface-variant mt-2">Order baru masuk</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Ready to Dispatch</p>
					<h3 class="text-2xl font-black text-amber-600 mt-1">{summary.ready}</h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">hourglass_top</span>
				</div>
			</div>
			<p class="text-xs text-amber-600 font-medium mt-2">Menunggu pencairan kasir</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Needs Closing</p>
					<h3 class="text-2xl font-black text-rose-600 mt-1">{summary.closing}</h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">assignment_return</span>
				</div>
			</div>
			<p class="text-xs text-rose-600 font-medium mt-2">Menunggu penyelesaian rute</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Units Available</p>
					<h3 class="text-2xl font-black text-emerald-600 mt-1">{summary.availableUnits}</h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">check_circle</span>
				</div>
			</div>
			<p class="text-xs text-emerald-600 font-medium mt-2">Armada siap ditugaskan</p>
		</div>
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<!-- Orders List -->
		<div class="lg:col-span-2 space-y-4">
			<!-- AI Contract Auto-Dispatch Section -->
			{#if localContractOrders && localContractOrders.length > 0}
				<div class="mb-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 rounded-2xl p-[1px] shadow-md transition-all">
					<div class="bg-surface-container-lowest rounded-2xl p-5 h-full">
						<!-- Collapsible Card Header -->
						<div class="flex items-center justify-between gap-3 {isAiSectionOpen ? 'mb-4 pb-3 border-b border-slate-100 dark:border-slate-800' : ''}">
							<div class="flex items-center gap-3">
								<div class="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
									<span class="material-symbols-outlined text-xl">robot_2</span>
								</div>
								<div>
									<div class="flex items-center gap-2">
										<h2 class="text-sm font-black text-on-surface tracking-tight uppercase">AI Contract Dispatch</h2>
										<span class="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
											{localContractOrders.length} Kontrak Aktif
										</span>
									</div>
									<p class="text-[11px] text-on-surface-variant font-medium">Auto-match kontrak rutin marketing dengan armada idle di pool & kepatuhan sopir</p>
								</div>
							</div>

							<button
								type="button"
								onclick={() => isAiSectionOpen = !isAiSectionOpen}
								class="p-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
								title={isAiSectionOpen ? 'Sembunyikan' : 'Tampilkan'}
							>
								<span>{isAiSectionOpen ? 'Tutup' : 'Buka Rekomendasi'}</span>
								<span class="material-symbols-outlined text-lg transition-transform duration-200 {isAiSectionOpen ? 'rotate-180' : ''}">expand_more</span>
							</button>
						</div>
						
						{#if isAiSectionOpen}
							<div class="space-y-4">
								{#each localContractOrders as contractOrder}
									{@const targetTon = parseFloat(contractOrder.targetTonnage || '0')}
									{@const deliveredTon = parseFloat(contractOrder.deliveredTonnage || '0')}
									{@const tonPct = targetTon > 0 ? Math.min(100, Math.round((deliveredTon / targetTon) * 100)) : 0}

									<div class="bg-blue-50/50 dark:bg-blue-950/20 rounded-2xl p-4 border border-blue-200/60 dark:border-blue-800/40 space-y-3.5">
										<!-- Contract Meta Header & Progress -->
										<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
											<div>
												<div class="flex items-center gap-2">
													<p class="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">{contractOrder.id}</p>
													<span class="text-xs font-bold text-on-surface">• {contractOrder.customer}</span>
													<span class="text-[10px] text-on-surface-variant font-mono">({contractOrder.contract_id})</span>
												</div>
												<p class="text-xs text-on-surface-variant font-medium mt-0.5 flex items-center gap-1">
													<span>{contractOrder.origin}</span>
													<span class="material-symbols-outlined text-[12px]">arrow_forward</span>
													<span>{contractOrder.destination}</span>
													<span class="text-slate-400">•</span>
													<span class="text-on-surface font-semibold">{contractOrder.cargo}</span>
												</p>
											</div>

											<!-- Tonnage Realization Progress -->
											{#if targetTon > 0}
												<div class="sm:text-right min-w-[160px]">
													<div class="flex justify-between sm:justify-end gap-2 text-[11px] font-bold text-on-surface mb-1">
														<span class="text-on-surface-variant font-normal">Realisasi:</span>
														<span>{deliveredTon.toFixed(1)} / {targetTon.toFixed(1)} Ton ({tonPct}%)</span>
													</div>
													<div class="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
														<div class="bg-blue-600 h-full rounded-full transition-all duration-500" style="width: {tonPct}%"></div>
													</div>
												</div>
											{/if}
										</div>
										
										<!-- Recommendation Box -->
										<div class="bg-surface-container-lowest p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-3">
											<div class="flex items-start gap-2.5 text-xs text-on-surface-variant">
												<span class="material-symbols-outlined text-amber-500 text-lg shrink-0">smart_toy</span>
												<p class="italic leading-relaxed">"{contractOrder.ai_reason}"</p>
											</div>

											<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
												<div>
													<p class="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Unit & Sopir Rekomendasi</p>
													<div class="flex items-center gap-2 mt-0.5">
														<span class="text-xs font-black text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
															<span class="material-symbols-outlined text-sm">local_shipping</span>
															<span>{contractOrder.ai_recommended_unit}</span>
														</span>
														<span class="text-xs text-on-surface-variant">•</span>
														<span class="text-xs font-bold text-on-surface">{contractOrder.ai_recommended_driver}</span>

														{#if contractOrder.alternatives && contractOrder.alternatives.length > 0}
															<button
																type="button"
																onclick={() => skipRecommendation(contractOrder.id)}
																class="w-5 h-5 rounded-full bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center transition-colors cursor-pointer"
																title="Lewati unit ini & pilih alternatif"
															>
																<span class="material-symbols-outlined text-xs">close</span>
															</button>
														{/if}
													</div>
												</div>

												<!-- Action Buttons -->
												<div class="flex items-center gap-2 flex-wrap">
													<button
														type="button"
														onclick={() => openManualDispatchModal(contractOrder)}
														class="px-3 py-2 {contractOrder.ai_recommended_unit_id ? 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant' : 'bg-rose-50 text-rose-700 border border-rose-200 animate-pulse'} rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
													>
														<span class="material-symbols-outlined text-base">swap_horiz</span>
														<span>{contractOrder.ai_recommended_unit_id ? 'Tukar Unit Manual' : 'Pilih Unit Manual'}</span>
													</button>

													{#if contractOrder.ai_recommended_unit_id}
														<form
															method="POST"
															action="?/createDoFromPo"
															use:enhance={() => { isSubmitting = true; return async ({ update }) => { await update(); isSubmitting = false; } }}
															class="flex items-center gap-2"
														>
															<input type="hidden" name="contractId" value={contractOrder.contract_id}>
															<input type="hidden" name="unitId" value={contractOrder.ai_recommended_unit_id}>
															<input type="hidden" name="driverId" value={(contractOrder.ai_recommended_driver_id && contractOrder.ai_recommended_driver_id !== 'null') ? contractOrder.ai_recommended_driver_id : ''}>
															
															{#if !contractOrder.produk_id}
																<select
																	name="cargoName"
																	required
																	class="bg-surface border border-slate-200 dark:border-slate-700 text-xs rounded-xl px-2.5 py-2 text-on-surface focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[140px]"
																>
																	<option value="" disabled selected>Pilih Muatan</option>
																	{#each products as product}
																		<option value={product.name}>{product.name}</option>
																	{/each}
																</select>
															{/if}

															<button
																type="submit"
																disabled={isSubmitting}
																class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 shrink-0 cursor-pointer"
															>
																<span class="material-symbols-outlined text-base">task_alt</span>
																<span>Approve Dispatch</span>
															</button>
														</form>
													{:else}
														<button disabled class="bg-surface-container text-on-surface-variant px-4 py-2 rounded-xl text-xs font-bold cursor-not-allowed flex items-center gap-1.5">
															<span class="material-symbols-outlined text-base">hourglass_empty</span>
															<span>Belum Ada Unit</span>
														</button>
													{/if}
												</div>
											</div>

											<!-- Alternatives Dropdown -->
											{#if contractOrder.alternatives && contractOrder.alternatives.length > 0}
												<div class="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
													<button
														type="button"
														onclick={() => showAlternatives[contractOrder.id] = !showAlternatives[contractOrder.id]}
														class="text-[11px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline cursor-pointer"
													>
														<span class="material-symbols-outlined text-base transition-transform {showAlternatives[contractOrder.id] ? 'rotate-180' : ''}">expand_more</span>
														<span>Lihat {contractOrder.alternatives.length} Alternatif Unit Ready Lainnya</span>
													</button>

													{#if showAlternatives[contractOrder.id]}
														<div class="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
															{#each contractOrder.alternatives as alt, idx}
																<div class="flex items-center justify-between p-2.5 bg-surface-container-low border border-slate-200/60 dark:border-slate-800 rounded-xl">
																	<div>
																		<p class="text-xs font-bold text-on-surface">{alt.unitName}</p>
																		<p class="text-[10px] text-on-surface-variant">{alt.driverName} • {alt.reason}</p>
																	</div>
																	<button
																		type="button"
																		onclick={() => selectAlternative(contractOrder.id, idx)}
																		class="px-2.5 py-1 bg-surface-container hover:bg-blue-100 hover:text-blue-700 text-on-surface-variant text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
																	>
																		Pilih
																	</button>
																</div>
															{/each}
														</div>
													{/if}
												</div>
											{/if}
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				</div>
			{/if}
			<!-- Status Filter Segmented Control Tabs -->
			<div class="inline-flex p-1 rounded-2xl bg-surface-container border border-slate-200 dark:border-slate-800 overflow-x-auto max-w-full">
				{#each ['All', 'New Order', 'Waiting Marketing', 'Ready to Dispatch', 'Dispatched', 'Closing'] as tab}
					<button class="px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all {statusFilter === tab ? 'bg-blue-600 text-white shadow-xs' : 'text-on-surface hover:bg-surface-container-high'}"
						onclick={() => handleStatusClick(tab)}>
						{tab}
					</button>
				{/each}
			</div>

			<div class="space-y-3">
				{#if filteredOrders.length === 0}
					<div class="p-12 text-center text-sm font-medium text-on-surface-variant bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 rounded-2xl shadow-xs">
						<span class="material-symbols-outlined text-4xl text-on-surface-variant/40 block mb-2">assignment_late</span>
						<p class="font-bold text-on-surface">Tidak ada surat jalan yang cocok</p>
						<p class="text-xs text-on-surface-variant/70 mt-0.5">Coba ganti filter status di atas</p>
					</div>
				{/if}
				{#each filteredOrders as order}
					<div class="rounded-2xl bg-surface-container-low p-5 shadow-xs border border-slate-200/60 dark:border-slate-800/60 hover:border-blue-500/30 transition-all">
						<div class="flex items-start justify-between mb-3">
							<div class="flex items-center gap-3">
								<div class="w-10 h-10 rounded-xl {order.status === 'DISPATCHED' ? 'bg-blue-500/10 text-blue-600' : order.status === 'CLOSING' ? 'bg-rose-500/10 text-rose-600' : 'bg-amber-500/10 text-amber-600'} flex items-center justify-center font-bold">
									<span class="material-symbols-outlined text-[20px]">{order.status === 'DISPATCHED' ? 'local_shipping' : order.status === 'CLOSING' ? 'assignment_return' : 'pending_actions'}</span>
								</div>
								<div>
									<p class="text-sm font-bold text-on-surface font-mono">{order.id}</p>
									<p class="text-xs text-on-surface-variant font-medium mt-0.5">{order.customer}</p>
								</div>
							</div>
							
							<span class="inline-flex items-center gap-1.5 font-bold text-[10px] px-2.5 py-1 rounded-md uppercase tracking-wider border {order.status === 'WAITING_UJO' ? 'text-indigo-600 bg-indigo-500/10 border-indigo-500/20' : (order.status === 'WAITING_TARIFF' || order.status === 'WAITING_CUSTOMER') ? 'text-amber-600 bg-amber-500/10 border-amber-500/20' : order.status === 'READY_TO_DISPATCH' ? 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20' : order.status === 'DISPATCHED' ? 'text-sky-600 bg-sky-500/10 border-sky-500/20' : 'text-rose-600 bg-rose-500/10 border-rose-500/20'}">
								<span class="w-1.5 h-1.5 rounded-full {order.status === 'DISPATCHED' ? 'bg-sky-500 animate-pulse' : order.status === 'WAITING_UJO' ? 'bg-indigo-500' : (order.status === 'WAITING_TARIFF' || order.status === 'WAITING_CUSTOMER') ? 'bg-amber-500' : order.status === 'READY_TO_DISPATCH' ? 'bg-emerald-500' : 'bg-rose-500'}"></span> 
								{#if order.status === 'WAITING_UJO'} New Order 
								{:else if order.status === 'WAITING_TARIFF' || order.status === 'WAITING_CUSTOMER'} Waiting Marketing 
								{:else if order.status === 'READY_TO_DISPATCH'} Ready to Dispatch 
								{:else if order.status === 'DISPATCHED'} Dispatched 
								{:else if order.status === 'CLOSING'} Closing 
								{/if}
							</span>
						</div>
						
						<div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-3">
							<div>
								<p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-0.5">Route</p>
								<p class="font-bold text-on-surface">{order.origin} → {order.destination}</p>
							</div>
							<div>
								<p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-0.5">Cargo</p>
								<p class="font-medium text-on-surface">{order.cargo} ({order.weight} T)</p>
							</div>
							<div>
								<p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-0.5">Loading Date</p>
								<p class="font-medium text-on-surface">{order.loadingDate ? new Date(order.loadingDate).toLocaleDateString('id-ID') : '-'}</p>
							</div>
							<div>
								<p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-0.5">Est. UJO</p>
								<p class="font-bold text-sky-600">{order.estimatedUjo ? formatCurrency(parseFloat(order.estimatedUjo)) : '-'}</p>
							</div>
						</div>

						{#if !order.origin_lat || !order.dest_lat}
							<div class="p-3 rounded-xl bg-rose-50 border border-rose-200 dark:bg-rose-900/20 dark:border-rose-900/50 flex items-center gap-3 mb-4">
								<span class="material-symbols-outlined text-rose-600 dark:text-rose-400 text-lg">warning</span>
								<div>
									<p class="text-xs font-bold text-rose-700 dark:text-rose-400">Koordinat Lokasi Belum Diset</p>
									<p class="text-[10px] text-rose-600/80 dark:text-rose-400/80">Lengkapi lat/long di Master Customer agar unit bisa diberangkatkan.</p>
								</div>
							</div>
						{/if}

						{#if order.assignedUnit}
							<div class="p-3 rounded-xl bg-surface-container border border-surface-container-high flex items-center gap-3 mb-4">
								<span class="material-symbols-outlined text-on-surface-variant text-lg">local_shipping</span>
								<div>
									<p class="text-xs font-bold text-on-surface">{order.assignedUnit} • {order.assignedDriver || 'No Driver'}</p>
									<p class="text-[10px] text-on-surface-variant">Unit assigned</p>
								</div>
							</div>
						{/if}

						<div class="pt-3 border-t border-surface-container flex justify-end">
							{#if order.status === 'WAITING_UJO'}
								<button onclick={() => openUjoModal(order)} disabled={!order.origin_lat || !order.dest_lat} class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
									<span class="material-symbols-outlined text-[16px]">add_task</span>
									Assign Unit & Input UJO
								</button>
							{:else if order.status === 'WAITING_TARIFF' || order.status === 'WAITING_CUSTOMER'}
								<div class="flex items-center gap-2 w-full">
									<div class="px-4 py-2 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 rounded-lg text-xs font-bold flex items-center gap-2 flex-1 justify-center border border-amber-200 dark:border-amber-900/50">
										<span class="material-symbols-outlined text-[16px]">schedule</span>
										Waiting Marketing Confirmation
									</div>
									<button onclick={() => openUjoModal(order)} class="px-3 py-2 bg-surface-container-high hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-400 text-on-surface-variant rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center gap-2">
										<span class="material-symbols-outlined text-[16px]">edit</span> Edit UJO
									</button>
								</div>
							{:else if order.status === 'READY_TO_DISPATCH'}
								<div class="px-4 py-2 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 rounded-lg text-xs font-bold flex items-center gap-2 justify-center w-full shadow-sm">
									<span class="material-symbols-outlined text-[16px] animate-spin">sync</span>
									Menunggu Kasir Mencairkan UJO
								</div>
							{:else if order.status === 'DISPATCHED'}
								{#if (data.user?.role === 'superadmin' || data.user?.role === 'administrator') && checkIsInsideNonDestinationPool(order)}
									<form method="POST" action="?/submitClosing" use:enhance={() => { isSubmitting = true; return async ({ update }) => { await update(); isSubmitting = false; } }}>
										<input type="hidden" name="orderId" value={order.id}>
										<button type="submit" disabled={isSubmitting} class="px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-rose-700 transition-colors flex items-center gap-2 disabled:opacity-50 w-full justify-center">
											<span class="material-symbols-outlined text-[16px]">pin_drop</span>
											Selesaikan Trip di {order.matched_pool_name}
										</button>
									</form>
								{:else}
									<div class="flex items-center gap-2 w-full">
										<div class="px-4 py-2 bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-400 border border-sky-200 dark:border-sky-900/50 rounded-lg text-xs font-bold flex items-center gap-2 justify-center flex-1 shadow-sm">
											<span class="material-symbols-outlined text-[16px] animate-pulse">local_shipping</span>
											Truk sedang dalam perjalanan
										</div>
										{#if data.user?.role === 'superadmin' || data.user?.role === 'administrator'}
											<form method="POST" action="?/submitClosing" use:enhance={() => { isSubmitting = true; return async ({ update }) => { await update(); isSubmitting = false; } }}>
												<input type="hidden" name="orderId" value={order.id}>
												<button type="submit" disabled={isSubmitting} title="Force Close Trip" class="px-3 py-2 bg-surface-container-high hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/30 dark:hover:text-rose-400 text-on-surface-variant rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center justify-center">
													<span class="material-symbols-outlined text-[16px]">gavel</span>
												</button>
											</form>
										{/if}
									</div>
								{/if}
							{:else if order.status === 'CLOSING'}
								<button onclick={() => openClosingModal(order)} class="px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-rose-700 transition-colors flex items-center gap-2">
									<span class="material-symbols-outlined text-[16px]">receipt_long</span>
									Close Dispatch & Input Real Costs
								</button>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Available Units Panel -->
		<div class="rounded-2xl bg-surface-container-low p-5 shadow-xs border border-slate-200/60 dark:border-slate-800/60 h-fit sticky top-8">
			<h3 class="text-sm font-bold text-on-surface uppercase tracking-wider mb-4 flex items-center gap-2">
				<span class="material-symbols-outlined text-emerald-500 text-lg">check_circle</span>
				<span>Armada Siap (Available)</span>
			</h3>
			<div class="space-y-3 max-h-[600px] overflow-y-auto pr-1">
				{#each availableUnits as unit}
					<div class="p-3.5 rounded-xl bg-surface hover:bg-surface-container-high transition-colors cursor-pointer group border border-slate-200/60 dark:border-slate-800/60">
						<div class="flex items-center justify-between mb-2">
							<div class="flex items-center gap-3">
								<div class="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
									<span class="material-symbols-outlined text-lg">local_shipping</span>
								</div>
								<div>
									<p class="text-sm font-bold text-on-surface">{unit.id}</p>
									<p class="text-[11px] text-on-surface-variant font-medium">{unit.brand}</p>
								</div>
							</div>
							{#if unit.current_state !== 'STANDBY'}
								<span class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-600 border border-blue-500/20">
									{unit.current_state}
								</span>
							{/if}
						</div>
						<div class="flex items-center gap-4 text-[11px] text-on-surface-variant mt-2">
							<span class="flex items-center gap-1">
								<span class="material-symbols-outlined text-[12px]">person</span>
								{unit.driver}
							</span>
							<span class="flex items-center gap-1">
								<span class="material-symbols-outlined text-[12px]">location_on</span>
								{unit.location || 'Pool'}
							</span>
						</div>
						<div class="mt-2 flex flex-wrap gap-1.5 items-center">
							<span class="text-[9px] font-bold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded uppercase tracking-wider">{unit.type}</span>
							{#if unit.has_expired_doc}
								<span class="text-[9px] font-black text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded border border-rose-200" title={unit.expired_doc_details}>
									⚠️ Dokumen Unit Expired
								</span>
							{/if}
							{#if unit.has_expired_sim}
								<span class="text-[9px] font-black text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200" title={unit.expired_sim_details}>
									⚠️ SIM Driver Expired
								</span>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
	{:else if activeMode === 'ngepok'}
		<!-- Summary Bento Cards for Ngepok -->
		{@const totalPlan = ngepokBatches.reduce((acc, b) => acc + (b.totalPlan || 0), 0)}
		{@const allTrips = ngepokBatches.flatMap(b => b.trips || [])}
		{@const completedCount = allTrips.filter(t => t.status === 'COMPLETED').length}
		{@const voidCount = allTrips.filter(t => t.status === 'VOID').length}
		{@const activeBatchesCount = ngepokBatches.filter(b => b.trips?.some((t: any) => t.status === 'SCHEDULED' || t.status === 'DISPATCHED')).length}

		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
			<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Batch Aktif</p>
						<h3 class="text-2xl font-black text-indigo-600 mt-1">{activeBatchesCount} <span class="text-xs text-on-surface-variant font-normal">/ {ngepokBatches.length} Total</span></h3>
					</div>
					<div class="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
						<span class="material-symbols-outlined text-2xl">sync_alt</span>
					</div>
				</div>
				<p class="text-xs text-on-surface-variant mt-2">Armada multi-rit beroperasi</p>
			</div>

			<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Plan Ritase</p>
						<h3 class="text-2xl font-black text-on-surface mt-1">{totalPlan} <span class="text-xs text-on-surface-variant font-normal">Rit</span></h3>
					</div>
					<div class="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
						<span class="material-symbols-outlined text-2xl">route</span>
					</div>
				</div>
				<p class="text-xs text-on-surface-variant mt-2">Target tarikan bolak-balik</p>
			</div>

			<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Ritase Selesai</p>
						<h3 class="text-2xl font-black text-emerald-600 mt-1">{completedCount} <span class="text-xs text-on-surface-variant font-normal">Rit Selesai</span></h3>
					</div>
					<div class="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
						<span class="material-symbols-outlined text-2xl">check_circle</span>
					</div>
				</div>
				<p class="text-xs text-emerald-600 font-medium mt-2">Tervalidasi Surat Jalan Customer</p>
			</div>

			<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Ritase Batal (Void)</p>
						<h3 class="text-2xl font-black text-rose-600 mt-1">{voidCount} <span class="text-xs text-on-surface-variant font-normal">Rit Batal</span></h3>
					</div>
					<div class="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
						<span class="material-symbols-outlined text-2xl">cancel</span>
					</div>
				</div>
				<p class="text-xs text-rose-600 font-medium mt-2">Hangus dengan alasan tercatat</p>
			</div>
		</div>

		<!-- Batch List Container -->
		{#if ngepokBatches.length === 0}
			<div class="p-12 text-center rounded-2xl bg-surface-container-low border border-dashed border-surface-container">
				<div class="w-16 h-16 rounded-full bg-indigo-500/10 text-indigo-600 flex items-center justify-center mx-auto mb-4">
					<span class="material-symbols-outlined text-3xl">sync_alt</span>
				</div>
				<h3 class="text-lg font-bold text-on-surface">Belum Ada Penugasan Ngepok</h3>
				<p class="text-sm text-on-surface-variant mt-1 max-w-md mx-auto">
					Gunakan mode ini untuk penugasan armada yang mengangkut barang bolak-balik (shuttle) beberapa ritase dalam satu siklus.
				</p>
				<button onclick={openNgepokModal} class="mt-4 px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors inline-flex items-center gap-2 cursor-pointer">
					<span class="material-symbols-outlined text-lg">add_circle</span>
					Buat Penugasan Ngepok Baru
				</button>
			</div>
		{:else}
			<div class="space-y-4">
				{#each ngepokBatches as batch}
					{@const bTrips = batch.trips || []}
					{@const bCompleted = bTrips.filter((t: any) => t.status === 'COMPLETED').length}
					{@const bVoid = bTrips.filter((t: any) => t.status === 'VOID').length}
					{@const bScheduled = bTrips.filter((t: any) => t.status === 'SCHEDULED').length}
					{@const isExpanded = expandedBatches[batch.groupId] ?? true}

					<div class="rounded-2xl bg-surface-container-lowest border border-slate-200/80 dark:border-slate-800/80 shadow-xs overflow-hidden transition-all">
						<!-- Batch Header -->
						<div class="p-5 bg-surface-container-low/40 border-b border-surface-container flex flex-wrap items-center justify-between gap-4">
							<div class="flex items-center gap-3.5">
								<button 
									type="button" 
									onclick={() => toggleBatch(batch.groupId)} 
									class="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center hover:bg-indigo-500/20 transition-colors cursor-pointer"
									title={isExpanded ? 'Sembunyikan Ritase' : 'Tampilkan Ritase'}
								>
									<span class="material-symbols-outlined text-2xl transition-transform duration-200 {isExpanded ? 'rotate-180' : ''}">expand_more</span>
								</button>
								<div>
									<div class="flex items-center gap-2">
										<span class="font-mono text-sm font-black text-indigo-600 dark:text-indigo-400 tracking-tight">{batch.groupId}</span>
										<span class="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
											Ngepok Multi-Rit
										</span>
										{#if bScheduled > 0}
											<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
												Berjalan ({bScheduled} Sisa)
											</span>
										{:else}
											<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
												Selesai / Terpenuhi
											</span>
										{/if}
									</div>
									<div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-on-surface-variant mt-1 font-medium">
										<span class="font-bold text-on-surface">Unit: {batch.nomorUnit || '-'}</span>
										<span>Supir: <strong class="text-on-surface">{batch.driverNama || '-'}</strong></span>
										<span>Customer: <strong class="text-on-surface">{batch.customer || '-'}</strong></span>
										<span>Muatan: <strong class="text-on-surface">{batch.cargo || '-'}</strong></span>
									</div>
								</div>
							</div>

							<div class="flex items-center gap-3">
								<!-- Progress Pill -->
								<div class="flex items-center gap-2 bg-surface-container px-3 py-1.5 rounded-xl text-xs font-bold text-on-surface">
									<span class="text-emerald-600">{bCompleted} Selesai</span>
									{#if bVoid > 0}
										<span class="text-rose-600">({bVoid} Void)</span>
									{/if}
									<span class="text-on-surface-variant">/ {batch.totalPlan} Plan</span>
								</div>

								<!-- Action Buttons -->
								<button 
									type="button" 
									onclick={() => openAddSusulanModal(batch)} 
									class="px-3 py-2 bg-surface-container hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/50 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 border border-surface-container cursor-pointer" 
									title="Tambah Ritase Susulan"
								>
									<span class="material-symbols-outlined text-[16px]">more_time</span>
									<span>+ Rit Susulan</span>
								</button>

								<button 
									type="button" 
									onclick={() => openBatchPrintModal(batch)} 
									class="px-3 py-2 bg-surface-container hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/50 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 border border-surface-container cursor-pointer" 
									title="Cetak Batch Surat Tugas"
								>
									<span class="material-symbols-outlined text-[16px]">print</span>
									<span>Cetak Batch</span>
								</button>

								<form method="POST" action="?/closeNgepokBatch" use:enhance>
									<input type="hidden" name="groupId" value={batch.groupId}>
									<button 
										type="submit" 
										onclick={(e) => { if (!confirm('Yakin ingin menutup batch ini? Unit akan kembali ke status AT_POOL.')) e.preventDefault(); }}
										class="px-3 py-2 bg-surface-container hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 border border-surface-container cursor-pointer" 
										title="Tutup Batch dan kembalikan unit ke pool"
									>
										<span class="material-symbols-outlined text-[16px]">logout</span>
										<span>Tutup Batch</span>
									</button>
								</form>
							</div>
						</div>

						<!-- Rute banner -->
						<div class="px-5 py-2.5 bg-surface-container/30 border-b border-surface-container flex items-center justify-between text-xs text-on-surface-variant font-medium">
							<div class="flex items-center gap-2">
								<span class="material-symbols-outlined text-[15px] text-blue-500">pin_drop</span>
								<span>Origin: <strong class="text-on-surface">{batch.origin || '-'}</strong></span>
								<span class="material-symbols-outlined text-[14px]">arrow_right_alt</span>
								<span>Destination: <strong class="text-on-surface">{batch.destination || '-'}</strong></span>
							</div>
							<div>
								Tanggal: <strong class="text-on-surface">{batch.tglTrip ? new Date(batch.tglTrip).toLocaleDateString('id-ID') : '-'}</strong>
							</div>
						</div>

						<!-- Sub-table of Ritase -->
						{#if isExpanded}
							<div class="overflow-x-auto">
								<table class="w-full text-left text-xs">
									<thead class="bg-surface-container-low/60 text-on-surface-variant font-bold border-b border-surface-container uppercase text-[10px] tracking-wider">
										<tr>
											<th class="py-3 px-5">Rit Ke</th>
											<th class="py-3 px-4">No. Surat Tugas</th>
											<th class="py-3 px-4">Surat Jalan Customer</th>
											<th class="py-3 px-4 text-right">Tonase Riil</th>
											<th class="py-3 px-4">Status Rit</th>
											<th class="py-3 px-4">Keterangan / Alasan</th>
											<th class="py-3 px-5 text-right">Aksi</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-surface-container">
										{#each bTrips as trip}
											<tr class="hover:bg-surface-container-low/40 transition-colors">
												<td class="py-3.5 px-5 font-bold text-on-surface">
													<span class="w-6 h-6 rounded-full bg-surface-container inline-flex items-center justify-center text-xs font-black">
														{trip.ritase_ke}
													</span>
												</td>
												<td class="py-3.5 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
													{trip.no_surat_tugas}
												</td>
												<td class="py-3.5 px-4">
													{#if trip.no_surat_jalan_customer}
														<span class="font-mono font-bold text-on-surface bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 px-2.5 py-1 rounded-lg inline-block">
															{trip.no_surat_jalan_customer}
														</span>
													{:else if trip.status === 'SCHEDULED'}
														<button 
															type="button" 
															onclick={() => openCompleteModal(trip)} 
															class="text-primary hover:underline font-bold text-[11px] flex items-center gap-1 cursor-pointer"
														>
															<span class="material-symbols-outlined text-[14px]">edit</span>
															<span>+ Input No. SJ</span>
														</button>
													{:else}
														<span class="text-on-surface-variant/40">-</span>
													{/if}
												</td>
												<td class="py-3.5 px-4 text-right font-mono font-bold text-on-surface">
													{trip.actual_weight ? `${trip.actual_weight} Ton` : '-'}
												</td>
												<td class="py-3.5 px-4">
													{#if trip.status === 'COMPLETED'}
														<span class="px-2.5 py-1 rounded-md text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
															Completed
														</span>
													{:else if trip.status === 'VOID'}
														<span class="px-2.5 py-1 rounded-md text-[10px] font-black uppercase bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300">
															Void / Batal
														</span>
													{:else}
														<span class="px-2.5 py-1 rounded-md text-[10px] font-black uppercase bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
															Scheduled
														</span>
													{/if}
												</td>
												<td class="py-3.5 px-4 text-xs text-on-surface-variant">
													{#if trip.void_reason}
														<span class="text-rose-600 dark:text-rose-400 font-medium italic">"{trip.void_reason}"</span>
													{:else}
														<span class="text-on-surface-variant/50">-</span>
													{/if}
												</td>
												<td class="py-3.5 px-5 text-right">
													<div class="flex items-center justify-end gap-1.5">
														{#if trip.status === 'SCHEDULED'}
															<button 
																type="button" 
																onclick={() => openCompleteModal(trip)}
																class="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-lg text-xs font-bold transition-colors cursor-pointer"
																title="Selesaikan Rit dan tautkan Surat Jalan Customer"
															>
																Selesai
															</button>
															<button 
																type="button" 
																onclick={() => openVoidModal(trip)}
																class="px-2.5 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 rounded-lg text-xs font-bold transition-colors cursor-pointer"
																title="Void / Batalkan Rit Ini"
															>
																Void
															</button>
														{/if}
														<button 
															type="button" 
															onclick={() => openBatchPrintModal(batch, trip.trip_id)}
															class="w-7 h-7 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors cursor-pointer"
															title="Cetak Surat Tugas Rit Ini"
														>
															<span class="material-symbols-outlined text-[15px]">print</span>
														</button>
													</div>
												</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}

	{:else if activeMode === 'dedicated'}
		<!-- Summary Bento Cards for Dedicated -->
		{@const totalDedicatedRitase = dedicatedDispatches.reduce((acc, d) => acc + (d.totalRitase || 0), 0)}
		{@const totalDedicatedTonnage = dedicatedDispatches.reduce((acc, d) => acc + (d.totalTonase || 0), 0)}
		{@const activeDedicatedCount = dedicatedDispatches.filter(d => d.status !== 'COMPLETED').length}

		<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
			<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Unit Dedicated Aktif</p>
						<h3 class="text-2xl font-black text-amber-600 mt-1">{activeDedicatedCount} <span class="text-xs text-on-surface-variant font-normal">Armada Standby</span></h3>
					</div>
					<div class="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
						<span class="material-symbols-outlined text-2xl">warehouse</span>
					</div>
				</div>
				<p class="text-xs text-on-surface-variant mt-2">Standby di Pelabuhan / Dermaga / Pabrik</p>
			</div>

			<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Tarikan Logsheet</p>
						<h3 class="text-2xl font-black text-on-surface mt-1">{totalDedicatedRitase} <span class="text-xs text-on-surface-variant font-normal">Tarikan</span></h3>
					</div>
					<div class="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
						<span class="material-symbols-outlined text-2xl">receipt_long</span>
					</div>
				</div>
				<p class="text-xs text-on-surface-variant mt-2">Akumulasi ritase tercatat di logsheet</p>
			</div>

			<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Tonase Terpindah</p>
						<h3 class="text-2xl font-black text-emerald-600 mt-1">{totalDedicatedTonnage.toLocaleString('id-ID')} <span class="text-xs text-on-surface-variant font-normal">Ton</span></h3>
					</div>
					<div class="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
						<span class="material-symbols-outlined text-2xl">scale</span>
					</div>
				</div>
				<p class="text-xs text-emerald-600 font-medium mt-2">Siap untuk rekonsiliasi & invoice</p>
			</div>
		</div>

		<!-- Dedicated List Container -->
		{#if dedicatedDispatches.length === 0}
			<div class="p-12 text-center rounded-2xl bg-surface-container-low border border-dashed border-surface-container">
				<div class="w-16 h-16 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto mb-4">
					<span class="material-symbols-outlined text-3xl">warehouse</span>
				</div>
				<h3 class="text-lg font-bold text-on-surface">Belum Ada Penugasan Dedicated On-Site</h3>
				<p class="text-sm text-on-surface-variant mt-1 max-w-md mx-auto">
					Gunakan mode ini untuk armada yang standby dedicated di area pabrik atau dermaga kapal ↔ gudang tanpa validasi Surat Tugas per ritase.
				</p>
				<button onclick={openDedicatedModal} class="mt-4 px-5 py-2.5 bg-amber-600 text-white text-sm font-bold rounded-xl hover:bg-amber-700 transition-colors inline-flex items-center gap-2 cursor-pointer">
					<span class="material-symbols-outlined text-lg">add_circle</span>
					Buat Penugasan Dedicated Baru
				</button>
			</div>
		{:else}
			<div class="space-y-4">
				{#each dedicatedDispatches as item}
					{@const isExpanded = expandedDedicated[item.trip_id] ?? true}
					{@const lsList = item.logsheets || []}

					<div class="rounded-2xl bg-surface-container-lowest border border-slate-200/80 dark:border-slate-800/80 shadow-xs overflow-hidden transition-all">
						<!-- Header -->
						<div class="p-5 bg-surface-container-low/40 border-b border-surface-container flex flex-wrap items-center justify-between gap-4">
							<div class="flex items-center gap-3.5">
								<button 
									type="button" 
									onclick={() => toggleDedicated(item.trip_id)} 
									class="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center hover:bg-amber-500/20 transition-colors cursor-pointer"
									title={isExpanded ? 'Sembunyikan Logsheet' : 'Tampilkan Logsheet'}
								>
									<span class="material-symbols-outlined text-2xl transition-transform duration-200 {isExpanded ? 'rotate-180' : ''}">expand_more</span>
								</button>
								<div>
									<div class="flex items-center gap-2">
										<span class="font-mono text-sm font-black text-amber-600 dark:text-amber-400 tracking-tight">{item.spk_induk_nomor || item.no_surat_tugas}</span>
										<span class="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
											Dedicated On-Site
										</span>
										<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-surface-container text-on-surface-variant">
											{item.periode_shift || 'Shift Harian'}
										</span>
										{#if item.status === 'COMPLETED'}
											<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
												Selesai / Closed
											</span>
										{:else}
											<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300">
												Aktif On-Site
											</span>
										{/if}
									</div>
									<div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-on-surface-variant mt-1 font-medium">
										<span class="font-bold text-on-surface">Unit: {item.nomor_unit || '-'}</span>
										<span>Supir: <strong class="text-on-surface">{item.driver_nama || '-'}</strong></span>
										<span>Customer: <strong class="text-on-surface">{item.customer || '-'}</strong></span>
										<span>Area: <strong class="text-on-surface">{item.origin || 'Gudang'} ↔ {item.destination || 'Dermaga'}</strong></span>
										<span>Muatan: <strong class="text-on-surface">{item.cargo || '-'}</strong></span>
									</div>
								</div>
							</div>

							<div class="flex items-center gap-3">
								<!-- Total stats pill -->
								<div class="flex items-center gap-2 bg-surface-container px-3.5 py-1.5 rounded-xl text-xs font-bold text-on-surface">
									<span class="text-blue-600">{item.totalRitase} Tarikan</span>
									<span class="text-on-surface-variant">•</span>
									<span class="text-emerald-600">{item.totalTonase.toLocaleString('id-ID')} Ton</span>
								</div>

								{#if item.status !== 'COMPLETED'}
									<button 
										type="button" 
										onclick={() => openLogsheetModal(item)} 
										class="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
									>
										<span class="material-symbols-outlined text-[16px]">add</span>
										<span>+ Input Logsheet</span>
									</button>

									<form method="POST" action="?/closeDedicatedDispatch" use:enhance>
										<input type="hidden" name="tripId" value={item.trip_id}>
										<button 
											type="submit" 
											onclick={(e) => { if (!confirm('Yakin ingin menutup penugasan dedicated ini? Unit akan kembali ke status AT_POOL.')) e.preventDefault(); }}
											class="px-3.5 py-2 bg-surface-container hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 border border-surface-container cursor-pointer"
										>
											<span class="material-symbols-outlined text-[16px]">task_alt</span>
											<span>Selesai Shift</span>
										</button>
									</form>
								{/if}
							</div>
						</div>

						<!-- Logsheet Table -->
						{#if isExpanded}
							<div class="p-4 bg-surface-container-low/20">
								<div class="rounded-xl border border-surface-container overflow-hidden bg-surface-container-lowest">
									<table class="w-full text-left text-xs">
										<thead class="bg-surface-container-low text-on-surface-variant font-bold border-b border-surface-container uppercase text-[10px] tracking-wider">
											<tr>
												<th class="py-2.5 px-4 w-12">#</th>
												<th class="py-2.5 px-4">Jam Muat</th>
												<th class="py-2.5 px-4">Jam Bongkar</th>
												<th class="py-2.5 px-4">No. Surat Jalan Customer / Tally</th>
												<th class="py-2.5 px-4 text-right">Tonase (Ton)</th>
												<th class="py-2.5 px-4">Catatan</th>
												<th class="py-2.5 px-4 text-center w-16">Aksi</th>
											</tr>
										</thead>
										<tbody class="divide-y divide-surface-container">
											{#if lsList.length === 0}
												<tr>
													<td colspan="7" class="py-8 text-center text-on-surface-variant italic">
														Belum ada catatan logsheet untuk SPK ini. Klik "+ Input Logsheet" untuk menambah tarikan.
													</td>
												</tr>
											{:else}
												{#each lsList as ls, idx}
													<tr class="hover:bg-surface-container-low/30 transition-colors">
														<td class="py-2.5 px-4 font-bold text-on-surface-variant">{idx + 1}</td>
														<td class="py-2.5 px-4 font-mono font-medium text-on-surface">{ls.jam_muat ? ls.jam_muat.slice(0, 5) : '-'}</td>
														<td class="py-2.5 px-4 font-mono font-medium text-on-surface">{ls.jam_bongkar ? ls.jam_bongkar.slice(0, 5) : '-'}</td>
														<td class="py-2.5 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
															{ls.no_surat_jalan_customer}
														</td>
														<td class="py-2.5 px-4 text-right font-mono font-black text-on-surface">
															{Number(ls.tonase).toLocaleString('id-ID')}
														</td>
														<td class="py-2.5 px-4 text-on-surface-variant">{ls.catatan || '-'}</td>
														<td class="py-2.5 px-4 text-center">
															<form method="POST" action="?/deleteOnsiteLogsheet" use:enhance>
																<input type="hidden" name="logsheetId" value={ls.id}>
																<input type="hidden" name="tripId" value={item.trip_id}>
																<button type="submit" class="w-6 h-6 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 inline-flex items-center justify-center transition-colors cursor-pointer" title="Hapus Baris">
																	<span class="material-symbols-outlined text-[15px]">delete</span>
																</button>
															</form>
														</td>
													</tr>
												{/each}
											{/if}
										</tbody>
										<tfoot class="bg-surface-container-low/80 border-t border-surface-container font-black text-xs text-on-surface">
											<tr>
												<td colspan="4" class="py-3 px-4 text-right">TOTAL AKUMULASI:</td>
												<td class="py-3 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400 text-sm">
													{item.totalTonase.toLocaleString('id-ID')} Ton
												</td>
												<td colspan="2" class="py-3 px-4 text-on-surface-variant font-bold text-[11px]">
													({item.totalRitase} Tarikan Ritase)
												</td>
											</tr>
										</tfoot>
									</table>
								</div>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	{/if}
</div>

<!-- Modal Manual Dispatch -->
{#if showManualDispatchModal && manualDispatchOrder}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onclick={closeManualDispatchModal}></div>
		
		<div class="relative w-full max-w-lg bg-surface-container-lowest rounded-[24px] shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
			<div class="p-6 border-b border-surface-container">
				<div class="flex items-start justify-between">
					<div>
						<h3 class="text-xl font-bold text-on-surface">Proses Dispatch</h3>
						<p class="text-xs text-on-surface-variant mt-1">Order: <span class="font-bold text-on-surface">{manualDispatchOrder.id}</span> • {manualDispatchOrder.customer}</p>
					</div>
					<button type="button" onclick={closeManualDispatchModal} class="w-8 h-8 flex items-center justify-center rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface-variant transition-colors">
						<span class="material-symbols-outlined text-[18px]">close</span>
					</button>
				</div>
			</div>
			
			<div class="p-6 overflow-y-auto custom-scrollbar">
				<form id="formManualDispatch" method="POST" action="?/createDoFromPo" use:enhance={() => { isSubmitting = true; return async ({ update }) => { await update(); isSubmitting = false; closeManualDispatchModal(); } }}>
					<input type="hidden" name="contractId" value={manualDispatchOrder.contract_id}>
					<input type="hidden" name="unitIds" value={JSON.stringify(manualDispatchUnitIds)}>

					<div class="space-y-4">
						{#if !manualDispatchOrder.produk_id}
							<div>
								<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Pilih Muatan <span class="text-error">*</span></label>
								<SearchableSelect 
									options={productOpts} 
									bind:value={manualDispatchCargoName} 
									placeholder="-- Cari Muatan --" 
									required={true}
								/>
								<input type="hidden" name="cargoName" value={manualDispatchCargoName}>
							</div>
						{/if}

						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Pilih Unit & Sopir <span class="text-error">*</span></label>
							<MultiSearchableSelect 
								options={unitOpts} 
								bind:value={manualDispatchUnitIds} 
								placeholder="-- Ketik untuk Mencari & Pilih Armada (Bisa lebih dari 1) --"
							/>
						</div>
						
						<div class="grid grid-cols-2 gap-4">
							<div>
								<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Waktu Muat (Loading) <span class="text-error">*</span></label>
								<input type="datetime-local" name="loadingDate" required bind:value={manualDispatchLoadingDate} class="w-full bg-surface-container rounded-xl px-4 py-2.5 text-sm font-medium border-none focus:ring-2 focus:ring-blue-500 outline-none" />
							</div>
							<div>
								<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Waktu Bongkar (Unloading)</label>
								<input type="datetime-local" name="unloadingDate" bind:value={manualDispatchUnloadingDate} class="w-full bg-surface-container rounded-xl px-4 py-2.5 text-sm font-medium border-none focus:ring-2 focus:ring-blue-500 outline-none" />
							</div>
						</div>
						
					</div>
				</form>
			</div>
			
			<div class="p-6 border-t border-surface-container bg-surface-container-lowest flex justify-end gap-3">
				<button type="button" onclick={closeManualDispatchModal} class="px-5 py-2.5 rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container transition-colors">
					Batal
				</button>
				<button type="submit" form="formManualDispatch" disabled={isSubmitting || manualDispatchUnitIds.length === 0 || (!manualDispatchOrder.produk_id && !manualDispatchCargoName) || !manualDispatchLoadingDate} class="px-5 py-2.5 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm">
					{#if isSubmitting}
						<span class="material-symbols-outlined text-[18px] animate-spin">sync</span>
						Memproses...
					{:else}
						<span class="material-symbols-outlined text-[18px]">task_alt</span>
						Proses Dispatch ({manualDispatchUnitIds.length} Unit)
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Modal Pengajuan UJO -->
{#if showUjoModal && selectedOrder}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<!-- Backdrop -->
		<div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onclick={closeUjoModal}></div>
		
		<!-- Modal Content -->
		<div class="relative w-full max-w-lg bg-surface-container-lowest rounded-[24px] shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
			<div class="p-6 border-b border-surface-container">
				<div class="flex items-start justify-between">
					<div>
						<h3 class="text-xl font-bold text-on-surface">Assign Unit & Input UJO</h3>
						<p class="text-xs text-on-surface-variant mt-1">Order: <span class="font-bold text-on-surface">{selectedOrder.id}</span> • {selectedOrder.customer}</p>
					</div>
					<button onclick={closeUjoModal} class="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors">
						<span class="material-symbols-outlined text-lg">close</span>
					</button>
				</div>
			</div>
			
			<form method="POST" action="?/assignUjo" use:enhance={() => { isSubmitting = true; return async ({ update }) => { await update(); } }}>
				<input type="hidden" name="orderId" value={selectedOrder.id}>
				<div class="p-6 overflow-y-auto">
					<!-- Order Details Summary -->
					<div class="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4 mb-6 border border-indigo-100 dark:border-indigo-900/50">
						<div class="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 mb-2">
							<span class="material-symbols-outlined text-sm">route</span>
							<span class="text-xs font-bold uppercase tracking-wider">Route & Cargo</span>
						</div>
						<p class="font-bold text-on-surface text-sm">{selectedOrder.origin} → {selectedOrder.destination}</p>
						<p class="text-xs text-on-surface-variant mt-1">{selectedOrder.cargo} • {selectedOrder.weight} Ton</p>
					</div>

					<!-- Form Inputs -->
					<div class="space-y-5">
						<div class="relative">
							<div class="flex items-center justify-between mb-2">
								<label class="block text-xs font-bold text-on-surface-variant">Select Unit & Driver</label>
								<button type="button" onclick={getSmartDispatch} disabled={isAiLoading} class="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-1.5 rounded-lg border border-orange-200 flex items-center gap-1 hover:bg-orange-100 transition-colors disabled:opacity-50">
									{#if isAiLoading}
										<span class="material-symbols-outlined text-[14px] animate-spin">refresh</span>
										Menganalisis...
									{:else}
										<span class="material-symbols-outlined text-[14px]">smart_toy</span>
										✨ Tanya FARIDA
									{/if}
								</button>
							</div>
							
							<input type="hidden" name="unitId" bind:value={ujoUnit} required />
							<input type="text" bind:value={unitSearch} onfocus={() => showUnitDropdown = true} onblur={() => setTimeout(() => showUnitDropdown = false, 200)} placeholder="Search unit number, driver, or type..." class="w-full bg-surface-container-low border border-surface-container rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-indigo-500/50" autocomplete="off" />
							{#if showUnitDropdown && filteredUnits.length > 0}
								<ul class="absolute z-10 w-full mt-1 bg-surface-container-lowest border border-surface-container rounded-xl shadow-lg max-h-48 overflow-y-auto hide-scrollbar">
									{#each filteredUnits as unit}
										<!-- svelte-ignore a11y_click_events_have_key_events -->
										<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
										<li class="px-4 py-3 text-sm text-on-surface cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors border-b border-surface-container last:border-0" onclick={() => { ujoUnit = unit.id; unitSearch = `${unit.id} • ${unit.driver} (${unit.type})`; showUnitDropdown = false; }}>
											<span class="font-bold">{unit.id}</span> • {unit.driver} 
											<span class="text-[10px] bg-surface-container-high px-1.5 py-0.5 rounded ml-1 text-on-surface-variant">{unit.type}</span>
										</li>
									{/each}
								</ul>
							{/if}
							
							{#if aiReason}
								<div class="mt-3 p-3 rounded-xl bg-orange-50 border border-orange-200 animate-in fade-in slide-in-from-top-2">
									<div class="flex items-center gap-1.5 mb-1.5">
										<span class="material-symbols-outlined text-orange-600 text-[14px]">smart_toy</span>
										<p class="text-[10px] font-black text-orange-600 uppercase tracking-wider">FARIDA Insight</p>
									</div>
									<p class="text-xs font-medium text-orange-900 leading-relaxed">{aiReason}</p>
								</div>
							{/if}
						</div>
						
						<div>
							<label class="block text-xs font-bold text-on-surface-variant mb-2">Total UJO Dasar</label>
							<div class="relative">
								<span class="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold text-sm">Rp</span>
								<input type="number" name="ujoAmount" bind:value={ujoAmount} required placeholder="Enter base amount" class="w-full bg-surface-container-low border border-surface-container rounded-xl pl-12 pr-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
							</div>
						</div>
						
						<div class="grid grid-cols-2 gap-4">
							<div>
								<label class="block text-xs font-bold text-on-surface-variant mb-2">Uang Makan</label>
								<div class="relative">
									<span class="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold text-xs">Rp</span>
									<input type="number" name="ujoMakan" bind:value={ujoMakan} placeholder="0" class="w-full bg-surface-container-low border border-surface-container rounded-xl pl-10 pr-4 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
								</div>
							</div>
							<div>
								<label class="block text-xs font-bold text-on-surface-variant mb-2">Uang Tol</label>
								<div class="relative">
									<span class="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold text-xs">Rp</span>
									<input type="number" name="ujoTol" bind:value={ujoTol} placeholder="0" class="w-full bg-surface-container-low border border-surface-container rounded-xl pl-10 pr-4 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
								</div>
							</div>
						</div>
						
						<div class="bg-indigo-50/50 dark:bg-indigo-900/10 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/30 flex items-center justify-between">
							<span class="text-xs font-bold text-indigo-700 dark:text-indigo-400">Total UJO:</span>
							<span class="text-base font-black text-indigo-700 dark:text-indigo-400">Rp {formatCurrency((Number(ujoAmount) || 0) + (Number(ujoMakan) || 0) + (Number(ujoTol) || 0)).replace('Rp', '').trim()}</span>
						</div>
						<p class="text-[10px] text-on-surface-variant mt-1 flex items-center gap-1">
							<span class="material-symbols-outlined text-[12px] text-amber-500">info</span>
							Total UJO akan dikirim ke Kasir setelah Marketing & Customer Deal.
						</p>
					</div>
				</div>
				
				<div class="p-6 border-t border-surface-container bg-surface-container-low/50 flex justify-end gap-3">
					<button type="button" onclick={closeUjoModal} class="px-5 py-2.5 rounded-xl text-sm font-bold text-on-surface hover:bg-surface-container transition-colors">
						Cancel
					</button>
					<button type="submit" disabled={isSubmitting} class="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50">
						<span class="material-symbols-outlined text-[18px]">save</span>
						Save & Submit
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Modal Closing Dispatch -->
{#if showClosingModal && selectedOrder}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<!-- Backdrop -->
		<div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onclick={closeClosingModal}></div>
		
		<!-- Modal Content -->
		<div class="relative w-full max-w-lg bg-surface-container-lowest rounded-[24px] shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
			<div class="p-6 border-b border-surface-container bg-rose-50/50 dark:bg-rose-900/10">
				<div class="flex items-start justify-between">
					<div>
						<h3 class="text-xl font-bold text-rose-700 dark:text-rose-400">Closing Dispatch</h3>
						<p class="text-xs text-on-surface-variant mt-1">Order: <span class="font-bold text-on-surface">{selectedOrder.id}</span> • {selectedOrder.customer}</p>
					</div>
					<button onclick={closeClosingModal} class="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors">
						<span class="material-symbols-outlined text-lg">close</span>
					</button>
				</div>
			</div>
			
			<form method="POST" action="?/submitClosing" use:enhance={() => { isSubmitting = true; return async ({ update }) => { await update(); } }}>
				<input type="hidden" name="orderId" value={selectedOrder.id}>
				<div class="p-6 overflow-y-auto">
					<!-- Order Details -->
					<div class="grid grid-cols-2 gap-4 mb-6 text-sm">
						<div class="bg-surface-container-low p-3 rounded-xl border border-surface-container">
							<span class="block text-[10px] text-on-surface-variant uppercase font-bold tracking-wider mb-1">Unit & Driver</span>
							<span class="font-bold text-on-surface block">{selectedOrder.assignedUnit}</span>
							<span class="text-xs text-on-surface-variant">{selectedOrder.assignedDriver}</span>
						</div>
						<div class="bg-surface-container-low p-3 rounded-xl border border-surface-container">
							<span class="block text-[10px] text-on-surface-variant uppercase font-bold tracking-wider mb-1">UJO Awal</span>
							<span class="font-bold text-sky-600 block">{formatCurrency(parseFloat(selectedOrder.estimatedUjo))}</span>
						</div>
					</div>

					<div class="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs p-3 rounded-xl mb-6 flex items-start gap-2 border border-amber-200 dark:border-amber-900/50">
						<span class="material-symbols-outlined text-base mt-0.5">warning</span>
						<p>Silakan masukkan kelebihan tonase (jika ada) dan rincian biaya aktual di luar UJO awal untuk closing <b>Delivery Note (DN) / Surat Jalan</b> ini.</p>
					</div>

					<!-- Form Inputs -->
					<div class="space-y-4">
						<div>
							<label class="block text-xs font-bold text-on-surface-variant mb-2">Real Weight (Tonase Aktual)</label>
							<div class="relative">
								<input type="number" name="closeWeight" bind:value={closeWeight} required placeholder="Enter real weight" class="w-full bg-surface-container-low border border-surface-container rounded-xl pl-4 pr-12 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-rose-500/50">
								<span class="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold text-xs">Ton</span>
							</div>
						</div>

						<div>
							<label class="block text-xs font-bold text-on-surface-variant mb-2">Biaya Tambahan / Retribusi / Parkir</label>
							<div class="relative">
								<span class="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold text-sm">Rp</span>
								<input type="number" name="closeCost" bind:value={closeCost} placeholder="0" class="w-full bg-surface-container-low border border-surface-container rounded-xl pl-12 pr-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-rose-500/50">
							</div>
						</div>

						<div>
							<label class="block text-xs font-bold text-on-surface-variant mb-2">Keterangan Biaya Tambahan</label>
							<textarea name="closeDesc" bind:value={closeDesc} rows="3" placeholder="Contoh: Biaya parkir bongkar muat & retribusi jalan..." class="w-full bg-surface-container-low border border-surface-container rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-rose-500/50 resize-none"></textarea>
						</div>
					</div>
				</div>
				
				<div class="p-6 border-t border-surface-container bg-surface-container-low/50 flex justify-end gap-3">
					<button type="button" onclick={closeClosingModal} class="px-5 py-2.5 rounded-xl text-sm font-bold text-on-surface hover:bg-surface-container transition-colors">
						Cancel
					</button>
					<button type="submit" disabled={isSubmitting} class="px-5 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-rose-700 transition-colors flex items-center gap-2 disabled:opacity-50">
						<span class="material-symbols-outlined text-[18px]">check_circle</span>
						Submit Closing
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Modal Buat Penugasan Ngepok -->
{#if showNgepokModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onclick={closeNgepokModal}></div>
		<div class="relative w-full max-w-xl bg-surface-container-lowest rounded-[24px] shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
			<div class="p-6 border-b border-surface-container bg-indigo-50/50 dark:bg-indigo-950/20">
				<div class="flex items-start justify-between">
					<div class="flex items-center gap-3">
						<div class="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
							<span class="material-symbols-outlined text-2xl">sync_alt</span>
						</div>
						<div>
							<h3 class="text-xl font-bold text-on-surface">Buat Penugasan Ngepok (Multi-Rit)</h3>
							<p class="text-xs text-on-surface-variant mt-0.5">Penugasan armada bolak-balik rute berulang dengan batch Surat Tugas</p>
						</div>
					</div>
					<button type="button" onclick={closeNgepokModal} class="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors cursor-pointer">
						<span class="material-symbols-outlined text-lg">close</span>
					</button>
				</div>
			</div>

			<form method="POST" action="?/createNgepokDispatch" use:enhance={() => { isSubmitting = true; return async ({ update }) => { await update(); isSubmitting = false; }; }} class="flex flex-col flex-1 overflow-hidden">
				<div class="p-6 overflow-y-auto space-y-4">
					<!-- Pilih Kontrak / Pelanggan -->
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Pilih Kontrak Marketing (Opsional)</label>
						<SearchableSelect 
							options={contractOpts} 
							bind:value={ngepokContractId} 
							placeholder="-- Pilih dari Kontrak Aktif --" 
						/>
						<input type="hidden" name="contractId" value={ngepokContractId}>
					</div>

					{#if !ngepokContractId}
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Pelanggan / Customer <span class="text-error">*</span></label>
							<SearchableSelect 
								options={customerOpts} 
								bind:value={ngepokCustomerId} 
								placeholder="-- Pilih Customer --" 
								required={true}
							/>
							<input type="hidden" name="customerId" value={ngepokCustomerId}>
						</div>

						<div class="grid grid-cols-2 gap-4">
							<div>
								<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Origin / Lokasi Muat <span class="text-error">*</span></label>
								<SearchableSelect 
									options={customerOpts} 
									bind:value={ngepokOriginId} 
									placeholder="-- Pilih Origin --" 
								/>
								<input type="hidden" name="originId" value={ngepokOriginId}>
							</div>
							<div>
								<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Destination / Bongkar <span class="text-error">*</span></label>
								<SearchableSelect 
									options={customerOpts} 
									bind:value={ngepokDestId} 
									placeholder="-- Pilih Destination --" 
								/>
								<input type="hidden" name="destinationId" value={ngepokDestId}>
							</div>
						</div>
					{/if}

					<!-- Armada & Sopir -->
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Pilih Armada & Sopir <span class="text-error">*</span></label>
						<SearchableSelect 
							options={unitOpts} 
							bind:value={ngepokUnitAssignment} 
							placeholder="-- Pilih Unit Armada --" 
							required={true}
						/>
						{#if ngepokUnitAssignment}
							{@const parts = ngepokUnitAssignment.split('|')}
							<input type="hidden" name="unitId" value={parts[0]}>
							<input type="hidden" name="driverId" value={parts[1] || ''}>
						{/if}
					</div>

					<!-- Muatan & Tanggal -->
					<div class="grid grid-cols-2 gap-4">
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Jenis Muatan <span class="text-error">*</span></label>
							<input type="text" name="cargoName" bind:value={ngepokCargo} required placeholder="Contoh: Batubara / Semen / Pasir" class="w-full bg-surface-container rounded-xl px-4 py-2.5 text-sm font-medium border-none outline-none focus:ring-2 focus:ring-indigo-500 text-on-surface" />
						</div>
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Tanggal Mulai <span class="text-error">*</span></label>
							<input type="date" name="loadingDate" bind:value={ngepokDate} required class="w-full bg-surface-container rounded-xl px-4 py-2.5 text-sm font-medium border-none outline-none focus:ring-2 focus:ring-indigo-500 text-on-surface" />
						</div>
					</div>

					<!-- Plan Ritase & UJO -->
					<div class="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20 space-y-3">
						<div class="flex items-center justify-between">
							<span class="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">Rencana Ritase (Batch Size)</span>
							<span class="text-xs font-extrabold text-indigo-700 dark:text-indigo-400">{ngepokPlanRit} Surat Tugas Akan Dibuat</span>
						</div>
						<div class="grid grid-cols-2 gap-4">
							<div>
								<label class="block text-[11px] font-bold text-on-surface-variant mb-1">Target Ritase (Plan)</label>
								<div class="flex items-center gap-1.5">
									<button 
										type="button" 
										onclick={() => { if (ngepokPlanRit > 1) ngepokPlanRit--; }} 
										class="w-9 h-9 flex items-center justify-center rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-black text-sm transition-colors border border-surface-container cursor-pointer"
									>-</button>
									<div class="relative flex-1">
										<input 
											type="number" 
											name="planRitase" 
											min="1" 
											max="50" 
											bind:value={ngepokPlanRit} 
											required 
											class="w-full bg-surface-container-lowest border border-surface-container rounded-xl px-2 py-2 text-center text-sm font-bold text-on-surface outline-none focus:ring-2 focus:ring-indigo-500" 
										/>
									</div>
									<button 
										type="button" 
										onclick={() => ngepokPlanRit++} 
										class="w-9 h-9 flex items-center justify-center rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-black text-sm transition-colors border border-surface-container cursor-pointer"
									>+</button>
								</div>
								<!-- Quick Preset Pills -->
								<div class="flex items-center gap-1 mt-1.5 flex-wrap">
									{#each [1, 2, 3, 5, 8] as preset}
										<button 
											type="button" 
											onclick={() => ngepokPlanRit = preset}
											class="px-2 py-0.5 text-[10px] font-bold rounded-lg transition-colors cursor-pointer {ngepokPlanRit === preset ? 'bg-indigo-600 text-white' : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'}"
										>
											{preset} Rit
										</button>
									{/each}
								</div>
							</div>
							<div>
								<label class="block text-[11px] font-bold text-on-surface-variant mb-1">UJO per Rit</label>
								<div class="relative">
									<span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-on-surface-variant">Rp</span>
									<input type="number" name="ujoPerRit" bind:value={ngepokUjoPerRit} placeholder="0" class="w-full bg-surface-container-lowest border border-surface-container rounded-xl pl-9 pr-3 py-2 text-sm font-bold text-on-surface outline-none focus:ring-2 focus:ring-indigo-500" />
								</div>
							</div>
						</div>

						<div class="grid grid-cols-2 gap-4">
							<div>
								<label class="block text-[11px] font-bold text-on-surface-variant mb-1">Uang Makan / Rit</label>
								<div class="relative">
									<span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-on-surface-variant">Rp</span>
									<input type="number" name="ujoMakan" bind:value={ngepokUjoMakan} placeholder="0" class="w-full bg-surface-container-lowest border border-surface-container rounded-xl pl-9 pr-3 py-2 text-sm font-bold text-on-surface outline-none focus:ring-2 focus:ring-indigo-500" />
								</div>
							</div>
							<div>
								<label class="block text-[11px] font-bold text-on-surface-variant mb-1">Uang Tol / Rit</label>
								<div class="relative">
									<span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-on-surface-variant">Rp</span>
									<input type="number" name="ujoTol" bind:value={ngepokUjoTol} placeholder="0" class="w-full bg-surface-container-lowest border border-surface-container rounded-xl pl-9 pr-3 py-2 text-sm font-bold text-on-surface outline-none focus:ring-2 focus:ring-indigo-500" />
								</div>
							</div>
						</div>

						<div class="pt-2 border-t border-indigo-200 dark:border-indigo-900/40 flex items-center justify-between text-xs">
							<span class="font-bold text-on-surface">Total Estimasi UJO Batch:</span>
							<span class="font-black text-indigo-600 dark:text-indigo-400 font-mono text-sm">
								Rp {((ngepokUjoPerRit + ngepokUjoMakan + ngepokUjoTol) * (ngepokPlanRit || 1)).toLocaleString('id-ID')}
							</span>
						</div>
					</div>
				</div>

				<div class="p-6 border-t border-surface-container bg-surface-container-low/40 flex justify-end gap-3">
					<button type="button" onclick={closeNgepokModal} class="px-5 py-2.5 rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer">
						Batal
					</button>
					<button type="submit" disabled={isSubmitting || !ngepokUnitAssignment || (!ngepokContractId && !ngepokCustomerId)} class="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer">
						{#if isSubmitting}
							<span class="material-symbols-outlined text-[18px] animate-spin">sync</span>
							<span>Membuat Batch...</span>
						{:else}
							<span class="material-symbols-outlined text-[18px]">task_alt</span>
							<span>Terbitkan Batch ({ngepokPlanRit} Rit)</span>
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Modal Tambah Ritase Susulan Ngepok -->
{#if showAddSusulanModal && susulanBatch}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onclick={closeAddSusulanModal}></div>
		<div class="relative w-full max-w-md bg-surface-container-lowest rounded-[24px] shadow-2xl flex flex-col overflow-hidden">
			<div class="p-6 border-b border-surface-container bg-indigo-50/50 dark:bg-indigo-950/20">
				<div class="flex items-start justify-between">
					<div class="flex items-center gap-3">
						<div class="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
							<span class="material-symbols-outlined text-2xl">more_time</span>
						</div>
						<div>
							<h3 class="text-lg font-bold text-indigo-700 dark:text-indigo-400">Tambah Ritase Susulan</h3>
							<p class="text-xs text-on-surface-variant font-mono mt-0.5">Batch: {susulanBatch.groupId} • {susulanBatch.nomorUnit}</p>
						</div>
					</div>
					<button type="button" onclick={closeAddSusulanModal} class="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors cursor-pointer">
						<span class="material-symbols-outlined text-lg">close</span>
					</button>
				</div>
			</div>

			<form method="POST" action="?/addSusulanRitNgepok" use:enhance={() => { isSubmitting = true; return async ({ update }) => { await update(); isSubmitting = false; }; }}>
				<input type="hidden" name="groupId" value={susulanBatch.groupId}>
				<div class="p-6 space-y-4">
					<div class="p-3.5 bg-surface-container/60 rounded-xl text-xs space-y-1.5 border border-surface-container">
						<div class="flex justify-between items-center">
							<span class="text-on-surface-variant">Ritase Berjalan:</span>
							<span class="font-bold text-on-surface">{susulanBatch.trips?.length || 0} Rit (Plan: {susulanBatch.totalPlan} Rit)</span>
						</div>
						<div class="flex justify-between items-center">
							<span class="text-on-surface-variant">Pengemudi:</span>
							<span class="font-bold text-on-surface">{susulanBatch.driverNama || '-'}</span>
						</div>
					</div>

					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Jumlah Ritase Ditambahkan</label>
						<div class="flex items-center gap-2">
							<button 
								type="button" 
								onclick={() => { if (susulanCount > 1) susulanCount--; }} 
								class="w-11 h-11 flex items-center justify-center rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-black text-lg transition-colors border border-surface-container cursor-pointer"
							>-</button>
							<div class="relative flex-1">
								<input 
									type="number" 
									name="count" 
									min="1" 
									max="20" 
									bind:value={susulanCount} 
									required 
									class="w-full bg-surface-container-lowest border border-surface-container rounded-xl px-4 py-2.5 text-center text-base font-black text-on-surface outline-none focus:ring-2 focus:ring-indigo-500" 
								/>
								<span class="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-on-surface-variant">Rit</span>
							</div>
							<button 
								type="button" 
								onclick={() => susulanCount++} 
								class="w-11 h-11 flex items-center justify-center rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-black text-lg transition-colors border border-surface-container cursor-pointer"
							>+</button>
						</div>

						<!-- Quick Preset Pills -->
						<div class="flex items-center gap-1.5 mt-2">
							<span class="text-[11px] text-on-surface-variant font-medium mr-1">Preset:</span>
							{#each [1, 2, 3, 5] as preset}
								<button 
									type="button" 
									onclick={() => susulanCount = preset}
									class="px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer {susulanCount === preset ? 'bg-indigo-600 text-white shadow-xs' : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'}"
								>
									+{preset} Rit
								</button>
							{/each}
						</div>
					</div>

					<div class="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-900 dark:text-indigo-300">
						<div class="font-bold flex items-center gap-1.5 mb-1">
							<span class="material-symbols-outlined text-[16px]">info</span>
							<span>Otomatisasi Penugasan & UJO:</span>
						</div>
						<p class="leading-relaxed text-[11px]">
							Sistem akan menambahkan <strong>{susulanCount} Surat Tugas baru</strong> (rit ke-{(susulanBatch.trips?.length || 0) + 1} s/d ke-{(susulanBatch.trips?.length || 0) + susulanCount}) dan secara otomatis membuat rincian UJO susulan di menu Finance.
						</p>
					</div>
				</div>

				<div class="p-6 border-t border-surface-container bg-surface-container-low/40 flex justify-end gap-3">
					<button type="button" onclick={closeAddSusulanModal} class="px-5 py-2.5 rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer">
						Batal
					</button>
					<button type="submit" disabled={isSubmitting || susulanCount < 1} class="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer">
						{#if isSubmitting}
							<span class="material-symbols-outlined text-[18px] animate-spin">sync</span>
							<span>Memproses...</span>
						{:else}
							<span class="material-symbols-outlined text-[18px]">add_circle</span>
							<span>Tambahkan {susulanCount} Rit Susulan</span>
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Modal Void Ritase Ngepok -->
{#if showVoidModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onclick={closeVoidModal}></div>
		<div class="relative w-full max-w-md bg-surface-container-lowest rounded-[24px] shadow-2xl flex flex-col overflow-hidden">
			<div class="p-6 border-b border-surface-container bg-rose-50/50 dark:bg-rose-950/20">
				<div class="flex items-start justify-between">
					<div class="flex items-center gap-3">
						<div class="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center">
							<span class="material-symbols-outlined text-2xl">cancel</span>
						</div>
						<div>
							<h3 class="text-lg font-bold text-rose-700 dark:text-rose-400">Void / Batalkan Ritase</h3>
							<p class="text-xs text-on-surface-variant font-mono mt-0.5">{voidTripSt}</p>
						</div>
					</div>
					<button type="button" onclick={closeVoidModal} class="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors cursor-pointer">
						<span class="material-symbols-outlined text-lg">close</span>
					</button>
				</div>
			</div>

			<form method="POST" action="?/voidRitNgepok" use:enhance={() => { isSubmitting = true; return async ({ update }) => { await update(); isSubmitting = false; }; }}>
				<input type="hidden" name="tripId" value={voidTripId}>
				<div class="p-6 space-y-4">
					<p class="text-xs text-on-surface-variant">
						Ritase ini akan dinyatakan <strong>Hangus (Void)</strong> dan tidak dapat ditagihkan ke Kasir atau ditautkan dengan Surat Jalan.
					</p>
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Alasan Pembatalan <span class="text-error">*</span></label>
						<textarea name="voidReason" bind:value={voidReason} required rows="3" placeholder="Contoh: Antrean dermaga ditutup / Hujan lebat / Kerusakan alat customer..." class="w-full bg-surface-container rounded-xl p-3 text-sm font-medium border-none outline-none focus:ring-2 focus:ring-rose-500 text-on-surface resize-none"></textarea>
					</div>
				</div>

				<div class="p-6 border-t border-surface-container bg-surface-container-low/40 flex justify-end gap-3">
					<button type="button" onclick={closeVoidModal} class="px-5 py-2.5 rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer">
						Batal
					</button>
					<button type="submit" disabled={isSubmitting || !voidReason.trim()} class="px-5 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-rose-700 transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer">
						<span class="material-symbols-outlined text-[18px]">cancel</span>
						<span>Konfirmasi Void</span>
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Modal Selesaikan Ritase Ngepok -->
{#if showCompleteModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onclick={closeCompleteModal}></div>
		<div class="relative w-full max-w-md bg-surface-container-lowest rounded-[24px] shadow-2xl flex flex-col overflow-hidden">
			<div class="p-6 border-b border-surface-container bg-emerald-50/50 dark:bg-emerald-950/20">
				<div class="flex items-start justify-between">
					<div class="flex items-center gap-3">
						<div class="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
							<span class="material-symbols-outlined text-2xl">check_circle</span>
						</div>
						<div>
							<h3 class="text-lg font-bold text-emerald-700 dark:text-emerald-400">Selesaikan Ritase</h3>
							<p class="text-xs text-on-surface-variant font-mono mt-0.5">{completeTripSt}</p>
						</div>
					</div>
					<button type="button" onclick={closeCompleteModal} class="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors cursor-pointer">
						<span class="material-symbols-outlined text-lg">close</span>
					</button>
				</div>
			</div>

			<form method="POST" action="?/completeRitNgepok" use:enhance={() => { isSubmitting = true; return async ({ update }) => { await update(); isSubmitting = false; }; }}>
				<input type="hidden" name="tripId" value={completeTripId}>
				<div class="p-6 space-y-4">
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">No. Surat Jalan Customer (Fisik) <span class="text-error">*</span></label>
						<input type="text" name="noSuratJalanCustomer" bind:value={completeNoSj} required placeholder="Contoh: SJ-CUST-98214" class="w-full bg-surface-container rounded-xl px-4 py-2.5 text-sm font-bold border-none outline-none focus:ring-2 focus:ring-emerald-500 text-on-surface font-mono" />
					</div>
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Tonase Riil (Hasil Timbang) <span class="text-error">*</span></label>
						<div class="relative">
							<input type="number" step="0.01" name="actualWeight" bind:value={completeWeight} required placeholder="Contoh: 32.50" class="w-full bg-surface-container rounded-xl px-4 py-2.5 text-sm font-bold border-none outline-none focus:ring-2 focus:ring-emerald-500 text-on-surface font-mono" />
							<span class="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-on-surface-variant">Ton</span>
						</div>
					</div>
				</div>

				<div class="p-6 border-t border-surface-container bg-surface-container-low/40 flex justify-end gap-3">
					<button type="button" onclick={closeCompleteModal} class="px-5 py-2.5 rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer">
						Batal
					</button>
					<button type="submit" disabled={isSubmitting || !completeNoSj.trim() || !completeWeight} class="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-emerald-700 transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer">
						<span class="material-symbols-outlined text-[18px]">done_all</span>
						<span>Simpan & Tautkan SJ</span>
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Modal Batch Print Surat Tugas Ngepok -->
{#if showPrintModal && printBatch}
	{@const tripsToPrint = printSelectedRit === 'all' ? printBatch.trips : printBatch.trips.filter((t: any) => t.trip_id === printSelectedRit)}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<div class="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onclick={closeBatchPrintModal}></div>
		<div class="relative w-full max-w-4xl bg-surface-container-lowest rounded-[24px] shadow-2xl flex flex-col overflow-hidden max-h-[95vh] z-10">
			<!-- Header -->
			<div class="p-5 border-b border-surface-container bg-surface-container-low/60 flex items-center justify-between gap-4">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
						<span class="material-symbols-outlined text-2xl">print</span>
					</div>
					<div>
						<h3 class="text-lg font-bold text-on-surface">Cetak Surat Tugas Batch Ngepok</h3>
						<p class="text-xs text-on-surface-variant font-mono">Batch: {printBatch.groupId} • {printBatch.nomorUnit} ({printBatch.driverNama})</p>
					</div>
				</div>

				<div class="flex items-center gap-2">
					<!-- Filter Cetak -->
					<div class="flex items-center gap-1.5 bg-surface-container p-1 rounded-xl text-xs font-bold">
						<button 
							type="button" 
							onclick={() => printSelectedRit = 'all'} 
							class="px-3 py-1.5 rounded-lg transition-colors cursor-pointer {printSelectedRit === 'all' ? 'bg-blue-600 text-white shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}"
						>
							Semua ({printBatch.trips?.length || 0} Rit)
						</button>
						{#each printBatch.trips || [] as t}
							<button 
								type="button" 
								onclick={() => printSelectedRit = t.trip_id} 
								class="px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer {printSelectedRit === t.trip_id ? 'bg-blue-600 text-white shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}"
							>
								Rit #{t.ritase_ke}
							</button>
						{/each}
					</div>

					<button type="button" onclick={executeBatchPrint} class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer">
						<span class="material-symbols-outlined text-[16px]">print</span>
						<span>Cetak Sekarang</span>
					</button>

					<button type="button" onclick={closeBatchPrintModal} class="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors cursor-pointer">
						<span class="material-symbols-outlined text-lg">close</span>
					</button>
				</div>
			</div>

			<!-- Print Preview Area -->
			<div class="flex-1 overflow-y-auto p-6 bg-slate-900/40 flex justify-center">
				<div id="ngepok-print-area" class="w-full max-w-[210mm] space-y-6">
					{#each tripsToPrint as trip}
						<div class="bg-white text-black p-8 rounded-sm shadow-xl page-break text-xs leading-normal border border-slate-300">
							<!-- Kop Perusahaan -->
							<div class="flex justify-between items-center border-b-2 border-slate-900 pb-3 mb-4">
								<div class="flex items-center gap-3">
									<img src="https://bcs-logistics.co.id/assets/images/logoo.png" alt="BCS Logistics" class="h-10 w-auto object-contain" />
									<div>
										<h2 class="text-sm font-black uppercase tracking-wider text-slate-900">PT Bintang Cipta Sarana</h2>
										<p class="text-[10px] text-slate-600 font-medium">Logistics, Transportation & Heavy Equipment Services</p>
									</div>
								</div>
								<div class="text-right">
									<h3 class="text-sm font-black uppercase text-slate-900">SURAT TUGAS ARMADA</h3>
									<p class="text-[11px] font-mono font-bold text-blue-700">{trip.no_surat_tugas}</p>
									<p class="text-[10px] text-slate-500">Mode: NGEPOK / SHUTTLE MULTI-RIT</p>
								</div>
							</div>

							<!-- Metadata Ritase -->
							<div class="grid grid-cols-2 gap-4 mb-4 bg-slate-50 p-3 rounded border border-slate-200">
								<div>
									<div class="text-[10px] uppercase text-slate-500 font-bold">Nomor Batch Penugasan</div>
									<div class="font-mono font-bold text-slate-900">{printBatch.groupId}</div>
									<div class="text-[10px] uppercase text-slate-500 font-bold mt-2">Nomor Ritase</div>
									<div class="font-bold text-sm text-blue-700">Rit Ke-{trip.ritase_ke} <span class="text-xs text-slate-500 font-normal">(Dari Rencana {trip.total_ritase_plan} Rit)</span></div>
								</div>
								<div>
									<div class="text-[10px] uppercase text-slate-500 font-bold">Tanggal Tugas</div>
									<div class="font-bold text-slate-900">{trip.tgl_trip ? new Date(trip.tgl_trip).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '-'}</div>
									<div class="text-[10px] uppercase text-slate-500 font-bold mt-2">Pelanggan / Customer</div>
									<div class="font-bold text-slate-900">{trip.customer || printBatch.customer || '-'}</div>
								</div>
							</div>

							<!-- Informasi Rute & Armada -->
							<table class="w-full text-xs border border-slate-300 mb-4">
								<tbody class="divide-y divide-slate-200">
									<tr>
										<td class="py-1.5 px-3 font-bold bg-slate-100 w-1/4">Nomor Polisi / Unit</td>
										<td class="py-1.5 px-3 font-black text-slate-900">{printBatch.nomorUnit || '-'}</td>
										<td class="py-1.5 px-3 font-bold bg-slate-100 w-1/4">Nama Pengemudi</td>
										<td class="py-1.5 px-3 font-black text-slate-900">{printBatch.driverNama || '-'}</td>
									</tr>
									<tr>
										<td class="py-1.5 px-3 font-bold bg-slate-100">Lokasi Asal (Origin)</td>
										<td class="py-1.5 px-3 text-slate-900">{trip.origin || printBatch.origin || '-'}</td>
										<td class="py-1.5 px-3 font-bold bg-slate-100">Lokasi Tujuan (Destination)</td>
										<td class="py-1.5 px-3 text-slate-900">{trip.destination || printBatch.destination || '-'}</td>
									</tr>
									<tr>
										<td class="py-1.5 px-3 font-bold bg-slate-100">Jenis Muatan</td>
										<td class="py-1.5 px-3 font-bold text-slate-900" colspan="3">{trip.cargo || printBatch.cargo || '-'}</td>
									</tr>
								</tbody>
							</table>

							<!-- Catatan Pengemudi & Surat Jalan -->
							<div class="border border-dashed border-slate-400 p-3 rounded mb-6 bg-slate-50">
								<div class="flex justify-between items-center text-[10px] font-bold text-slate-700 mb-1">
									<span>PENCATATAN SURAT JALAN CUSTOMER (DIISI SAAT MUAT / BONGKAR):</span>
									<span>HASIL TIMBANG PABRIK:</span>
								</div>
								<div class="flex justify-between items-baseline pt-2">
									<div class="font-mono text-sm font-bold text-slate-900">
										No. SJ: ________________________
									</div>
									<div class="font-mono text-sm font-bold text-slate-900">
										Tonase: __________ Ton / Kg
									</div>
								</div>
							</div>

							<!-- Kolom Tanda Tangan -->
							<div class="grid grid-cols-3 gap-4 text-center pt-2">
								<div class="border-t border-slate-400 pt-1">
									<p class="text-[10px] text-slate-500 uppercase font-bold">Dispatcher Kantor</p>
									<div class="h-12"></div>
									<p class="font-bold text-xs text-slate-900">( ____________________ )</p>
								</div>
								<div class="border-t border-slate-400 pt-1">
									<p class="text-[10px] text-slate-500 uppercase font-bold">Pengemudi / Driver</p>
									<div class="h-12"></div>
									<p class="font-bold text-xs text-slate-900">( {printBatch.driverNama || '____________________'} )</p>
								</div>
								<div class="border-t border-slate-400 pt-1">
									<p class="text-[10px] text-slate-500 uppercase font-bold">Petugas Customer</p>
									<div class="h-12"></div>
									<p class="font-bold text-xs text-slate-900">( ____________________ )</p>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Modal Penugasan Dedicated On-Site -->
{#if showDedicatedModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onclick={closeDedicatedModal}></div>
		<div class="relative w-full max-w-xl bg-surface-container-lowest rounded-[24px] shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
			<div class="p-6 border-b border-surface-container bg-amber-50/50 dark:bg-amber-950/20">
				<div class="flex items-start justify-between">
					<div class="flex items-center gap-3">
						<div class="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center">
							<span class="material-symbols-outlined text-2xl">warehouse</span>
						</div>
						<div>
							<h3 class="text-xl font-bold text-on-surface">Penugasan Dedicated On-Site & Stevedoring</h3>
							<p class="text-xs text-on-surface-variant mt-0.5">Penugasan armada standby di area customer/pelabuhan tanpa Surat Tugas per rit</p>
						</div>
					</div>
					<button type="button" onclick={closeDedicatedModal} class="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors cursor-pointer">
						<span class="material-symbols-outlined text-lg">close</span>
					</button>
				</div>
			</div>

			<form method="POST" action="?/createDedicatedDispatch" use:enhance={() => { isSubmitting = true; return async ({ update }) => { await update(); isSubmitting = false; }; }} class="flex flex-col flex-1 overflow-hidden">
				<div class="p-6 overflow-y-auto space-y-4">
					<div class="grid grid-cols-2 gap-4">
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">No. SPK Induk <span class="text-error">*</span></label>
							<input type="text" name="spkIndukNomor" bind:value={dedSpkInduk} required placeholder="Contoh: SPK-DED-260901" class="w-full bg-surface-container rounded-xl px-4 py-2.5 text-sm font-bold border-none outline-none focus:ring-2 focus:ring-amber-500 text-on-surface font-mono" />
						</div>
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Periode / Shift Penugasan <span class="text-error">*</span></label>
							<input type="text" name="periodeShift" bind:value={dedShift} required placeholder="Contoh: Shift 1 (08:00 - 16:00)" class="w-full bg-surface-container rounded-xl px-4 py-2.5 text-sm font-medium border-none outline-none focus:ring-2 focus:ring-amber-500 text-on-surface" />
						</div>
					</div>

					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Pelanggan / Perusahaan Customer <span class="text-error">*</span></label>
						<SearchableSelect 
							options={customerOpts} 
							bind:value={dedCustomerId} 
							placeholder="-- Pilih Customer --" 
							required={true}
						/>
						<input type="hidden" name="customerId" value={dedCustomerId}>
					</div>

					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Pilih Armada & Sopir <span class="text-error">*</span></label>
						<SearchableSelect 
							options={unitOpts} 
							bind:value={dedUnitAssignment} 
							placeholder="-- Pilih Unit Armada --" 
							required={true}
						/>
						{#if dedUnitAssignment}
							{@const parts = dedUnitAssignment.split('|')}
							<input type="hidden" name="unitId" value={parts[0]}>
							<input type="hidden" name="driverId" value={parts[1] || ''}>
						{/if}
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Area Asal (Gudang/Kapal)</label>
							<SearchableSelect 
								options={customerOpts} 
								bind:value={dedOriginId} 
								placeholder="-- Pilih Lokasi Asal --" 
							/>
							<input type="hidden" name="originId" value={dedOriginId}>
						</div>
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Area Tujuan (Bongkar)</label>
							<SearchableSelect 
								options={customerOpts} 
								bind:value={dedDestId} 
								placeholder="-- Pilih Lokasi Tujuan --" 
							/>
							<input type="hidden" name="destinationId" value={dedDestId}>
						</div>
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Jenis Muatan</label>
							<input type="text" name="cargoName" bind:value={dedCargo} placeholder="Muatan On-Site" class="w-full bg-surface-container rounded-xl px-4 py-2.5 text-sm font-medium border-none outline-none focus:ring-2 focus:ring-amber-500 text-on-surface" />
						</div>
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Tanggal Mulai</label>
							<input type="date" name="tglTrip" bind:value={dedDate} required class="w-full bg-surface-container rounded-xl px-4 py-2.5 text-sm font-medium border-none outline-none focus:ring-2 focus:ring-amber-500 text-on-surface" />
						</div>
					</div>
				</div>

				<div class="p-6 border-t border-surface-container bg-surface-container-low/40 flex justify-end gap-3">
					<button type="button" onclick={closeDedicatedModal} class="px-5 py-2.5 rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer">
						Batal
					</button>
					<button type="submit" disabled={isSubmitting || !dedUnitAssignment || !dedSpkInduk.trim()} class="px-5 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-amber-700 transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer">
						{#if isSubmitting}
							<span class="material-symbols-outlined text-[18px] animate-spin">sync</span>
							<span>Menyimpan...</span>
						{:else}
							<span class="material-symbols-outlined text-[18px]">task_alt</span>
							<span>Terbitkan Penugasan Dedicated</span>
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Modal Input Baris Logsheet On-Site -->
{#if showLogsheetModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onclick={closeLogsheetModal}></div>
		<div class="relative w-full max-w-md bg-surface-container-lowest rounded-[24px] shadow-2xl flex flex-col overflow-hidden">
			<div class="p-6 border-b border-surface-container bg-amber-50/50 dark:bg-amber-950/20">
				<div class="flex items-start justify-between">
					<div class="flex items-center gap-3">
						<div class="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center">
							<span class="material-symbols-outlined text-2xl">post_add</span>
						</div>
						<div>
							<h3 class="text-lg font-bold text-on-surface">Input Baris Logsheet On-Site</h3>
							<p class="text-xs text-on-surface-variant font-mono mt-0.5">SPK: {logsheetSpkNomor}</p>
						</div>
					</div>
					<button type="button" onclick={closeLogsheetModal} class="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors cursor-pointer">
						<span class="material-symbols-outlined text-lg">close</span>
					</button>
				</div>
			</div>

			<form method="POST" action="?/saveOnsiteLogsheet" use:enhance={() => { isSubmitting = true; return async ({ update }) => { await update(); isSubmitting = false; }; }}>
				<input type="hidden" name="tripId" value={logsheetTripId}>
				<div class="p-6 space-y-4">
					<div class="grid grid-cols-2 gap-4">
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Jam Muat</label>
							<input type="time" name="jamMuat" bind:value={lsJamMuat} class="w-full bg-surface-container rounded-xl px-4 py-2.5 text-sm font-medium border-none outline-none focus:ring-2 focus:ring-amber-500 text-on-surface" />
						</div>
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Jam Bongkar</label>
							<input type="time" name="jamBongkar" bind:value={lsJamBongkar} class="w-full bg-surface-container rounded-xl px-4 py-2.5 text-sm font-medium border-none outline-none focus:ring-2 focus:ring-amber-500 text-on-surface" />
						</div>
					</div>

					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">No. Surat Jalan Customer / Tally <span class="text-error">*</span></label>
						<input type="text" name="noSuratJalanCustomer" bind:value={lsNoSj} required placeholder="Contoh: SJ-PABRIK-0012" class="w-full bg-surface-container rounded-xl px-4 py-2.5 text-sm font-bold border-none outline-none focus:ring-2 focus:ring-amber-500 text-on-surface font-mono" />
					</div>

					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Tonase Riil (Ton) <span class="text-error">*</span></label>
						<input type="number" step="0.01" name="tonase" bind:value={lsTonase} required placeholder="Contoh: 35.40" class="w-full bg-surface-container rounded-xl px-4 py-2.5 text-sm font-bold border-none outline-none focus:ring-2 focus:ring-amber-500 text-on-surface font-mono" />
					</div>

					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Catatan Tambahan</label>
						<input type="text" name="catatan" bind:value={lsCatatan} placeholder="Opsional: Keterangan dermaga / palka" class="w-full bg-surface-container rounded-xl px-4 py-2.5 text-sm font-medium border-none outline-none focus:ring-2 focus:ring-amber-500 text-on-surface" />
					</div>
				</div>

				<div class="p-6 border-t border-surface-container bg-surface-container-low/40 flex justify-end gap-3">
					<button type="button" onclick={closeLogsheetModal} class="px-5 py-2.5 rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer">
						Batal
					</button>
					<button type="submit" disabled={isSubmitting || !lsNoSj.trim() || !lsTonase} class="px-5 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-amber-700 transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer">
						<span class="material-symbols-outlined text-[18px]">add</span>
						<span>Tambahkan ke Logsheet</span>
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
