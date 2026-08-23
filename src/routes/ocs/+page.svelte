<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
	let summary = $derived(data.summary);
	let pendingDOs = $derived(data.pendingDOs || []);
	let activeJourneys = $derived(data.activeJourneys || []);
	let recentCompletions = $derived(data.recentCompletions || []);
	let dailyTargets = $derived(data.dailyTargets || []);

	const formatCurrency = (amount: number) =>
		new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
</script>

<svelte:head>
	<title>OCS Dashboard | ERP BCS</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Header & Actions -->
	<header class="flex flex-col md:flex-row md:items-end justify-between gap-4 flex-shrink-0">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-blue-600 dark:text-blue-400 text-2xl">hub</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Operational Command System (OCS)</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-sm mt-0.5">
				Pusat kendali dispatching surat jalan, uang jalan (UJO), target ritase harian, dan monitoring perjalanan armada
			</p>
		</div>
		<div class="flex items-center gap-2.5">
			<a href="/ocs/dispatch" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-xs transition-colors">
				<span class="material-symbols-outlined text-lg">add_task</span>
				<span>Proses Dispatch</span>
			</a>
		</div>
	</header>

	<!-- Summary Cards (Bento) -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Pending Dispatch</p>
					<h3 class="text-2xl font-black text-amber-600 mt-1">{summary.pendingDispatch}</h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">pending_actions</span>
				</div>
			</div>
			<a href="/ocs/dispatch" class="text-xs font-bold text-amber-600 mt-2 flex items-center gap-1 hover:underline">
				Proses surat jalan <span class="material-symbols-outlined text-xs">arrow_forward</span>
			</a>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Active Journeys</p>
					<h3 class="text-2xl font-black text-blue-600 mt-1">{summary.activeJourneys}</h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">local_shipping</span>
				</div>
			</div>
			<p class="text-xs text-blue-600 font-medium mt-2">Armada sedang dalam rute</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Selesai Hari Ini</p>
					<h3 class="text-2xl font-black text-emerald-600 mt-1">{summary.completedToday}</h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">check_circle</span>
				</div>
			</div>
			<p class="text-xs text-emerald-600 font-medium mt-2">Trip berhasil terkirim</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total UJO Hari Ini</p>
					<h3 class="text-xl font-black text-violet-600 mt-1">{formatCurrency(summary.totalUJO)}</h3>
				</div>
				<div class="w-12 h-12 rounded-xl bg-violet-500/10 text-violet-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">payments</span>
				</div>
			</div>
			<p class="text-xs text-violet-600 font-medium mt-2">Uang jalan operasional</p>
		</div>
	</div>

	<!-- Daily Targets Tracker -->
	{#if dailyTargets.length > 0}
		<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs overflow-hidden">
			<div class="px-6 py-4 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between bg-slate-100/70 dark:bg-slate-800/50">
				<div>
					<h2 class="text-base font-bold text-on-surface flex items-center gap-2">
						<span class="material-symbols-outlined text-blue-600 text-lg">track_changes</span>
						<span>Target Pengiriman & Ritase Harian</span>
					</h2>
					<p class="text-xs text-on-surface-variant mt-0.5">Pemantauan progres tonase dan ritase terhadap target operasional hari ini</p>
				</div>
				<a href="/ocs/daily-targets" class="text-xs font-bold text-blue-600 hover:underline">Kelola Target</a>
			</div>
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-200/60 dark:divide-slate-800/60">
				{#each dailyTargets as t}
					<div class="p-5 hover:bg-surface-container transition-colors">
						<p class="text-xs font-bold text-on-surface truncate">{t.project}</p>
						<p class="text-[10px] text-on-surface-variant truncate mb-3">{t.customer}</p>
						
						<div class="space-y-4">
							<!-- Tonnage Progress -->
							<div>
								<div class="flex justify-between text-[10px] font-bold mb-1">
									<span class="text-emerald-600">{new Intl.NumberFormat('id-ID').format(t.achievedTonnage)} Ton</span>
									<span class="text-on-surface-variant">Target {new Intl.NumberFormat('id-ID').format(t.targetTonnage)} Ton</span>
								</div>
								<div class="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
									<div class="h-full bg-emerald-500 rounded-full transition-all duration-500" style="width: {Math.min((t.achievedTonnage/t.targetTonnage)*100, 100)}%"></div>
								</div>
							</div>

							<!-- Ritase Progress -->
							<div>
								<div class="flex justify-between text-[10px] font-bold mb-1">
									<span class="text-blue-600">{t.achievedRitase} Rit</span>
									<span class="text-on-surface-variant">Target {t.targetRitase} Rit</span>
								</div>
								<div class="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
									<div class="h-full bg-blue-500 rounded-full transition-all duration-500" style="width: {Math.min((t.achievedRitase/t.targetRitase)*100, 100)}%"></div>
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<!-- Pending DOs (Left col) -->
		<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col overflow-hidden">
			<div class="px-5 py-4 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
				<h2 class="text-base font-bold text-on-surface flex items-center gap-2">
					<span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
					<span>DO Pending Dispatch</span>
				</h2>
				<a href="/ocs/dispatch" class="text-xs font-bold text-blue-600 hover:underline">Lihat Semua</a>
			</div>
			<div class="p-4 space-y-3 flex-1 overflow-y-auto">
				{#each pendingDOs as order}
					<div class="p-4 rounded-xl bg-surface hover:bg-surface-container-high transition-colors border border-slate-200/60 dark:border-slate-800/60 cursor-pointer">
						<div class="flex items-start justify-between mb-2">
							<div>
								<p class="text-sm font-bold text-on-surface font-mono">{order.id}</p>
								<p class="text-xs text-on-surface-variant font-medium mt-0.5">{order.customer}</p>
							</div>
							<span class="text-[10px] font-bold bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-md uppercase border border-amber-500/20">Pending</span>
						</div>
						<div class="text-xs text-on-surface-variant space-y-1">
							<p class="flex items-center gap-1.5">
								<span class="material-symbols-outlined text-[14px] text-blue-500">route</span>
								<strong class="text-on-surface">{order.origin} → {order.destination}</strong>
							</p>
							<p class="flex items-center gap-1.5 text-[11px]">
								<span class="material-symbols-outlined text-[14px] text-slate-400">inventory_2</span>
								<span>{order.cargo} · {order.weight}</span>
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
		<div class="lg:col-span-2 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col overflow-hidden">
			<div class="px-5 py-4 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
				<h2 class="text-base font-bold text-on-surface flex items-center gap-2">
					<span class="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
					<span>Perjalanan Aktif</span>
				</h2>
				<a href="/ocs/fleet-status" class="text-xs font-bold text-blue-600 hover:underline">Lihat Status Armada</a>
			</div>
			<div class="overflow-x-auto flex-1">
				<table class="w-full text-left text-sm min-w-[520px]">
					<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
						<tr>
							<th class="py-3 px-5">Unit & Driver</th>
							<th class="py-3 px-5">Rute</th>
							<th class="py-3 px-5">Progress</th>
							<th class="py-3 px-5">UJO</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
						{#each activeJourneys as j}
							<tr class="hover:bg-surface-container transition-colors">
								<td class="py-3.5 px-5">
									<div class="flex items-center gap-3">
										<div class="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">
											<span class="material-symbols-outlined text-lg">local_shipping</span>
										</div>
										<div>
											<p class="text-sm font-bold text-on-surface">{j.unit}</p>
											<p class="text-xs text-on-surface-variant font-medium">{j.driver}</p>
											<p class="text-[10px] text-blue-600 font-bold font-mono">{j.do}</p>
										</div>
									</div>
								</td>
								<td class="py-3.5 px-5">
									<p class="text-sm font-bold text-on-surface">{j.origin} → {j.destination}</p>
								</td>
								<td class="py-3.5 px-5">
									<div class="w-28">
										<div class="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden mb-1">
											<div class="bg-blue-500 h-full rounded-full" style="width:{j.progress}%"></div>
										</div>
										<p class="text-[10px] font-bold text-on-surface-variant">{j.progress}%</p>
									</div>
								</td>
								<td class="py-3.5 px-5">
									<p class="text-sm font-bold text-on-surface">{formatCurrency(j.ujo)}</p>
									<span class="text-[10px] font-bold uppercase {j.ujoStatus === 'PAID' ? 'text-emerald-600' : 'text-amber-600'}">
										{j.ujoStatus === 'PAID' ? 'Sudah Cair' : 'Menunggu Kasir'}
									</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Recent Completions -->
			<div class="border-t border-slate-200/60 dark:border-slate-800/60 px-5 py-4 bg-surface-container-low/50">
				<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">Baru Selesai Terkirim</p>
				<div class="space-y-2">
					{#each recentCompletions as c}
						<div class="flex items-center justify-between p-3 rounded-xl bg-surface border border-slate-200/60 dark:border-slate-800/60">
							<div class="flex items-center gap-3">
								<span class="material-symbols-outlined text-emerald-500 text-lg">check_circle</span>
								<div>
									<p class="text-xs font-bold text-on-surface">{c.unit} • {c.driver}</p>
									<p class="text-[11px] text-on-surface-variant font-medium">{c.route} · <span class="font-mono">{c.do}</span></p>
								</div>
							</div>
							<div class="text-right">
								<p class="text-xs font-bold text-emerald-600">{formatCurrency(c.ujo)}</p>
								<p class="text-[10px] text-on-surface-variant">{c.completedAt}</p>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
</div>
