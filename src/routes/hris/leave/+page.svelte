<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';
	
	let { data, form }: { data: PageData; form: ActionData } = $props();
	
	let leaveRequests = $derived(data.leaveRequests || []);
	let metrics = $derived(data.metrics);
	let meta = $derived(data.meta);

	let searchQuery = $state($page.url.searchParams.get('search') || '');
	let statusFilter = $state($page.url.searchParams.get('status') || 'All');

	let searchTimer: ReturnType<typeof setTimeout>;
	let showRejectModal = $state(false);
	let selectedLeaveIdForReject = $state('');

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
	let totalPages = $derived(Math.max(1, Math.ceil((meta?.total || 0) / (meta?.per_page || 10))));
	let currentPage = $derived(meta?.current_page || 1);
	let startItem = $derived(meta?.total === 0 ? 0 : ((currentPage - 1) * (meta?.per_page || 10)) + 1);
	let endItem = $derived(Math.min(currentPage * (meta?.per_page || 10), meta?.total || 0));

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

<div class="flex flex-col h-full space-y-6">
	<!-- Header & Actions -->
	<header class="flex flex-col md:flex-row md:items-center justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-primary text-2xl">pending_actions</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Leave & Absence Management</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-xs mt-0.5">
				Pusat Persetujuan Cuti, Izin, Sakit & Monitoring Kuota Saldo Cuti Karyawan (Pengajuan diajukan via Mobile App)
			</p>
		</div>
	</header>

	<!-- Action Feedback Banner -->
	{#if form?.message}
		<div class="p-4 rounded-2xl border text-xs font-bold flex items-center gap-2.5 {form.success ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' : 'bg-rose-950/40 border-rose-500/40 text-rose-300'}">
			<span class="material-symbols-outlined text-lg">{form.success ? 'check_circle' : 'error'}</span>
			<span>{form.message}</span>
		</div>
	{/if}

	<!-- Metrics Cards -->
	<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
		<div class="bg-surface-container-lowest p-5 rounded-2xl border border-primary/20 shadow-xs relative overflow-hidden group">
			<p class="text-xs font-bold text-primary uppercase tracking-wider mb-2">Pending Approvals</p>
			<div class="flex items-end justify-between">
				<h3 class="text-3xl font-black text-primary">{metrics.pendingApprovals}</h3>
				<span class="material-symbols-outlined text-3xl text-primary/50">hourglass_top</span>
			</div>
		</div>
		<div class="bg-surface-container-lowest p-5 rounded-2xl border border-tertiary/20 shadow-xs">
			<p class="text-xs font-bold text-tertiary uppercase tracking-wider mb-2">Approved This Month</p>
			<div class="flex items-end justify-between">
				<h3 class="text-3xl font-black text-tertiary">{metrics.approvedThisMonth}</h3>
				<span class="material-symbols-outlined text-3xl text-tertiary/50">check_circle</span>
			</div>
		</div>
		<div class="bg-surface-container-lowest p-5 rounded-2xl border border-error/20 shadow-xs">
			<p class="text-xs font-bold text-error uppercase tracking-wider mb-2">Rejected This Month</p>
			<div class="flex items-end justify-between">
				<h3 class="text-3xl font-black text-error">{metrics.rejectedThisMonth}</h3>
				<span class="material-symbols-outlined text-3xl text-error/50">cancel</span>
			</div>
		</div>
		<div class="bg-surface-container-lowest p-5 rounded-2xl border border-surface-container shadow-xs">
			<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">On Leave Today</p>
			<div class="flex items-end justify-between">
				<h3 class="text-3xl font-black text-on-surface-variant">{metrics.employeesOnLeaveToday}</h3>
				<span class="material-symbols-outlined text-3xl text-on-surface-variant/50">event_busy</span>
			</div>
		</div>
	</div>

	<!-- Unified Filter & Search Bar -->
	<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 flex flex-col md:flex-row gap-4 items-center justify-between shadow-xs">
		<div class="flex items-center gap-3 w-full md:w-auto">
			<div class="flex items-center gap-2">
				<span class="material-symbols-outlined text-slate-400 text-sm">filter_alt</span>
				<span class="text-xs font-bold text-on-surface-variant">Filter Status:</span>
			</div>
			<select 
				bind:value={statusFilter} 
				onchange={handleStatusChange}
				class="bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
			>
				<option value="All">Semua Status (All)</option>
				<option value="Pending">Menunggu (Pending)</option>
				<option value="Approved">Disetujui (Approved)</option>
				<option value="Rejected">Ditolak (Rejected)</option>
			</select>
		</div>

		<div class="relative w-full md:w-80 flex-shrink-0">
			<span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
			<input 
				type="text" 
				bind:value={searchQuery}
				oninput={handleSearchInput}
				placeholder="Cari nama karyawan, jenis cuti..." 
				class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl py-2 pl-10 pr-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
			/>
		</div>
	</div>

	<!-- Data Table -->
	<div class="bg-surface-container-lowest rounded-3xl shadow-xs border border-slate-200/60 dark:border-slate-800/60 overflow-hidden flex flex-col">
		<div class="overflow-x-auto">
			<table class="w-full text-left border-collapse min-w-[900px]">
				<thead>
					<tr class="border-b border-surface-container bg-surface-container-low/40">
						<th class="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">ID & Karyawan</th>
						<th class="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Jenis Cuti</th>
						<th class="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Rentang Tanggal & Durasi</th>
						<th class="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Status</th>
						<th class="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-right">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-surface-container">
					{#each leaveRequests as req}
						<tr class="group hover:bg-surface-container-low transition-colors">
							<td class="py-4 px-6">
								<div class="flex flex-col gap-1.5">
									<span class="text-[10px] font-black tracking-widest uppercase text-on-surface-variant font-mono">{req.id}</span>
									<div class="flex items-center gap-2.5">
										<div class="w-8 h-8 rounded-full overflow-hidden bg-surface-container flex-shrink-0">
											<img src={req.avatar?.startsWith('http') ? req.avatar : `https://ui-avatars.com/api/?name=${encodeURIComponent(req.employeeName)}&background=random`} alt={req.employeeName} class="w-full h-full object-cover" />
										</div>
										<div>
											<p class="text-xs font-bold text-on-surface leading-tight">{req.employeeName}</p>
											<p class="text-[10px] font-mono text-on-surface-variant">{req.employeeId}</p>
										</div>
									</div>
								</div>
							</td>
							<td class="py-4 px-6">
								<p class="text-xs font-bold text-on-surface">{req.type}</p>
								<p class="text-[11px] text-on-surface-variant mt-0.5 truncate max-w-[220px]" title={req.reason}>{req.reason || '-'}</p>
							</td>
							<td class="py-4 px-6">
								<div class="flex flex-col">
									<span class="text-xs font-bold text-on-surface">{req.startDate} s/d {req.endDate}</span>
									<span class="text-[10px] font-semibold text-primary mt-0.5">{req.duration} Hari Kerja</span>
								</div>
							</td>
							<td class="py-4 px-6">
								{#if req.status?.toLowerCase() === 'approved'}
									<span class="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] bg-emerald-500/10 px-2.5 py-1 rounded-lg uppercase tracking-wider border border-emerald-500/20">
										<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Disetujui
									</span>
								{:else if req.status?.toLowerCase() === 'rejected'}
									<span class="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold text-[10px] bg-rose-500/10 px-2.5 py-1 rounded-lg uppercase tracking-wider border border-rose-500/20">
										<span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Ditolak
									</span>
								{:else}
									<span class="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold text-[10px] bg-amber-500/10 px-2.5 py-1 rounded-lg uppercase tracking-wider border border-amber-500/20">
										<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Menunggu
									</span>
								{/if}
							</td>
							<td class="py-4 px-6 text-right">
								{#if req.status?.toLowerCase() === 'pending' || !req.status}
									<div class="flex items-center justify-end gap-2">
										<form method="POST" action="?/approveLeave" use:enhance>
											<input type="hidden" name="leaveId" value={req.id} />
											<button 
												type="submit" 
												class="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
											>
												Approve
											</button>
										</form>
										<button 
											type="button" 
											onclick={() => { selectedLeaveIdForReject = req.id; showRejectModal = true; }}
											class="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
										>
											Reject
										</button>
									</div>
								{:else}
									<span class="text-[11px] font-medium text-slate-400">Telah Diproses</span>
								{/if}
							</td>
						</tr>
					{/each}
					{#if leaveRequests.length === 0}
						<tr>
							<td colspan="5" class="py-12 text-center text-xs text-on-surface-variant italic">
								Tidak ada data pengajuan cuti yang ditemukan.
							</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
		
		<!-- Pagination Footer -->
		<div class="px-6 py-4 border-t border-surface-container flex items-center justify-between bg-surface-container-lowest">
			<p class="text-xs text-on-surface-variant font-medium">Menampilkan {startItem} - {endItem} dari {meta?.total || 0} entri</p>
			<div class="flex gap-1">
				<button 
					class="w-8 h-8 rounded-xl flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40 transition-colors" 
					disabled={currentPage <= 1}
					onclick={() => goToPage(currentPage - 1)}>
					<span class="material-symbols-outlined text-base">chevron_left</span>
				</button>
				
				<span class="px-3 py-1 text-xs font-bold text-on-surface flex items-center">
					Halaman {currentPage} / {totalPages}
				</span>

				<button 
					class="w-8 h-8 rounded-xl flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40 transition-colors"
					disabled={currentPage >= totalPages}
					onclick={() => goToPage(currentPage + 1)}>
					<span class="material-symbols-outlined text-base">chevron_right</span>
				</button>
			</div>
		</div>
	</div>
</div>

<!-- MODAL: REJECT CUTI -->
{#if showRejectModal}
	<div class="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
		<div class="bg-surface-container-lowest border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
			<div class="flex items-center justify-between pb-3 border-b border-surface-container">
				<h3 class="font-black text-base text-rose-500">Konfirmasi Penolakan Cuti</h3>
				<button type="button" onclick={() => showRejectModal = false} class="text-slate-400 hover:text-white">
					<span class="material-symbols-outlined text-xl">close</span>
				</button>
			</div>

			<form method="POST" action="?/rejectLeave" use:enhance={() => {
				return async ({ update }) => {
					await update();
					showRejectModal = false;
				};
			}} class="space-y-4">
				<input type="hidden" name="leaveId" value={selectedLeaveIdForReject} />

				<p class="text-xs text-on-surface leading-relaxed">
					Apakah Anda yakin ingin menolak pengajuan cuti ID <strong class="font-mono text-primary">{selectedLeaveIdForReject}</strong>?
				</p>

				<div>
					<label for="rejection_reason" class="block text-xs font-bold text-on-surface-variant mb-1">Alasan Penolakan</label>
					<textarea id="rejection_reason" name="rejection_reason" rows="3" required placeholder="Contoh: Kuota jadwal operasional pengemudi sedang padat..." class="w-full bg-surface border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-rose-500/40"></textarea>
				</div>

				<div class="flex justify-end gap-2.5 pt-2 border-t border-surface-container">
					<button type="button" onclick={() => showRejectModal = false} class="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-on-surface hover:bg-surface-container transition-all">
						Batal
					</button>
					<button type="submit" class="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md transition-all">
						Tolak Pengajuan
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
