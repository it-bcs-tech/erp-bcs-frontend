<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { invalidateAll } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { addToast } from '$lib/stores/notifications';

	let { data, form } = $props();

	// State filter & pencarian
	let searchQuery = $state('');
	let statusFilter = $state<'ALL' | 'online' | 'idle' | 'offline'>('ALL');
	let moduleFilter = $state('ALL');
	let isAutoRefreshActive = $state(true);
	let isRefreshing = $state(false);
	let pollInterval: any = null;

	// Modal Konfirmasi Force Logout
	let selectedUserToKick = $state<any | null>(null);
	let isSubmittingKick = $state(false);

	// Hitung daftar user terfilter
	const filteredUsers = $derived(
		(data.users || []).filter((u: any) => {
			const q = searchQuery.toLowerCase().trim();
			const matchQuery =
				!q ||
				u.namaKaryawan.toLowerCase().includes(q) ||
				u.email.toLowerCase().includes(q) ||
				u.division.toLowerCase().includes(q) ||
				u.titleName.toLowerCase().includes(q) ||
				u.activityLabel.toLowerCase().includes(q) ||
				u.currentPath.toLowerCase().includes(q);

			const matchStatus = statusFilter === 'ALL' || u.status === statusFilter;
			const matchModule = moduleFilter === 'ALL' || u.moduleCode?.toLowerCase() === moduleFilter.toLowerCase();

			return matchQuery && matchStatus && matchModule;
		})
	);

	// Format waktu relatif manusiawi
	function formatRelativeTime(seconds: number): string {
		if (seconds < 15) return 'Baru saja';
		if (seconds < 60) return `${seconds} dtk lalu`;
		const mins = Math.floor(seconds / 60);
		if (mins < 60) return `${mins} mnt lalu`;
		const hours = Math.floor(mins / 60);
		if (hours < 24) return `${hours} jam lalu`;
		return `${Math.floor(hours / 24)} hari lalu`;
	}

	function formatTimestamp(isoString: string | null): string {
		if (!isoString) return '-';
		const d = new Date(isoString);
		return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
	}

	// Manual refresh
	async function handleManualRefresh() {
		isRefreshing = true;
		await invalidateAll();
		setTimeout(() => {
			isRefreshing = false;
		}, 400);
	}

	// Auto refresh loop
	onMount(() => {
		if (!browser) return;

		pollInterval = setInterval(async () => {
			if (isAutoRefreshActive && !document.hidden) {
				await invalidateAll();
			}
		}, 10000); // 10 detik

		return () => {
			if (pollInterval) clearInterval(pollInterval);
		};
	});

	// Notifikasi dari form action
	$effect(() => {
		if (form?.success) {
			addToast({
				type: 'SUCCESS',
				title: 'Berhasil',
				message: form.message || 'Sesi pengguna berhasil diperbarui.'
			});
			selectedUserToKick = null;
		} else if (form?.error) {
			addToast({
				type: 'CRITICAL',
				title: 'Gagal',
				message: form.error
			});
		}
	});
</script>

<svelte:head>
	<title>Live Monitor Pengguna Aktif — ERP BCS</title>
</svelte:head>

<div class="min-h-screen bg-surface p-4 sm:p-6 lg:p-8 space-y-6">
	<!-- Top Bar Header -->
	<div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-low p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
		<div>
			<div class="flex items-center gap-3">
				<div class="w-12 h-12 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center border border-emerald-500/20 shadow-2xs">
					<span class="material-symbols-outlined text-[28px]">monitor_heart</span>
				</div>
				<div>
					<div class="flex items-center gap-2.5">
						<h1 class="text-2xl font-black text-on-surface tracking-tight">Live Monitor Pengguna</h1>
						<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
							<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
							REAL-TIME
						</span>
					</div>
					<p class="text-xs text-on-surface-variant font-medium mt-0.5">
						Pantau siapa saja yang sedang online, halaman yang sedang dibuka, dan riwayat jejak pekerjaan terkini.
					</p>
				</div>
			</div>
		</div>

		<!-- Action Tools -->
		<div class="flex items-center gap-2.5 flex-wrap">
			<button
				onclick={() => isAutoRefreshActive = !isAutoRefreshActive}
				class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors border {isAutoRefreshActive ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' : 'bg-surface-container text-on-surface-variant border-transparent'}"
				title="Toggle Auto Refresh setiap 10 detik"
			>
				<span class="w-2 h-2 rounded-full {isAutoRefreshActive ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}"></span>
				{isAutoRefreshActive ? 'Auto-Refresh (10s)' : 'Auto-Refresh Dijeda'}
			</button>

			<button
				onclick={handleManualRefresh}
				disabled={isRefreshing}
				class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold transition-all border border-slate-200/60 dark:border-slate-700/60 shadow-2xs disabled:opacity-50"
			>
				<span class="material-symbols-outlined text-[16px] {isRefreshing ? 'animate-spin' : ''}">refresh</span>
				Segarkan
			</button>

			<a
				href="/admin/users"
				class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors shadow-2xs"
			>
				<span class="material-symbols-outlined text-[16px]">manage_accounts</span>
				User Management
			</a>
		</div>
	</div>

	<!-- KPI Summary Cards -->
	<div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
		<!-- Card 1: Online -->
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex items-center justify-between">
			<div>
				<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Sedang Online</p>
				<p class="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{data.kpi?.onlineCount ?? 0}</p>
				<p class="text-[11px] text-on-surface-variant mt-0.5">Aktif dalam &le; 2 menit</p>
			</div>
			<div class="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
				<span class="material-symbols-outlined text-2xl">wifi</span>
			</div>
		</div>

		<!-- Card 2: Idle -->
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex items-center justify-between">
			<div>
				<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Sedang Idle</p>
				<p class="text-3xl font-black text-amber-600 dark:text-amber-400 mt-1">{data.kpi?.idleCount ?? 0}</p>
				<p class="text-[11px] text-on-surface-variant mt-0.5">Tidak ada input &gt; 5 mnt</p>
			</div>
			<div class="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center border border-amber-200 dark:border-amber-800">
				<span class="material-symbols-outlined text-2xl">bedtime</span>
			</div>
		</div>

		<!-- Card 3: Offline -->
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex items-center justify-between">
			<div>
				<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Offline</p>
				<p class="text-3xl font-black text-slate-500 dark:text-slate-400 mt-1">{data.kpi?.offlineCount ?? 0}</p>
				<p class="text-[11px] text-on-surface-variant mt-0.5">Riwayat hari ini</p>
			</div>
			<div class="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center border border-slate-200 dark:border-slate-700">
				<span class="material-symbols-outlined text-2xl">wifi_off</span>
			</div>
		</div>

		<!-- Card 4: Top Module -->
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex items-center justify-between">
			<div>
				<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Modul Paling Ramai</p>
				<p class="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{data.kpi?.topModule || '-'}</p>
				<p class="text-[11px] text-on-surface-variant mt-0.5">Berdasarkan kunjungan aktif</p>
			</div>
			<div class="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
				<span class="material-symbols-outlined text-2xl">trending_up</span>
			</div>
		</div>
	</div>

	<!-- Main Content: Left Column (Table Users) & Right Column (Timeline Logs) -->
	<div class="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
		<!-- Left: Daftar Pengguna Aktif (Col 8) -->
		<div class="xl:col-span-8 space-y-4">
			<!-- Filter & Search Controls -->
			<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 flex flex-col md:flex-row gap-3 items-center justify-between">
				<!-- Search -->
				<div class="relative w-full md:w-72">
					<span class="absolute left-3.5 top-2.5 material-symbols-outlined text-on-surface-variant text-[18px]">search</span>
					<input
						type="text"
						bind:value={searchQuery}
						placeholder="Cari user, modul, aktivitas..."
						class="w-full pl-9 pr-4 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-medium"
					/>
				</div>

				<!-- Filter Status & Modul -->
				<div class="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
					<!-- Status Filter Tabs -->
					<div class="inline-flex p-1 bg-surface-container rounded-xl border border-slate-200/40 dark:border-slate-800/40">
						<button
							onclick={() => statusFilter = 'ALL'}
							class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all {statusFilter === 'ALL' ? 'bg-surface text-on-surface shadow-2xs' : 'text-on-surface-variant hover:text-on-surface'}"
						>
							Semua
						</button>
						<button
							onclick={() => statusFilter = 'online'}
							class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all {statusFilter === 'online' ? 'bg-emerald-500 text-white shadow-2xs' : 'text-on-surface-variant hover:text-on-surface'}"
						>
							<span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
							Online
						</button>
						<button
							onclick={() => statusFilter = 'idle'}
							class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all {statusFilter === 'idle' ? 'bg-amber-500 text-white shadow-2xs' : 'text-on-surface-variant hover:text-on-surface'}"
						>
							<span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
							Idle
						</button>
						<button
							onclick={() => statusFilter = 'offline'}
							class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all {statusFilter === 'offline' ? 'bg-surface text-on-surface shadow-2xs' : 'text-on-surface-variant hover:text-on-surface'}"
						>
							Offline
						</button>
					</div>

					<!-- Module Filter Select -->
					<select
						bind:value={moduleFilter}
						class="px-3 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs font-semibold text-on-surface cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
					>
						<option value="ALL">Semua Modul</option>
						<option value="portal">Portal Utama</option>
						<option value="fms">Fleet (FMS)</option>
						<option value="hris">HRIS & LMS</option>
						<option value="finance">Finance</option>
						<option value="kasir">Kasir & UJO</option>
						<option value="marketing">Marketing</option>
						<option value="pms">Procurement (PMS)</option>
						<option value="dms">DMS</option>
						<option value="qhse">QHSE</option>
						<option value="ga">General Affair</option>
						<option value="ocs">OCS</option>
						<option value="maintenance">Maintenance</option>
						<option value="admin">Admin</option>
					</select>
				</div>
			</div>

			<!-- Users Table / Cards Container -->
			<div class="bg-surface-container-low rounded-3xl border border-slate-200/60 dark:border-slate-800/60 shadow-xs overflow-hidden">
				<div class="px-6 py-4 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
					<div class="flex items-center gap-2">
						<span class="material-symbols-outlined text-[20px] text-emerald-600">groups</span>
						<h2 class="text-sm font-black text-on-surface uppercase tracking-wider">Pengguna Terdeteksi ({filteredUsers.length})</h2>
					</div>
					<span class="text-[11px] text-on-surface-variant">Update otomatis via Heartbeat</span>
				</div>

				{#if filteredUsers.length === 0}
					<div class="p-12 text-center space-y-3">
						<div class="w-14 h-14 rounded-2xl bg-surface-container text-on-surface-variant/60 flex items-center justify-center mx-auto">
							<span class="material-symbols-outlined text-[32px]">person_off</span>
						</div>
						<p class="text-sm font-bold text-on-surface">Tidak ada pengguna yang cocok</p>
						<p class="text-xs text-on-surface-variant">Coba ubah filter status atau kata kunci pencarian Anda.</p>
					</div>
				{:else}
					<div class="divide-y divide-slate-100 dark:divide-slate-800/60">
						{#each filteredUsers as user (user.userId)}
							<div class="p-5 hover:bg-surface-container/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
								<!-- Info User & Profil -->
								<div class="flex items-start gap-3.5 min-w-[240px]">
									<!-- Avatar with Live Indicator -->
									<div class="relative flex-shrink-0">
										<div class="w-11 h-11 rounded-2xl bg-gradient-to-tr from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-700 text-on-surface font-black text-base flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-2xs">
											{user.namaKaryawan?.charAt(0)?.toUpperCase() || 'U'}
										</div>
										<!-- Status Badge Indicator -->
										<span
											class="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-surface flex items-center justify-center {user.status === 'online' ? 'bg-emerald-500' : user.status === 'idle' ? 'bg-amber-500' : 'bg-slate-400'}"
											title="Status: {user.status.toUpperCase()}"
										>
											{#if user.status === 'online'}
												<span class="w-full h-full rounded-full bg-emerald-400 animate-ping opacity-75"></span>
											{/if}
										</span>
									</div>

									<!-- User Meta -->
									<div>
										<div class="flex items-center gap-2">
											<p class="text-sm font-black text-on-surface leading-tight">{user.namaKaryawan}</p>
											{#if user.isForceLogout}
												<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
													KICKED
												</span>
											{/if}
										</div>
										<p class="text-[11px] text-on-surface-variant font-mono mt-0.5">{user.email}</p>
										<div class="flex items-center gap-2 text-[10px] text-on-surface-variant mt-1.5 font-medium">
											<span class="px-2 py-0.5 rounded-md bg-surface-container font-semibold">{user.division}</span>
											<span>•</span>
											<span>{user.titleName}</span>
										</div>
									</div>
								</div>

								<!-- What User is Doing (Pekerjaan yang sedang dibuka) -->
								<div class="flex-1 min-w-[280px] bg-surface-container-lowest p-3 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 space-y-1.5">
									<div class="flex items-center justify-between gap-2">
										<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider {user.moduleCode === 'pms' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' : user.moduleCode === 'finance' ? 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300' : user.moduleCode === 'hris' ? 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300' : user.moduleCode === 'fms' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}">
											<span class="material-symbols-outlined text-[12px]">folder</span>
											{user.moduleCode}
										</span>
										<span class="text-[10px] font-bold text-on-surface-variant">
											{formatRelativeTime(user.secondsAgo)}
										</span>
									</div>

									<p class="text-xs font-bold text-on-surface line-clamp-1">
										{user.activityLabel}
									</p>

									<p class="text-[10px] text-on-surface-variant/70 font-mono truncate" title={user.currentPath}>
										{user.currentPath}
									</p>
								</div>

								<!-- Status & Actions -->
								<div class="flex items-center gap-3 justify-between md:justify-end min-w-[170px]">
									<div class="text-right hidden sm:block">
										<p class="text-xs font-bold {user.status === 'online' ? 'text-emerald-600 dark:text-emerald-400' : user.status === 'idle' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500'}">
											{user.status === 'online' ? 'Online Aktif' : user.status === 'idle' ? 'Sedang Idle' : 'Offline'}
										</p>
										<p class="text-[10px] text-on-surface-variant font-mono">
											IP: {user.ipAddress}
										</p>
									</div>

									<!-- Force Logout Button -->
									{#if !user.isForceLogout}
										<button
											onclick={() => selectedUserToKick = user}
											class="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors border border-rose-200 dark:border-rose-800 shadow-2xs"
											title="Putuskan Sesi Pengguna (Force Logout)"
										>
											<span class="material-symbols-outlined text-[18px]">logout</span>
										</button>
									{:else}
										<form method="POST" action="?/cancelForceLogout" use:enhance>
											<input type="hidden" name="targetUserId" value={user.userId} />
											<button
												type="submit"
												class="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-[10px] font-bold transition-colors"
												title="Batalkan Status Kick"
											>
												Pulihkan
											</button>
										</form>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<!-- Right: Live Activity Logs Timeline (Col 4) -->
		<div class="xl:col-span-4 space-y-4">
			<div class="bg-surface-container-low rounded-3xl border border-slate-200/60 dark:border-slate-800/60 shadow-xs overflow-hidden">
				<div class="px-5 py-4 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
					<div class="flex items-center gap-2">
						<span class="material-symbols-outlined text-[20px] text-indigo-600">history</span>
						<h2 class="text-sm font-black text-on-surface uppercase tracking-wider">Timeline Aktivitas</h2>
					</div>
					<span class="text-[10px] font-bold text-on-surface-variant">Real-time Feed</span>
				</div>

				<div class="p-5 max-h-[700px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/40">
					{#if !data.activityLogs || data.activityLogs.length === 0}
						<div class="py-8 text-center text-xs text-on-surface-variant">
							Belum ada riwayat aktivitas tercatat.
						</div>
					{:else}
						{#each data.activityLogs as log (log.id)}
							<div class="py-3.5 first:pt-0 last:pb-0 flex items-start gap-3">
								<div class="w-8 h-8 rounded-xl bg-surface-container text-on-surface font-black text-xs flex items-center justify-center flex-shrink-0 mt-0.5 border border-slate-200/50 dark:border-slate-700/50">
									{log.namaKaryawan?.charAt(0)?.toUpperCase() || 'U'}
								</div>

								<div class="flex-1 min-w-0">
									<div class="flex items-center justify-between gap-1">
										<p class="text-xs font-bold text-on-surface truncate">{log.namaKaryawan}</p>
										<span class="text-[9px] font-mono text-on-surface-variant flex-shrink-0">
											{formatTimestamp(log.createdAt)}
										</span>
									</div>

									<p class="text-xs text-on-surface-variant font-medium mt-0.5 leading-snug">
										{log.activityLabel}
									</p>

									<div class="flex items-center gap-2 mt-1">
										<span class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant uppercase">
											{log.moduleCode}
										</span>
										<span class="text-[9px] font-mono text-on-surface-variant/60 truncate" title={log.path}>
											{log.path}
										</span>
									</div>
								</div>
							</div>
						{/each}
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>

<!-- Modal Konfirmasi Force Logout -->
{#if selectedUserToKick}
	<div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
		<div class="bg-surface-container-lowest max-w-md w-full rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
			<div class="flex items-center gap-3 text-rose-600">
				<div class="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center border border-rose-200 dark:border-rose-800">
					<span class="material-symbols-outlined text-2xl">logout</span>
				</div>
				<div>
					<h3 class="text-lg font-black text-on-surface">Putuskan Sesi Pengguna?</h3>
					<p class="text-xs text-on-surface-variant">Konfirmasi Force Logout</p>
				</div>
			</div>

			<p class="text-xs text-on-surface-variant leading-relaxed">
				Apakah Anda yakin ingin memutuskan sesi akun <strong class="text-on-surface">{selectedUserToKick.namaKaryawan}</strong> (<span class="font-mono">{selectedUserToKick.email}</span>)?
				Pengguna akan otomatis dikeluarkan dari sistem dan diarahkan ke halaman login pada ping berikutnya.
			</p>

			<div class="flex items-center justify-end gap-2.5 pt-2">
				<button
					type="button"
					onclick={() => selectedUserToKick = null}
					class="px-4 py-2 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-container transition-colors"
				>
					Batal
				</button>

				<form method="POST" action="?/forceLogout" use:enhance={() => {
					isSubmittingKick = true;
					return async ({ update }) => {
						isSubmittingKick = false;
						await update();
					};
				}}>
					<input type="hidden" name="targetUserId" value={selectedUserToKick.userId} />
					<button
						type="submit"
						disabled={isSubmittingKick}
						class="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-sm disabled:opacity-50 inline-flex items-center gap-1.5"
					>
						{#if isSubmittingKick}
							<span class="material-symbols-outlined text-sm animate-spin">progress_activity</span>
							Memproses...
						{:else}
							Ya, Putuskan Sesi
						{/if}
					</button>
				</form>
			</div>
		</div>
	</div>
{/if}
