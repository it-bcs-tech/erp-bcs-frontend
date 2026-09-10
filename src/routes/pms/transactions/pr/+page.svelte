<script lang="ts">
	import { page } from '$app/stores';
	import { formatDateId, getCategoryBadge, getPRStatusBadge } from '$lib/utils/pms';
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	let { data } = $props();
	let searchQuery = $state('');
	let statusFilter = $state('');
	let selectedPrIds = $state<number[]>([]);

	let counterBadgeEl = $state<HTMLElement | null>(null);
	let isBumping = $state(false);
	let bumpTimeout: any = null;

	let filteredRequests = $derived.by(() => {
		let list = data.requests || [];
		if (statusFilter) {
			if (statusFilter === 'OPEN') {
				list = list.filter((r: any) => !r.status || r.status === 'PENDING' || r.status === 'OPEN' || r.status === 'DRAFT' || r.status === 'APPROVED');
			} else {
				list = list.filter((r: any) => r.status === statusFilter);
			}
		}
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			list = list.filter((r: any) =>
				(r.prNumber && r.prNumber.toLowerCase().includes(q)) ||
				(r.requestedBy && r.requestedBy.toLowerCase().includes(q)) ||
				(r.projectName && r.projectName.toLowerCase().includes(q)) ||
				(r.department && r.department.toLowerCase().includes(q)) ||
				(r.createdByName && r.createdByName.toLowerCase().includes(q)) ||
				(r.createdByPayroll && r.createdByPayroll.toLowerCase().includes(q))
			);
		}
		return list;
	});

	let openRequests = $derived(filteredRequests.filter((r: any) => r.status !== 'PROCESSED'));
	let isAllSelected = $derived(
		openRequests.length > 0 && openRequests.every((r: any) => selectedPrIds.includes(r.id))
	);
	let selectedCount = $derived(selectedPrIds.length);
	let selectedItemsCount = $derived(
		(data.requests || [])
			.filter((r: any) => selectedPrIds.includes(r.id))
			.reduce((sum: number, r: any) => sum + (parseInt(r.item_count) || 0), 0)
	);

	function triggerBump() {
		isBumping = true;
		if (bumpTimeout) clearTimeout(bumpTimeout);
		bumpTimeout = setTimeout(() => {
			isBumping = false;
		}, 350);
	}

	function spawnFlyingPill(pr: any, willSelect: boolean, startX: number, startY: number) {
		if (typeof document === 'undefined') return;

		let endX = window.innerWidth / 2 - 180;
		let endY = window.innerHeight - 50;

		if (counterBadgeEl) {
			const rect = counterBadgeEl.getBoundingClientRect();
			endX = rect.left + rect.width / 2;
			endY = rect.top + rect.height / 2;
		}

		const pill = document.createElement('div');
		pill.className = 'fixed top-0 left-0 pointer-events-none z-[100] flex items-center gap-1.5 px-3 py-1 bg-amber-500 text-slate-950 font-mono font-black text-xs rounded-full shadow-2xl border border-amber-300 select-none';
		pill.style.willChange = 'transform, opacity';
		pill.innerHTML = `
			<span class="material-symbols-outlined" style="font-size: 14px;">assignment</span>
			<span>${pr.prNumber || 'PR'}</span>
		`;
		document.body.appendChild(pill);

		const pillRect = pill.getBoundingClientRect();
		const halfW = pillRect.width / 2;
		const halfH = pillRect.height / 2;

		const fromX = willSelect ? (startX - halfW) : (endX - halfW);
		const fromY = willSelect ? (startY - halfH) : (endY - halfH);
		const toX = willSelect ? (endX - halfW) : (startX - halfW);
		const toY = willSelect ? (endY - halfH) : (startY - halfH);

		const midX = fromX + (toX - fromX) * 0.45 + (willSelect ? 30 : -30);
		const midY = Math.min(fromY, toY) - (willSelect ? 40 : 30);

		if (willSelect) {
			const animation = pill.animate(
				[
					{ transform: `translate3d(${fromX}px, ${fromY}px, 0) scale(1)`, opacity: 0.95 },
					{ transform: `translate3d(${midX}px, ${midY}px, 0) scale(0.95)`, opacity: 1, offset: 0.45 },
					{ transform: `translate3d(${toX}px, ${toY}px, 0) scale(0.4)`, opacity: 0.2 }
				],
				{
					duration: 550,
					easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
					fill: 'forwards'
				}
			);
			animation.onfinish = () => {
				pill.remove();
				triggerBump();
			};
		} else {
			triggerBump();
			const animation = pill.animate(
				[
					{ transform: `translate3d(${fromX}px, ${fromY}px, 0) scale(0.5)`, opacity: 1 },
					{ transform: `translate3d(${midX}px, ${midY}px, 0) scale(0.95)`, opacity: 0.9, offset: 0.5 },
					{ transform: `translate3d(${toX}px, ${toY}px, 0) scale(1)`, opacity: 0 }
				],
				{
					duration: 480,
					easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
					fill: 'forwards'
				}
			);
			animation.onfinish = () => {
				pill.remove();
			};
		}
	}

	function toggleSelectWithAnimation(pr: any, willSelect: boolean, event: MouseEvent | Event) {
		let startX = window.innerWidth / 2;
		let startY = window.innerHeight / 2;

		if ('currentTarget' in event && event.currentTarget instanceof HTMLElement) {
			const rect = event.currentTarget.getBoundingClientRect();
			startX = rect.left + Math.min(rect.width * 0.25, 200);
			startY = rect.top + rect.height / 2;
		} else if ('clientX' in event) {
			const me = event as MouseEvent;
			startX = me.clientX;
			startY = me.clientY;
		}

		if (willSelect) {
			if (!selectedPrIds.includes(pr.id)) {
				selectedPrIds = [...selectedPrIds, pr.id];
			}
		} else {
			selectedPrIds = selectedPrIds.filter(id => id !== pr.id);
		}

		spawnFlyingPill(pr, willSelect, startX, startY);
	}

	function handleRowClick(pr: any, event: MouseEvent) {
		if (pr.status === 'PROCESSED') return;
		const target = event.target as HTMLElement | null;
		if (target?.closest('button, a, input[type="checkbox"]')) {
			return;
		}
		const isCurrentlySelected = selectedPrIds.includes(pr.id);
		toggleSelectWithAnimation(pr, !isCurrentlySelected, event);
	}

	function toggleSelectAll() {
		if (isAllSelected) {
			selectedPrIds = [];
			triggerBump();
		} else {
			selectedPrIds = openRequests.map((r: any) => r.id);
			triggerBump();
		}
	}
</script>

<svelte:head>
	<title>Purchase Requests (PR) | PMS | ERP BCS</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Header -->
	<header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-amber-600 dark:text-amber-400 text-2xl">assignment</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Purchase Request (PR)</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-xs sm:text-sm mt-0.5">
				Pengajuan permintaan pengadaan barang & sparepart dari masing-masing departemen
			</p>
		</div>
		<a
			href="/pms/transactions/pr/create"
			class="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-colors"
		>
			<span class="material-symbols-outlined text-[18px]">add</span>
			<span>Buat PR Baru</span>
		</a>
	</header>

	{#if $page.url.searchParams.get('error') === 'pr_required'}
		<div class="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-3">
			<span class="material-symbols-outlined text-xl text-amber-600 dark:text-amber-400 shrink-0">info</span>
			<p class="leading-relaxed">
				<strong>Pemberitahuan:</strong> Pembuatan Purchase Order (PO) wajib dipilih dari daftar Purchase Request (PR). Silakan klik tombol <strong>"Buat PO"</strong> pada salah satu item PR di bawah ini.
			</p>
		</div>
	{/if}

	<!-- Search & Filter Bar -->
	<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
		<div class="relative flex-1 w-full max-w-md">
			<span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Cari nomor PR, nama pemohon, atau project..."
				class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl py-2 pl-10 pr-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/40"
			/>
		</div>

		<div class="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
			<select
				bind:value={statusFilter}
				class="bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/40"
			>
				<option value="">Semua Status PR</option>
				<option value="OPEN">Open (Menunggu PO)</option>
				<option value="PROCESSED">Sudah Ada PO</option>
			</select>

			<span class="text-xs font-medium text-on-surface-variant whitespace-nowrap">
				Total: <strong class="text-on-surface">{filteredRequests.length}</strong> PR
			</span>
		</div>
	</div>

	<!-- Data Table -->
	<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs">
		<div class="overflow-x-auto">
			<table class="w-full text-left text-sm min-w-[950px]">
				<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
					<tr>
						<th class="py-3.5 pl-4 pr-2 w-10 text-center">
							<input
								type="checkbox"
								checked={isAllSelected}
								onchange={toggleSelectAll}
								disabled={openRequests.length === 0}
								class="rounded border-slate-300 dark:border-slate-700 text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer disabled:opacity-30"
								title="Pilih semua PR Open"
							/>
						</th>
						<th class="py-3.5 px-3">No. PR & Tanggal</th>
						<th class="py-3.5 px-4">Project & Site</th>
						<th class="py-3.5 px-4">Kategori</th>
						<th class="py-3.5 px-4">Pemohon / Dept</th>
						<th class="py-3.5 px-4 text-center">Jumlah Item</th>
						<th class="py-3.5 px-4 text-center">Status</th>
						<th class="py-3.5 px-4">Dibuat Oleh</th>
						<th class="py-3.5 px-4 text-right">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60 font-medium text-xs">
					{#if filteredRequests.length === 0}
						<tr>
							<td colspan="9" class="py-12 text-center text-on-surface-variant">
								<span class="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-2">assignment</span>
								<p class="text-xs font-semibold">Tidak ada data Purchase Request.</p>
							</td>
						</tr>
					{:else}
						{#each filteredRequests as pr}
							{@const catBadge = getCategoryBadge(pr.category)}
							{@const stBadge = getPRStatusBadge(pr.status)}
							{@const isSelected = selectedPrIds.includes(pr.id)}

							<tr
								onclick={(e) => handleRowClick(pr, e)}
								class="transition-colors {pr.status === 'PROCESSED' ? 'cursor-default opacity-80' : 'cursor-pointer hover:bg-surface-container-high/40 select-none'} {isSelected ? 'bg-amber-500/10 dark:bg-amber-500/15' : ''}"
							>
								<td class="py-3.5 pl-4 pr-2 text-center">
									{#if pr.status === 'PROCESSED'}
										<input
											type="checkbox"
											disabled
											class="rounded border-slate-300 dark:border-slate-700 opacity-20 w-4 h-4 cursor-not-allowed"
											title="PR ini sudah selesai diproses ke PO"
										/>
									{:else}
										<input
											type="checkbox"
											checked={isSelected}
											onchange={(e) => {
												e.stopPropagation();
												toggleSelectWithAnimation(pr, !isSelected, e);
											}}
											onclick={(e) => e.stopPropagation()}
											class="rounded border-slate-300 dark:border-slate-700 text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
										/>
									{/if}
								</td>
								<td class="py-3.5 px-3">
									<span class="font-mono font-bold text-amber-700 dark:text-amber-300 text-xs">
										{pr.prNumber}
									</span>
									<p class="text-[10px] text-on-surface-variant mt-0.5">{formatDateId(pr.date)}</p>
								</td>
								<td class="py-3.5 px-4">
									<p class="font-bold text-on-surface">{pr.projectName || '-'}</p>
									<p class="text-[10px] text-on-surface-variant">{pr.siteName || 'Semua Site'}</p>
								</td>
								<td class="py-3.5 px-4">
									<span class="px-2.5 py-1 rounded-lg border text-[10px] font-bold inline-flex items-center gap-1 {catBadge.badgeClass}">
										<span class="material-symbols-outlined text-xs">{catBadge.icon}</span>
										<span>{catBadge.label}</span>
									</span>
								</td>
								<td class="py-3.5 px-4">
									<p class="font-semibold text-on-surface">{pr.requestedBy}</p>
									<p class="text-[10px] text-on-surface-variant">{pr.department || 'General'}</p>
								</td>
								<td class="py-3.5 px-4 text-center font-mono font-bold text-on-surface">
									{pr.item_count} item
								</td>
								<td class="py-3.5 px-4 text-center">
									<span class="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full border {stBadge.badgeClass}">
										<span class="material-symbols-outlined text-xs">{stBadge.icon}</span>
										<span>{stBadge.label}</span>
									</span>
								</td>
								<td class="py-3.5 px-4 text-xs text-on-surface">
									{#if pr.createdByName}
										<p class="font-bold text-on-surface leading-tight">{pr.createdByName}</p>
										{#if pr.createdByPayroll}
											<p class="text-[10px] text-on-surface-variant font-mono mt-0.5">{pr.createdByPayroll}</p>
										{/if}
									{:else if pr.createdBy}
										<span class="font-medium text-slate-700 dark:text-slate-300">{pr.createdBy}</span>
									{:else}
										<span class="text-on-surface-variant text-[11px]">-</span>
									{/if}
								</td>
								<td class="py-3.5 px-4 text-right">
									<div class="flex items-center justify-end gap-1.5">
										{#if pr.status === 'PROCESSED'}
											<span
												class="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-lg text-xs font-semibold cursor-not-allowed"
												title="PR ini sudah diproses ke Purchase Order"
											>
												<span class="material-symbols-outlined text-xs">check_circle</span>
												<span>Sudah Jadi PO</span>
											</span>
										{:else}
											<a
												href="/pms/transactions/po/create?pr_ids={pr.id}"
												onclick={(e) => e.stopPropagation()}
												class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer"
												title="Buat Purchase Order dari PR ini"
											>
												<span class="material-symbols-outlined text-xs">shopping_cart</span>
												<span>Buat PO</span>
											</a>
										{/if}
									</div>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>

	<!-- Floating Bottom Action Bar for Multi-PR to PO -->
	{#if selectedCount > 0}
		<div 
			transition:fly={{ y: 50, duration: 300, easing: cubicOut }}
			class="fixed bottom-6 inset-x-0 mx-auto w-full max-w-xl px-4 z-40 pointer-events-none"
		>
			<div class="pointer-events-auto bg-slate-900/95 dark:bg-slate-950/95 text-white backdrop-blur-md rounded-2xl p-3.5 shadow-2xl border border-amber-500/40 flex items-center justify-between gap-4">
				<div class="flex items-center gap-3 pl-2">
					<div 
						bind:this={counterBadgeEl}
						class="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-xs shrink-0 shadow-xs transition-all duration-300 ease-out {isBumping ? 'scale-135 bg-amber-400 ring-4 ring-amber-400/50 shadow-lg shadow-amber-500/50' : 'scale-100'}"
					>
						{selectedCount}
					</div>
					<div>
						<p class="text-xs font-bold leading-tight text-slate-100">
							{selectedCount} PR Terpilih
						</p>
						<p class="text-[11px] text-slate-400 mt-0.5">
							Total {selectedItemsCount} item material siap digabungkan
						</p>
					</div>
				</div>

				<div class="flex items-center gap-2 shrink-0">
					<button
						type="button"
						onclick={() => selectedPrIds = []}
						class="px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
					>
						Batal
					</button>

					<a
						href="/pms/transactions/po/create?pr_ids={selectedPrIds.join(',')}"
						class="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
					>
						<span class="material-symbols-outlined text-[18px]">shopping_cart</span>
						<span>Buat PO Gabungan</span>
					</a>
				</div>
			</div>
		</div>
	{/if}
</div>
