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

<div class="flex flex-col h-full max-w-7xl mx-auto space-y-6">
	<div class="bg-surface-container-lowest rounded-[32px] p-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
		<div>
			<h1 class="text-3xl font-black text-on-surface flex items-center gap-3">
				<span class="material-symbols-outlined text-primary text-4xl">dashboard_customize</span>
				Mechanic Dispatch Board
			</h1>
			<p class="text-sm font-medium text-on-surface-variant mt-2">Monitor all ongoing Work Orders and track mechanic assignments.</p>
		</div>
	</div>

	<!-- Kanban Board -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-0">
			
			<!-- Column 1: Open -->
			<div class="flex flex-col bg-surface-container-lowest rounded-[32px] p-6 shadow-sm border-t-4 border-rose-500">
				<div class="flex justify-between items-center mb-6">
					<h2 class="text-lg font-black text-on-surface flex items-center gap-2">
						<span class="material-symbols-outlined text-rose-500">assignment_late</span>
						Pending Tasks
					</h2>
					<span class="bg-rose-100 text-rose-700 font-bold px-3 py-1 rounded-full text-xs">{openWos.length}</span>
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
			<div class="flex flex-col bg-surface-container-lowest rounded-[32px] p-6 shadow-sm border-t-4 border-blue-500">
				<div class="flex justify-between items-center mb-6">
					<h2 class="text-lg font-black text-on-surface flex items-center gap-2">
						<span class="material-symbols-outlined text-blue-500">build</span>
						In Progress
					</h2>
					<span class="bg-blue-100 text-blue-700 font-bold px-3 py-1 rounded-full text-xs">{prosesWos.length}</span>
				</div>
				
				<div class="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
					{#each prosesWos as wo}
						<a href="/maintenance/work-orders/{encodeURIComponent(wo.wo_no)}" class="block bg-surface border border-outline-variant/30 p-4 rounded-2xl hover:border-primary/50 hover:shadow-md transition-all group">
							<div class="flex justify-between items-start mb-2">
								<span class="text-xs font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-md animate-pulse">{wo.status}</span>
								<span class="text-[10px] font-bold text-on-surface-variant">{formatDate(wo.wo_date)}</span>
							</div>
							<h3 class="text-sm font-bold text-on-surface group-hover:text-primary transition-colors">{wo.wo_no}</h3>
							<div class="mt-3 flex items-center gap-2 text-xs font-medium text-on-surface-variant">
								<span class="material-symbols-outlined text-[16px]">local_shipping</span> {wo.unit_id}
							</div>
							<div class="mt-2 flex items-center gap-2 text-xs font-bold text-blue-600">
								<span class="material-symbols-outlined text-[16px]">engineering</span> 
								{wo.mechanic_name ? wo.mechanic_name : 'Unassigned'}
							</div>
							{#if wo.problem}
								<p class="mt-2 text-xs text-on-surface-variant line-clamp-2 italic">"{wo.problem}"</p>
							{/if}
						</a>
					{:else}
						<div class="text-center py-8 text-on-surface-variant">
							<span class="material-symbols-outlined text-4xl opacity-50 mb-2">coffee</span>
							<p class="text-sm font-medium">No tasks in progress</p>
						</div>
					{/each}
				</div>
			</div>

			<!-- Column 3: Completed -->
			<div class="flex flex-col bg-surface-container-lowest rounded-[32px] p-6 shadow-sm border-t-4 border-emerald-500">
				<div class="flex justify-between items-center mb-6">
					<h2 class="text-lg font-black text-on-surface flex items-center gap-2">
						<span class="material-symbols-outlined text-emerald-500">check_circle</span>
						Completed
					</h2>
					<span class="bg-emerald-100 text-emerald-700 font-bold px-3 py-1 rounded-full text-xs">{closedWos.length}</span>
				</div>
				
				<div class="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
					{#each closedWos as wo}
						<a href="/maintenance/work-orders/{encodeURIComponent(wo.wo_no)}" class="block bg-surface border border-outline-variant/30 p-4 rounded-2xl hover:border-primary/50 hover:shadow-md transition-all group opacity-75 hover:opacity-100">
							<div class="flex justify-between items-start mb-2">
								<span class="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">{wo.status}</span>
								<span class="text-[10px] font-bold text-on-surface-variant">{formatDate(wo.closed_at || wo.wo_date)}</span>
							</div>
							<h3 class="text-sm font-bold text-on-surface group-hover:text-primary transition-colors">{wo.wo_no}</h3>
							<div class="mt-3 flex items-center gap-2 text-xs font-medium text-on-surface-variant">
								<span class="material-symbols-outlined text-[16px]">local_shipping</span> {wo.unit_id}
							</div>
							<div class="mt-2 flex items-center gap-2 text-[10px] font-bold text-on-surface-variant">
								<span class="material-symbols-outlined text-[14px]">engineering</span> 
								{wo.mechanic_name ? wo.mechanic_name : 'Unknown'}
							</div>
						</a>
					{:else}
						<div class="text-center py-8 text-on-surface-variant">
							<span class="material-symbols-outlined text-4xl opacity-50 mb-2">inbox</span>
							<p class="text-sm font-medium">No completed tasks yet</p>
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
