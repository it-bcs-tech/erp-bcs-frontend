<script lang="ts">
	import { enhance } from '$app/forms';
	import Pagination from '$lib/components/Pagination.svelte';

	let { data } = $props();

	let activeTab = $state<'CARPOOL' | 'SPD' | 'MASTER'>('CARPOOL');
	let searchQuery = $state('');
	let statusFilter = $state('All');
	let cityFilter = $state('All');

	let isCreateCarpoolOpen = $state(false);
	let isCreateSpdOpen = $state(false);
	let isCreateCarOpen = $state(false);
	let isCreateSpdRateOpen = $state(false);

	let selectedCarpool = $state<any>(null);
	let selectedSpd = $state<any>(null);

	function formatRupiah(amount: number | string | null) {
		const num = typeof amount === 'string' ? parseFloat(amount) : (amount || 0);
		return new Intl.NumberFormat('id-ID', {
			style: 'currency',
			currency: 'IDR',
			maximumFractionDigits: 0
		}).format(num);
	}

	function formatDate(d: string | null) {
		if (!d) return '-';
		return new Date(d).toLocaleDateString('id-ID', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}

	function getStatusBadge(status: string, rawStatus?: string) {
		if (status === 'APPROVED' || rawStatus === 'APPROVE GA') {
			return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800';
		}
		if (status === 'APPROVED_AP' || rawStatus === 'APPROVE AP') {
			return 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800';
		}
		if (status === 'REJECTED') {
			return 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800';
		}
		return 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800';
	}

	// Filtered Carpools
	const filteredCarpools = $derived(
		data.carpools.filter((c: any) => {
			const q = searchQuery.toLowerCase();
			const matchQ =
				!q ||
				c.carpool_number?.toLowerCase().includes(q) ||
				c.requester_name?.toLowerCase().includes(q) ||
				c.destination?.toLowerCase().includes(q) ||
				c.department?.toLowerCase().includes(q) ||
				c.police_number?.toLowerCase().includes(q) ||
				c.description?.toLowerCase().includes(q);
			const matchStatus = statusFilter === 'All' || c.status === statusFilter;
			const matchCity = cityFilter === 'All' || c.city_type === cityFilter;
			return matchQ && matchStatus && matchCity;
		})
	);

	// Filtered SPDs
	const filteredSpds = $derived(
		data.spds.filter((s: any) => {
			const q = searchQuery.toLowerCase();
			const matchQ =
				!q ||
				s.spd_number?.toLowerCase().includes(q) ||
				s.requester_name?.toLowerCase().includes(q) ||
				s.destination?.toLowerCase().includes(q) ||
				s.department?.toLowerCase().includes(q) ||
				s.reason?.toLowerCase().includes(q) ||
				s.description?.toLowerCase().includes(q);
			const matchStatus = statusFilter === 'All' || s.status === statusFilter;
			return matchQ && matchStatus;
		})
	);

	// Filtered SPD Rates
	const filteredSpdRates = $derived(
		data.spdRates.filter((r: any) => {
			const q = searchQuery.toLowerCase();
			return (
				!q ||
				r.city?.toLowerCase().includes(q) ||
				r.job_level?.toLowerCase().includes(q) ||
				r.budget_name?.toLowerCase().includes(q)
			);
		})
	);

	// Pagination states
	let cpPage = $state(1);
	const perPage = 15;
	const totalCpPages = $derived(Math.max(1, Math.ceil(filteredCarpools.length / perPage)));
	const paginatedCarpools = $derived(filteredCarpools.slice((cpPage - 1) * perPage, cpPage * perPage));

	let spdPage = $state(1);
	const totalSpdPages = $derived(Math.max(1, Math.ceil(filteredSpds.length / perPage)));
	const paginatedSpds = $derived(filteredSpds.slice((spdPage - 1) * perPage, spdPage * perPage));

	let ratePage = $state(1);
	const ratePerPage = 10;
	const totalRatePages = $derived(Math.max(1, Math.ceil(filteredSpdRates.length / ratePerPage)));
	const paginatedSpdRates = $derived(filteredSpdRates.slice((ratePage - 1) * ratePerPage, ratePage * ratePerPage));

	$effect(() => {
		const _ = [searchQuery, statusFilter, cityFilter];
		cpPage = 1;
		spdPage = 1;
		ratePage = 1;
	});
</script>

<svelte:head>
	<title>Carpool & Travel (SPD) | General Affair | ERP BCS</title>
</svelte:head>

<div class="space-y-6">
	<!-- Page Header -->
	<div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/60 dark:border-slate-800/60 pb-5">
		<div>
			<div class="flex items-center gap-2 text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest mb-1">
				<span class="material-symbols-outlined text-sm">commute</span>
				<span>General Affair • Mobilitas & Perjalanan Dinas</span>
			</div>
			<h1 class="text-3xl font-black text-on-surface tracking-tight">Carpool & Travel (SPD)</h1>
			<p class="text-xs text-on-surface-variant mt-1">
				Pusat kendali peminjaman kendaraan operasional GA (Carpool), persetujuan Surat Perjalanan Dinas (SPD), serta matriks tarif BBM, Tol, dan Uang Makan.
			</p>
		</div>

		<div class="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
			<button
				onclick={() => (isCreateCarpoolOpen = true)}
				class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
			>
				<span class="material-symbols-outlined text-base">directions_car</span>
				<span>+ Pengajuan Carpool</span>
			</button>
			<button
				onclick={() => (isCreateSpdOpen = true)}
				class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
			>
				<span class="material-symbols-outlined text-base">flight_takeoff</span>
				<span>+ Pengajuan SPD</span>
			</button>
		</div>
	</div>

	<!-- KPI Summary Cards -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70">
			<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Transaksi Carpool</span>
			<div class="text-2xl font-black text-on-surface mt-1">
				{data.stats.totalCarpool.toLocaleString('id-ID')} <span class="text-sm font-normal text-on-surface-variant">perjalanan</span>
			</div>
			<p class="text-[11px] text-cyan-600 font-semibold mt-1">
				{data.stats.approvedCarpool.toLocaleString('id-ID')} disetujui GA • {data.stats.pendingCarpool} menunggu
			</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70">
			<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Perjalanan Dinas (SPD)</span>
			<div class="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
				{data.stats.totalSpd.toLocaleString('id-ID')} <span class="text-sm font-normal text-on-surface-variant">dokumen SPD</span>
			</div>
			<p class="text-[11px] text-indigo-600 font-semibold mt-1">
				{data.stats.approvedSpd.toLocaleString('id-ID')} disetujui GA • {data.stats.pendingSpd} menunggu
			</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70">
			<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Armada Operasional GA</span>
			<div class="text-2xl font-black text-emerald-600 mt-1">
				{data.stats.totalCars} <span class="text-sm font-normal text-on-surface-variant">unit terdaftar</span>
			</div>
			<p class="text-[11px] text-on-surface-variant mt-1">
				Mobil R4, Motor R2, Ambulance & Voucher Online
			</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70">
			<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Matriks Plafon & Rute</span>
			<div class="text-2xl font-black text-amber-600 mt-1">
				{data.spdRates.length} <span class="text-sm font-normal text-on-surface-variant">tarif SPD</span>
			</div>
			<p class="text-[11px] text-on-surface-variant mt-1">
				{data.destinations.length} rute tujuan • {data.mealRates.length} tarif uang makan
			</p>
		</div>
	</div>

	<!-- Main 3-Tab Switcher -->
	<div class="flex flex-wrap items-center gap-2 border-b border-slate-200/60 dark:border-slate-800/60 pb-2">
		<button
			onclick={() => { activeTab = 'CARPOOL'; statusFilter = 'All'; }}
			class="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer {activeTab === 'CARPOOL'
				? 'bg-cyan-600 text-white shadow-xs'
				: 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'}"
		>
			<span class="material-symbols-outlined text-[17px]">directions_car</span>
			<span>Peminjaman Kendaraan / Carpool ({data.stats.totalCarpool.toLocaleString('id-ID')})</span>
		</button>

		<button
			onclick={() => { activeTab = 'SPD'; statusFilter = 'All'; }}
			class="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer {activeTab === 'SPD'
				? 'bg-indigo-600 text-white shadow-xs'
				: 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'}"
		>
			<span class="material-symbols-outlined text-[17px]">flight_takeoff</span>
			<span>Surat Perjalanan Dinas / SPD ({data.stats.totalSpd.toLocaleString('id-ID')})</span>
		</button>

		<button
			onclick={() => { activeTab = 'MASTER'; }}
			class="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer {activeTab === 'MASTER'
				? 'bg-emerald-600 text-white shadow-xs'
				: 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'}"
		>
			<span class="material-symbols-outlined text-[17px]">tune</span>
			<span>Master Mobil GA & Matriks Tarif ({data.cars.length} Unit • {data.spdRates.length} Tarif)</span>
		</button>
	</div>

	<!-- ======================================================================= -->
	<!-- TAB 1: CARPOOL -->
	<!-- ======================================================================= -->
	{#if activeTab === 'CARPOOL'}
		<div class="flex flex-col md:flex-row gap-3 items-center justify-between p-4 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 shadow-2xs">
			<div class="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-surface-container-low w-full md:w-80 focus-within:ring-2 focus-within:ring-cyan-500/20 transition-all">
				<span class="material-symbols-outlined text-on-surface-variant text-[18px]">search</span>
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Cari No. Carpool, pemohon, tujuan, nopol..."
					class="bg-transparent text-xs text-on-surface border-0 outline-none w-full placeholder:text-on-surface-variant/50 focus:ring-0"
				/>
			</div>

			<div class="flex flex-wrap items-center gap-2 w-full md:w-auto">
				<select
					bind:value={cityFilter}
					class="px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20 text-xs text-on-surface font-medium cursor-pointer"
				>
					<option value="All">Semua Area (Dalam/Luar Kota)</option>
					<option value="Dalam Kota">Dalam Kota</option>
					<option value="Luar Kota">Luar Kota</option>
				</select>

				<select
					bind:value={statusFilter}
					class="px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20 text-xs text-on-surface font-medium cursor-pointer"
				>
					<option value="All">Semua Status</option>
					<option value="PENDING">OPEN / POST (Menunggu Atasan)</option>
					<option value="APPROVED_AP">APPROVE AP (Menunggu GA)</option>
					<option value="APPROVED">APPROVE GA (Disetujui)</option>
					<option value="REJECTED">REJECTED / CANCEL</option>
				</select>
			</div>
		</div>

		<div class="rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 shadow-2xs overflow-hidden">
			<div class="overflow-x-auto">
				<table class="w-full text-left text-xs">
					<thead class="bg-surface-container-low text-on-surface-variant uppercase text-[10px] font-bold tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
						<tr>
							<th class="py-3 px-4">No. Transaksi & Tanggal</th>
							<th class="py-3 px-4">Pemohon & Departemen</th>
							<th class="py-3 px-4">Tujuan & Keperluan</th>
							<th class="py-3 px-4">Kendaraan GA</th>
							<th class="py-3 px-4 text-center">Jam & KM</th>
							<th class="py-3 px-4 text-center">Penumpang</th>
							<th class="py-3 px-4 text-center">Status</th>
							<th class="py-3 px-4 text-center">Aksi</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
						{#each paginatedCarpools as cp (cp.id)}
							<tr class="hover:bg-surface-container transition-colors">
								<td class="py-3 px-4 whitespace-nowrap">
									<div class="font-mono font-bold text-on-surface">{cp.carpool_number}</div>
									<div class="text-[10px] text-on-surface-variant">{formatDate(cp.use_date)}</div>
								</td>
								<td class="py-3 px-4">
									<div class="font-bold text-on-surface">{cp.requester_name}</div>
									<div class="text-[10px] text-on-surface-variant">{cp.department} {cp.requester_nik ? `(${cp.requester_nik})` : ''}</div>
								</td>
								<td class="py-3 px-4 max-w-xs">
									<div class="font-semibold text-on-surface flex items-center gap-1.5">
										<span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan-50 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300">{cp.city_type || 'Dalam Kota'}</span>
										<span class="truncate">{cp.destination}</span>
									</div>
									{#if cp.description || cp.reason}
										<p class="text-[11px] text-on-surface-variant line-clamp-1 mt-0.5">{cp.description || cp.reason}</p>
									{/if}
								</td>
								<td class="py-3 px-4 whitespace-nowrap">
									{#if cp.police_number}
										<div class="font-bold text-on-surface">{cp.car_name}</div>
										<div class="text-[10px] font-mono text-cyan-600 font-bold">{cp.police_number}</div>
									{:else}
										<span class="text-[11px] text-on-surface-variant italic">Belum ditentukan</span>
									{/if}
								</td>
								<td class="py-3 px-4 text-center whitespace-nowrap font-mono text-[11px]">
									<div>{cp.time_start || '08:00'} - {cp.time_end || '17:00'}</div>
									{#if cp.km_start > 0 || cp.km_end > 0}
										<div class="text-[10px] text-on-surface-variant">KM: {cp.km_start} → {cp.km_end}</div>
									{/if}
								</td>
								<td class="py-3 px-4 text-center whitespace-nowrap">
									<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-container-high text-on-surface">
										{Math.max(cp.passenger_count || 1, cp.passengers?.length || 0)} org
									</span>
								</td>
								<td class="py-3 px-4 text-center whitespace-nowrap">
									<span class="px-2.5 py-0.5 rounded-md text-[10px] font-bold {getStatusBadge(cp.status, cp.raw_status)}">
										{cp.raw_status || cp.status}
									</span>
								</td>
								<td class="py-3 px-4 text-center whitespace-nowrap">
									<button
										onclick={() => (selectedCarpool = cp)}
										class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container-high hover:bg-cyan-50 dark:hover:bg-cyan-950/40 text-on-surface hover:text-cyan-700 text-[11px] font-bold transition-colors cursor-pointer"
									>
										<span class="material-symbols-outlined text-[14px]">visibility</span>
										<span>Detail / Review</span>
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<Pagination
				currentPage={cpPage}
				totalPages={totalCpPages}
				totalItems={filteredCarpools.length}
				perPage={perPage}
				itemLabel="transaksi carpool (500 terbaru)"
				onPageChange={(p) => (cpPage = p)}
			/>
		</div>
	{/if}

	<!-- ======================================================================= -->
	<!-- TAB 2: SURAT PERJALANAN DINAS (SPD) -->
	<!-- ======================================================================= -->
	{#if activeTab === 'SPD'}
		<div class="flex flex-col md:flex-row gap-3 items-center justify-between p-4 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 shadow-2xs">
			<div class="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-surface-container-low w-full md:w-80 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
				<span class="material-symbols-outlined text-on-surface-variant text-[18px]">search</span>
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Cari No. SPD, nama karyawan, kota tujuan..."
					class="bg-transparent text-xs text-on-surface border-0 outline-none w-full placeholder:text-on-surface-variant/50 focus:ring-0"
				/>
			</div>

			<div class="flex flex-wrap items-center gap-2 w-full md:w-auto">
				<select
					bind:value={statusFilter}
					class="px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-indigo-500/20 text-xs text-on-surface font-medium cursor-pointer"
				>
					<option value="All">Semua Status SPD</option>
					<option value="PENDING">OPEN / POST (Menunggu Atasan)</option>
					<option value="APPROVED_AP">APPROVE AP (Menunggu GA)</option>
					<option value="APPROVED">APPROVE GA (Disetujui)</option>
					<option value="REJECTED">REJECTED / CANCEL</option>
				</select>
			</div>
		</div>

		<div class="rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 shadow-2xs overflow-hidden">
			<div class="overflow-x-auto">
				<table class="w-full text-left text-xs">
					<thead class="bg-surface-container-low text-on-surface-variant uppercase text-[10px] font-bold tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
						<tr>
							<th class="py-3 px-4">No. SPD & Tanggal</th>
							<th class="py-3 px-4">Pemohon & Departemen</th>
							<th class="py-3 px-4">Kota Tujuan & Keperluan</th>
							<th class="py-3 px-4">Fasilitas & Menginap</th>
							<th class="py-3 px-4 text-center">Peserta</th>
							<th class="py-3 px-4 text-center">Status</th>
							<th class="py-3 px-4 text-center">Aksi</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
						{#each paginatedSpds as spd (spd.id)}
							<tr class="hover:bg-surface-container transition-colors">
								<td class="py-3 px-4 whitespace-nowrap">
									<div class="font-mono font-bold text-on-surface">{spd.spd_number}</div>
									<div class="text-[10px] text-on-surface-variant">
										{formatDate(spd.start_date)} {spd.end_date && spd.end_date !== spd.start_date ? `→ ${formatDate(spd.end_date)}` : ''}
									</div>
								</td>
								<td class="py-3 px-4">
									<div class="font-bold text-on-surface">{spd.requester_name}</div>
									<div class="text-[10px] text-on-surface-variant">{spd.department} {spd.requester_nik ? `(${spd.requester_nik})` : ''}</div>
								</td>
								<td class="py-3 px-4 max-w-xs">
									<div class="font-bold text-indigo-600 dark:text-indigo-400 uppercase">{spd.destination}</div>
									<p class="text-[11px] text-on-surface-variant line-clamp-1">{spd.reason || ''} {spd.description ? `— ${spd.description}` : ''}</p>
								</td>
								<td class="py-3 px-4">
									<div class="font-semibold text-on-surface">{spd.facility_desc || 'Perusahaan Tidak Menginap'}</div>
									<span class="text-[10px] text-on-surface-variant">
										{spd.is_overnight === 2 ? 'Menginap' : 'Tanpa Menginap'}
									</span>
								</td>
								<td class="py-3 px-4 text-center whitespace-nowrap">
									<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
										{Math.max(1, spd.participants?.length || 1)} peserta
									</span>
								</td>
								<td class="py-3 px-4 text-center whitespace-nowrap">
									<span class="px-2.5 py-0.5 rounded-md text-[10px] font-bold {getStatusBadge(spd.status, spd.raw_status)}">
										{spd.raw_status || spd.status}
									</span>
								</td>
								<td class="py-3 px-4 text-center whitespace-nowrap">
									<button
										onclick={() => (selectedSpd = spd)}
										class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container-high hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-on-surface hover:text-indigo-700 text-[11px] font-bold transition-colors cursor-pointer"
									>
										<span class="material-symbols-outlined text-[14px]">visibility</span>
										<span>Detail / Review</span>
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<Pagination
				currentPage={spdPage}
				totalPages={totalSpdPages}
				totalItems={filteredSpds.length}
				perPage={perPage}
				itemLabel="dokumen SPD (500 terbaru)"
				onPageChange={(p) => (spdPage = p)}
			/>
		</div>
	{/if}

	<!-- ======================================================================= -->
	<!-- TAB 3: MASTER MOBIL GA & MATRIKS TARIF PERJALANAN -->
	<!-- ======================================================================= -->
	{#if activeTab === 'MASTER'}
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
			<!-- Card 1: Master Kendaraan Operasional GA (car) -->
			<div class="rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 shadow-2xs overflow-hidden flex flex-col">
				<div class="p-4 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between gap-2">
					<div>
						<h3 class="font-bold text-sm text-on-surface">Master Kendaraan & Moda Transportasi Carpool ({data.cars.length})</h3>
						<p class="text-[11px] text-on-surface-variant">9 Unit Kendaraan Fisik terintegrasi dengan Master Assets + 4 Opsi Moda Online/Pribadi</p>
					</div>
					<div class="flex items-center gap-2">
						<a
							href="/ga/assets"
							class="px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-bold border border-slate-200 dark:border-slate-800"
						>
							Kelola Aset &rarr;
						</a>
						<button
							onclick={() => (isCreateCarOpen = true)}
							class="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold cursor-pointer"
						>
							+ Tambah Unit
						</button>
					</div>
				</div>
				<div class="overflow-x-auto">
					<table class="w-full text-left text-xs">
						<thead class="bg-surface-container-low text-on-surface-variant uppercase text-[10px] font-bold">
							<tr>
								<th class="py-2.5 px-4">ID</th>
								<th class="py-2.5 px-4">Nama Kendaraan</th>
								<th class="py-2.5 px-4">Nopol / Moda</th>
								<th class="py-2.5 px-4">Tipe</th>
								<th class="py-2.5 px-4 text-right">Rasio KM/L</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
							{#each data.cars as c (c.id)}
								{@const isNonAsset = /go\s*-\s*car|go\s*-\s*jeg|go\s*-\s*jek|pribadi/i.test(String(c.police_number || ''))}
								<tr>
									<td class="py-2.5 px-4 font-mono text-on-surface-variant">#{c.id}</td>
									<td class="py-2.5 px-4">
										<div class="font-bold text-on-surface">{c.car_name}</div>
										<div class="text-[10px] text-on-surface-variant">{c.car_group || '-'} • {c.car_user || 'GA'}</div>
									</td>
									<td class="py-2.5 px-4 font-mono font-bold text-cyan-600">{c.police_number}</td>
									<td class="py-2.5 px-4">
										{#if isNonAsset}
											<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200">
												Moda Online/Pribadi
											</span>
										{:else}
											<a href="/ga/assets" class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 hover:underline">
												Aset Tetap GA
											</a>
										{/if}
									</td>
									<td class="py-2.5 px-4 text-right font-mono">{c.km_per_liter} km/L ({c.fuel_name || 'Pertalite'})</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>

			<!-- Card 2: Rute Tujuan, Jarak KM & Biaya Tol (tujuan) + Harga BBM (bbm) -->
			<div class="space-y-6">
				<div class="rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 shadow-2xs overflow-hidden">
					<div class="p-4 border-b border-slate-200/60 dark:border-slate-800/60">
						<h3 class="font-bold text-sm text-on-surface">Master Rute Jarak & Biaya Tol ({data.destinations.length})</h3>
						<p class="text-[11px] text-on-surface-variant">Standar jarak tempuh KM1/KM2 dan plafon tol perjalanan GA</p>
					</div>
					<div class="overflow-x-auto">
						<table class="w-full text-left text-xs">
							<thead class="bg-surface-container-low text-on-surface-variant uppercase text-[10px] font-bold">
								<tr>
									<th class="py-2.5 px-4">Asal → Tujuan</th>
									<th class="py-2.5 px-4">Region</th>
									<th class="py-2.5 px-4 text-center">Jarak (KM)</th>
									<th class="py-2.5 px-4 text-right">Biaya Tol</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
								{#each data.destinations as dst (dst.id)}
									<tr>
										<td class="py-2 px-4 font-bold text-on-surface">{dst.origin} → {dst.destination_name}</td>
										<td class="py-2 px-4 text-on-surface-variant">{dst.region}</td>
										<td class="py-2 px-4 text-center font-mono">{dst.km_min} - {dst.km_max} km</td>
										<td class="py-2 px-4 text-right font-mono font-bold text-emerald-600">{formatRupiah(dst.toll_cost)}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>

				<div class="rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 shadow-2xs overflow-hidden">
					<div class="p-4 border-b border-slate-200/60 dark:border-slate-800/60">
						<h3 class="font-bold text-sm text-on-surface">Master Harga BBM ({data.fuelPrices.length}) & Uang Makan ({data.mealRates.length})</h3>
					</div>
					<div class="p-4 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
						{#each data.fuelPrices as fp (fp.id)}
							<div class="p-3 rounded-xl bg-surface-container-low">
								<div class="text-[10px] font-bold text-on-surface-variant uppercase">{fp.fuel_name}</div>
								<div class="font-mono font-black text-sm text-on-surface mt-0.5">{formatRupiah(fp.price_per_liter)}<span class="text-[10px] font-normal">/L</span></div>
							</div>
						{/each}
					</div>
				</div>
			</div>
		</div>

		<!-- Card 3: Matriks Plafon Biaya SPD GA (spd_ga - 123 baris) -->
		<div class="rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 shadow-2xs overflow-hidden">
			<div class="p-4 border-b border-slate-200/60 dark:border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
				<div>
					<h3 class="font-bold text-sm text-on-surface">Matriks Plafon Biaya SPD GA per Kota & Level Jabatan ({data.spdRates.length})</h3>
					<p class="text-[11px] text-on-surface-variant">Referensi plafon anggaran makan, penginapan, BBM, dan transportasi berdasarkan kota & level</p>
				</div>
				<div class="flex items-center gap-2">
					<input
						type="text"
						bind:value={searchQuery}
						placeholder="Filter kota / level..."
						class="px-3.5 py-2 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-on-surface"
					/>
					<button
						onclick={() => (isCreateSpdRateOpen = true)}
						class="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer whitespace-nowrap"
					>
						+ Tarif SPD
					</button>
				</div>
			</div>

			<div class="overflow-x-auto">
				<table class="w-full text-left text-xs">
					<thead class="bg-surface-container-low text-on-surface-variant uppercase text-[10px] font-bold">
						<tr>
							<th class="py-2.5 px-4">ID</th>
							<th class="py-2.5 px-4">Kota / Area Tujuan</th>
							<th class="py-2.5 px-4">Level Jabatan</th>
							<th class="py-2.5 px-4">Komponen Anggaran</th>
							<th class="py-2.5 px-4">Jenis Fasilitas</th>
							<th class="py-2.5 px-4 text-right">Plafon Biaya (Rp)</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
						{#each paginatedSpdRates as sr (sr.id)}
							<tr>
								<td class="py-2.5 px-4 font-mono text-on-surface-variant">#{sr.id}</td>
								<td class="py-2.5 px-4 font-bold text-on-surface uppercase">{sr.city}</td>
								<td class="py-2.5 px-4 font-semibold text-indigo-600 dark:text-indigo-400">{sr.job_level}</td>
								<td class="py-2.5 px-4 font-medium text-on-surface">{sr.budget_name || `Anggaran #${sr.budget_id}`}</td>
								<td class="py-2.5 px-4 text-on-surface-variant">{sr.facility_desc || '-'}</td>
								<td class="py-2.5 px-4 text-right font-mono font-bold text-emerald-600">{formatRupiah(sr.cost_amount)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<Pagination
				currentPage={ratePage}
				totalPages={totalRatePages}
				totalItems={filteredSpdRates.length}
				perPage={ratePerPage}
				itemLabel="matriks tarif SPD"
				onPageChange={(p) => (ratePage = p)}
			/>
		</div>
	{/if}
</div>

<!-- MODAL: DETAIL & REVIEW CARPOOL -->
{#if selectedCarpool}
	<div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
		<div class="bg-surface-container-lowest rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-xl overflow-hidden">
			<div class="p-5 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
				<div>
					<div class="text-[11px] font-mono font-bold text-cyan-600">{selectedCarpool.carpool_number}</div>
					<h3 class="font-bold text-base text-on-surface">Detail & Persetujuan Carpool GA</h3>
				</div>
				<button onclick={() => (selectedCarpool = null)} class="text-on-surface-variant hover:text-on-surface cursor-pointer">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<div class="p-6 space-y-4 text-xs">
				<div class="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-surface-container-low">
					<div>
						<span class="text-[10px] font-bold text-on-surface-variant uppercase block">Pemohon</span>
						<span class="font-bold text-on-surface">{selectedCarpool.requester_name}</span>
						<span class="block text-[10px] text-on-surface-variant">{selectedCarpool.department}</span>
					</div>
					<div>
						<span class="text-[10px] font-bold text-on-surface-variant uppercase block">Tanggal & Jam</span>
						<span class="font-bold text-on-surface">{formatDate(selectedCarpool.use_date)}</span>
						<span class="block font-mono text-[10px] text-on-surface-variant">{selectedCarpool.time_start} - {selectedCarpool.time_end}</span>
					</div>
					<div>
						<span class="text-[10px] font-bold text-on-surface-variant uppercase block">Tujuan ({selectedCarpool.city_type})</span>
						<span class="font-bold text-on-surface">{selectedCarpool.destination}</span>
					</div>
					<div>
						<span class="text-[10px] font-bold text-on-surface-variant uppercase block">Status Saat Ini</span>
						<span class="px-2 py-0.5 rounded text-[10px] font-bold {getStatusBadge(selectedCarpool.status, selectedCarpool.raw_status)}">{selectedCarpool.raw_status || selectedCarpool.status}</span>
					</div>
				</div>

				{#if selectedCarpool.description || selectedCarpool.reason}
					<div class="p-3 rounded-xl bg-surface-container-low">
						<span class="text-[10px] font-bold text-on-surface-variant uppercase block mb-1">Keterangan / Keperluan</span>
						<p class="text-on-surface">{selectedCarpool.description || selectedCarpool.reason}</p>
					</div>
				{/if}

				<!-- Daftar Penumpang -->
				<div class="p-3.5 rounded-xl bg-surface-container-low space-y-2">
					<span class="text-[10px] font-bold text-on-surface-variant uppercase block">Daftar Penumpang ({selectedCarpool.passengers?.length || 0})</span>
					{#if selectedCarpool.passengers && selectedCarpool.passengers.length > 0}
						<div class="flex flex-wrap gap-1.5">
							{#each selectedCarpool.passengers as p (p.id)}
								<span class="px-2.5 py-1 rounded-lg bg-surface-container-lowest text-on-surface font-semibold text-[11px]">
									{p.passenger_name} {p.passenger_nik && p.passenger_nik !== p.passenger_name ? `(${p.passenger_nik})` : ''}
								</span>
							{/each}
						</div>
					{:else}
						<p class="text-[11px] text-on-surface-variant italic">Hanya pemohon utama ({selectedCarpool.passenger_count || 1} orang)</p>
					{/if}
				</div>

				<!-- Form Review & Penugasan Mobil GA -->
				<form
					method="POST"
					action="?/approveCarpool"
					use:enhance={() => {
						return async ({ result, update }) => {
							await update();
							if (result.type === 'success') selectedCarpool = null;
						};
					}}
					class="space-y-3 pt-2 border-t border-slate-200/60 dark:border-slate-800/60"
				>
					<input type="hidden" name="id" value={selectedCarpool.id} />
					<div class="grid grid-cols-2 gap-3">
						<div>
							<label for="cp_car_id" class="block text-[11px] font-bold text-on-surface mb-1">Pilih Unit Kendaraan GA</label>
							<select
								id="cp_car_id"
								name="car_id"
								value={selectedCarpool.car_id || ''}
								class="w-full px-3 py-2 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20 text-xs text-on-surface"
							>
								<option value="">-- Pilih Mobil GA --</option>
								{#each data.cars as car (car.id)}
									<option value={car.id}>{car.car_name} — {car.police_number}</option>
								{/each}
							</select>
						</div>
						<div>
							<label for="cp_driver" class="block text-[11px] font-bold text-on-surface mb-1">Driver / Keterangan Trip</label>
							<input
								id="cp_driver"
								type="text"
								name="driver_name"
								value={selectedCarpool.driver_name || ''}
								placeholder="Nama Driver / Lepas Kunci"
								class="w-full px-3 py-2 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20 text-xs text-on-surface"
							/>
						</div>
					</div>
					<div class="grid grid-cols-2 gap-3">
						<div>
							<label for="cp_km_start" class="block text-[11px] font-bold text-on-surface mb-1">KM Awal</label>
							<input
								id="cp_km_start"
								type="number"
								name="km_start"
								value={selectedCarpool.km_start || 0}
								class="w-full px-3 py-2 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20 text-xs font-mono text-on-surface"
							/>
						</div>
						<div>
							<label for="cp_km_end" class="block text-[11px] font-bold text-on-surface mb-1">KM Akhir</label>
							<input
								id="cp_km_end"
								type="number"
								name="km_end"
								value={selectedCarpool.km_end || 0}
								class="w-full px-3 py-2 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20 text-xs font-mono text-on-surface"
							/>
						</div>
					</div>

					<div class="flex items-center justify-between pt-3">
						<button
							type="submit"
							formaction="?/rejectCarpool"
							class="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs cursor-pointer"
						>
							Tolak Carpool
						</button>
						<div class="flex items-center gap-2">
							<button
								type="button"
								onclick={() => (selectedCarpool = null)}
								class="px-4 py-2 rounded-xl bg-surface-container-low font-bold text-xs text-on-surface cursor-pointer"
							>
								Tutup
							</button>
							<button
								type="submit"
								class="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs cursor-pointer"
							>
								Setujui & Simpan (APPROVE GA)
							</button>
						</div>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}

<!-- MODAL: DETAIL & REVIEW SPD -->
{#if selectedSpd}
	<div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
		<div class="bg-surface-container-lowest rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-xl overflow-hidden">
			<div class="p-5 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
				<div>
					<div class="text-[11px] font-mono font-bold text-indigo-600">{selectedSpd.spd_number}</div>
					<h3 class="font-bold text-base text-on-surface">Detail Surat Perjalanan Dinas (SPD)</h3>
				</div>
				<button onclick={() => (selectedSpd = null)} class="text-on-surface-variant hover:text-on-surface cursor-pointer">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<div class="p-6 space-y-4 text-xs">
				<div class="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-surface-container-low">
					<div>
						<span class="text-[10px] font-bold text-on-surface-variant uppercase block">Pemohon</span>
						<span class="font-bold text-on-surface">{selectedSpd.requester_name}</span>
						<span class="block text-[10px] text-on-surface-variant">{selectedSpd.department}</span>
					</div>
					<div>
						<span class="text-[10px] font-bold text-on-surface-variant uppercase block">Tanggal Dinas</span>
						<span class="font-bold text-on-surface">{formatDate(selectedSpd.start_date)} → {formatDate(selectedSpd.end_date)}</span>
					</div>
					<div>
						<span class="text-[10px] font-bold text-on-surface-variant uppercase block">Kota Tujuan</span>
						<span class="font-bold text-indigo-600 uppercase">{selectedSpd.destination}</span>
					</div>
					<div>
						<span class="text-[10px] font-bold text-on-surface-variant uppercase block">Fasilitas</span>
						<span class="font-bold text-on-surface">{selectedSpd.facility_desc || 'Perusahaan'}</span>
					</div>
				</div>

				<div class="p-3 rounded-xl bg-surface-container-low">
					<span class="text-[10px] font-bold text-on-surface-variant uppercase block mb-1">Alasan & Keterangan Dinas</span>
					<p class="font-semibold text-on-surface">{selectedSpd.reason || '-'}</p>
					{#if selectedSpd.description}
						<p class="text-on-surface-variant mt-0.5">{selectedSpd.description}</p>
					{/if}
				</div>

				<!-- Peserta SPD -->
				<div class="p-3.5 rounded-xl bg-surface-container-low space-y-2">
					<span class="text-[10px] font-bold text-on-surface-variant uppercase block">Daftar Peserta SPD ({selectedSpd.participants?.length || 0})</span>
					{#if selectedSpd.participants && selectedSpd.participants.length > 0}
						<div class="flex flex-wrap gap-1.5">
							{#each selectedSpd.participants as pt (pt.id)}
								<span class="px-2.5 py-1 rounded-lg bg-surface-container-lowest text-on-surface font-semibold text-[11px]">
									{pt.participant_name} {pt.participant_nik && pt.participant_nik !== pt.participant_name ? `(${pt.participant_nik})` : ''}
								</span>
							{/each}
						</div>
					{:else}
						<p class="text-[11px] text-on-surface-variant italic">Pemohon utama ({selectedSpd.requester_name})</p>
					{/if}
				</div>

				<form
					method="POST"
					action="?/approveSpd"
					use:enhance={() => {
						return async ({ result, update }) => {
							await update();
							if (result.type === 'success') selectedSpd = null;
						};
					}}
					class="space-y-3 pt-2 border-t border-slate-200/60 dark:border-slate-800/60"
				>
					<input type="hidden" name="id" value={selectedSpd.id} />
					<div>
						<label for="spd_note" class="block text-[11px] font-bold text-on-surface mb-1">Catatan Verifikasi GA</label>
						<input
							id="spd_note"
							type="text"
							name="status_desc"
							value={selectedSpd.status_desc || ''}
							placeholder="Misal: Mobil operasional siap / menggunakan kendaraan umum..."
							class="w-full px-3.5 py-2 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-indigo-500/20 text-xs text-on-surface"
						/>
					</div>

					<div class="flex items-center justify-between pt-2">
						<button
							type="submit"
							formaction="?/rejectSpd"
							class="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs cursor-pointer"
						>
							Tolak SPD
						</button>
						<div class="flex items-center gap-2">
							<button
								type="button"
								onclick={() => (selectedSpd = null)}
								class="px-4 py-2 rounded-xl bg-surface-container-low font-bold text-xs text-on-surface cursor-pointer"
							>
								Tutup
							</button>
							<button
								type="submit"
								class="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer"
							>
								Setujui SPD (APPROVE GA)
							</button>
						</div>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}

<!-- MODAL: CREATE CARPOOL -->
{#if isCreateCarpoolOpen}
	<div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
		<div class="bg-surface-container-lowest rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden">
			<div class="p-5 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
				<h3 class="font-bold text-base text-on-surface">Buat Permohonan Carpool Baru</h3>
				<button onclick={() => (isCreateCarpoolOpen = false)} class="text-on-surface-variant hover:text-on-surface cursor-pointer">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>
			<form
				method="POST"
				action="?/createCarpool"
				use:enhance={() => {
					return async ({ result, update }) => {
						await update();
						if (result.type === 'success') isCreateCarpoolOpen = false;
					};
				}}
				class="p-6 space-y-3.5 text-xs"
			>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="new_cp_name" class="block font-bold mb-1">Nama Pemohon *</label>
						<input id="new_cp_name" type="text" name="requester_name" required placeholder="Nama lengkap" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20" />
					</div>
					<div>
						<label for="new_cp_dept" class="block font-bold mb-1">Departemen *</label>
						<input id="new_cp_dept" type="text" name="department" required placeholder="Misal: FINANCE / GA" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20" />
					</div>
				</div>

				<div class="grid grid-cols-3 gap-3">
					<div>
						<label for="new_cp_date" class="block font-bold mb-1">Tanggal Pakai *</label>
						<input id="new_cp_date" type="date" name="use_date" required value={new Date().toISOString().split('T')[0]} class="w-full px-3 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20" />
					</div>
					<div>
						<label for="new_cp_t1" class="block font-bold mb-1">Jam Berangkat</label>
						<input id="new_cp_t1" type="time" name="time_start" value="08:00" class="w-full px-3 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20" />
					</div>
					<div>
						<label for="new_cp_t2" class="block font-bold mb-1">Jam Selesai</label>
						<input id="new_cp_t2" type="time" name="time_end" value="17:00" class="w-full px-3 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20" />
					</div>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="new_cp_city" class="block font-bold mb-1">Area Perjalanan</label>
						<select id="new_cp_city" name="city_type" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20">
							<option value="Dalam Kota">Dalam Kota</option>
							<option value="Luar Kota">Luar Kota</option>
						</select>
					</div>
					<div>
						<label for="new_cp_car" class="block font-bold mb-1">Unit Kendaraan GA</label>
						<select id="new_cp_car" name="car_id" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20">
							<option value="">-- Ditentukan GA --</option>
							{#each data.cars as car (car.id)}
								<option value={car.id}>{car.car_name} ({car.police_number})</option>
							{/each}
						</select>
					</div>
				</div>

				<div>
					<label for="new_cp_dest" class="block font-bold mb-1">Tempat Tujuan *</label>
					<input id="new_cp_dest" type="text" name="destination" required placeholder="Misal: Krakatau Steel / KPP Pratama Serang" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20" />
				</div>

				<div>
					<label for="new_cp_pass" class="block font-bold mb-1">Daftar Penumpang (pisahkan koma)</label>
					<input id="new_cp_pass" type="text" name="passengers" placeholder="Misal: Budi Santoso, Rian Hidayat" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20" />
				</div>

				<div>
					<label for="new_cp_desc" class="block font-bold mb-1">Keperluan / Keterangan</label>
					<textarea id="new_cp_desc" name="description" rows="2" placeholder="Uraikan keperluan perjalanan..." class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20"></textarea>
				</div>

				<div class="flex justify-end gap-2 pt-3">
					<button type="button" onclick={() => (isCreateCarpoolOpen = false)} class="px-4 py-2 rounded-xl bg-surface-container-low font-bold cursor-pointer">Batal</button>
					<button type="submit" class="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold cursor-pointer">Simpan Carpool</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- MODAL: CREATE SPD -->
{#if isCreateSpdOpen}
	<div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
		<div class="bg-surface-container-lowest rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden">
			<div class="p-5 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
				<h3 class="font-bold text-base text-on-surface">Buat Surat Perjalanan Dinas (SPD)</h3>
				<button onclick={() => (isCreateSpdOpen = false)} class="text-on-surface-variant hover:text-on-surface cursor-pointer">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>
			<form
				method="POST"
				action="?/createSpd"
				use:enhance={() => {
					return async ({ result, update }) => {
						await update();
						if (result.type === 'success') isCreateSpdOpen = false;
					};
				}}
				class="p-6 space-y-3.5 text-xs"
			>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="new_spd_name" class="block font-bold mb-1">Nama Pemohon *</label>
						<input id="new_spd_name" type="text" name="requester_name" required placeholder="Nama lengkap" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-indigo-500/20" />
					</div>
					<div>
						<label for="new_spd_dept" class="block font-bold mb-1">Departemen *</label>
						<input id="new_spd_dept" type="text" name="department" required placeholder="Misal: OPERATIONS / HRD" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-indigo-500/20" />
					</div>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="new_spd_d1" class="block font-bold mb-1">Tanggal Berangkat *</label>
						<input id="new_spd_d1" type="date" name="start_date" required value={new Date().toISOString().split('T')[0]} class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-indigo-500/20" />
					</div>
					<div>
						<label for="new_spd_d2" class="block font-bold mb-1">Tanggal Kembali *</label>
						<input id="new_spd_d2" type="date" name="end_date" required value={new Date().toISOString().split('T')[0]} class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-indigo-500/20" />
					</div>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="new_spd_dest" class="block font-bold mb-1">Kota Tujuan *</label>
						<input id="new_spd_dest" type="text" name="destination" required placeholder="Misal: BANDUNG / JAKARTA / NAROGONG" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-indigo-500/20" />
					</div>
					<div>
						<label for="new_spd_fas" class="block font-bold mb-1">Jenis Fasilitas</label>
						<select id="new_spd_fas" name="facility_type_id" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-indigo-500/20">
							{#each data.facilityTypes as ft (ft.id)}
								<option value={ft.id}>{ft.description}</option>
							{/each}
						</select>
					</div>
				</div>

				<div>
					<label for="new_spd_part" class="block font-bold mb-1">Daftar Peserta SPD (pisahkan koma)</label>
					<input id="new_spd_part" type="text" name="participants" placeholder="Nama-nama peserta yang ikut dalam SPD" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-indigo-500/20" />
				</div>

				<div>
					<label for="new_spd_desc" class="block font-bold mb-1">Agenda / Keperluan Dinas *</label>
					<textarea id="new_spd_desc" name="description" required rows="2" placeholder="Uraikan agenda perjalanan dinas..." class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-indigo-500/20"></textarea>
				</div>

				<div class="flex justify-end gap-2 pt-3">
					<button type="button" onclick={() => (isCreateSpdOpen = false)} class="px-4 py-2 rounded-xl bg-surface-container-low font-bold cursor-pointer">Batal</button>
					<button type="submit" class="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer">Simpan SPD</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- MODAL: CREATE CAR -->
{#if isCreateCarOpen}
	<div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
		<div class="bg-surface-container-lowest rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden">
			<div class="p-5 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
				<h3 class="font-bold text-base text-on-surface">Tambah Kendaraan Operasional GA</h3>
				<button onclick={() => (isCreateCarOpen = false)} class="text-on-surface-variant hover:text-on-surface cursor-pointer">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>
			<form
				method="POST"
				action="?/createCar"
				use:enhance={() => {
					return async ({ result, update }) => {
						await update();
						if (result.type === 'success') isCreateCarOpen = false;
					};
				}}
				class="p-6 space-y-3.5 text-xs"
			>
				<div>
					<label for="car_name_in" class="block font-bold mb-1">Nama Kendaraan *</label>
					<input id="car_name_in" type="text" name="car_name" required placeholder="Misal: Toyota Avanza / Innova" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20" />
				</div>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="car_nopol_in" class="block font-bold mb-1">Nomor Polisi *</label>
						<input id="car_nopol_in" type="text" name="police_number" required placeholder="A 1234 XX" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20 font-mono" />
					</div>
					<div>
						<label for="car_grp_in" class="block font-bold mb-1">Kelompok</label>
						<select id="car_grp_in" name="car_group" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20">
							<option value="R-4">R-4 (Mobil)</option>
							<option value="R-2">R-2 (Motor)</option>
							<option value="ON LINE">ON LINE</option>
						</select>
					</div>
				</div>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="car_fuel_in" class="block font-bold mb-1">Jenis BBM</label>
						<select id="car_fuel_in" name="fuel_id" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20">
							{#each data.fuelPrices as fp (fp.id)}
								<option value={fp.id}>{fp.fuel_name}</option>
							{/each}
						</select>
					</div>
					<div>
						<label for="car_kml_in" class="block font-bold mb-1">Konsumsi (KM/Liter)</label>
						<input id="car_kml_in" type="number" step="0.1" name="km_per_liter" value="11" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-cyan-500/20 font-mono" />
					</div>
				</div>
				<div class="flex justify-end gap-2 pt-3">
					<button type="button" onclick={() => (isCreateCarOpen = false)} class="px-4 py-2 rounded-xl bg-surface-container-low font-bold cursor-pointer">Batal</button>
					<button type="submit" class="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold cursor-pointer">Simpan Unit</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- MODAL: CREATE SPD RATE -->
{#if isCreateSpdRateOpen}
	<div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
		<div class="bg-surface-container-lowest rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden">
			<div class="p-5 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
				<h3 class="font-bold text-base text-on-surface">Tambah Matriks Plafon SPD GA</h3>
				<button onclick={() => (isCreateSpdRateOpen = false)} class="text-on-surface-variant hover:text-on-surface cursor-pointer">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>
			<form
				method="POST"
				action="?/createSpdRate"
				use:enhance={() => {
					return async ({ result, update }) => {
						await update();
						if (result.type === 'success') isCreateSpdRateOpen = false;
					};
				}}
				class="p-6 space-y-3.5 text-xs"
			>
				<div>
					<label for="sr_city" class="block font-bold mb-1">Kota / Wilayah Tujuan *</label>
					<input id="sr_city" type="text" name="city" required placeholder="Misal: JABODETABEK / BANDUNG / BANTEN" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-emerald-500/20" />
				</div>
				<div>
					<label for="sr_lvl" class="block font-bold mb-1">Level Jabatan *</label>
					<select id="sr_lvl" name="job_level" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-emerald-500/20">
						<option value="Operator">Operator</option>
						<option value="Officer">Officer</option>
						<option value="Spv">Spv</option>
						<option value="Mgr">Mgr</option>
						<option value="GM">GM</option>
						<option value="Dir">Dir</option>
					</select>
				</div>
				<div>
					<label for="sr_bdg" class="block font-bold mb-1">Komponen Anggaran</label>
					<select id="sr_bdg" name="budget_id" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-emerald-500/20">
						{#each data.budgets as b (b.id)}
							<option value={b.id}>{b.budget_name} ({b.facility_desc || 'Umum'})</option>
						{/each}
					</select>
				</div>
				<div>
					<label for="sr_amt" class="block font-bold mb-1">Plafon Biaya (Rp) *</label>
					<input id="sr_amt" type="number" step="5000" name="cost_amount" required value="150000" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono" />
				</div>
				<div class="flex justify-end gap-2 pt-3">
					<button type="button" onclick={() => (isCreateSpdRateOpen = false)} class="px-4 py-2 rounded-xl bg-surface-container-low font-bold cursor-pointer">Batal</button>
					<button type="submit" class="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer">Simpan Tarif</button>
				</div>
			</form>
		</div>
	</div>
{/if}
