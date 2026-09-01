<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	
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

	function formatPlaybackTime(isoString: string) {
		if (!isoString) return '00:00';
		const date = new Date(isoString);
		return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).replace('.', ':');
	}
	let restAreaLogs = $state<any[]>([]);
	let currentPointIndex = $state(0);
	let currentPlaybackSpeed = $state(0);
	let playbackTripId = $state('');
	let tripData = $state<any>(null);
	let checkpointsData = $state<any[]>([]);
	let poolsData = $state<any[]>([]);
	let extraMarkers: any[] = [];

	async function openPlayback(tripId: string) {
		playbackTripId = tripId;
		showPlaybackModal = true;
		playbackData = [];
		restAreaLogs = [];
		currentPointIndex = 0;
		isPlaying = false;
		currentPlaybackSpeed = 0;
		currentAreaName = "Memuat lokasi...";
		lastGeocodeLat = 0;
		lastGeocodeLon = 0;
		lastGeocodeTime = 0;

		try {
			const res = await fetch(`/api/fms/trip/${tripId}/path`);
			const resData = await res.json();
			if (resData.success && resData.path.length > 0) {
				playbackData = resData.path;
				restAreaLogs = resData.rest_areas || [];
				tripData = resData.trip;
				checkpointsData = resData.checkpoints || [];
				poolsData = resData.pools || [];
				
				// Langsung fetch area pertama
				if (playbackData[0]) {
					getReverseGeocode(playbackData[0].lat, playbackData[0].lon).then(name => {
						currentAreaName = name;
					});
				}
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

		initMap();
	}

	onMount(async () => {
		if (browser) {
			L = await import('leaflet');
			await import('leaflet/dist/leaflet.css');
		}

		initMap();
	});

	let geocodeCache: Record<string, string> = {};

	// Helper Haversine
	function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
		const R = 6371e3;
		const p1 = lat1 * Math.PI/180;
		const p2 = lat2 * Math.PI/180;
		const dp = (lat2-lat1) * Math.PI/180;
		const dl = (lon2-lon1) * Math.PI/180;
		const a = Math.sin(dp/2) * Math.sin(dp/2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl/2) * Math.sin(dl/2);
		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
		return R * c;
	}

	async function getReverseGeocode(lat: number, lon: number): Promise<string> {
		const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
		if (geocodeCache[key]) return geocodeCache[key];

		try {
			const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14&email=it@bcs.com`, {
				headers: { 
					'Accept-Language': 'id-ID,id;q=0.9'
				}
			});
			if (res.ok) {
				const data = await res.json();
				let name = data.display_name;
				if (data.address) {
					name = [data.address.village, data.address.town, data.address.city, data.address.state]
							.filter(Boolean).join(', ');
				}
				geocodeCache[key] = name || 'Daerah tidak diketahui';
				return geocodeCache[key];
			}
		} catch (e) {
			console.error("Geocode failed", e);
		}
		return "Daerah tidak diketahui";
	}

	function fetchGeocode(popup: any, lat: number, lon: number) {
		getReverseGeocode(lat, lon).then(name => {
			try {
				// Gunakan popup.setContent() untuk mengganti teks "Loading location..."
				// Ini adalah cara paling reliable karena tidak bergantung pada internal DOM Leaflet
				const currentContent = popup.getContent?.() || '';
				if (typeof currentContent === 'string' && currentContent.includes('Loading location...')) {
					const locationHtml = `<span class="material-symbols-outlined" style="font-size:10px;vertical-align:middle;margin-right:2px;">location_on</span>${name}`;
					const newContent = currentContent.replace(
						/<span[^>]*class="[^"]*loading-geocode[^"]*"[^>]*>Loading location\.\.\.<\/span>/,
						`<span style="font-size:11px;font-weight:500;color:#334155;display:block;margin-top:4px;padding-top:4px;border-top:1px solid #e2e8f0;line-height:1.3;">${locationHtml}</span>`
					);
					popup.setContent(newContent);
				}
			} catch (e) {
				console.error("fetchGeocode error:", e);
			}
		});
	}

	let currentAreaName = $state("Memuat lokasi...");
	let lastGeocodeTime = 0;
	let lastGeocodeLat = 0;
	let lastGeocodeLon = 0;

	// Update area name during playback (debounced to avoid rate limit)
	$effect(() => {
		if (playbackData && playbackData.length > 0 && currentPointIndex >= 0) {
			const p = playbackData[currentPointIndex];
			if (p) {
				const distMoved = lastGeocodeLat === 0 ? 9999 : getDistance(p.lat, p.lon, lastGeocodeLat, lastGeocodeLon);
				// Fetch API jika berpindah lebih dari 500 meter
				if (distMoved > 500) {
					const now = Date.now();
					// Hindari hit beruntun dalam kurang dari 2 detik (anti-spam fallback)
					if (now - lastGeocodeTime > 2000) {
						lastGeocodeLat = p.lat;
						lastGeocodeLon = p.lon;
						lastGeocodeTime = now;
						getReverseGeocode(p.lat, p.lon).then(name => currentAreaName = name);
					}
				}
			}
		}
	});

	function initMap() {
		if (!mapContainer || playbackData.length === 0) return;

		// Wait for modal transition to render container
		setTimeout(() => {
			if (!map) {
				map = L.map(mapContainer, { zoomControl: false }).setView([-6.8, 109.5], 10);
				L.control.zoom({ position: 'topright' }).addTo(map);
				L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
					attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
					maxZoom: 19
				}).addTo(map);
			}

			if (pathLine) map.removeLayer(pathLine);
			if (truckMarker) map.removeLayer(truckMarker);
			extraMarkers.forEach(m => map.removeLayer(m));
			extraMarkers = [];

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

			// Add Origin Marker
			if (tripData?.origin_lat && tripData?.origin_lon) {
				const originIcon = L.divIcon({
					html: `<div style="width: 24px; height: 24px; background: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"><span class="material-symbols-outlined" style="font-size: 14px; color: white;">home</span></div>`,
					className: 'origin-marker', iconSize: [24, 24], iconAnchor: [12, 12]
				});
				const m = L.marker([tripData.origin_lat, tripData.origin_lon], { icon: originIcon }).addTo(map)
					.bindPopup(`<b>Origin</b><br>${tripData.origin_name || 'N/A'}<br><span class="text-xs text-gray-500 loading-geocode" data-lat="${tripData.origin_lat}" data-lon="${tripData.origin_lon}">Loading location...</span>`);
				m.on('popupopen', (e) => fetchGeocode(e.popup, tripData.origin_lat, tripData.origin_lon));
				extraMarkers.push(m);
			}

			// Add Destination Marker
			if (tripData?.dest_lat && tripData?.dest_lon) {
				const destIcon = L.divIcon({
					html: `<div style="width: 24px; height: 24px; background: #ef4444; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"><span class="material-symbols-outlined" style="font-size: 14px; color: white;">flag</span></div>`,
					className: 'dest-marker', iconSize: [24, 24], iconAnchor: [12, 12]
				});
				const m = L.marker([tripData.dest_lat, tripData.dest_lon], { icon: destIcon }).addTo(map)
					.bindPopup(`<b>Destination</b><br>${tripData.dest_name || 'N/A'}<br><span class="text-xs text-gray-500 loading-geocode" data-lat="${tripData.dest_lat}" data-lon="${tripData.dest_lon}">Loading location...</span>`);
				m.on('popupopen', (e) => fetchGeocode(e.popup, tripData.dest_lat, tripData.dest_lon));
				extraMarkers.push(m);
			}

			// Helper Haversine dipindahkan ke atas

			const hasBackendStops = checkpointsData.some(cp => cp.event === 'STOP');

			const aggregatedPoolStops: Record<string, { lat: number, lon: number, mins: number, times: string[] }> = {};

			// Render Checkpoint/Stops Markers
			if (checkpointsData.length > 0) {
				checkpointsData.forEach(cp => {
					if (cp.lat && cp.lon) {
						const stopIcon = L.divIcon({
							html: `<div style="width: 20px; height: 20px; background: #ef4444; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"><span class="material-symbols-outlined" style="font-size: 12px; color: white;">front_hand</span></div>`,
							className: 'stop-marker', iconSize: [20, 20], iconAnchor: [10, 10]
						});
						const m = L.marker([cp.lat, cp.lon], { icon: stopIcon }).addTo(map)
							.bindPopup(`<b>${cp.event}</b><br>${cp.notes || ''}<br>${formatPlaybackTime(cp.recorded_at)}<br><span class="text-xs text-gray-500 loading-geocode" data-lat="${cp.lat}" data-lon="${cp.lon}">Loading location...</span>`);
						m.on('popupopen', (e) => fetchGeocode(e.popup, cp.lat, cp.lon));
						extraMarkers.push(m);
					}
				});
			}
			
			if (!hasBackendStops && playbackData.length > 0) {
				// Fallback Clustering Logic for old trips without checkpoints
				let i = 0;
				while (i < playbackData.length) {
					let startPoint = playbackData[i];
					let j = i + 1;
					while (j < playbackData.length) {
						let p = playbackData[j];
						let dist = getDistance(startPoint.lat, startPoint.lon, p.lat, p.lon);
						if (dist > 50) {
							let startT = new Date(startPoint.time).getTime();
							let endT = new Date(playbackData[j-1].time).getTime();
							let mins = (endT - startT) / 60000;
							if (mins >= 15) {
								// Cek jarak ke Origin & Dest
								let distToOrigin = tripData?.origin_lat ? getDistance(startPoint.lat, startPoint.lon, tripData.origin_lat, tripData.origin_lon) : 99999;
								let distToDest = tripData?.dest_lat ? getDistance(startPoint.lat, startPoint.lon, tripData.dest_lat, tripData.dest_lon) : 99999;
								
								// Cek apakah ada di dalam radius Pool mana pun
								let isInsidePool = false;
								let poolName = "Pool";
								for (const pool of poolsData) {
									if (pool.latitude && pool.longitude) {
										const d = getDistance(startPoint.lat, startPoint.lon, pool.latitude, pool.longitude);
										if (d <= (pool.geofence_radius || 200)) {
											isInsidePool = true;
											poolName = pool.nama_pool || "Pool";
											break;
										}
									}
								}
								
								// Abaikan jika sedang berada di dalam area Origin / Tujuan (radius 200m)
								if (distToOrigin > 200 && distToDest > 200) {
									if (!isInsidePool) {
										const stopIcon = L.divIcon({
											html: `<div style="width: 20px; height: 20px; background: #ef4444; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"><span class="material-symbols-outlined" style="font-size: 12px; color: white;">front_hand</span></div>`,
											className: 'stop-marker', iconSize: [20, 20], iconAnchor: [10, 10]
										});
										const m = L.marker([startPoint.lat, startPoint.lon], { icon: stopIcon }).addTo(map)
											.bindPopup(`<b>Stop</b><br>Dur: ${Math.round(mins)} min<br>At: ${formatPlaybackTime(startPoint.time)}<br><span class="text-xs text-gray-500 loading-geocode" data-lat="${startPoint.lat}" data-lon="${startPoint.lon}">Loading location...</span>`);
										m.on('popupopen', (e) => fetchGeocode(e.popup, startPoint.lat, startPoint.lon));
										extraMarkers.push(m);
									} else {
										// Agregasi pin khusus Parkir Pool
										if (!aggregatedPoolStops[poolName]) {
											aggregatedPoolStops[poolName] = { lat: startPoint.lat, lon: startPoint.lon, mins: 0, times: [] };
										}
										aggregatedPoolStops[poolName].mins += Math.round(mins);
										aggregatedPoolStops[poolName].times.push(`${formatPlaybackTime(startPoint.time)} - ${formatPlaybackTime(playbackData[j-1].time)}`);
									}
								}
							}
							break;
						}
						j++;
					}
					if (j === playbackData.length) {
						let startT = new Date(startPoint.time).getTime();
						let endT = new Date(playbackData[j-1].time).getTime();
						let mins = (endT - startT) / 60000;
						if (mins >= 15) {
							let distToOrigin = tripData?.origin_lat ? getDistance(startPoint.lat, startPoint.lon, tripData.origin_lat, tripData.origin_lon) : 99999;
							let distToDest = tripData?.dest_lat ? getDistance(startPoint.lat, startPoint.lon, tripData.dest_lat, tripData.dest_lon) : 99999;
							
							let isInsidePool = false;
							let poolName = "Pool";
							for (const pool of poolsData) {
								if (pool.latitude && pool.longitude) {
									const d = getDistance(startPoint.lat, startPoint.lon, pool.latitude, pool.longitude);
									if (d <= (pool.geofence_radius || 200)) {
										isInsidePool = true;
										poolName = pool.nama_pool || "Pool";
										break;
									}
								}
							}
							
							if (distToOrigin > 200 && distToDest > 200) {
								if (!isInsidePool) {
									const stopIcon = L.divIcon({
										html: `<div style="width: 20px; height: 20px; background: #ef4444; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"><span class="material-symbols-outlined" style="font-size: 12px; color: white;">front_hand</span></div>`,
										className: 'stop-marker', iconSize: [20, 20], iconAnchor: [10, 10]
									});
									const m = L.marker([startPoint.lat, startPoint.lon], { icon: stopIcon }).addTo(map)
										.bindPopup(`<b>Stop</b><br>Dur: ${Math.round(mins)} min<br>At: ${formatPlaybackTime(startPoint.time)}<br><span class="text-xs text-gray-500 loading-geocode" data-lat="${startPoint.lat}" data-lon="${startPoint.lon}">Loading location...</span>`);
									m.on('popupopen', (e) => fetchGeocode(e.popup, startPoint.lat, startPoint.lon));
									extraMarkers.push(m);
								} else {
									if (!aggregatedPoolStops[poolName]) {
										aggregatedPoolStops[poolName] = { lat: startPoint.lat, lon: startPoint.lon, mins: 0, times: [] };
									}
									aggregatedPoolStops[poolName].mins += Math.round(mins);
									aggregatedPoolStops[poolName].times.push(`${formatPlaybackTime(startPoint.time)} - ${formatPlaybackTime(playbackData[j-1].time)}`);
								}
							}
						}
						break;
					}
					i = j;
				}
			}

			// Render Aggregated Pool Stops
			Object.entries(aggregatedPoolStops).forEach(([pName, pData]) => {
				const parkIcon = L.divIcon({
					html: `<div style="width: 22px; height: 22px; background: #3b82f6; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"><span class="material-symbols-outlined" style="font-size: 14px; color: white;">local_parking</span></div>`,
					className: 'pool-park-marker', iconSize: [22, 22], iconAnchor: [11, 11]
				});
				const timesList = pData.times.join('<br> • ');
				const m = L.marker([pData.lat, pData.lon], { icon: parkIcon }).addTo(map)
					.bindPopup(`<b>Terparkir di ${pName}</b><br>Total Durasi: ${pData.mins} min<br><br><span class="text-xs text-gray-500">Waktu:</span><br> • ${timesList}<br><br><span class="text-xs text-gray-500 loading-geocode" data-lat="${pData.lat}" data-lon="${pData.lon}">Loading location...</span>`);
				m.on('popupopen', (e) => fetchGeocode(e.popup, pData.lat, pData.lon));
				extraMarkers.push(m);
			});
			// Add Rest Area Logs
			restAreaLogs.forEach(ra => {
				const p = ra.polygon_points ? JSON.parse(ra.polygon_points) : null;
				if (p && p.length > 0) {
					const lat = parseFloat(p[0].lat);
					const lon = parseFloat(p[0].lng || p[0].lon);
					const raIcon = L.divIcon({
						html: `<div style="width: 20px; height: 20px; background: #f59e0b; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"><span class="material-symbols-outlined" style="font-size: 12px; color: white;">local_cafe</span></div>`,
						className: 'ra-marker', iconSize: [20, 20], iconAnchor: [10, 10]
					});
					const m = L.marker([lat, lon], { icon: raIcon }).addTo(map)
						.bindPopup(`<b>Rest Area</b><br>${ra.nama_rest_area}<br>In: ${formatPlaybackTime(ra.enter_time)}<br>Dur: ${ra.duration_minutes} min<br><span class="text-xs text-gray-500 loading-geocode" data-lat="${lat}" data-lon="${lon}">Loading location...</span>`);
					m.on('popupopen', (e) => fetchGeocode(e.popup, lat, lon));
					extraMarkers.push(m);
				}
			});

			// Add Pools
			poolsData.forEach((pool: any) => {
				if (pool.latitude && pool.longitude) {
					const poolIcon = L.divIcon({
						html: `<div style="width: 24px; height: 24px; background: #3b82f6; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"><span class="material-symbols-outlined" style="font-size: 14px; color: white;">local_parking</span></div>`,
						className: 'pool-marker', iconSize: [24, 24], iconAnchor: [12, 12]
					});
					const m = L.marker([pool.latitude, pool.longitude], { icon: poolIcon }).addTo(map)
						.bindPopup(`<b>Pool</b><br>${pool.nama_pool}<br><span class="text-xs text-gray-500 loading-geocode" data-lat="${pool.latitude}" data-lon="${pool.longitude}">Loading location...</span>`);
					m.on('popupopen', (e) => fetchGeocode(e.popup, pool.latitude, pool.longitude));
					extraMarkers.push(m);
					
					// Draw Pool Radius
					const circle = L.circle([pool.latitude, pool.longitude], {
						color: '#3b82f6',
						fillColor: '#3b82f6',
						fillOpacity: 0.1,
						radius: pool.geofence_radius || 200,
						weight: 1,
						dashArray: '4'
					}).addTo(map);
					extraMarkers.push(circle);
				}
			});
		}, 300);
	}

	function closePlayback() {
		showPlaybackModal = false;
		pausePlayback();
		if (map) {
			map.remove();
			map = null;
			pathLine = null;
			truckMarker = null;
			extraMarkers.forEach(m => map.removeLayer(m));
			extraMarkers = [];
		}
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

<div class="flex flex-col h-full space-y-6">
	<!-- Header & Actions -->
	<header class="flex flex-col md:flex-row md:items-end justify-between gap-4 flex-shrink-0">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-blue-600 dark:text-blue-400 text-2xl">history</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Route History & Playback</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-sm mt-0.5">
				Riwayat perjalanan logistik, pemutaran ulang rute GPS (playback), dan analitik efisiensi kecepatan
			</p>
		</div>
		<div class="flex gap-2.5">
			<button class="bg-surface-container-low border border-slate-200 dark:border-slate-800 text-on-surface px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-surface-container transition-colors shadow-xs">
				<span class="material-symbols-outlined text-lg">download</span>
				<span>Export History</span>
			</button>
		</div>
	</header>

	<!-- Stats Cards (Bento) -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Trips</p>
					<h3 class="text-2xl font-black text-on-surface mt-1">{stats.totalTrips}</h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">route</span>
				</div>
			</div>
			<p class="text-xs text-on-surface-variant mt-2">Seluruh catatan perjalanan</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Distance</p>
					<h3 class="text-2xl font-black text-blue-600 mt-1">{stats.totalDistance.toLocaleString('id-ID')} km</h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">distance</span>
				</div>
			</div>
			<p class="text-xs text-blue-600 font-medium mt-2">Akumulasi jarak tempuh</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Avg. Speed</p>
					<h3 class="text-2xl font-black text-emerald-600 mt-1">{stats.avgSpeed} <span class="text-xs font-medium text-on-surface-variant">km/h</span></h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">speed</span>
				</div>
			</div>
			<p class="text-xs text-emerald-600 font-medium mt-2">Kecepatan rata-rata armada</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Fuel Used</p>
					<h3 class="text-2xl font-black text-amber-600 mt-1">{stats.totalFuel.toLocaleString('id-ID')} L</h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">local_gas_station</span>
				</div>
			</div>
			<p class="text-xs text-amber-600 font-medium mt-2">Konsumsi BBM tercatat</p>
		</div>
	</div>

	<!-- Unified Filter & Search Bar -->
	<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 flex flex-col md:flex-row gap-4 items-center justify-between shadow-xs">
		<!-- Tabs (Segmented Control Status History) -->
		<div class="inline-flex p-1 rounded-2xl bg-surface-container border border-slate-200 dark:border-slate-800 overflow-x-auto max-w-full">
			{#each ['All', 'Completed', 'In Progress'] as tab}
				<button 
					class="px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer {statusFilter === tab
						? 'bg-surface text-blue-600 dark:text-blue-400 shadow-xs'
						: 'text-on-surface-variant hover:text-on-surface'}"
					onclick={() => handleStatusClick(tab)}>
					{tab === 'All' ? 'Semua Status' : tab}
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
				placeholder="Cari nopol unit, driver, rute..." 
				class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl py-2 pl-10 pr-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/40 placeholder:text-slate-400" 
			/>
		</div>
	</div>

	<!-- Data Table -->
	<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs flex-1 flex flex-col">
		<div class="overflow-x-auto flex-1">
			<table class="w-full text-left text-sm min-w-[1200px]">
				<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
					<tr>
						<th class="py-3.5 px-5">Informasi Trip</th>
						<th class="py-3.5 px-5">Unit & Driver</th>
						<th class="py-3.5 px-5">Rute & Jarak</th>
						<th class="py-3.5 px-5">Performa & Konsumsi</th>
						<th class="py-3.5 px-5">Status</th>
						<th class="py-3.5 px-5 text-right">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
					{#each history as trip}
						<tr class="group hover:bg-surface-container-low transition-colors">
							<td class="py-3.5 px-5">
								<div class="flex flex-col gap-0.5">
									<span class="text-sm font-bold text-on-surface font-mono">{trip.id}</span>
									<span class="text-[10px] font-medium text-on-surface-variant">{trip.startDate}</span>
									{#if trip.endDate !== '-'}
										<span class="text-[10px] font-medium text-emerald-600">→ {trip.endDate}</span>
									{/if}
								</div>
							</td>
							<td class="py-3.5 px-5">
								<div class="flex items-center gap-3">
									<div class="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
										<span class="material-symbols-outlined text-[18px]">local_shipping</span>
									</div>
									<div>
										<p class="text-sm font-bold text-on-surface">{trip.unit}</p>
										<p class="text-[11px] text-on-surface-variant font-medium uppercase tracking-wider">{trip.driver}</p>
									</div>
								</div>
							</td>
							<td class="py-3.5 px-5">
								<div class="flex flex-col gap-1">
									<div class="flex items-center gap-1.5">
										<span class="material-symbols-outlined text-[14px] text-blue-500">route</span>
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
							<td class="py-3.5 px-5">
								<div class="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
									<div class="flex items-center gap-1.5">
										<span class="material-symbols-outlined text-[13px] text-blue-500">speed</span>
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
							<td class="py-3.5 px-5">
								{#if trip.status === 'Completed'}
									<span class="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] bg-emerald-500/10 px-2.5 py-1 rounded-md uppercase tracking-wider border border-emerald-500/20">
										<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Completed
									</span>
								{:else}
									<span class="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold text-[11px] bg-blue-500/10 px-2.5 py-1 rounded-md uppercase tracking-wider border border-blue-500/20">
										<span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span> In Progress
									</span>
								{/if}
							</td>
							<td class="py-3.5 px-5 text-right">
								<div class="flex items-center justify-end gap-2">
									<button class="px-3 py-1.5 rounded-lg bg-blue-600/10 text-blue-600 hover:bg-blue-600/20 transition-colors text-xs font-bold flex items-center gap-1.5 cursor-pointer" onclick={() => openPlayback(trip.id)} title="Play route animation">
										<span class="material-symbols-outlined text-[16px]">play_circle</span>
										<span>Playback</span>
									</button>
								</div>
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan="6" class="py-20 text-center">
								<span class="material-symbols-outlined text-5xl text-on-surface-variant/30 block mb-3">history</span>
								<p class="text-on-surface-variant font-semibold">Tidak ada riwayat perjalanan</p>
								<p class="text-xs text-on-surface-variant/60 mt-1">Coba ubah filter atau kata kunci pencarian</p>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		
		<!-- Pagination Footer -->
		<div class="px-5 py-3.5 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between bg-surface-container-low">
			<p class="text-xs text-on-surface-variant font-medium">
				Menampilkan <span class="font-bold text-on-surface">{startItem}–{endItem}</span> dari <span class="font-bold text-on-surface">{meta?.total || 0}</span> perjalanan
			</p>
			<div class="flex gap-1">
				<button class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40 transition-colors" disabled={currentPage <= 1} onclick={() => goToPage(currentPage - 1)}>
					<span class="material-symbols-outlined text-lg">chevron_left</span>
				</button>
				{#each Array(totalPages) as _, i}
					<button class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shadow-xs transition-colors {currentPage === i + 1 ? 'bg-blue-600 text-white' : 'text-on-surface hover:bg-surface-container-high'}" onclick={() => goToPage(i + 1)}>
						{i + 1}
					</button>
				{/each}
				<button class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40 transition-colors" disabled={currentPage >= totalPages} onclick={() => goToPage(currentPage + 1)}>
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
			<div class="absolute top-4 left-4 z-[400] bg-surface-container-lowest/95 backdrop-blur-md px-4 py-3 rounded-2xl shadow-lg border border-surface-container/50 min-w-[200px]">
				<div class="flex items-start gap-3">
					<div class="w-10 h-10 rounded-full bg-sky-50 flex items-center justify-center shrink-0">
						<span class="material-symbols-outlined text-sky-500">speed</span>
					</div>
					<div class="flex flex-col">
						<span class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Kecepatan Real-time</span>
						<span class="text-2xl font-black text-on-surface leading-none mt-1 mb-1">{currentPlaybackSpeed} <span class="text-sm font-semibold text-on-surface-variant">km/h</span></span>
						<div class="flex items-center gap-1 text-slate-500 mt-0.5" title={currentAreaName}>
							<span class="material-symbols-outlined text-[12px]">location_on</span>
							<span class="text-[10px] font-medium truncate w-40">{currentAreaName}</span>
						</div>
					</div>
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
						<span>{playbackData.length > 0 ? formatPlaybackTime(playbackData[currentPointIndex]?.time) : '00:00'}</span>
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
