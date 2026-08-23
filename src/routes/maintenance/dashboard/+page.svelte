<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	
	let { data } = $props();
	
	// Group WOs by status
	let openWos = $derived(data.workOrders.filter(w => w.status?.toLowerCase() === 'open' || w.status?.toLowerCase() === 'overdue'));
	let prosesWos = $derived(data.workOrders.filter(w => w.status?.toLowerCase() === 'proses'));
	let closedWos = $derived(data.workOrders.filter(w => w.status?.toLowerCase() === 'closed' || w.status?.toLowerCase() === 'complete'));

	function formatDate(dateStr) {
		if (!dateStr) return '-';
		return new Date(dateStr).toLocaleDateString('id-ID', {
			month: 'short', day: 'numeric', year: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>Mechanic Dashboard | FMS</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Header -->
	<header class="flex flex-col md:flex-row md:items-end justify-between gap-4 flex-shrink-0">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-sky-600 dark:text-sky-400 text-2xl">build_circle</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Papan Kontrol Servis Mekanik</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-sm mt-0.5">
				Monitoring pengerjaan Surat Perintah Kerja (SPK / WO) armada, alokasi montir/teknisi bengkel, dan perbaikan unit
			</p>
		</div>
		<div class="flex gap-3">
			<a href="/maintenance/work-orders/create" class="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-xs flex items-center gap-2 transition-colors">
				<span class="material-symbols-outlined text-lg">add</span>
				<span>Buat WO Baru</span>
			</a>
		</div>
	</header>

	<!-- Kanban Board -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 min-h-0">
			<!-- Column 1: Open -->
			<div class="flex flex-col rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 p-5 shadow-xs">
				<div class="flex justify-between items-center mb-4 pb-3 border-b border-slate-200/60 dark:border-slate-800/60">
					<h2 class="text-sm font-bold text-on-surface flex items-center gap-2">
						<span class="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
						<span>Menunggu Pengerjaan</span>
					</h2>
					<span class="bg-rose-500/10 text-rose-600 border border-rose-500/20 font-bold px-2 py-0.5 rounded-full text-xs">{openWos.length}</span>
				</div>
				
				<div class="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
					{#each openWos as wo}
						<a href="/maintenance/work-orders/{encodeURIComponent(wo.wo_no)}" class="block bg-surface border border-outline-variant/30 p-4 rounded-2xl hover:border-primary/50 hover:shadow-md transition-all group">
							<div class="flex justify-between items-start mb-2">
								<span class="text-xs font-black text-rose-600 bg-rose-50 px-2 py-1 rounded-md">{wo.status}</span>
								<span class="text-[10px] font-bold text-on-surface-variant">{formatDate(wo.wo_date)}</span>
							</div>
							<h3 class="text-sm font-bold text-on-surface group-hover:text-primary transition-colors">{wo.wo_no}</h3>
							<div class="mt-3 flex items-center gap-2 text-xs font-medium text-on-surface-variant">
								<span class="material-symbols-outlined text-[16px]">local_shipping</span> {wo.unit_id}
							</div>
							<div class="mt-2 flex items-center gap-2 text-xs font-bold {wo.mechanic_name ? 'text-emerald-600' : 'text-rose-500'}">
								<span class="material-symbols-outlined text-[16px]">{wo.mechanic_name ? 'engineering' : 'person_off'}</span> 
								{wo.mechanic_name ? wo.mechanic_name : 'Unassigned'}
							</div>
							{#if wo.problem}
								<p class="mt-2 text-xs text-on-surface-variant line-clamp-2 italic">"{wo.problem}"</p>
							{/if}
						</a>
					{:else}
						<div class="text-center py-8 text-on-surface-variant">
							<span class="material-symbols-outlined text-4xl opacity-50 mb-2">done_all</span>
							<p class="text-sm font-medium">No pending tasks</p>
						</div>
					{/each}
				</div>
			</div>

			<!-- Column 2: In Progress -->
			<div class="flex flex-col rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 p-5 shadow-xs">
				<div class="flex justify-between items-center mb-4 pb-3 border-b border-slate-200/60 dark:border-slate-800/60">
					<h2 class="text-sm font-bold text-on-surface flex items-center gap-2">
						<span class="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
						<span>Sedang Dikerjakan</span>
					</h2>
					<span class="bg-sky-500/10 text-sky-600 border border-sky-500/20 font-bold px-2 py-0.5 rounded-full text-xs">{prosesWos.length}</span>
				</div>
				
				<div class="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
					{#each prosesWos as wo}
						<a href="/maintenance/work-orders/{encodeURIComponent(wo.wo_no)}" class="block bg-surface border border-slate-200/60 dark:border-slate-800/60 p-4 rounded-xl hover:border-sky-500/50 hover:shadow-sm transition-all group">
							<div class="flex justify-between items-start mb-2">
								<span class="text-[10px] font-bold text-sky-600 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-md uppercase">{wo.status}</span>
								<span class="text-[10px] font-medium text-on-surface-variant">{formatDate(wo.wo_date)}</span>
							</div>
							<h3 class="text-sm font-bold text-on-surface group-hover:text-sky-600 transition-colors font-mono">{wo.wo_no}</h3>
							<div class="mt-2 flex items-center gap-2 text-xs font-medium text-on-surface-variant">
								<span class="material-symbols-outlined text-sm">local_shipping</span> {wo.unit_id}
							</div>
							<div class="mt-1.5 flex items-center gap-1.5 text-xs font-bold text-sky-600">
								<span class="material-symbols-outlined text-sm">engineering</span> 
								<span>{wo.mechanic_name ? wo.mechanic_name : 'Belum Ditugaskan'}</span>
							</div>
							{#if wo.problem}
								<p class="mt-2 text-xs text-on-surface-variant line-clamp-2 italic">"{wo.problem}"</p>
							{/if}
						</a>
					{:else}
						<div class="text-center py-10 text-on-surface-variant">
							<span class="material-symbols-outlined text-3xl opacity-40 mb-1 block">coffee</span>
							<p class="text-xs font-medium">Tidak ada servis berlangsung.</p>
						</div>
					{/each}
				</div>
			</div>

			<!-- Column 3: Completed -->
			<div class="flex flex-col rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 p-5 shadow-xs">
				<div class="flex justify-between items-center mb-4 pb-3 border-b border-slate-200/60 dark:border-slate-800/60">
					<h2 class="text-sm font-bold text-on-surface flex items-center gap-2">
						<span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
						<span>Selesai Dikerjakan</span>
					</h2>
					<span class="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-bold px-2 py-0.5 rounded-full text-xs">{closedWos.length}</span>
				</div>
				
				<div class="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
					{#each closedWos as wo}
						<a href="/maintenance/work-orders/{encodeURIComponent(wo.wo_no)}" class="block bg-surface border border-slate-200/60 dark:border-slate-800/60 p-4 rounded-xl hover:border-emerald-500/50 hover:shadow-sm transition-all group">
							<div class="flex justify-between items-start mb-2">
								<span class="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md uppercase">{wo.status}</span>
								<span class="text-[10px] font-medium text-on-surface-variant">{formatDate(wo.closed_at || wo.wo_date)}</span>
							</div>
							<h3 class="text-sm font-bold text-on-surface group-hover:text-emerald-600 transition-colors font-mono">{wo.wo_no}</h3>
							<div class="mt-2 flex items-center gap-2 text-xs font-medium text-on-surface-variant">
								<span class="material-symbols-outlined text-sm">local_shipping</span> {wo.unit_id}
							</div>
							<div class="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-on-surface-variant">
								<span class="material-symbols-outlined text-sm">engineering</span> 
								<span>{wo.mechanic_name ? wo.mechanic_name : 'Unknown'}</span>
							</div>
						</a>
					{:else}
						<div class="text-center py-10 text-on-surface-variant">
							<span class="material-symbols-outlined text-3xl opacity-40 mb-1 block">task_alt</span>
							<p class="text-xs font-medium">Belum ada servis selesai.</p>
						</div>
					{/each}
				</div>
			</div>

		</div>
</div>

<style>
	/* Custom scrollbar for kanban columns */
	.custom-scrollbar::-webkit-scrollbar {
		width: 4px;
	}
	.custom-scrollbar::-webkit-scrollbar-track {
		background: transparent;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb {
		background-color: var(--md-sys-color-outline-variant, #cbd5e1);
		border-radius: 20px;
	}
</style>
