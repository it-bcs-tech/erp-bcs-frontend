<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
	let { summary, pendingDOs, activeJourneys, recentCompletions } = $derived(data);

	const formatCurrency = (amount: number) =>
		new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
</script>

<svelte:head>
	<title>OCS Dashboard | ERP BCS</title>
</svelte:head>

<div class="flex flex-col h-full">
	<header class="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
		<div>
			<h1 class="text-3xl font-extrabold text-on-surface tracking-tight mb-2">OCS Dashboard</h1>
			<p class="text-on-surface-variant font-medium text-sm">Operational Command System — Dispatch, UJO, dan kendali perjalanan armada</p>
		</div>
		<div class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20">
			<span class="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
			<span class="text-[10px] font-bold text-sky-600 uppercase tracking-wider">Operational</span>
		</div>
	</header>

	<!-- Summary Cards -->
	<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
		<div class="bg-surface-container-lowest p-5 rounded-2xl border border-amber-500/20 shadow-sm hover:scale-[1.02] transition-transform">
			<p class="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2">Pending Dispatch</p>
			<div class="flex items-end justify-between">
				<h3 class="text-3xl font-black text-amber-600">{summary.pendingDispatch}</h3>
				<span class="material-symbols-outlined text-3xl text-amber-500/40">pending_actions</span>
			</div>
			<a href="/ocs/dispatch" class="text-[10px] font-bold text-amber-600 mt-2 flex items-center gap-1 hover:underline">
				Proses sekarang <span class="material-symbols-outlined text-[12px]">arrow_forward</span>
			</a>
		</div>
		<div class="bg-surface-container-lowest p-5 rounded-2xl border border-sky-500/20 shadow-sm hover:scale-[1.02] transition-transform">
			<p class="text-xs font-bold text-sky-600 uppercase tracking-wider mb-2">Active Journeys</p>
			<div class="flex items-end justify-between">
				<h3 class="text-3xl font-black text-sky-600">{summary.activeJourneys}</h3>
				<span class="material-symbols-outlined text-3xl text-sky-500/40">local_shipping</span>
			</div>
		</div>
		<div class="bg-surface-container-lowest p-5 rounded-2xl border border-emerald-500/20 shadow-sm hover:scale-[1.02] transition-transform">
			<p class="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">Completed Today</p>
			<div class="flex items-end justify-between">
				<h3 class="text-3xl font-black text-emerald-600">{summary.completedToday}</h3>
				<span class="material-symbols-outlined text-3xl text-emerald-500/40">check_circle</span>
			</div>
		</div>
		<div class="bg-surface-container-lowest p-5 rounded-2xl border border-violet-500/20 shadow-sm hover:scale-[1.02] transition-transform">
			<p class="text-xs font-bold text-violet-600 uppercase tracking-wider mb-2">Total UJO Hari Ini</p>
			<div class="flex items-end justify-between">
				<h3 class="text-xl font-black text-violet-600">{formatCurrency(summary.totalUJO)}</h3>
				<span class="material-symbols-outlined text-3xl text-violet-500/40">payments</span>
			</div>
		</div>
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<!-- Pending DOs (Left col) -->
		<div class="bg-surface-container-lowest rounded-[24px] shadow-sm flex flex-col overflow-hidden">
			<div class="px-6 pt-6 pb-4 border-b border-surface-container flex items-center justify-between">
				<h2 class="text-base font-extrabold text-on-surface flex items-center gap-2">
					<span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
					DO Pending Dispatch
				</h2>
				<a href="/ocs/dispatch" class="text-xs font-bold text-sky-600 hover:underline">Lihat Semua</a>
			</div>
			<div class="p-4 space-y-3 flex-1 overflow-y-auto">
				{#each pendingDOs as order}
					<div class="p-4 rounded-xl bg-surface-container-low hover:bg-surface-container-high transition-colors border border-amber-500/10 hover:border-amber-500/20 cursor-pointer">
						<div class="flex items-start justify-between mb-2">
							<div>
								<p class="text-sm font-black text-on-surface">{order.id}</p>
								<p class="text-[10px] text-on-surface-variant font-medium">{order.customer}</p>
							</div>
							<span class="text-[9px] font-bold bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded uppercase border border-amber-500/20">Pending</span>
						</div>
						<div class="text-[11px] text-on-surface-variant space-y-1">
							<p class="flex items-center gap-1.5">
								<span class="material-symbols-outlined text-[13px] text-sky-500">route</span>
								<strong class="text-on-surface">{order.origin} → {order.destination}</strong>
							</p>
							<p class="flex items-center gap-1.5">
								<span class="material-symbols-outlined text-[13px]">inventory_2</span>
								{order.cargo} · {order.weight}
							</p>
							<p class="flex items-center gap-1.5">
								<span class="material-symbols-outlined text-[13px]">local_shipping</span>
								{order.vehicleReq}
							</p>
						</div>
						<div class="mt-3 flex items-center justify-between">
							<span class="text-[10px] font-bold text-sky-600">{formatCurrency(order.tariff)}</span>
							<a href="/ocs/dispatch" class="text-[10px] font-bold text-sky-600 bg-sky-500/10 px-2.5 py-1 rounded-lg hover:bg-sky-500/20 transition-colors">
								Assign Unit
							</a>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Active Journeys (Right 2 cols) -->
		<div class="lg:col-span-2 bg-surface-container-lowest rounded-[24px] shadow-sm flex flex-col overflow-hidden">
			<div class="px-6 pt-6 pb-4 border-b border-surface-container flex items-center justify-between">
				<h2 class="text-base font-extrabold text-on-surface flex items-center gap-2">
					<span class="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
					Perjalanan Aktif
				</h2>
				<a href="/ocs/history" class="text-xs font-bold text-sky-600 hover:underline">History</a>
			</div>
			<div class="overflow-x-auto flex-1">
				<table class="w-full text-left border-collapse min-w-[520px]">
					<thead>
						<tr class="border-b border-surface-container">
							<th class="py-3 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Unit & Driver</th>
							<th class="py-3 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Rute</th>
							<th class="py-3 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Progress</th>
							<th class="py-3 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">UJO</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-surface-container">
						{#each activeJourneys as j}
							<tr class="hover:bg-surface-container-low transition-colors">
								<td class="py-4 px-6">
									<div class="flex items-center gap-3">
										<div class="w-9 h-9 rounded-lg bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center text-sky-600">
											<span class="material-symbols-outlined text-[18px]">local_shipping</span>
										</div>
										<div>
											<p class="text-sm font-bold text-on-surface">{j.unit}</p>
											<p class="text-[10px] text-on-surface-variant">{j.driver}</p>
											<p class="text-[10px] text-sky-600 font-bold">{j.do}</p>
										</div>
									</div>
								</td>
								<td class="py-4 px-6">
									<p class="text-sm font-bold text-on-surface">{j.origin} → {j.destination}</p>
								</td>
								<td class="py-4 px-6">
									<div class="w-28">
										<div class="w-full bg-surface-container-high h-2 rounded-full overflow-hidden mb-1">
											<div class="bg-sky-500 h-full rounded-full shadow-[0_0_6px_rgba(14,165,233,0.5)]" style="width:{j.progress}%"></div>
										</div>
										<p class="text-[10px] font-bold text-on-surface-variant">{j.progress}%</p>
									</div>
								</td>
								<td class="py-4 px-6">
									<p class="text-sm font-bold text-on-surface">{formatCurrency(j.ujo)}</p>
									<span class="text-[9px] font-bold uppercase {j.ujoStatus === 'PAID' ? 'text-emerald-600' : 'text-amber-600'}">
										{j.ujoStatus === 'PAID' ? 'Sudah Cair' : 'Menunggu Kasir'}
									</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Recent Completions -->
			<div class="border-t border-surface-container px-6 py-4">
				<p class="text-[9px] font-black text-on-surface-variant uppercase tracking-widest mb-3">Baru Selesai</p>
				<div class="space-y-2">
					{#each recentCompletions as c}
						<div class="flex items-center justify-between p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
							<div class="flex items-center gap-3">
								<span class="material-symbols-outlined text-emerald-500 text-[18px]">check_circle</span>
								<div>
									<p class="text-xs font-bold text-on-surface">{c.unit} • {c.driver}</p>
									<p class="text-[10px] text-on-surface-variant">{c.route} · {c.do}</p>
								</div>
							</div>
							<div class="text-right">
								<p class="text-[10px] font-bold text-emerald-600">{formatCurrency(c.ujo)}</p>
								<p class="text-[9px] text-on-surface-variant">{c.completedAt}</p>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
</div>
