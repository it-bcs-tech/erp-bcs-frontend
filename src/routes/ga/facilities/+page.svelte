<script lang="ts">
	import { enhance } from '$app/forms';
	import Pagination from '$lib/components/Pagination.svelte';

	let { data } = $props();

	let searchQuery = $state('');
	let statusFilter = $state('All');
	let facilityFilter = $state('All');
	let activeTab = $state('ALL');

	let isCreateModalOpen = $state(false);
	let isApproveModalOpen = $state(false);
	let isCompleteModalOpen = $state(false);
	let isDetailModalOpen = $state(false);
	let selectedWo = $state<any>(null);
	const activeWo = $derived(data.workOrders.find((w: any) => w.id === selectedWo?.id) || selectedWo);

	function openCreateModal() {
		isCreateModalOpen = true;
	}

	function openApproveModal(wo: any) {
		selectedWo = wo;
		isApproveModalOpen = true;
	}

	function openCompleteModal(wo: any) {
		selectedWo = wo;
		isCompleteModalOpen = true;
	}

	function openDetailModal(wo: any) {
		selectedWo = wo;
		isDetailModalOpen = true;
	}

	function formatRupiah(amount: number | string | null) {
		const num = typeof amount === 'string' ? parseFloat(amount) : (amount || 0);
		return new Intl.NumberFormat('id-ID', {
			style: 'currency',
			currency: 'IDR',
			maximumFractionDigits: 0
		}).format(num);
	}

	function formatDate(d: string | null) {
		if (!d) return '-';
		return new Date(d).toLocaleDateString('id-ID', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}

	function getFacilityLabel(type: string) {
		switch (type) {
			case 'AC_HVAC': return 'AC & Pendingin Ruangan';
			case 'CIVIL_PLUMBING': return 'Sipil, Gedung & Plumbing';
			case 'LISTRIK_GENSET': return 'Kelistrikan, Lampu & Genset';
			case 'CCTV_SECURITY': return 'CCTV, Jaringan & Keamanan';
			case 'PLUMBING_AIR': return 'Plumbing & Saluran Air';
			case 'KELISTRIKAN': return 'Kelistrikan & Panel Listrik';
			case 'GENSET': return 'Genset & Power Backup';
			case 'PENGECATAN_GEDUNG': return 'Pengecatan Gedung';
			case 'PINTU_PAGAR_POOL': return 'Pintu Gerbang & Pagar Pool';
			case 'PERABOT_KANTOR': return 'Meja, Kursi & Perabot Kantor';
			case 'LAINNYA': return 'Kerusakan Fasilitas Lainnya';
			default: return type;
		}
	}

	function getUrgencyBadge(urgency: string) {
		switch (urgency) {
			case 'EMERGENCY':
				return 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800 font-black animate-pulse';
			case 'HIGH':
				return 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border border-orange-300 dark:border-orange-800 font-bold';
			case 'MEDIUM':
				return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800 font-medium';
			default:
				return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700 font-medium';
		}
	}

	function getStatusBadge(status: string) {
		switch (status) {
			case 'COMPLETED':
				return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800';
			case 'IN_PROGRESS':
				return 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800';
			case 'APPROVED':
				return 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800';
			case 'CANCELLED':
				return 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700';
			default:
				return 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800';
		}
	}

	function setTab(tab: string) {
		activeTab = tab;
		if (tab === 'ALL') {
			statusFilter = 'All';
		} else if (tab === 'PENDING') {
			statusFilter = 'PENDING';
		} else if (tab === 'IN_PROGRESS') {
			statusFilter = 'IN_PROGRESS';
		} else if (tab === 'COMPLETED') {
			statusFilter = 'COMPLETED';
		}
	}

	const filteredWorkOrders = $derived(
		data.workOrders.filter((wo: any) => {
			const q = searchQuery.toLowerCase();
			const matchQ =
				!q ||
				wo.wo_number?.toLowerCase().includes(q) ||
				wo.description?.toLowerCase().includes(q) ||
				wo.requester_name?.toLowerCase().includes(q) ||
				wo.department?.toLowerCase().includes(q) ||
				wo.technician_vendor?.toLowerCase().includes(q) ||
				wo.location?.toLowerCase().includes(q);

			const matchStatus = statusFilter === 'All' || wo.status === statusFilter;
			const matchFacility = facilityFilter === 'All' || wo.facility_type === facilityFilter;

			return matchQ && matchStatus && matchFacility;
		})
	);

	// Pagination state
	let currentPage = $state(1);
	const perPage = 10;
	const totalPages = $derived(Math.max(1, Math.ceil(filteredWorkOrders.length / perPage)));
	const paginatedWorkOrders = $derived(
		filteredWorkOrders.slice((currentPage - 1) * perPage, currentPage * perPage)
	);

	$effect(() => {
		const _ = [searchQuery, statusFilter, facilityFilter, data.workOrders];
		currentPage = 1;
	});
</script>

<svelte:head>
	<title>Facility Maintenance | General Affair | ERP BCS</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/60 dark:border-slate-800/60 pb-5">
		<div>
			<div class="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">
				<span class="material-symbols-outlined text-sm">home_repair_service</span>
				<span>General Affair • Facility & Building Maintenance</span>
			</div>
			<h1 class="text-3xl font-black text-on-surface tracking-tight">Pemeliharaan Sarana Gedung & Pool</h1>
			<p class="text-xs text-on-surface-variant mt-1">
				Sistem ticketing perbaikan sarana kantor & pool, alur persetujuan pekerjaan, penugasan teknisi/vendor, serta audit biaya perbaikan.
			</p>
		</div>

		<button
			onclick={openCreateModal}
			class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors self-start md:self-auto cursor-pointer"
		>
			<span class="material-symbols-outlined text-base">add_task</span>
			<span>+ Buat Tiket Perbaikan Baru</span>
		</button>
	</div>

	<!-- Top Metric Summary Cards -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70">
			<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Tiket Masuk</span>
			<div class="text-2xl font-black text-on-surface mt-1">
				{data.stats.totalWo} <span class="text-sm font-normal text-on-surface-variant">tiket</span>
			</div>
			<p class="text-[11px] text-on-surface-variant mt-1">
				{data.stats.completedCount} pekerjaan telah selesai
			</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-lowest border border-amber-300 dark:border-amber-900/60 bg-gradient-to-br from-amber-50/30 to-transparent">
			<span class="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Menunggu Persetujuan</span>
			<div class="text-2xl font-black text-amber-700 dark:text-amber-400 mt-1">
				{data.stats.pendingCount} <span class="text-sm font-normal text-on-surface-variant">tiket</span>
			</div>
			<p class="text-[11px] text-amber-700 font-medium mt-1">
				Perlu peninjauan & penunjukan vendor
			</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-lowest border border-blue-300 dark:border-blue-900/60 bg-gradient-to-br from-blue-50/30 to-transparent">
			<span class="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Sedang Dikerjakan</span>
			<div class="text-2xl font-black text-blue-700 dark:text-blue-400 mt-1">
				{data.stats.inProgressCount} <span class="text-sm font-normal text-on-surface-variant">tiket aktif</span>
			</div>
			<p class="text-[11px] text-blue-700 font-medium mt-1">
				Pekerjaan teknisi/vendor di lapangan
			</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70">
			<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Biaya Pemeliharaan</span>
			<div class="text-2xl font-black text-emerald-600 mt-1">
				{formatRupiah(data.stats.totalActualExpense)}
			</div>
			<p class="text-[11px] text-on-surface-variant mt-1">
				Akumulasi biaya perbaikan terselesaikan
			</p>
		</div>
	</div>

	<!-- Filter Tabs & Search Bar -->
	<div class="space-y-3">
		<!-- Quick Filter Tabs -->
		<div class="flex flex-wrap items-center gap-2 border-b border-slate-200/60 dark:border-slate-800/60 pb-3">
			<button
				onclick={() => setTab('ALL')}
				class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer {activeTab === 'ALL'
					? 'bg-blue-600 text-white shadow-xs'
					: 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'}"
			>
				Semua Tiket ({data.stats.totalWo})
			</button>
			<button
				onclick={() => setTab('PENDING')}
				class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer {activeTab === 'PENDING'
					? 'bg-amber-600 text-white shadow-xs'
					: 'bg-surface-container-low text-amber-700 hover:bg-amber-50'}"
			>
				<span>Menunggu Approval</span>
				<span class="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">{data.stats.pendingCount}</span>
			</button>
			<button
				onclick={() => setTab('IN_PROGRESS')}
				class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer {activeTab === 'IN_PROGRESS'
					? 'bg-blue-600 text-white shadow-xs'
					: 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'}"
			>
				Sedang Dikerjakan ({data.stats.inProgressCount})
			</button>
			<button
				onclick={() => setTab('COMPLETED')}
				class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer {activeTab === 'COMPLETED'
					? 'bg-emerald-600 text-white shadow-xs'
					: 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'}"
			>
				Selesai ({data.stats.completedCount})
			</button>
		</div>

		<!-- Search Box & Selectors (Borderless Standard) -->
		<div class="flex flex-col md:flex-row gap-3 items-center justify-between p-4 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 shadow-2xs">
			<div class="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-surface-container-low w-full md:w-80 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
				<span class="material-symbols-outlined text-on-surface-variant text-[18px]">search</span>
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Cari no WO, masalah, lokasi, pemohon..."
					class="bg-transparent text-xs text-on-surface border-0 outline-none w-full placeholder:text-on-surface-variant/50 focus:ring-0"
				/>
			</div>

			<div class="flex flex-wrap items-center gap-2 w-full md:w-auto">
				<select
					bind:value={facilityFilter}
					class="px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-blue-500/20 text-xs text-on-surface font-medium cursor-pointer transition-all"
				>
					<option value="All">Semua Kategori Fasilitas</option>
					<option value="AC_HVAC">AC & Pendingin Ruangan</option>
					<option value="KELISTRIKAN">Kelistrikan & Panel Listrik</option>
					<option value="PLUMBING_AIR">Plumbing & Saluran Air</option>
					<option value="GENSET">Genset & Power Backup</option>
					<option value="PINTU_PAGAR_POOL">Pintu Gerbang & Pagar Pool</option>
					<option value="PENGECATAN_GEDUNG">Pengecatan Gedung</option>
					<option value="PERABOT_KANTOR">Meja, Kursi & Perabot Kantor</option>
					<option value="CIVIL_PLUMBING">Sipil, Gedung & Plumbing</option>
					<option value="LISTRIK_GENSET">Kelistrikan, Lampu & Genset</option>
					<option value="CCTV_SECURITY">CCTV & Keamanan</option>
					<option value="LAINNYA">Lainnya</option>
				</select>

				<select
					bind:value={statusFilter}
					class="px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-blue-500/20 text-xs text-on-surface font-medium cursor-pointer transition-all"
				>
					<option value="All">Semua Status</option>
					<option value="PENDING">PENDING</option>
					<option value="APPROVED">APPROVED</option>
					<option value="IN_PROGRESS">IN_PROGRESS</option>
					<option value="COMPLETED">COMPLETED</option>
					<option value="CANCELLED">CANCELLED</option>
				</select>
			</div>
		</div>
	</div>

	<!-- Work Orders Data Table -->
	<div class="rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 shadow-2xs overflow-hidden">
		<div class="overflow-x-auto">
			<table class="w-full text-left text-xs">
				<thead class="bg-surface-container-low text-on-surface-variant uppercase text-[10px] font-bold tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
					<tr>
						<th class="py-3 px-4">No. WO & Tanggal</th>
						<th class="py-3 px-4">Sarana & Lokasi</th>
						<th class="py-3 px-4">Pemohon & Divisi</th>
						<th class="py-3 px-4">Deskripsi Masalah</th>
						<th class="py-3 px-4 text-center">Urgensi</th>
						<th class="py-3 px-4 text-center">Status</th>
						<th class="py-3 px-4">Teknisi / Vendor</th>
						<th class="py-3 px-4 text-right">Biaya (Est / Realisasi)</th>
						<th class="py-3 px-4 text-center">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
					{#each paginatedWorkOrders as wo (wo.id)}
						<tr class="hover:bg-surface-container transition-colors">
							<td class="py-3 px-4 whitespace-nowrap">
								<div class="font-mono font-bold text-on-surface">{wo.wo_number}</div>
								<div class="text-[10px] text-on-surface-variant">{wo.created_at_str}</div>
							</td>
							<td class="py-3 px-4">
								<div class="font-bold text-on-surface">{getFacilityLabel(wo.facility_type)}</div>
								<div class="text-[11px] text-on-surface-variant flex items-center gap-1 mt-0.5">
									<span class="material-symbols-outlined text-[13px]">location_on</span>
									<span>{wo.location}</span>
								</div>
							</td>
							<td class="py-3 px-4">
								<div class="font-semibold text-on-surface">{wo.requester_name}</div>
								<div class="text-[10px] text-on-surface-variant">{wo.department}</div>
							</td>
							<td class="py-3 px-4 max-w-xs">
								<p class="text-on-surface line-clamp-2">{wo.description}</p>
							</td>
							<td class="py-3 px-4 text-center whitespace-nowrap">
								<span class="px-2 py-0.5 rounded text-[10px] {getUrgencyBadge(wo.urgency)}">
									{wo.urgency}
								</span>
							</td>
							<td class="py-3 px-4 text-center whitespace-nowrap">
								<span class="px-2 py-0.5 rounded text-[10px] font-bold {getStatusBadge(wo.status)}">
									{wo.status}
								</span>
							</td>
							<td class="py-3 px-4">
								{#if wo.technician_vendor}
									<div class="font-medium text-on-surface">{wo.technician_vendor}</div>
									{#if wo.scheduled_date}
										<div class="text-[10px] text-on-surface-variant">Jadwal: {formatDate(wo.scheduled_date)}</div>
									{/if}
								{:else}
									<span class="text-on-surface-variant/60 italic text-[11px]">Belum ditugaskan</span>
								{/if}
							</td>
							<td class="py-3 px-4 text-right font-mono whitespace-nowrap">
								{#if wo.status === 'COMPLETED' || wo.actual_cost > 0}
									<div class="font-bold text-emerald-600">{formatRupiah(wo.actual_cost)}</div>
								{:else}
									<div class="font-medium text-on-surface">{formatRupiah(wo.estimated_cost)}</div>
								{/if}
								<div class="flex items-center justify-end gap-1.5 mt-1 text-[10px] font-sans">
									<span class="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 font-bold">
										{wo.manpower?.length || 0} Tukang
									</span>
									<span class="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 font-bold">
										{wo.materials?.length || 0} Material
									</span>
								</div>
							</td>
							<td class="py-3 px-4 text-center whitespace-nowrap">
								<div class="flex items-center justify-center gap-1">
									{#if wo.status === 'PENDING'}
										<button
											onclick={() => openApproveModal(wo)}
											title="Setujui & Tunjuk Teknisi"
											class="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 font-bold text-[11px] hover:bg-purple-100 transition-colors cursor-pointer"
										>
											<span class="material-symbols-outlined text-[13px]">check_circle</span>
											<span>Approve</span>
										</button>
									{:else if wo.status === 'APPROVED'}
										<form method="POST" action="?/startWorkOrder" use:enhance class="inline">
											<input type="hidden" name="id" value={wo.id} />
											<button
												type="submit"
												title="Mulai Pekerjaan"
												class="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 font-bold text-[11px] hover:bg-blue-100 transition-colors cursor-pointer"
											>
												<span class="material-symbols-outlined text-[13px]">play_arrow</span>
												<span>Mulai</span>
											</button>
										</form>
									{:else if wo.status === 'IN_PROGRESS'}
										<button
											onclick={() => openCompleteModal(wo)}
											title="Selesaikan Pekerjaan"
											class="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 font-bold text-[11px] hover:bg-emerald-100 transition-colors cursor-pointer"
										>
											<span class="material-symbols-outlined text-[13px]">task_alt</span>
											<span>Selesai</span>
										</button>
									{/if}

									<button
										onclick={() => openDetailModal(wo)}
										title="Detail Tiket"
										class="p-1.5 rounded-lg text-slate-500 hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
									>
										<span class="material-symbols-outlined text-[17px]">visibility</span>
									</button>

									<form
										method="POST"
										action="?/deleteWorkOrder"
										use:enhance={() => {
											if (!confirm(`Hapus tiket ${wo.wo_number}?`)) return ({ cancel }: any) => cancel();
										}}
										class="inline"
									>
										<input type="hidden" name="id" value={wo.id} />
										<button
											type="submit"
											title="Hapus Tiket"
											class="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
										>
											<span class="material-symbols-outlined text-[17px]">delete</span>
										</button>
									</form>
								</div>
							</td>
						</tr>
					{/each}

					{#if filteredWorkOrders.length === 0}
						<tr>
							<td colspan="9" class="py-8 text-center text-on-surface-variant text-xs">
								Tidak ada data tiket perbaikan sarana yang sesuai filter.
							</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>

		{#if filteredWorkOrders.length > 0}
			<Pagination
				currentPage={currentPage}
				totalPages={totalPages}
				totalItems={filteredWorkOrders.length}
				perPage={perPage}
				itemLabel="tiket WO"
				onPageChange={(p) => (currentPage = p)}
			/>
		{/if}
	</div>
</div>

<!-- MODAL: Buat Tiket Perbaikan Baru -->
{#if isCreateModalOpen}
	<div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
		<div class="bg-surface-container-lowest rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
			<div class="p-5 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-blue-600">add_task</span>
					<h3 class="font-bold text-base text-on-surface">Buat Tiket Perbaikan Sarana & Fasilitas</h3>
				</div>
				<button onclick={() => isCreateModalOpen = false} class="text-on-surface-variant hover:text-on-surface cursor-pointer">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<form
				method="POST"
				action="?/createWorkOrder"
				use:enhance={() => {
					return async ({ result, update }) => {
						await update();
						if (result.type === 'success') {
							isCreateModalOpen = false;
						}
					};
				}}
				class="p-6 space-y-4"
			>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label for="create_fac_type" class="block text-xs font-bold text-on-surface mb-1.5">Kategori Sarana / Fasilitas <span class="text-rose-500">*</span></label>
						<select
							id="create_fac_type"
							name="facility_type"
							required
							class="w-full px-4 py-2.5 text-xs rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-blue-500/20 text-on-surface cursor-pointer transition-all"
						>
							<option value="AC_HVAC">AC & Pendingin Ruangan</option>
							<option value="PLUMBING_AIR">Plumbing & Saluran Air</option>
							<option value="KELISTRIKAN">Kelistrikan & Panel Listrik</option>
							<option value="GENSET">Genset & Power Backup</option>
							<option value="PENGECATAN_GEDUNG">Pengecatan Gedung</option>
							<option value="PINTU_PAGAR_POOL">Pintu Gerbang & Pagar Pool</option>
							<option value="PERABOT_KANTOR">Meja, Kursi & Perabot Kantor</option>
							<option value="LAINNYA">Kerusakan Fasilitas Lainnya</option>
						</select>
					</div>
					<div>
						<label for="create_location" class="block text-xs font-bold text-on-surface mb-1.5">Lokasi Detail <span class="text-rose-500">*</span></label>
						<input
							id="create_location"
							type="text"
							name="location"
							required
							placeholder="Misal: Pool Cilegon - Ruang Istirahat Driver"
							class="w-full px-4 py-2.5 text-xs rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-blue-500/20 text-on-surface transition-all"
						/>
					</div>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label for="create_req_name" class="block text-xs font-bold text-on-surface mb-1.5">Nama Pelapor / Pemohon <span class="text-rose-500">*</span></label>
						<input
							id="create_req_name"
							type="text"
							name="requester_name"
							required
							placeholder="Nama staf yang melaporkan"
							class="w-full px-4 py-2.5 text-xs rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-blue-500/20 text-on-surface transition-all"
						/>
					</div>
					<div>
						<label for="create_dept" class="block text-xs font-bold text-on-surface mb-1.5">Departemen / Divisi <span class="text-rose-500">*</span></label>
						<select
							id="create_dept"
							name="department"
							required
							class="w-full px-4 py-2.5 text-xs rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-blue-500/20 text-on-surface cursor-pointer transition-all"
						>
							<option value="Operations">Operations / Lapangan</option>
							<option value="IT Support">IT Support & Systems</option>
							<option value="QHSE & Safety">QHSE & Safety</option>
							<option value="Security & Pool">Security & Pool</option>
							<option value="Workshop Maintenance">Workshop Maintenance</option>
							<option value="Finance & Accounting">Finance & Accounting</option>
							<option value="General Affair">General Affair</option>
							<option value="Management">Management / Direksi</option>
						</select>
					</div>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label for="create_urgency" class="block text-xs font-bold text-on-surface mb-1.5">Tingkat Urgensi Masalah <span class="text-rose-500">*</span></label>
						<select
							id="create_urgency"
							name="urgency"
							class="w-full px-4 py-2.5 text-xs rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-blue-500/20 text-on-surface cursor-pointer transition-all"
						>
							<option value="LOW">Low (Dapat ditunda)</option>
							<option value="MEDIUM" selected>Medium (Penanganan standar)</option>
							<option value="HIGH">High (Mengganggu operasional harian)</option>
							<option value="EMERGENCY">Emergency (Kritis & butuh respon cepat)</option>
						</select>
					</div>
					<div>
						<label for="create_est_cost" class="block text-xs font-bold text-on-surface mb-1.5">Estimasi Awal Biaya (Rp)</label>
						<input
							id="create_est_cost"
							type="number"
							name="estimated_cost"
							min="0"
							step="1000"
							placeholder="0"
							class="w-full px-4 py-2.5 text-xs rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-blue-500/20 text-on-surface font-mono transition-all"
						/>
					</div>
				</div>

				<div>
					<label for="create_desc" class="block text-xs font-bold text-on-surface mb-1.5">Uraian Kerusakan / Permintaan Perbaikan <span class="text-rose-500">*</span></label>
					<textarea
						id="create_desc"
						name="description"
						required
						rows="3"
						placeholder="Jelaskan secara detail gejala kerusakan atau kebutuhan perbaikan fasilitas..."
						class="w-full px-4 py-2.5 text-xs rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-blue-500/20 text-on-surface transition-all"
					></textarea>
				</div>

				<div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-200/60 dark:border-slate-800/60">
					<button
						type="button"
						onclick={() => isCreateModalOpen = false}
						class="px-4 py-2.5 rounded-xl bg-surface-container-low text-xs font-bold text-on-surface hover:bg-surface-container cursor-pointer"
					>
						Batal
					</button>
					<button
						type="submit"
						class="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
					>
						Kirim Tiket Perbaikan
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- MODAL: Approval & Penunjukan Teknisi/Vendor -->
{#if isApproveModalOpen && selectedWo}
	<div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
		<div class="bg-surface-container-lowest rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
			<div class="p-5 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-purple-600">assignment_ind</span>
					<h3 class="font-bold text-base text-on-surface">Persetujuan & Penugasan Teknisi</h3>
				</div>
				<button onclick={() => isApproveModalOpen = false} class="text-on-surface-variant hover:text-on-surface cursor-pointer">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<form
				method="POST"
				action="?/approveWorkOrder"
				use:enhance={() => {
					return async ({ result, update }) => {
						await update();
						if (result.type === 'success') {
							isApproveModalOpen = false;
						}
					};
				}}
				class="p-6 space-y-4"
			>
				<input type="hidden" name="id" value={selectedWo.id} />

				<div class="p-3 rounded-xl bg-surface-container-low text-xs space-y-1">
					<div class="font-mono font-bold text-on-surface">{selectedWo.wo_number} • {getFacilityLabel(selectedWo.facility_type)}</div>
					<p class="text-on-surface">{selectedWo.description}</p>
					<div class="text-[11px] text-on-surface-variant pt-1">
						Lokasi: {selectedWo.location} • Pemohon: {selectedWo.requester_name} ({selectedWo.department})
					</div>
				</div>

				<div>
					<label for="approve_vendor" class="block text-xs font-bold text-on-surface mb-1.5">Teknisi Internal / Nama Vendor Eksternal <span class="text-rose-500">*</span></label>
					<input
						id="approve_vendor"
						type="text"
						name="technician_vendor"
						required
						placeholder="Misal: Tim Maintenance Listrik GA / CV Sejuk Sentosa"
						class="w-full px-4 py-2.5 text-xs rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-purple-500/20 text-on-surface transition-all"
					/>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label for="approve_sched_date" class="block text-xs font-bold text-on-surface mb-1.5">Jadwal Pelaksanaan</label>
						<input
							id="approve_sched_date"
							type="date"
							name="scheduled_date"
							value={new Date().toISOString().split('T')[0]}
							class="w-full px-4 py-2.5 text-xs rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-purple-500/20 text-on-surface transition-all"
						/>
					</div>
					<div>
						<label for="approve_est_cost" class="block text-xs font-bold text-on-surface mb-1.5">Estimasi Biaya Disetujui (Rp)</label>
						<input
							id="approve_est_cost"
							type="number"
							name="estimated_cost"
							min="0"
							step="1000"
							value={selectedWo.estimated_cost}
							class="w-full px-4 py-2.5 text-xs rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-purple-500/20 text-on-surface font-mono transition-all"
						/>
					</div>
				</div>

				<div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-200/60 dark:border-slate-800/60">
					<button
						type="button"
						onclick={() => isApproveModalOpen = false}
						class="px-4 py-2.5 rounded-xl bg-surface-container-low text-xs font-bold text-on-surface hover:bg-surface-container cursor-pointer"
					>
						Batal
					</button>
					<button
						type="submit"
						class="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
					>
						Setujui & Tugaskan
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- MODAL: Penyelesaian Pekerjaan & Biaya Aktual -->
{#if isCompleteModalOpen && selectedWo}
	<div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
		<div class="bg-surface-container-lowest rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
			<div class="p-5 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-emerald-600">task_alt</span>
					<h3 class="font-bold text-base text-on-surface">Catat Penyelesaian Pekerjaan</h3>
				</div>
				<button onclick={() => isCompleteModalOpen = false} class="text-on-surface-variant hover:text-on-surface cursor-pointer">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<form
				method="POST"
				action="?/completeWorkOrder"
				use:enhance={() => {
					return async ({ result, update }) => {
						await update();
						if (result.type === 'success') {
							isCompleteModalOpen = false;
						}
					};
				}}
				class="p-6 space-y-4"
			>
				<input type="hidden" name="id" value={selectedWo.id} />

				<div class="p-3 rounded-xl bg-surface-container-low text-xs space-y-1">
					<div class="font-mono font-bold text-on-surface">{selectedWo.wo_number} • {selectedWo.technician_vendor}</div>
					<p class="text-on-surface">{selectedWo.description}</p>
					<div class="text-[11px] text-on-surface-variant">
						Estimasi Awal: {formatRupiah(selectedWo.estimated_cost)}
					</div>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label for="comp_date" class="block text-xs font-bold text-on-surface mb-1.5">Tanggal Selesai Dikerjakan <span class="text-rose-500">*</span></label>
						<input
							id="comp_date"
							type="date"
							name="completion_date"
							value={new Date().toISOString().split('T')[0]}
							required
							class="w-full px-4 py-2.5 text-xs rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-emerald-500/20 text-on-surface transition-all"
						/>
					</div>
					<div>
						<label for="comp_actual_cost" class="block text-xs font-bold text-on-surface mb-1.5">Total Biaya Aktual / Realisasi (Rp) <span class="text-rose-500">*</span></label>
						<input
							id="comp_actual_cost"
							type="number"
							name="actual_cost"
							min="0"
							step="1000"
							value={selectedWo.estimated_cost}
							required
							class="w-full px-4 py-2.5 text-xs rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-emerald-500/20 text-on-surface font-mono transition-all"
						/>
					</div>
				</div>

				<div>
					<label for="comp_notes" class="block text-xs font-bold text-on-surface mb-1.5">Catatan Hasil Pekerjaan / Servis Teknisi</label>
					<textarea
						id="comp_notes"
						name="completion_notes"
						rows="3"
						placeholder="Uraikan part yang diganti, hasil tes fungsi, garansi pengerjaan..."
						class="w-full px-4 py-2.5 text-xs rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-emerald-500/20 text-on-surface transition-all"
					></textarea>
				</div>

				<div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-200/60 dark:border-slate-800/60">
					<button
						type="button"
						onclick={() => isCompleteModalOpen = false}
						class="px-4 py-2.5 rounded-xl bg-surface-container-low text-xs font-bold text-on-surface hover:bg-surface-container cursor-pointer"
					>
						Batal
					</button>
					<button
						type="submit"
						class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
					>
						Simpan & Tutup Tiket
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- MODAL: Detail Lengkap Tiket & Rincian Manpower / Material -->
{#if isDetailModalOpen && activeWo}
	<div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
		<div class="bg-surface-container-lowest rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
			<div class="p-5 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between sticky top-0 bg-surface-container-lowest z-10">
				<div>
					<div class="text-[11px] font-mono font-bold text-blue-600 uppercase">{activeWo.wo_number}</div>
					<h3 class="font-bold text-base text-on-surface">Detail Tiket & Rincian Biaya (Manpower & Material)</h3>
				</div>
				<button onclick={() => isDetailModalOpen = false} class="text-on-surface-variant hover:text-on-surface cursor-pointer">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<div class="p-6 space-y-5 text-xs">
				<div class="grid grid-cols-2 md:grid-cols-4 gap-3 p-3.5 rounded-xl bg-surface-container-low">
					<div>
						<span class="text-on-surface-variant text-[10px] uppercase font-bold block">Sarana</span>
						<span class="font-semibold text-on-surface">{getFacilityLabel(activeWo.facility_type)}</span>
					</div>
					<div>
						<span class="text-on-surface-variant text-[10px] uppercase font-bold block">Status</span>
						<span class="px-2 py-0.5 rounded text-[10px] font-bold {getStatusBadge(activeWo.status)}">{activeWo.status}</span>
					</div>
					<div>
						<span class="text-on-surface-variant text-[10px] uppercase font-bold block">Lokasi</span>
						<span class="font-semibold text-on-surface">{activeWo.location}</span>
					</div>
					<div>
						<span class="text-on-surface-variant text-[10px] uppercase font-bold block">Total Biaya Aktual</span>
						<span class="font-mono font-black text-sm text-emerald-600">{formatRupiah(activeWo.actual_cost)}</span>
					</div>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
					<div class="p-3 rounded-xl bg-surface-container-low">
						<span class="text-on-surface-variant text-[10px] uppercase font-bold block mb-1">Uraian Perbaikan</span>
						<p class="font-semibold text-on-surface">{activeWo.description}</p>
						{#if activeWo.photo_condition}
							<div class="mt-1.5 text-[10px] text-blue-600 font-mono flex items-center gap-1">
								<span class="material-symbols-outlined text-[13px]">photo_camera</span>
								<span>Lampiran Foto: {activeWo.photo_condition}</span>
							</div>
						{/if}
					</div>
					<div class="p-3 rounded-xl bg-surface-container-low flex justify-between items-center">
						<div>
							<span class="text-on-surface-variant text-[10px] uppercase font-bold block">Pelapor / Pemohon</span>
							<span class="font-semibold text-on-surface">{activeWo.requester_name}</span>
							<span class="text-on-surface-variant block text-[11px]">{activeWo.department}</span>
						</div>
						<div class="text-right">
							<span class="text-on-surface-variant text-[10px] uppercase font-bold block">Jadwal Order</span>
							<span class="font-semibold text-on-surface">{formatDate(activeWo.scheduled_date)}</span>
						</div>
					</div>
				</div>

				<!-- SECTION 1: MANPOWER / TUKANG -->
				<div class="rounded-xl bg-surface-container-low p-4 space-y-3">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<span class="material-symbols-outlined text-blue-600 text-[18px]">engineering</span>
							<h4 class="font-bold text-xs text-on-surface uppercase tracking-wider">Rincian Tukang / Manpower ({activeWo.manpower?.length || 0})</h4>
						</div>
						<span class="font-mono font-bold text-blue-600">Subtotal: {formatRupiah(activeWo.manpower_cost)}</span>
					</div>

					{#if activeWo.manpower && activeWo.manpower.length > 0}
						<div class="overflow-x-auto rounded-lg bg-surface-container-lowest">
							<table class="w-full text-left text-[11px]">
								<thead class="bg-surface-container text-on-surface-variant uppercase text-[9px] font-bold">
									<tr>
										<th class="py-2 px-3">Nama Pekerja / Tukang</th>
										<th class="py-2 px-3 text-right">Upah Harian</th>
										<th class="py-2 px-3 text-center">Lama (Hari)</th>
										<th class="py-2 px-3 text-right">Total Upah</th>
										<th class="py-2 px-3 text-center">Hapus</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-slate-200/50 dark:divide-slate-800/50">
									{#each activeWo.manpower as mp (mp.id)}
										<tr>
											<td class="py-2 px-3 font-bold text-on-surface">{mp.worker_name}</td>
											<td class="py-2 px-3 text-right font-mono">{formatRupiah(mp.daily_wage)}</td>
											<td class="py-2 px-3 text-center font-mono">{mp.duration_days} hr</td>
											<td class="py-2 px-3 text-right font-mono font-bold text-on-surface">{formatRupiah(mp.total_cost)}</td>
											<td class="py-2 px-3 text-center">
												<form method="POST" action="?/deleteManpower" use:enhance class="inline">
													<input type="hidden" name="id" value={mp.id} />
													<input type="hidden" name="wo_id" value={activeWo.id} />
													<button type="submit" class="text-rose-500 hover:text-rose-700 cursor-pointer" title="Hapus Tukang">
														<span class="material-symbols-outlined text-[15px]">delete</span>
													</button>
												</form>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{:else}
						<p class="text-[11px] text-on-surface-variant italic">Belum ada rincian pekerja/tukang untuk WO ini.</p>
					{/if}

					<!-- Form Tambah Manpower -->
					<form method="POST" action="?/addManpower" use:enhance class="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1">
						<input type="hidden" name="wo_id" value={activeWo.id} />
						<input
							type="text"
							name="worker_name"
							required
							placeholder="Nama Tukang (mis: Ikrom)"
							class="px-3 py-2 rounded-lg bg-surface-container-lowest border-0 outline-none focus:ring-2 focus:ring-blue-500/20 text-xs text-on-surface"
						/>
						<input
							type="number"
							name="daily_wage"
							required
							min="0"
							step="5000"
							placeholder="Upah/Hari (Rp)"
							class="px-3 py-2 rounded-lg bg-surface-container-lowest border-0 outline-none focus:ring-2 focus:ring-blue-500/20 text-xs font-mono text-on-surface"
						/>
						<input
							type="number"
							name="duration_days"
							required
							min="0.5"
							step="0.5"
							value="1"
							placeholder="Hari"
							class="px-3 py-2 rounded-lg bg-surface-container-lowest border-0 outline-none focus:ring-2 focus:ring-blue-500/20 text-xs font-mono text-on-surface"
						/>
						<button type="submit" class="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer transition-colors">
							+ Tambah Tukang
						</button>
					</form>
				</div>

				<!-- SECTION 2: MATERIAL BANGUNAN -->
				<div class="rounded-xl bg-surface-container-low p-4 space-y-3">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<span class="material-symbols-outlined text-amber-600 text-[18px]">construction</span>
							<h4 class="font-bold text-xs text-on-surface uppercase tracking-wider">Rincian Material & Bahan ({activeWo.materials?.length || 0})</h4>
						</div>
						<span class="font-mono font-bold text-amber-600">Subtotal: {formatRupiah(activeWo.material_cost)}</span>
					</div>

					{#if activeWo.materials && activeWo.materials.length > 0}
						<div class="overflow-x-auto rounded-lg bg-surface-container-lowest">
							<table class="w-full text-left text-[11px]">
								<thead class="bg-surface-container text-on-surface-variant uppercase text-[9px] font-bold">
									<tr>
										<th class="py-2 px-3">Nama Material</th>
										<th class="py-2 px-3 text-right">Harga Satuan</th>
										<th class="py-2 px-3 text-center">Qty</th>
										<th class="py-2 px-3 text-right">Total Harga</th>
										<th class="py-2 px-3 text-center">Hapus</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-slate-200/50 dark:divide-slate-800/50">
									{#each activeWo.materials as mt (mt.id)}
										<tr>
											<td class="py-2 px-3 font-bold text-on-surface">{mt.material_name}</td>
											<td class="py-2 px-3 text-right font-mono">{formatRupiah(mt.unit_price)}</td>
											<td class="py-2 px-3 text-center font-mono">{mt.quantity}</td>
											<td class="py-2 px-3 text-right font-mono font-bold text-on-surface">{formatRupiah(mt.total_cost)}</td>
											<td class="py-2 px-3 text-center">
												<form method="POST" action="?/deleteMaterial" use:enhance class="inline">
													<input type="hidden" name="id" value={mt.id} />
													<input type="hidden" name="wo_id" value={activeWo.id} />
													<button type="submit" class="text-rose-500 hover:text-rose-700 cursor-pointer" title="Hapus Material">
														<span class="material-symbols-outlined text-[15px]">delete</span>
													</button>
												</form>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{:else}
						<p class="text-[11px] text-on-surface-variant italic">Belum ada rincian material bangunan untuk WO ini.</p>
					{/if}

					<!-- Form Tambah Material -->
					<form method="POST" action="?/addMaterial" use:enhance class="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1">
						<input type="hidden" name="wo_id" value={activeWo.id} />
						<input
							type="text"
							name="material_name"
							required
							placeholder="Nama Material (mis: Semen)"
							class="px-3 py-2 rounded-lg bg-surface-container-lowest border-0 outline-none focus:ring-2 focus:ring-amber-500/20 text-xs text-on-surface"
						/>
						<input
							type="number"
							name="unit_price"
							required
							min="0"
							step="1000"
							placeholder="Harga Satuan (Rp)"
							class="px-3 py-2 rounded-lg bg-surface-container-lowest border-0 outline-none focus:ring-2 focus:ring-amber-500/20 text-xs font-mono text-on-surface"
						/>
						<input
							type="number"
							name="quantity"
							required
							min="1"
							step="1"
							value="1"
							placeholder="Jumlah"
							class="px-3 py-2 rounded-lg bg-surface-container-lowest border-0 outline-none focus:ring-2 focus:ring-amber-500/20 text-xs font-mono text-on-surface"
						/>
						<button type="submit" class="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs cursor-pointer transition-colors">
							+ Tambah Material
						</button>
					</form>
				</div>

				<div class="flex justify-end pt-2">
					<button
						type="button"
						onclick={() => isDetailModalOpen = false}
						class="px-4 py-2 rounded-xl bg-surface-container-low text-xs font-bold text-on-surface hover:bg-surface-container cursor-pointer"
					>
						Tutup
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
