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

<div class="flex flex-col h-full">
	<header class="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
		<div>
			<h1 class="text-3xl font-extrabold text-on-surface tracking-tight mb-2">PMS Dashboard</h1>
			<p class="text-on-surface-variant font-medium text-sm">Procurement Management System — Barang, Pembelian, Inventaris & Jadwal Perawatan</p>
		</div>
		<div class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
			<span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
			<span class="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Procurement</span>
		</div>
	</header>

	<!-- KPI Cards -->
	<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
		{#each [
			{ label: 'Total Item', value: summary.totalItems, color: 'amber', icon: 'inventory_2', link: '/pms/items' },
			{ label: 'Low Stock', value: summary.lowStock, color: 'rose', icon: 'warning', link: '/pms/stock' },
			{ label: 'Pending PO', value: summary.pendingPO, color: 'amber', icon: 'pending_actions', link: '/pms/purchase-orders' },
			{ label: 'Nilai PO', value: null, raw: fmt(summary.totalPOValue), color: 'emerald', icon: 'payments', link: '/pms/purchase-orders' },
			{ label: 'Jadwal Service', value: summary.scheduledService, color: 'sky', icon: 'calendar_month', link: '/pms/schedules' },
			{ label: 'Overdue Service', value: summary.overdueService, color: 'red', icon: 'build_circle', link: '/pms/schedules' },
		] as card}
			<a href={card.link} class="bg-surface-container-lowest p-4 rounded-2xl border border-{card.color}-500/20 shadow-sm hover:scale-[1.03] hover:shadow-md transition-all text-center group">
				<span class="material-symbols-outlined text-xl text-{card.color}-500 mb-1 block">{card.icon}</span>
				{#if card.value !== null}
					<h3 class="text-2xl font-black text-{card.color}-600">{card.value}</h3>
				{:else}
					<h3 class="text-sm font-black text-{card.color}-600 leading-tight">{card.raw}</h3>
				{/if}
				<p class="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider mt-0.5">{card.label}</p>
			</a>
		{/each}
	</div>

	<!-- Main Grid -->
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
		<!-- Category Breakdown -->
		<div class="bg-surface-container-lowest rounded-[24px] shadow-sm p-6">
			<h2 class="text-base font-extrabold text-on-surface mb-5">Kategori Inventaris</h2>
			<div class="space-y-4">
				{#each categoryBreakdown as cat}
					<div class="flex items-center gap-4">
						<div class="w-10 h-10 rounded-xl bg-{cat.color}-100 dark:bg-{cat.color}-900/30 flex items-center justify-center text-{cat.color}-600 flex-shrink-0">
							<span class="material-symbols-outlined text-[18px]">{cat.icon}</span>
						</div>
						<div class="flex-1 min-w-0">
							<div class="flex justify-between items-baseline mb-1">
								<p class="text-sm font-bold text-on-surface">{cat.name}</p>
								<p class="text-xs font-bold text-on-surface-variant">{cat.count} item</p>
							</div>
							<div class="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden">
								<div class="bg-{cat.color}-500 h-full rounded-full" style="width: {Math.round((cat.count / 248) * 100)}%"></div>
							</div>
							<p class="text-[10px] text-on-surface-variant mt-0.5">{fmt(cat.value)}</p>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Low Stock Alerts -->
		<div class="bg-surface-container-lowest rounded-[24px] shadow-sm overflow-hidden flex flex-col">
			<div class="px-6 pt-6 pb-4 border-b border-surface-container flex items-center justify-between">
				<h2 class="text-base font-extrabold text-on-surface flex items-center gap-2">
					<span class="material-symbols-outlined text-rose-500 text-lg">warning</span>
					Low Stock Alert
					<span class="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{lowStockAlerts.length}</span>
				</h2>
				<a href="/pms/stock" class="text-xs font-bold text-amber-600 hover:underline">Lihat Semua</a>
			</div>
			<div class="p-4 space-y-3 flex-1">
				{#each lowStockAlerts as item}
					<div class="p-3 rounded-xl bg-rose-500/5 border border-rose-500/10 hover:border-rose-500/20 transition-colors">
						<div class="flex justify-between items-start mb-2">
							<div>
								<p class="text-xs font-black text-on-surface">{item.name}</p>
								<p class="text-[10px] text-on-surface-variant">{item.code} · {item.category}</p>
							</div>
							<span class="text-[9px] font-bold bg-rose-500/10 text-rose-600 px-2 py-0.5 rounded border border-rose-500/20 uppercase">Low</span>
						</div>
						<div class="flex items-center gap-2">
							<div class="flex-1 bg-surface-container-high h-2 rounded-full overflow-hidden">
								<div class="bg-rose-500 h-full rounded-full" style="width: {stockPercent(item)}%"></div>
							</div>
							<span class="text-[10px] font-bold text-rose-600 flex-shrink-0">{item.stock}/{item.minStock} {item.unit}</span>
						</div>
						<a href="/pms/purchase-orders" class="text-[10px] font-bold text-amber-600 mt-2 flex items-center gap-1 hover:underline">
							<span class="material-symbols-outlined text-[12px]">add_shopping_cart</span> Buat PO
						</a>
					</div>
				{/each}
			</div>
		</div>

		<!-- Upcoming Maintenance Schedules -->
		<div class="bg-surface-container-lowest rounded-[24px] shadow-sm overflow-hidden flex flex-col">
			<div class="px-6 pt-6 pb-4 border-b border-surface-container flex items-center justify-between">
				<h2 class="text-base font-extrabold text-on-surface flex items-center gap-2">
					<span class="material-symbols-outlined text-amber-500 text-lg">calendar_month</span>
					Jadwal Mendatang
				</h2>
				<a href="/pms/schedules" class="text-xs font-bold text-amber-600 hover:underline">Lihat Semua</a>
			</div>
			<div class="p-4 space-y-3 flex-1">
				{#each upcomingSchedules as sched}
					<div class="flex items-start justify-between p-3 rounded-xl bg-surface-container-low hover:bg-surface-container-high transition-colors">
						<div class="flex items-center gap-3">
							<div class="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 flex-shrink-0">
								<span class="material-symbols-outlined text-[16px]">build</span>
							</div>
							<div>
								<p class="text-xs font-bold text-on-surface">{sched.unit}</p>
								<p class="text-[10px] text-on-surface-variant">{sched.type}</p>
								<p class="text-[10px] text-on-surface-variant">{sched.dueDate} {sched.dueKm !== '-' ? '· ' + sched.dueKm : ''}</p>
							</div>
						</div>
						<span class="text-[9px] font-bold px-2 py-1 rounded border uppercase tracking-wide flex-shrink-0 {getScheduleStyle(sched.status)}">{sched.status}</span>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<!-- Recent Purchase Orders -->
	<div class="bg-surface-container-lowest rounded-[24px] shadow-sm overflow-hidden">
		<div class="px-6 pt-6 pb-4 border-b border-surface-container flex items-center justify-between">
			<h2 class="text-base font-extrabold text-on-surface">Purchase Orders Terbaru</h2>
			<a href="/pms/purchase-orders" class="text-xs font-bold text-amber-600 hover:underline">Lihat Semua</a>
		</div>
		<div class="overflow-x-auto">
			<table class="w-full text-left border-collapse min-w-[640px]">
				<thead>
					<tr class="border-b border-surface-container">
						<th class="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">No. PO</th>
						<th class="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Supplier</th>
						<th class="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Items</th>
						<th class="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Total Nilai</th>
						<th class="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Tanggal</th>
						<th class="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Status</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-surface-container">
					{#each recentPOs as po}
						<tr class="hover:bg-surface-container-low transition-colors">
							<td class="py-4 px-6">
								<p class="text-sm font-bold text-amber-600">{po.id}</p>
							</td>
							<td class="py-4 px-6">
								<div class="flex items-center gap-3">
									<div class="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600">
										<span class="material-symbols-outlined text-[16px]">storefront</span>
									</div>
									<p class="text-sm font-bold text-on-surface">{po.supplier}</p>
								</div>
							</td>
							<td class="py-4 px-6">
								<p class="text-sm font-medium text-on-surface">{po.items} item</p>
							</td>
							<td class="py-4 px-6">
								<p class="text-sm font-black text-on-surface">{fmt(po.totalValue)}</p>
							</td>
							<td class="py-4 px-6">
								<p class="text-sm text-on-surface-variant">{po.date}</p>
							</td>
							<td class="py-4 px-6">
								<span class="inline-flex items-center gap-1.5 font-bold text-[10px] px-2.5 py-1 rounded-md uppercase tracking-wider border {getPOStyle(po.status)}">{po.status}</span>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>
