<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	
	let { data }: { data: PageData } = $props();
	let units = $derived(data.units || []);
	let selectedUnit = $state<any>(null);
	let mapContainer: HTMLDivElement;
	let map: any;

	function getStatusColor(status: string): string {
		switch(status) {
			case 'Moving': return '#0ea5e9';
			case 'Transit': return '#f59e0b';
			case 'Loading': return '#6366f1';
			case 'Available': return '#10b981';
			case 'Maintenance': return '#f97316';
			default: return '#64748b';
		}
	}

	function getStatusBadge(status: string): string {
		switch(status) {
			case 'Moving': return 'text-sky-600 bg-sky-500/10 border-sky-500/20';
			case 'Transit': return 'text-amber-600 bg-amber-500/10 border-amber-500/20';
			case 'Loading': return 'text-indigo-600 bg-indigo-500/10 border-indigo-500/20';
			case 'Available': return 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20';
			case 'Maintenance': return 'text-orange-600 bg-orange-500/10 border-orange-500/20';
			default: return 'text-slate-600 bg-slate-500/10 border-slate-500/20';
		}
	}

	function getStatusDot(status: string): string {
		switch(status) {
			case 'Moving': return 'bg-sky-500 animate-pulse';
			case 'Transit': return 'bg-amber-500';
			case 'Loading': return 'bg-indigo-500 animate-pulse';
			case 'Available': return 'bg-emerald-500';
			case 'Maintenance': return 'bg-orange-500';
			default: return 'bg-slate-400';
		}
	}

	onMount(async () => {
		const L = await import('leaflet');
		await import('leaflet/dist/leaflet.css');
		
		map = L.map(mapContainer, {
			zoomControl: false
		}).setView([-6.8, 109.5], 7);

		L.control.zoom({ position: 'topright' }).addTo(map);

		L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
			attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
			subdomains: 'abcd',
			maxZoom: 19
		}).addTo(map);

		units.forEach(unit => {
			const color = getStatusColor(unit.status);
			const pulseClass = unit.status === 'Moving' ? 'pulse-marker' : '';
			
			const icon = L.divIcon({
				html: `
					<div class="custom-marker ${pulseClass}" style="position:relative;">
						<div style="width:36px;height:36px;border-radius:12px;background:${color};display:flex;align-items:center;justify-content:center;box-shadow:0 0 12px ${color}80, 0 2px 8px rgba(0,0,0,0.3);border:2px solid rgba(255,255,255,0.3);">
							<span class="material-symbols-outlined" style="font-size:18px;color:white;">local_shipping</span>
						</div>
						<div style="position:absolute;top:-6px;right:-6px;width:10px;height:10px;border-radius:50%;background:${unit.speed > 0 ? '#10b981' : '#94a3b8'};border:2px solid #1e293b;"></div>
					</div>
				`,
				className: '',
				iconSize: [36, 36],
				iconAnchor: [18, 18]
			});

			const marker = L.marker([unit.lat, unit.lng], { icon }).addTo(map);
			
			const popupContent = `
				<div style="font-family:system-ui;min-width:200px;padding:4px;">
					<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
						<div style="width:28px;height:28px;border-radius:8px;background:${color}20;display:flex;align-items:center;justify-content:center;">
							<span class="material-symbols-outlined" style="font-size:16px;color:${color};">local_shipping</span>
						</div>
						<div>
							<div style="font-weight:800;font-size:13px;color:#1e293b;">${unit.id}</div>
							<div style="font-size:10px;color:#64748b;">${unit.driver}</div>
						</div>
					</div>
					<div style="font-size:11px;color:#64748b;margin-bottom:4px;">
						${unit.origin !== '-' ? `<strong>${unit.origin}</strong> → <strong>${unit.destination}</strong>` : 'Standby at Pool'}
					</div>
					${unit.speed > 0 ? `<div style="font-size:11px;color:${color};font-weight:700;">${unit.speed} km/h</div>` : ''}
				</div>
			`;
			
			marker.bindPopup(popupContent, { className: 'custom-popup' });
			marker.on('click', () => { selectedUnit = unit; });
		});

		setTimeout(() => map.invalidateSize(), 100);

		return () => { if (map) map.remove(); };
	});
</script>

<svelte:head>
	<title>Live Map | OCS</title>
	<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
</svelte:head>

<div class="flex flex-col h-[calc(100vh-64px-64px)]">
	<!-- Header -->
	<header class="mb-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
		<div>
			<h1 class="text-3xl font-extrabold text-on-surface tracking-tight mb-2">Live Map</h1>
			<p class="text-on-surface-variant font-medium text-sm">Real-time GPS tracking of all fleet units across operations</p>
		</div>
		<div class="flex items-center gap-3">
			<div class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
				<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
				<span class="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">{units.length} Units Tracked</span>
			</div>
		</div>
	</header>

	<!-- Map + Detail Panel -->
	<div class="flex-1 flex gap-4 min-h-0">
		<!-- Map Container -->
		<div class="flex-1 rounded-[24px] overflow-hidden shadow-lg border border-surface-container relative">
			<div bind:this={mapContainer} class="w-full h-full"></div>
			
			<!-- Legend Overlay -->
			<div class="absolute bottom-4 left-4 z-[1000] bg-surface-container-lowest/90 backdrop-blur-md rounded-xl p-4 shadow-lg border border-surface-container">
				<p class="text-[9px] font-black text-on-surface-variant uppercase tracking-widest mb-3">Unit Status</p>
				<div class="grid grid-cols-2 gap-x-4 gap-y-2">
					{#each [
						{ label: 'Moving', color: 'bg-sky-500' },
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

		<!-- Detail Sidebar -->
		<div class="w-80 flex-shrink-0 bg-surface-container-lowest rounded-[24px] shadow-sm overflow-y-auto flex flex-col border border-surface-container">
			{#if selectedUnit}
				<!-- Selected Unit Detail -->
				<div class="p-6 border-b border-surface-container">
					<div class="flex items-center gap-3 mb-4">
						<div class="w-12 h-12 rounded-xl bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center text-sky-600">
							<span class="material-symbols-outlined text-2xl">local_shipping</span>
						</div>
						<div>
							<h3 class="text-lg font-black text-on-surface">{selectedUnit.id}</h3>
							<p class="text-xs text-on-surface-variant font-medium">{selectedUnit.driver}</p>
						</div>
					</div>
					<span class="inline-flex items-center gap-1.5 font-bold text-[11px] px-2.5 py-1 rounded-md uppercase tracking-wider border {getStatusBadge(selectedUnit.status)}">
						<span class="w-1.5 h-1.5 rounded-full {getStatusDot(selectedUnit.status)}"></span> {selectedUnit.status}
					</span>
				</div>
				<div class="p-6 space-y-4 flex-1">
					{#if selectedUnit.origin !== '-'}
						<div>
							<p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Route</p>
							<p class="text-sm font-bold text-on-surface">{selectedUnit.origin} → {selectedUnit.destination}</p>
						</div>
						<div>
							<p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Customer</p>
							<p class="text-sm font-bold text-on-surface">{selectedUnit.customer}</p>
						</div>
						<div>
							<p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Cargo</p>
							<p class="text-sm font-medium text-on-surface">{selectedUnit.cargo}</p>
						</div>
						<div>
							<p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Delivery Order</p>
							<p class="text-sm font-bold text-sky-600">{selectedUnit.do}</p>
						</div>
						<div>
							<p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Progress</p>
							<div class="w-full bg-surface-container-high h-2.5 rounded-full overflow-hidden">
								<div class="bg-sky-500 h-full rounded-full shadow-[0_0_8px_rgba(14,165,233,0.4)] transition-all" style="width: {selectedUnit.progress}%"></div>
							</div>
							<div class="flex justify-between mt-1">
								<span class="text-[10px] font-bold text-on-surface-variant">{selectedUnit.progress}%</span>
								<span class="text-[10px] font-bold text-sky-600">ETA {selectedUnit.eta}</span>
							</div>
						</div>
						{#if selectedUnit.speed > 0}
							<div>
								<p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Speed</p>
								<p class="text-2xl font-black text-sky-600">{selectedUnit.speed} <span class="text-sm text-on-surface-variant">km/h</span></p>
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
				<!-- No Selection -->
				<div class="flex-1 flex flex-col items-center justify-center p-6 text-center">
					<span class="material-symbols-outlined text-5xl text-surface-variant mb-4">touch_app</span>
					<p class="text-sm font-bold text-on-surface mb-1">Select a Unit</p>
					<p class="text-xs text-on-surface-variant">Click on a truck marker on the map to view its details</p>
				</div>
			{/if}
			
			<!-- Unit List -->
			<div class="border-t border-surface-container p-4">
				<p class="text-[9px] font-black text-on-surface-variant uppercase tracking-widest mb-3">All Units</p>
				<div class="space-y-2 max-h-48 overflow-y-auto">
					{#each units as unit}
						<button class="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-surface-container-low transition-colors text-left {selectedUnit?.id === unit.id ? 'bg-sky-500/10 border border-sky-500/20' : ''}"
							onclick={() => { selectedUnit = unit; }}>
							<div class="w-2 h-2 rounded-full flex-shrink-0 {getStatusDot(unit.status)}"></div>
							<div class="flex-1 min-w-0">
								<p class="text-xs font-bold text-on-surface truncate">{unit.id}</p>
								<p class="text-[10px] text-on-surface-variant truncate">{unit.driver}</p>
							</div>
							{#if unit.speed > 0}
								<span class="text-[10px] font-bold text-sky-600">{unit.speed}</span>
							{/if}
						</button>
					{/each}
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	:global(.leaflet-popup-content-wrapper) {
		border-radius: 16px !important;
		box-shadow: 0 8px 32px rgba(0,0,0,0.15) !important;
		padding: 0 !important;
	}
	:global(.leaflet-popup-tip) {
		box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
	}
	:global(.leaflet-control-zoom) {
		border: none !important;
		box-shadow: 0 2px 12px rgba(0,0,0,0.2) !important;
		border-radius: 12px !important;
		overflow: hidden;
	}
	:global(.leaflet-control-zoom a) {
		background: rgba(30,41,59,0.9) !important;
		color: white !important;
		border: none !important;
		backdrop-filter: blur(8px);
	}
	:global(.leaflet-control-zoom a:hover) {
		background: rgba(30,41,59,1) !important;
	}

	@keyframes pulseGlow {
		0%, 100% { box-shadow: 0 0 8px rgba(14,165,233,0.4); }
		50% { box-shadow: 0 0 20px rgba(14,165,233,0.8); }
	}
	:global(.pulse-marker > div:first-child) {
		animation: pulseGlow 2s infinite;
	}
</style>
