<script lang="ts">
	import { enhance } from '$app/forms';
	import Pagination from '$lib/components/Pagination.svelte';

	let { data, form } = $props();

	const visitors = $derived(data.visitors || []);
	const stats = $derived(
		data.stats || {
			total_visitors: 0,
			active_visitors: 0,
			rating_puas: 0,
			rating_cukup: 0,
			rating_kurang: 0,
			total_rated: 0,
			avg_rating: 0
		}
	);
	const employees = $derived(data.employees || []);

	// Helper: Jam Indonesia 24 Jam (Asia/Jakarta - WIB)
	const HOURS_24 = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
	const MINUTES_60 = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

	function getWibNow() {
		const now = new Date();
		const parts = new Intl.DateTimeFormat('en-CA', {
			timeZone: 'Asia/Jakarta',
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			hour12: false
		}).formatToParts(now);
		const map: Record<string, string> = {};
		for (const p of parts) map[p.type] = p.value;
		const hour = map.hour === '24' ? '00' : map.hour;
		const minute = map.minute || '00';
		return {
			date: `${map.year}-${map.month}-${map.day}`,
			hour,
			minute,
			clock: `${hour}:${minute}`
		};
	}

	function formatIndoDate(dateStr: string | null) {
		if (!dateStr) return '-';
		const d = new Date(`${dateStr}T00:00:00`);
		if (isNaN(d.getTime())) return dateStr;
		return d.toLocaleDateString('id-ID', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
	}

	// Filters & Pagination
	let searchQuery = $state('');
	let statusFilter = $state('ALL');
	let ratingFilter = $state('ALL');
	let currentPage = $state(1);
	let pageSize = $state(15);

	const filteredVisitors = $derived(
		visitors.filter((v: any) => {
			if (statusFilter !== 'ALL' && v.status !== statusFilter) return false;
			if (ratingFilter !== 'ALL' && String(v.survey_rating || '') !== ratingFilter) return false;
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase();
				const match =
					(v.visitor_name || '').toLowerCase().includes(q) ||
					(v.company || '').toLowerCase().includes(q) ||
					(v.purpose || '').toLowerCase().includes(q) ||
					(v.host_name || '').toLowerCase().includes(q) ||
					(v.host_department || '').toLowerCase().includes(q) ||
					(v.badge_number || '').toLowerCase().includes(q);
				if (!match) return false;
			}
			return true;
		})
	);

	$effect(() => {
		searchQuery;
		statusFilter;
		ratingFilter;
		currentPage = 1;
	});

	const paginatedVisitors = $derived(
		filteredVisitors.slice((currentPage - 1) * pageSize, currentPage * pageSize)
	);

	// Check-In Modal State (with 24-hour WIB Date & Clock)
	let showCheckInModal = $state(false);
	let selectedEmpNik = $state('');
	let hostNameInput = $state('');
	let hostDeptInput = $state('GENERAL AFFAIRS');
	let checkInDate = $state('');
	let checkInHour = $state('08');
	let checkInMinute = $state('00');

	function openCheckInModal() {
		const wib = getWibNow();
		checkInDate = wib.date;
		checkInHour = wib.hour;
		checkInMinute = wib.minute;
		selectedEmpNik = '';
		hostNameInput = '';
		hostDeptInput = 'GENERAL AFFAIRS';
		showCheckInModal = true;
	}

	function setCheckInToNowWib() {
		const wib = getWibNow();
		checkInDate = wib.date;
		checkInHour = wib.hour;
		checkInMinute = wib.minute;
	}

	function handleEmployeeChange(nik: string) {
		selectedEmpNik = nik;
		const emp = employees.find((e: any) => e.nik === nik);
		if (emp) {
			hostNameInput = emp.name;
			hostDeptInput = emp.department || 'GENERAL AFFAIRS';
		}
	}

	// Check-Out & Edit Waktu/Survei Modal State (with 24-hour WIB Date & Clock)
	let selectedVisitorForCheckout = $state<any>(null);
	let selectedSurveyRating = $state(3);
	let editInDate = $state('');
	let editInHour = $state('08');
	let editInMinute = $state('00');
	let editOutDate = $state('');
	let editOutHour = $state('17');
	let editOutMinute = $state('00');

	function openCheckoutModal(v: any) {
		const wib = getWibNow();
		selectedVisitorForCheckout = v;
		selectedSurveyRating = v.survey_rating || 3;

		editInDate = v.check_in_date || wib.date;
		const inParts = (v.check_in_clock || '08:00').split(':');
		editInHour = (inParts[0] || '08').padStart(2, '0');
		editInMinute = (inParts[1] || '00').padStart(2, '0');

		if (v.check_out_date && v.check_out_clock) {
			editOutDate = v.check_out_date;
			const outParts = v.check_out_clock.split(':');
			editOutHour = (outParts[0] || wib.hour).padStart(2, '0');
			editOutMinute = (outParts[1] || wib.minute).padStart(2, '0');
		} else {
			editOutDate = wib.date;
			editOutHour = wib.hour;
			editOutMinute = wib.minute;
		}
	}

	function setCheckOutToNowWib() {
		const wib = getWibNow();
		editOutDate = wib.date;
		editOutHour = wib.hour;
		editOutMinute = wib.minute;
	}

	function getSurveyBadge(rating: number | null) {
		if (rating === 3) {
			return {
				label: 'Puas (3/3)',
				icon: 'sentiment_very_satisfied',
				cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
			};
		}
		if (rating === 2) {
			return {
				label: 'Cukup (2/3)',
				icon: 'sentiment_neutral',
				cls: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
			};
		}
		if (rating === 1) {
			return {
				label: 'Kurang (1/3)',
				icon: 'sentiment_dissatisfied',
				cls: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
			};
		}
		return {
			label: 'Belum Isi Survei',
			icon: 'pending',
			cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
		};
	}

	const satisfactionPercent = $derived(
		stats.total_rated > 0
			? Math.round(
					((stats.rating_puas * 3 + stats.rating_cukup * 2 + stats.rating_kurang * 1) /
						(stats.total_rated * 3)) *
						100
				)
			: 0
	);
</script>

<svelte:head>
	<title>Visitor & Guestbook (Buku Tamu) | GA ERP BCS</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/60 dark:border-slate-800/60 pb-5">
		<div>
			<div class="flex items-center gap-2 text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest mb-1">
				<span class="material-symbols-outlined text-sm">badge</span>
				<span>General Affair • Front Desk & Receptionist</span>
			</div>
			<h1 class="text-2xl font-black text-on-surface tracking-tight">Visitor & Guestbook (Buku Tamu)</h1>
			<p class="text-xs text-on-surface-variant mt-1">
				Registrasi tamu perusahaan, penukaran kartu identitas tamu (Visitor Badge), karyawan yang ditemui, serta evaluasi kepuasan layanan resepsionis.
			</p>
		</div>

		<div class="flex items-center gap-2.5">
			<button
				type="button"
				onclick={openCheckInModal}
				class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
			>
				<span class="material-symbols-outlined text-base">person_add</span>
				<span>+ Check-In Tamu Baru</span>
			</button>
		</div>
	</div>

	{#if form?.message}
		<div class="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
			<span class="material-symbols-outlined text-base">check_circle</span>
			<span>{form.message}</span>
		</div>
	{/if}
	{#if form?.error}
		<div class="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
			<span class="material-symbols-outlined text-base">error</span>
			<span>{form.error}</span>
		</div>
	{/if}

	<!-- KPI Cards -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<div class="p-4 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 flex flex-col justify-between">
			<div class="flex items-center justify-between mb-2">
				<span class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Total Kunjungan Tamu</span>
				<div class="w-8 h-8 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-lg">groups</span>
				</div>
			</div>
			<div class="text-2xl font-black text-on-surface">{stats.total_visitors} <span class="text-xs font-normal text-on-surface-variant">Tamu</span></div>
			<p class="text-[11px] text-on-surface-variant mt-2">Riwayat buku tamu terverifikasi</p>
		</div>

		<div class="p-4 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 flex flex-col justify-between">
			<div class="flex items-center justify-between mb-2">
				<span class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Tamu Aktif Di Kantor</span>
				<div class="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-lg">badge</span>
				</div>
			</div>
			<div class="text-2xl font-black text-on-surface">{stats.active_visitors} <span class="text-xs font-normal text-on-surface-variant">Sedang Berkunjung</span></div>
			<p class="text-[11px] text-on-surface-variant mt-2">Klik "Catat Keluar & Survei" saat tamu pulang</p>
		</div>

		<div class="p-4 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 flex flex-col justify-between">
			<div class="flex items-center justify-between mb-2">
				<span class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Indeks Kepuasan Layanan</span>
				<div class="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-lg">sentiment_very_satisfied</span>
				</div>
			</div>
			<div class="text-2xl font-black text-emerald-600 dark:text-emerald-400">
				{satisfactionPercent}% <span class="text-xs font-bold text-on-surface-variant">({stats.avg_rating || 0}/3.00)</span>
			</div>
			<p class="text-[11px] text-on-surface-variant mt-2">Berdasarkan {stats.total_rated} responden survei tamu</p>
		</div>

		<div class="p-4 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 flex flex-col justify-between">
			<div class="flex items-center justify-between mb-2">
				<span class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Distribusi Survei Tamu</span>
				<div class="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-lg">bar_chart</span>
				</div>
			</div>
			<div class="flex items-center gap-2 text-xs font-bold mt-1">
				<span class="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">Puas: {stats.rating_puas}</span>
				<span class="px-2 py-1 rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">Cukup: {stats.rating_cukup}</span>
				<span class="px-2 py-1 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">Kurang: {stats.rating_kurang}</span>
			</div>
			<p class="text-[11px] text-on-surface-variant mt-2">Skala Penilaian Resepsionis (1 s/d 3)</p>
		</div>
	</div>

	<!-- Filter Bar -->
	<div class="p-4 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
		<div class="relative flex-1">
			<span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">search</span>
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Cari nama tamu, instansi/perusahaan, keperluan, karyawan yang ditemui, atau nomor kartu..."
				class="w-full pl-10 pr-4 py-2 rounded-xl bg-surface-container-low text-xs text-on-surface border-0 outline-none focus:ring-2 focus:ring-cyan-500/40"
			/>
		</div>

		<div class="flex flex-wrap items-center gap-2.5">
			<select
				bind:value={statusFilter}
				class="px-3.5 py-2 rounded-xl bg-surface-container-low text-xs font-semibold text-on-surface border-0 outline-none focus:ring-2 focus:ring-cyan-500/40"
			>
				<option value="ALL">Semua Status Kunjungan</option>
				<option value="CHECKED_IN">Sedang Berkunjung (Check-In)</option>
				<option value="CHECKED_OUT">Sudah Selesai (Check-Out)</option>
			</select>

			<select
				bind:value={ratingFilter}
				class="px-3.5 py-2 rounded-xl bg-surface-container-low text-xs font-semibold text-on-surface border-0 outline-none focus:ring-2 focus:ring-cyan-500/40"
			>
				<option value="ALL">Semua Penilaian Survei</option>
				<option value="3">Puas (Skor 3)</option>
				<option value="2">Cukup (Skor 2)</option>
				<option value="1">Kurang (Skor 1)</option>
			</select>
		</div>
	</div>

	<!-- Guestbook Table -->
	<div class="rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 overflow-hidden shadow-2xs">
		<div class="overflow-x-auto">
			<table class="w-full text-left text-xs">
				<thead class="bg-surface-container-low text-on-surface-variant uppercase text-[10px] font-bold tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
					<tr>
						<th class="py-3.5 px-4">Tamu & Instansi</th>
						<th class="py-3.5 px-4">Kontak & Alamat</th>
						<th class="py-3.5 px-4">No. Kartu</th>
						<th class="py-3.5 px-4">Karyawan Ditemui (Host)</th>
						<th class="py-3.5 px-4">Keperluan</th>
						<th class="py-3.5 px-4">Waktu Kunjungan</th>
						<th class="py-3.5 px-4 text-center">Survei Layanan</th>
						<th class="py-3.5 px-4 text-center">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
					{#if paginatedVisitors.length === 0}
						<tr>
							<td colspan="8" class="py-12 text-center text-on-surface-variant">
								<span class="material-symbols-outlined text-4xl text-slate-400 mb-2 block">menu_book</span>
								<p class="font-bold text-on-surface">Tidak ada data buku tamu yang sesuai filter</p>
							</td>
						</tr>
					{:else}
						{#each paginatedVisitors as v (v.id)}
							{@const survey = getSurveyBadge(v.survey_rating)}
							<tr class="hover:bg-surface-container/60 transition-colors">
								<td class="py-3 px-4">
									<div class="font-bold text-on-surface">{v.visitor_name}</div>
									<div class="text-[11px] font-semibold text-cyan-700 dark:text-cyan-400">{v.company || '-'}</div>
								</td>
								<td class="py-3 px-4">
									<div class="font-mono text-[11px] text-on-surface">{v.phone || '-'}</div>
									<div class="text-[10px] text-on-surface-variant max-w-[180px] truncate" title={v.address}>{v.address || '-'}</div>
								</td>
								<td class="py-3 px-4">
									<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono text-xs font-bold bg-surface-container-high text-on-surface border border-slate-200 dark:border-slate-700">
										<span class="material-symbols-outlined text-xs text-cyan-600">badge</span>
										#{v.badge_number || '-'}
									</span>
								</td>
								<td class="py-3 px-4">
									<div class="font-semibold text-on-surface">{v.host_name || '-'}</div>
									<div class="text-[10px] text-on-surface-variant">
										{v.host_department || 'UMUM'}
										{#if v.host_nik}
											<span class="font-mono">({v.host_nik})</span>
										{/if}
									</div>
								</td>
								<td class="py-3 px-4 max-w-xs">
									<div class="font-medium text-on-surface line-clamp-2">{v.purpose || '-'}</div>
								</td>
								<td class="py-3 px-4 whitespace-nowrap">
									<div class="flex items-center gap-1.5 text-[11px]">
										<span class="w-2 h-2 rounded-full bg-emerald-500"></span>
										<span class="text-on-surface font-medium">
											Masuk: <strong class="font-mono">{formatIndoDate(v.check_in_date)} • {v.check_in_clock || '00:00'} WIB</strong>
										</span>
									</div>
									{#if v.status === 'CHECKED_OUT' && v.check_out_date}
										<div class="flex items-center gap-1.5 text-[11px] mt-1 text-on-surface-variant">
											<span class="w-2 h-2 rounded-full bg-slate-400"></span>
											<span>
												Keluar: <strong class="font-mono text-on-surface">{formatIndoDate(v.check_out_date)} • {v.check_out_clock || '00:00'} WIB</strong>
											</span>
										</div>
									{:else}
										<div class="mt-1">
											<button
												type="button"
												onclick={() => openCheckoutModal(v)}
												class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 hover:bg-amber-100 cursor-pointer"
											>
												<span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
												Sedang Di Kantor (Klik Catat Keluar)
											</button>
										</div>
									{/if}
								</td>
								<td class="py-3 px-4 text-center whitespace-nowrap">
									<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold {survey.cls}">
										<span class="material-symbols-outlined text-sm">{survey.icon}</span>
										<span>{survey.label}</span>
									</span>
								</td>
								<td class="py-3 px-4 text-center whitespace-nowrap">
									<div class="inline-flex items-center gap-1.5">
										{#if v.status === 'CHECKED_IN'}
											<button
												type="button"
												onclick={() => openCheckoutModal(v)}
												class="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1"
											>
												<span class="material-symbols-outlined text-xs">logout</span>
												<span>Catat Keluar & Survei</span>
											</button>
										{:else}
											<button
												type="button"
												onclick={() => openCheckoutModal(v)}
												class="px-2.5 py-1 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1"
												title="Edit Jam Masuk/Keluar & Skor Survei"
											>
												<span class="material-symbols-outlined text-xs text-cyan-600">schedule</span>
												<span>Edit Jam & Survei</span>
											</button>
										{/if}

										<form method="POST" action="?/deleteVisitor" use:enhance>
											<input type="hidden" name="id" value={v.id} />
											<button
												type="submit"
												onclick={(e) => {
													if (!confirm(`Hapus riwayat kunjungan tamu ${v.visitor_name}?`)) e.preventDefault();
												}}
												class="p-1.5 rounded-lg bg-surface-container-high hover:bg-rose-50 text-on-surface-variant hover:text-rose-600 transition-colors cursor-pointer"
												title="Hapus"
											>
												<span class="material-symbols-outlined text-sm">delete</span>
											</button>
										</form>
									</div>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>

		<div class="p-4 border-t border-slate-200/60 dark:border-slate-800/60">
			<Pagination
				totalItems={filteredVisitors.length}
				bind:currentPage
				bind:pageSize
			/>
		</div>
	</div>
</div>

<!-- Modal Check-In Tamu Baru -->
{#if showCheckInModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
		<div class="bg-surface-container-lowest rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-xl overflow-hidden my-8">
			<div class="px-6 py-4 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
				<div class="flex items-center gap-2.5">
					<div class="w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 flex items-center justify-center">
						<span class="material-symbols-outlined text-xl">person_add</span>
					</div>
					<div>
						<h3 class="text-sm font-black text-on-surface">Registrasi Check-In Tamu Baru</h3>
						<p class="text-[11px] text-on-surface-variant">Catat identitas tamu dan kartu visitor yang diberikan</p>
					</div>
				</div>
				<button
					type="button"
					onclick={() => (showCheckInModal = false)}
					class="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container cursor-pointer"
				>
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>

			<form
				method="POST"
				action="?/checkIn"
				use:enhance={() => {
					return async ({ result, update }) => {
						await update();
						if (result.type === 'success') {
							showCheckInModal = false;
						}
					};
				}}
				class="p-6 space-y-4"
			>
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div>
						<label class="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">Tanggal Masuk *</label>
						<input
							type="date"
							name="check_in_date"
							bind:value={checkInDate}
							required
							class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-xs font-mono text-on-surface border-0 outline-none focus:ring-2 focus:ring-cyan-500/40"
						/>
					</div>
					<div>
						<div class="flex items-center justify-between mb-1">
							<label class="block text-[11px] font-bold text-on-surface-variant uppercase">Jam Masuk *</label>
							<button
								type="button"
								onclick={setCheckInToNowWib}
								class="text-[10px] font-bold text-cyan-600 hover:underline cursor-pointer"
							>
								Jam Sekarang
							</button>
						</div>
						<input type="hidden" name="check_in_clock" value={`${checkInHour}:${checkInMinute}`} />
						<div class="flex items-center gap-1.5">
							<select
								bind:value={checkInHour}
								class="flex-1 px-3 py-2.5 rounded-xl bg-surface-container-low text-xs font-mono font-bold text-on-surface border-0 outline-none focus:ring-2 focus:ring-cyan-500/40 cursor-pointer"
							>
								{#each HOURS_24 as h}
									<option value={h}>{h}</option>
								{/each}
							</select>
							<span class="font-mono font-black text-sm text-on-surface">:</span>
							<select
								bind:value={checkInMinute}
								class="flex-1 px-3 py-2.5 rounded-xl bg-surface-container-low text-xs font-mono font-bold text-on-surface border-0 outline-none focus:ring-2 focus:ring-cyan-500/40 cursor-pointer"
							>
								{#each MINUTES_60 as m}
									<option value={m}>{m}</option>
								{/each}
							</select>
						</div>
					</div>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div>
						<label class="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">Nama Lengkap Tamu *</label>
						<input
							type="text"
							name="visitor_name"
							required
							placeholder="Contoh: Budi Santoso"
							class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-xs text-on-surface border-0 outline-none focus:ring-2 focus:ring-cyan-500/40"
						/>
					</div>
					<div>
						<label class="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">Perusahaan / Instansi *</label>
						<input
							type="text"
							name="company"
							required
							placeholder="Contoh: PT Krakatau Posco"
							class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-xs text-on-surface border-0 outline-none focus:ring-2 focus:ring-cyan-500/40"
						/>
					</div>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
					<div>
						<label class="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">No. Telepon / HP</label>
						<input
							type="text"
							name="phone"
							placeholder="0812xxxx"
							class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-xs text-on-surface border-0 outline-none focus:ring-2 focus:ring-cyan-500/40"
						/>
					</div>
					<div>
						<label class="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">No. Kartu Tamu (Badge)</label>
						<input
							type="text"
							name="badge_number"
							placeholder="Contoh: 05"
							class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-xs text-on-surface border-0 outline-none focus:ring-2 focus:ring-cyan-500/40"
						/>
					</div>
					<div>
						<label class="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">Kota / Alamat</label>
						<input
							type="text"
							name="address"
							placeholder="Cilegon / Jakarta"
							class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-xs text-on-surface border-0 outline-none focus:ring-2 focus:ring-cyan-500/40"
						/>
					</div>
				</div>

				<div class="pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
					<label class="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">Pilih Karyawan yang Ditemui (Opsional - Auto Fill)</label>
					<select
						value={selectedEmpNik}
						onchange={(e) => handleEmployeeChange((e.currentTarget as HTMLSelectElement).value)}
						class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-xs text-on-surface border-0 outline-none focus:ring-2 focus:ring-cyan-500/40 mb-3"
					>
						<option value="">-- Pilih dari Master Karyawan atau ketik manual di bawah --</option>
						{#each employees as emp}
							<option value={emp.nik}>{emp.name} ({emp.nik}) — {emp.department}</option>
						{/each}
					</select>

					<input type="hidden" name="host_nik" value={selectedEmpNik} />

					<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div>
							<label class="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">Nama Karyawan (Host) *</label>
							<input
								type="text"
								name="host_name"
								bind:value={hostNameInput}
								required
								placeholder="Nama pegawai yang ditemui"
								class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-xs text-on-surface border-0 outline-none focus:ring-2 focus:ring-cyan-500/40"
							/>
						</div>
						<div>
							<label class="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">Departemen Tujuan *</label>
							<input
								type="text"
								name="host_department"
								bind:value={hostDeptInput}
								required
								placeholder="Contoh: PROCUREMENT / HR & GA"
								class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-xs text-on-surface border-0 outline-none focus:ring-2 focus:ring-cyan-500/40"
							/>
						</div>
					</div>
				</div>

				<div>
					<label class="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">Keperluan Kunjungan *</label>
					<textarea
						name="purpose"
						rows="2"
						required
						placeholder="Contoh: Meeting penawaran vendor / pengiriman dokumen invoice"
						class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-xs text-on-surface border-0 outline-none focus:ring-2 focus:ring-cyan-500/40"
					></textarea>
				</div>

				<div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-200/60 dark:border-slate-800/60">
					<button
						type="button"
						onclick={() => (showCheckInModal = false)}
						class="px-4 py-2 rounded-xl bg-surface-container-high text-xs font-bold text-on-surface-variant hover:text-on-surface cursor-pointer"
					>
						Batal
					</button>
					<button
						type="submit"
						class="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold shadow-xs cursor-pointer"
					>
						Simpan Check-In
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Modal Check-Out / Edit Waktu & Survei Kepuasan Tamu -->
{#if selectedVisitorForCheckout}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
		<div class="bg-surface-container-lowest rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-lg overflow-hidden my-8">
			<div class="px-6 py-4 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
				<div class="flex items-center gap-2.5">
					<div class="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
						<span class="material-symbols-outlined text-xl">schedule</span>
					</div>
					<div>
						<h3 class="text-sm font-black text-on-surface">
							{selectedVisitorForCheckout.status === 'CHECKED_IN' ? 'Check-Out & Survei Tamu' : 'Edit Waktu & Survei Tamu'}
						</h3>
						<p class="text-[11px] text-on-surface-variant">{selectedVisitorForCheckout.visitor_name} ({selectedVisitorForCheckout.company})</p>
					</div>
				</div>
				<button
					type="button"
					onclick={() => (selectedVisitorForCheckout = null)}
					class="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container cursor-pointer"
				>
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>

			<form
				method="POST"
				action="?/checkOut"
				use:enhance={() => {
					return async ({ result, update }) => {
						await update();
						if (result.type === 'success') {
							selectedVisitorForCheckout = null;
						}
					};
				}}
				class="p-6 space-y-4"
			>
				<input type="hidden" name="id" value={selectedVisitorForCheckout.id} />
				<input type="hidden" name="survey_rating" value={selectedSurveyRating} />
				<input type="hidden" name="check_in_clock" value={`${editInHour}:${editInMinute}`} />
				<input type="hidden" name="check_out_clock" value={`${editOutHour}:${editOutMinute}`} />

				<div class="text-xs text-on-surface-variant bg-surface-container-low p-3.5 rounded-xl space-y-1">
					<div><strong class="text-on-surface">Karyawan Ditemui:</strong> {selectedVisitorForCheckout.host_name} ({selectedVisitorForCheckout.host_department})</div>
					<div><strong class="text-on-surface">Keperluan:</strong> {selectedVisitorForCheckout.purpose}</div>
					<div><strong class="text-on-surface">Kartu Tamu:</strong> #{selectedVisitorForCheckout.badge_number}</div>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div>
						<label class="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">Tanggal Masuk</label>
						<input
							type="date"
							name="check_in_date"
							bind:value={editInDate}
							required
							class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-xs font-mono text-on-surface border-0 outline-none focus:ring-2 focus:ring-cyan-500/40"
						/>
					</div>
					<div>
						<label class="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">Jam Masuk</label>
						<div class="flex items-center gap-1.5">
							<select
								bind:value={editInHour}
								class="flex-1 px-3 py-2.5 rounded-xl bg-surface-container-low text-xs font-mono font-bold text-on-surface border-0 outline-none focus:ring-2 focus:ring-cyan-500/40 cursor-pointer"
							>
								{#each HOURS_24 as h}
									<option value={h}>{h}</option>
								{/each}
							</select>
							<span class="font-mono font-black text-xs">:</span>
							<select
								bind:value={editInMinute}
								class="flex-1 px-3 py-2.5 rounded-xl bg-surface-container-low text-xs font-mono font-bold text-on-surface border-0 outline-none focus:ring-2 focus:ring-cyan-500/40 cursor-pointer"
							>
								{#each MINUTES_60 as m}
									<option value={m}>{m}</option>
								{/each}
							</select>
						</div>
					</div>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div>
						<label class="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">Tanggal Keluar *</label>
						<input
							type="date"
							name="check_out_date"
							bind:value={editOutDate}
							required
							class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-xs font-mono text-on-surface border-0 outline-none focus:ring-2 focus:ring-emerald-500/40"
						/>
					</div>
					<div>
						<div class="flex items-center justify-between mb-1">
							<label class="block text-[11px] font-bold text-on-surface-variant uppercase">Jam Keluar *</label>
							<button
								type="button"
								onclick={setCheckOutToNowWib}
								class="text-[10px] font-bold text-emerald-600 hover:underline cursor-pointer"
							>
								Jam Sekarang
							</button>
						</div>
						<div class="flex items-center gap-1.5">
							<select
								bind:value={editOutHour}
								class="flex-1 px-3 py-2.5 rounded-xl bg-surface-container-low text-xs font-mono font-bold text-on-surface border-0 outline-none focus:ring-2 focus:ring-emerald-500/40 cursor-pointer"
							>
								{#each HOURS_24 as h}
									<option value={h}>{h}</option>
								{/each}
							</select>
							<span class="font-mono font-black text-xs">:</span>
							<select
								bind:value={editOutMinute}
								class="flex-1 px-3 py-2.5 rounded-xl bg-surface-container-low text-xs font-mono font-bold text-on-surface border-0 outline-none focus:ring-2 focus:ring-emerald-500/40 cursor-pointer"
							>
								{#each MINUTES_60 as m}
									<option value={m}>{m}</option>
								{/each}
							</select>
						</div>
					</div>
				</div>

				<div>
					<label class="block text-[11px] font-bold text-on-surface-variant uppercase mb-2 text-center">
						Penilaian Kepuasan Layanan Resepsionis (Survei Tamu)
					</label>
					<div class="grid grid-cols-3 gap-3">
						<button
							type="button"
							onclick={() => (selectedSurveyRating = 3)}
							class="p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 {selectedSurveyRating === 3
								? 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-black ring-2 ring-emerald-500/30'
								: 'bg-surface-container-low border-slate-200 dark:border-slate-800 text-on-surface-variant'}"
						>
							<span class="material-symbols-outlined text-2xl">sentiment_very_satisfied</span>
							<span class="text-xs">Puas (3)</span>
						</button>

						<button
							type="button"
							onclick={() => (selectedSurveyRating = 2)}
							class="p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 {selectedSurveyRating === 2
								? 'bg-amber-50 border-amber-500 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 font-black ring-2 ring-amber-500/30'
								: 'bg-surface-container-low border-slate-200 dark:border-slate-800 text-on-surface-variant'}"
						>
							<span class="material-symbols-outlined text-2xl">sentiment_neutral</span>
							<span class="text-xs">Cukup (2)</span>
						</button>

						<button
							type="button"
							onclick={() => (selectedSurveyRating = 1)}
							class="p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 {selectedSurveyRating === 1
								? 'bg-rose-50 border-rose-500 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 font-black ring-2 ring-rose-500/30'
								: 'bg-surface-container-low border-slate-200 dark:border-slate-800 text-on-surface-variant'}"
						>
							<span class="material-symbols-outlined text-2xl">sentiment_dissatisfied</span>
							<span class="text-xs">Kurang (1)</span>
						</button>
					</div>
				</div>

				<div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-200/60 dark:border-slate-800/60">
					<button
						type="button"
						onclick={() => (selectedVisitorForCheckout = null)}
						class="px-4 py-2 rounded-xl bg-surface-container-high text-xs font-bold text-on-surface-variant cursor-pointer"
					>
						Batal
					</button>
					<button
						type="submit"
						class="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
					>
						Simpan & Selesai
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
