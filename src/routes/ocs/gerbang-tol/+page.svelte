<script lang="ts">
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	let { data, form } = $props<{ data: any; form: any }>();

	// Tab aktif: 'tarif' (default menampilkan data master.m_gerbang_tol) | 'map'
	let activeTab = $state<'tarif' | 'map'>('tarif');

	// ==================== STATE PETA & POINTING GEOFENCE ====================
	let mapContainer: HTMLElement;
	let map: any = null;
	let leafletLib: any = null;
	let gateMarkers: any[] = [];
	let polygonLayers: any[] = [];
	let currentPointMarker: any = null;
	let draftPolygonLayer: any = null;
	let draftPolygonMarkers: any[] = [];

	// State sidebar peta: 'master' (107 gerbang tol m_gerbang_tol) | 'gps' (titik fisik m_titik_gerbang_tol)
	let mapSidebarView = $state<'master' | 'gps'>('master');

	// State form panel kanan titik gerbang tol fisik
	let showTitikModal = $state(false);
	let isEditingTitik = $state(false);
	let isSubmittingTitik = $state(false);
	let titikFormId = $state<number | null>(null);
	let titikKode = $state('');
	let titikNama = $state('');
	let titikRuas = $state('');
	let titikKm = $state<number | string>('');
	let titikLat = $state<number | string>('');
	let titikLng = $state<number | string>('');
	let titikRadius = $state<number>(300);
	let titikPolygonPoints = $state<{ lat: number; lng: number }[]>([]);
	let titikIsActive = $state(true);

	// Mode interaksi peta untuk Titik Fisik ('point' = pin pusat, 'polygon' = 4 sudut plaza)
	let mapInteractionMode = $state<'point' | 'polygon'>('point');
	let mapSearchQuery = $state('');
	let isSearchingMap = $state(false);
	let googleMapsLoaded = $state(false);
	let autocomplete: any = null;
	let searchResultMarker: any = null;
	let filterRuasTitik = $state('ALL');
	let searchTitikQuery = $state('');

	// State modal konfirmasi hapus titik fisik
	let showDeleteTitikModal = $state(false);
	let titikToDelete = $state<any>(null);
	let isDeletingTitik = $state(false);

	// ==================== STATE TABEL TARIF RUAS ====================
	let searchQuery = $state('');
	let selectedRuas = $state('ALL');
	let currentPage = $state(1);
	let pageSize = $state(15);

	// State modal form tarif ruas (Tambah / Edit)
	let showModal = $state(false);
	let isEditing = $state(false);
	let isSubmitting = $state(false);

	// Form fields tarif ruas
	let formId = $state<number | null>(null);
	let formRuas = $state('');
	let formAsalId = $state<number | ''>('');
	let formTujuanId = $state<number | ''>('');
	let formAsal = $state('');
	let formTujuan = $state('');
	let formJarakKm = $state<number | string>('');
	let formTarif1 = $state<number | string>(0);
	let formTarif23 = $state<number | string>(0);
	let formTarif45 = $state<number | string>(0);

	// State modal konfirmasi hapus tarif ruas
	let showDeleteModal = $state(false);
	let gateToDelete = $state<any>(null);
	let isDeleting = $state(false);

	// Notification feedback
	let bannerMessage = $state<{ type: 'success' | 'error'; text: string } | null>(null);

	// Helper currency formatter
	function formatRupiah(amount: number | string | null | undefined): string {
		const val = Number(amount) || 0;
		return new Intl.NumberFormat('id-ID', {
			style: 'currency',
			currency: 'IDR',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(val);
	}

	// Filtered list titik fisik (master.m_titik_gerbang_tol)
	let filteredTitikList = $derived.by(() => {
		let list = data.titikGerbangList || [];
		if (filterRuasTitik !== 'ALL') {
			list = list.filter((t: any) => t.ruas_tol === filterRuasTitik);
		}
		if (searchTitikQuery.trim()) {
			const q = searchTitikQuery.toLowerCase().trim();
			list = list.filter((t: any) =>
				(t.nama_gerbang && t.nama_gerbang.toLowerCase().includes(q)) ||
				(t.kode_gerbang && t.kode_gerbang.toLowerCase().includes(q)) ||
				(t.ruas_tol && t.ruas_tol.toLowerCase().includes(q))
			);
		}
		return list;
	});

	// Filtered list gerbang tol individual fisik (dari master.m_gerbang_tol)
	let filteredUniqueGerbangList = $derived.by(() => {
		let list = data.uniqueGerbangList || [];
		if (searchTitikQuery.trim()) {
			const q = searchTitikQuery.toLowerCase().trim();
			list = list.filter((g: any) =>
				(g.nama_gerbang && g.nama_gerbang.toLowerCase().includes(q)) ||
				(g.ruas_tol && g.ruas_tol.toLowerCase().includes(q)) ||
				(g.kode_gerbang && g.kode_gerbang.toLowerCase().includes(q))
			);
		}
		return list;
	});

	// Filtered list tarif ruas (master.m_gerbang_tol)
	let filteredList = $derived.by(() => {
		let list = data.gerbangTols || [];
		if (selectedRuas !== 'ALL') {
			list = list.filter((g: any) => g.ruas === selectedRuas);
		}
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase().trim();
			list = list.filter((g: any) =>
				(g.ruas && g.ruas.toLowerCase().includes(q)) ||
				(g.asal && g.asal.toLowerCase().includes(q)) ||
				(g.tujuan && g.tujuan.toLowerCase().includes(q))
			);
		}
		return list;
	});

	// Pagination calculations untuk tarif ruas
	let totalPages = $derived(Math.max(1, Math.ceil(filteredList.length / pageSize)));
	let paginatedList = $derived.by(() => {
		const start = (currentPage - 1) * pageSize;
		return filteredList.slice(start, start + pageSize);
	});

	// Reset page saat filter/search berubah
	$effect(() => {
		const _ = searchQuery + selectedRuas + pageSize;
		currentPage = 1;
	});

	// Sinkronisasi feedback form dari server
	$effect(() => {
		if (form) {
			if (form.success) {
				bannerMessage = { type: 'success', text: form.message || 'Operasi berhasil!' };
				showModal = false;
				showDeleteModal = false;
				showTitikModal = false;
				showDeleteTitikModal = false;
				gateToDelete = null;
				titikToDelete = null;
				clearDraftLayers();
				renderAllMapElements();
			} else if (form.message) {
				bannerMessage = { type: 'error', text: form.message };
			}
		}
	});

	// ==================== INISIALISASI PETA LEAFLET ====================
	async function ensureMapInitialized() {
		if (!browser) return;
		if (!leafletLib) {
			leafletLib = await import('leaflet');
			await import('leaflet/dist/leaflet.css');
		}
		if (!map && mapContainer && leafletLib) {
			initMap();
		}
		if (map) {
			setTimeout(() => {
				if (map) {
					map.invalidateSize();
					renderAllMapElements();
				}
			}, 60);
		}
	}

	function initGooglePlacesAutocomplete() {
		if (!browser) return;
		const win = window as any;
		if (!win.google?.maps?.places) return;
		const input = document.getElementById('mapSearchInput') as HTMLInputElement;
		if (!input || autocomplete) return;

		autocomplete = new win.google.maps.places.Autocomplete(input, {
			componentRestrictions: { country: 'id' },
			fields: ['geometry', 'name', 'formatted_address']
		});

		autocomplete.addListener('place_changed', () => {
			const place = autocomplete.getPlace();
			if (!place.geometry || !place.geometry.location) return;

			const lat = place.geometry.location.lat();
			const lng = place.geometry.location.lng();

			if (map) {
				map.flyTo([lat, lng], 16, { duration: 1.2 });

				if (leafletLib) {
					if (searchResultMarker) map.removeLayer(searchResultMarker);
					searchResultMarker = leafletLib.circleMarker([lat, lng], {
						radius: 12,
						color: '#0284c7',
						weight: 3,
						fillColor: '#38bdf8',
						fillOpacity: 0.5
					}).addTo(map);
					searchResultMarker.bindPopup(`<b>${place.name || 'Lokasi Terpilih'}</b><br/><span style="font-size:11px;">${place.formatted_address || ''}</span>`).openPopup();
				}
			}

			// Jika form kanan terbuka, otomatis isi koordinat dan letakkan pin draft
			if (showTitikModal) {
				titikLat = lat.toFixed(7);
				titikLng = lng.toFixed(7);
				if (mapInteractionMode === 'point') {
					updateDraftMarker(lat, lng);
				}
			}
		});
	}

	function loadGoogleMapsScript() {
		if (!browser) return;
		const win = window as any;
		if (win.google?.maps?.places) {
			googleMapsLoaded = true;
			setTimeout(initGooglePlacesAutocomplete, 100);
			return;
		}
		if (data.googleMapsApiKey) {
			const script = document.createElement('script');
			script.src = `https://maps.googleapis.com/maps/api/js?key=${data.googleMapsApiKey}&libraries=places&loading=async`;
			script.async = true;
			script.defer = true;
			script.onload = () => {
				googleMapsLoaded = true;
				setTimeout(initGooglePlacesAutocomplete, 100);
			};
			document.head.appendChild(script);
		}
	}

	onMount(async () => {
		if (browser) {
			await ensureMapInitialized();
			loadGoogleMapsScript();
		}
	});

	$effect(() => {
		if (activeTab === 'map' && browser) {
			ensureMapInitialized();
			setTimeout(initGooglePlacesAutocomplete, 200);
		}
	});

	function initMap() {
		if (!mapContainer || !leafletLib || map) return;
		const L = leafletLib;

		map = L.map(mapContainer, { zoomControl: false }).setView([-6.2166, 106.5147], 9);
		L.control.zoom({ position: 'topright' }).addTo(map);

		L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
			maxZoom: 19
		}).addTo(map);

		renderAllMapElements();

		map.on('click', (e: any) => {
			handleMapClick(e.latlng);
		});

		setTimeout(() => {
			if (map) map.invalidateSize();
		}, 100);
	}

	function renderAllMapElements() {
		if (!map || !leafletLib) return;
		const L = leafletLib;

		gateMarkers.forEach(m => map.removeLayer(m));
		gateMarkers = [];
		polygonLayers.forEach(p => map.removeLayer(p));
		polygonLayers = [];

		const customTollIcon = L.divIcon({
			className: 'custom-toll-marker',
			html: `
				<div class="w-8 h-8 rounded-full bg-sky-600 border-2 border-white shadow-md flex items-center justify-center text-white cursor-pointer hover:scale-110 transition-transform">
					<span class="material-symbols-outlined text-[18px]">toll</span>
				</div>
			`,
			iconSize: [32, 32],
			iconAnchor: [16, 16],
			popupAnchor: [0, -16]
		});

		(data.titikGerbangList || []).forEach((gate: any) => {
			const lat = parseFloat(gate.latitude);
			const lng = parseFloat(gate.longitude);
			if (isNaN(lat) || isNaN(lng)) return;

			const marker = L.marker([lat, lng], { icon: customTollIcon }).addTo(map);
			marker.bindPopup(`
				<div class="text-xs p-1">
					<div class="font-bold text-sky-800">${gate.nama_gerbang}</div>
					<div class="text-slate-600">${gate.ruas_tol || '-'} • KM ${gate.km_pos || '-'}</div>
					<div class="text-[10px] text-slate-500 font-mono mt-1">${lat.toFixed(6)}, ${lng.toFixed(6)}</div>
					<div class="mt-2 flex gap-1">
						<span class="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${gate.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}">
							${gate.is_active ? 'Aktif' : 'Nonaktif'}
						</span>
						${gate.polygon_points && gate.polygon_points.length > 0 ? '<span class="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-100 text-indigo-800">Geofence Plaza</span>' : ''}
					</div>
				</div>
			`);
			gateMarkers.push(marker);

			if (gate.polygon_points && Array.isArray(gate.polygon_points) && gate.polygon_points.length >= 3) {
				const pts = gate.polygon_points.map((p: any) => [p.lat, p.lng || p.lon]);
				const poly = L.polygon(pts, {
					color: '#0284c7',
					weight: 2,
					fillColor: '#38bdf8',
					fillOpacity: 0.25
				}).bindTooltip(`${gate.nama_gerbang} (Geofence Plaza)`).addTo(map);
				polygonLayers.push(poly);
			} else if (gate.radius_m) {
				const circle = L.circle([lat, lng], {
					radius: gate.radius_m,
					color: '#0284c7',
					weight: 1,
					dashArray: '4, 4',
					fillColor: '#38bdf8',
					fillOpacity: 0.1
				}).addTo(map);
				polygonLayers.push(circle);
			}
		});
	}

	function updateDraftMarker(lat: number, lng: number) {
		if (!map || !leafletLib) return;
		const L = leafletLib;
		titikLat = parseFloat(lat.toFixed(7));
		titikLng = parseFloat(lng.toFixed(7));

		if (currentPointMarker) {
			currentPointMarker.setLatLng([lat, lng]);
		} else {
			currentPointMarker = L.marker([lat, lng], { draggable: true }).addTo(map);
			currentPointMarker.on('dragend', (e: any) => {
				const pos = e.target.getLatLng();
				titikLat = parseFloat(pos.lat.toFixed(7));
				titikLng = parseFloat(pos.lng.toFixed(7));
			});
		}
	}

	function handleMapClick(latlng: { lat: number; lng: number }) {
		if (!showTitikModal || !leafletLib || !map) return;
		const L = leafletLib;

		if (mapInteractionMode === 'point') {
			updateDraftMarker(latlng.lat, latlng.lng);
		} else if (mapInteractionMode === 'polygon') {
			if (titikPolygonPoints.length < 4) {
				titikPolygonPoints = [...titikPolygonPoints, { lat: parseFloat(latlng.lat.toFixed(7)), lng: parseFloat(latlng.lng.toFixed(7)) }];
				const m = L.circleMarker([latlng.lat, latlng.lng], { radius: 5, color: '#10b981', fillColor: '#10b981', fillOpacity: 0.8 }).addTo(map);
				draftPolygonMarkers.push(m);
				drawDraftPolygon();
			}
		}
	}

	function drawDraftPolygon() {
		if (!map || !leafletLib) return;
		const L = leafletLib;

		if (draftPolygonLayer) map.removeLayer(draftPolygonLayer);
		if (titikPolygonPoints.length > 1) {
			const pts = titikPolygonPoints.map(p => [p.lat, p.lng]);
			if (titikPolygonPoints.length < 4) {
				draftPolygonLayer = L.polyline(pts, { color: '#f59e0b', weight: 2, dashArray: '5, 5' }).addTo(map);
			} else {
				draftPolygonLayer = L.polygon(pts, { color: '#10b981', weight: 2, fillColor: '#10b981', fillOpacity: 0.3 }).addTo(map);
			}
		}
	}

	function clearDraftLayers() {
		if (!map) return;
		if (currentPointMarker) {
			map.removeLayer(currentPointMarker);
			currentPointMarker = null;
		}
		if (draftPolygonLayer) {
			map.removeLayer(draftPolygonLayer);
			draftPolygonLayer = null;
		}
		if (searchResultMarker) {
			map.removeLayer(searchResultMarker);
			searchResultMarker = null;
		}
		draftPolygonMarkers.forEach(m => map.removeLayer(m));
		draftPolygonMarkers = [];
	}

	function flyToGate(gate: any) {
		if (!map || !leafletLib) return;
		const lat = parseFloat(gate.latitude);
		const lng = parseFloat(gate.longitude);
		if (isNaN(lat) || isNaN(lng)) return;

		activeTab = 'map';
		setTimeout(() => {
			if (gate.polygon_points && Array.isArray(gate.polygon_points) && gate.polygon_points.length >= 3) {
				const minLat = Math.min(...gate.polygon_points.map((p: any) => p.lat));
				const maxLat = Math.max(...gate.polygon_points.map((p: any) => p.lat));
				const minLon = Math.min(...gate.polygon_points.map((p: any) => p.lng || p.lon));
				const maxLon = Math.max(...gate.polygon_points.map((p: any) => p.lng || p.lon));
				map.flyToBounds([[minLat, minLon], [maxLat, maxLon]], { padding: [50, 50], duration: 1.2 });
			} else {
				map.flyTo([lat, lng], 15, { duration: 1.2 });
			}
		}, 100);
	}

	async function searchLocationOnMap(e: Event) {
		e.preventDefault();
		if (!mapSearchQuery.trim()) return;
		const win = window as any;

		if (win.google?.maps?.Geocoder) {
			isSearchingMap = true;
			const geocoder = new win.google.maps.Geocoder();
			geocoder.geocode(
				{ address: mapSearchQuery, componentRestrictions: { country: 'id' } },
				(results: any, status: any) => {
					isSearchingMap = false;
					if (status === 'OK' && results && results[0]) {
						const loc = results[0].geometry.location;
						const lat = loc.lat();
						const lng = loc.lng();
						if (map) {
							map.flyTo([lat, lng], 16, { duration: 1.2 });
							if (leafletLib) {
								if (searchResultMarker) map.removeLayer(searchResultMarker);
								searchResultMarker = leafletLib.circleMarker([lat, lng], {
									radius: 12,
									color: '#0284c7',
									weight: 3,
									fillColor: '#38bdf8',
									fillOpacity: 0.5
								}).addTo(map);
								searchResultMarker.bindPopup(`<b>${results[0].formatted_address}</b>`).openPopup();
							}
						}
						if (showTitikModal) {
							titikLat = lat.toFixed(7);
							titikLng = lng.toFixed(7);
							if (mapInteractionMode === 'point') {
								updateDraftMarker(lat, lng);
							}
						}
					} else {
						fallbackNominatimSearch();
					}
				}
			);
			return;
		}

		await fallbackNominatimSearch();
	}

	async function fallbackNominatimSearch() {
		if (!map || !leafletLib) return;
		const L = leafletLib;
		isSearchingMap = true;
		try {
			const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(mapSearchQuery)}`);
			const results = await res.json();
			if (results && results.length > 0) {
				const loc = results[0];
				if (loc.boundingbox) {
					const bounds = L.latLngBounds(
						[loc.boundingbox[0], loc.boundingbox[2]],
						[loc.boundingbox[1], loc.boundingbox[3]]
					);
					map.fitBounds(bounds, { padding: [50, 50] });
				} else {
					map.setView([parseFloat(loc.lat), parseFloat(loc.lon)], 14);
				}
			} else {
				bannerMessage = {
					type: 'error',
					text: `Lokasi "${mapSearchQuery}" tidak ditemukan. Coba pilih langsung dari saran Google Places saat mengetik.`
				};
			}
		} catch (error) {
			console.error("Map search error:", error);
		} finally {
			isSearchingMap = false;
		}
	}

	// ==================== PANEL KANAN TITIK FISIK GERBANG TOL ====================
	function openCreateTitikModal() {
		isEditingTitik = false;
		titikFormId = null;
		titikKode = '';
		titikNama = '';
		titikRuas = filterRuasTitik !== 'ALL' ? filterRuasTitik : '';
		titikKm = '';
		titikLat = '';
		titikLng = '';
		titikRadius = 300;
		titikPolygonPoints = [];
		titikIsActive = true;
		clearDraftLayers();
		mapInteractionMode = 'point';
		showTitikModal = true;
	}

	function openEditTitikModal(gate: any) {
		isEditingTitik = true;
		titikFormId = gate.id;
		titikKode = gate.kode_gerbang || '';
		titikNama = gate.nama_gerbang || '';
		titikRuas = gate.ruas_tol || '';
		titikKm = gate.km_pos ?? '';
		titikLat = gate.latitude;
		titikLng = gate.longitude;
		titikRadius = gate.radius_m || 300;
		titikPolygonPoints = Array.isArray(gate.polygon_points) ? gate.polygon_points : [];
		titikIsActive = gate.is_active ?? true;
		clearDraftLayers();

		if (leafletLib && map && gate.latitude && gate.longitude) {
			const L = leafletLib;
			currentPointMarker = L.marker([parseFloat(gate.latitude), parseFloat(gate.longitude)], { draggable: true }).addTo(map);
			currentPointMarker.on('dragend', (e: any) => {
				const pos = e.target.getLatLng();
				titikLat = parseFloat(pos.lat.toFixed(7));
				titikLng = parseFloat(pos.lng.toFixed(7));
			});
			if (titikPolygonPoints.length >= 3) {
				drawDraftPolygon();
			}
			map.flyTo([parseFloat(gate.latitude), parseFloat(gate.longitude)], 15, { duration: 1 });
		}

		mapInteractionMode = 'point';
		showTitikModal = true;
	}

	function startPointingFromRuas(gate: any, target: 'asal' | 'tujuan') {
		const nama = target === 'asal' ? gate.asal : gate.tujuan;
		startPointingFromGate({
			nama_gerbang: nama,
			ruas_tol: gate.ruas || ''
		});
	}

	function startPointingFromGate(gate: any) {
		const rawName = (gate.nama_gerbang || '').trim();
		const cleanName = rawName.replace(/^(gerbang tol|gt)\s+/i, '');
		const formattedNama = `Gerbang Tol ${cleanName}`;
		activeTab = 'map';
		setTimeout(() => {
			ensureMapInitialized();
			isEditingTitik = false;
			titikFormId = gate.titik_id || null;
			titikNama = formattedNama;
			const cleanCode = cleanName.replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase();
			titikKode = gate.kode_gerbang || `GT-${cleanCode}`;
			titikRuas = gate.ruas_tol || '';
			titikKm = '';
			titikLat = gate.latitude || '';
			titikLng = gate.longitude || '';
			titikRadius = 300;
			titikPolygonPoints = [];
			titikIsActive = true;
			clearDraftLayers();
			mapInteractionMode = 'point';
			showTitikModal = true;
			mapSearchQuery = formattedNama;

			bannerMessage = {
				type: 'success',
				text: `Mode Pointing Aktif untuk "${titikNama}". Silakan tentukan titik di peta.`
			};

			// Jika sudah punya koordinat GPS, terbang ke koordinat tersebut
			if (gate.latitude && gate.longitude && map) {
				const lat = parseFloat(gate.latitude);
				const lng = parseFloat(gate.longitude);
				map.flyTo([lat, lng], 16, { duration: 1.2 });
				updateDraftMarker(lat, lng);
				return;
			}

			// Jika belum ber-GPS, otomatis gunakan Google Geocoder untuk mencari lokasi gerbang tol
			const win = window as any;
			if (win.google?.maps?.Geocoder) {
				const geocoder = new win.google.maps.Geocoder();
				geocoder.geocode(
					{ address: `${formattedNama} ${titikRuas}`.trim(), componentRestrictions: { country: 'id' } },
					(results: any, status: any) => {
						if (status === 'OK' && results && results[0]) {
							const loc = results[0].geometry.location;
							const lat = loc.lat();
							const lng = loc.lng();
							titikLat = lat.toFixed(7);
							titikLng = lng.toFixed(7);
							if (map) {
								map.flyTo([lat, lng], 16, { duration: 1.2 });
								updateDraftMarker(lat, lng);
							}
						}
					}
				);
			}
		}, 100);
	}

	function closeTitikForm() {
		showTitikModal = false;
		clearDraftLayers();
	}

	function openDeleteTitikConfirm(gate: any) {
		titikToDelete = gate;
		showDeleteTitikModal = true;
	}

	// ==================== MODAL TARIF RUAS ====================
	function openCreateModal() {
		isEditing = false;
		formId = null;
		formRuas = selectedRuas !== 'ALL' ? selectedRuas : '';
		formAsalId = '';
		formTujuanId = '';
		formAsal = '';
		formTujuan = '';
		formJarakKm = '';
		formTarif1 = 0;
		formTarif23 = 0;
		formTarif45 = 0;
		showModal = true;
	}

	function openEditModal(gate: any) {
		isEditing = true;
		formId = gate.id;
		formRuas = gate.ruas || '';
		formAsalId = gate.gerbang_asal_id || '';
		formTujuanId = gate.gerbang_tujuan_id || '';
		formAsal = gate.asal || '';
		formTujuan = gate.tujuan || '';
		formJarakKm = gate.jarak_ruas_km ?? '';
		formTarif1 = Number(gate.tarif_gol_1) || 0;
		formTarif23 = Number(gate.tarif_gol_2_3) || 0;
		formTarif45 = Number(gate.tarif_gol_4_5) || 0;
		showModal = true;
	}

	function handleTitikAsalSelect(titikId: number | '') {
		formAsalId = titikId;
		if (titikId) {
			const t = (data.titikGerbangList || []).find((x: any) => x.id === titikId);
			if (t) {
				formAsal = t.nama_gerbang;
				if (!formRuas && t.ruas_tol) formRuas = t.ruas_tol;
				autoCalculateJarakRuas();
			}
		}
	}

	function handleTitikTujuanSelect(titikId: number | '') {
		formTujuanId = titikId;
		if (titikId) {
			const t = (data.titikGerbangList || []).find((x: any) => x.id === titikId);
			if (t) {
				formTujuan = t.nama_gerbang;
				if (!formRuas && t.ruas_tol) formRuas = t.ruas_tol;
				autoCalculateJarakRuas();
			}
		}
	}

	function autoCalculateJarakRuas() {
		if (formAsalId && formTujuanId) {
			const a = (data.titikGerbangList || []).find((x: any) => x.id === formAsalId);
			const b = (data.titikGerbangList || []).find((x: any) => x.id === formTujuanId);
			if (a?.km_pos != null && b?.km_pos != null) {
				const d = Math.abs(parseFloat(b.km_pos) - parseFloat(a.km_pos));
				formJarakKm = Math.round(d * 10) / 10;
			}
		}
	}

	function openDeleteConfirm(gate: any) {
		gateToDelete = gate;
		showDeleteModal = true;
	}

	function isGateUsed(id: number): boolean {
		return (data.usedGateIds || []).includes(id);
	}
</script>

<svelte:head>
	<title>Master Gerbang Tol | OCS ERP BCS</title>
	<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
</svelte:head>

<div class="space-y-5">
	<!-- Page Header -->
	<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
		<div>
			<div class="flex items-center gap-2 mb-1">
				<span class="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">Master Data Operasional</span>
				<span class="text-slate-300 dark:text-slate-700">•</span>
				<span class="text-xs text-on-surface-variant font-medium">OCS Module</span>
			</div>
			<h1 class="text-2xl font-black text-on-surface tracking-tight flex items-center gap-2">
				<span class="material-symbols-outlined text-sky-600 dark:text-sky-400 text-[28px]">toll</span>
				Master Gerbang Tol
			</h1>
			<p class="text-xs text-on-surface-variant mt-1">
				Database ruas jalan tol, titik gerbang asal-tujuan, tarif golongan truk operasional, dan pemetaan geofence GPS.
			</p>
		</div>

		<div class="flex items-center gap-2">
			<a
				href="/ocs/rute"
				class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-surface-container-lowest text-xs font-bold text-on-surface hover:bg-surface-container transition-colors flex items-center gap-2 shadow-2xs"
			>
				<span class="material-symbols-outlined text-[18px]">route</span>
				Buka Master Rute & UJO
			</a>
			{#if activeTab === 'tarif'}
				<button
					onclick={openCreateModal}
					class="bg-sky-600 hover:bg-sky-700 active:scale-98 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
				>
					<span class="material-symbols-outlined text-[18px]">add</span>
					Tambah Gerbang Tol
				</button>
			{:else}
				<button
					onclick={openCreateTitikModal}
					class="bg-sky-600 hover:bg-sky-700 active:scale-98 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
				>
					<span class="material-symbols-outlined text-[18px]">add_location_alt</span>
					Tambah Titik Fisik Gerbang
				</button>
			{/if}
		</div>
	</div>

	<!-- Alert Banner Feedback -->
	{#if bannerMessage}
		<div
			class="px-4 py-3 rounded-xl text-xs font-medium flex items-center justify-between transition-all {bannerMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800'}"
		>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-[18px]">
					{bannerMessage.type === 'success' ? 'check_circle' : 'error'}
				</span>
				<span>{bannerMessage.text}</span>
			</div>
			<button
				onclick={() => { bannerMessage = null; }}
				class="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
				aria-label="Tutup pesan"
			>
				<span class="material-symbols-outlined text-[16px]">close</span>
			</button>
		</div>
	{/if}

	<!-- Navigation Tabs -->
	<div class="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-px">
		<button
			onclick={() => { activeTab = 'tarif'; }}
			class="px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border-b-2 {activeTab === 'tarif' ? 'border-sky-600 text-sky-600 dark:text-sky-400 bg-sky-50/50 dark:bg-sky-950/20' : 'border-transparent text-on-surface-variant hover:text-on-surface'}"
		>
			<span class="material-symbols-outlined text-[18px]">table_rows</span>
			Daftar Gerbang Tol ({data.stats?.totalGerbang ?? 0})
		</button>
		<button
			onclick={() => { activeTab = 'map'; }}
			class="px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border-b-2 {activeTab === 'map' ? 'border-sky-600 text-sky-600 dark:text-sky-400 bg-sky-50/50 dark:bg-sky-950/20' : 'border-transparent text-on-surface-variant hover:text-on-surface'}"
		>
			<span class="material-symbols-outlined text-[18px]">map</span>
			Peta Pointing & Geofence ({data.stats?.totalTitik ?? 0})
		</button>
	</div>

	<!-- ==================== TAB 1: DAFTAR TARIF RUAS TOL (MASTER.M_GERBANG_TOL) ==================== -->
	<div class="space-y-4" class:hidden={activeTab !== 'tarif'}>
		<!-- KPI Metric Cards -->
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
			<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 transition-all hover:border-sky-500/30 shadow-2xs">
				<div class="flex items-center justify-between mb-2">
					<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Gerbang Tol</span>
					<div class="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
						<span class="material-symbols-outlined text-[20px]">toll</span>
					</div>
				</div>
				<div class="text-2xl font-black text-on-surface">{data.stats?.totalGerbang ?? 0}</div>
				<p class="text-[11px] text-on-surface-variant mt-1">Konfigurasi asal → tujuan aktif</p>
			</div>

			<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 transition-all hover:border-indigo-500/30 shadow-2xs">
				<div class="flex items-center justify-between mb-2">
					<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Ruas Jalan Tol</span>
					<div class="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
						<span class="material-symbols-outlined text-[20px]">alt_route</span>
					</div>
				</div>
				<div class="text-2xl font-black text-on-surface">{data.stats?.totalRuas ?? 0}</div>
				<p class="text-[11px] text-on-surface-variant mt-1">Koridor tol terdaftar</p>
			</div>

			<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 transition-all hover:border-emerald-500/30 shadow-2xs">
				<div class="flex items-center justify-between mb-2">
					<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Rata-rata Gol 2 & 3</span>
					<div class="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
						<span class="material-symbols-outlined text-[20px]">local_shipping</span>
					</div>
				</div>
				<div class="text-2xl font-black text-on-surface">{formatRupiah(data.stats?.avgTarifGol23 ?? 0)}</div>
				<p class="text-[11px] text-on-surface-variant mt-1">Tarif rata-rata armada BCS</p>
			</div>

			<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 transition-all hover:border-amber-500/30 shadow-2xs">
				<div class="flex items-center justify-between mb-2">
					<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Tarif Tertinggi</span>
					<div class="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
						<span class="material-symbols-outlined text-[20px]">payments</span>
					</div>
				</div>
				<div class="text-2xl font-black text-on-surface">{formatRupiah(data.stats?.maxTarif ?? 0)}</div>
				<p class="text-[11px] text-on-surface-variant mt-1">Batas atas tarif terjauh</p>
			</div>
		</div>

		<!-- Filter & Search Bar -->
		<div class="p-4 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 shadow-2xs">
			<div class="flex flex-col sm:flex-row items-center justify-between gap-3">
				<div class="flex flex-1 w-full sm:w-auto items-center gap-3">
					<div class="flex-1 flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 focus-within:ring-2 focus-within:ring-sky-500/20 focus-within:border-sky-500">
						<span class="material-symbols-outlined text-on-surface-variant text-[18px]">search</span>
						<input
							type="text"
							bind:value={searchQuery}
							placeholder="Cari ruas, asal, atau tujuan gerbang tol..."
							class="bg-transparent text-xs text-on-surface outline-none w-full placeholder:text-on-surface-variant/50"
						/>
						{#if searchQuery}
							<button onclick={() => { searchQuery = ''; }} class="text-on-surface-variant hover:text-on-surface text-[14px]">
								<span class="material-symbols-outlined text-[16px]">close</span>
							</button>
						{/if}
					</div>

					<div class="w-56">
						<select
							bind:value={selectedRuas}
							class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-xs text-on-surface outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-medium"
						>
							<option value="ALL">Semua Ruas ({data.ruasList?.length || 0})</option>
							{#each data.ruasList as ruas}
								<option value={ruas}>{ruas}</option>
							{/each}
						</select>
					</div>
				</div>

				<div class="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
					<span class="text-xs text-on-surface-variant font-medium">
						Ditemukan <strong class="text-on-surface">{filteredList.length}</strong> data
					</span>
					<div class="h-4 w-[1px] bg-slate-200 dark:border-slate-800"></div>
					<select
						bind:value={pageSize}
						class="px-2.5 py-1.5 rounded-lg bg-surface-container-low border border-slate-200 dark:border-slate-800 text-xs text-on-surface outline-none font-medium"
					>
						<option value={15}>15 / hal</option>
						<option value={25}>25 / hal</option>
						<option value={50}>50 / hal</option>
						<option value={100}>100 / hal</option>
					</select>
				</div>
			</div>
		</div>

		<!-- Data Table -->
		<div class="rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 overflow-hidden shadow-2xs">
			<div class="overflow-x-auto">
				<table class="w-full text-left border-collapse text-xs">
					<thead>
						<tr class="bg-surface-container-low/70 border-b border-slate-200 dark:border-slate-800 text-on-surface-variant font-bold uppercase tracking-wider text-[10px]">
							<th class="py-3 px-4 w-12 text-center">No</th>
							<th class="py-3 px-4 min-w-[160px]">Ruas Tol</th>
							<th class="py-3 px-4 min-w-[220px]">Gerbang Asal → Tujuan</th>
							<th class="py-3 px-4 text-center min-w-[90px]">Jarak</th>
							<th class="py-3 px-4 text-right min-w-[110px]">Gol. I</th>
							<th class="py-3 px-4 text-right min-w-[120px]">Gol. II & III</th>
							<th class="py-3 px-4 text-right min-w-[120px]">Gol. IV & V</th>
							<th class="py-3 px-4 text-center min-w-[110px]">Status Rute</th>
							<th class="py-3 px-4 text-center w-28">Aksi</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
						{#if paginatedList.length === 0}
							<tr>
								<td colspan="9" class="text-center py-12 text-on-surface-variant">
									<div class="flex flex-col items-center justify-center gap-2">
										<div class="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
											<span class="material-symbols-outlined text-[24px]">toll</span>
										</div>
										<p class="font-bold text-sm text-on-surface">Tidak ada gerbang tol yang sesuai</p>
										<p class="text-xs text-on-surface-variant/70">Coba ubah kata kunci pencarian atau filter ruas tol.</p>
									</div>
								</td>
							</tr>
						{:else}
							{#each paginatedList as gate, idx}
								{@const isUsed = isGateUsed(gate.id)}
								<tr class="hover:bg-surface-container-low/50 transition-colors">
									<td class="py-3.5 px-4 text-center text-on-surface-variant font-mono">
										{(currentPage - 1) * pageSize + idx + 1}
									</td>
									<td class="py-3.5 px-4 font-semibold text-on-surface">
										<div class="flex items-center gap-1.5">
											<span class="material-symbols-outlined text-[15px] text-sky-600 dark:text-sky-400">add_road</span>
											<span>{gate.ruas || '-'}</span>
										</div>
									</td>
									<td class="py-3.5 px-4">
										<div class="flex items-center gap-1.5 font-medium text-on-surface">
											<span class="font-bold text-slate-800 dark:text-slate-100">{gate.asal || '-'}</span>
											<span class="material-symbols-outlined text-[14px] text-slate-400">arrow_forward</span>
											<span class="font-bold text-slate-800 dark:text-slate-100">{gate.tujuan || '-'}</span>
										</div>
										{#if gate.nama_titik_asal || gate.nama_titik_tujuan}
											<div class="text-[10px] text-sky-600 dark:text-sky-400 flex items-center gap-1 mt-0.5">
												<span class="material-symbols-outlined text-[12px]">link</span>
												<span>Titik GPS: {gate.nama_titik_asal || gate.asal} → {gate.nama_titik_tujuan || gate.tujuan}</span>
											</div>
										{/if}
									</td>
									<td class="py-3.5 px-4 text-center font-mono text-xs">
										{#if gate.jarak_ruas_km}
											<span class="font-bold text-slate-700 dark:text-slate-200">{gate.jarak_ruas_km} KM</span>
										{:else}
											<span class="text-slate-400 text-[10px]">-</span>
										{/if}
									</td>
									<td class="py-3.5 px-4 text-right font-mono text-on-surface-variant">
										{formatRupiah(gate.tarif_gol_1)}
									</td>
									<td class="py-3.5 px-4 text-right font-mono font-bold text-sky-700 dark:text-sky-300">
										{formatRupiah(gate.tarif_gol_2_3)}
									</td>
									<td class="py-3.5 px-4 text-right font-mono font-bold text-indigo-700 dark:text-indigo-300">
										{formatRupiah(gate.tarif_gol_4_5)}
									</td>
									<td class="py-3.5 px-4 text-center">
										{#if isUsed}
											<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
												<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
												Dipakai di Rute
											</span>
										{:else}
											<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
												Tersedia
											</span>
										{/if}
									</td>
									<td class="py-3.5 px-4 text-center">
										<div class="flex items-center justify-center gap-1">
											<!-- Quick Pointing di Peta Button -->
											<button
												onclick={() => startPointingFromRuas(gate, 'asal')}
												class="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 transition-colors cursor-pointer"
												title={`Pointing koordinat "${gate.asal}" di peta`}
											>
												<span class="material-symbols-outlined text-[17px]">pin_drop</span>
											</button>
											<!-- Edit Button -->
											<button
												onclick={() => openEditModal(gate)}
												class="p-1.5 rounded-lg hover:bg-sky-50 dark:hover:bg-sky-950/50 text-sky-600 dark:text-sky-400 transition-colors cursor-pointer"
												title="Edit Gerbang Tol"
											>
												<span class="material-symbols-outlined text-[17px]">edit</span>
											</button>
											<!-- Delete Button -->
											<button
												onclick={() => openDeleteConfirm(gate)}
												class="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
												title={isUsed ? 'Gerbang tol terhubung dengan rute UJO' : 'Hapus Gerbang Tol'}
											>
												<span class="material-symbols-outlined text-[17px]">delete</span>
											</button>
										</div>
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>

			<!-- Pagination Bar -->
			{#if totalPages > 1}
				<div class="px-4 py-3 bg-surface-container-low/50 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
					<span class="text-on-surface-variant">
						Menampilkan <strong class="text-on-surface">{(currentPage - 1) * pageSize + 1}</strong> - <strong class="text-on-surface">{Math.min(currentPage * pageSize, filteredList.length)}</strong> dari <strong class="text-on-surface">{filteredList.length}</strong> gerbang
					</span>

					<div class="flex items-center gap-1">
						<button
							onclick={() => { currentPage = Math.max(1, currentPage - 1); }}
							disabled={currentPage === 1}
							class="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-surface-container-lowest hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold flex items-center gap-1 transition-colors"
						>
							<span class="material-symbols-outlined text-[16px]">chevron_left</span>
							Sebelumnya
						</button>

						<div class="flex items-center gap-1 px-2">
							<span class="font-bold text-on-surface">{currentPage}</span>
							<span class="text-on-surface-variant">/</span>
							<span class="text-on-surface-variant">{totalPages}</span>
						</div>

						<button
							onclick={() => { currentPage = Math.min(totalPages, currentPage + 1); }}
							disabled={currentPage === totalPages}
							class="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-surface-container-lowest hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold flex items-center gap-1 transition-colors"
						>
							Berikutnya
							<span class="material-symbols-outlined text-[16px]">chevron_right</span>
						</button>
					</div>
				</div>
			{/if}
		</div>
	</div>

	<!-- ==================== TAB 2: PETA POINTING & GEOFENCE ==================== -->
	<div class="relative w-full h-[calc(100vh-14rem)] min-h-[580px] rounded-3xl overflow-hidden shadow-xs border border-slate-200/60 dark:border-slate-800/60 bg-surface-container-low" class:hidden={activeTab !== 'map'}>
		<!-- FULLSCREEN MAP -->
			<div bind:this={mapContainer} class="absolute inset-0 z-0 bg-surface-container-low"></div>

			<!-- FLOATING TOOLBAR KIRI: SEARCH & DAFTAR GERBANG TOL -->
			<div class="absolute top-4 left-4 z-20 w-84 max-w-[calc(100%-2rem)] flex flex-col gap-3 max-h-[calc(100%-2rem)] pointer-events-auto">
				<!-- Search Google Places Box -->
				<form onsubmit={searchLocationOnMap} class="relative w-full shadow-lg rounded-2xl bg-surface/95 backdrop-blur-md border border-slate-200/60 dark:border-slate-800/60 overflow-hidden flex items-center">
					<span class="material-symbols-outlined text-sky-600 dark:text-sky-400 ml-3 text-[18px]">search</span>
					<input 
						id="mapSearchInput"
						type="text" 
						bind:value={mapSearchQuery}
						placeholder="Cari gerbang tol / alamat (Google Places)..." 
						class="w-full bg-transparent text-on-surface py-2 px-2.5 focus:outline-none text-xs font-medium placeholder:text-slate-400"
					/>
					{#if isSearchingMap}
						<span class="material-symbols-outlined text-sky-500 animate-spin mr-3 text-[18px]">refresh</span>
					{/if}
				</form>

				<!-- Daftar Gerbang Tol Panel -->
				<div class="bg-surface/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/60 dark:border-slate-800/60 flex flex-col overflow-hidden flex-1">
					<div class="p-3 border-b border-slate-200/60 dark:border-slate-800/60 bg-surface-container-low/50">
						<div class="flex items-center justify-between mb-2">
							<div class="flex items-center gap-2">
								<div class="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-600 flex items-center justify-center font-bold">
									<span class="material-symbols-outlined text-base">pin_drop</span>
								</div>
								<div>
									<h2 class="font-bold text-on-surface text-xs leading-tight">Master Gerbang Tol</h2>
									<p class="text-[9px] text-on-surface-variant font-medium">Pointing & Geofence</p>
								</div>
							</div>
							<button 
								onclick={openCreateTitikModal}
								class="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-sky-600 text-white hover:bg-sky-700 transition-all cursor-pointer flex items-center gap-1"
							>
								<span class="material-symbols-outlined text-[14px]">add</span>
								Baru
							</button>
						</div>

						<!-- Sub-tab Pemilih Daftar: Master vs GPS -->
						<div class="flex items-center gap-1 p-1 bg-surface-container-low rounded-xl mb-2 border border-slate-200/60 dark:border-slate-800/60">
							<button
								type="button"
								onclick={() => { mapSidebarView = 'master'; }}
								class="flex-1 py-1 text-[10px] font-bold rounded-lg transition-all {mapSidebarView === 'master' ? 'bg-sky-600 text-white shadow-2xs' : 'text-on-surface-variant hover:text-on-surface'}"
							>
								Gerbang Tol ({data.uniqueGerbangList?.length || 0})
							</button>
							<button
								type="button"
								onclick={() => { mapSidebarView = 'gps'; }}
								class="flex-1 py-1 text-[10px] font-bold rounded-lg transition-all {mapSidebarView === 'gps' ? 'bg-sky-600 text-white shadow-2xs' : 'text-on-surface-variant hover:text-on-surface'}"
							>
								Titik GPS ({filteredTitikList.length})
							</button>
						</div>

						<!-- Filter input kecil -->
						<div class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-container-low border border-slate-200 dark:border-slate-800">
							<span class="material-symbols-outlined text-slate-400 text-[14px]">filter_alt</span>
							<input
								type="text"
								bind:value={searchTitikQuery}
								placeholder="Saring nama gerbang..."
								class="w-full bg-transparent text-[11px] text-on-surface outline-none placeholder:text-slate-400"
							/>
						</div>
					</div>

					<!-- List Gerbang Scrollable -->
					<div class="flex-1 overflow-y-auto p-2 space-y-1.5 hide-scrollbar max-h-[360px]">
						{#if mapSidebarView === 'master'}
							<!-- Tampilkan data nama gerbang fisik individual dari master.m_gerbang_tol -->
							{#each filteredUniqueGerbangList as gate}
								<div class="p-2.5 bg-surface-container/40 hover:bg-surface-container/90 rounded-xl flex items-center justify-between group transition-colors border border-transparent hover:border-sky-500/30">
									<div class="min-w-0 pr-2">
										<p class="font-bold text-xs text-on-surface truncate">{gate.nama_gerbang}</p>
										<p class="text-[10px] text-on-surface-variant truncate">{gate.ruas_tol || '-'}</p>
										<div class="flex items-center gap-1.5 mt-1">
											{#if gate.has_gps}
												<span class="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
													<span class="material-symbols-outlined text-[11px]">check_circle</span>
													Ber-GPS
												</span>
											{:else}
												<span class="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-medium bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
													Belum Pointing
												</span>
											{/if}
										</div>
									</div>
									<div class="flex items-center gap-1 shrink-0">
										{#if gate.has_gps && gate.latitude && gate.longitude}
											<button
												type="button"
												onclick={() => map?.flyTo([parseFloat(gate.latitude), parseFloat(gate.longitude)], 16, { duration: 1.2 })}
												class="w-7 h-7 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 flex items-center justify-center transition-all cursor-pointer"
												title="Fokus ke lokasi gerbang di peta"
											>
												<span class="material-symbols-outlined text-[15px]">center_focus_strong</span>
											</button>
										{/if}
										<button
											type="button"
											onclick={() => startPointingFromGate(gate)}
											class="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
											title={`Pointing geofence untuk ${gate.nama_gerbang}`}
										>
											<span class="material-symbols-outlined text-[13px]">pin_drop</span>
											Pointing
										</button>
									</div>
								</div>
							{:else}
								<div class="py-8 flex flex-col items-center justify-center opacity-50">
									<span class="material-symbols-outlined text-3xl mb-1">search_off</span>
									<p class="text-xs font-bold text-center">Tidak ada gerbang tol yang sesuai</p>
								</div>
							{/each}
						{:else}
							<!-- Tampilkan data titik fisik ber-GPS (master.m_titik_gerbang_tol) -->
							{#each filteredTitikList as gate}
								<div 
									class="p-2.5 bg-surface-container/40 hover:bg-surface-container/90 rounded-xl flex items-center justify-between group transition-colors cursor-pointer border border-transparent hover:border-sky-500/30"
									onclick={() => flyToGate(gate)}
								>
									<div class="flex items-start gap-2 min-w-0 pr-2">
										<div class="w-7 h-7 rounded-lg bg-sky-100 dark:bg-sky-900/30 text-sky-600 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-sky-600 group-hover:text-white transition-colors">
											<span class="material-symbols-outlined text-[15px]">toll</span>
										</div>
										<div class="min-w-0">
											<p class="font-bold text-xs text-on-surface truncate">{gate.nama_gerbang}</p>
											<p class="text-[10px] text-on-surface-variant truncate">
												{gate.ruas_tol || '-'} • KM {gate.km_pos ?? '-'}
											</p>
											<div class="flex items-center gap-1 mt-0.5">
												{#if gate.polygon_points && gate.polygon_points.length >= 3}
													<span class="text-[8px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/50">
														Geofence Plaza
													</span>
												{:else}
													<span class="text-[8px] font-medium px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
														Radius {gate.radius_m || 300}m
													</span>
												{/if}
											</div>
										</div>
									</div>

									<div class="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
										<button
											type="button"
											onclick={(e) => { e.stopPropagation(); openEditTitikModal(gate); }}
											class="w-6 h-6 flex items-center justify-center text-sky-600 hover:bg-sky-100 dark:hover:bg-sky-950/50 rounded-md transition-colors"
											title="Edit Titik"
										>
											<span class="material-symbols-outlined text-[15px]">edit</span>
										</button>
										<button
											type="button"
											onclick={(e) => { e.stopPropagation(); openDeleteTitikConfirm(gate); }}
											class="w-6 h-6 flex items-center justify-center text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950/50 rounded-md transition-colors"
											title="Hapus Titik"
										>
											<span class="material-symbols-outlined text-[15px]">delete</span>
										</button>
									</div>
								</div>
							{:else}
								<div class="py-8 px-4 flex flex-col items-center justify-center text-center">
									<div class="w-10 h-10 rounded-full bg-sky-50 dark:bg-sky-950/40 text-sky-600 flex items-center justify-center mb-2">
										<span class="material-symbols-outlined text-[20px]">pin_drop</span>
									</div>
									<p class="text-xs font-bold text-on-surface">Belum Ada Titik GPS</p>
									<p class="text-[11px] text-on-surface-variant mt-1 leading-relaxed">
										Pilih gerbang tol pada tab <strong>"Gerbang Tol"</strong> di atas lalu klik <strong>"Pointing"</strong>, atau klik tombol <strong>"+ Baru"</strong> untuk menandai titik di peta.
									</p>
								</div>
							{/each}
						{/if}
					</div>
				</div>
			</div>

			<!-- FLOATING PANEL KANAN: SLIDE-OVER FORM INPUT TITIK GERBANG TOL -->
			{#if showTitikModal}
				<div class="absolute top-4 right-4 z-30 w-96 max-w-[calc(100%-2rem)] flex flex-col bg-surface/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden max-h-[calc(100%-2rem)] animate-in fade-in slide-in-from-right-4 duration-200 pointer-events-auto">
					<!-- Panel Header -->
					<div class="p-4 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between bg-surface-container-low/60">
						<div class="flex items-center gap-2.5">
							<div class="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
								<span class="material-symbols-outlined text-[18px]">pin_drop</span>
							</div>
							<div>
								<h3 class="text-xs font-bold text-on-surface">
									{isEditingTitik ? 'Edit Titik Gerbang Tol' : 'Tambah Titik Gerbang Baru'}
								</h3>
								<p class="text-[10px] text-on-surface-variant">
									Pointing marker & geofence plaza tol
								</p>
							</div>
						</div>
						<button
							type="button"
							onclick={closeTitikForm}
							class="w-7 h-7 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors cursor-pointer"
						>
							<span class="material-symbols-outlined text-[18px]">close</span>
						</button>
					</div>

					<!-- Form Body Scrollable -->
					<div class="flex-1 overflow-y-auto p-4 space-y-3.5 hide-scrollbar">
						<!-- Segmented Control Mode Interaksi Peta -->
						<div>
							<span class="block text-[10px] font-black text-on-surface-variant/70 uppercase tracking-wider mb-1.5">
								Pilihan Mode Peta
							</span>
							<div class="p-1 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 flex items-center gap-1">
								<button
									type="button"
									onclick={() => { mapInteractionMode = 'point'; }}
									class="flex-1 py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all {mapInteractionMode === 'point' ? 'bg-sky-600 text-white shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}"
								>
									<span class="material-symbols-outlined text-[15px]">pin_drop</span>
									Titik Pin
								</button>
								<button
									type="button"
									onclick={() => { mapInteractionMode = 'polygon'; }}
									class="flex-1 py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all {mapInteractionMode === 'polygon' ? 'bg-sky-600 text-white shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}"
								>
									<span class="material-symbols-outlined text-[15px]">polyline</span>
									Plaza Geofence ({titikPolygonPoints.length}/4)
								</button>
							</div>
						</div>

						<!-- Panduan Interaksi Sesuai Mode Aktif -->
						{#if mapInteractionMode === 'point'}
							<div class="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200/60 dark:border-sky-800/60 flex items-start gap-2">
								<span class="material-symbols-outlined text-[16px] text-sky-600 mt-0.5">touch_app</span>
								<div>
									<p class="font-bold text-[11px] text-sky-900 dark:text-sky-200">Mode Pin Aktif</p>
									<p class="text-[10px] text-sky-700/80 dark:text-sky-400">Klik di peta atau geser pin biru untuk menentukan titik tengah gerbang tol.</p>
								</div>
							</div>
						{:else}
							<div class="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/60 flex items-start justify-between gap-2">
								<div class="flex items-start gap-2">
									<span class="material-symbols-outlined text-[16px] text-emerald-600 mt-0.5">polyline</span>
									<div>
										<p class="font-bold text-[11px] text-emerald-900 dark:text-emerald-200">Mode Plaza ({titikPolygonPoints.length}/4 Titik)</p>
										<p class="text-[10px] text-emerald-700/80 dark:text-emerald-400">Klik 4 sudut plaza gerbang tol di peta untuk membentuk geofence.</p>
									</div>
								</div>
								{#if titikPolygonPoints.length > 0}
									<button 
										type="button" 
										onclick={() => { titikPolygonPoints = []; clearDraftLayers(); }} 
										class="text-[10px] text-rose-600 font-bold hover:underline shrink-0"
									>
										Reset
									</button>
								{/if}
							</div>
						{/if}

						<form
							id="form-titik-gerbang"
							method="POST"
							action={isEditingTitik ? '?/updateTitik' : '?/createTitik'}
							use:enhance={() => {
								isSubmittingTitik = true;
								return async ({ update }) => {
									isSubmittingTitik = false;
									await update();
								};
							}}
							class="space-y-3"
						>
							{#if isEditingTitik}
								<input type="hidden" name="id" value={titikFormId} />
							{/if}

							<!-- Kode & Nama Gerbang -->
							<div class="grid grid-cols-2 gap-2">
								<div>
									<label for="titik-kode" class="block text-[11px] font-bold text-on-surface mb-1">
										Kode <span class="text-rose-500">*</span>
									</label>
									<input
										id="titik-kode"
										type="text"
										name="kode_gerbang"
										bind:value={titikKode}
										placeholder="GT-MRK"
										required
										class="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-low border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold text-on-surface outline-none focus:border-sky-500 uppercase"
									/>
								</div>
								<div>
									<label for="titik-nama" class="block text-[11px] font-bold text-on-surface mb-1">
										Nama Gerbang <span class="text-rose-500">*</span>
									</label>
									<input
										id="titik-nama"
										type="text"
										name="nama_gerbang"
										bind:value={titikNama}
										placeholder="Cth: GT Merak"
										required
										class="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-low border border-slate-200 dark:border-slate-800 text-xs text-on-surface outline-none focus:border-sky-500"
									/>
								</div>
							</div>

							<!-- Ruas Tol & KM Pos -->
							<div class="grid grid-cols-2 gap-2">
								<div>
									<label for="titik-ruas" class="block text-[11px] font-bold text-on-surface mb-1">
										Ruas Tol
									</label>
									<input
										id="titik-ruas"
										type="text"
										name="ruas_tol"
										list="titik-ruas-datalist"
										bind:value={titikRuas}
										placeholder="Tangerang - Merak"
										class="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-low border border-slate-200 dark:border-slate-800 text-xs text-on-surface outline-none focus:border-sky-500"
									/>
									<datalist id="titik-ruas-datalist">
										{#each data.ruasList as r}
											<option value={r}></option>
										{/each}
									</datalist>
								</div>
								<div>
									<label for="titik-km" class="block text-[11px] font-bold text-on-surface mb-1">
										KM Pos
									</label>
									<input
										id="titik-km"
										type="number"
										step="0.1"
										name="km_pos"
										bind:value={titikKm}
										placeholder="98.0"
										class="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-low border border-slate-200 dark:border-slate-800 text-xs font-mono text-on-surface outline-none focus:border-sky-500"
									/>
								</div>
							</div>

							<!-- Koordinat GPS -->
							<div class="p-2.5 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 space-y-2">
								<span class="block text-[10px] font-black text-on-surface-variant/70 uppercase tracking-wider">
									Koordinat GPS (Otomatis dari Peta)
								</span>
								<div class="grid grid-cols-2 gap-2">
									<div>
										<label for="titik-lat" class="block text-[10px] font-bold text-slate-500 mb-0.5">Latitude</label>
										<input
											id="titik-lat"
											type="number"
											step="0.0000001"
											name="latitude"
											bind:value={titikLat}
											required
											placeholder="-5.9288000"
											class="w-full px-2 py-1 rounded bg-surface-container-lowest border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-on-surface outline-none focus:border-sky-500"
										/>
									</div>
									<div>
										<label for="titik-lng" class="block text-[10px] font-bold text-slate-500 mb-0.5">Longitude</label>
										<input
											id="titik-lng"
											type="number"
											step="0.0000001"
											name="longitude"
											bind:value={titikLng}
											required
											placeholder="106.0028000"
											class="w-full px-2 py-1 rounded bg-surface-container-lowest border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-on-surface outline-none focus:border-sky-500"
										/>
									</div>
								</div>
							</div>

							<!-- Hidden input untuk polygon_points -->
							<input type="hidden" name="polygon_points" value={titikPolygonPoints.length > 0 ? JSON.stringify(titikPolygonPoints) : ''} />

							<!-- Radius Default & Status Aktif -->
							<div class="flex items-center justify-between pt-1">
								<div class="w-32">
									<label for="titik-rad" class="block text-[10px] font-bold text-on-surface-variant mb-0.5">Radius (m)</label>
									<input
										id="titik-rad"
										type="number"
										name="radius_m"
										bind:value={titikRadius}
										class="w-full px-2 py-1 rounded bg-surface-container-low border border-slate-200 dark:border-slate-800 text-xs font-mono text-on-surface outline-none"
									/>
								</div>
								<label class="flex items-center gap-1.5 text-xs font-bold text-on-surface cursor-pointer mt-3">
									<input type="checkbox" name="is_active" value="true" bind:checked={titikIsActive} class="rounded border-slate-300 text-sky-600 focus:ring-sky-500" />
									Status Aktif
								</label>
							</div>
						</form>
					</div>

					<!-- Panel Footer Actions -->
					<div class="p-3 border-t border-slate-200/60 dark:border-slate-800/60 bg-surface-container-low/60 flex items-center justify-end gap-2">
						<button
							type="button"
							onclick={closeTitikForm}
							disabled={isSubmittingTitik}
							class="px-3.5 py-1.5 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
						>
							Batal
						</button>
						<button
							type="submit"
							form="form-titik-gerbang"
							disabled={isSubmittingTitik}
							class="bg-sky-600 hover:bg-sky-700 active:scale-98 text-white px-4 py-1.5 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
						>
							{#if isSubmittingTitik}
								<span class="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
								Menyimpan...
							{:else}
								<span class="material-symbols-outlined text-[16px]">save</span>
								Simpan Titik
							{/if}
						</button>
					</div>
				</div>
			{/if}
		</div>
</div>

<!-- ==================== MODAL KONFIRMASI HAPUS TITIK FISIK ==================== -->
{#if showDeleteTitikModal && titikToDelete}
	<div class="fixed inset-0 z-[1000] flex items-center justify-center p-4">
		<div class="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onclick={() => { if (!isDeletingTitik) showDeleteTitikModal = false; }}></div>
		<div class="relative w-full max-w-md bg-surface-container-lowest rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden z-10 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
			<div class="flex items-start gap-3.5">
				<div class="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 flex items-center justify-center flex-shrink-0">
					<span class="material-symbols-outlined text-[22px]">delete_forever</span>
				</div>
				<div>
					<h3 class="text-sm font-bold text-on-surface">Konfirmasi Hapus Titik Gerbang</h3>
					<p class="text-xs text-on-surface-variant mt-1">
						Apakah Anda yakin ingin menghapus titik fisik <strong class="text-on-surface">{titikToDelete.nama_gerbang}</strong> ({titikToDelete.kode_gerbang})?
					</p>
				</div>
			</div>

			<div class="flex items-center justify-end gap-2 pt-2">
				<button
					type="button"
					onclick={() => { showDeleteTitikModal = false; }}
					disabled={isDeletingTitik}
					class="px-4 py-2 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
				>
					Batal
				</button>
				<form
					method="POST"
					action="?/deleteTitik"
					use:enhance={() => {
						isDeletingTitik = true;
						return async ({ update }) => {
							isDeletingTitik = false;
							await update();
						};
					}}
				>
					<input type="hidden" name="id" value={titikToDelete.id} />
					<button
						type="submit"
						disabled={isDeletingTitik}
						class="bg-rose-600 hover:bg-rose-700 active:scale-98 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
					>
						{#if isDeletingTitik}
							<span class="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
							Menghapus...
						{:else}
							<span class="material-symbols-outlined text-[16px]">delete</span>
							Ya, Hapus
						{/if}
					</button>
				</form>
			</div>
		</div>
	</div>
{/if}

<!-- ==================== MODAL FORM TARIF RUAS ==================== -->
{#if showModal}
	<div class="fixed inset-0 z-[1000] flex items-center justify-center p-4">
		<div class="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onclick={() => { if (!isSubmitting) showModal = false; }}></div>

		<div class="relative w-full max-w-xl bg-surface-container-lowest rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
			<div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-surface-container-low/40">
				<div class="flex items-center gap-2.5">
					<div class="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
						<span class="material-symbols-outlined text-[18px]">{isEditing ? 'edit' : 'add'}</span>
					</div>
					<div>
						<h3 class="text-sm font-bold text-on-surface">
							{isEditing ? 'Edit Data Tarif Ruas Tol' : 'Tambah Tarif Ruas Tol Baru'}
						</h3>
						<p class="text-[11px] text-on-surface-variant">
							Hubungkan ke titik fisik gerbang asal & tujuan serta konfigurasi tarif per golongan.
						</p>
					</div>
				</div>
				<button
					type="button"
					onclick={() => { showModal = false; }}
					disabled={isSubmitting}
					class="w-7 h-7 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors cursor-pointer"
				>
					<span class="material-symbols-outlined text-[18px]">close</span>
				</button>
			</div>

			<form
				method="POST"
				action={isEditing ? '?/update' : '?/create'}
				use:enhance={() => {
					isSubmitting = true;
					return async ({ update }) => {
						isSubmitting = false;
						await update();
					};
				}}
				class="p-6 space-y-4"
			>
				{#if isEditing}
					<input type="hidden" name="id" value={formId} />
				{/if}

				<div>
					<label for="modal-ruas" class="block text-xs font-bold text-on-surface mb-1">
						Nama Ruas Tol <span class="text-rose-500">*</span>
					</label>
					<input
						id="modal-ruas"
						type="text"
						name="ruas"
						list="ruas-datalist"
						bind:value={formRuas}
						placeholder="Misal: Tangerang - Merak, Jakarta - Cikampek..."
						required
						class="w-full px-3.5 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-xs text-on-surface outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
					/>
					<datalist id="ruas-datalist">
						{#each data.ruasList as r}
							<option value={r}></option>
						{/each}
					</datalist>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div>
						<label for="modal-asal-id" class="block text-xs font-bold text-on-surface mb-1">
							Titik Fisik Asal (Masuk)
						</label>
						<select
							id="modal-asal-id"
							name="gerbang_asal_id"
							bind:value={formAsalId}
							onchange={(e) => handleTitikAsalSelect((e.target as HTMLSelectElement).value ? Number((e.target as HTMLSelectElement).value) : '')}
							class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-xs text-on-surface outline-none focus:border-sky-500"
						>
							<option value="">-- Pilih Titik Fisik (Opsional) --</option>
							{#each (data.titikGerbangList || []) as tg}
								<option value={tg.id}>{tg.nama_gerbang} ({tg.ruas_tol || '-'})</option>
							{/each}
						</select>
						<input
							type="text"
							name="asal"
							bind:value={formAsal}
							placeholder="Nama teks asal (cth: Merak)"
							required
							class="w-full mt-1.5 px-3 py-1.5 rounded-lg bg-surface-container-lowest border border-slate-200 dark:border-slate-800 text-xs text-on-surface outline-none"
						/>
					</div>

					<div>
						<label for="modal-tujuan-id" class="block text-xs font-bold text-on-surface mb-1">
							Titik Fisik Tujuan (Keluar)
						</label>
						<select
							id="modal-tujuan-id"
							name="gerbang_tujuan_id"
							bind:value={formTujuanId}
							onchange={(e) => handleTitikTujuanSelect((e.target as HTMLSelectElement).value ? Number((e.target as HTMLSelectElement).value) : '')}
							class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-xs text-on-surface outline-none focus:border-sky-500"
						>
							<option value="">-- Pilih Titik Fisik (Opsional) --</option>
							{#each (data.titikGerbangList || []) as tg}
								<option value={tg.id}>{tg.nama_gerbang} ({tg.ruas_tol || '-'})</option>
							{/each}
						</select>
						<input
							type="text"
							name="tujuan"
							bind:value={formTujuan}
							placeholder="Nama teks tujuan (cth: Cikupa)"
							required
							class="w-full mt-1.5 px-3 py-1.5 rounded-lg bg-surface-container-lowest border border-slate-200 dark:border-slate-800 text-xs text-on-surface outline-none"
						/>
					</div>
				</div>

				<div>
					<label for="modal-jarak" class="block text-xs font-bold text-on-surface mb-1">
						Jarak Ruas Tol (KM)
					</label>
					<input
						id="modal-jarak"
						type="number"
						step="0.1"
						name="jarak_ruas_km"
						bind:value={formJarakKm}
						placeholder="Misal: 67.0"
						class="w-full px-3.5 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-xs font-mono text-on-surface outline-none focus:border-sky-500"
					/>
					<p class="text-[10px] text-on-surface-variant mt-1">Dihitung otomatis jika gerbang asal dan tujuan memiliki koordinat KM Pos.</p>
				</div>

				<div class="pt-2 border-t border-slate-200 dark:border-slate-800">
					<p class="text-[10px] font-black text-on-surface-variant/60 uppercase tracking-wider mb-3">
						Konfigurasi Tarif per Golongan Kendaraan (IDR)
					</p>

					<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
						<div class="p-3 rounded-xl bg-surface-container-low/60 border border-slate-200/60 dark:border-slate-800/60">
							<label for="modal-tarif-1" class="block text-[11px] font-bold text-on-surface mb-0.5">Golongan I</label>
							<span class="text-[9px] text-on-surface-variant/70 block mb-1.5">Sedan, Pick Up, Bus</span>
							<input
								id="modal-tarif-1"
								type="number"
								name="tarif_gol_1"
								min="0"
								step="500"
								bind:value={formTarif1}
								class="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-lowest border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold text-on-surface outline-none focus:border-sky-500"
							/>
						</div>

						<div class="p-3 rounded-xl bg-sky-50/50 dark:bg-sky-950/20 border border-sky-200/60 dark:border-sky-800/60">
							<label for="modal-tarif-23" class="block text-[11px] font-bold text-sky-800 dark:text-sky-300 mb-0.5">Golongan II & III</label>
							<span class="text-[9px] text-sky-600/70 dark:text-sky-400/70 block mb-1.5">Truk 2 As & 3 As (Utama BCS)</span>
							<input
								id="modal-tarif-23"
								type="number"
								name="tarif_gol_2_3"
								min="0"
								step="500"
								bind:value={formTarif23}
								class="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-lowest border border-sky-300 dark:border-sky-700 text-xs font-mono font-bold text-sky-900 dark:text-sky-200 outline-none focus:border-sky-500"
							/>
						</div>

						<div class="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-800/60">
							<label for="modal-tarif-45" class="block text-[11px] font-bold text-indigo-800 dark:text-indigo-300 mb-0.5">Golongan IV & V</label>
							<span class="text-[9px] text-indigo-600/70 dark:text-indigo-400/70 block mb-1.5">Truk 4 As, 5 As / Lebih</span>
							<input
								id="modal-tarif-45"
								type="number"
								name="tarif_gol_4_5"
								min="0"
								step="500"
								bind:value={formTarif45}
								class="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-lowest border border-indigo-300 dark:border-indigo-700 text-xs font-mono font-bold text-indigo-900 dark:text-indigo-200 outline-none focus:border-indigo-500"
							/>
						</div>
					</div>
				</div>

				<div class="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
					<button
						type="button"
						onclick={() => { showModal = false; }}
						disabled={isSubmitting}
						class="px-4 py-2 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
					>
						Batal
					</button>
					<button
						type="submit"
						disabled={isSubmitting}
						class="bg-sky-600 hover:bg-sky-700 active:scale-98 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
					>
						{#if isSubmitting}
							<span class="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
							Menyimpan...
						{:else}
							<span class="material-symbols-outlined text-[16px]">save</span>
							{isEditing ? 'Simpan Perubahan' : 'Tambahkan Gerbang'}
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- ==================== MODAL KONFIRMASI HAPUS TARIF RUAS ==================== -->
{#if showDeleteModal && gateToDelete}
	{@const isUsed = isGateUsed(gateToDelete.id)}
	<div class="fixed inset-0 z-[1000] flex items-center justify-center p-4">
		<div class="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onclick={() => { if (!isDeleting) showDeleteModal = false; }}></div>
		<div class="relative w-full max-w-md bg-surface-container-lowest rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150 p-6">
			<div class="flex items-start gap-3.5">
				<div class="w-10 h-10 rounded-xl {isUsed ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'} flex items-center justify-center flex-shrink-0">
					<span class="material-symbols-outlined text-[22px]">
						{isUsed ? 'warning' : 'delete_forever'}
					</span>
				</div>
				<div>
					<h3 class="text-sm font-bold text-on-surface">
						{isUsed ? 'Gerbang Tol Tidak Dapat Dihapus' : 'Konfirmasi Hapus Gerbang Tol'}
					</h3>
					<p class="text-xs text-on-surface-variant mt-1">
						{#if isUsed}
							Gerbang tol <strong class="text-on-surface">{gateToDelete.asal} → {gateToDelete.tujuan}</strong> ({gateToDelete.ruas}) sedang terhubung dengan <strong>Master Rute UJO</strong> aktif.
						{:else}
							Apakah Anda yakin ingin menghapus tarif ruas tol <strong class="text-on-surface">{gateToDelete.asal} → {gateToDelete.tujuan}</strong> ({gateToDelete.ruas})?
						{/if}
					</p>
				</div>
			</div>

			<div class="mt-6 flex items-center justify-end gap-2">
				<button
					type="button"
					onclick={() => { showDeleteModal = false; }}
					disabled={isDeleting}
					class="px-4 py-2 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
				>
					{isUsed ? 'Tutup' : 'Batal'}
				</button>
				{#if !isUsed}
					<form
						method="POST"
						action="?/delete"
						use:enhance={() => {
							isDeleting = true;
							return async ({ update }) => {
								isDeleting = false;
								await update();
							};
						}}
					>
						<input type="hidden" name="id" value={gateToDelete.id} />
						<button
							type="submit"
							disabled={isDeleting}
							class="bg-rose-600 hover:bg-rose-700 active:scale-98 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
						>
							{#if isDeleting}
								<span class="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
								Menghapus...
							{:else}
								<span class="material-symbols-outlined text-[16px]">delete</span>
								Ya, Hapus
							{/if}
						</button>
					</form>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	:global(.leaflet-container) {
		width: 100%;
		height: 100%;
		z-index: 0;
	}
	:global(.pac-container) {
		z-index: 99999 !important;
		border-radius: 1rem;
		margin-top: 6px;
		box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
		border: 1px solid rgba(226, 232, 240, 0.8);
		font-family: inherit;
		padding: 4px;
	}
	:global(.pac-item) {
		padding: 6px 10px;
		border-radius: 0.5rem;
		cursor: pointer;
		font-size: 12px;
	}
	:global(.pac-item:hover) {
		background-color: rgba(2, 132, 199, 0.08);
	}
	:global(.pac-item-query) {
		font-size: 12px;
		font-weight: 700;
		color: #0369a1;
	}
</style>
