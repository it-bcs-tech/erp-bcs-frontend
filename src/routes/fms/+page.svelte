<script lang="ts">
	let { data } = $props();
	const metrics         = $derived(data.metrics || {});
	const fleetSummary    = $derived(data.fleetSummary || {});
	const alerts          = $derived(data.alerts || []);
	const liveUnits       = $derived(data.liveUnits || []);
	const topDrivers      = $derived(data.topDrivers || []);
	const recentTrips     = $derived(data.recentTrips || []);
	const recentUnits     = $derived(data.recentUnits || []);
	const activeContracts = $derived(data.activeContracts || []);
	const allFleetUnits   = $derived(data.allFleetUnits || []);
	const openWorkOrders  = $derived(data.openWorkOrders || []);

	// Interactivity States
	let activeModal        = $state<string | null>(null);
	let modalSearch        = $state('');
	let selectedUnit       = $state<any | null>(null);
	let selectedTrip       = $state<any | null>(null);
	let selectedDriver     = $state<any | null>(null);
	let selectedAlert      = $state<any | null>(null);
	let selectedTrendMonth = $state<string | null>(null);
	let perfTab            = $state<'contracts' | 'drivers'>('contracts');

	// Donut Chart State & Derived Data
	let donutViewMode     = $state<'READINESS' | 'BU'>('READINESS');
	let hoveredDonutSlice = $state<{ label: string; count: number; pct: number; color: string } | null>(null);

	const donutData = $derived.by(() => {
		const total = metrics.totalVehicles || 1;
		const C = 251.327; // 2 * PI * 40

		if (donutViewMode === 'READINESS') {
			const standby = fleetSummary.available ?? 0;
			const onRoute = (fleetSummary.moving ?? 0) + (fleetSummary.loading ?? 0) + (fleetSummary.unloading ?? 0) + (fleetSummary.dispatched ?? 0) + (fleetSummary.returning ?? 0);
			const workshop = fleetSummary.maintenance ?? 0;
			const inactive = Math.max(0, (fleetSummary.inactive ?? 0) - workshop);

			const items = [
				{ key: 'STATUS_AVAILABLE', label: 'Standby Pool', count: standby, color: '#10b981', bgCls: 'bg-emerald-500' },
				{ key: 'STATUS_MOVING', label: 'On Delivery', count: onRoute, color: '#3b82f6', bgCls: 'bg-blue-500' },
				{ key: 'STATUS_MAINTENANCE', label: 'In Workshop', count: workshop, color: '#f59e0b', bgCls: 'bg-amber-500' },
				{ key: 'STATUS_INACTIVE', label: 'Non-Aktif', count: inactive, color: '#64748b', bgCls: 'bg-slate-500' }
			];

			let offset = 0;
			return items.map(it => {
				const pct = Math.round((it.count / total) * 100);
				const strokeLength = Math.max(0, (it.count / total) * C);
				const dashArray = `${strokeLength} ${C - strokeLength}`;
				const dashOffset = -offset;
				offset += strokeLength;
				return { ...it, pct, dashArray, dashOffset };
			});
		} else {
			const dt = fleetSummary.dumpTruck ?? 0;
			const trans = fleetSummary.transportation ?? 0;
			const other = Math.max(0, total - dt - trans);

			const items = [
				{ key: 'BU_DUMP_TRUCK', search: 'Dump Truck', label: 'Dump Truck', count: dt, color: '#f59e0b', bgCls: 'bg-amber-500' },
				{ key: 'BU_TRANSPORTATION', search: 'Transportation', label: 'Transportation', count: trans, color: '#3b82f6', bgCls: 'bg-blue-500' },
				{ key: 'BU_OTHER', search: 'Outsourcing', label: 'Lainnya', count: other, color: '#8b5cf6', bgCls: 'bg-purple-500' }
			];

			let offset = 0;
			return items.map(it => {
				const pct = Math.round((it.count / total) * 100);
				const strokeLength = Math.max(0, (it.count / total) * C);
				const dashArray = `${strokeLength} ${C - strokeLength}`;
				const dashOffset = -offset;
				offset += strokeLength;
				return { ...it, pct, dashArray, dashOffset };
			});
		}
	});

	function handleDonutSliceClick(item: any) {
		if (donutViewMode === 'READINESS') {
			openModal(item.key);
		} else {
			openModal('TOTAL_VEHICLES');
			modalSearch = item.search || item.label;
		}
	}

	function openModal(category: string) {
		activeModal = category;
		modalSearch = '';
	}

	function closeModal() {
		activeModal = null;
		selectedUnit = null;
		selectedTrip = null;
		selectedDriver = null;
		selectedAlert = null;
		modalSearch = '';
	}

	// Filtered Units inside Drill-down Modal
	const modalFilteredUnits = $derived.by(() => {
		if (!activeModal) return [];
		let list = allFleetUnits;

		if (activeModal === 'ACTIVE_FLEET') {
			list = list.filter(u => u.is_active);
		} else if (activeModal === 'STATUS_AVAILABLE') {
			list = list.filter(u => u.is_active && u.current_state === 'AT_POOL');
		} else if (activeModal === 'STATUS_DISPATCHED') {
			list = list.filter(u => u.current_state === 'DISPATCHED');
		} else if (activeModal === 'STATUS_LOADING') {
			list = list.filter(u => u.current_state === 'AT_ORIGIN');
		} else if (activeModal === 'STATUS_MOVING') {
			list = list.filter(u => u.current_state === 'ON_ROUTE');
		} else if (activeModal === 'STATUS_UNLOADING') {
			list = list.filter(u => u.current_state === 'AT_DESTINATION');
		} else if (activeModal === 'STATUS_RETURNING') {
			list = list.filter(u => u.current_state === 'RETURNING');
		} else if (activeModal === 'STATUS_MAINTENANCE' || activeModal === 'IN_MAINTENANCE') {
			list = list.filter(u => u.current_state === 'MAINTENANCE' || openWorkOrders.some(w => w.unit_id === u.nomor_unit));
		} else if (activeModal === 'STATUS_INACTIVE') {
			list = list.filter(u => !u.is_active);
		} else if (activeModal === 'MAINTENANCE_ALERTS') {
			list = list.filter(u => 
				(u.tgl_maintenance_prevent && new Date(u.tgl_maintenance_prevent) < new Date()) || 
				(u.expire_date_asuransi && new Date(u.expire_date_asuransi) < new Date())
			);
		}

		if (modalSearch.trim()) {
			const q = modalSearch.toLowerCase();
			list = list.filter(u => 
				(u.nomor_unit && u.nomor_unit.toLowerCase().includes(q)) ||
				(u.no_lambung && u.no_lambung.toLowerCase().includes(q)) ||
				(u.driver_nama && u.driver_nama.toLowerCase().includes(q)) ||
				(u.nama_model && u.nama_model.toLowerCase().includes(q)) ||
				(u.nama_tipe && u.nama_tipe.toLowerCase().includes(q)) ||
				(u.business_unit && u.business_unit.toLowerCase().includes(q))
			);
		}

		return list;
	});

	function getModalMeta(category: string) {
		switch (category) {
			case 'TOTAL_VEHICLES':
				return { title: 'Daftar Seluruh Armada Logistik', desc: 'Roster lengkap unit armada terdaftar di sistem', link: '/fms/vehicles', linkText: 'Buka Halaman Armada →' };
			case 'ACTIVE_FLEET':
				return { title: 'Daftar Armada Aktif Siap Operasi', desc: 'Unit kendaraan dengan status operasional aktif', link: '/fms/vehicles?status=ACTIVE', linkText: 'Filter Armada Aktif →' };
			case 'ACTIVE_TRIPS':
				return { title: 'Trip Berjalan (Live Deliveries)', desc: 'Daftar pengiriman logistik yang sedang berlangsung', link: '/fms/trips', linkText: 'Buka Monitoring Trips →' };
			case 'MAINTENANCE_ALERTS':
				return { title: 'Armada Perlu Perhatian', desc: 'Unit dengan jadwal preventif terlewat atau asuransi kadaluarsa', link: '/fms/maintenance', linkText: 'Buka Jadwal Servis →' };
			case 'STATUS_AVAILABLE':
				return { title: 'Unit Standby Pool (Tersedia)', desc: 'Armada aktif di pool tanpa penugasan SO yang siap di-dispatch', link: '/fms/vehicles?status=ACTIVE', linkText: 'Lihat Armada Siap Jalan →' };
			case 'STATUS_DISPATCHED':
				return { title: 'Unit Dispatched (Surat Tugas Terbit)', desc: 'Armada yang sudah terbit SPK / surat tugas menunggu keberangkatan', link: '/fms/trips', linkText: 'Lihat Trip Dispatched →' };
			case 'STATUS_LOADING':
				return { title: 'Unit Sedang Muat (Loading at Origin)', desc: 'Armada berada di lokasi asal pengirim dalam proses pemuatan kargo', link: '/fms/trips', linkText: 'Lihat Monitoring Trip →' };
			case 'STATUS_MOVING':
				return { title: 'Unit On Route (Perjalanan Kirim)', desc: 'Armada bergerak di jalur pengiriman menuju destinasi kustomer', link: '/fms/live-map', linkText: 'Pantau di Live GPS Map →' };
			case 'STATUS_UNLOADING':
				return { title: 'Unit Bongkar Muatan (At Destination)', desc: 'Armada berada di pabrik / gudang kustomer dalam proses bongkar', link: '/fms/trips', linkText: 'Lihat Detail Bongkar →' };
			case 'STATUS_RETURNING':
				return { title: 'Unit Perjalanan Kembali (Returning)', desc: 'Armada telah selesai bongkar dan kembali menuju pool pangkalan', link: '/fms/trips', linkText: 'Pantau Trip Kembali →' };
			case 'STATUS_MAINTENANCE':
				return { title: 'Unit Dalam Perbaikan Bengkel', desc: 'Armada dalam penanganan Work Order bengkel aktif', link: '/fms/maintenance', linkText: 'Buka Work Orders →' };
			case 'STATUS_INACTIVE':
				return { title: 'Armada Non-Aktif / Rusak Berat', desc: 'Kendaraan yang dinonaktifkan dari jadwal operasional', link: '/fms/vehicles?status=INACTIVE', linkText: 'Lihat Unit Non-Aktif →' };
			default:
				return { title: 'Rincian Data Armada', desc: 'Daftar data terkait metrik yang dipilih', link: '/fms/vehicles', linkText: 'Buka Modul FMS →' };
		}
	}

	function getAlertIcon(type: string) {
		switch(type) {
			case 'Maintenance': return 'build';
			case 'Asuransi':    return 'policy';
			case 'Geofence':    return 'fence';
			case 'Speed':       return 'speed';
			default:            return 'warning';
		}
	}

	function getBuIcon(bu: string) {
		if (bu === 'DUMP_TRUCK') return 'construction';
		if (bu === 'OUTSOURCING') return 'handshake';
		return 'local_shipping';
	}

	function getTripStatusBadge(status: string) {
		switch(status) {
			case 'AT_ORIGIN':      return { cls: 'text-indigo-600 bg-indigo-500/10 border-indigo-200 dark:border-indigo-800', dot: 'bg-indigo-500 animate-pulse', label: 'Loading at Origin' };
			case 'ON_ROUTE':       return { cls: 'text-blue-600 bg-blue-500/10 border-blue-200 dark:border-blue-800', dot: 'bg-blue-500 animate-pulse', label: 'On Route' };
			case 'AT_DESTINATION': return { cls: 'text-indigo-600 bg-indigo-500/10 border-indigo-200 dark:border-indigo-800', dot: 'bg-indigo-500 animate-pulse', label: 'Unloading' };
			case 'RETURNING':      return { cls: 'text-teal-600 bg-teal-500/10 border-teal-200 dark:border-teal-800', dot: 'bg-teal-500 animate-pulse', label: 'Returning' };
			case 'COMPLETED':      return { cls: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800', dot: 'bg-emerald-500', label: 'Completed' };
			case 'CANCELLED':      return { cls: 'text-rose-700 bg-rose-50 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-800', dot: 'bg-rose-500', label: 'Dibatalkan' };
			default:               return { cls: 'text-slate-600 bg-slate-500/10 border-slate-200 dark:border-slate-700', dot: 'bg-slate-400', label: status };
		}
	}

	function getTripIcon(status: string) {
		switch (status) {
			case 'AT_ORIGIN':      return 'forklift';
			case 'ON_ROUTE':       return 'local_shipping';
			case 'AT_DESTINATION': return 'forklift';
			case 'RETURNING':      return 'local_shipping';
			case 'COMPLETED':      return 'check_circle';
			case 'CANCELLED':      return 'cancel';
			default:               return 'receipt_long';
		}
	}

	function getTripIconBg(status: string) {
		switch (status) {
			case 'AT_ORIGIN':      return 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400';
			case 'ON_ROUTE':       return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400';
			case 'AT_DESTINATION': return 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400';
			case 'RETURNING':      return 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400';
			case 'COMPLETED':      return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400';
			case 'CANCELLED':      return 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400';
			default:               return 'bg-slate-100 dark:bg-slate-800 text-slate-600';
		}
	}

	// 8 Lifecycle Stages Data Mapping
	const operationalStages = $derived([
		{ 
			key: 'STATUS_AVAILABLE', 
			label: 'Standby Pool', 
			count: fleetSummary.available ?? 0, 
			icon: 'local_parking',
			textCls: 'text-emerald-600 dark:text-emerald-400', 
			bgCls: 'bg-emerald-500/10',
			borderCls: 'hover:border-emerald-500/60',
			barCls: 'bg-emerald-500',
			dotCls: 'bg-emerald-500'
		},
		{ 
			key: 'STATUS_DISPATCHED', 
			label: 'Dispatched', 
			count: fleetSummary.dispatched ?? 0, 
			icon: 'assignment_turned_in',
			textCls: 'text-purple-600 dark:text-purple-400', 
			bgCls: 'bg-purple-500/10',
			borderCls: 'hover:border-purple-500/60',
			barCls: 'bg-purple-500',
			dotCls: 'bg-purple-500'
		},
		{ 
			key: 'STATUS_LOADING', 
			label: 'Loading', 
			count: fleetSummary.loading ?? 0, 
			icon: 'forklift',
			textCls: 'text-indigo-600 dark:text-indigo-400', 
			bgCls: 'bg-indigo-500/10',
			borderCls: 'hover:border-indigo-500/60',
			barCls: 'bg-indigo-500',
			dotCls: 'bg-indigo-500'
		},
		{ 
			key: 'STATUS_MOVING', 
			label: 'On Route', 
			count: fleetSummary.moving ?? 0, 
			icon: 'local_shipping',
			textCls: 'text-blue-600 dark:text-blue-400', 
			bgCls: 'bg-blue-500/10',
			borderCls: 'hover:border-blue-500/60',
			barCls: 'bg-blue-500',
			dotCls: 'bg-blue-500'
		},
		{ 
			key: 'STATUS_UNLOADING', 
			label: 'Unloading', 
			count: fleetSummary.unloading ?? 0, 
			icon: 'warehouse',
			textCls: 'text-cyan-600 dark:text-cyan-400', 
			bgCls: 'bg-cyan-500/10',
			borderCls: 'hover:border-cyan-500/60',
			barCls: 'bg-cyan-500',
			dotCls: 'bg-cyan-500'
		},
		{ 
			key: 'STATUS_RETURNING', 
			label: 'Returning', 
			count: fleetSummary.returning ?? 0, 
			icon: 'u_turn_left',
			textCls: 'text-teal-600 dark:text-teal-400', 
			bgCls: 'bg-teal-500/10',
			borderCls: 'hover:border-teal-500/60',
			barCls: 'bg-teal-500',
			dotCls: 'bg-teal-500'
		},
		{ 
			key: 'STATUS_MAINTENANCE', 
			label: 'In Workshop', 
			count: fleetSummary.maintenance ?? 0, 
			icon: 'build',
			textCls: 'text-amber-600 dark:text-amber-400', 
			bgCls: 'bg-amber-500/10',
			borderCls: 'hover:border-amber-500/60',
			barCls: 'bg-amber-500',
			dotCls: 'bg-amber-500'
		},
		{ 
			key: 'STATUS_INACTIVE', 
			label: 'Non-Aktif', 
			count: fleetSummary.inactive ?? 0, 
			icon: 'pause_circle',
			textCls: 'text-slate-500 dark:text-slate-400', 
			bgCls: 'bg-slate-500/10',
			borderCls: 'hover:border-slate-500/60',
			barCls: 'bg-slate-400',
			dotCls: 'bg-slate-400'
		}
	]);
</script>

<svelte:head>
	<title>Fleet Dashboard | ERP BCS</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Header Section -->
	<header class="flex flex-col md:flex-row md:items-end justify-between gap-4 flex-shrink-0">
		<div>
			<div class="flex items-center gap-2.5">
				<div class="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">local_shipping</span>
				</div>
				<div>
					<h1 class="text-2xl font-black text-on-surface tracking-tight">Fleet Dashboard</h1>
					<p class="text-on-surface-variant font-medium text-xs mt-0.5">
						Intelligence Dashboard operasional armada logistik, utilisasi unit, status perbaikan, dan live tracking
					</p>
				</div>
			</div>
		</div>
		<div class="flex items-center gap-2.5">
			<button 
				onclick={() => openModal('TOTAL_VEHICLES')} 
				class="bg-surface-container-low hover:bg-surface-container border border-slate-200/60 dark:border-slate-800/60 text-on-surface px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
			>
				<span class="material-symbols-outlined text-lg">view_list</span>
				<span>Daftar Unit</span>
			</button>
			<a href="/fms/live-map" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-xs transition-colors">
				<span class="material-symbols-outlined text-lg">map</span>
				<span>Live GPS Map</span>
			</a>
		</div>
	</header>

	<!-- Interactive Metrics Grid (Bento) -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<!-- Total Vehicles -->
		<button 
			type="button"
			onclick={() => openModal('TOTAL_VEHICLES')}
			class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs text-left hover:border-blue-500/40 hover:bg-surface-container/70 transition-all cursor-pointer group"
		>
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider group-hover:text-blue-600 transition-colors">Total Kendaraan</p>
					<h3 class="text-2xl font-black text-on-surface mt-1">{metrics.totalVehicles ?? 0}</h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
					<span class="material-symbols-outlined text-2xl">local_shipping</span>
				</div>
			</div>
			<div class="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-200/40 dark:border-slate-800/40">
				<div class="flex items-center gap-2">
					<span class="text-blue-600 dark:text-blue-400 text-xs font-bold">{fleetSummary.dumpTruck ?? 0} Dump Truck</span>
					<span class="text-on-surface-variant/60 text-xs font-medium">· {fleetSummary.transportation ?? 0} Trans</span>
				</div>
				<span class="text-[10px] text-blue-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
					Lihat <span class="material-symbols-outlined text-xs">arrow_forward</span>
				</span>
			</div>
		</button>

		<!-- Active Fleet -->
		<button 
			type="button"
			onclick={() => openModal('ACTIVE_FLEET')}
			class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs text-left hover:border-emerald-500/40 hover:bg-surface-container/70 transition-all cursor-pointer group"
		>
			<div class="flex items-center justify-between">
				<div>
					<div class="flex items-center gap-1.5">
						<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider group-hover:text-emerald-600 transition-colors">Armada Aktif</p>
						<span class="px-1.5 py-0.2 bg-emerald-500/10 text-emerald-600 font-bold text-[9px] rounded">
							{metrics.fleetUtilization ?? 0}%
						</span>
					</div>
					<h3 class="text-2xl font-black text-emerald-600 mt-1">{metrics.activeVehicles ?? 0}</h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
					<span class="material-symbols-outlined text-2xl">directions_car</span>
				</div>
			</div>
			<!-- Progress Bar Utilisasi -->
			<div class="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mt-2.5 overflow-hidden">
				<div class="h-full bg-emerald-500 rounded-full transition-all duration-500" style="width: {Math.min(100, metrics.fleetUtilization || 0)}%"></div>
			</div>
			<div class="flex items-center justify-between mt-2">
				<div class="flex items-center gap-1.5">
					<span class="text-[10px] font-bold text-emerald-600">🟢 {metrics.availableVehicles ?? 0} Standby</span>
					<span class="text-on-surface-variant/40">·</span>
					<span class="text-[10px] font-bold text-blue-600">🔵 {metrics.activeTrips ?? 0} Trip</span>
				</div>
				<span class="text-[10px] text-emerald-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
					Lihat <span class="material-symbols-outlined text-xs">arrow_forward</span>
				</span>
			</div>
		</button>

		<!-- Active Trips -->
		<button 
			type="button"
			onclick={() => openModal('ACTIVE_TRIPS')}
			class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs text-left hover:border-blue-500/40 hover:bg-surface-container/70 transition-all cursor-pointer group"
		>
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider group-hover:text-blue-600 transition-colors">Trip Berjalan</p>
					<h3 class="text-2xl font-black text-blue-600 mt-1">{metrics.activeTrips ?? 0}</h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
					<span class="material-symbols-outlined text-2xl">route</span>
				</div>
			</div>
			<div class="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-200/40 dark:border-slate-800/40">
				<div class="flex items-center gap-1.5">
					<span class="text-[10px] font-bold text-indigo-600">🟣 {metrics.loadingTrips ?? 0} Muat</span>
					<span class="text-on-surface-variant/40">·</span>
					<span class="text-[10px] font-bold text-blue-600">🔵 {metrics.onRouteTrips ?? 0} Kirim</span>
				</div>
				<span class="text-[10px] text-blue-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
					Lihat <span class="material-symbols-outlined text-xs">arrow_forward</span>
				</span>
			</div>
		</button>

		<!-- Maintenance Alerts -->
		<button 
			type="button"
			onclick={() => openModal('MAINTENANCE_ALERTS')}
			class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs text-left hover:border-rose-500/40 hover:bg-surface-container/70 transition-all cursor-pointer group"
		>
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider group-hover:text-rose-600 transition-colors">Perlu Perhatian</p>
					<h3 class="text-2xl font-black text-rose-600 mt-1">{metrics.maintenanceAlerts ?? 0}</h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center group-hover:scale-105 transition-transform">
					<span class="material-symbols-outlined text-2xl">build</span>
				</div>
			</div>
			<div class="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-200/40 dark:border-slate-800/40">
				<div class="flex items-center gap-1.5">
					<span class="text-[10px] font-bold text-rose-600">🔴 {metrics.criticalMaintenance ?? 0} Asuransi</span>
					<span class="text-on-surface-variant/40">·</span>
					<span class="text-[10px] font-bold text-amber-600">🛠️ {metrics.inMaintenance ?? 0} Servis</span>
				</div>
				<span class="text-[10px] text-rose-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
					Lihat <span class="material-symbols-outlined text-xs">arrow_forward</span>
				</span>
			</div>
		</button>
	</div>

	<!-- Executive Live Operational Pipeline Strip -->
	<div class="p-4 sm:p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
		<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
			<div class="flex items-center gap-2">
				<div class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
				<h2 class="text-xs font-bold text-on-surface uppercase tracking-wider">Alur Siklus Armada (Live Pipeline)</h2>
				<span class="text-[11px] text-on-surface-variant font-medium">· Klik tahapan untuk rincian unit</span>
			</div>
			<div class="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400">
				<span class="material-symbols-outlined text-[16px]">local_shipping</span>
				<span>{metrics.totalVehicles ?? 0} Total Unit Armada</span>
			</div>
		</div>

		<!-- Multi-segment continuous horizontal progress track -->
		<div class="w-full h-2.5 rounded-full bg-slate-200/70 dark:bg-slate-800 overflow-hidden flex shadow-inner">
			{#each operationalStages as item}
				{@const total = metrics.totalVehicles || 1}
				{@const pct = Math.round(((item.count || 0) / total) * 100)}
				{#if (item.count || 0) > 0}
					<button
						type="button"
						onclick={() => openModal(item.key)}
						class="{item.barCls} h-full transition-all duration-300 hover:brightness-110 cursor-pointer"
						style="width: {Math.max(2, pct)}%"
						title="{item.label}: {item.count} unit ({pct}%)"
					></button>
				{/if}
			{/each}
		</div>

		<!-- Horizontal interactive stage buttons -->
		<div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mt-3 pt-3 border-t border-slate-200/50 dark:border-slate-800/50">
			{#each operationalStages as item}
				{@const total = metrics.totalVehicles || 1}
				{@const pct = Math.round(((item.count || 0) / total) * 100)}
				<button
					type="button"
					onclick={() => openModal(item.key)}
					class="flex flex-col items-center justify-center p-2.5 rounded-xl bg-surface hover:bg-surface-container border border-slate-200/50 dark:border-slate-800/50 transition-all cursor-pointer group text-center {item.borderCls}"
				>
					<div class="flex items-center gap-1.5 mb-1">
						<span class="w-2 h-2 rounded-full {item.dotCls}"></span>
						<span class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider truncate max-w-[85px]">{item.label}</span>
					</div>
					<div class="flex items-baseline gap-1">
						<span class="text-base font-black text-on-surface group-hover:text-primary transition-colors">{item.count}</span>
						<span class="text-[10px] font-semibold text-on-surface-variant/70">({pct}%)</span>
					</div>
				</button>
			{/each}
		</div>
	</div>

	<!-- Middle Section: Analytics Command Center (Trend Chart + Donut Composition + Alerts) -->
	<div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
		<!-- Fleet Utilization Chart (50% Width) -->
		<div class="lg:col-span-2 p-6 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between">
			<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
				<div>
					<h3 class="text-base font-bold text-on-surface tracking-tight">Tren Utilisasi Armada (6 Bulan)</h3>
					<p class="text-xs text-on-surface-variant mt-0.5">
						{#if selectedTrendMonth}
							{@const selectedData = (data.trendData || []).find(d => d.month === selectedTrendMonth)}
							<span class="text-blue-600 dark:text-blue-400 font-bold">
								Bulan {selectedTrendMonth}: {selectedData?.raw_units ?? 0} Unit Aktif · {selectedData?.raw_trips ?? 0} Trip Selesai
							</span>
						{:else}
							Analisis penugasan armada vs jumlah pengiriman bulanan (Klik bar untuk melihat angka detail)
						{/if}
					</p>
				</div>
				<div class="flex gap-4">
					<div class="flex items-center gap-2">
						<span class="w-3 h-3 rounded-full bg-blue-500"></span>
						<span class="text-[10px] font-bold text-on-surface-variant uppercase">Armada Aktif</span>
					</div>
					<div class="flex items-center gap-2">
						<span class="w-3 h-3 rounded-full bg-emerald-500"></span>
						<span class="text-[10px] font-bold text-on-surface-variant uppercase">Trips Selesai</span>
					</div>
				</div>
			</div>
			
			<!-- Interactive Bar Chart -->
			<div class="relative h-64 w-full flex items-end justify-between px-2 gap-4">
				{#each data.trendData || [] as item}
					{@const isSelected = selectedTrendMonth === item.month}
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div 
						class="flex flex-col items-center flex-1 gap-3 h-full group/bar cursor-pointer"
						onclick={() => selectedTrendMonth = selectedTrendMonth === item.month ? null : item.month}
					>
						<div class="w-full flex items-end justify-center gap-1.5 h-full relative">
							<div class="w-5 bg-blue-500/40 rounded-t-md transition-all duration-300 group-hover/bar:bg-blue-500 {isSelected ? 'bg-blue-600 ring-2 ring-blue-500/40' : ''}" style="height: {item.active}"></div>
							<div class="w-5 bg-emerald-500/40 rounded-t-md transition-all duration-300 group-hover/bar:bg-emerald-500 {isSelected ? 'bg-emerald-600 ring-2 ring-emerald-500/40' : ''}" style="height: {item.trips}"></div>
							
							<!-- Floating Tooltip -->
							<div class="absolute -top-14 bg-surface-container-highest text-on-surface px-2.5 py-1.5 rounded-lg text-[10px] font-bold opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap shadow-lg border border-slate-200/60 dark:border-slate-800/60 z-20 pointer-events-none text-left">
								<div class="font-black text-on-surface">{item.month} 2026</div>
								<div class="text-blue-600 dark:text-blue-400">Armada: {item.raw_units ?? item.active} unit ({item.active})</div>
								<div class="text-emerald-600 dark:text-emerald-400">Trips: {item.raw_trips ?? item.trips} trip ({item.trips})</div>
							</div>
						</div>
						<span class="text-[10px] font-bold uppercase tracking-wider transition-colors {isSelected ? 'text-blue-600 font-black underline' : 'text-on-surface-variant group-hover/bar:text-blue-600'}">{item.month}</span>
					</div>
				{/each}
			</div>
		</div>

		<!-- Donut Chart: Komposisi Armada (25% Width) -->
		<div class="lg:col-span-1 p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between">
			<div class="flex items-center justify-between mb-2">
				<div class="flex items-center gap-1.5">
					<span class="material-symbols-outlined text-blue-600 dark:text-blue-400 text-lg">donut_large</span>
					<h3 class="text-sm font-bold text-on-surface">Komposisi Armada</h3>
				</div>
				<!-- Toggle Tabs -->
				<div class="inline-flex p-0.5 rounded-lg bg-surface-container border border-slate-200/50 dark:border-slate-800/50 text-[10px]">
					<button 
						onclick={() => { donutViewMode = 'READINESS'; hoveredDonutSlice = null; }}
						class="px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer {donutViewMode === 'READINESS' ? 'bg-surface text-blue-600 shadow-2xs' : 'text-on-surface-variant hover:text-on-surface'}"
					>
						Status
					</button>
					<button 
						onclick={() => { donutViewMode = 'BU'; hoveredDonutSlice = null; }}
						class="px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer {donutViewMode === 'BU' ? 'bg-surface text-blue-600 shadow-2xs' : 'text-on-surface-variant hover:text-on-surface'}"
					>
						BU
					</button>
				</div>
			</div>

			<!-- SVG Donut Chart -->
			<div class="relative flex items-center justify-center my-1">
				<svg class="w-36 h-36 -rotate-90" viewBox="0 0 100 100">
					<!-- Background Ring -->
					<circle
						cx="50"
						cy="50"
						r="40"
						class="stroke-slate-100 dark:stroke-slate-800"
						stroke-width="12"
						fill="transparent"
					/>
					<!-- Dynamic Segments -->
					{#each donutData as slice}
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<circle
							cx="50"
							cy="50"
							r="40"
							stroke={slice.color}
							stroke-width={hoveredDonutSlice?.label === slice.label ? "14" : "12"}
							stroke-dasharray={slice.dashArray}
							stroke-dashoffset={slice.dashOffset}
							stroke-linecap="butt"
							fill="transparent"
							class="transition-all duration-300 cursor-pointer hover:opacity-90"
							onmouseenter={() => hoveredDonutSlice = slice}
							onmouseleave={() => hoveredDonutSlice = null}
							onclick={() => handleDonutSliceClick(slice)}
						/>
					{/each}
				</svg>

				<!-- Center Hole Info -->
				<div class="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-3">
					{#if hoveredDonutSlice}
						<span class="text-xs font-black text-on-surface truncate max-w-[75px]">{hoveredDonutSlice.count} Unit</span>
						<span class="text-[9px] font-bold text-blue-600 dark:text-blue-400">{hoveredDonutSlice.pct}%</span>
						<span class="text-[8px] font-medium text-on-surface-variant uppercase tracking-wider truncate max-w-[80px]">{hoveredDonutSlice.label}</span>
					{:else}
						<span class="text-sm font-black text-on-surface">{metrics.totalVehicles ?? 0}</span>
						<span class="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">Total Armada</span>
					{/if}
				</div>
			</div>

			<!-- Interactive Legend -->
			<div class="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-200/40 dark:border-slate-800/40">
				{#each donutData as slice}
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div 
						class="flex items-center justify-between p-1 rounded-md hover:bg-surface-container transition-colors cursor-pointer group"
						onmouseenter={() => hoveredDonutSlice = slice}
						onmouseleave={() => hoveredDonutSlice = null}
						onclick={() => handleDonutSliceClick(slice)}
					>
						<div class="flex items-center gap-1.5 min-w-0">
							<span class="w-2 h-2 rounded-full flex-shrink-0" style="background-color: {slice.color}"></span>
							<span class="text-[10px] font-medium text-on-surface-variant group-hover:text-on-surface truncate">{slice.label}</span>
						</div>
						<span class="text-[10px] font-bold text-on-surface ml-1">{slice.count}</span>
					</div>
				{/each}
			</div>
		</div>

		<!-- Action Required Sidebar (Soft M3 Card) -->
		<div class="p-5 sm:p-6 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between overflow-hidden relative group">
			<div class="relative z-10 flex-1 flex flex-col">
				<div class="flex items-center justify-between mb-4">
					<div class="flex items-center gap-2">
						<div class="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
							<span class="material-symbols-outlined text-[18px]">warning</span>
						</div>
						<div>
							<h3 class="text-sm font-bold text-on-surface">Peringatan Armada</h3>
							<p class="text-[10px] text-on-surface-variant font-medium">Asuransi & servis jatuh tempo</p>
						</div>
					</div>
					{#if alerts.length > 0}
						<span class="text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 px-2 py-0.5 rounded-full">{alerts.length}</span>
					{/if}
				</div>

				{#if alerts.length > 0}
					<div class="space-y-2.5 flex-1">
						{#each alerts.slice(0, 3) as alert}
							{@const isRose = alert.severity === 'critical' || alert.severity === 'danger'}
							<!-- svelte-ignore a11y_click_events_have_key_events -->
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<div 
								onclick={() => selectedAlert = alert}
								class="flex items-start gap-3 bg-surface hover:bg-surface-container p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/60 transition-colors cursor-pointer group/alert"
							>
								<div class="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center mt-0.5 {isRose ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'}">
									<span class="material-symbols-outlined text-[16px]">{getAlertIcon(alert.type)}</span>
								</div>
								<div class="min-w-0 flex-1">
									<div class="flex items-center justify-between">
										<p class="text-xs font-bold text-on-surface truncate group-hover/alert:text-primary transition-colors">{alert.unit}</p>
										<span class="text-[9px] font-bold uppercase {isRose ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}">{alert.type}</span>
									</div>
									<p class="text-[11px] font-medium mt-0.5 leading-snug {isRose ? 'text-rose-700 dark:text-rose-300' : 'text-amber-700 dark:text-amber-300'}">
										{alert.message.length > 60 ? alert.message.slice(0, 60) + '…' : alert.message}
									</p>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<div class="flex-1 flex flex-col items-center justify-center py-6 text-on-surface-variant">
						<span class="material-symbols-outlined text-3xl mb-1 text-emerald-500">verified_user</span>
						<p class="text-xs font-bold text-on-surface">Seluruh Armada Laik Operasi</p>
						<p class="text-[10px] text-on-surface-variant">Tidak ada dokumen atau jadwal servis darurat</p>
					</div>
				{/if}
			</div>

			<div class="mt-4 pt-3 border-t border-slate-200/50 dark:border-slate-800/50 flex gap-2">
				<button 
					type="button" 
					onclick={() => openModal('MAINTENANCE_ALERTS')}
					class="flex-1 bg-surface-container hover:bg-surface-container-high text-on-surface py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-slate-200/60 dark:border-slate-800/60 cursor-pointer"
				>
					<span>Lihat Semua Alert</span>
				</button>
				<a href="/fms/vehicles" class="bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs">
					<span>Roster Unit</span>
				</a>
			</div>
		</div>
	</div>

	<!-- Bottom Grid: Operations & Performance Command (2 Kolom Seimbang) -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- Left Column: Recent Trips (Live Activity) -->
		<div class="p-5 sm:p-6 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between">
			<div>
				<div class="flex items-center justify-between mb-4">
					<div>
						<div class="flex items-center gap-2">
							<span class="material-symbols-outlined text-blue-600 dark:text-blue-400 text-lg">local_shipping</span>
							<h3 class="text-base font-bold text-on-surface tracking-tight">Recent Trips</h3>
						</div>
						{#if metrics.activeTrips > 0}
							<p class="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mt-0.5">
								● {metrics.activeTrips} armada aktif di jalan
							</p>
						{:else}
							<p class="text-xs text-on-surface-variant font-medium mt-0.5">Log pembaruan perjalanan armada terakhir</p>
						{/if}
					</div>
					<a href="/fms/trips" class="text-xs font-bold text-blue-600 cursor-pointer hover:underline flex items-center gap-0.5">
						<span>Semua Trip</span>
						<span class="material-symbols-outlined text-sm">arrow_forward</span>
					</a>
				</div>

				<div class="space-y-2.5">
					{#if recentTrips && recentTrips.length > 0}
						{#each recentTrips.slice(0, 5) as trip}
							{@const badge = getTripStatusBadge(trip.status)}
							<!-- svelte-ignore a11y_click_events_have_key_events -->
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<div 
								onclick={() => selectedTrip = trip}
								class="flex items-center justify-between p-3 bg-surface rounded-xl border border-slate-200/50 dark:border-slate-800/50 hover:bg-surface-container hover:border-blue-500/30 transition-all cursor-pointer group"
							>
								<div class="flex items-center gap-3 min-w-0">
									<div class="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center {getTripIconBg(trip.status)}">
										<span class="material-symbols-outlined text-base">{getTripIcon(trip.status)}</span>
									</div>
									<div class="min-w-0">
										<p class="text-xs font-bold text-on-surface truncate group-hover:text-blue-600 transition-colors">
											{trip.nomor_unit} → {trip.destination || '-'}
										</p>
										<p class="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider mt-0.5 truncate">
											{trip.driver_nama || '-'}
											{#if trip.cargo} · {trip.cargo}{/if}
										</p>
									</div>
								</div>
								<div class="text-right flex-shrink-0 ml-3">
									<span class="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border {badge.cls}">
										<span class="w-1 h-1 rounded-full {badge.dot}"></span>
										{badge.label}
									</span>
									<p class="text-[10px] text-on-surface-variant font-medium mt-0.5">{trip.tgl_trip}</p>
								</div>
							</div>
						{/each}
					{:else}
						<div class="flex flex-col items-center justify-center py-10 text-on-surface-variant">
							<span class="material-symbols-outlined text-4xl mb-2 opacity-30">receipt_long</span>
							<p class="text-xs font-medium italic">Belum ada data trip aktif</p>
						</div>
					{/if}
				</div>
			</div>

			<div class="mt-4 pt-3 border-t border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between text-xs text-on-surface-variant">
				<span>Monitoring rute & surat jalan</span>
				<a href="/fms/live-map" class="font-bold text-blue-600 hover:underline flex items-center gap-1">
					<span class="material-symbols-outlined text-sm">map</span>
					<span>Buka Live GPS Map</span>
				</a>
			</div>
		</div>

		<!-- Right Column: Performance Switcher (Target Tonase Kontrak & Top Drivers) -->
		<div class="p-5 sm:p-6 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col justify-between">
			<div>
				<!-- Tab Header Switcher -->
				<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
					<div>
						<h3 class="text-base font-bold text-on-surface tracking-tight">
							{perfTab === 'contracts' ? 'Realisasi Tonase Kontrak' : 'Top Driver Leaderboard'}
						</h3>
						<p class="text-xs text-on-surface-variant mt-0.5">
							{perfTab === 'contracts' ? 'Pencapaian volume pengiriman klien aktif' : 'Supir berkinerja tertinggi berdasarkan ritase'}
						</p>
					</div>

					<!-- Segmented Tab Controls -->
					<div class="inline-flex p-0.5 rounded-xl bg-surface-container border border-slate-200/50 dark:border-slate-800/50 text-xs self-start sm:self-auto">
						<button 
							type="button"
							onclick={() => perfTab = 'contracts'}
							class="px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 {perfTab === 'contracts' ? 'bg-surface text-blue-600 shadow-2xs' : 'text-on-surface-variant hover:text-on-surface'}"
						>
							<span class="material-symbols-outlined text-sm">contract</span>
							<span>Kontrak</span>
						</button>
						<button 
							type="button"
							onclick={() => perfTab = 'drivers'}
							class="px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 {perfTab === 'drivers' ? 'bg-surface text-blue-600 shadow-2xs' : 'text-on-surface-variant hover:text-on-surface'}"
						>
							<span class="material-symbols-outlined text-sm">leaderboard</span>
							<span>Top Driver</span>
						</button>
					</div>
				</div>

				<!-- Tab Content 1: Kontrak Tonase -->
				{#if perfTab === 'contracts'}
					{#if activeContracts && activeContracts.length > 0}
						<div class="space-y-3">
							{#each activeContracts.slice(0, 3) as c}
								{@const pctDelivered = c.targetTonnage > 0 ? Math.min(100, Math.round((c.deliveredTonnage / c.targetTonnage) * 100)) : 0}
								{@const pctOnRoute = c.targetTonnage > 0 ? Math.min(100 - pctDelivered, Math.round((c.onrouteTonnage / c.targetTonnage) * 100)) : 0}
								{@const pctLoading = c.targetTonnage > 0 ? Math.min(100 - pctDelivered - pctOnRoute, Math.round((c.loadingTonnage / c.targetTonnage) * 100)) : 0}
								<div class="p-3.5 rounded-xl bg-surface border border-slate-200/50 dark:border-slate-800/50 hover:border-blue-500/30 transition-all flex flex-col gap-2.5">
									<div class="flex items-start justify-between gap-2">
										<div class="min-w-0">
											<div class="flex items-center gap-2">
												<span class="text-xs font-black text-on-surface truncate">{c.customer}</span>
												<span class="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-blue-500/10 text-blue-600 dark:text-blue-400">{c.project_category}</span>
											</div>
											<p class="text-[10px] text-on-surface-variant font-mono mt-0.5">{c.id}</p>
										</div>
										<div class="text-right flex-shrink-0">
											<span class="text-sm font-black text-emerald-600">{pctDelivered}%</span>
											<p class="text-[9px] text-on-surface-variant font-medium">Realisasi</p>
										</div>
									</div>

									<!-- Multi-segment Progress Bar -->
									<div class="space-y-1">
										<div class="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
											<div class="bg-emerald-500 h-full transition-all duration-500" style="width: {pctDelivered}%" title="Terkirim: {c.deliveredTonnage.toLocaleString('id-ID')} Ton"></div>
											<div class="bg-blue-500 h-full transition-all duration-500" style="width: {pctOnRoute}%" title="On Route: {c.onrouteTonnage.toLocaleString('id-ID')} Ton"></div>
											<div class="bg-indigo-500 h-full transition-all duration-500" style="width: {pctLoading}%" title="Loading: {c.loadingTonnage.toLocaleString('id-ID')} Ton"></div>
										</div>
										<div class="flex items-center justify-between text-[10px] font-medium text-on-surface-variant">
											<span class="flex items-center gap-1">
												<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Terkirim: {c.deliveredTonnage.toLocaleString('id-ID')} Ton
											</span>
											<span>Target: {c.targetTonnage > 0 ? c.targetTonnage.toLocaleString('id-ID') + ' Ton' : 'Borongan'}</span>
										</div>
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<div class="flex flex-col items-center justify-center py-10 text-on-surface-variant">
							<span class="material-symbols-outlined text-4xl mb-2 opacity-30">contract</span>
							<p class="text-xs font-medium italic">Tidak ada kontrak tonase aktif bulan ini</p>
						</div>
					{/if}

				<!-- Tab Content 2: Top Drivers Leaderboard -->
				{:else}
					<div class="space-y-2.5">
						{#if topDrivers && topDrivers.length > 0}
							{#each topDrivers.slice(0, 4) as driver, i}
								<!-- svelte-ignore a11y_click_events_have_key_events -->
								<!-- svelte-ignore a11y_no_static_element_interactions -->
								<div 
									onclick={() => selectedDriver = driver}
									class="flex items-center justify-between p-3 bg-surface rounded-xl border border-slate-200/50 dark:border-slate-800/50 hover:bg-surface-container hover:border-blue-500/30 transition-all cursor-pointer group"
								>
									<div class="flex items-center gap-3">
										<div class="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-700 dark:text-blue-300 font-black text-xs">
											{i + 1}
										</div>
										<div>
											<p class="text-xs font-bold text-on-surface group-hover:text-blue-600 transition-colors">{driver.name}</p>
											<p class="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider mt-0.5">
												{driver.category || '-'} · SIM {driver.simType || '-'}
												{#if driver.totalAssigned > 0} · {driver.totalAssigned} unit{/if}
											</p>
										</div>
									</div>
									<div>
										{#if driver.totalAssigned > 0}
											<span class="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">Aktif</span>
										{:else}
											<span class="text-[10px] font-medium text-on-surface-variant/60">Standby</span>
										{/if}
									</div>
								</div>
							{/each}
						{:else}
							<p class="text-xs text-on-surface-variant italic py-8 text-center">Data driver belum tersedia</p>
						{/if}
					</div>
				{/if}
			</div>

			<div class="mt-4 pt-3 border-t border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between text-xs">
				<span class="text-on-surface-variant">
					{perfTab === 'contracts' ? 'Integrasi data kontrak pemasaran' : 'Evaluasi performa berkala supir'}
				</span>
				{#if perfTab === 'contracts'}
					<a href="/marketing/contracts" class="font-bold text-blue-600 hover:underline flex items-center gap-0.5">
						<span>Kelola Kontrak</span>
						<span class="material-symbols-outlined text-sm">arrow_forward</span>
					</a>
				{:else}
					<a href="/fms/drivers" class="font-bold text-blue-600 hover:underline flex items-center gap-0.5">
						<span>Direktori Supir</span>
						<span class="material-symbols-outlined text-sm">arrow_forward</span>
					</a>
				{/if}
			</div>
		</div>
	</div>
</div>

<!-- ───────────────────────────────────────────────────────────── -->
<!-- MODAL 1: Quick-Preview Drill-Down Modal (Category Listing)    -->
<!-- ───────────────────────────────────────────────────────────── -->
{#if activeModal}
	{@const meta = getModalMeta(activeModal)}
	<!-- Backdrop -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div 
		class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
		onclick={closeModal}
	>
		<!-- Modal Container -->
		<div 
			class="w-full max-w-4xl max-h-[85vh] bg-surface rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Header -->
			<div class="px-6 py-4 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between bg-surface-container-low flex-shrink-0">
				<div>
					<div class="flex items-center gap-2">
						<h3 class="text-base font-black text-on-surface">{meta.title}</h3>
						<span class="px-2 py-0.5 rounded-full text-xs font-black bg-blue-500/10 text-blue-600 dark:text-blue-400">
							{modalFilteredUnits.length} Unit
						</span>
					</div>
					<p class="text-xs text-on-surface-variant mt-0.5">{meta.desc}</p>
				</div>
				<div class="flex items-center gap-2">
					<a 
						href={meta.link}
						class="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors flex items-center gap-1 shadow-xs"
					>
						<span>{meta.linkText}</span>
					</a>
					<button 
						onclick={closeModal}
						class="w-8 h-8 rounded-xl bg-surface-container hover:bg-surface-container-highest text-on-surface-variant flex items-center justify-center transition-colors cursor-pointer"
					>
						<span class="material-symbols-outlined text-lg">close</span>
					</button>
				</div>
			</div>

			<!-- Search & Filter Bar Inside Modal -->
			<div class="p-4 border-b border-slate-200/60 dark:border-slate-800/60 bg-surface flex-shrink-0">
				<div class="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-surface-container-low border-0 focus-within:ring-2 focus-within:ring-blue-500/30 transition-all">
					<span class="material-symbols-outlined text-on-surface-variant text-[18px]">search</span>
					<input 
						type="text" 
						bind:value={modalSearch}
						placeholder="Cari nopol, nama sopir, tipe unit, atau model..." 
						class="w-full bg-transparent border-0 outline-none text-on-surface text-xs font-medium placeholder:text-on-surface-variant/50 focus:ring-0"
					/>
					{#if modalSearch}
						<button onclick={() => modalSearch = ''} class="text-on-surface-variant hover:text-on-surface">
							<span class="material-symbols-outlined text-base">close</span>
						</button>
					{/if}
				</div>
			</div>

			<!-- Content List -->
			<div class="overflow-y-auto flex-1 p-6">
				{#if modalFilteredUnits.length > 0}
					<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
						{#each modalFilteredUnits as u}
							<!-- svelte-ignore a11y_click_events_have_key_events -->
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<div 
								onclick={() => selectedUnit = u}
								class="p-4 rounded-xl bg-surface-container-low border border-slate-200/50 dark:border-slate-800/50 hover:border-blue-500/40 hover:bg-surface-container transition-all cursor-pointer group flex items-start justify-between gap-3"
							>
								<div class="flex items-start gap-3 min-w-0">
									<div class="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
										<span class="material-symbols-outlined text-xl">{getBuIcon(u.business_unit)}</span>
									</div>
									<div class="min-w-0">
										<div class="flex items-center gap-2">
											<h4 class="text-sm font-black text-on-surface group-hover:text-blue-600 transition-colors">{u.nomor_unit}</h4>
											<span class="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase bg-blue-500/10 text-blue-600">{u.business_unit}</span>
										</div>
										<p class="text-xs text-on-surface-variant font-medium mt-0.5 truncate">{u.nama_tipe} · {u.nama_model}</p>
										<div class="flex items-center gap-2 mt-2 text-[10px] text-on-surface-variant">
											<span class="flex items-center gap-1">
												<span class="material-symbols-outlined text-xs">person</span>
												<span>{u.driver_nama || 'Belum ada driver tetap'}</span>
											</span>
										</div>
									</div>
								</div>
								<div class="text-right flex-shrink-0 flex flex-col items-end gap-1">
									{#if u.is_active}
										<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
											{u.current_state}
										</span>
									{:else}
										<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
											Non-Aktif
										</span>
									{/if}
									<span class="text-[10px] font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
										Detail Info →
									</span>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<div class="flex flex-col items-center justify-center py-16 text-on-surface-variant">
						<span class="material-symbols-outlined text-4xl mb-2 opacity-30">search_off</span>
						<p class="text-sm font-bold">Tidak ada unit ditemukan</p>
						<p class="text-xs text-on-surface-variant/70 mt-1">Coba kata kunci pencarian lain atau buka modul armada lengkap</p>
					</div>
				{/if}
			</div>

			<!-- Footer -->
			<div class="px-6 py-3 border-t border-slate-200/60 dark:border-slate-800/60 bg-surface-container-low flex items-center justify-between text-xs text-on-surface-variant flex-shrink-0">
				<span>Menampilkan data aktual dari PostgreSQL fleet.unit</span>
				<button onclick={closeModal} class="font-bold text-on-surface hover:underline cursor-pointer">
					Tutup
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- ───────────────────────────────────────────────────────────── -->
<!-- MODAL 2: Focused Unit Detail Modal                           -->
<!-- ───────────────────────────────────────────────────────────── -->
{#if selectedUnit}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div 
		class="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
		onclick={() => selectedUnit = null}
	>
		<div 
			class="w-full max-w-lg bg-surface rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-150"
			onclick={(e) => e.stopPropagation()}
		>
			<div class="flex items-start justify-between border-b border-slate-200/60 dark:border-slate-800/60 pb-4">
				<div class="flex items-center gap-3">
					<div class="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 flex items-center justify-center font-black">
						<span class="material-symbols-outlined text-2xl">{getBuIcon(selectedUnit.business_unit)}</span>
					</div>
					<div>
						<h3 class="text-lg font-black text-on-surface">{selectedUnit.nomor_unit}</h3>
						<p class="text-xs text-on-surface-variant font-medium">{selectedUnit.nama_tipe || '-'} · {selectedUnit.nama_model || ''}</p>
					</div>
				</div>
				<button onclick={() => selectedUnit = null} class="text-on-surface-variant hover:text-on-surface">
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>

			<div class="grid grid-cols-2 gap-3 text-xs">
				<div class="p-3 rounded-xl bg-surface-container-low">
					<span class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Business Unit</span>
					<span class="font-black text-on-surface mt-0.5 block">{selectedUnit.business_unit || '-'}</span>
				</div>
				<div class="p-3 rounded-xl bg-surface-container-low">
					<span class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Status Operasi</span>
					<span class="font-black {selectedUnit.is_active ? 'text-emerald-600' : 'text-slate-500'} mt-0.5 block">
						{selectedUnit.is_active ? 'Aktif (' + (selectedUnit.current_state || 'AT_POOL') + ')' : 'Non-Aktif'}
					</span>
				</div>
				<div class="p-3 rounded-xl bg-surface-container-low">
					<span class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Driver Assigned</span>
					<span class="font-black text-on-surface mt-0.5 block">{selectedUnit.driver_nama || 'Belum Ditugaskan'}</span>
				</div>
				<div class="p-3 rounded-xl bg-surface-container-low">
					<span class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Jadwal Servis Preventif</span>
					<span class="font-black text-on-surface mt-0.5 block">{selectedUnit.tgl_maintenance_prevent || 'Tidak Terjadwal'}</span>
				</div>
			</div>

			<div class="flex items-center gap-2 pt-2">
				<a 
					href={`/fms/vehicles?search=${encodeURIComponent(selectedUnit.nomor_unit)}`} 
					class="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl text-center shadow-xs transition-colors"
				>
					Buka di Modul Armada ↗
				</a>
				<button 
					onclick={() => selectedUnit = null} 
					class="py-2.5 px-4 bg-surface-container-low hover:bg-surface-container text-on-surface font-bold text-xs rounded-xl transition-colors cursor-pointer"
				>
					Tutup
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- ───────────────────────────────────────────────────────────── -->
<!-- MODAL 3: Focused Trip Detail Modal                            -->
<!-- ───────────────────────────────────────────────────────────── -->
{#if selectedTrip}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div 
		class="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
		onclick={() => selectedTrip = null}
	>
		<div 
			class="w-full max-w-lg bg-surface rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-150"
			onclick={(e) => e.stopPropagation()}
		>
			<div class="flex items-start justify-between border-b border-slate-200/60 dark:border-slate-800/60 pb-4">
				<div>
					<span class="text-[10px] font-bold text-blue-600 uppercase tracking-widest font-mono">Surat Tugas: {selectedTrip.no_surat_tugas || '-'}</span>
					<h3 class="text-lg font-black text-on-surface mt-1">{selectedTrip.nomor_unit} → {selectedTrip.destination || '-'}</h3>
				</div>
				<button onclick={() => selectedTrip = null} class="text-on-surface-variant hover:text-on-surface">
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>

			<div class="grid grid-cols-2 gap-3 text-xs">
				<div class="p-3 rounded-xl bg-surface-container-low">
					<span class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Sopir / Driver</span>
					<span class="font-black text-on-surface mt-0.5 block">{selectedTrip.driver_nama || '-'}</span>
				</div>
				<div class="p-3 rounded-xl bg-surface-container-low">
					<span class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Kustomer & Muatan</span>
					<span class="font-black text-on-surface mt-0.5 block">{selectedTrip.customer || '-'} ({selectedTrip.cargo || '-'})</span>
				</div>
				<div class="p-3 rounded-xl bg-surface-container-low">
					<span class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Origin (Asal)</span>
					<span class="font-black text-on-surface mt-0.5 block">{selectedTrip.origin || '-'}</span>
				</div>
				<div class="p-3 rounded-xl bg-surface-container-low">
					<span class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Status Pengiriman</span>
					<span class="font-black text-blue-600 mt-0.5 block">{selectedTrip.status}</span>
				</div>
			</div>

			<div class="flex items-center gap-2 pt-2">
				<a 
					href={`/fms/trips?search=${encodeURIComponent(selectedTrip.no_surat_tugas || selectedTrip.nomor_unit)}`} 
					class="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl text-center shadow-xs transition-colors"
				>
					Buka di Modul Trips ↗
				</a>
				<button 
					onclick={() => selectedTrip = null} 
					class="py-2.5 px-4 bg-surface-container-low hover:bg-surface-container text-on-surface font-bold text-xs rounded-xl transition-colors cursor-pointer"
				>
					Tutup
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- ───────────────────────────────────────────────────────────── -->
<!-- MODAL 4: Focused Driver Detail Modal                          -->
<!-- ───────────────────────────────────────────────────────────── -->
{#if selectedDriver}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div 
		class="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
		onclick={() => selectedDriver = null}
	>
		<div 
			class="w-full max-w-md bg-surface rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-150"
			onclick={(e) => e.stopPropagation()}
		>
			<div class="flex items-start justify-between border-b border-slate-200/60 dark:border-slate-800/60 pb-4">
				<div class="flex items-center gap-3">
					<div class="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 flex items-center justify-center font-black text-lg">
						{selectedDriver.name?.[0] || 'D'}
					</div>
					<div>
						<h3 class="text-base font-black text-on-surface">{selectedDriver.name}</h3>
						<p class="text-xs text-on-surface-variant font-medium">SIM {selectedDriver.simType || '-'} · {selectedDriver.category || '-'}</p>
					</div>
				</div>
				<button onclick={() => selectedDriver = null} class="text-on-surface-variant hover:text-on-surface">
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>

			<div class="grid grid-cols-2 gap-3 text-xs">
				<div class="p-3 rounded-xl bg-surface-container-low">
					<span class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Kategori Driver</span>
					<span class="font-black text-on-surface mt-0.5 block">{selectedDriver.category || '-'}</span>
				</div>
				<div class="p-3 rounded-xl bg-surface-container-low">
					<span class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Unit Assigned</span>
					<span class="font-black text-blue-600 mt-0.5 block">{selectedDriver.totalAssigned || 0} Unit</span>
				</div>
			</div>

			<div class="flex items-center gap-2 pt-2">
				<a 
					href={`/fms/drivers?search=${encodeURIComponent(selectedDriver.name)}`} 
					class="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl text-center shadow-xs transition-colors"
				>
					Buka Profil Driver ↗
				</a>
				<button 
					onclick={() => selectedDriver = null} 
					class="py-2.5 px-4 bg-surface-container-low hover:bg-surface-container text-on-surface font-bold text-xs rounded-xl transition-colors cursor-pointer"
				>
					Tutup
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- ───────────────────────────────────────────────────────────── -->
<!-- MODAL 5: Focused Alert Detail Modal                           -->
<!-- ───────────────────────────────────────────────────────────── -->
{#if selectedAlert}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div 
		class="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
		onclick={() => selectedAlert = null}
	>
		<div 
			class="w-full max-w-md bg-surface rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-150"
			onclick={(e) => e.stopPropagation()}
		>
			<div class="flex items-start justify-between border-b border-slate-200/60 dark:border-slate-800/60 pb-4">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 rounded-xl {selectedAlert.severity === 'critical' || selectedAlert.severity === 'danger' ? 'bg-rose-500/10 text-rose-600' : 'bg-amber-500/10 text-amber-600'} flex items-center justify-center">
						<span class="material-symbols-outlined text-xl">{getAlertIcon(selectedAlert.type)}</span>
					</div>
					<div>
						<h3 class="text-base font-black text-on-surface">Peringatan: {selectedAlert.unit}</h3>
						<span class="text-[10px] font-bold uppercase {selectedAlert.severity === 'critical' || selectedAlert.severity === 'danger' ? 'text-rose-600' : 'text-amber-600'}">
							{selectedAlert.type} · {selectedAlert.time || 'Perlu Tindakan'}
						</span>
					</div>
				</div>
				<button onclick={() => selectedAlert = null} class="text-on-surface-variant hover:text-on-surface">
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>

			<div class="p-3.5 rounded-xl bg-surface-container-low text-xs text-on-surface leading-relaxed">
				{selectedAlert.message}
			</div>

			<div class="flex items-center gap-2 pt-2">
				<a 
					href={selectedAlert.type === 'Maintenance' ? `/fms/maintenance?search=${encodeURIComponent(selectedAlert.unit)}` : `/fms/documents?search=${encodeURIComponent(selectedAlert.unit)}`}
					class="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl text-center shadow-xs transition-colors"
				>
					Tindak Lanjuti di {selectedAlert.type === 'Maintenance' ? 'Maintenance' : 'Dokumen'} ↗
				</a>
				<button 
					onclick={() => selectedAlert = null} 
					class="py-2.5 px-4 bg-surface-container-low hover:bg-surface-container text-on-surface font-bold text-xs rounded-xl transition-colors cursor-pointer"
				>
					Tutup
				</button>
			</div>
		</div>
	</div>
{/if}
