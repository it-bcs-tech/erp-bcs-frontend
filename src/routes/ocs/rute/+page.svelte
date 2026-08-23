<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';

	let { data, form } = $props<{ data: PageData, form: any }>();
	
	let isSubmitting = $state(false);
	let isCalculatingGPS = $state(false);
	let showModal = $state(false);

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

	let googleDistanceKm = $state(0);
	let biayaTol = $state(0);
	let rincianTolJSON = $state('[]');

	let showInternalTollModal = $state(false);
	let internalTollSearch = $state('');
	let selectedInternalTolls = $state<number[]>([]);
	let gpsTollInstructions = $state<string[]>([]);

	let recommendedTollIds = $derived.by(() => {
		if (gpsTollInstructions.length === 0) return [];
		const ids: number[] = [];
		const instructionText = gpsTollInstructions.join(' ').toLowerCase();
		for (const g of (data.gerbangTols || [])) {
			const ruas = g.ruas.toLowerCase();
			const asal = g.asal.toLowerCase();
			const tujuan = g.tujuan.toLowerCase();
			// Match if Google text mentions the ruas, asal, or tujuan
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
		// Sort recommended to top
		return list.slice().sort((a: any, b: any) => {
			const aRec = recommendedTollIds.includes(a.id);
			const bRec = recommendedTollIds.includes(b.id);
			if (aRec && !bRec) return -1;
			if (!aRec && bRec) return 1;
			return 0;
		});
	});

	function resetForm() {
		selectedOrigin = ''; originSearch = '';
		selectedDestination = ''; destSearch = '';
		selectedTipeUnit = ''; tipeUnitSearch = '';
		googleDistanceKm = 0;
		biayaTol = 0;
		rincianTolJSON = '[]';
		selectedInternalTolls = [];
		internalTollSearch = '';
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
				body: JSON.stringify({ origin_id: selectedOrigin, destination_id: selectedDestination })
			});
			const result = await res.json();
			if (result.success) {
				googleDistanceKm = result.distance_km;
				if (result.toll_fee > 0) {
					biayaTol = result.toll_fee;
					rincianTolJSON = '[]'; // Reset breakdown since it's an external GPS fee
				}
				if (result.toll_instructions) {
					gpsTollInstructions = result.toll_instructions;
				}
				if (result.message && (result.mock || result.toll_fee === 0)) {
					alert(result.message);
				}
			} else {
				alert(result.error || 'Gagal mengkalkulasi.');
			}
		} catch (error) {
			console.error(error);
			alert('Terjadi kesalahan pada server.');
		}
		isCalculatingGPS = false;
	}

	function calculateInternalToll() {
		if (!selectedTipeUnit) {
			alert('Pilih Tipe Unit Kendaraan terlebih dahulu untuk mengetahui Golongan Tol-nya.');
			showInternalTollModal = false;
			return;
		}
		
		const unit = data.tipeUnits.find((t: any) => t.id == selectedTipeUnit);
		const golongan = unit ? unit.golongan_tol : '2_3'; // default 2_3 if not found

		let total = 0;
		let details = [];
		
		for (const id of selectedInternalTolls) {
			const gate = data.gerbangTols.find((g: any) => g.id === id);
			if (gate) {
				let gateTarif = 0;
				if (golongan === '1') gateTarif = parseFloat(gate.tarif_gol_1);
				else if (golongan === '4_5') gateTarif = parseFloat(gate.tarif_gol_4_5);
				else gateTarif = parseFloat(gate.tarif_gol_2_3);

				total += gateTarif;
				details.push({ gerbang_tol_id: id, tarif: gateTarif });
			}
		}
		
		biayaTol = total;
		rincianTolJSON = JSON.stringify(details);
		showInternalTollModal = false;
	}

	$effect(() => {
		if (form?.success) {
			showModal = false;
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
		<button onclick={() => { resetForm(); showModal = true; }} class="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-xs flex items-center gap-2 hover:bg-blue-700 transition-colors cursor-pointer">
			<span class="material-symbols-outlined text-lg">add_road</span>
			<span>Tambah Rute UJO</span>
		</button>
	</header>

	{#if form?.error || form?.message}
		<div class="p-4 rounded-xl border {form.error ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'} flex items-center gap-3 shadow-xs">
			<span class="material-symbols-outlined">{form.error ? 'error' : 'check_circle'}</span>
			<p class="text-xs font-bold">{form.error || form.message}</p>
		</div>
	{/if}

	<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs flex-1">
		<div class="overflow-x-auto">
			<table class="w-full text-left text-sm min-w-[900px]">
				<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
					<tr>
						<th class="py-3.5 px-5">Rute (Origin &rarr; Dest)</th>
						<th class="py-3.5 px-5">Tipe Unit</th>
						<th class="py-3.5 px-5">Est. Jarak</th>
						<th class="py-3.5 px-5">Total Biaya Solar</th>
						<th class="py-3.5 px-5">Total Biaya Tol</th>
						<th class="py-3.5 px-5 text-blue-600">Total Pokok UJO</th>
						<th class="py-3.5 px-5 text-emerald-600">Tarif Customer</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
					{#if data.ruteList.length === 0}
						<tr>
							<td colspan="7" class="py-16 text-center text-on-surface-variant">
								<span class="material-symbols-outlined text-4xl mb-2 opacity-50 block">route</span>
								<p class="font-bold text-on-surface">Belum ada Master Rute yang dibuat.</p>
							</td>
						</tr>
					{:else}
						{#each data.ruteList as r}
							<tr class="hover:bg-surface-container transition-colors group cursor-pointer">
								<td class="py-4 px-5">
									<div class="font-bold text-on-surface">{r.origin_name} &rarr;</div>
									<div class="font-bold text-on-surface text-xs text-on-surface-variant mt-0.5">{r.destination_name}</div>
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
								<td class="py-4 px-5 font-medium text-on-surface">
									{formatCurrency(parseFloat(r.biaya_solar))}
								</td>
								<td class="py-4 px-5 font-medium text-on-surface">
									{formatCurrency(parseFloat(r.biaya_tol))}
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
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>

<!-- Create Modal -->
{#if showModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onclick={() => showModal = false}></div>
		
		<div class="relative w-full max-w-2xl bg-surface-container-lowest rounded-[24px] shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
			<div class="p-6 border-b border-surface-container">
				<div class="flex items-start justify-between">
					<div>
						<h3 class="text-xl font-bold text-on-surface">Buat Master Rute & UJO Baru</h3>
						<p class="text-xs text-on-surface-variant mt-1">Biaya Solar & Jarak akan dihitung otomatis oleh sistem.</p>
					</div>
					<button onclick={() => showModal = false} class="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors">
						<span class="material-symbols-outlined text-lg">close</span>
					</button>
				</div>
			</div>
			
			<form method="POST" action="?/createRute" use:enhance={() => { isSubmitting = true; return async ({ update }) => { await update(); isSubmitting = false; } }}>
				<div class="p-6 overflow-y-auto space-y-6">
					
					<!-- Route Info -->
					<div class="bg-surface-container-low p-5 rounded-2xl border border-surface-container space-y-4">
						<h4 class="text-xs font-black text-on-surface uppercase tracking-wider flex items-center gap-2">
							<span class="material-symbols-outlined text-sky-500 text-lg">route</span> Parameter Utama
						</h4>
						
						<div class="grid grid-cols-2 gap-4">
							<div class="relative">
								<label class="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Origin</label>
								<input type="hidden" name="origin_id" value={selectedOrigin} required />
								<input type="text" bind:value={originSearch} onfocus={() => showOriginDropdown = true} onblur={() => setTimeout(() => showOriginDropdown = false, 200)} placeholder="Cari Origin..." class="w-full px-4 py-2.5 rounded-xl bg-surface-container-lowest border border-surface-container focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none transition-all text-sm font-medium" autocomplete="off" />
								{#if showOriginDropdown}
									<ul class="absolute z-10 w-full mt-1 bg-surface-container-lowest border border-surface-container rounded-xl shadow-lg max-h-48 overflow-y-auto hide-scrollbar">
										{#each filteredOrigins as c}
											<!-- svelte-ignore a11y_click_events_have_key_events -->
											<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
											<li class="px-4 py-2 text-sm text-on-surface cursor-pointer hover:bg-surface-container-low transition-colors border-b border-surface-container last:border-0" onclick={() => { selectedOrigin = c.id; originSearch = c.name; showOriginDropdown = false; }}>
												{c.name}
											</li>
										{:else}
											<li class="px-4 py-3 text-center text-xs text-on-surface-variant">Tidak ditemukan</li>
										{/each}
									</ul>
								{/if}
							</div>
							<div class="relative">
								<label class="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Destination</label>
								<input type="hidden" name="destination_id" value={selectedDestination} required />
								<input type="text" bind:value={destSearch} onfocus={() => showDestDropdown = true} onblur={() => setTimeout(() => showDestDropdown = false, 200)} placeholder="Cari Destination..." class="w-full px-4 py-2.5 rounded-xl bg-surface-container-lowest border border-surface-container focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none transition-all text-sm font-medium" autocomplete="off" />
								{#if showDestDropdown}
									<ul class="absolute z-10 w-full mt-1 bg-surface-container-lowest border border-surface-container rounded-xl shadow-lg max-h-48 overflow-y-auto hide-scrollbar">
										{#each filteredDests as c}
											<!-- svelte-ignore a11y_click_events_have_key_events -->
											<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
											<li class="px-4 py-2 text-sm text-on-surface cursor-pointer hover:bg-surface-container-low transition-colors border-b border-surface-container last:border-0" onclick={() => { selectedDestination = c.id; destSearch = c.name; showDestDropdown = false; }}>
												{c.name}
											</li>
										{:else}
											<li class="px-4 py-3 text-center text-xs text-on-surface-variant">Tidak ditemukan</li>
										{/each}
									</ul>
								{/if}
							</div>
							<div class="col-span-2 relative">
								<label class="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Tipe Unit Kendaraan</label>
								<input type="hidden" name="tipe_unit_id" value={selectedTipeUnit} required />
								<input type="text" bind:value={tipeUnitSearch} onfocus={() => showTipeUnitDropdown = true} onblur={() => setTimeout(() => showTipeUnitDropdown = false, 200)} placeholder="Cari Tipe Truk..." class="w-full px-4 py-2.5 rounded-xl bg-surface-container-lowest border border-surface-container focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none transition-all text-sm font-medium" autocomplete="off" />
								{#if showTipeUnitDropdown}
									<ul class="absolute z-10 w-full mt-1 bg-surface-container-lowest border border-surface-container rounded-xl shadow-lg max-h-48 overflow-y-auto hide-scrollbar">
										{#each filteredTipeUnits as t}
											<!-- svelte-ignore a11y_click_events_have_key_events -->
											<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
											<li class="px-4 py-2 text-sm text-on-surface cursor-pointer hover:bg-surface-container-low transition-colors border-b border-surface-container last:border-0" onclick={() => { selectedTipeUnit = t.id; tipeUnitSearch = t.name; showTipeUnitDropdown = false; }}>
												{t.name}
											</li>
										{:else}
											<li class="px-4 py-3 text-center text-xs text-on-surface-variant">Tidak ditemukan</li>
										{/each}
									</ul>
								{/if}
							</div>
						</div>
					</div>

					<!-- UJO Components -->
					<div class="space-y-4">
						<div class="flex items-center justify-between">
							<h4 class="text-xs font-black text-on-surface uppercase tracking-wider flex items-center gap-2">
								<span class="material-symbols-outlined text-sky-500 text-lg">payments</span> Komponen UJO
							</h4>
							<div class="flex gap-2">
								<button type="button" onclick={() => showInternalTollModal = true} class="bg-indigo-100 text-indigo-800 hover:bg-indigo-200 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors shadow-sm border border-indigo-300">
									<span class="material-symbols-outlined text-[16px]">toll</span>
									Pilih Gerbang Tol Internal
								</button>
								<button type="button" onclick={calculateGPS} disabled={isCalculatingGPS} class="bg-amber-100 text-amber-800 hover:bg-amber-200 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50 border border-amber-300">
									{#if isCalculatingGPS}
										<span class="material-symbols-outlined animate-spin text-[16px]">refresh</span>
									{:else}
										<span class="material-symbols-outlined text-[16px]">satellite_alt</span>
									{/if}
									Auto Jarak via GPS
								</button>
							</div>
						</div>
						
						<input type="hidden" name="google_distance_km" value={googleDistanceKm} />
						<input type="hidden" name="rincian_tol_json" value={rincianTolJSON} />

						<div class="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-200 dark:border-blue-900/50 flex gap-3">
							<span class="material-symbols-outlined text-blue-600 dark:text-blue-400">info</span>
							<p class="text-xs text-blue-800 dark:text-blue-300 font-medium">
								Biaya Solar tidak diinput manual. Sistem akan menarik koordinat GPS Origin & Destination untuk menghitung jarak, lalu membaginya dengan standar rasio liter kendaraan dan mengalikannya dengan harga BBM nasional.
							</p>
						</div>

						<div class="grid grid-cols-2 gap-4">
							<div>
								<label class="block text-xs font-bold text-on-surface-variant mb-1 flex justify-between">
									Biaya Tol (Rp)
									{#if googleDistanceKm > 0}
										<span class="text-[10px] text-amber-600 font-bold bg-amber-50 px-1.5 rounded">{googleDistanceKm} KM</span>
									{/if}
								</label>
								<input type="number" name="biaya_tol" bind:value={biayaTol} min="0" placeholder="0" class="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-surface-container focus:border-sky-500 outline-none text-sm font-bold">
							</div>
							<div>
								<label class="block text-xs font-bold text-on-surface-variant mb-1">Bongkar Muat (Rp)</label>
								<input type="number" name="biaya_bongkar_muat" min="0" placeholder="0" class="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-surface-container focus:border-sky-500 outline-none text-sm font-bold">
							</div>
							<div>
								<label class="block text-xs font-bold text-on-surface-variant mb-1">Uang Makan (Rp)</label>
								<input type="number" name="uang_makan" min="0" placeholder="0" class="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-surface-container focus:border-sky-500 outline-none text-sm font-bold">
							</div>
							<div>
								<label class="block text-xs font-bold text-on-surface-variant mb-1">Retribusi (Rp)</label>
								<input type="number" name="retribusi" min="0" placeholder="0" class="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-surface-container focus:border-sky-500 outline-none text-sm font-bold">
							</div>
							<div>
								<label class="block text-xs font-bold text-on-surface-variant mb-1">Ritase / Bonus (Rp)</label>
								<input type="number" name="ritase" min="0" placeholder="0" class="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-surface-container focus:border-sky-500 outline-none text-sm font-bold">
							</div>
							<div>
								<label class="block text-xs font-bold text-on-surface-variant mb-1">Biaya Lain (Rp)</label>
								<input type="number" name="biaya_lain" min="0" placeholder="0" class="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-surface-container focus:border-sky-500 outline-none text-sm font-bold">
							</div>
						</div>
					</div>

					<div class="pt-4 border-t border-surface-container">
						<label class="block text-xs font-bold text-on-surface-variant mb-1 text-emerald-600">Tarif / Harga Jual per Trip ke Customer (Opsional)</label>
						<input type="number" name="tarif_customer" min="0" placeholder="Biarkan kosong jika kontrak Lump Sum" class="w-full px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-900/50 focus:border-emerald-500 outline-none text-sm font-bold text-emerald-700 dark:text-emerald-400">
					</div>
					
				</div>
				<div class="p-6 border-t border-surface-container bg-surface-container-lowest flex justify-end gap-3">
					<button type="button" onclick={() => showModal = false} class="px-5 py-2.5 rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container transition-colors">
						Batal
					</button>
					<button type="submit" disabled={isSubmitting} class="px-6 py-2.5 rounded-xl text-sm font-bold bg-sky-600 text-white hover:bg-sky-700 shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2">
						{#if isSubmitting}
							<span class="material-symbols-outlined animate-spin text-[18px]">refresh</span>
							Menyimpan...
						{:else}
							<span class="material-symbols-outlined text-[18px]">save</span>
							Simpan Master Rute
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Internal Toll Modal -->
{#if showInternalTollModal}
	<div class="fixed inset-0 z-[60] flex items-center justify-center p-4">
		<div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onclick={() => showInternalTollModal = false}></div>
		
		<div class="relative w-full max-w-3xl bg-surface-container-lowest rounded-[24px] shadow-2xl flex flex-col overflow-hidden max-h-[85vh]">
			<div class="p-6 border-b border-surface-container bg-indigo-50/50">
				<div class="flex items-start justify-between">
					<div>
						<h3 class="text-xl font-bold text-indigo-900 flex items-center gap-2">
							<span class="material-symbols-outlined">toll</span> Database Gerbang Tol
						</h3>
						<p class="text-xs text-indigo-700/70 mt-1">Pilih satu atau lebih gerbang tol yang akan dilalui. Tarif akan disesuaikan dengan Golongan Truk.</p>
					</div>
					<button onclick={() => showInternalTollModal = false} class="w-8 h-8 rounded-full bg-white hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors shadow-sm">
						<span class="material-symbols-outlined text-lg">close</span>
					</button>
				</div>
				<div class="mt-4">
					<div class="relative">
						<span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
						<input type="text" bind:value={internalTollSearch} placeholder="Cari ruas, asal, atau tujuan tol..." class="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-indigo-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-sm font-medium shadow-sm" />
					</div>
				</div>
			</div>
			
			<div class="p-0 overflow-y-auto flex-1 bg-surface-container-lowest">
				<table class="w-full text-left text-sm">
					<thead class="bg-surface-container-low text-on-surface-variant sticky top-0 z-10 shadow-sm">
						<tr>
							<th class="px-4 py-3 font-black uppercase tracking-wider text-[10px] w-12 text-center">Pilih</th>
							<th class="px-4 py-3 font-black uppercase tracking-wider text-[10px]">Ruas Tol</th>
							<th class="px-4 py-3 font-black uppercase tracking-wider text-[10px]">Gerbang Asal &rarr; Tujuan</th>
							<th class="px-4 py-3 font-black uppercase tracking-wider text-[10px] text-right">Tarif (Gol 2 & 3)</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-surface-container">
						{#each filteredInternalTolls as g}
							<tr class="hover:bg-indigo-50/30 transition-colors {recommendedTollIds.includes(g.id) ? 'bg-amber-50/50' : ''}">
								<td class="px-4 py-3 text-center">
									<input type="checkbox" bind:group={selectedInternalTolls} value={g.id} class="w-4 h-4 rounded border-surface-container text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
								</td>
								<td class="px-4 py-3">
									<span class="font-bold text-on-surface text-xs flex items-center gap-1">
										{g.ruas}
										{#if recommendedTollIds.includes(g.id)}
											<span class="bg-amber-100 text-amber-800 text-[9px] px-1.5 py-0.5 rounded uppercase font-black" title="Sesuai Rute GPS">Disarankan</span>
										{/if}
									</span>
								</td>
								<td class="px-4 py-3">
									<div class="font-medium text-on-surface">{g.asal}</div>
									<div class="text-[11px] text-on-surface-variant/80">&rarr; {g.tujuan}</div>
								</td>
								<td class="px-4 py-3 text-right font-black text-indigo-700">
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

			<div class="p-5 border-t border-surface-container bg-white flex justify-between items-center">
				<div class="text-sm font-bold text-on-surface-variant">
					<span class="text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">{selectedInternalTolls.length}</span> Gerbang Dipilih
				</div>
				<button type="button" onclick={calculateInternalToll} class="px-6 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-colors flex items-center gap-2">
					<span class="material-symbols-outlined text-[18px]">calculate</span>
					Terapkan Tarif ({selectedInternalTolls.length})
				</button>
			</div>
		</div>
	</div>
{/if}
