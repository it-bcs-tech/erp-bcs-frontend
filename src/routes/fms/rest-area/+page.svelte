<script lang="ts">
	import type { PageData } from './$types';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	
	let { data }: { data: PageData } = $props();
	let restAreas = $derived(data.restAreas || []);

	let map: any;
	let mapContainer: HTMLElement;
	let polygonLayer: any;
	let markers: any[] = [];

	let nama = $state('');
	let points = $state<{lat: number, lng: number}[]>([]);

	let isAdding = $state(false);
	
	// Search state
	let searchQuery = $state('');
	let isSearching = $state(false);

	let showList = $state(true);

	onMount(async () => {
		if (browser) {
			const L = await import('leaflet');
			import('leaflet/dist/leaflet.css');

			map = L.map(mapContainer, { zoomControl: false }).setView([-6.2, 106.8], 9);
			L.control.zoom({ position: 'topright' }).addTo(map);
			L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
				attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
			}).addTo(map);

			// Draw existing polygons
			restAreas.forEach((ra: any) => {
				const pts = ra.polygon_points.map((p: any) => [p.lat, p.lng]);
				L.polygon(pts, { color: '#3b82f6', weight: 2, fillOpacity: 0.1 })
					.bindTooltip(ra.nama_rest_area)
					.addTo(map);
			});

			map.on('click', (e: any) => {
				if (!isAdding) return;
				
				if (points.length < 4) {
					points = [...points, {lat: e.latlng.lat, lng: e.latlng.lng}];
					const m = L.marker(e.latlng).addTo(map);
					markers.push(m);
					drawDraftPolygon(L);
				}
			});
		}
	});

	function drawDraftPolygon(L: any) {
		if (polygonLayer) map.removeLayer(polygonLayer);
		if (points.length > 1) {
			const pts = points.map(p => [p.lat, p.lng]);
			// If not 4 points yet, draw a polyline. If 4 points, draw polygon
			if (points.length < 4) {
				polygonLayer = L.polyline(pts, { color: '#f59e0b', weight: 2, dashArray: '5, 5' }).addTo(map);
			} else {
				polygonLayer = L.polygon(pts, { color: '#10b981', weight: 2 }).addTo(map);
			}
		}
	}

	function resetForm() {
		isAdding = false;
		nama = '';
		points = [];
		markers.forEach(m => map.removeLayer(m));
		markers = [];
		if (polygonLayer) map.removeLayer(polygonLayer);
	}

	function resetPoints() {
		points = [];
		markers.forEach(m => map.removeLayer(m));
		markers = [];
		if (polygonLayer) map.removeLayer(polygonLayer);
	}

	function flyToRestArea(ra: any) {
		if (!map) return;
		const minLat = Math.min(...ra.polygon_points.map((p: any) => p.lat));
		const maxLat = Math.max(...ra.polygon_points.map((p: any) => p.lat));
		const minLon = Math.min(...ra.polygon_points.map((p: any) => p.lng));
		const maxLon = Math.max(...ra.polygon_points.map((p: any) => p.lng));
		
		map.flyToBounds([[minLat, minLon], [maxLat, maxLon]], { padding: [50, 50], duration: 1.5 });
	}

	async function searchLocation(e: Event) {
		e.preventDefault();
		if (!searchQuery.trim() || !map) return;
		isSearching = true;
		try {
			const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
			const results = await res.json();
			if (results && results.length > 0) {
				const loc = results[0];
				if (loc.boundingbox) {
					const L = await import('leaflet');
					const bounds = L.latLngBounds(
						[loc.boundingbox[0], loc.boundingbox[2]],
						[loc.boundingbox[1], loc.boundingbox[3]]
					);
					map.fitBounds(bounds, { padding: [50, 50] });
				} else {
					map.setView([loc.lat, loc.lon], 15);
				}
			} else {
				alert('Lokasi tidak ditemukan.');
			}
		} catch (error) {
			console.error("Search error:", error);
		} finally {
			isSearching = false;
		}
	}
</script>

<svelte:head>
	<title>Rest Area Geofence | FMS</title>
</svelte:head>

<div class="relative w-full h-[calc(100vh-6rem)] rounded-3xl overflow-hidden shadow-xs border border-slate-200/60 dark:border-slate-800/60 bg-surface-container-low">
	
	<!-- FULLSCREEN MAP -->
	<div bind:this={mapContainer} class="absolute inset-0 z-0 bg-surface-container-low"></div>

	<!-- SEARCH BAR (Floating Top Left) -->
	<div class="absolute top-6 left-6 z-[400] w-96 flex flex-col gap-4">
		<!-- Search Input -->
		<form onsubmit={searchLocation} class="relative w-full shadow-lg rounded-2xl bg-surface/90 backdrop-blur-md border border-slate-200/60 dark:border-slate-800/60 overflow-hidden flex items-center">
			<span class="material-symbols-outlined text-slate-400 ml-4">search</span>
			<input 
				type="text" 
				bind:value={searchQuery}
				placeholder="Cari jalan tol atau rest area..." 
				class="w-full bg-transparent text-on-surface py-3 px-3 focus:outline-none text-xs font-medium placeholder:text-slate-400"
			/>
			{#if isSearching}
				<span class="material-symbols-outlined text-blue-500 animate-spin mr-4">refresh</span>
			{/if}
		</form>

		<!-- SIDEBAR (Floating Panel) -->
		<div class="bg-surface/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/60 dark:border-slate-800/60 flex flex-col overflow-hidden max-h-[calc(100vh-14rem)] transition-all duration-300">
			<div class="p-4 border-b border-slate-200/60 dark:border-slate-800/60 flex justify-between items-center bg-surface-container-low/50 cursor-pointer hover:bg-surface-container-low transition-colors" onclick={() => showList = !showList}>
				<div class="flex items-center gap-2.5">
					<div class="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
						<span class="material-symbols-outlined text-lg">local_cafe</span>
					</div>
					<div>
						<h2 class="font-bold text-on-surface text-sm leading-tight select-none">Rest Area POI</h2>
						<p class="text-[10px] text-on-surface-variant font-medium select-none">Geofence Master Data</p>
					</div>
				</div>
				<button 
					onclick={(e) => {
						e.stopPropagation();
						if (isAdding) resetForm();
						else { isAdding = true; showList = true; }
					}}
					class="px-3 py-1.5 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer {isAdding ? 'bg-amber-100 text-amber-700' : 'bg-blue-600 text-white hover:bg-blue-700'}"
				>
					{isAdding ? 'Batal' : '+ Tambah'}
				</button>
			</div>

			{#if showList}
				<div class="flex flex-col flex-1 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
					{#if isAdding}
						<div class="p-4 bg-amber-50/90 dark:bg-amber-900/20 border-b border-amber-200/50">
							<p class="text-xs font-black text-amber-800 mb-2 uppercase tracking-widest">Mode Menggambar</p>
							<ol class="text-[11px] text-amber-700/80 list-decimal list-inside space-y-1 mb-4 font-medium">
								<li>Klik 4 titik di peta membentuk area.</li>
								<li>Polygon hijau akan otomatis terbentuk.</li>
								<li>Beri nama lalu klik Simpan.</li>
							</ol>

							<form method="POST" action="?/add" onsubmit={() => setTimeout(() => window.location.reload(), 500)}>
								<input type="text" name="nama" bind:value={nama} placeholder="Nama Rest Area (Cth: KM 57)" class="w-full text-sm p-2.5 rounded-xl border border-amber-200/60 bg-white/50 focus:bg-white mb-3 shadow-inner focus:outline-none focus:ring-2 focus:ring-amber-500/30" required />
								
								<div class="flex justify-between items-center mb-3 px-1">
									<span class="text-xs font-bold text-amber-800">Titik: {points.length}/4</span>
									{#if points.length > 0}
										<button type="button" onclick={resetPoints} class="text-[10px] text-rose-600 font-bold hover:underline">Ulangi</button>
									{/if}
								</div>

								{#if points.length === 4}
									<input type="hidden" name="points" value={JSON.stringify(points)} />
									<button type="submit" class="w-full py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors shadow-sm">Simpan Geofence</button>
								{:else}
									<button type="button" disabled class="w-full py-2.5 bg-amber-600/30 text-white rounded-xl text-sm font-bold cursor-not-allowed">Pilih 4 Titik Dulu</button>
								{/if}
							</form>
						</div>
					{/if}

					<div class="flex-1 overflow-y-auto p-3 space-y-2 hide-scrollbar">
						{#each restAreas as ra}
							<div 
								class="p-3 bg-surface-container/30 hover:bg-surface-container/80 rounded-xl flex justify-between items-center group transition-colors cursor-pointer"
								onclick={() => flyToRestArea(ra)}
							>
								<div class="flex items-center gap-3 pointer-events-none">
									<div class="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
										<span class="material-symbols-outlined text-[16px]">location_on</span>
									</div>
									<div>
										<p class="font-bold text-sm text-on-surface leading-tight">{ra.nama_rest_area}</p>
										<p class="text-[9px] text-on-surface-variant font-black uppercase tracking-widest mt-0.5 group-hover:text-blue-500 transition-colors">Klik untuk melihat</p>
									</div>
								</div>
								<form method="POST" action="?/delete" onsubmit={(e) => { e.stopPropagation(); setTimeout(() => window.location.reload(), 500); }}>
									<input type="hidden" name="id" value={ra.id} />
									<button class="w-8 h-8 flex items-center justify-center text-rose-500 bg-rose-50 hover:bg-rose-100 rounded-lg opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100">
										<span class="material-symbols-outlined text-[16px]">delete</span>
									</button>
								</form>
							</div>
						{:else}
							<div class="py-10 flex flex-col items-center justify-center opacity-50">
								<span class="material-symbols-outlined text-4xl mb-2">map</span>
								<p class="text-xs font-bold text-center">Belum ada Rest Area</p>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	</div>

	<!-- FLOATING ALERT -->
	{#if isAdding}
		<div class="absolute top-6 left-1/2 -translate-x-1/2 z-[400] bg-amber-500 text-white px-6 py-2.5 rounded-full text-xs font-bold shadow-xl animate-bounce flex items-center gap-2">
			<span class="material-symbols-outlined text-[18px]">draw</span>
			Klik {4 - points.length} Titik Lagi di Peta
		</div>
	{/if}
</div>

<style>
	.hide-scrollbar::-webkit-scrollbar { display: none; }
	.hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
