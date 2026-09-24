<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';

	let { data, form } = $props<{ data: PageData, form: any }>();
	
	let isSubmitting = $state(false);
	let isCalculatingGPS = $state(false);
	let showModal = $state(false);
	let isEditing = $state(false);
	let editRuteId = $state<number | string | null>(null);

	let showDetailModal = $state(false);
	let selectedDetailRute = $state<any>(null);

	let selectedOrigin = $state('');
	let originSearch = $state('');
	let showOriginDropdown = $state(false);
	let filteredOrigins = $derived((data.customers || []).filter((c: any) => c.name.toLowerCase().includes(originSearch.toLowerCase())));

	let selectedDestination = $state('');
	let destSearch = $state('');
	let showDestDropdown = $state(false);
	let filteredDests = $derived((data.customers || []).filter((c: any) => c.name.toLowerCase().includes(destSearch.toLowerCase())));

	let selectedTipeUnit = $state('');
	let tipeUnitSearch = $state('');
	let showTipeUnitDropdown = $state(false);
	let filteredTipeUnits = $derived((data.tipeUnits || []).filter((t: any) => t.name.toLowerCase().includes(tipeUnitSearch.toLowerCase())));

	let googleDistanceKm = $state<number>(0);
	let manualJarakKm = $state<number | ''>('');
	let isJarakManual = $state(false);

	let biayaTol = $state<number | ''>(0);
	let biayaBongkarMuat = $state<number | ''>(0);
	let uangMakan = $state<number | ''>(0);
	let retribusi = $state<number | ''>(0);
	let ritase = $state<number | ''>(0);
	let komisi = $state<number | ''>(0);
	let biayaLain = $state<number | ''>(0);
	let tarifCustomer = $state<number | ''>(0);
	let rincianTolJSON = $state('[]');

	// Solar Fuel Management (Supports Auto & Manual Typing)
	let literSolar = $state<number | ''>('');
	let biayaSolar = $state<number | ''>('');
	let isSolarManual = $state(false);

	let showInternalTollModal = $state(false);
	let internalTollSearch = $state('');
	let selectedInternalTolls = $state<number[]>([]);
	let gpsTollInstructions = $state<string[]>([]);
	let gpsWaypoints = $state<{ name: string; lat: number; lng: number }[]>([]);
	let gpsRouteMessage = $state('');

	function calculateClientDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
		const R = 6371; // km
		const dLat = (lat2 - lat1) * Math.PI / 180;
		const dLon = (lon2 - lon1) * Math.PI / 180;
		const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
				  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
				  Math.sin(dLon/2) * Math.sin(dLon/2);
		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
		// Estimasi awal kelokan jalan raya/tol (~1.25x garis lurus)
		return R * c * 1.25;
	}

	let calculatedDistanceKm = $derived.by(() => {
		if (googleDistanceKm > 0) return Number(googleDistanceKm);
		if (!selectedOrigin || !selectedDestination) return 0;
		const ori = (data.customers || []).find((c: any) => c.id == selectedOrigin);
		const dest = (data.customers || []).find((c: any) => c.id == selectedDestination);
		if (ori?.latitude && ori?.longitude && dest?.latitude && dest?.longitude) {
			const d = calculateClientDistance(
				parseFloat(ori.latitude), parseFloat(ori.longitude),
				parseFloat(dest.latitude), parseFloat(dest.longitude)
			);
			return Math.round(d * 10) / 10;
		}
		return 0;
	});

	let effectiveDistanceKm = $derived.by(() => {
		if (manualJarakKm !== '' && Number(manualJarakKm) > 0) return Number(manualJarakKm);
		return calculatedDistanceKm;
	});

	let calculatedLiterSolar = $derived.by(() => {
		if (effectiveDistanceKm <= 0) return 0;
		return Math.round((effectiveDistanceKm / 3) * 10) / 10;
	});

	let calculatedBiayaSolar = $derived.by(() => {
		if (effectiveDistanceKm <= 0) return 0;
		return Math.round((effectiveDistanceKm / 3) * 6800);
	});

	let effectiveLiterSolar = $derived.by(() => {
		if (literSolar !== '' && Number(literSolar) > 0) return Number(literSolar);
		return calculatedLiterSolar;
	});

	let effectiveBiayaSolar = $derived.by(() => {
		if (biayaSolar !== '' && Number(biayaSolar) > 0) return Number(biayaSolar);
		return calculatedBiayaSolar;
	});

	let calculatedTotalUjo = $derived.by(() => {
		const solar = effectiveBiayaSolar;
		const tol = Number(biayaTol) || 0;
		const bongkar = Number(biayaBongkarMuat) || 0;
		const makan = Number(uangMakan) || 0;
		const ret = Number(retribusi) || 0;
		const rit = Number(ritase) || 0;
		const kom = Number(komisi) || 0;
		const lain = Number(biayaLain) || 0;
		return solar + tol + bongkar + makan + ret + rit + kom + lain;
	});

	// Sync auto-calculated distance into manualJarakKm when not in manual mode
	$effect(() => {
		if (!isJarakManual) {
			if (calculatedDistanceKm > 0) {
				manualJarakKm = calculatedDistanceKm;
			} else {
				manualJarakKm = '';
			}
		}
	});

	function handleJarakInput(val: number | '') {
		isJarakManual = true;
		manualJarakKm = val;
		if (!isSolarManual) {
			const d = Number(val) || 0;
			if (d > 0) {
				literSolar = Math.round((d / 3) * 10) / 10;
				biayaSolar = Math.round(Number(literSolar) * 6800);
			} else {
				literSolar = '';
				biayaSolar = '';
			}
		}
	}

	function resetJarakToAuto() {
		isJarakManual = false;
		if (calculatedDistanceKm > 0) {
			manualJarakKm = calculatedDistanceKm;
		} else {
			manualJarakKm = '';
		}
		if (!isSolarManual) {
			if (calculatedDistanceKm > 0) {
				literSolar = Math.round((calculatedDistanceKm / 3) * 10) / 10;
				biayaSolar = Math.round(Number(literSolar) * 6800);
			} else {
				literSolar = '';
				biayaSolar = '';
			}
		}
	}

	// Auto-populate solar values from distance when in automatic mode
	$effect(() => {
		if (!isSolarManual) {
			if (effectiveDistanceKm > 0) {
				literSolar = calculatedLiterSolar;
				biayaSolar = calculatedBiayaSolar;
			} else {
				literSolar = '';
				biayaSolar = '';
			}
		}
	});

	function handleLiterSolarInput(val: number | '') {
		isSolarManual = true;
		literSolar = val;
		if (val !== '' && !isNaN(Number(val))) {
			biayaSolar = Math.round(Number(val) * 6800);
		} else {
			biayaSolar = '';
		}
	}

	function handleBiayaSolarInput(val: number | '') {
		isSolarManual = true;
		biayaSolar = val;
		if (val !== '' && !isNaN(Number(val))) {
			literSolar = Math.round((Number(val) / 6800) * 10) / 10;
		} else {
			literSolar = '';
		}
	}

	function resetSolarToAuto() {
		isSolarManual = false;
		if (effectiveDistanceKm > 0) {
			literSolar = calculatedLiterSolar;
			biayaSolar = calculatedBiayaSolar;
		} else {
			literSolar = '';
			biayaSolar = '';
		}
	}

	let recommendedTollIds = $derived.by(() => {
		if (gpsTollInstructions.length === 0) return [];
		const ids: number[] = [];
		const instructionText = gpsTollInstructions.join(' ').toLowerCase();
		for (const g of (data.gerbangTols || [])) {
			const ruas = g.ruas.toLowerCase();
			const asal = g.asal.toLowerCase();
			const tujuan = g.tujuan.toLowerCase();
			if (instructionText.includes(ruas) || instructionText.includes(asal) || instructionText.includes(tujuan)) {
				ids.push(g.id);
			}
		}
		return ids;
	});

	let filteredInternalTolls = $derived.by(() => {
		let list = data.gerbangTols || [];
		if (internalTollSearch) {
			const s = internalTollSearch.toLowerCase();
			list = list.filter((g: any) => 
				g.ruas.toLowerCase().includes(s) || 
				g.asal.toLowerCase().includes(s) || 
				g.tujuan.toLowerCase().includes(s)
			);
		}
		return list.slice().sort((a: any, b: any) => {
			const aRec = recommendedTollIds.includes(a.id);
			const bRec = recommendedTollIds.includes(b.id);
			if (aRec && !bRec) return -1;
			if (!aRec && bRec) return 1;
			return 0;
		});
	});

	function resetForm() {
		isEditing = false;
		editRuteId = null;
		selectedOrigin = ''; originSearch = '';
		selectedDestination = ''; destSearch = '';
		selectedTipeUnit = ''; tipeUnitSearch = '';
		googleDistanceKm = 0;
		manualJarakKm = '';
		isJarakManual = false;
		biayaTol = 0;
		biayaBongkarMuat = 0;
		uangMakan = 0;
		retribusi = 0;
		ritase = 0;
		komisi = 0;
		biayaLain = 0;
		tarifCustomer = 0;
		literSolar = '';
		biayaSolar = '';
		isSolarManual = false;
		rincianTolJSON = '[]';
		selectedInternalTolls = [];
		internalTollSearch = '';
		gpsTollInstructions = [];
		gpsWaypoints = [];
		gpsRouteMessage = '';
	}

	function openCreateModal() {
		resetForm();
		showModal = true;
	}

	function openEditModal(r: any) {
		isEditing = true;
		editRuteId = r.id;
		selectedOrigin = r.origin_id;
		originSearch = r.origin_name || '';
		selectedDestination = r.destination_id;
		destSearch = r.destination_name || '';
		selectedTipeUnit = r.tipe_unit_id;
		tipeUnitSearch = r.tipe_unit_name || '';
		googleDistanceKm = parseFloat(r.jarak_km) || 0;
		manualJarakKm = parseFloat(r.jarak_km) || 0;
		isJarakManual = true; // Preserve saved distance upon edit
		biayaTol = parseFloat(r.biaya_tol) || 0;
		biayaBongkarMuat = parseFloat(r.biaya_bongkar_muat) || 0;
		uangMakan = parseFloat(r.uang_makan) || 0;
		retribusi = parseFloat(r.retribusi) || 0;
		ritase = parseFloat(r.ritase) || 0;
		komisi = parseFloat(r.komisi) || 0;
		biayaLain = parseFloat(r.biaya_lain) || 0;
		tarifCustomer = parseFloat(r.tarif_customer) || 0;
		
		literSolar = parseFloat(r.liter_solar) || 0;
		biayaSolar = parseFloat(r.biaya_solar) || 0;
		isSolarManual = true; // Preserve saved solar amount upon edit
		
		const rincian = Array.isArray(r.rincian_tol) ? r.rincian_tol : [];
		rincianTolJSON = JSON.stringify(rincian);
		selectedInternalTolls = rincian.map((t: any) => t.gerbang_tol_id);
		internalTollSearch = '';
		gpsTollInstructions = [];
		gpsWaypoints = [];
		gpsRouteMessage = '';
		
		showDetailModal = false;
		showModal = true;
	}

	function openDetailModal(r: any) {
		selectedDetailRute = r;
		showDetailModal = true;
	}

	function formatCurrency(amount: number) {
		return new Intl.NumberFormat('id-ID', {
			style: 'currency',
			currency: 'IDR',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(amount);
	}

	async function calculateGPS() {
		if (!selectedOrigin || !selectedDestination) {
			alert('Pilih Origin dan Destination terlebih dahulu.');
			return;
		}

		isCalculatingGPS = true;
		try {
			const res = await fetch('/api/tolls', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ 
					origin_id: selectedOrigin, 
					destination_id: selectedDestination,
					toll_gate_ids: selectedInternalTolls,
					tipe_unit_id: selectedTipeUnit
				})
			});
			const result = await res.json();
			if (result.success) {
				googleDistanceKm = result.distance_km;
				manualJarakKm = result.distance_km;
				isJarakManual = false;
				if (!isSolarManual) {
					literSolar = Math.round((result.distance_km / 3) * 10) / 10;
					biayaSolar = Math.round(Number(literSolar) * 6800);
				}
				if (result.toll_fee > 0) {
					biayaTol = result.toll_fee;
					if (selectedInternalTolls.length === 0) {
						rincianTolJSON = '[]';
					}
				}
				if (result.toll_instructions) {
					gpsTollInstructions = result.toll_instructions;
				}
				if (result.waypoints) {
					gpsWaypoints = result.waypoints;
				} else {
					gpsWaypoints = [];
				}
				if (result.message) {
					gpsRouteMessage = result.message;
				}
			} else {
				alert(result.error || 'Gagal mengkalkulasi.');
			}
		} catch (error) {
			console.error(error);
			alert('Terjadi kesalahan pada server saat mengkalkulasi rute.');
		}
		isCalculatingGPS = false;
	}

	function calculateInternalToll() {
		if (!selectedTipeUnit) {
			alert('Pilih Tipe Unit Kendaraan terlebih dahulu untuk mengetahui Golongan Tol-nya.');
			showInternalTollModal = false;
			return;
		}
		
		const unit = (data.tipeUnits || []).find((t: any) => t.id == selectedTipeUnit);
		const golongan = unit ? unit.golongan_tol : '2_3';

		let total = 0;
		let details = [];
		
		for (const id of selectedInternalTolls) {
			const gate = (data.gerbangTols || []).find((g: any) => g.id === id);
			if (gate) {
				let gateTarif = 0;
				if (golongan === '1') gateTarif = parseFloat(gate.tarif_gol_1);
				else if (golongan === '4_5') gateTarif = parseFloat(gate.tarif_gol_4_5);
				else gateTarif = parseFloat(gate.tarif_gol_2_3);

				total += gateTarif;
				details.push({ 
					gerbang_tol_id: id, 
					tarif: gateTarif,
					ruas: gate.ruas,
					asal: gate.asal,
					tujuan: gate.tujuan
				});
			}
		}
		
		biayaTol = total;
		rincianTolJSON = JSON.stringify(details);
		showInternalTollModal = false;

		// Otomatis hitung ulang jarak riil & estimasi solar melintasi gerbang tol
		if (selectedOrigin && selectedDestination) {
			calculateGPS();
		}
	}

	function removeToll(tollId: number) {
		selectedInternalTolls = selectedInternalTolls.filter(id => id !== tollId);
		const unit = (data.tipeUnits || []).find((t: any) => t.id == selectedTipeUnit);
		const golongan = unit ? unit.golongan_tol : '2_3';

		let total = 0;
		let details = [];
		for (const id of selectedInternalTolls) {
			const gate = (data.gerbangTols || []).find((g: any) => g.id === id);
			if (gate) {
				let gateTarif = 0;
				if (golongan === '1') gateTarif = parseFloat(gate.tarif_gol_1);
				else if (golongan === '4_5') gateTarif = parseFloat(gate.tarif_gol_4_5);
				else gateTarif = parseFloat(gate.tarif_gol_2_3);

				total += gateTarif;
				details.push({ 
					gerbang_tol_id: id, 
					tarif: gateTarif,
					ruas: gate.ruas,
					asal: gate.asal,
					tujuan: gate.tujuan
				});
			}
		}
		biayaTol = total;
		rincianTolJSON = JSON.stringify(details);

		// Otomatis hitung ulang jarak riil & estimasi solar melintasi gerbang tol tersisa
		if (selectedOrigin && selectedDestination) {
			calculateGPS();
		}
	}

	function toggleInternalToll(id: number) {
		if (selectedInternalTolls.includes(id)) {
			selectedInternalTolls = selectedInternalTolls.filter(x => x !== id);
		} else {
			selectedInternalTolls = [...selectedInternalTolls, id];
		}
	}

	$effect(() => {
		if (form?.success) {
			showModal = false;
			resetForm();
		}
	});
</script>

<svelte:head>
	<title>Master Rute & UJO | Marketing</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Header & Actions -->
	<header class="flex flex-col md:flex-row md:items-end justify-between gap-4 flex-shrink-0">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-blue-600 dark:text-blue-400 text-2xl">route</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Master Rute & Standar Biaya (UJO)</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-sm mt-0.5">
				Kelola katalog jarak rute, estimasi konsumsi BBM solar, rincian biaya gerbang tol, dan perhitungan dasar UJO
			</p>
		</div>
		<div class="flex items-center gap-2">
			<a
				href="/ocs/gerbang-tol"
				class="bg-surface-container-low hover:bg-surface-container border border-slate-200/80 dark:border-slate-800 text-on-surface px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
			>
				<span class="material-symbols-outlined text-sky-600 dark:text-sky-400 text-[18px]">toll</span>
				<span>Kelola Master Gerbang Tol</span>
			</a>
			<button onclick={openCreateModal} class="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 hover:bg-blue-700 transition-colors cursor-pointer">
				<span class="material-symbols-outlined text-[18px]">add_road</span>
				<span>Tambah Rute UJO</span>
			</button>
		</div>
	</header>

	{#if form?.error || form?.message}
		<div class="p-4 rounded-xl border {form.error ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'} flex items-center gap-3 shadow-xs">
			<span class="material-symbols-outlined">{form.error ? 'error' : 'check_circle'}</span>
			<p class="text-xs font-bold">{form.error || form.message}</p>
		</div>
	{/if}

	<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs flex-1">
		<div class="overflow-x-auto">
			<table class="w-full text-left text-sm min-w-[950px]">
				<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
					<tr>
						<th class="py-3.5 px-5">Rute (Origin &rarr; Dest)</th>
						<th class="py-3.5 px-5">Tipe Unit</th>
						<th class="py-3.5 px-5">Est. Jarak</th>
						<th class="py-3.5 px-5">Total Biaya Solar</th>
						<th class="py-3.5 px-5">Total Biaya Tol</th>
						<th class="py-3.5 px-5 text-blue-600">Total Pokok UJO</th>
						<th class="py-3.5 px-5 text-emerald-600">Tarif Customer</th>
						<th class="py-3.5 px-5 text-center w-28">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
					{#if data.ruteList.length === 0}
						<tr>
							<td colspan="8" class="py-16 text-center text-on-surface-variant">
								<span class="material-symbols-outlined text-4xl mb-2 opacity-50 block">route</span>
								<p class="font-bold text-on-surface">Belum ada Master Rute yang dibuat.</p>
							</td>
						</tr>
					{:else}
						{#each data.ruteList as r}
							<!-- svelte-ignore a11y_click_events_have_key_events -->
							<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
							<tr 
								onclick={() => openDetailModal(r)} 
								class="hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors group cursor-pointer"
								title="Klik baris untuk melihat rincian detail"
							>
								<td class="py-4 px-5">
									<div class="font-bold text-on-surface flex items-center gap-1.5">
										<span>{r.origin_name}</span>
										<span class="material-symbols-outlined text-xs text-on-surface-variant">arrow_forward</span>
									</div>
									<div class="font-bold text-xs text-on-surface-variant mt-0.5">{r.destination_name}</div>
								</td>
								<td class="py-4 px-5">
									<span class="px-2.5 py-1 rounded-md bg-surface-container-high text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
										{r.tipe_unit_name}
									</span>
								</td>
								<td class="py-4 px-5 font-medium text-on-surface">
									{parseFloat(r.jarak_km).toFixed(1)} KM
									<div class="text-[10px] text-on-surface-variant mt-0.5 font-mono">~{parseFloat(r.liter_solar).toFixed(1)} L</div>
								</td>
								<td class="py-4 px-5 font-medium text-amber-700 dark:text-amber-400">
									{formatCurrency(parseFloat(r.biaya_solar))}
								</td>
								<td class="py-4 px-5 font-medium text-indigo-700 dark:text-indigo-400">
									{formatCurrency(parseFloat(r.biaya_tol))}
									{#if r.rincian_tol && r.rincian_tol.length > 0}
										<span class="text-[10px] text-indigo-500 font-bold block">({r.rincian_tol.length} gerbang)</span>
									{/if}
								</td>
								<td class="py-4 px-5">
									<div class="font-black text-blue-600 dark:text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-lg inline-block border border-blue-500/20">
										{formatCurrency(parseFloat(r.total_ujo))}
									</div>
								</td>
								<td class="py-4 px-5">
									<div class="font-black text-emerald-600 dark:text-emerald-400">
										{r.tarif_customer ? formatCurrency(parseFloat(r.tarif_customer)) : '-'}
									</div>
								</td>
								<td class="py-4 px-5 text-center">
									<!-- svelte-ignore a11y_click_events_have_key_events -->
									<!-- svelte-ignore a11y_no_static_element_interactions -->
									<div class="flex items-center justify-center gap-1" onclick={(e) => e.stopPropagation()}>
										<button 
											type="button"
											onclick={() => openDetailModal(r)} 
											class="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/40 transition-colors cursor-pointer"
											title="Lihat Detail Rute & UJO"
										>
											<span class="material-symbols-outlined text-[18px]">visibility</span>
										</button>
										<button 
											type="button"
											onclick={() => openEditModal(r)} 
											class="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/40 transition-colors cursor-pointer"
											title="Edit Rute & UJO"
										>
											<span class="material-symbols-outlined text-[18px]">edit</span>
										</button>
									</div>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>

<!-- Create / Edit Modal -->
{#if showModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
		<div class="absolute inset-0 bg-slate-900/50 backdrop-blur-xs" onclick={() => showModal = false}></div>
		
		<div class="relative w-full max-w-2xl bg-surface-container-lowest rounded-2xl sm:rounded-[24px] shadow-2xl flex flex-col overflow-hidden max-h-[92vh] sm:max-h-[90vh] z-10 animate-in fade-in zoom-in-95 duration-150">
			<!-- Sticky Modal Header -->
			<div class="p-4 sm:p-6 border-b border-surface-container flex-shrink-0 bg-surface-container-lowest">
				<div class="flex items-start justify-between gap-3">
					<div>
						<h3 class="text-lg sm:text-xl font-bold text-on-surface">
							{isEditing ? 'Edit Master Rute & UJO' : 'Buat Master Rute & UJO Baru'}
						</h3>
						<p class="text-xs text-on-surface-variant mt-0.5">
							{isEditing ? 'Perbarui data rute, rincian tol, dan komponen UJO.' : 'Biaya Solar & Jarak akan dihitung otomatis oleh sistem.'}
						</p>
					</div>
					<button onclick={() => showModal = false} class="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors flex-shrink-0 cursor-pointer">
						<span class="material-symbols-outlined text-lg">close</span>
					</button>
				</div>
			</div>
			
			<!-- Bounded Form Container -->
			<form method="POST" action={isEditing ? "?/updateRute" : "?/createRute"} class="flex flex-col flex-1 min-h-0 overflow-hidden" use:enhance={() => { isSubmitting = true; return async ({ update }) => { await update(); isSubmitting = false; } }}>
				{#if isEditing}
					<input type="hidden" name="id" value={editRuteId} />
				{/if}

				<!-- Scrollable Form Body -->
				<div class="p-4 sm:p-6 overflow-y-auto overscroll-contain flex-1 space-y-4 sm:space-y-6">
					
					<!-- Route Info -->
					<div class="bg-surface-container-low p-4 sm:p-5 rounded-2xl border border-surface-container space-y-4">
						<h4 class="text-xs font-black text-on-surface uppercase tracking-wider flex items-center gap-2">
							<span class="material-symbols-outlined text-sky-500 text-lg">route</span> Parameter Utama
						</h4>
						
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
							<div class="relative">
								<label class="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Origin</label>
								<input type="hidden" name="origin_id" value={selectedOrigin} required />
								<input type="text" bind:value={originSearch} onfocus={() => showOriginDropdown = true} onblur={() => setTimeout(() => showOriginDropdown = false, 200)} placeholder="Cari Origin..." class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-lowest border border-surface-container focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none transition-all text-sm font-medium" autocomplete="off" />
								{#if showOriginDropdown}
									<ul class="absolute z-30 w-full mt-1 bg-surface-container-lowest border border-surface-container rounded-xl shadow-xl max-h-48 overflow-y-auto">
										{#each filteredOrigins as c}
											<!-- svelte-ignore a11y_click_events_have_key_events -->
											<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
											<li class="px-4 py-2.5 text-sm text-on-surface cursor-pointer hover:bg-surface-container-low transition-colors border-b border-surface-container last:border-0" onclick={() => { selectedOrigin = c.id; originSearch = c.name; showOriginDropdown = false; if (selectedDestination) { calculateGPS(); } }}>
												{c.name}
											</li>
										{:else}
											<li class="px-4 py-3 text-center text-xs text-on-surface-variant">Tidak ditemukan</li>
										{/each}
									</ul>
								{/if}
							</div>
							<div class="relative">
								<label class="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Destination</label>
								<input type="hidden" name="destination_id" value={selectedDestination} required />
								<input type="text" bind:value={destSearch} onfocus={() => showDestDropdown = true} onblur={() => setTimeout(() => showDestDropdown = false, 200)} placeholder="Cari Destination..." class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-lowest border border-surface-container focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none transition-all text-sm font-medium" autocomplete="off" />
								{#if showDestDropdown}
									<ul class="absolute z-30 w-full mt-1 bg-surface-container-lowest border border-surface-container rounded-xl shadow-xl max-h-48 overflow-y-auto">
										{#each filteredDests as c}
											<!-- svelte-ignore a11y_click_events_have_key_events -->
											<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
											<li class="px-4 py-2.5 text-sm text-on-surface cursor-pointer hover:bg-surface-container-low transition-colors border-b border-surface-container last:border-0" onclick={() => { selectedDestination = c.id; destSearch = c.name; showDestDropdown = false; if (selectedOrigin) { calculateGPS(); } }}>
												{c.name}
											</li>
										{:else}
											<li class="px-4 py-3 text-center text-xs text-on-surface-variant">Tidak ditemukan</li>
										{/each}
									</ul>
								{/if}
							</div>
							<div class="relative">
								<label class="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Tipe Unit Kendaraan</label>
								<input type="hidden" name="tipe_unit_id" value={selectedTipeUnit} required />
								<input type="text" bind:value={tipeUnitSearch} onfocus={() => showTipeUnitDropdown = true} onblur={() => setTimeout(() => showTipeUnitDropdown = false, 200)} placeholder="Cari Tipe Truk..." class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-lowest border border-surface-container focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none transition-all text-sm font-medium" autocomplete="off" />
								{#if showTipeUnitDropdown}
									<ul class="absolute z-30 w-full mt-1 bg-surface-container-lowest border border-surface-container rounded-xl shadow-xl max-h-48 overflow-y-auto">
										{#each filteredTipeUnits as t}
											<!-- svelte-ignore a11y_click_events_have_key_events -->
											<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
											<li class="px-4 py-2.5 text-sm text-on-surface cursor-pointer hover:bg-surface-container-low transition-colors border-b border-surface-container last:border-0" onclick={() => { selectedTipeUnit = t.id; tipeUnitSearch = t.name; showTipeUnitDropdown = false; }}>
												{t.name}
											</li>
										{:else}
											<li class="px-4 py-3 text-center text-xs text-on-surface-variant">Tidak ditemukan</li>
										{/each}
									</ul>
								{/if}
							</div>

							<!-- Jarak Tempuh (Bisa diketik manual) -->
							<div>
								<label class="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5 flex items-center justify-between">
									<span class="flex items-center gap-1">
										<span class="material-symbols-outlined text-[15px] text-sky-600">straighten</span> Jarak Tempuh (KM)
									</span>
									<div class="flex items-center gap-1.5">
										{#if isJarakManual}
											<button type="button" onclick={resetJarakToAuto} class="text-[10px] text-blue-600 hover:underline font-bold cursor-pointer flex items-center gap-0.5" title="Kembalikan ke hitungan otomatis GPS/koordinat">
												<span class="material-symbols-outlined text-[12px]">autorenew</span> Auto
											</button>
										{/if}
										<button type="button" onclick={calculateGPS} disabled={isCalculatingGPS} class="text-[10px] text-amber-700 dark:text-amber-300 hover:underline font-bold cursor-pointer flex items-center gap-0.5 disabled:opacity-50" title="Ambil jarak via Google Maps GPS">
											{#if isCalculatingGPS}
												<span class="material-symbols-outlined animate-spin text-[12px]">refresh</span>
											{:else}
												<span class="material-symbols-outlined text-[12px]">satellite_alt</span>
											{/if}
											GPS
										</button>
									</div>
								</label>
								<div class="relative">
									<input 
										type="number" 
										step="0.1" 
										min="0"
										name="jarak_km" 
										value={manualJarakKm} 
										oninput={(e) => handleJarakInput(e.currentTarget.value === '' ? '' : parseFloat(e.currentTarget.value))}
										placeholder={calculatedDistanceKm > 0 ? calculatedDistanceKm.toFixed(1) : "0.0"} 
										class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-lowest border border-surface-container focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none transition-all text-sm font-bold font-mono text-on-surface"
									/>
									<span class="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-on-surface-variant pointer-events-none">KM</span>
								</div>
							</div>
						</div>
					</div>

					<!-- Real-time Solar & UJO Preview Card -->
					<div class="bg-gradient-to-r from-blue-50/80 via-amber-50/70 to-indigo-50/80 dark:from-blue-950/40 dark:via-amber-950/30 dark:to-indigo-950/40 p-4 sm:p-5 rounded-2xl border border-blue-200/80 dark:border-blue-900/60 shadow-2xs space-y-3.5">
						<div class="flex items-center justify-between">
							<span class="text-xs font-black text-on-surface uppercase tracking-wider flex items-center gap-1.5">
								<span class="material-symbols-outlined text-amber-500 text-lg">local_gas_station</span>
								Kalkulasi Biaya Solar & Estimasi UJO
							</span>
							<span class="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 uppercase tracking-wider">
								Real-time
							</span>
						</div>
						
						<div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
							<div class="bg-white/90 dark:bg-slate-900/90 p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 shadow-2xs">
								<div class="text-[10px] text-on-surface-variant font-bold flex items-center justify-between">
									<span>Est. Jarak Tempuh</span>
									{#if isJarakManual}
										<span class="text-[9px] bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 px-1 rounded uppercase font-black">Manual</span>
									{:else}
										<span class="text-[9px] text-on-surface-variant">Auto</span>
									{/if}
								</div>
								<div class="text-sm sm:text-base font-black text-on-surface mt-0.5">{effectiveDistanceKm.toFixed(1)} KM</div>
								<div class="text-[10px] text-on-surface-variant/80 font-mono">~{effectiveLiterSolar.toFixed(1)} L Solar</div>
							</div>
							<div class="bg-white/90 dark:bg-slate-900/90 p-3 rounded-xl border border-amber-200/80 dark:border-amber-900/60 shadow-2xs">
								<div class="text-[10px] text-amber-700 dark:text-amber-300 font-bold flex items-center justify-between">
									<span>Biaya Solar</span>
									{#if isSolarManual}
										<span class="text-[9px] bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 px-1 rounded uppercase font-black">Manual</span>
									{:else}
										<span class="text-[9px] text-on-surface-variant">Auto</span>
									{/if}
								</div>
								<div class="text-sm sm:text-base font-black text-amber-700 dark:text-amber-400 mt-0.5">{formatCurrency(effectiveBiayaSolar)}</div>
								<div class="text-[10px] text-on-surface-variant/80 font-mono">Rp 6.800/L</div>
							</div>
							<div class="bg-surface-container-low p-3 rounded-xl border border-surface-container/60 shadow-2xs">
								<div class="text-[10px] text-indigo-700 dark:text-indigo-300 font-bold">Biaya Tol</div>
								<div class="text-sm sm:text-base font-black text-indigo-700 dark:text-indigo-400 mt-0.5">{formatCurrency(Number(biayaTol) || 0)}</div>
								<div class="text-[10px] text-on-surface-variant/80 font-mono">{selectedInternalTolls.length} Gerbang</div>
							</div>
							<div class="bg-blue-600 text-white p-3 rounded-xl shadow-xs flex flex-col justify-between">
								<div class="text-[10px] text-blue-100 font-bold">Estimasi Total UJO</div>
								<div class="text-sm sm:text-base font-black mt-0.5 font-mono">{formatCurrency(calculatedTotalUjo)}</div>
								<div class="text-[10px] text-blue-200 font-medium">Pokok Jalan</div>
							</div>
						</div>

						<!-- Selected Gates Chips & Waypoint Trajectory -->
						{#if selectedInternalTolls.length > 0}
							<div class="pt-2 border-t border-surface-container/60 space-y-2">
								<div class="flex flex-wrap items-center gap-1.5 text-[11px]">
									<span class="text-[11px] font-bold text-on-surface-variant flex items-center gap-1">
										<span class="material-symbols-outlined text-[15px] text-indigo-600">toll</span> Gerbang Terpilih:
									</span>
									{#each selectedInternalTolls as tollId}
										{@const gate = (data.gerbangTols || []).find((g: any) => g.id === tollId)}
										{#if gate}
											<span class="inline-flex items-center gap-1 bg-surface-container-lowest text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-lg font-semibold text-[10px] border border-surface-container/60 shadow-2xs">
												<span>{gate.ruas} ({gate.asal} &rarr; {gate.tujuan})</span>
												<button type="button" onclick={() => removeToll(tollId)} class="hover:text-rose-600 ml-0.5 text-xs font-black cursor-pointer" title="Hapus gerbang ini">&times;</button>
											</span>
										{/if}
									{/each}
								</div>

								{#if gpsWaypoints.length > 0}
									<div class="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-2 shadow-2xs">
										<span class="material-symbols-outlined text-[18px] text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0">alt_route</span>
										<div class="space-y-1">
											<div class="font-bold flex items-center gap-1.5">
												<span>Lintasan Gerbang Tol Terhitung ({gpsWaypoints.length} Titik Waypoint):</span>
											</div>
											<div class="flex flex-wrap items-center gap-1 text-[11px]">
												{#each gpsWaypoints as wp, idx}
													<span class="bg-surface-container-lowest px-2 py-0.5 rounded-md font-semibold border border-emerald-200/60 dark:border-emerald-700/60 text-emerald-800 dark:text-emerald-200 shadow-2xs">
														{wp.name}
													</span>
													{#if idx < gpsWaypoints.length - 1}
														<span class="text-emerald-500 font-bold">&rarr;</span>
													{/if}
												{/each}
											</div>
										</div>
									</div>
								{/if}
							</div>
						{/if}
					</div>

					<!-- UJO Components -->
					<div class="space-y-4">
						<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
							<h4 class="text-xs font-black text-on-surface uppercase tracking-wider flex items-center gap-2">
								<span class="material-symbols-outlined text-sky-500 text-lg">payments</span> Komponen UJO
							</h4>
							<div class="flex flex-wrap items-center gap-2">
								<button type="button" onclick={() => showInternalTollModal = true} class="bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border border-indigo-200/60 dark:border-indigo-800/60 cursor-pointer shadow-2xs">
									<span class="material-symbols-outlined text-[16px]">toll</span>
									Pilih Gerbang Tol Internal
								</button>
								<button type="button" onclick={calculateGPS} disabled={isCalculatingGPS} class="bg-amber-50/70 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border border-amber-200/60 dark:border-amber-800/60 disabled:opacity-50 cursor-pointer shadow-2xs">
									{#if isCalculatingGPS}
										<span class="material-symbols-outlined animate-spin text-[16px]">refresh</span>
									{:else}
										<span class="material-symbols-outlined text-[16px]">satellite_alt</span>
									{/if}
									Auto Jarak via GPS
								</button>
							</div>
						</div>
						
						<input type="hidden" name="google_distance_km" value={effectiveDistanceKm} />
						<input type="hidden" name="rincian_tol_json" value={rincianTolJSON} />

						<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
							<!-- Liter Solar (Bisa diketik manual) -->
							<div>
								<label class="block text-xs font-bold text-amber-800 dark:text-amber-300 mb-1 flex items-center justify-between">
									<span class="flex items-center gap-1">
										<span class="material-symbols-outlined text-[15px] text-amber-600">local_gas_station</span> Liter Solar (L)
									</span>
									{#if isSolarManual}
										<button type="button" onclick={resetSolarToAuto} class="text-[10px] text-blue-600 hover:underline font-bold cursor-pointer flex items-center gap-0.5" title="Kembalikan ke hitungan otomatis jarak">
											<span class="material-symbols-outlined text-[12px]">autorenew</span> Auto
										</button>
									{/if}
								</label>
								<input 
									type="number" 
									step="0.1" 
									name="liter_solar" 
									value={literSolar} 
									oninput={(e) => handleLiterSolarInput(e.currentTarget.value === '' ? '' : parseFloat(e.currentTarget.value))}
									placeholder={calculatedLiterSolar > 0 ? calculatedLiterSolar.toString() : "0"} 
									class="w-full px-3.5 py-2.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 focus:border-amber-500 outline-none text-sm font-bold font-mono text-amber-900 dark:text-amber-200"
								/>
							</div>

							<!-- Biaya Solar (Bisa diketik manual) -->
							<div>
								<label class="block text-xs font-bold text-amber-800 dark:text-amber-300 mb-1 flex items-center justify-between">
									<span class="flex items-center gap-1">
										<span class="material-symbols-outlined text-[15px] text-amber-600">payments</span> Biaya Solar (Rp)
									</span>
									<span class="text-[10px] text-amber-600 dark:text-amber-400 font-mono">@Rp 6.800</span>
								</label>
								<input 
									type="number" 
									name="biaya_solar" 
									value={biayaSolar} 
									oninput={(e) => handleBiayaSolarInput(e.currentTarget.value === '' ? '' : parseFloat(e.currentTarget.value))}
									placeholder={calculatedBiayaSolar > 0 ? calculatedBiayaSolar.toString() : "0"} 
									class="w-full px-3.5 py-2.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 focus:border-amber-500 outline-none text-sm font-bold font-mono text-amber-900 dark:text-amber-200"
								/>
							</div>

							<!-- Biaya Tol -->
							<div>
								<label class="block text-xs font-bold text-on-surface-variant mb-1 flex justify-between">
									<span>Biaya Tol (Rp)</span>
									{#if effectiveDistanceKm > 0}
										<span class="text-[10px] text-amber-700 dark:text-amber-300 font-bold bg-amber-100 dark:bg-amber-950 px-1.5 py-0.5 rounded">{effectiveDistanceKm.toFixed(1)} KM</span>
									{/if}
								</label>
								<input type="number" name="biaya_tol" bind:value={biayaTol} min="0" placeholder="0" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container border border-surface-container focus:border-sky-500 outline-none text-sm font-bold font-mono">
							</div>

							<!-- Bongkar Muat -->
							<div>
								<label class="block text-xs font-bold text-on-surface-variant mb-1">Bongkar Muat (Rp)</label>
								<input type="number" name="biaya_bongkar_muat" bind:value={biayaBongkarMuat} min="0" placeholder="0" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container border border-surface-container focus:border-sky-500 outline-none text-sm font-bold font-mono">
							</div>

							<!-- Uang Makan -->
							<div>
								<label class="block text-xs font-bold text-on-surface-variant mb-1">Uang Makan (Rp)</label>
								<input type="number" name="uang_makan" bind:value={uangMakan} min="0" placeholder="0" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container border border-surface-container focus:border-sky-500 outline-none text-sm font-bold font-mono">
							</div>

							<!-- Retribusi -->
							<div>
								<label class="block text-xs font-bold text-on-surface-variant mb-1">Retribusi (Rp)</label>
								<input type="number" name="retribusi" bind:value={retribusi} min="0" placeholder="0" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container border border-surface-container focus:border-sky-500 outline-none text-sm font-bold font-mono">
							</div>

							<!-- Ritase -->
							<div>
								<label class="block text-xs font-bold text-on-surface-variant mb-1">Ritase / Bonus (Rp)</label>
								<input type="number" name="ritase" bind:value={ritase} min="0" placeholder="0" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container border border-surface-container focus:border-sky-500 outline-none text-sm font-bold font-mono">
							</div>

							<!-- Komisi -->
							<div>
								<label class="block text-xs font-bold text-on-surface-variant mb-1">Komisi (Rp)</label>
								<input type="number" name="komisi" bind:value={komisi} min="0" placeholder="0" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container border border-surface-container focus:border-sky-500 outline-none text-sm font-bold font-mono">
							</div>

							<!-- Biaya Lain-lain -->
							<div>
								<label class="block text-xs font-bold text-on-surface-variant mb-1">Biaya Lain-lain (Rp)</label>
								<input type="number" name="biaya_lain" bind:value={biayaLain} min="0" placeholder="0" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container border border-surface-container focus:border-sky-500 outline-none text-sm font-bold font-mono">
							</div>
						</div>
					</div>

					<div class="pt-3 border-t border-surface-container">
						<label class="block text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-1">Tarif / Harga Jual per Trip ke Customer (Opsional)</label>
						<input type="number" name="tarif_customer" bind:value={tarifCustomer} min="0" placeholder="Biarkan kosong jika kontrak Lump Sum" class="w-full px-3.5 py-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 focus:border-emerald-500 outline-none text-sm font-bold font-mono text-emerald-800 dark:text-emerald-300">
					</div>
					
				</div>

				<!-- Sticky Modal Footer -->
				<div class="p-4 sm:p-6 border-t border-surface-container bg-surface-container-lowest flex items-center justify-end gap-2.5 flex-shrink-0">
					<button type="button" onclick={() => showModal = false} class="px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer">
						Batal
					</button>
					<button type="submit" disabled={isSubmitting} class="px-5 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold {isEditing ? 'bg-amber-600 hover:bg-amber-700' : 'bg-sky-600 hover:bg-sky-700'} text-white shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer">
						{#if isSubmitting}
							<span class="material-symbols-outlined animate-spin text-[18px]">refresh</span>
							Menyimpan...
						{:else}
							<span class="material-symbols-outlined text-[18px]">save</span>
							{isEditing ? 'Simpan Perubahan' : 'Simpan Master Rute'}
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Detail Modal -->
{#if showDetailModal && selectedDetailRute}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
		<div class="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onclick={() => showDetailModal = false}></div>
		
		<div class="relative w-full max-w-3xl bg-surface-container-lowest rounded-2xl sm:rounded-[24px] shadow-2xl flex flex-col overflow-hidden max-h-[92vh] sm:max-h-[90vh] z-10 animate-in fade-in zoom-in-95 duration-150">
			<!-- Sticky Header -->
			<div class="p-4 sm:p-6 border-b border-surface-container bg-surface-container-lowest flex-shrink-0">
				<div class="flex items-start justify-between gap-3">
					<div class="space-y-1">
						<div class="flex flex-wrap items-center gap-2">
							<span class="px-2.5 py-1 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 text-xs font-black uppercase tracking-wider">
								{selectedDetailRute.tipe_unit_name}
							</span>
							<span class="text-xs text-on-surface-variant font-medium">Golongan Tol: Gol {selectedDetailRute.tipe_unit_golongan_tol || '2 & 3'}</span>
						</div>
						<h3 class="text-lg sm:text-xl font-black text-on-surface flex items-center gap-2">
							<span>{selectedDetailRute.origin_name}</span>
							<span class="material-symbols-outlined text-blue-600">arrow_forward</span>
							<span>{selectedDetailRute.destination_name}</span>
						</h3>
					</div>
					<button onclick={() => showDetailModal = false} class="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors flex-shrink-0 cursor-pointer">
						<span class="material-symbols-outlined text-lg">close</span>
					</button>
				</div>
			</div>
			
			<!-- Scrollable Content -->
			<div class="p-4 sm:p-6 overflow-y-auto overscroll-contain flex-1 space-y-4 sm:space-y-6">
				<!-- Quick Overview Stats -->
				<div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
					<div class="p-3.5 rounded-2xl bg-surface-container-low border border-surface-container">
						<div class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Total Pokok UJO</div>
						<div class="text-base sm:text-lg font-black text-blue-600 dark:text-blue-400 mt-1 font-mono">{formatCurrency(parseFloat(selectedDetailRute.total_ujo))}</div>
					</div>
					<div class="p-3.5 rounded-2xl bg-surface-container-low border border-surface-container">
						<div class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Tarif Customer</div>
						<div class="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
							{selectedDetailRute.tarif_customer ? formatCurrency(parseFloat(selectedDetailRute.tarif_customer)) : 'Lump Sum'}
						</div>
					</div>
					<div class="p-3.5 rounded-2xl bg-surface-container-low border border-surface-container">
						<div class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Est. Jarak Tempuh</div>
						<div class="text-base sm:text-lg font-black text-on-surface mt-1">{parseFloat(selectedDetailRute.jarak_km).toFixed(1)} KM</div>
					</div>
					<div class="p-3.5 rounded-2xl bg-surface-container-low border border-surface-container">
						<div class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Konsumsi Solar</div>
						<div class="text-base sm:text-lg font-black text-amber-600 dark:text-amber-400 mt-1">~{parseFloat(selectedDetailRute.liter_solar).toFixed(1)} L</div>
					</div>
				</div>

				<!-- Section: Detail Biaya Solar -->
				<div class="rounded-2xl border border-amber-200/80 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 p-4 sm:p-5 space-y-3">
					<div class="flex items-center justify-between">
						<h4 class="text-xs font-black text-amber-900 dark:text-amber-200 uppercase tracking-wider flex items-center gap-2">
							<span class="material-symbols-outlined text-amber-600 text-lg">local_gas_station</span> Rincian Biaya Solar
						</h4>
						<span class="text-xs font-bold text-amber-700 dark:text-amber-300 font-mono">
							Rp 6.800 / Liter (Bio Solar)
						</span>
					</div>
					<div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
						<div class="bg-white/80 dark:bg-slate-900/80 p-3 rounded-xl border border-amber-200/60 dark:border-amber-900/40">
							<div class="text-[10px] font-bold text-on-surface-variant">Jarak Ditempuh</div>
							<div class="text-sm font-black text-on-surface mt-0.5">{parseFloat(selectedDetailRute.jarak_km).toFixed(1)} KM</div>
						</div>
						<div class="bg-white/80 dark:bg-slate-900/80 p-3 rounded-xl border border-amber-200/60 dark:border-amber-900/40">
							<div class="text-[10px] font-bold text-on-surface-variant">Liter Dibutuhkan (3 km/L)</div>
							<div class="text-sm font-black text-amber-600 dark:text-amber-400 mt-0.5">{parseFloat(selectedDetailRute.liter_solar).toFixed(1)} Liter</div>
						</div>
						<div class="bg-white/80 dark:bg-slate-900/80 p-3 rounded-xl border border-amber-200/60 dark:border-amber-900/40">
							<div class="text-[10px] font-bold text-on-surface-variant">Total Biaya Solar</div>
							<div class="text-sm font-black text-amber-700 dark:text-amber-300 mt-0.5 font-mono">{formatCurrency(parseFloat(selectedDetailRute.biaya_solar))}</div>
						</div>
					</div>
				</div>

				<!-- Section: Gerbang Tol -->
				<div class="rounded-2xl border border-surface-container/60 bg-surface-container-low/50 p-4 sm:p-5 space-y-3">
					<div class="flex items-center justify-between">
						<h4 class="text-xs font-black text-on-surface uppercase tracking-wider flex items-center gap-2">
							<span class="material-symbols-outlined text-indigo-600 dark:text-indigo-400 text-lg">toll</span> Rincian Gerbang Tol
						</h4>
						<span class="text-sm font-black text-indigo-700 dark:text-indigo-300 font-mono">
							Total: {formatCurrency(parseFloat(selectedDetailRute.biaya_tol))}
						</span>
					</div>
					{#if selectedDetailRute.rincian_tol && selectedDetailRute.rincian_tol.length > 0}
						<div class="overflow-x-auto rounded-xl border border-surface-container/60 bg-surface-container-lowest">
							<table class="w-full text-left text-xs">
								<thead class="bg-surface-container-low text-on-surface-variant border-b border-surface-container/60">
									<tr>
										<th class="px-3 py-2 font-bold">Ruas Tol</th>
										<th class="px-3 py-2 font-bold">Gerbang Asal &rarr; Tujuan</th>
										<th class="px-3 py-2 font-bold text-right">Tarif</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-surface-container/60">
									{#each selectedDetailRute.rincian_tol as t}
										<tr>
											<td class="px-3 py-2 font-bold text-on-surface">{t.ruas}</td>
											<td class="px-3 py-2 text-on-surface-variant">{t.asal} &rarr; {t.tujuan}</td>
											<td class="px-3 py-2 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(parseFloat(t.tarif))}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{:else}
						<p class="text-xs text-on-surface-variant italic bg-surface-container-lowest p-3 rounded-xl border border-surface-container/60">
							{#if parseFloat(selectedDetailRute.biaya_tol) > 0}
								Biaya tol ditetapkan secara global / GPS sebesar {formatCurrency(parseFloat(selectedDetailRute.biaya_tol))} tanpa rincian gerbang internal.
							{:else}
								Rute ini tidak melalui jalan tol (Biaya Tol Rp 0).
							{/if}
						</p>
					{/if}
				</div>

				<!-- Section: Breakdown Komponen UJO -->
				<div class="rounded-2xl border border-surface-container bg-surface-container-low p-4 sm:p-5 space-y-3">
					<h4 class="text-xs font-black text-on-surface uppercase tracking-wider flex items-center gap-2">
						<span class="material-symbols-outlined text-blue-600 text-lg">receipt_long</span> Breakdown Rincian Seluruh Komponen UJO
					</h4>
					<div class="divide-y divide-surface-container text-xs">
						<div class="py-2.5 flex justify-between items-center">
							<span class="text-on-surface-variant font-medium">1. Biaya Bahan Bakar Solar</span>
							<span class="font-bold text-on-surface font-mono">{formatCurrency(parseFloat(selectedDetailRute.biaya_solar))}</span>
						</div>
						<div class="py-2.5 flex justify-between items-center">
							<span class="text-on-surface-variant font-medium">2. Biaya Tol</span>
							<span class="font-bold text-on-surface font-mono">{formatCurrency(parseFloat(selectedDetailRute.biaya_tol))}</span>
						</div>
						<div class="py-2.5 flex justify-between items-center">
							<span class="text-on-surface-variant font-medium">3. Biaya Bongkar Muat</span>
							<span class="font-bold text-on-surface font-mono">{formatCurrency(parseFloat(selectedDetailRute.biaya_bongkar_muat || 0))}</span>
						</div>
						<div class="py-2.5 flex justify-between items-center">
							<span class="text-on-surface-variant font-medium">4. Uang Makan Supir</span>
							<span class="font-bold text-on-surface font-mono">{formatCurrency(parseFloat(selectedDetailRute.uang_makan || 0))}</span>
						</div>
						<div class="py-2.5 flex justify-between items-center">
							<span class="text-on-surface-variant font-medium">5. Retribusi / Timbangan</span>
							<span class="font-bold text-on-surface font-mono">{formatCurrency(parseFloat(selectedDetailRute.retribusi || 0))}</span>
						</div>
						<div class="py-2.5 flex justify-between items-center">
							<span class="text-on-surface-variant font-medium">6. Ritase / Bonus Supir</span>
							<span class="font-bold text-on-surface font-mono">{formatCurrency(parseFloat(selectedDetailRute.ritase || 0))}</span>
						</div>
						{#if parseFloat(selectedDetailRute.komisi || 0) > 0}
							<div class="py-2.5 flex justify-between items-center">
								<span class="text-on-surface-variant font-medium">7. Komisi</span>
								<span class="font-bold text-on-surface font-mono">{formatCurrency(parseFloat(selectedDetailRute.komisi || 0))}</span>
							</div>
						{/if}
						<div class="py-2.5 flex justify-between items-center">
							<span class="text-on-surface-variant font-medium">{parseFloat(selectedDetailRute.komisi || 0) > 0 ? '8' : '7'}. Biaya Lain-lain</span>
							<span class="font-bold text-on-surface font-mono">{formatCurrency(parseFloat(selectedDetailRute.biaya_lain || 0))}</span>
						</div>
						<div class="py-3 flex justify-between items-center bg-blue-50/60 dark:bg-blue-950/30 px-3 rounded-xl mt-2 font-bold">
							<span class="text-blue-900 dark:text-blue-200">TOTAL UANG JALAN OPERASIONAL (UJO)</span>
							<span class="text-blue-600 dark:text-blue-400 font-mono text-base font-black">{formatCurrency(parseFloat(selectedDetailRute.total_ujo))}</span>
						</div>
					</div>
				</div>

				<!-- Section: Margin Analysis -->
				{#if parseFloat(selectedDetailRute.tarif_customer) > 0}
					{@const margin = parseFloat(selectedDetailRute.tarif_customer) - parseFloat(selectedDetailRute.total_ujo)}
					{@const marginPct = ((margin / parseFloat(selectedDetailRute.tarif_customer)) * 100).toFixed(1)}
					<div class="rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
						<div>
							<h4 class="text-xs font-black text-emerald-900 dark:text-emerald-200 uppercase tracking-wider flex items-center gap-2">
								<span class="material-symbols-outlined text-emerald-600 text-lg">trending_up</span> Analisis Margin Operasional
							</h4>
							<p class="text-xs text-on-surface-variant mt-0.5">Selisih antara Tarif Customer dengan Standar UJO</p>
						</div>
						<div class="text-right">
							<div class="text-base font-black {margin >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'} font-mono">
								{formatCurrency(margin)} ({marginPct}%)
							</div>
							<div class="text-[10px] text-on-surface-variant">Estimasi Gross Margin</div>
						</div>
					</div>
				{/if}
			</div>

			<!-- Sticky Footer -->
			<div class="p-4 sm:p-6 border-t border-surface-container bg-surface-container-lowest flex items-center justify-between gap-3 flex-shrink-0">
				<button type="button" onclick={() => showDetailModal = false} class="px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer">
					Tutup
				</button>
				<button type="button" onclick={() => openEditModal(selectedDetailRute)} class="px-5 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-amber-600 text-white hover:bg-amber-700 shadow-sm transition-colors flex items-center gap-2 cursor-pointer">
					<span class="material-symbols-outlined text-[18px]">edit</span>
					Edit Rute Ini
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Internal Toll Modal -->
{#if showInternalTollModal}
	<div class="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4">
		<div class="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onclick={() => showInternalTollModal = false}></div>
		
		<div class="relative w-full max-w-3xl bg-surface-container-lowest rounded-2xl sm:rounded-[24px] shadow-2xl flex flex-col overflow-hidden max-h-[90vh] sm:max-h-[85vh] z-10 animate-in fade-in zoom-in-95 duration-150">
			<!-- Sticky Header with Search -->
			<div class="p-4 sm:p-6 border-b border-surface-container/60 bg-surface-container-low/60 flex-shrink-0">
				<div class="flex items-start justify-between gap-3">
					<div>
						<h3 class="text-base sm:text-lg font-bold text-on-surface flex items-center gap-2">
							<span class="material-symbols-outlined text-indigo-600 dark:text-indigo-400">toll</span> Database Gerbang Tol
						</h3>
						<p class="text-xs text-on-surface-variant mt-0.5">Pilih satu atau lebih gerbang tol yang akan dilalui. Tarif akan disesuaikan dengan Golongan Truk.</p>
					</div>
					<button onclick={() => showInternalTollModal = false} class="w-8 h-8 rounded-full bg-surface-container-lowest hover:bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors border border-surface-container/60 shadow-2xs flex-shrink-0 cursor-pointer">
						<span class="material-symbols-outlined text-lg">close</span>
					</button>
				</div>
				<div class="mt-3.5 space-y-2.5">
					<div class="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-surface-container/60 focus-within:ring-2 focus-within:ring-sky-500/20 focus-within:border-sky-500 transition-all">
						<span class="material-symbols-outlined text-on-surface-variant/70 text-[18px]">search</span>
						<input type="text" bind:value={internalTollSearch} placeholder="Cari ruas, asal, atau tujuan tol..." class="bg-transparent text-xs text-on-surface outline-none w-full border-0 placeholder:text-on-surface-variant/50 focus:ring-0" />
						{#if internalTollSearch}
							<button type="button" onclick={() => internalTollSearch = ''} class="text-on-surface-variant hover:text-on-surface text-sm font-bold w-5 h-5 flex items-center justify-center rounded-full bg-surface-container hover:bg-surface-container-high cursor-pointer">
								&times;
							</button>
						{/if}
					</div>

					<!-- Currently Selected Tolls Chips in Modal -->
					{#if selectedInternalTolls.length > 0}
						<div class="p-2.5 rounded-xl bg-surface-container-low border border-surface-container/60 flex flex-wrap items-center gap-1.5 max-h-24 overflow-y-auto">
							<span class="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mr-1 flex items-center gap-1">
								<span class="material-symbols-outlined text-[13px]">check_circle</span>
								{selectedInternalTolls.length} Dipilih:
							</span>
							{#each selectedInternalTolls as sId}
								{@const sGate = (data.gerbangTols || []).find((g: any) => g.id === sId)}
								{#if sGate}
									<span class="inline-flex items-center gap-1 bg-surface-container-lowest text-indigo-700 dark:text-indigo-300 px-2.5 py-0.5 rounded-lg font-semibold text-[10px] border border-surface-container/60 shadow-2xs">
										<span>{sGate.asal} &rarr; {sGate.tujuan}</span>
										<button type="button" onclick={() => toggleInternalToll(sId)} class="hover:text-rose-600 font-bold ml-0.5 cursor-pointer">&times;</button>
									</span>
								{/if}
							{/each}
							<button type="button" onclick={() => selectedInternalTolls = []} class="text-[10px] font-bold text-rose-600 hover:underline ml-1 cursor-pointer">
								Hapus Semua
							</button>
						</div>
					{/if}
				</div>
			</div>
			
			<!-- Scrollable Table Body -->
			<div class="p-0 overflow-y-auto overscroll-contain flex-1 bg-surface-container-lowest">
				<table class="w-full text-left text-xs">
					<thead class="bg-surface-container-low text-on-surface-variant sticky top-0 z-10 border-b border-surface-container/60 shadow-2xs">
						<tr>
							<th class="px-3.5 py-2.5 font-black uppercase tracking-wider text-[10px] w-12 text-center">Pilih</th>
							<th class="px-3.5 py-2.5 font-black uppercase tracking-wider text-[10px]">Ruas Tol</th>
							<th class="px-3.5 py-2.5 font-black uppercase tracking-wider text-[10px]">Gerbang Asal &rarr; Tujuan</th>
							<th class="px-3.5 py-2.5 font-black uppercase tracking-wider text-[10px] text-right">Tarif (Gol 2 & 3)</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-surface-container/60">
						{#each filteredInternalTolls as g}
							<tr 
								class="hover:bg-surface-container-low/60 transition-colors cursor-pointer {selectedInternalTolls.includes(g.id) ? 'bg-indigo-50/60 dark:bg-indigo-950/40 font-semibold' : ''} {recommendedTollIds.includes(g.id) && !selectedInternalTolls.includes(g.id) ? 'bg-amber-50/50 dark:bg-amber-950/30' : ''}"
								onclick={() => toggleInternalToll(g.id)}
							>
								<td class="px-3.5 py-2.5 text-center" onclick={(e) => e.stopPropagation()}>
									<input 
										type="checkbox" 
										checked={selectedInternalTolls.includes(g.id)} 
										onchange={() => toggleInternalToll(g.id)} 
										class="w-4 h-4 rounded border-surface-container text-indigo-600 focus:ring-indigo-500 cursor-pointer" 
									/>
								</td>
								<td class="px-3.5 py-2.5">
									<span class="font-bold text-on-surface text-xs flex items-center gap-1">
										{g.ruas}
										{#if recommendedTollIds.includes(g.id)}
											<span class="bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 text-[9px] px-1.5 py-0.5 rounded uppercase font-black" title="Sesuai Rute GPS">Disarankan</span>
										{/if}
									</span>
								</td>
								<td class="px-3.5 py-2.5">
									<div class="font-medium text-on-surface">{g.asal}</div>
									<div class="text-[10px] text-on-surface-variant/80">&rarr; {g.tujuan}</div>
								</td>
								<td class="px-3.5 py-2.5 text-right font-black text-indigo-700 dark:text-indigo-300 font-mono">
									{formatCurrency(parseFloat(g.tarif_gol_2_3))}
								</td>
							</tr>
						{:else}
							<tr>
								<td colspan="4" class="px-6 py-12 text-center text-on-surface-variant">
									<p class="font-medium">Gerbang tol tidak ditemukan.</p>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Sticky Footer with Real-time Toll & Solar Preview -->
			<div class="p-4 sm:p-5 border-t border-surface-container/60 bg-surface-container-lowest flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 flex-shrink-0">
				<div class="text-xs sm:text-sm font-bold text-on-surface-variant text-center sm:text-left">
					<span class="text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-1 rounded-md">{selectedInternalTolls.length}</span> Gerbang Dipilih
					{#if effectiveBiayaSolar > 0}
						<span class="ml-2 text-amber-700 dark:text-amber-400 text-xs font-semibold">
							&bull; Biaya Solar: {formatCurrency(effectiveBiayaSolar)} (~{effectiveLiterSolar.toFixed(1)} L)
						</span>
					{/if}
				</div>
				<button type="button" onclick={calculateInternalToll} class="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer">
					<span class="material-symbols-outlined text-[18px]">calculate</span>
					Terapkan Tarif ({selectedInternalTolls.length})
				</button>
			</div>
		</div>
	</div>
{/if}
