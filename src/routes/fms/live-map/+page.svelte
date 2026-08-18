<script lang="ts">
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import type { PageData } from './$types';
	import Geofence3DMap from '$lib/components/Geofence3DMap.svelte';

	let { data }: { data: PageData } = $props();
	
	let units = $derived(data.units || []);

	// 3D Geofence Map state
	let show3DGeofenceModal = $state(false);

	let searchQuery = $state('');
	let filterStatus = $state('All');
	let displayUnits = $derived(units.filter((u: any) => {
		const searchLower = searchQuery.toLowerCase();
		const matchSearch = u.id.toLowerCase().includes(searchLower) || 
							u.driver.toLowerCase().includes(searchLower) ||
							(u.customer && u.customer.toLowerCase().includes(searchLower));
		const matchStatus = filterStatus === 'All' || u.status === filterStatus;
		return matchSearch && matchStatus;
	}));

	let isSyncing = $state(false);
	let syncMessage = $state('');
	async function runGeofenceSync() {
		isSyncing = true;
		try {
			const res = await fetch('/api/cron/geofence');
			const result = await res.json();
			if (result.success) {
				syncMessage = result.message;
				if (result.logs && result.logs.length > 0) alert('Auto-Pilot Logs:\n' + result.logs.join('\n'));
				invalidateAll();
			}
		} catch (e) {
			console.error("Geofence error", e);
		}
		isSyncing = false;
		setTimeout(() => syncMessage = '', 4000);
	}

	let selectedUnitId = $state<string | null>(null);
	let selectedUnit = $derived(displayUnits.find((u: any) => u.id === selectedUnitId) || null);
	let showInCar = $state(false);
	let isInitialFlyTo = $state(false);
	let isFullScreen = $state(false);
	let isSidebarCollapsed = $state(false);

	$effect(() => {
		// Invalidate map size when full screen toggled
		if (isFullScreen !== undefined && map) {
			setTimeout(() => {
				map.invalidateSize();
			}, 350);
		}
	});
	
	let routeMeta = $state<{dist: string, eta: string} | null>(null);
	let roadSteps = $state<{currentRoad: string | null, nextRoad: string | null}>({ currentRoad: null, nextRoad: null });

	$effect(() => {
		// Reset route meta when selected unit changes
		if (selectedUnitId) routeMeta = null;
	});

	$effect(() => {
		// Fetch next road name dari OSRM saat unit aktif dipilih dan punya koordinat tujuan
		roadSteps = { currentRoad: null, nextRoad: null };
		if (selectedUnit && selectedUnit.destLat && selectedUnit.destLng) {
			fetch(`/api/fms/road-steps?lat=${selectedUnit.lat}&lng=${selectedUnit.lng}&destLat=${selectedUnit.destLat}&destLng=${selectedUnit.destLng}`)
				.then(r => r.json())
				.then(d => { roadSteps = d; })
				.catch(() => {});
		} else if (selectedUnit) {
			// Fallback: pakai nama jalan dari GPS addr
			roadSteps = { currentRoad: selectedUnit.streetName || null, nextRoad: null };
		}
	});

	// ==============================
	// Haversine Distance (km)
	// ==============================
	function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
		const R = 6371;
		const dLat = (lat2 - lat1) * Math.PI / 180;
		const dLng = (lng2 - lng1) * Math.PI / 180;
		const a = Math.sin(dLat / 2) ** 2 +
			Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
			Math.sin(dLng / 2) ** 2;
		return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	}

	// Units within 5–10 km (excluding self), sorted by distance
	let nearbyUnits = $derived(
		selectedUnit
			? displayUnits
				.filter((u: any) => u.id !== selectedUnit!.id)
				.map((u: any) => ({
					...u,
					distanceKm: haversine(selectedUnit!.lat, selectedUnit!.lng, u.lat, u.lng)
				}))
				.filter((u: any) => u.distanceKm >= 0 && u.distanceKm <= 10)
				.sort((a: any, b: any) => a.distanceKm - b.distanceKm)
			: []
	);

	// Traffic warning: speed < 5 km/h but status is Moving
	let isTrafficJam = $derived(
		selectedUnit
			? selectedUnit.speed < 5 && selectedUnit.status === 'Moving'
			: false
	);
	let isSlowTraffic = $derived(
		selectedUnit
			? selectedUnit.speed >= 5 && selectedUnit.speed < 20 && selectedUnit.status === 'Moving'
			: false
	);

	// Road color based on speed
	let roadColor = $derived(
		!selectedUnit || selectedUnit.speed === 0
			? '#1a3a5c'
			: isTrafficJam
				? '#7f1d1d'
				: isSlowTraffic
					? '#78350f'
					: selectedUnit.speed < 60
						? '#14532d'
						: '#1e3a8a'
	);
	let roadGlowColor = $derived(
		!selectedUnit || selectedUnit.speed === 0
			? '#64748b'
			: isTrafficJam
				? '#ef4444'
				: isSlowTraffic
					? '#f59e0b'
					: '#10b981'
	);
	let roadLabel = $derived(
		!selectedUnit || selectedUnit.speed === 0
			? 'DIAM'
			: isTrafficJam
				? '⚠ MACET'
				: isSlowTraffic
					? '⚠ LAMBAT'
					: 'LANCAR'
	);

	// ==============================
	// Speedometer
	// ==============================
	let displaySpeed = $state(0);
	let speedInterval: any;

	$effect(() => {
		if (showInCar && selectedUnit) {
			const target = selectedUnit.speed || 0;
			clearInterval(speedInterval);
			let current = displaySpeed;
			speedInterval = setInterval(() => {
				const diff = target - current;
				if (Math.abs(diff) < 0.5) { current = target; clearInterval(speedInterval); }
				else { current += diff * 0.12; }
				displaySpeed = Math.round(current);
			}, 40);
		} else if (!showInCar) {
			displaySpeed = 0;
		}
	});

	function getSpeedometerArc(speed: number, maxSpeed = 140): string {
		const pct = Math.min(speed / maxSpeed, 1);
		const startAngle = -220 * (Math.PI / 180);
		const endAngle = startAngle + pct * (260 * Math.PI / 180);
		const r = 68;
		const cx = 85, cy = 85;
		const x1 = cx + r * Math.cos(startAngle);
		const y1 = cy + r * Math.sin(startAngle);
		const x2 = cx + r * Math.cos(endAngle);
		const y2 = cy + r * Math.sin(endAngle);
		const largeArc = pct * 260 > 180 ? 1 : 0;
		return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
	}

	function needleAngle(speed: number, maxSpeed = 140): string {
		const pct = Math.min(speed / maxSpeed, 1);
		// Arc starts at math angle -220° = SVG screen angle 140° CW from right (lower-left).
		// Needle tip naturally points UP = 270° CW from right.
		// At pct=0: rotate = 140 - 270 = -130°
		// At pct=1: rotate = 400 - 270 = +130° (clockwise 260° total sweep)
		const angle = -130 + pct * 260;
		return `rotate(${angle}, 85, 90)`;
	}

	function speedArcColor(speed: number): string {
		if (speed === 0) return '#334155';
		if (speed < 20) return '#ef4444';
		if (speed < 50) return '#f59e0b';
		if (speed < 90) return '#10b981';
		return '#3b82f6';
	}

	// ==============================
	// Map helpers
	// ==============================
	let mapContainer: HTMLDivElement;
	let map: any;
	let L: any;
	let mapLayers: any[] = [];
	let mapReady = $state(false);

	// ==============================
	// Real-time Smooth Lerp Tracking
	// ==============================
	// Map of unit id → { marker, currentLat, currentLng, targetLat, targetLng, lerpRaf }
	type MarkerEntry = {
		marker: any;
		currentLat: number;
		currentLng: number;
		targetLat: number;
		targetLng: number;
		lerpRaf?: number;
	};
	const liveMarkers = new Map<string, MarkerEntry>();

	// Live units state — updated by client-side polling WITHOUT full page reload
	let liveUnits = $state<any[]>([]);
	// Merge server-side units (rich data) with live positions (real-time coords)
	let mergedUnits = $derived.by(() => {
		if (liveUnits.length === 0) return units;
		const liveMap = new Map(liveUnits.map((u: any) => [u.id, u]));
		return units.map((u: any) => {
			const live = liveMap.get(u.id);
			if (!live) return u;
			return { ...u, lat: live.lat, lng: live.lng, speed: live.speed, direction: live.direction, status: live.status };
		});
	});

	// Smooth lerp animation for a single marker
	function lerpMarker(entry: MarkerEntry) {
		const LERP_SPEED = 0.04; // ~2.5% per frame = smooth over ~10s
		const dlat = entry.targetLat - entry.currentLat;
		const dlng = entry.targetLng - entry.currentLng;
		if (Math.abs(dlat) < 0.000005 && Math.abs(dlng) < 0.000005) {
			entry.currentLat = entry.targetLat;
			entry.currentLng = entry.targetLng;
			entry.marker.setLatLng([entry.currentLat, entry.currentLng]);
			return;
		}
		entry.currentLat += dlat * LERP_SPEED;
		entry.currentLng += dlng * LERP_SPEED;
		entry.marker.setLatLng([entry.currentLat, entry.currentLng]);
		entry.lerpRaf = requestAnimationFrame(() => lerpMarker(entry));
	}

	// Fetch fresh GPS positions and smoothly animate all markers
	async function fetchAndAnimatePositions() {
		try {
			const res = await fetch('/api/fms/live-positions');
			if (!res.ok) return;
			const { positions } = await res.json() as { positions: any[] };

			// Update liveUnits (triggers mergedUnits reactivity for sidebar)
			liveUnits = positions;

			// Smoothly animate existing Leaflet markers to new positions
			for (const pos of positions) {
				const entry = liveMarkers.get(pos.id);
				if (!entry) continue;
				// Cancel previous lerp animation
				if (entry.lerpRaf) cancelAnimationFrame(entry.lerpRaf);
				// Set new target
				entry.targetLat = pos.lat;
				entry.targetLng = pos.lng;
				// Start smooth lerp
				entry.lerpRaf = requestAnimationFrame(() => lerpMarker(entry));
			}
		} catch (_) { /* silent fail */ }
	}

	// Bearing derajat → nama arah kompas
	function bearingToDirection(deg: number): { label: string; icon: string; color: string } {
		const d = ((deg % 360) + 360) % 360;
		if (d >= 337.5 || d < 22.5)  return { label: 'Utara',       icon: 'north',       color: 'text-blue-500' };
		if (d < 67.5)                 return { label: 'Timur Laut',  icon: 'north_east',  color: 'text-cyan-500' };
		if (d < 112.5)                return { label: 'Timur',       icon: 'east',        color: 'text-emerald-500' };
		if (d < 157.5)                return { label: 'Tenggara',    icon: 'south_east',  color: 'text-teal-500' };
		if (d < 202.5)                return { label: 'Selatan',     icon: 'south',       color: 'text-amber-500' };
		if (d < 247.5)                return { label: 'Barat Daya',  icon: 'south_west',  color: 'text-orange-500' };
		if (d < 292.5)                return { label: 'Barat',       icon: 'west',        color: 'text-rose-500' };
		                              return { label: 'Barat Laut',  icon: 'north_west',  color: 'text-purple-500' };
	}

	function getStatusColor(status: string): string {
		switch(status) {
			case 'Moving': return '#3b82f6';
			case 'Transit': return '#f59e0b';
			case 'Loading': return '#6366f1';
			case 'Available': return '#10b981';
			case 'Maintenance': return '#f97316';
			default: return '#64748b';
		}
	}
	function getStatusBadge(status: string): string {
		switch(status) {
			case 'Moving': return 'text-blue-600 bg-blue-500/10 border-blue-500/20';
			case 'Transit': return 'text-amber-600 bg-amber-500/10 border-amber-500/20';
			case 'Loading': return 'text-indigo-600 bg-indigo-500/10 border-indigo-500/20';
			case 'Available': return 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20';
			case 'Maintenance': return 'text-orange-600 bg-orange-500/10 border-orange-500/20';
			default: return 'text-slate-600 bg-slate-500/10 border-slate-500/20';
		}
	}
	function getStatusDot(status: string): string {
		switch(status) {
			case 'Moving': return 'bg-blue-500 animate-pulse';
			case 'Transit': return 'bg-amber-500';
			case 'Loading': return 'bg-indigo-500 animate-pulse';
			case 'Available': return 'bg-emerald-500';
			case 'Maintenance': return 'bg-orange-500';
			default: return 'bg-slate-400';
		}
	}

	onMount(async () => {
		L = await import('leaflet');
		await import('leaflet/dist/leaflet.css');
		map = L.map(mapContainer, { zoomControl: false }).setView([-6.8, 109.5], 7);
		L.control.zoom({ position: 'topright' }).addTo(map);
		L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
			attribution: '&copy; OpenStreetMap &copy; CARTO',
			subdomains: 'abcd', maxZoom: 19
		}).addTo(map);
		setTimeout(() => { 
			map.invalidateSize(); 
			mapReady = true;

			// Draw Geofence Pools from DB
			const pools = data.pools || [];
			pools.forEach(p => {
				const circle = L.circle([p.lat, p.lng], {
					color: '#10b981',
					fillColor: '#10b981',
					fillOpacity: 0.15,
					weight: 2,
					radius: p.radiusMeters
				}).addTo(map);
				circle.bindTooltip(`<div class="font-bold text-xs text-emerald-700">${p.name}</div>`, { permanent: true, direction: 'center', className: 'bg-transparent border-none shadow-none text-center' });
			});

			// Auto-select unit dari query param ?unit= (normalize spasi & case)
			const paramUnit = new URL(window.location.href).searchParams.get('unit');
			if (paramUnit) {
				const paramNorm = paramUnit.replace(/\s+/g, '').toUpperCase();
				const target = units.find((u: any) => 
					(u.id || '').replace(/\s+/g, '').toUpperCase() === paramNorm
				);
				if (target) {
					isInitialFlyTo = true;
					selectedUnitId = target.id;
					map.flyTo([target.lat, target.lng], 15, { animate: true, duration: 1.2 });
					setTimeout(() => { isInitialFlyTo = false; }, 2000);
				}
			}
		}, 300);

		// Start real-time smooth-lerp polling every 10s (no full page reload)
		fetchAndAnimatePositions(); // initial fetch
		const posInterval = setInterval(fetchAndAnimatePositions, 10000);

		return () => { 
			clearInterval(posInterval);
			clearInterval(speedInterval);
			// Cancel all active lerp animations
			for (const entry of liveMarkers.values()) {
				if (entry.lerpRaf) cancelAnimationFrame(entry.lerpRaf);
			}
			if (map) map.remove(); 
		};
	});

	$effect(() => {
		if (mapReady && mergedUnits) {
			// Remove old marker layers
			mapLayers.forEach(l => l.remove());
			mapLayers = [];

			// Cancel any active lerp animations and clear registry
			for (const entry of liveMarkers.values()) {
				if (entry.lerpRaf) cancelAnimationFrame(entry.lerpRaf);
			}
			liveMarkers.clear();

			mergedUnits.forEach((unit: any) => {
				const color = getStatusColor(unit.status);
				const isSelected = unit.id === selectedUnitId;
				const icon = L.divIcon({
					html: `
						<div style="position:relative;transition:transform 0.2s;${isSelected ? 'transform:scale(1.3)' : ''}">
							<div style="width:36px;height:36px;border-radius:12px;background:${color};display:flex;align-items:center;justify-content:center;box-shadow:0 0 ${isSelected ? '24px' : '12px'} ${color}${isSelected ? 'dd' : '70'},0 2px 8px rgba(0,0,0,0.25);border:${isSelected ? '3px' : '2px'} solid #fff;">
								<span class="material-symbols-outlined" style="font-size:18px;color:white;${(unit.direction && unit.direction > 180 && unit.direction < 360) ? 'transform:scaleX(-1);' : ''}">local_shipping</span>
							</div>
							<div style="position:absolute;top:-6px;right:-6px;width:10px;height:10px;border-radius:50%;background:${unit.speed > 0 ? '#10b981' : '#94a3b8'};border:2px solid #fff;"></div>
						</div>
					`,
					className: '', iconSize: [36, 36], iconAnchor: [18, 18]
				});

				const marker = L.marker([unit.lat, unit.lng], { icon }).addTo(map);
				marker.bindPopup(`
					<div style="font-family:system-ui;min-width:200px;padding:6px;">
						<div style="font-weight:800;font-size:13px;color:#1e293b;">${unit.id}</div>
						<div style="font-size:10px;color:#64748b;margin-bottom:6px;">${unit.driver}</div>
						${unit.origin !== '-' ? `<div style="font-size:11px;color:#64748b;"><b>${unit.origin}</b> → <b>${unit.destination}</b></div>` : '<div style="font-size:11px;color:#64748b;">Standby at Pool</div>'}
						${unit.speed > 0 ? `<div style="font-size:12px;color:${color};font-weight:700;margin-top:4px;">${unit.speed} km/h</div>` : ''}
						${unit.speed < 5 && unit.status === 'Moving' ? `<div style="font-size:10px;color:#ef4444;font-weight:700;margin-top:4px;">⚠ Kendaraan melambat — kemungkinan kemacetan di sekitar lokasi ini</div>` : ''}
					</div>
				`, { className: 'custom-popup' });

				marker.on('click', () => { 
					selectedUnitId = unit.id; 
					map.flyTo([unit.lat, unit.lng], 13, { animate: true, duration: 0.8 });
				});
				mapLayers.push(marker);

				// Register to liveMarkers for smooth lerp animation
				liveMarkers.set(unit.id, {
					marker,
					currentLat: unit.lat,
					currentLng: unit.lng,
					targetLat: unit.lat,
					targetLng: unit.lng
				});
			});

			if (selectedUnit) {
				// Jangan panTo jika sedang flyTo dari URL param (Track Live)
				if (!isInitialFlyTo) {
					map.panTo([selectedUnit.lat, selectedUnit.lng], { animate: true, duration: 0.5 });
				}

				if (selectedUnit.originLat && selectedUnit.originLng && selectedUnit.destLat && selectedUnit.destLng) {
					// 1. Fetch Planned Route (Origin -> Destination) - drawn faintly
					fetch(`/api/fms/route?startLat=${selectedUnit.originLat}&startLng=${selectedUnit.originLng}&endLat=${selectedUnit.destLat}&endLng=${selectedUnit.destLng}`)
						.then(r => r.json())
						.then(routeData => {
							if (routeData.coordinates && routeData.coordinates.length > 1) {
								const plannedLine = L.polyline(routeData.coordinates, {
									color: '#94a3b8', weight: 4, opacity: 0.4, dashArray: '8, 12', lineJoin: 'round', lineCap: 'round'
								}).addTo(map);
								mapLayers.push(plannedLine);
							} else {
								const fl = L.polyline([[selectedUnit!.originLat, selectedUnit!.originLng],[selectedUnit!.destLat, selectedUnit!.destLng]], { color: '#94a3b8', weight: 3, dashArray: '8,12', opacity: 0.4 }).addTo(map);
								mapLayers.push(fl);
							}
						}).catch(() => {});

					// 2. Fetch Active Route (Current Truck -> Destination) - drawn boldly
					fetch(`/api/fms/route?startLat=${selectedUnit.lat}&startLng=${selectedUnit.lng}&endLat=${selectedUnit.destLat}&endLng=${selectedUnit.destLng}`)
						.then(r => r.json())
						.then(routeData => {
							if (routeData.distance && routeData.duration) {
								const d = new Date();
								d.setSeconds(d.getSeconds() + routeData.duration);
								routeMeta = {
									dist: (routeData.distance / 1000).toFixed(1) + ' km',
									eta: d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
								};
							}
							if (routeData.coordinates && routeData.coordinates.length > 1) {
								const lineColor = isTrafficJam ? '#ef4444' : isSlowTraffic ? '#f59e0b' : getStatusColor(selectedUnit!.status);
								const roadLine = L.polyline(routeData.coordinates, {
									color: lineColor, weight: 6, opacity: 0.9, lineJoin: 'round', lineCap: 'round'
								}).addTo(map);
								mapLayers.push(roadLine);
								const dashOverlay = L.polyline(routeData.coordinates, {
									color: '#ffffff', weight: 2, opacity: 0.5, dashArray: '8, 18'
								}).addTo(map);
								mapLayers.push(dashOverlay);
							} else {
								const fallbackLine = L.polyline([[selectedUnit!.lat, selectedUnit!.lng], [selectedUnit!.destLat, selectedUnit!.destLng]], { 
									color: getStatusColor(selectedUnit!.status), weight: 4, dashArray: '8,8', opacity: 0.7 
								}).addTo(map);
								mapLayers.push(fallbackLine);
							}
						}).catch(() => {
							const fallbackLine = L.polyline([[selectedUnit!.lat, selectedUnit!.lng], [selectedUnit!.destLat, selectedUnit!.destLng]], { 
								color: getStatusColor(selectedUnit!.status), weight: 4, dashArray: '8,8', opacity: 0.7 
							}).addTo(map);
							mapLayers.push(fallbackLine);
						});

					const originM = L.circleMarker([selectedUnit.originLat, selectedUnit.originLng], {
						radius: 7, fillColor: '#fff', color: getStatusColor(selectedUnit.status), weight: 3, fillOpacity: 1
					}).addTo(map);
					originM.bindPopup("<div style='font-family:system-ui;font-size:11px;font-weight:700;'>📍 Titik Berangkat (Origin)</div>");
					mapLayers.push(originM);

					// Draw Origin Geofence
					if (selectedUnit.originPolygon && selectedUnit.originPolygon.length > 2) {
						const pts = selectedUnit.originPolygon.map((p: any) => [p.lat, p.lng]);
						const originGeo = L.polygon(pts, {
							color: getStatusColor(selectedUnit.status),
							weight: 2,
							fillColor: getStatusColor(selectedUnit.status),
							fillOpacity: 0.15,
							dashArray: '5, 5'
						}).addTo(map);
						mapLayers.push(originGeo);
					} else {
						const originGeo = L.circle([selectedUnit.originLat, selectedUnit.originLng], {
							radius: selectedUnit.originRad || 2000,
							color: getStatusColor(selectedUnit.status),
							weight: 2,
							fillColor: getStatusColor(selectedUnit.status),
							fillOpacity: 0.1,
							dashArray: '5, 5'
						}).addTo(map);
						mapLayers.push(originGeo);
					}
				}

				if (selectedUnit.destLat && selectedUnit.destLng) {
					const destM = L.circleMarker([selectedUnit.destLat, selectedUnit.destLng], {
						radius: 7, fillColor: '#fff', color: '#ef4444', weight: 3, fillOpacity: 1
					}).addTo(map);
					destM.bindPopup("<div style='font-family:system-ui;font-size:11px;font-weight:700;'>🎯 Titik Tujuan (Destination)</div>");
					mapLayers.push(destM);

					// Draw Destination Geofence
					if (selectedUnit.destPolygon && selectedUnit.destPolygon.length > 2) {
						const pts = selectedUnit.destPolygon.map((p: any) => [p.lat, p.lng]);
						const destGeo = L.polygon(pts, {
							color: '#ef4444',
							weight: 2,
							fillColor: '#ef4444',
							fillOpacity: 0.15,
							dashArray: '5, 5'
						}).addTo(map);
						mapLayers.push(destGeo);
					} else {
						const destGeo = L.circle([selectedUnit.destLat, selectedUnit.destLng], {
							radius: selectedUnit.destRad || 2000,
							color: '#ef4444',
							weight: 2,
							fillColor: '#ef4444',
							fillOpacity: 0.1,
							dashArray: '5, 5'
						}).addTo(map);
						mapLayers.push(destGeo);
					}
				}
			}
		}
	});
</script>

<svelte:head>
	<title>Live Map | FMS</title>
	<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
</svelte:head>

<!-- ============================================================ -->
<!-- IN-CAR COCKPIT VIEW MODAL                                   -->
<!-- ============================================================ -->
{#if showInCar && selectedUnit}
<div class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm" role="dialog">
	<div class="relative w-full max-w-3xl mx-4 rounded-3xl overflow-hidden shadow-2xl cockpit-wrapper">

		<!-- ===== COCKPIT HEADER BAR ===== -->
		<div class="cockpit-header">
			<div class="flex items-center gap-2.5">
				<div class="w-8 h-8 rounded-lg flex items-center justify-center" style="background:{getStatusColor(selectedUnit.status)}22;border:1px solid {getStatusColor(selectedUnit.status)}44">
					<span class="material-symbols-outlined text-base" style="color:{getStatusColor(selectedUnit.status)}">local_shipping</span>
				</div>
				<div>
					<p class="text-sm font-black text-white leading-tight">{selectedUnit.id}</p>
					<p class="text-[10px] text-slate-400 leading-tight">{selectedUnit.driver}</p>
				</div>
			</div>

			<!-- Traffic warning inline -->
			{#if isTrafficJam || isSlowTraffic}
				<div class="flex items-center gap-2 px-3 py-1.5 rounded-lg flex-1 mx-4" style="background:rgba({isTrafficJam ? '127,29,29' : '120,53,15'},0.8);border:1px solid {isTrafficJam ? '#ef4444' : '#f59e0b'}55">
					<span class="material-symbols-outlined text-sm flex-shrink-0" style="color:{isTrafficJam ? '#ef4444' : '#f59e0b'}">warning</span>
					<p class="text-[10px] leading-tight" style="color:{isTrafficJam ? '#fca5a5' : '#fcd34d'}">
						{isTrafficJam ? 'MACET — Kendaraan berhenti/lambat di ' : 'PADAT — Kendaraan melambat di '}{selectedUnit.lat.toFixed(3)}, {selectedUnit.lng.toFixed(3)}
					</p>
				</div>
			{:else}
				<div class="flex-1"></div>
			{/if}

			<button onclick={() => { showInCar = false; displaySpeed = 0; }}
				class="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white flex-shrink-0">
				<span class="material-symbols-outlined text-base">close</span>
			</button>
		</div>

		<!-- ===== SIDE MIRRORS (inside road viewport) ===== -->

		<!-- ===== ROAD VIEWPORT ===== -->
		<div class="road-viewport" style="--road-color:{roadColor};--road-glow:{roadGlowColor};">

			<!-- Mirror Row at top of road viewport -->
			<div class="mirror-row">
				<!-- Left Mirror -->
				<div class="mirror-box">
					<div class="mirror-content">
						{#if nearbyUnits.length > 0}
							{@const leftUnit = nearbyUnits[0]}
							<span class="material-symbols-outlined" style="font-size:16px;color:{getStatusColor(leftUnit.status)}">local_shipping</span>
							<p class="mirror-nopol">{leftUnit.id}</p>
							<p class="mirror-dist">{leftUnit.distanceKm.toFixed(1)} km · {leftUnit.speed} km/h</p>
						{:else}
							<span class="material-symbols-outlined" style="font-size:14px;color:#334155">directions_car</span>
							<p class="mirror-dist">Tidak ada unit</p>
						{/if}
					</div>
					<div class="mirror-label">Spion Kiri</div>
				</div>

				<!-- Center: status badge -->
				<div class="flex-1 flex items-start justify-center pt-2">
					<span class="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest"
						style="background:{roadGlowColor}22;border:1px solid {roadGlowColor}55;color:{roadGlowColor}">
						{roadLabel}
					</span>
				</div>

				<!-- Right Mirror -->
				<div class="mirror-box">
					<div class="mirror-content">
						{#if nearbyUnits.length > 1}
							{@const rightUnit = nearbyUnits[1]}
							<span class="material-symbols-outlined" style="font-size:16px;color:{getStatusColor(rightUnit.status)}">local_shipping</span>
							<p class="mirror-nopol">{rightUnit.id}</p>
							<p class="mirror-dist">{rightUnit.distanceKm.toFixed(1)} km · {rightUnit.speed} km/h</p>
						{:else}
							<span class="material-symbols-outlined" style="font-size:14px;color:#334155">directions_car</span>
							<p class="mirror-dist">Tidak ada unit</p>
						{/if}
					</div>
					<div class="mirror-label">Spion Kanan</div>
				</div>
			</div>

			<!-- Sky -->
			<div class="sky-layer"></div>

			<!-- Road surface -->
			<div class="road-3d-wrapper">
				<div class="road-plane" style="background: linear-gradient(180deg, {roadColor} 0%, {roadColor}ee 100%);">
					<!-- Road shoulder lines -->
					<div class="road-shoulder left"></div>
					<div class="road-shoulder right"></div>

					<!-- Center dashes — speed-proportional, stops at speed 0 -->
					<div class="center-dash-container">
						<div class="center-dashes" style="
							animation-play-state:{selectedUnit.speed > 0 ? 'running' : 'paused'};
							animation-duration:{selectedUnit.speed > 0 ? Math.max(0.12, 3 / (selectedUnit.speed / 15 + 0.5)) + 's' : '99s'}
						"></div>
					</div>

					<!-- Nearby fleet units on road -->
					{#each nearbyUnits.slice(0, 3) as nearby, i}
						<div class="fleet-on-road" style="bottom:{22 + i * 14}%;left:{46 + (i % 2 === 0 ? -9 : 9)}%;">
							<div style="transform:scale({0.55 - i*0.1});opacity:{1 - i*0.3};">
								<span class="material-symbols-outlined text-xs" style="color:{getStatusColor(nearby.status)};filter:drop-shadow(0 0 4px {getStatusColor(nearby.status)})">local_shipping</span>
							</div>
						</div>
					{/each}

					<!-- Road glow overlay -->
					<div class="road-glow-overlay" style="background:radial-gradient(ellipse at 50% 100%, {roadGlowColor}25 0%, transparent 65%);"></div>
				</div>
			</div>

			<!-- Horizon info -->
			<div class="absolute bottom-2 left-0 right-0 flex justify-between px-6 z-10">
				<span class="text-[9px] text-slate-400/60 font-bold">{selectedUnit.origin}</span>
				<span class="text-[9px] text-slate-400/60 font-bold">→ {selectedUnit.destination}</span>
			</div>
		</div>

		<!-- ===== DASHBOARD ===== -->
		<div class="dashboard-panel">
			<!-- Left: Info -->
			<div class="flex flex-col gap-2 min-w-0 flex-1">
				<div class="grid grid-cols-2 gap-2">
					<div class="dash-tile">
						<p class="dash-label">Surat Jalan</p>
						<p class="text-xs font-black text-blue-400 truncate">{selectedUnit.do}</p>
					</div>
					<div class="dash-tile">
						<p class="dash-label">Sisa Jarak</p>
						<p class="text-xs font-bold text-emerald-400 truncate">{routeMeta?.dist || '-'}</p>
					</div>
					<div class="dash-tile col-span-2">
						<p class="dash-label">Estimasi Tiba (Smart ETA)</p>
						<p class="text-xs font-black text-amber-400">{routeMeta?.eta || 'Menghitung...'}</p>
					</div>
					<div class="dash-tile col-span-2">
						<p class="dash-label">Lokasi Saat Ini</p>
						<p class="text-xs font-bold text-white truncate" title={selectedUnit.location}>{selectedUnit.location}</p>
						<p class="text-[10px] font-mono text-slate-400 mt-1">{selectedUnit.lat.toFixed(5)}, {selectedUnit.lng.toFixed(5)}</p>
					</div>
				</div>
				<div class="flex items-center gap-1.5 mt-auto">
					<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
					<span class="text-[9px] font-bold text-emerald-400">GPS LIVE · Update 10s</span>
				</div>
			</div>

			<!-- Center: Steering Wheel + Speedometer -->
			<div class="flex flex-col items-center gap-2 flex-shrink-0">
				<!-- Steering Wheel SVG -->
				<svg width="90" height="90" viewBox="0 0 100 100" class="steering-wheel" style="animation-play-state:{selectedUnit.speed > 0 ? 'running' : 'paused'}">
					<!-- Outer ring -->
					<circle cx="50" cy="50" r="44" fill="none" stroke="#334155" stroke-width="10"/>
					<circle cx="50" cy="50" r="44" fill="none" stroke="#1e293b" stroke-width="8"/>
					<!-- Grip highlights -->
					<path d="M 6 50 A 44 44 0 0 1 94 50" fill="none" stroke="#475569" stroke-width="3" stroke-linecap="round"/>
					<path d="M 6 50 A 44 44 0 0 0 94 50" fill="none" stroke="#334155" stroke-width="3" stroke-linecap="round"/>
					<!-- Spokes -->
					<line x1="50" y1="6" x2="50" y2="32" stroke="#475569" stroke-width="5" stroke-linecap="round"/>
					<line x1="18" y1="68" x2="38" y2="56" stroke="#475569" stroke-width="5" stroke-linecap="round"/>
					<line x1="82" y1="68" x2="62" y2="56" stroke="#475569" stroke-width="5" stroke-linecap="round"/>
					<!-- Center hub -->
					<circle cx="50" cy="50" r="10" fill="#334155"/>
					<circle cx="50" cy="50" r="7" fill="#1e293b"/>
					<circle cx="50" cy="50" r="3" fill="#64748b"/>
				</svg>
				<p class="text-[8px] text-slate-600 uppercase tracking-widest">Kemudi</p>
			</div>

			<!-- Right: Speedometer -->
			<div class="flex flex-col items-center flex-shrink-0">
				<svg width="130" height="110" viewBox="0 0 170 140">
					<!-- Track background arc (same geometry as speed arc) -->
					<path d={getSpeedometerArc(140)}
						fill="none" stroke="#1e293b" stroke-width="12" stroke-linecap="round"/>
					<!-- Active speed arc -->
					<path d={getSpeedometerArc(displaySpeed)}
						fill="none" stroke={speedArcColor(displaySpeed)} stroke-width="12"
						stroke-linecap="round" style="transition:stroke 0.4s ease"/>
					<!-- Tick marks -->
					{#each [0,20,40,60,80,100,120,140] as tick}
						{@const pct = tick / 140}
						{@const angle = (-220 + pct * 260) * (Math.PI / 180)}
						{@const x1 = 85 + 56 * Math.cos(angle)}
						{@const y1 = 85 + 56 * Math.sin(angle)}
						{@const x2 = 85 + 65 * Math.cos(angle)}
						{@const y2 = 85 + 65 * Math.sin(angle)}
						<line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#334155" stroke-width="2" stroke-linecap="round"/>
						{@const xt = 85 + 45 * Math.cos(angle)}
						{@const yt = 85 + 45 * Math.sin(angle)}
						<text x={xt} y={yt} text-anchor="middle" dominant-baseline="middle"
							fill="#475569" font-size="7" font-family="system-ui" font-weight="700">{tick}</text>
					{/each}
					<!-- Needle -->
					<g transform={needleAngle(displaySpeed)}>
						<line x1="85" y1="90" x2="85" y2="26" stroke={speedArcColor(displaySpeed)} stroke-width="2.5" stroke-linecap="round" style="transition:stroke 0.3s"/>
						<circle cx="85" cy="90" r="4" fill="#1e293b" stroke={speedArcColor(displaySpeed)} stroke-width="2" style="transition:stroke 0.4s"/>
					</g>
					<!-- Center speed text -->
					<text x="85" y="100" text-anchor="middle" fill={speedArcColor(displaySpeed)} font-size="20" font-weight="900" font-family="system-ui" style="transition:fill 0.4s">{displaySpeed}</text>
					<text x="85" y="113" text-anchor="middle" fill="#475569" font-size="8" font-family="system-ui">km/h</text>
				</svg>
			</div>
		</div>
	</div>
</div>
{/if}

<!-- ============================================================ -->
<!-- MAIN MAP PAGE                                                -->
<!-- ============================================================ -->
<div class="flex flex-col h-[calc(100vh-64px-64px)]">
	<header class="mb-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
		<div>
			<h1 class="text-3xl font-extrabold text-on-surface tracking-tight mb-2">Live Map</h1>
			<p class="text-on-surface-variant font-medium text-sm">Real-time GPS tracking of all fleet units across operations</p>
		</div>
		<div class="flex items-center gap-4">
			{#if syncMessage}
				<span class="text-xs font-bold text-emerald-600 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">{syncMessage}</span>
			{/if}
			<button onclick={runGeofenceSync} disabled={isSyncing} class="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors text-white text-sm font-bold rounded-xl shadow-sm">
				<span class="material-symbols-outlined text-[18px] {isSyncing ? 'animate-spin' : ''}">sync</span>
				Auto-Pilot Check
			</button>
			<div class="{isFullScreen ? 'fixed top-6 left-6 z-[60] bg-white/30 dark:bg-slate-900/30 backdrop-blur-md hover:bg-white dark:hover:bg-slate-900 shadow-xl transition-all duration-300' : 'bg-surface-container-lowest shadow-sm'} flex items-center gap-2 border border-surface-container rounded-xl p-1">
				<div class="flex items-center px-3 gap-2 border-r border-surface-container">
					<span class="material-symbols-outlined text-surface-variant text-sm">search</span>
					<input type="text" bind:value={searchQuery} placeholder="Search Nopol / Driver / Customer..." class="bg-transparent border-none outline-none text-sm w-56 text-on-surface placeholder:text-surface-variant">
				</div>
				<select bind:value={filterStatus} class="bg-transparent border-none outline-none text-sm px-3 py-1.5 text-on-surface cursor-pointer rounded-lg hover:bg-surface-container-low transition-colors">
					<option value="All">All Status</option>
					<option value="Moving">Moving</option>
					<option value="Available">Available (Parking)</option>
					<option value="Loading">Loading (Idle)</option>
				</select>
			</div>
			<div class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 shadow-sm">
				<span class="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
				<span class="text-[10px] font-bold text-blue-600 uppercase tracking-wider">{displayUnits.length} Units Tracked</span>
			</div>
		</div>
	</header>

	<div class="flex-1 flex gap-4 min-h-0">
		<!-- Map -->
		<div class="{isFullScreen ? 'fixed inset-0 z-50 w-screen h-screen rounded-none border-none' : 'flex-1 rounded-[24px] overflow-hidden shadow-lg border border-surface-container relative'} transition-all duration-300">
			<div bind:this={mapContainer} class="w-full h-full"></div>
			
			<div class="absolute top-4 right-4 z-[1000] flex items-center gap-2">
				<button onclick={() => (show3DGeofenceModal = true)} class="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg border border-emerald-500 transition-colors flex items-center gap-1.5 font-bold text-xs" title="Tampilkan 3D Elevated Geofence">
					<span class="material-symbols-outlined text-lg">view_in_ar</span>
					<span class="hidden sm:inline">3D Geofence</span>
				</button>

				<button onclick={() => isFullScreen = !isFullScreen} class="p-2.5 {isFullScreen ? 'bg-white/30 dark:bg-slate-900/30 hover:bg-white dark:hover:bg-slate-900' : 'bg-surface-container-lowest/90 hover:bg-surface-container-lowest'} backdrop-blur-md rounded-xl shadow-lg border border-surface-container transition-colors text-on-surface" title="Toggle Full Screen">
					<span class="material-symbols-outlined text-xl">{isFullScreen ? 'fullscreen_exit' : 'fullscreen'}</span>
				</button>
			</div>

			<div class="absolute bottom-4 left-4 z-[1000] bg-surface-container-lowest/90 backdrop-blur-md rounded-xl p-4 shadow-lg border border-surface-container">
				<p class="text-[9px] font-black text-on-surface-variant uppercase tracking-widest mb-3">Unit Status</p>
				<div class="grid grid-cols-2 gap-x-4 gap-y-2">
					{#each [
						{ label: 'Moving', color: 'bg-blue-500' },
						{ label: 'Transit', color: 'bg-amber-500' },
						{ label: 'Loading', color: 'bg-indigo-500' },
						{ label: 'Available', color: 'bg-emerald-500' },
						{ label: 'Maintenance', color: 'bg-orange-500' }
					] as item}
						<div class="flex items-center gap-2">
							<span class="w-2.5 h-2.5 rounded-full {item.color}"></span>
							<span class="text-[10px] font-bold text-on-surface-variant">{item.label}</span>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<!-- Sidebar -->
		<div class="{isFullScreen ? `fixed right-6 top-20 ${isSidebarCollapsed ? '' : 'bottom-6'} z-[60] w-96 bg-white/30 dark:bg-slate-900/30 backdrop-blur-md hover:bg-white dark:hover:bg-slate-900 shadow-2xl transition-all duration-300 border border-surface-container/50` : 'w-80 flex-shrink-0 bg-surface-container-lowest shadow-sm border border-surface-container'} rounded-[24px] overflow-hidden flex flex-col transition-all duration-300">
			{#if isFullScreen}
				<button onclick={() => isSidebarCollapsed = !isSidebarCollapsed} class="w-full py-2 bg-slate-500/10 hover:bg-slate-500/20 flex justify-center items-center transition-colors border-b border-surface-container/30">
					<span class="material-symbols-outlined text-on-surface-variant">{isSidebarCollapsed ? 'expand_more' : 'expand_less'}</span>
				</button>
			{/if}
			
			<div class="{isSidebarCollapsed && isFullScreen ? 'hidden' : 'flex flex-col flex-1 overflow-y-auto'}">
				{#if selectedUnit}
					<div class="p-6 border-b border-surface-container">
						<div class="flex items-center gap-3 mb-4">
							<div class="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
								<span class="material-symbols-outlined text-2xl">local_shipping</span>
							</div>
							<div class="flex-1 min-w-0">
								<h3 class="text-lg font-black text-on-surface">{selectedUnit.id}</h3>
								<p class="text-xs text-on-surface-variant font-medium truncate">{selectedUnit.driver}</p>
							</div>
						</div>
					<div class="flex items-center justify-between gap-2 flex-wrap">
						<span class="inline-flex items-center gap-1.5 font-bold text-[11px] px-2.5 py-1 rounded-md uppercase tracking-wider border {getStatusBadge(selectedUnit.status)}">
							<span class="w-1.5 h-1.5 rounded-full {getStatusDot(selectedUnit.status)}"></span> {selectedUnit.status}
						</span>
						<button onclick={() => { showInCar = true; displaySpeed = 0; }}
							class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 transition-colors text-white text-xs font-bold shadow">
							<span class="material-symbols-outlined text-base">directions_car</span>
							Lihat Dalam Mobil
						</button>
					</div>
					{#if isTrafficJam}
						<div class="mt-3 flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30">
							<span class="material-symbols-outlined text-red-500 text-base mt-0.5">warning</span>
							<p class="text-[10px] text-red-600 font-bold leading-relaxed">Kendaraan terdeteksi macet / berhenti di posisi saat ini</p>
						</div>
					{:else if isSlowTraffic}
						<div class="mt-3 flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
							<span class="material-symbols-outlined text-amber-500 text-base mt-0.5">warning</span>
							<p class="text-[10px] text-amber-600 font-bold leading-relaxed">Kendaraan melambat — kemungkinan kepadatan lalu lintas</p>
						</div>
					{/if}
					{#if selectedUnit.isDeviated}
						<div class="mt-3 flex items-start gap-2 px-3 py-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30">
							<span class="material-symbols-outlined text-rose-500 text-base mt-0.5">report</span>
							<p class="text-[10px] text-rose-600 font-bold leading-relaxed">ANOMALI: Truk terdeteksi keluar jauh (>3km) dari rute aslinya!</p>
						</div>
					{/if}
				</div>

				<div class="p-6 space-y-4 flex-1">
					{#if selectedUnit.origin !== '-'}
						<div><p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Route</p><p class="text-sm font-bold text-on-surface">{selectedUnit.origin} → {selectedUnit.destination}</p></div>
						{#if routeMeta}
							<div class="flex gap-4">
								<div class="flex-1"><p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Sisa Jarak</p><p class="text-sm font-bold text-emerald-600">{routeMeta.dist}</p></div>
								<div class="flex-1"><p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Smart ETA</p><p class="text-sm font-black text-amber-600">{routeMeta.eta}</p></div>
							</div>
						{/if}
						
						<!-- Direction Indicator: papan petunjuk jalan dari OSRM steps -->
						{#if roadSteps.currentRoad || selectedUnit.streetName !== '-'}
							<div class="rounded-xl overflow-hidden border border-surface-container">
								<!-- Header -->
								<div class="bg-surface-container px-3 py-1.5 flex items-center gap-1.5">
									<span class="material-symbols-outlined text-[13px] text-on-surface-variant">signpost</span>
									<p class="text-[9px] font-black text-on-surface-variant uppercase tracking-widest">Posisi & Arah Jalan</p>
								</div>
								<!-- Body -->
								<div class="bg-surface-container-low px-3 py-3 space-y-2.5">

									<!-- Jalan saat ini -->
									<div class="flex items-start gap-2">
										<div class="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1"></div>
										<div class="min-w-0">
											<p class="text-[9px] text-on-surface-variant font-medium uppercase tracking-wider leading-none mb-0.5">Saat ini di</p>
											<p class="text-xs font-bold text-on-surface leading-tight">
												{roadSteps.currentRoad ?? selectedUnit.streetName}
											</p>
										</div>
									</div>

									<!-- Penghubung + label -->
									<div class="flex items-center gap-2 pl-[3px]">
										<div class="h-4 w-[2px] bg-surface-container-high rounded-full"></div>
										<span class="material-symbols-outlined text-[16px] text-amber-500">arrow_downward</span>
										<p class="text-[9px] font-black text-amber-500 uppercase tracking-wider">jalan berikutnya</p>
									</div>

									<!-- Jalan berikutnya -->
									<div class="flex items-start gap-2">
										<div class="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0 mt-1"></div>
										<div class="min-w-0">
											{#if roadSteps.nextRoad}
												<p class="text-[9px] text-on-surface-variant font-medium uppercase tracking-wider leading-none mb-0.5">Menuju</p>
												<p class="text-xs font-bold text-emerald-600 leading-tight">{roadSteps.nextRoad}</p>
											{:else if !selectedUnit.destLat}
												<p class="text-xs text-on-surface-variant italic">Unit tidak sedang bertugas</p>
											{:else}
												<p class="text-xs text-on-surface-variant italic animate-pulse">Memuat rute...</p>
											{/if}
										</div>
									</div>

								</div>
							</div>
						{/if}

						<div><p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Customer</p><p class="text-sm font-bold text-on-surface">{selectedUnit.customer}</p></div>
						<div><p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Cargo</p><p class="text-sm font-medium text-on-surface">{selectedUnit.cargo}</p></div>
						<div><p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Delivery Order</p><p class="text-sm font-bold text-blue-600">{selectedUnit.do}</p></div>
						{#if selectedUnit.aiNote}
							<div class="p-3 rounded-lg bg-orange-50 border border-orange-200">
								<div class="flex items-center gap-1.5 mb-1">
									<span class="material-symbols-outlined text-orange-600 text-[14px]">smart_toy</span>
									<p class="text-[10px] font-black text-orange-600 uppercase tracking-wider">FARIDA Insight</p>
								</div>
								<p class="text-xs font-medium text-orange-900 leading-relaxed">{selectedUnit.aiNote}</p>
							</div>
						{/if}
						{#if selectedUnit.speed > 0}
							<div><p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Speed</p>
							<p class="text-2xl font-black text-blue-600">{selectedUnit.speed} <span class="text-sm text-on-surface-variant">km/h</span></p></div>
						{/if}
						{#if nearbyUnits.length > 0}
							<div>
								<p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Unit Terdekat (≤10km)</p>
								<div class="space-y-1.5">
									{#each nearbyUnits.slice(0, 3) as nearby}
										<div class="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-surface-container-low">
											<span class="w-2 h-2 rounded-full {getStatusDot(nearby.status)} flex-shrink-0"></span>
											<span class="text-xs font-bold text-on-surface flex-1 truncate">{nearby.id}</span>
											<span class="text-[10px] text-on-surface-variant">{nearby.distanceKm.toFixed(1)} km</span>
										</div>
									{/each}
								</div>
							</div>
						{/if}
					{:else}
						<div class="text-center py-8">
							<span class="material-symbols-outlined text-4xl text-emerald-500 mb-2">check_circle</span>
							<p class="text-sm font-bold text-on-surface">Available at Pool</p>
							<p class="text-xs text-on-surface-variant mt-1">Unit is standby and ready for dispatch</p>
						</div>
					{/if}
				</div>
			{:else}
				<div class="p-8 text-center text-on-surface-variant flex-1 flex flex-col justify-center items-center">
					<span class="material-symbols-outlined text-5xl mb-4 opacity-30">touch_app</span>
					<h3 class="text-lg font-bold text-on-surface mb-2">Select a Unit</h3>
					<p class="text-sm">Click on any truck marker on the map to view real-time telemetry, routing, and driver information.</p>
				</div>
			{/if}

			<!-- Unit List -->
			<div class="border-t border-surface-container p-4">
				<p class="text-[9px] font-black text-on-surface-variant uppercase tracking-widest mb-3">All Units</p>
				<div class="space-y-2 max-h-48 overflow-y-auto">
					{#each displayUnits as unit}
						<button class="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-surface-container-low transition-colors text-left {selectedUnit?.id === unit.id ? 'bg-blue-500/10 border border-blue-500/20' : ''}"
							onclick={() => { selectedUnitId = unit.id; if (map) map.flyTo([unit.lat, unit.lng], 13, { animate: true, duration: 0.8 }); }}>
							<div class="w-2 h-2 rounded-full flex-shrink-0 {getStatusDot(unit.status)}"></div>
							<div class="flex-1 min-w-0">
								<p class="text-xs font-bold text-on-surface truncate">{unit.id}</p>
								<p class="text-[10px] text-on-surface-variant truncate">{unit.driver}</p>
							</div>
							{#if unit.isDeviated}
								<span class="px-1.5 py-0.5 rounded bg-rose-500 text-[8px] font-black text-white tracking-widest uppercase shadow-sm">Deviated</span>
							{/if}
							{#if unit.speed > 0}
								<span class="text-[10px] font-bold text-blue-600">{unit.speed}</span>
							{/if}
							{#if unit.speed < 5 && unit.status === 'Moving'}
								<span class="material-symbols-outlined text-red-500 text-sm">warning</span>
							{/if}
						</button>
					{/each}
				</div>
			</div>
			</div>
		</div>
	</div>
</div>

<!-- Modal 3D Geofence Elevation -->
{#if show3DGeofenceModal}
	<div class="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
		<div class="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden my-8 animate-in zoom-in-95 duration-200">
			<!-- Modal Header -->
			<div class="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
						<span class="material-symbols-outlined text-2xl">view_in_ar</span>
					</div>
					<div>
						<h2 class="text-lg font-black text-white flex items-center gap-2">
							<span>3D ELEVATED GEOFENCE & LIVE TRUCK TRACKING</span>
							<span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">THREE.JS WEBGL</span>
						</h2>
						<p class="text-xs text-slate-400">Visualisasi 3D Tabung Geofence Pool & Marker Kendaraan Bergerak</p>
					</div>
				</div>
				<button onclick={() => (show3DGeofenceModal = false)} class="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer">
					<span class="material-symbols-outlined text-xl">close</span>
				</button>
			</div>

			<!-- Modal Body -->
			<div class="p-6">
				<Geofence3DMap units={units} pools={data.pools || []} />
			</div>
		</div>
	</div>
{/if}

<style>
	/* ===== LEAFLET ===== */
	:global(.leaflet-popup-content-wrapper) {
		border-radius: 16px !important;
		box-shadow: 0 8px 32px rgba(0,0,0,0.15) !important;
		padding: 0 !important;
	}
	:global(.leaflet-control-zoom) {
		border: none !important; box-shadow: 0 2px 12px rgba(0,0,0,0.2) !important;
		border-radius: 12px !important; overflow: hidden;
	}
	:global(.leaflet-control-zoom a) { background: rgba(30,41,59,0.9) !important; color: white !important; border: none !important; }
	:global(.leaflet-control-zoom a:hover) { background: rgba(30,41,59,1) !important; }

	/* ===== COCKPIT ===== */
	.cockpit-wrapper {
		background: linear-gradient(180deg, #020617 0%, #0f172a 100%);
		border: 1px solid rgba(255,255,255,0.08);
	}
	.cockpit-header {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 16px;
		background: rgba(0, 0, 0, 0.4);
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
	}

	.mirror-row {
		display: flex;
		align-items: flex-start;
		gap: 8px;
		padding: 8px 10px 0;
		position: relative;
		z-index: 10;
	}
	.mirror-box {
		width: 110px;
		flex-shrink: 0;
		border-radius: 10px;
		overflow: hidden;
		box-shadow: 0 2px 12px rgba(0,0,0,0.5);
		border: 1px solid rgba(255,255,255,0.1);
	}
	.mirror-content {
		background: linear-gradient(135deg, #0f172a, #1e293b);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2px;
		padding: 6px;
		min-height: 56px;
	}
	.mirror-nopol {
		font-size: 8px;
		font-weight: 900;
		color: white;
		text-align: center;
		line-height: 1.2;
	}
	.mirror-dist {
		font-size: 7px;
		color: #64748b;
		text-align: center;
	}
	.mirror-label {
		text-align: center;
		font-size: 7px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: #475569;
		background: rgba(0,0,0,0.4);
		padding: 2px 4px;
	}

	/* Road Viewport */
	.road-viewport {
		height: 240px;
		position: relative;
		overflow: hidden;
		background: linear-gradient(180deg, #0a1628 0%, #0f1f3d 40%, #0a1628 100%);
	}

	.sky-layer {
		position: absolute;
		inset: 0;
		background: linear-gradient(180deg, #0a1628 0%, #0d2140 50%, #0a1a30 100%);
	}

	.road-3d-wrapper {
		position: absolute;
		bottom: 0;
		left: 0; right: 0;
		height: 65%;
		perspective: 200px;
		perspective-origin: 50% 0%;
	}

	.road-plane {
		width: 70%;
		height: 300%;
		margin: 0 auto;
		transform: rotateX(55deg);
		transform-origin: top center;
		position: relative;
		clip-path: polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%);
		transition: background 0.6s ease;
	}

	.road-shoulder {
		position: absolute;
		top: 0; bottom: 0;
		width: 3px;
		background: rgba(255,255,255,0.25);
	}
	.road-shoulder.left { left: 8%; }
	.road-shoulder.right { right: 8%; }

	.center-dash-container {
		position: absolute;
		top: 0; bottom: 0;
		left: 50%; transform: translateX(-50%);
		width: 4px;
		overflow: hidden;
	}
	.center-dashes {
		width: 100%;
		height: 200%;
		background: repeating-linear-gradient(
			to bottom,
			rgba(255,255,255,0.7) 0px,
			rgba(255,255,255,0.7) 24px,
			transparent 24px,
			transparent 48px
		);
		animation: roadScroll linear infinite;
	}
	@keyframes roadScroll {
		from { transform: translateY(-50%); }
		to   { transform: translateY(0); }
	}

	.fleet-on-road {
		position: absolute;
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: none;
	}

	.road-glow-overlay {
		position: absolute;
		inset: 0;
		pointer-events: none;
		transition: background 0.6s ease;
	}

	/* Dashboard panel */
	.dashboard-panel {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 16px 24px;
		background: linear-gradient(180deg, #0f172a 0%, #020617 100%);
		border-top: 1px solid rgba(255,255,255,0.06);
	}

	.dash-tile {
		background: rgba(255,255,255,0.03);
		border: 1px solid rgba(255,255,255,0.07);
		border-radius: 10px;
		padding: 8px 10px;
	}
	.dash-label {
		font-size: 7px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: #475569;
		margin-bottom: 2px;
	}

	/* Steering Wheel rotation */
	.steering-wheel {
		animation: steerOscillate 3s ease-in-out infinite;
		filter: drop-shadow(0 4px 12px rgba(0,0,0,0.6));
	}
	@keyframes steerOscillate {
		0%, 100% { transform: rotate(-3deg); }
		50%       { transform: rotate(3deg); }
	}
</style>
