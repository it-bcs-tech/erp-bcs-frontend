<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
	let { summary, lowStockAlerts, recentPOs, upcomingSchedules, categoryBreakdown } = $derived(data);

	const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

	function getScheduleStyle(status: string) {
		switch (status) {
			case 'Overdue': return 'text-rose-600 bg-rose-500/10 border-rose-500/20';
			case 'Due Today': return 'text-amber-600 bg-amber-500/10 border-amber-500/20';
			default: return 'text-sky-600 bg-sky-500/10 border-sky-500/20';
		}
	}

	function getPOStyle(status: string) {
		switch (status) {
			case 'Received': return 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20';
			case 'Approved': return 'text-blue-600 bg-blue-500/10 border-blue-500/20';
			default: return 'text-amber-600 bg-amber-500/10 border-amber-500/20';
		}
	}

	const stockPercent = (s: any) => Math.min(100, Math.round((s.stock / s.minStock) * 100));
</script>

<svelte:head>
	<title>PMS Dashboard | ERP BCS</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Header & Actions -->
	<header class="flex flex-col md:flex-row md:items-end justify-between gap-4 flex-shrink-0">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-2xl">shopping_cart</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Procurement & Purchasing (PMS)</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-sm mt-0.5">
				Pengadaan barang, master sparepart & inventaris, monitoring purchase orders, dan jadwal perawatan berkala
			</p>
		</div>
		<a href="/pms/purchasing/orders/create" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-xs flex items-center gap-2 transition-colors">
			<span class="material-symbols-outlined text-lg">add_shopping_cart</span>
			<span>Buat PO Baru</span>
		</a>
	</header>

	<!-- KPI Cards (Bento) -->
	<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
		{#each [
			{ label: 'Total Item', value: summary.totalItems, color: 'emerald', icon: 'inventory_2', link: '/pms/items' },
			{ label: 'Low Stock', value: summary.lowStock, color: 'rose', icon: 'warning', link: '/pms/items' },
			{ label: 'Pending PO', value: summary.pendingPO, color: 'amber', icon: 'pending_actions', link: '/pms/purchasing/orders' },
			{ label: 'Nilai PO', value: null, raw: fmt(summary.totalPOValue), color: 'emerald', icon: 'payments', link: '/pms/purchasing/orders' },
			{ label: 'Jadwal Servis', value: summary.scheduledService, color: 'blue', icon: 'calendar_month', link: '/pms/schedules' },
			{ label: 'Overdue Servis', value: summary.overdueService, color: 'red', icon: 'build_circle', link: '/pms/schedules' },
		] as card}
			<a href={card.link} class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs hover:border-emerald-500/30 transition-all text-center group">
				<span class="material-symbols-outlined text-xl text-{card.color}-500 mb-1 block">{card.icon}</span>
				{#if card.value !== null}
					<h3 class="text-2xl font-black text-{card.color}-600">{card.value}</h3>
				{:else}
					<h3 class="text-xs font-black text-{card.color}-600 leading-tight truncate">{card.raw}</h3>
				{/if}
				<p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mt-1">{card.label}</p>
			</a>
		{/each}
	</div>

	<!-- Main Grid -->
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<!-- Category Breakdown -->
		<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs p-5">
			<h2 class="text-base font-bold text-on-surface mb-4 flex items-center gap-2">
				<span class="material-symbols-outlined text-emerald-600 text-lg">category</span>
				<span>Kategori Inventaris</span>
			</h2>
			<div class="space-y-4">
				{#each categoryBreakdown as cat}
					<div class="flex items-center gap-3">
						<div class="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold flex-shrink-0">
							<span class="material-symbols-outlined text-lg">{cat.icon}</span>
						</div>
						<div class="flex-1 min-w-0">
							<div class="flex justify-between items-baseline mb-1">
								<p class="text-sm font-bold text-on-surface">{cat.name}</p>
								<p class="text-xs font-bold text-on-surface-variant">{cat.count} item</p>
							</div>
							<div class="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
								<div class="bg-emerald-500 h-full rounded-full" style="width: {Math.round((cat.count / 248) * 100)}%"></div>
							</div>
							<p class="text-[10px] text-on-surface-variant mt-0.5">{fmt(cat.value)}</p>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Low Stock Alerts -->
		<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs overflow-hidden flex flex-col">
			<div class="px-5 py-4 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
				<h2 class="text-base font-bold text-on-surface flex items-center gap-2">
					<span class="material-symbols-outlined text-rose-500 text-lg">warning</span>
					<span>Peringatan Stok Minimum</span>
					<span class="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{lowStockAlerts.length}</span>
				</h2>
				<a href="/pms/items" class="text-xs font-bold text-emerald-600 hover:underline">Lihat Semua</a>
			</div>
			<div class="p-4 space-y-3 flex-1 overflow-y-auto">
				{#each lowStockAlerts as item}
					<div class="p-3.5 rounded-xl bg-surface border border-rose-500/20 hover:border-rose-500/40 transition-colors">
						<div class="flex justify-between items-start mb-2">
							<div>
								<p class="text-xs font-bold text-on-surface">{item.name}</p>
								<p class="text-[10px] text-on-surface-variant font-mono">{item.code} · {item.category}</p>
							</div>
							<span class="text-[9px] font-bold bg-rose-500/10 text-rose-600 px-2 py-0.5 rounded uppercase border border-rose-500/20">Stok Kritis</span>
						</div>
						<div class="flex items-center gap-2">
							<div class="flex-1 bg-surface-container-highest h-2 rounded-full overflow-hidden">
								<div class="bg-rose-500 h-full rounded-full" style="width: {stockPercent(item)}%"></div>
							</div>
							<span class="text-[10px] font-bold text-rose-600 flex-shrink-0">{item.stock}/{item.minStock} {item.unit}</span>
						</div>
						<a href="/pms/purchasing/orders/create" class="text-xs font-bold text-emerald-600 mt-2 flex items-center gap-1 hover:underline">
							<span class="material-symbols-outlined text-sm">add_shopping_cart</span>
							<span>Buat PO Pengadaan</span>
						</a>
					</div>
				{/each}
			</div>
		</div>

		<!-- Upcoming Maintenance Schedules -->
		<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs overflow-hidden flex flex-col">
			<div class="px-5 py-4 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
				<h2 class="text-base font-bold text-on-surface flex items-center gap-2">
					<span class="material-symbols-outlined text-blue-500 text-lg">calendar_month</span>
					<span>Jadwal Perawatan Unit</span>
				</h2>
				<a href="/pms/schedules" class="text-xs font-bold text-emerald-600 hover:underline">Lihat Semua</a>
			</div>
			<div class="p-4 space-y-3 flex-1 overflow-y-auto">
				{#each upcomingSchedules as sched}
					<div class="flex items-start justify-between p-3.5 rounded-xl bg-surface border border-slate-200/60 dark:border-slate-800/60 hover:bg-surface-container-high transition-colors">
						<div class="flex items-center gap-3">
							<div class="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">
								<span class="material-symbols-outlined text-lg">build</span>
							</div>
							<div>
								<p class="text-xs font-bold text-on-surface">{sched.unit}</p>
								<p class="text-[10px] text-on-surface-variant">{sched.type}</p>
								<p class="text-[10px] text-on-surface-variant mt-0.5">{sched.dueDate} {sched.dueKm !== '-' ? '· ' + sched.dueKm : ''}</p>
							</div>
						</div>
						<span class="text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider flex-shrink-0 {getScheduleStyle(sched.status)}">{sched.status}</span>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<!-- Recent Purchase Orders -->
	<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs">
		<div class="px-5 py-4 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between bg-slate-100/70 dark:bg-slate-800/50">
			<h2 class="text-base font-bold text-on-surface flex items-center gap-2">
				<span class="material-symbols-outlined text-emerald-600 text-lg">receipt_long</span>
				<span>Purchase Orders (PO) Terbaru</span>
			</h2>
			<a href="/pms/purchasing/orders" class="text-xs font-bold text-emerald-600 hover:underline">Lihat Semua PO</a>
		</div>
		<div class="overflow-x-auto">
			<table class="w-full text-left text-sm min-w-[640px]">
				<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
					<tr>
						<th class="py-3.5 px-5">No. PO</th>
						<th class="py-3.5 px-5">Supplier</th>
						<th class="py-3.5 px-5">Jumlah Items</th>
						<th class="py-3.5 px-5">Total Nilai</th>
						<th class="py-3.5 px-5">Tanggal</th>
						<th class="py-3.5 px-5">Status</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
					{#each recentPOs as po}
						<tr class="hover:bg-surface-container transition-colors">
							<td class="py-4 px-5">
								<p class="text-sm font-bold text-emerald-600 font-mono">{po.id}</p>
							</td>
							<td class="py-4 px-5">
								<div class="flex items-center gap-3">
									<div class="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
										<span class="material-symbols-outlined text-base">storefront</span>
									</div>
									<p class="text-sm font-bold text-on-surface">{po.supplier}</p>
								</div>
							</td>
							<td class="py-4 px-5">
								<p class="text-sm font-medium text-on-surface">{po.items} item</p>
							</td>
							<td class="py-4 px-5">
								<p class="text-sm font-black text-on-surface">{fmt(po.totalValue)}</p>
							</td>
							<td class="py-4 px-5">
								<p class="text-xs text-on-surface-variant">{po.date}</p>
							</td>
							<td class="py-4 px-5">
								<span class="inline-flex items-center gap-1.5 font-bold text-[10px] px-2.5 py-1 rounded-md uppercase tracking-wider border {getPOStyle(po.status)}">{po.status}</span>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>
