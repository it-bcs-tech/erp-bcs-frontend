<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	
	let { data }: { data: PageData } = $props();
	
	let leaveRequests = $derived(data.leaveRequests || []);
	let metrics = $derived(data.metrics);
	let meta = $derived(data.meta);

	let searchQuery = $state($page.url.searchParams.get('search') || '');
	let statusFilter = $state($page.url.searchParams.get('status') || 'All');

	let searchTimer: ReturnType<typeof setTimeout>;

	function updateQueryParams() {
		const url = new URL(window.location.href);
		if (searchQuery) {
			url.searchParams.set('search', searchQuery);
		} else {
			url.searchParams.delete('search');
		}
		
		if (statusFilter && statusFilter !== 'All') {
			url.searchParams.set('status', statusFilter);
		} else {
			url.searchParams.delete('status');
		}
		
		url.searchParams.set('page', '1');
		goto(url.toString(), { keepFocus: true, noScroll: true });
	}

	function handleSearchInput() {
		clearTimeout(searchTimer);
		searchTimer = setTimeout(updateQueryParams, 400);
	}

	function handleStatusChange() {
		updateQueryParams();
	}

	// Pagination Compute
	let totalPages = $derived(Math.max(1, Math.ceil((meta?.total || 0) / (meta?.per_page || 5))));
	let currentPage = $derived(meta?.current_page || 1);
	let startItem = $derived(meta?.total === 0 ? 0 : ((currentPage - 1) * (meta?.per_page || 5)) + 1);
	let endItem = $derived(Math.min(currentPage * (meta?.per_page || 5), meta?.total || 0));

	function goToPage(p: number) {
		if (p < 1 || p > totalPages) return;
		const url = new URL(window.location.href);
		url.searchParams.set('page', p.toString());
		goto(url.toString(), { invalidateAll: true, noScroll: true });
	}
</script>

<svelte:head>
	<title>Leave Management | HRIS Dashboard</title>
</svelte:head>

<div class="flex flex-col h-full">
	<!-- Header & Actions -->
	<header class="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-primary text-2xl">pending_actions</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Leave & Absence Management</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-sm mt-0.5">
				Pengajuan Cuti, Izin, Sakit & Monitoring Kuota Saldo Cuti Tahunan Karyawan
			</p>
		</div>
	</header>

	<!-- Metrics Cards -->
	<div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
		<div class="bg-surface-container-lowest p-5 rounded-2xl border border-primary/20 shadow-sm relative overflow-hidden group">
            <div class="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
			<p class="text-xs font-bold text-primary uppercase tracking-wider mb-2 relative z-10">Pending Approvals</p>
			<div class="flex items-end justify-between relative z-10">
				<h3 class="text-3xl font-black text-primary">{metrics.pendingApprovals}</h3>
				<span class="material-symbols-outlined text-3xl text-primary/50">hourglass_top</span>
			</div>
		</div>
		<div class="bg-surface-container-lowest p-5 rounded-2xl border border-tertiary/20 shadow-sm">
			<p class="text-xs font-bold text-tertiary uppercase tracking-wider mb-2">Approved This Month</p>
			<div class="flex items-end justify-between">
				<h3 class="text-3xl font-black text-tertiary">{metrics.approvedThisMonth}</h3>
				<span class="material-symbols-outlined text-3xl text-tertiary/50">check_circle</span>
			</div>
		</div>
		<div class="bg-surface-container-lowest p-5 rounded-2xl border border-error/20 shadow-sm">
			<p class="text-xs font-bold text-error uppercase tracking-wider mb-2">Rejected This Month</p>
			<div class="flex items-end justify-between">
				<h3 class="text-3xl font-black text-error">{metrics.rejectedThisMonth}</h3>
				<span class="material-symbols-outlined text-3xl text-error/50">cancel</span>
			</div>
		</div>
		<div class="bg-surface-container-lowest p-5 rounded-2xl border border-surface-container shadow-sm">
			<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">On Leave Today</p>
			<div class="flex items-end justify-between">
				<h3 class="text-3xl font-black text-on-surface-variant">{metrics.employeesOnLeaveToday}</h3>
				<span class="material-symbols-outlined text-3xl text-on-surface-variant/50">event_busy</span>
			</div>
		</div>
	</div>

	<!-- Filters & Search -->
	<div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
		<div class="flex gap-3">
			<select 
				bind:value={statusFilter} 
				onchange={handleStatusChange}
				class="bg-surface-container-lowest border border-outline-variant/30 text-on-surface rounded-xl py-2 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm font-medium shadow-sm appearance-none cursor-pointer"
			>
				<option value="All">All Status</option>
				<option value="Pending">Pending</option>
				<option value="Approved">Approved</option>
				<option value="Rejected">Rejected</option>
			</select>
		</div>

		<div class="relative w-full lg:w-72 flex-shrink-0">
			<span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">search</span>
			<input 
				type="text" 
				bind:value={searchQuery}
				oninput={handleSearchInput}
				placeholder="Search employee..." 
				class="w-full bg-surface-container-lowest border border-outline-variant/30 text-on-surface rounded-full py-2 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm font-medium shadow-sm"
			/>
		</div>
	</div>

	<!-- Data Table -->
	<div class="bg-surface-container-lowest rounded-[24px] shadow-sm flex-1 overflow-hidden flex flex-col">
		<div class="overflow-x-auto flex-1">
			<table class="w-full text-left border-collapse min-w-[900px]">
				<thead>
					<tr class="border-b border-surface-container sticky top-0 bg-surface-container-lowest z-10">
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Request ID & Emp</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Leave Type</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Date Range & Duration</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Status</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-right">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-surface-container">
					{#each leaveRequests as req}
						<tr class="group hover:bg-surface-container-low transition-colors">
							<td class="py-4 px-6">
								<div class="flex flex-col gap-2">
                                    <span class="text-[10px] font-black tracking-widest uppercase text-on-surface-variant/70">{req.id}</span>
                                    <div class="flex items-center gap-3">
                                        <div class="w-8 h-8 rounded-full overflow-hidden bg-surface-container flex-shrink-0">
                                            <img src={req.avatar} alt={req.employeeName} class="w-full h-full object-cover" />
                                        </div>
                                        <div>
                                            <p class="text-sm font-bold text-on-surface">{req.employeeName}</p>
                                            <p class="text-[11px] font-medium text-on-surface-variant">{req.employeeId}</p>
                                        </div>
                                    </div>
								</div>
							</td>
							<td class="py-4 px-6">
								<p class="text-sm font-bold text-on-surface">{req.type}</p>
								<p class="text-[11px] font-medium text-on-surface-variant mt-1 truncate max-w-[200px]" title={req.reason}>{req.reason}</p>
							</td>
							<td class="py-4 px-6">
								<div class="flex flex-col">
									<span class="text-sm font-bold text-on-surface">{req.startDate} to {req.endDate}</span>
									<span class="text-[11px] font-medium text-on-surface-variant mt-0.5">{req.duration} Day(s)</span>
								</div>
							</td>
                            <td class="py-4 px-6">
								{#if req.status?.toLowerCase() === 'approved'}
									<span class="inline-flex items-center gap-1.5 text-green-600 dark:text-green-400 font-bold text-[11px] bg-green-500/10 px-2.5 py-1 rounded-md uppercase tracking-wider border border-green-500/20">
										<span class="w-1.5 h-1.5 rounded-full bg-green-500"></span> Approved
									</span>
								{:else if req.status?.toLowerCase() === 'rejected'}
									<span class="inline-flex items-center gap-1.5 text-red-600 dark:text-red-400 font-bold text-[11px] bg-red-500/10 px-2.5 py-1 rounded-md uppercase tracking-wider border border-red-500/20">
										<span class="w-1.5 h-1.5 rounded-full bg-red-500"></span> Rejected
									</span>
								{:else}
									<span class="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold text-[11px] bg-amber-500/10 px-2.5 py-1 rounded-md uppercase tracking-wider border border-amber-500/20">
										<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> {req.status || 'Pending'}
									</span>
								{/if}
							</td>
							<td class="py-4 px-6 text-right">
                                {#if req.status?.toLowerCase() === 'pending' || !req.status}
                                    <div class="flex items-center justify-end gap-2">
                                        <button class="px-3 py-1.5 rounded-lg bg-tertiary/10 text-tertiary hover:bg-tertiary/20 text-xs font-bold transition-colors">Approve</button>
                                        <button class="px-3 py-1.5 rounded-lg bg-error/10 text-error hover:bg-error/20 text-xs font-bold transition-colors">Reject</button>
                                    </div>
                                {:else}
                                    <button class="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors tooltip tooltip-left" data-tip="View Details">
                                        <span class="material-symbols-outlined text-[20px]">visibility</span>
                                    </button>
                                {/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		
		<!-- Pagination Footer -->
		<div class="px-6 py-4 border-t border-surface-container flex items-center justify-between bg-surface-container-lowest">
			<p class="text-xs text-on-surface-variant font-medium">Showing {startItem} to {endItem} of {meta?.total || 0} entries</p>
			<div class="flex gap-1">
				<button 
					class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high disabled:opacity-50 transition-colors" 
					disabled={currentPage <= 1}
					onclick={() => goToPage(currentPage - 1)}>
					<span class="material-symbols-outlined text-lg">chevron_left</span>
				</button>
				
				{#each Array(totalPages) as _, i}
					<button 
						class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shadow-sm transition-colors {currentPage === i + 1 ? 'bg-primary text-on-primary' : 'text-on-surface hover:bg-surface-container-high'}"
						onclick={() => goToPage(i + 1)}>
						{i + 1}
					</button>
				{/each}

				<button 
					class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high disabled:opacity-50 transition-colors"
					disabled={currentPage >= totalPages}
					onclick={() => goToPage(currentPage + 1)}>
					<span class="material-symbols-outlined text-lg">chevron_right</span>
				</button>
			</div>
		</div>
	</div>
</div>
