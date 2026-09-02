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
		<button class="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-xs flex items-center gap-2 hover:bg-blue-700 transition-colors">
			<span class="material-symbols-outlined text-lg">auto_fix_high</span>
			<span>Auto-Assign AI</span>
		</button>
	</header>

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
				<div class="mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-1 shadow-lg">
					<div class="bg-surface-container-lowest rounded-xl p-5 h-full">
						<div class="flex items-center justify-between mb-4">
							<div class="flex items-center gap-2 text-blue-600">
								<span class="material-symbols-outlined text-[24px]">robot_2</span>
								<h2 class="text-sm font-black tracking-widest uppercase">AI Contract Dispatch</h2>
							</div>
							<span class="text-[10px] font-bold px-2 py-1 bg-blue-100 text-blue-700 rounded uppercase">PO Routine</span>
						</div>
						
						{#each localContractOrders as contractOrder}
							<div class="bg-blue-50 dark:bg-blue-900/10 rounded-xl p-4 border border-blue-500/20 mb-3">
								<div class="flex justify-between items-start mb-2">
									<div>
										<p class="text-sm font-black text-on-surface">{contractOrder.id}</p>
										<p class="text-xs text-on-surface-variant font-medium">{contractOrder.customer} ({contractOrder.contract_id})</p>
									</div>
									<div class="text-right">
										<p class="text-[10px] font-bold text-on-surface-variant uppercase">Rute</p>
										<p class="text-xs font-bold text-on-surface">{contractOrder.origin} &rarr; {contractOrder.destination}</p>
									</div>
								</div>
								
								<div class="bg-white dark:bg-surface-container-highest p-3 rounded-lg border border-surface-container mt-3">
									<div class="flex items-start gap-3">
										<span class="material-symbols-outlined text-amber-500 text-[20px] mt-0.5">tips_and_updates</span>
										<div class="w-full">
											<p class="text-[11px] text-on-surface-variant italic mb-2">"{contractOrder.ai_reason}"</p>
											<div class="flex items-center justify-between">
												<div>
													<p class="text-[10px] uppercase font-bold text-on-surface-variant mb-1">Recommended Unit</p>
													<div class="flex items-center gap-2">
														<p class="text-sm font-black text-blue-600">{contractOrder.ai_recommended_unit} &bull; {contractOrder.ai_recommended_driver}</p>
														{#if contractOrder.alternatives && contractOrder.alternatives.length > 0}
															<button type="button" onclick={() => skipRecommendation(contractOrder.id)} class="w-6 h-6 rounded-full bg-rose-100 text-rose-600 hover:bg-rose-200 flex items-center justify-center transition-colors" title="Skip unit ini">
																<span class="material-symbols-outlined text-[14px]">close</span>
															</button>
														{/if}
													</div>
												</div>
												<div class="flex items-center gap-2">
													<button type="button" onclick={() => openManualDispatchModal(contractOrder)} class="px-3 py-2 {contractOrder.ai_recommended_unit_id ? 'bg-surface-container-high text-on-surface-variant' : 'bg-rose-100 text-rose-700 animate-pulse'} rounded-lg text-xs font-bold hover:bg-surface-container transition-colors flex items-center gap-1">
														<span class="material-symbols-outlined text-[16px]">search</span> {contractOrder.ai_recommended_unit_id ? 'Tukar Unit Manual' : 'Pilih Unit Manual'}
													</button>
													{#if contractOrder.ai_recommended_unit_id}
														<form method="POST" action="?/createDoFromPo" use:enhance={() => { isSubmitting = true; return async ({ update }) => { await update(); isSubmitting = false; } }} class="flex items-center gap-2">
															<input type="hidden" name="contractId" value={contractOrder.contract_id}>
															<input type="hidden" name="unitId" value={contractOrder.ai_recommended_unit_id}>
															<input type="hidden" name="driverId" value={(contractOrder.ai_recommended_driver_id && contractOrder.ai_recommended_driver_id !== 'null') ? contractOrder.ai_recommended_driver_id : ''}>
															
															{#if !contractOrder.produk_id}
																<select name="cargoName" required class="bg-surface-container-low border border-surface-container text-xs rounded-lg px-2 py-2 text-on-surface focus:outline-none focus:border-blue-500 max-w-[140px]">
																	<option value="" disabled selected>Pilih Muatan</option>
																	{#each products as product}
																		<option value={product.name}>{product.name}</option>
																	{/each}
																</select>
															{/if}

															<button type="submit" disabled={isSubmitting} class="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 shadow-sm flex items-center gap-1 transition-colors disabled:opacity-50 shrink-0">
																<span class="material-symbols-outlined text-[16px]">task_alt</span> Approve Dispatch
															</button>
														</form>
													{:else}
														<button disabled class="bg-surface-container-high text-on-surface-variant px-4 py-2 rounded-lg text-xs font-bold cursor-not-allowed flex items-center gap-1 transition-colors">
															<span class="material-symbols-outlined text-[16px]">hourglass_empty</span> Belum Ada Unit
														</button>
													{/if}
												</div>
											</div>
											


											{#if contractOrder.alternatives && contractOrder.alternatives.length > 0}
												<div class="mt-4 border-t border-surface-container pt-3 w-full">
													<button onclick={() => showAlternatives[contractOrder.id] = !showAlternatives[contractOrder.id]} class="text-[11px] font-bold text-blue-600 flex items-center gap-1 hover:underline">
														<span class="material-symbols-outlined text-[16px] transition-transform {showAlternatives[contractOrder.id] ? 'rotate-180' : ''}">expand_more</span> Tampilkan {contractOrder.alternatives.length} Alternatif Unit Lainnya
													</button>
													{#if showAlternatives[contractOrder.id]}
														<div class="mt-3 flex flex-col gap-2">
															{#each contractOrder.alternatives as alt, idx}
																<div class="flex items-center justify-between p-2 bg-surface-container-lowest border border-surface-container rounded-lg">
																	<div>
																		<p class="text-xs font-bold text-on-surface">{alt.unitName}</p>
																		<p class="text-[10px] text-on-surface-variant">{alt.driverName} • {alt.reason}</p>
																	</div>
																	<button onclick={() => selectAlternative(contractOrder.id, idx)} class="px-3 py-1 bg-surface-container hover:bg-blue-100 hover:text-blue-700 text-on-surface-variant text-[10px] font-bold rounded transition-colors">
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
								</div>
							</div>
						{/each}
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
