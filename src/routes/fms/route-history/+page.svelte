<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	
	let { data }: { data: PageData } = $props();
	let history = $derived(data.history || []);
	let stats = $derived(data.stats);
	let meta = $derived(data.meta);

	let searchQuery = $state($page.url.searchParams.get('search') || '');
	let statusFilter = $state($page.url.searchParams.get('status') || 'All');

	let searchTimer: ReturnType<typeof setTimeout>;

	function updateQueryParams() {
		const url = new URL(window.location.href);
		if (searchQuery) url.searchParams.set('search', searchQuery);
		else url.searchParams.delete('search');
		if (statusFilter && statusFilter !== 'All') url.searchParams.set('status', statusFilter);
		else url.searchParams.delete('status');
		url.searchParams.set('page', '1');
		goto(url.toString(), { keepFocus: true, noScroll: true });
	}

	function handleSearchInput() {
		clearTimeout(searchTimer);
		searchTimer = setTimeout(updateQueryParams, 400);
	}

	function handleStatusClick(s: string) {
		statusFilter = s;
		updateQueryParams();
	}

	let totalPages = $derived(Math.max(1, Math.ceil((meta?.total || 0) / (meta?.per_page || 5))));
	let currentPage = $derived(meta?.current_page || 1);
	let startItem = $derived(meta?.total === 0 ? 0 : ((currentPage - 1) * (meta?.per_page || 5)) + 1);
	let endItem = $derived(Math.min(currentPage * (meta?.per_page || 5), meta?.total || 0));

	function goToPage(p: number) {
		if (p < 1 || p > totalPages) return;
		const url = new URL(window.location.href);
		url.searchParams.set('page', p.toString());
		goto(url.toString(), { invalidateAll: true, noScroll: true });
	}

	// ===================================
	// Playback Modal & Map Logic
	// ===================================
	let showPlaybackModal = $state(false);
	let isPlaying = $state(false);
	let playSpeed = $state(1); // multiplier
	let mapContainer: HTMLElement;
	let L: any;
	let map: any;
	let truckMarker: any;
	let pathLine: any;
	let playbackInterval: any;
	
	let playbackData = $state<{lat: number, lon: number, speed: number, time: string}[]>([]);
	let restAreaLogs = $state<any[]>([]);
	let currentPointIndex = $state(0);
	let currentPlaybackSpeed = $state(0);
	let playbackTripId = $state('');

	async function openPlayback(tripId: string) {
		playbackTripId = tripId;
		showPlaybackModal = true;
		playbackData = [];
		restAreaLogs = [];
		currentPointIndex = 0;
		isPlaying = false;
		currentPlaybackSpeed = 0;

		try {
			const res = await fetch(`/api/fms/trip/${tripId}/path`);
			const resData = await res.json();
			if (resData.success && resData.path.length > 0) {
				playbackData = resData.path;
				restAreaLogs = resData.rest_areas || [];
			} else {
				alert("Tidak ada data path tersimpan untuk trip ini.");
				showPlaybackModal = false;
				return;
			}
		} catch (e) {
			console.error("Failed to load path", e);
			alert("Gagal memuat jalur playback.");
			showPlaybackModal = false;
			return;
		}

		if (!L) {
			const leaflet = await import('leaflet');
			L = leaflet.default;
			await import('leaflet/dist/leaflet.css');
		}

		// Wait for modal transition to render container
		setTimeout(() => {
			if (!map) {
				map = L.map(mapContainer, { zoomControl: false }).setView([-6.8, 109.5], 10);
				L.control.zoom({ position: 'topright' }).addTo(map);
				L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
					attribution: '&copy; OpenStreetMap &copy; CARTO'
				}).addTo(map);
			}

			if (pathLine) map.removeLayer(pathLine);
			if (truckMarker) map.removeLayer(truckMarker);

			const latlngs = playbackData.map(p => [p.lat, p.lon]);
			pathLine = L.polyline(latlngs, { color: '#3b82f6', weight: 4, opacity: 0.7 }).addTo(map);
			map.fitBounds(pathLine.getBounds(), { padding: [30, 30] });

			// Custom Truck Icon
			const truckIcon = L.divIcon({
				html: `<div style="transform: rotate(0deg); width: 28px; height: 28px; background: white; border-radius: 50%; box-shadow: 0 2px 5px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; border: 2px solid #3b82f6;"><span class="material-symbols-outlined" style="font-size: 16px; color: #3b82f6;">local_shipping</span></div>`,
				className: 'truck-marker',
				iconSize: [28, 28],
				iconAnchor: [14, 14]
			});

			truckMarker = L.marker(latlngs[0], { icon: truckIcon }).addTo(map);
		}, 300);
	}

	function closePlayback() {
		showPlaybackModal = false;
		pausePlayback();
	}

	function togglePlay() {
		if (isPlaying) {
			pausePlayback();
		} else {
			startPlayback();
		}
	}

	function pausePlayback() {
		isPlaying = false;
		if (playbackInterval) clearInterval(playbackInterval);
	}

	function startPlayback() {
		if (playbackData.length === 0) return;
		if (currentPointIndex >= playbackData.length - 1) {
			currentPointIndex = 0; // restart
		}
		isPlaying = true;
		
		playbackInterval = setInterval(() => {
			if (currentPointIndex < playbackData.length - 1) {
				currentPointIndex++;
				const point = playbackData[currentPointIndex];
				if (truckMarker && map) {
					truckMarker.setLatLng([point.lat, point.lon]);
					map.panTo([point.lat, point.lon], { animate: true, duration: 0.5 });
				}
				currentPlaybackSpeed = point.speed;
			} else {
				pausePlayback();
			}
		}, Math.max(50, 1000 / playSpeed));
	}


</script>

<svelte:head>
	<title>Route History | OCS</title>
</svelte:head>

<div class="flex flex-col h-full">
	<header class="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
		<div>
			<h1 class="text-3xl font-extrabold text-on-surface tracking-tight mb-2">Route History</h1>
			<p class="text-on-surface-variant font-medium text-sm">Historical trip records, route playback, and driving analytics</p>
		</div>
		<button class="bg-surface-container-lowest border border-outline-variant/30 text-on-surface px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-surface-container-low transition-colors">
			<span class="material-symbols-outlined text-lg">download</span>
			Export History
		</button>
	</header>

	<!-- Stats Cards -->
	<div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
		<div class="bg-surface-container-lowest p-5 rounded-2xl border border-surface-container shadow-sm">
			<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Total Trips</p>
			<div class="flex items-end justify-between">
				<h3 class="text-3xl font-black text-on-surface">{stats.totalTrips}</h3>
				<span class="material-symbols-outlined text-3xl text-surface-variant">route</span>
			</div>
		</div>
		<div class="bg-surface-container-lowest p-5 rounded-2xl border border-sky-500/20 shadow-sm">
			<p class="text-xs font-bold text-sky-600 uppercase tracking-wider mb-2">Total Distance</p>
			<div class="flex items-end justify-between">
				<h3 class="text-2xl font-black text-sky-600">{stats.totalDistance.toLocaleString('id-ID')} km</h3>
				<span class="material-symbols-outlined text-3xl text-sky-500/50">distance</span>
			</div>
		</div>
		<div class="bg-surface-container-lowest p-5 rounded-2xl border border-emerald-500/20 shadow-sm">
			<p class="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">Avg. Speed</p>
			<div class="flex items-end justify-between">
				<h3 class="text-3xl font-black text-emerald-600">{stats.avgSpeed} <span class="text-sm font-medium text-on-surface-variant">km/h</span></h3>
				<span class="material-symbols-outlined text-3xl text-emerald-500/50">speed</span>
			</div>
		</div>
		<div class="bg-surface-container-lowest p-5 rounded-2xl border border-amber-500/20 shadow-sm">
			<p class="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2">Total Fuel Used</p>
			<div class="flex items-end justify-between">
				<h3 class="text-2xl font-black text-amber-600">{stats.totalFuel.toLocaleString('id-ID')} L</h3>
				<span class="material-symbols-outlined text-3xl text-amber-500/50">local_gas_station</span>
			</div>
		</div>
	</div>

	<!-- Filters -->
	<div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
		<div class="flex gap-2">
			{#each ['All', 'Completed', 'In Progress'] as tab}
				<button class="px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors {statusFilter === tab ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300' : 'text-on-surface-variant hover:bg-surface-container'}"
					onclick={() => handleStatusClick(tab)}>
					{tab}
				</button>
			{/each}
		</div>
		<div class="relative w-full lg:w-72 flex-shrink-0">
			<span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">search</span>
			<input type="text" bind:value={searchQuery} oninput={handleSearchInput}
				placeholder="Search unit, driver, route..." 
				class="w-full bg-surface-container-lowest border border-outline-variant/30 text-on-surface rounded-full py-2.5 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-sky-500/50 text-sm font-medium shadow-sm" />
		</div>
	</div>

	<!-- Data Table -->
	<div class="bg-surface-container-lowest rounded-[24px] shadow-sm flex-1 overflow-hidden flex flex-col">
		<div class="overflow-x-auto flex-1">
			<table class="w-full text-left border-collapse min-w-[1200px]">
				<thead>
					<tr class="border-b border-surface-container sticky top-0 bg-surface-container-lowest z-10">
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Trip Info</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Unit & Driver</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Route</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Performance</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Status</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-right">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-surface-container">
					{#each history as trip}
						<tr class="group hover:bg-surface-container-low transition-colors">
							<td class="py-4 px-6">
								<div class="flex flex-col gap-1">
									<span class="text-sm font-bold text-on-surface">{trip.id}</span>
									<span class="text-[10px] font-medium text-on-surface-variant">{trip.startDate}</span>
									{#if trip.endDate !== '-'}
										<span class="text-[10px] font-medium text-on-surface-variant">→ {trip.endDate}</span>
									{/if}
								</div>
							</td>
							<td class="py-4 px-6">
								<div class="flex items-center gap-3">
									<div class="w-9 h-9 rounded-lg bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center text-sky-600 dark:text-sky-400">
										<span class="material-symbols-outlined text-[18px]">local_shipping</span>
									</div>
									<div>
										<p class="text-sm font-bold text-on-surface">{trip.unit}</p>
										<p class="text-[11px] text-on-surface-variant font-medium">{trip.driver}</p>
									</div>
								</div>
							</td>
							<td class="py-4 px-6">
								<div class="flex flex-col gap-1">
									<div class="flex items-center gap-1.5">
										<span class="material-symbols-outlined text-[14px] text-sky-500">route</span>
										<span class="text-sm font-bold text-on-surface">{trip.origin} → {trip.destination}</span>
									</div>
									<div class="flex items-center gap-2 mt-0.5">
										<span class="text-[10px] font-bold text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded">{trip.distance} km</span>
										{#if trip.duration !== '-'}
											<span class="text-[10px] font-medium text-on-surface-variant">{trip.duration}</span>
										{/if}
									</div>
								</div>
							</td>
							<td class="py-4 px-6">
								<div class="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
									<div class="flex items-center gap-1.5">
										<span class="material-symbols-outlined text-[13px] text-sky-500">speed</span>
										<span class="font-medium text-on-surface">Avg: {trip.avgSpeed}</span>
									</div>
									<div class="flex items-center gap-1.5">
										<span class="material-symbols-outlined text-[13px] text-rose-500">speed</span>
										<span class="font-medium text-on-surface">Max: {trip.maxSpeed}</span>
									</div>
									<div class="flex items-center gap-1.5">
										<span class="material-symbols-outlined text-[13px] text-amber-500">local_gas_station</span>
										<span class="font-medium text-on-surface">{trip.fuelUsed} L</span>
									</div>
									<div class="flex items-center gap-1.5">
										<span class="material-symbols-outlined text-[13px] text-indigo-500">pin_drop</span>
										<span class="font-medium text-on-surface">{trip.stops} stops</span>
									</div>
								</div>
							</td>
							<td class="py-4 px-6">
								{#if trip.status === 'Completed'}
									<span class="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] bg-emerald-500/10 px-2.5 py-1 rounded-md uppercase tracking-wider border border-emerald-500/20">
										<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Completed
									</span>
								{:else}
									<span class="inline-flex items-center gap-1.5 text-sky-600 dark:text-sky-400 font-bold text-[11px] bg-sky-500/10 px-2.5 py-1 rounded-md uppercase tracking-wider border border-sky-500/20">
										<span class="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse"></span> In Progress
									</span>
								{/if}
							</td>
							<td class="py-4 px-6 text-right">
								<div class="flex items-center justify-end gap-2">
									<button class="p-2 rounded-lg text-sky-600 hover:bg-sky-100 dark:hover:bg-sky-900/30 transition-colors" title="Playback Route" onclick={() => openPlayback(trip.dbId)}>
										<span class="material-symbols-outlined text-[20px]">play_circle</span>
									</button>
									<button class="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors" title="View Details">
										<span class="material-symbols-outlined text-[20px]">visibility</span>
									</button>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		
		<!-- Pagination Footer -->
		<div class="px-6 py-4 border-t border-surface-container flex items-center justify-between bg-surface-container-lowest">
			<p class="text-xs text-on-surface-variant font-medium">Showing {startItem} to {endItem} of {meta?.total || 0} entries</p>
			<div class="flex gap-1">
				<button class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high disabled:opacity-50 transition-colors" disabled={currentPage <= 1} onclick={() => goToPage(currentPage - 1)}>
					<span class="material-symbols-outlined text-lg">chevron_left</span>
				</button>
				{#each Array(totalPages) as _, i}
					<button class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shadow-sm transition-colors {currentPage === i + 1 ? 'bg-sky-600 text-white' : 'text-on-surface hover:bg-surface-container-high'}" onclick={() => goToPage(i + 1)}>
						{i + 1}
					</button>
				{/each}
				<button class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high disabled:opacity-50 transition-colors" disabled={currentPage >= totalPages} onclick={() => goToPage(currentPage + 1)}>
					<span class="material-symbols-outlined text-lg">chevron_right</span>
				</button>
			</div>
		</div>
	</div>
</div>

<!-- Playback Modal -->
{#if showPlaybackModal}
<div class="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-300">
	<div class="bg-surface-container-lowest w-full max-w-4xl h-[80vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col scale-100">
		<div class="px-6 py-4 border-b border-surface-container flex items-center justify-between bg-surface-container-low/50">
			<div>
				<h2 class="text-lg font-bold text-on-surface">Route Playback</h2>
				<p class="text-sm text-on-surface-variant">Trip ID: {playbackTripId}</p>
			</div>
			<button class="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors" onclick={closePlayback}>
				<span class="material-symbols-outlined">close</span>
			</button>
		</div>
		
		<div class="flex-1 relative bg-surface-container">
			<div bind:this={mapContainer} class="absolute inset-0 z-0"></div>
			
			<!-- Speed Overlay overlay -->
			<div class="absolute top-4 left-4 z-[400] bg-surface-container-lowest/90 backdrop-blur-md px-4 py-2 rounded-xl shadow-lg border border-surface-container flex items-center gap-3">
				<span class="material-symbols-outlined text-sky-500">speed</span>
				<div class="flex flex-col">
					<span class="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Kecepatan Saat Ini</span>
					<span class="text-xl font-bold text-on-surface leading-none mt-1">{currentPlaybackSpeed} <span class="text-sm font-medium text-on-surface-variant">km/h</span></span>
				</div>
			</div>
		</div>

		{#if restAreaLogs.length > 0}
			<div class="px-6 py-3 bg-amber-50 border-t border-amber-200 flex items-center gap-4 overflow-x-auto">
				<span class="text-xs font-bold text-amber-800 uppercase tracking-widest whitespace-nowrap">Rest Area Stops:</span>
				{#each restAreaLogs as log}
					<div class="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-amber-200 shadow-sm whitespace-nowrap">
						<span class="material-symbols-outlined text-[16px] text-amber-600">local_cafe</span>
						<div>
							<p class="text-xs font-bold text-on-surface leading-none">{log.nama_rest_area}</p>
							<p class="text-[10px] text-on-surface-variant font-medium mt-0.5">
								{log.duration_minutes ? Math.round(log.duration_minutes) + ' mins' : 'Masih istirahat...'}
							</p>
						</div>
					</div>
				{/each}
			</div>
		{/if}

		<div class="p-6 bg-surface-container-lowest border-t border-surface-container flex flex-col gap-4">
			<div class="flex items-center gap-4">
				<button 
					class="w-12 h-12 rounded-full flex items-center justify-center bg-sky-600 text-white hover:bg-sky-700 shadow-md transition-colors shrink-0" 
					onclick={togglePlay}
				>
					<span class="material-symbols-outlined text-[28px]">{isPlaying ? 'pause' : 'play_arrow'}</span>
				</button>
				
				<div class="flex-1 flex flex-col gap-2">
					<div class="flex items-center justify-between text-xs font-medium text-on-surface-variant px-1">
						<span>Titik Awal</span>
						<span>{playbackData.length > 0 ? playbackData[currentPointIndex]?.time.split('T')[1].substring(0,5) : '00:00'}</span>
						<span>Tujuan</span>
					</div>
					<input 
						type="range" 
						min="0" 
						max={Math.max(0, playbackData.length - 1)} 
						bind:value={currentPointIndex} 
						class="w-full h-2 bg-surface-container-high rounded-full appearance-none cursor-pointer accent-sky-600"
						oninput={() => { pausePlayback(); if(playbackData.length>0) { const p = playbackData[currentPointIndex]; truckMarker.setLatLng([p.lat, p.lon]); map.panTo([p.lat, p.lon]); currentPlaybackSpeed = p.speed; } }}
					>
				</div>
				
				<div class="flex items-center gap-2 bg-surface-container-low p-1.5 rounded-xl border border-surface-container">
					{#each [1, 5, 10, 20] as speed}
						<button 
							class="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all {playSpeed === speed ? 'bg-white shadow text-sky-600' : 'text-on-surface-variant hover:text-on-surface'}"
							onclick={() => { 
								playSpeed = speed; 
								if(isPlaying) { 
									clearInterval(playbackInterval); 
									startPlayback(); 
								} 
							}}
						>
							{speed}x
						</button>
					{/each}
				</div>
			</div>
		</div>
	</div>
</div>
{/if}
