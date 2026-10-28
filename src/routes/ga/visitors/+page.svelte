<script lang="ts">
	import { enhance } from '$app/forms';
	import Pagination from '$lib/components/Pagination.svelte';

	let { data, form } = $props();

	// Active Tab State
	let activeMainTab = $state<'VISITORS' | 'DOCUMENTS' | 'INVOICES' | 'PROPOSALS' | 'CALLS'>('VISITORS');

	const visitors = $derived(data.visitors || []);
	const documents = $derived(data.documents || []);
	const invoices = $derived(data.invoices || []);
	const proposals = $derived(data.proposals || []);
	const calls = $derived(data.calls || []);
	const employees = $derived(data.employees || []);
	const departments = $derived(data.departments || []);
	const stats = $derived(data.stats);
	const frontdeskStats = $derived(data.frontdeskStats);

	// Helpers: WIB Time 24-Hour
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
		const d = new Date(dateStr);
		if (isNaN(d.getTime())) return dateStr;
		return d.toLocaleDateString('id-ID', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
	}

	function formatRupiah(amount: number | string | null) {
		const num = typeof amount === 'string' ? parseFloat(amount) : (amount || 0);
		return new Intl.NumberFormat('id-ID', {
			style: 'currency',
			currency: 'IDR',
			maximumFractionDigits: 0
		}).format(num);
	}

	function isPdf(path: string | null) {
		return path?.toLowerCase().endsWith('.pdf');
	}

	// ==================== 1. TAB BUKU TAMU STATE ====================
	let visitorSearch = $state('');
	let visitorStatusFilter = $state('ALL');
	let visitorRatingFilter = $state('ALL');
	let visitorPage = $state(1);
	const visitorPerPage = 12;

	let showCheckInModal = $state(false);
	let selectedEmpNik = $state('');
	let hostNameInput = $state('');
	let hostDeptInput = $state('GENERAL AFFAIRS');
	let checkInDate = $state('');
	let checkInHour = $state('08');
	let checkInMinute = $state('00');

	let selectedVisitorForCheckout = $state<any>(null);
	let selectedSurveyRating = $state(3);

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

	function handleEmployeeChange(nik: string) {
		selectedEmpNik = nik;
		const emp = employees.find((e: any) => e.nik === nik);
		if (emp) {
			hostNameInput = emp.name;
			hostDeptInput = emp.department || 'GENERAL AFFAIRS';
		}
	}

	function openCheckoutModal(v: any) {
		selectedVisitorForCheckout = v;
		selectedSurveyRating = v.survey_rating || 3;
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
		stats?.total_rated > 0
			? Math.round(
					(((stats.rating_puas || 0) * 3 + (stats.rating_cukup || 0) * 2 + (stats.rating_kurang || 0) * 1) /
						(stats.total_rated * 3)) *
						100
				)
			: 0
	);

	const filteredVisitors = $derived(
		visitors.filter((v: any) => {
			if (visitorStatusFilter !== 'ALL' && v.status !== visitorStatusFilter) return false;
			if (visitorRatingFilter !== 'ALL' && String(v.survey_rating || '') !== visitorRatingFilter) return false;
			if (visitorSearch.trim()) {
				const q = visitorSearch.toLowerCase();
				return (
					(v.visitor_name || '').toLowerCase().includes(q) ||
					(v.company || '').toLowerCase().includes(q) ||
					(v.purpose || '').toLowerCase().includes(q) ||
					(v.host_name || '').toLowerCase().includes(q) ||
					(v.host_department || '').toLowerCase().includes(q) ||
					(v.badge_number || '').toLowerCase().includes(q) ||
					(v.address || '').toLowerCase().includes(q) ||
					(v.phone || '').toLowerCase().includes(q)
				);
			}
			return true;
		})
	);

	$effect(() => {
		visitorSearch;
		visitorStatusFilter;
		visitorRatingFilter;
		visitorPage = 1;
	});

	const paginatedVisitors = $derived(
		filteredVisitors.slice((visitorPage - 1) * visitorPerPage, visitorPage * visitorPerPage)
	);

	// ==================== 2. TAB DOKUMEN & PAKET STATE ====================
	let docSearch = $state('');
	let docDirectionFilter = $state('ALL');
	let docStatusFilter = $state('ALL');
	let docPage = $state(1);
	const docPerPage = 12;

	let isCreateDocOpen = $state(false);
	let isHandoverDocOpen = $state(false);
	let selectedDocForHandover = $state<any>(null);

	const filteredDocuments = $derived(
		documents.filter((d: any) => {
			if (docDirectionFilter !== 'ALL' && d.direction !== docDirectionFilter) return false;
			if (docStatusFilter !== 'ALL' && d.status !== docStatusFilter) return false;
			if (docSearch.trim()) {
				const q = docSearch.toLowerCase();
				return (
					(d.sender_name || '').toLowerCase().includes(q) ||
					(d.recipient_name || '').toLowerCase().includes(q) ||
					(d.tracking_number || '').toLowerCase().includes(q) ||
					(d.courier_name || '').toLowerCase().includes(q)
				);
			}
			return true;
		})
	);

	const paginatedDocuments = $derived(
		filteredDocuments.slice((docPage - 1) * docPerPage, docPage * docPerPage)
	);

	// ==================== 3. TAB INVOICE MASUK STATE ====================
	let invSearch = $state('');
	let invStatusFilter = $state('ALL');
	let invPage = $state(1);
	const invPerPage = 12;

	let isCreateInvOpen = $state(false);
	let isHandoverInvOpen = $state(false);
	let selectedInvForHandover = $state<any>(null);

	const filteredInvoices = $derived(
		invoices.filter((inv: any) => {
			if (invStatusFilter !== 'ALL' && inv.status !== invStatusFilter) return false;
			if (invSearch.trim()) {
				const q = invSearch.toLowerCase();
				return (
					(inv.vendor_name || '').toLowerCase().includes(q) ||
					(inv.invoice_number || '').toLowerCase().includes(q) ||
					(inv.receipt_number || '').toLowerCase().includes(q) ||
					(inv.po_number || '').toLowerCase().includes(q)
				);
			}
			return true;
		})
	);

	const paginatedInvoices = $derived(
		filteredInvoices.slice((invPage - 1) * invPerPage, invPage * invPerPage)
	);

	// ==================== 4. TAB PROPOSAL MASUK STATE ====================
	let propSearch = $state('');
	let propCategoryFilter = $state('ALL');
	let propStatusFilter = $state('ALL');
	let propPage = $state(1);
	const propPerPage = 12;

	let isCreatePropOpen = $state(false);
	let isDisposisiPropOpen = $state(false);
	let selectedPropForDisposisi = $state<any>(null);

	const filteredProposals = $derived(
		proposals.filter((p: any) => {
			if (propCategoryFilter !== 'ALL' && p.category !== propCategoryFilter) return false;
			if (propStatusFilter !== 'ALL' && p.status !== propStatusFilter) return false;
			if (propSearch.trim()) {
				const q = propSearch.toLowerCase();
				return (
					(p.sender_organization || '').toLowerCase().includes(q) ||
					(p.title || '').toLowerCase().includes(q) ||
					(p.target_recipient || '').toLowerCase().includes(q)
				);
			}
			return true;
		})
	);

	const paginatedProposals = $derived(
		filteredProposals.slice((propPage - 1) * propPerPage, propPage * propPerPage)
	);

	// ==================== 5. TAB LOG TELEPON STATE ====================
	let callSearch = $state('');
	let callUrgencyFilter = $state('ALL');
	let callStatusFilter = $state('ALL');
	let callPage = $state(1);
	const callPerPage = 12;

	let isCreateCallOpen = $state(false);

	const filteredCalls = $derived(
		calls.filter((c: any) => {
			if (callUrgencyFilter !== 'ALL' && c.urgency !== callUrgencyFilter) return false;
			if (callStatusFilter !== 'ALL' && c.status !== callStatusFilter) return false;
			if (callSearch.trim()) {
				const q = callSearch.toLowerCase();
				return (
					(c.caller_name || '').toLowerCase().includes(q) ||
					(c.caller_company || '').toLowerCase().includes(q) ||
					(c.target_employee_name || '').toLowerCase().includes(q) ||
					(c.message_content || '').toLowerCase().includes(q)
				);
			}
			return true;
		})
	);

	const paginatedCalls = $derived(
		filteredCalls.slice((callPage - 1) * callPerPage, callPage * callPerPage)
	);

	// ==================== COMMON MODALS: RECEIPT SLIP & PREVIEW ====================
	let isReceiptModalOpen = $state(false);
	let receiptData = $state<any>(null);
	let receiptType = $state<'INVOICE' | 'DOCUMENT'>('INVOICE');

	function printReceipt(item: any, type: 'INVOICE' | 'DOCUMENT') {
		receiptData = item;
		receiptType = type;
		isReceiptModalOpen = true;
	}

	let isPreviewOpen = $state(false);
	let previewItem = $state<any>(null);

	function openPreview(filePath: string, title: string) {
		previewItem = { filePath, title };
		isPreviewOpen = true;
	}
</script>

<svelte:head>
	<title>Front Desk & Reception Hub | General Affair | ERP BCS</title>
</svelte:head>

<div class="space-y-6">
	<!-- HEADER UTAMA -->
	<div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/60 dark:border-slate-800/60 pb-5">
		<div>
			<div class="flex items-center gap-2 text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest mb-1">
				<span class="material-symbols-outlined text-sm">badge</span>
				<span>General Affair • Front Desk & Receptionist</span>
			</div>
			<h1 class="text-2xl sm:text-3xl font-black text-on-surface tracking-tight">Visitor & Front Desk Hub</h1>
			<p class="text-xs text-on-surface-variant mt-1">
				Registrasi tamu perusahaan, penukaran kartu identitas tamu (Visitor Badge), karyawan yang ditemui, serta pencatatan terpadu meja depan (dokumen, invoice, proposal, dan panggilan telepon).
			</p>
		</div>

		<!-- Action Button Dynamic Per Tab -->
		<div class="flex items-center gap-2 self-start md:self-auto">
			{#if activeMainTab === 'VISITORS'}
				<button
					type="button"
					onclick={openCheckInModal}
					class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
				>
					<span class="material-symbols-outlined text-base">person_add</span>
					<span>+ Check-In Tamu Baru</span>
				</button>
			{:else if activeMainTab === 'DOCUMENTS'}
				<button
					type="button"
					onclick={() => (isCreateDocOpen = true)}
					class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
				>
					<span class="material-symbols-outlined text-base">markunread_mailbox</span>
					<span>+ Catat Dokumen / Paket</span>
				</button>
			{:else if activeMainTab === 'INVOICES'}
				<button
					type="button"
					onclick={() => (isCreateInvOpen = true)}
					class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
				>
					<span class="material-symbols-outlined text-base">receipt_long</span>
					<span>+ Terima Invoice Vendor</span>
				</button>
			{:else if activeMainTab === 'PROPOSALS'}
				<button
					type="button"
					onclick={() => (isCreatePropOpen = true)}
					class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
				>
					<span class="material-symbols-outlined text-base">post_add</span>
					<span>+ Registrasi Proposal Masuk</span>
				</button>
			{:else if activeMainTab === 'CALLS'}
				<button
					type="button"
					onclick={() => (isCreateCallOpen = true)}
					class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
				>
					<span class="material-symbols-outlined text-base">add_call</span>
					<span>+ Catat Panggilan Telepon</span>
				</button>
			{/if}
		</div>
	</div>

	<!-- KPI OVERVIEW CARDS (DINAMIS SESUAI TAB AKTIF) -->
	{#if activeMainTab === 'VISITORS'}
		<!-- KPI BUKU TAMU & SURVEI KEPUASAN RESEPSIONIS -->
		<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
			<!-- 1: Total Kunjungan -->
			<div class="p-4 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 flex flex-col justify-between shadow-2xs">
				<div class="flex items-center justify-between">
					<span class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Total Kunjungan</span>
					<div class="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center">
						<span class="material-symbols-outlined text-base">group</span>
					</div>
				</div>
				<div class="text-2xl font-black text-on-surface mt-2">
					{stats.total_visitors} <span class="text-xs font-normal text-on-surface-variant">tamu</span>
				</div>
				<p class="text-[10px] text-teal-600 font-semibold mt-1">Buku tamu terdaftar</p>
			</div>

			<!-- 2: Sedang Di Kantor -->
			<div class="p-4 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 flex flex-col justify-between shadow-2xs">
				<div class="flex items-center justify-between">
					<span class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Sedang Di Kantor</span>
					<div class="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
						<span class="material-symbols-outlined text-base">person_pin_circle</span>
					</div>
				</div>
				<div class="text-2xl font-black text-amber-600 mt-2">
					{stats.active_visitors} <span class="text-xs font-normal text-on-surface-variant">tamu aktif</span>
				</div>
				<p class="text-[10px] text-on-surface-variant font-medium mt-1">Belum melakukan check-out</p>
			</div>

			<!-- 3: Indeks Kepuasan -->
			<div class="p-4 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 flex flex-col justify-between shadow-2xs">
				<div class="flex items-center justify-between">
					<span class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Indeks Kepuasan</span>
					<div class="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
						<span class="material-symbols-outlined text-base">sentiment_very_satisfied</span>
					</div>
				</div>
				<div class="text-2xl font-black text-emerald-600 mt-2">
					{satisfactionPercent}%
				</div>
				<p class="text-[10px] text-on-surface-variant font-medium mt-1">Rata-rata: {stats.avg_rating || '3.0'}/3.0</p>
			</div>

			<!-- 4: Layanan Puas -->
			<div class="p-4 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 flex flex-col justify-between shadow-2xs">
				<div class="flex items-center justify-between">
					<span class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Layanan Puas (3)</span>
					<div class="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
						<span class="material-symbols-outlined text-base">thumb_up</span>
					</div>
				</div>
				<div class="text-2xl font-black text-on-surface mt-2">
					{stats.rating_puas} <span class="text-xs font-normal text-on-surface-variant">responden</span>
				</div>
				<p class="text-[10px] text-emerald-600 font-semibold mt-1">Penilaian bintang 3</p>
			</div>

			<!-- 5: Cukup / Kurang -->
			<div class="p-4 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 flex flex-col justify-between shadow-2xs">
				<div class="flex items-center justify-between">
					<span class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Cukup / Kurang</span>
					<div class="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
						<span class="material-symbols-outlined text-base">rate_review</span>
					</div>
				</div>
				<div class="text-2xl font-black text-on-surface mt-2">
					{(stats.rating_cukup || 0) + (stats.rating_kurang || 0)} <span class="text-xs font-normal text-on-surface-variant">responden</span>
				</div>
				<p class="text-[10px] text-on-surface-variant font-medium mt-1">Cukup: {stats.rating_cukup || 0} • Kurang: {stats.rating_kurang || 0}</p>
			</div>
		</div>
	{:else}
		<!-- KPI OPERASIONAL FRONT DESK LAINNYA -->
		<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
			<!-- 1: Tamu Aktif -->
			<div class="p-4 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 flex flex-col justify-between shadow-2xs">
				<div class="flex items-center justify-between">
					<span class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Tamu di Kantor</span>
					<span class="material-symbols-outlined text-teal-600 text-lg">badge</span>
				</div>
				<div class="text-2xl font-black text-on-surface mt-2">
					{stats.active_visitors} <span class="text-xs font-normal text-on-surface-variant">orang</span>
				</div>
				<p class="text-[10px] text-teal-600 font-semibold mt-1">Total {stats.total_visitors} kunjungan</p>
			</div>

			<!-- 2: Dokumen Pending -->
			<div class="p-4 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 flex flex-col justify-between shadow-2xs">
				<div class="flex items-center justify-between">
					<span class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Dokumen Belum Diambil</span>
					<span class="material-symbols-outlined text-indigo-600 text-lg">mail</span>
				</div>
				<div class="text-2xl font-black text-indigo-600 mt-2">
					{frontdeskStats.pending_docs} <span class="text-xs font-normal text-on-surface-variant">paket</span>
				</div>
				<p class="text-[10px] text-on-surface-variant font-medium mt-1">Menunggu serah terima</p>
			</div>

			<!-- 3: Invoice Pending Finance -->
			<div class="p-4 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 flex flex-col justify-between shadow-2xs">
				<div class="flex items-center justify-between">
					<span class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Invoice Belum ke Finance</span>
					<span class="material-symbols-outlined text-cyan-600 text-lg">receipt</span>
				</div>
				<div class="text-2xl font-black text-cyan-600 mt-2">
					{frontdeskStats.pending_invoices} <span class="text-xs font-normal text-on-surface-variant">tagihan</span>
				</div>
				<p class="text-[10px] text-on-surface-variant font-medium mt-1">Siap diserahkan ke Finance</p>
			</div>

			<!-- 4: Proposal Menunggu Review -->
			<div class="p-4 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 flex flex-col justify-between shadow-2xs">
				<div class="flex items-center justify-between">
					<span class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Proposal Review</span>
					<span class="material-symbols-outlined text-amber-600 text-lg">assignment</span>
				</div>
				<div class="text-2xl font-black text-amber-600 mt-2">
					{frontdeskStats.pending_proposals} <span class="text-xs font-normal text-on-surface-variant">proposal</span>
				</div>
				<p class="text-[10px] text-on-surface-variant font-medium mt-1">Menunggu disposisi</p>
			</div>

			<!-- 5: Panggilan Telepon Pending -->
			<div class="p-4 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 flex flex-col justify-between shadow-2xs">
				<div class="flex items-center justify-between">
					<span class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Panggilan / Memo</span>
					{#if frontdeskStats.urgent_calls > 0}
						<span class="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" title="Ada panggilan mendesak!"></span>
					{:else}
						<span class="material-symbols-outlined text-slate-400 text-lg">call</span>
					{/if}
				</div>
				<div class="text-2xl font-black {frontdeskStats.urgent_calls > 0 ? 'text-rose-600' : 'text-on-surface'} mt-2">
					{frontdeskStats.pending_calls} <span class="text-xs font-normal text-on-surface-variant">memo</span>
				</div>
				<p class="text-[10px] {frontdeskStats.urgent_calls > 0 ? 'text-rose-600 font-bold' : 'text-on-surface-variant'} mt-1 truncate">
					{frontdeskStats.urgent_calls > 0 ? `⚠️ ${frontdeskStats.urgent_calls} Panggilan Mendesak` : 'Tindak lanjut staf'}
				</p>
			</div>
		</div>
	{/if}

	<!-- TAB SWITCHER NAVIGASI MEJA DEPAN (5 TABS) -->
	<div class="flex flex-wrap items-center gap-2 border-b border-slate-200/60 dark:border-slate-800/60 pb-2">
		<button
			onclick={() => (activeMainTab = 'VISITORS')}
			class="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer {activeMainTab === 'VISITORS'
				? 'bg-teal-600 text-white shadow-xs'
				: 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'}"
		>
			<span class="material-symbols-outlined text-[17px]">groups</span>
			<span>Buku Tamu ({visitors.length})</span>
			{#if stats.active_visitors > 0}
				<span class="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px] font-black">{stats.active_visitors}</span>
			{/if}
		</button>

		<button
			onclick={() => (activeMainTab = 'DOCUMENTS')}
			class="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer {activeMainTab === 'DOCUMENTS'
				? 'bg-teal-600 text-white shadow-xs'
				: 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'}"
		>
			<span class="material-symbols-outlined text-[17px]">markunread_mailbox</span>
			<span>Dokumen & Paket ({documents.length})</span>
			{#if frontdeskStats.pending_docs > 0}
				<span class="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black">{frontdeskStats.pending_docs}</span>
			{/if}
		</button>

		<button
			onclick={() => (activeMainTab = 'INVOICES')}
			class="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer {activeMainTab === 'INVOICES'
				? 'bg-teal-600 text-white shadow-xs'
				: 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'}"
		>
			<span class="material-symbols-outlined text-[17px]">receipt_long</span>
			<span>Invoice Masuk ({invoices.length})</span>
			{#if frontdeskStats.pending_invoices > 0}
				<span class="px-1.5 py-0.2 rounded-full bg-cyan-400 text-slate-950 text-[10px] font-black">{frontdeskStats.pending_invoices}</span>
			{/if}
		</button>

		<button
			onclick={() => (activeMainTab = 'PROPOSALS')}
			class="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer {activeMainTab === 'PROPOSALS'
				? 'bg-teal-600 text-white shadow-xs'
				: 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'}"
		>
			<span class="material-symbols-outlined text-[17px]">post_add</span>
			<span>Proposal Masuk ({proposals.length})</span>
		</button>

		<button
			onclick={() => (activeMainTab = 'CALLS')}
			class="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer {activeMainTab === 'CALLS'
				? 'bg-teal-600 text-white shadow-xs'
				: 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'}"
		>
			<span class="material-symbols-outlined text-[17px]">call</span>
			<span>Log Panggilan ({calls.length})</span>
			{#if frontdeskStats.urgent_calls > 0}
				<span class="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-black">{frontdeskStats.urgent_calls}</span>
			{/if}
		</button>
	</div>

	<!-- ==================== TAB 1: BUKU TAMU ==================== -->
	{#if activeMainTab === 'VISITORS'}
		<div class="space-y-4">
			<div class="flex flex-col md:flex-row gap-3 items-center justify-between p-4 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 shadow-2xs">
				<div class="flex items-center gap-3 px-4 py-2 rounded-xl bg-surface-container-low w-full md:w-80">
					<span class="material-symbols-outlined text-on-surface-variant text-[18px]">search</span>
					<input
						type="text"
						bind:value={visitorSearch}
						placeholder="Cari nama tamu, perusahaan, tujuan..."
						class="bg-transparent text-xs text-on-surface border-0 outline-none w-full"
					/>
				</div>

				<div class="flex flex-wrap items-center gap-2 w-full md:w-auto">
					<select
						bind:value={visitorStatusFilter}
						class="px-3.5 py-2 rounded-xl bg-surface-container-low border-0 text-xs text-on-surface font-medium cursor-pointer"
					>
						<option value="ALL">Semua Status Tamu</option>
						<option value="CHECKED_IN">Sedang Berkunjung (Aktif)</option>
						<option value="CHECKED_OUT">Sudah Selesai (Check-Out)</option>
					</select>

					<select
						bind:value={visitorRatingFilter}
						class="px-3.5 py-2 rounded-xl bg-surface-container-low border-0 text-xs text-on-surface font-medium cursor-pointer"
					>
						<option value="ALL">Semua Rating Kepuasan</option>
						<option value="3">Puas (3/3)</option>
						<option value="2">Cukup (2/3)</option>
						<option value="1">Kurang (1/3)</option>
					</select>
				</div>
			</div>

			<!-- Visitor Table (Original 8 Kolom Lengkap) -->
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
											<div class="text-[11px] font-semibold text-teal-700 dark:text-teal-400">{v.company || '-'}</div>
										</td>
										<td class="py-3 px-4">
											<div class="font-mono text-[11px] text-on-surface">{v.phone || '-'}</div>
											<div class="text-[10px] text-on-surface-variant max-w-[180px] truncate" title={v.address}>{v.address || '-'}</div>
										</td>
										<td class="py-3 px-4">
											<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono text-xs font-bold bg-surface-container-high text-on-surface border border-slate-200 dark:border-slate-700">
												<span class="material-symbols-outlined text-xs text-teal-600">badge</span>
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
														class="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1"
													>
														<span class="material-symbols-outlined text-xs">logout</span>
														<span>Check-Out & Survei</span>
													</button>
												{:else}
													<button
														type="button"
														onclick={() => openCheckoutModal(v)}
														class="p-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-teal-600 transition-colors cursor-pointer"
														title="Ubah Skor Survei"
													>
														<span class="material-symbols-outlined text-sm">rate_review</span>
													</button>
												{/if}

												<form
													method="POST"
													action="?/deleteVisitor"
													use:enhance={() => {
														if (!confirm(`Hapus catatan kunjungan tamu ${v.visitor_name}?`)) return ({ cancel }: any) => cancel();
													}}
													class="inline"
												>
													<input type="hidden" name="id" value={v.id} />
													<button
														type="submit"
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

				<Pagination
					currentPage={visitorPage}
					totalPages={Math.max(1, Math.ceil(filteredVisitors.length / visitorPerPage))}
					totalItems={filteredVisitors.length}
					perPage={visitorPerPage}
					itemLabel="tamu"
					onPageChange={(p) => (visitorPage = p)}
				/>
			</div>
		</div>
	{/if}

	<!-- ==================== TAB 2: DOKUMEN & PAKET MASUK/KELUAR ==================== -->
	{#if activeMainTab === 'DOCUMENTS'}
		<div class="space-y-4">
			<div class="flex flex-col md:flex-row gap-3 items-center justify-between p-4 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 shadow-2xs">
				<div class="flex items-center gap-3 px-4 py-2 rounded-xl bg-surface-container-low w-full md:w-80">
					<span class="material-symbols-outlined text-on-surface-variant text-[18px]">search</span>
					<input
						type="text"
						bind:value={docSearch}
						placeholder="Cari no. resi, pengirim, penerima..."
						class="bg-transparent text-xs text-on-surface border-0 outline-none w-full"
					/>
				</div>

				<div class="flex flex-wrap items-center gap-2 w-full md:w-auto">
					<select
						bind:value={docDirectionFilter}
						class="px-3.5 py-2 rounded-xl bg-surface-container-low border-0 text-xs text-on-surface font-medium cursor-pointer"
					>
						<option value="ALL">Semua Arah (Masuk & Keluar)</option>
						<option value="INCOMING">Dokumen Masuk (Incoming)</option>
						<option value="OUTGOING">Dokumen Keluar (Outgoing)</option>
					</select>

					<select
						bind:value={docStatusFilter}
						class="px-3.5 py-2 rounded-xl bg-surface-container-low border-0 text-xs text-on-surface font-medium cursor-pointer"
					>
						<option value="ALL">Semua Status</option>
						<option value="DITERIMA">Belum Diambil (Diterima)</option>
						<option value="DISERAHKAN">Sudah Diserahkan</option>
					</select>
				</div>
			</div>

			<!-- Document Table -->
			<div class="rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 shadow-2xs overflow-hidden">
				<div class="overflow-x-auto">
					<table class="w-full text-left text-xs">
						<thead class="bg-surface-container-low text-on-surface-variant uppercase text-[10px] font-bold tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
							<tr>
								<th class="py-3 px-4">No. Resi / Surat</th>
								<th class="py-3 px-4">Arah & Jenis</th>
								<th class="py-3 px-4">Kurir / Ekspedisi</th>
								<th class="py-3 px-4">Pengirim</th>
								<th class="py-3 px-4">Penerima & Dept</th>
								<th class="py-3 px-4 text-center">Waktu Diterima</th>
								<th class="py-3 px-4 text-center">Status & Serah Terima</th>
								<th class="py-3 px-4 text-center">Lampiran</th>
								<th class="py-3 px-4 text-center">Aksi</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
							{#each paginatedDocuments as d (d.id)}
								<tr class="hover:bg-surface-container transition-colors">
									<td class="py-3 px-4 font-mono font-black text-on-surface">
										{d.tracking_number || '-'}
									</td>
									<td class="py-3 px-4 whitespace-nowrap">
										<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold {d.direction === 'INCOMING' ? 'bg-cyan-50 text-cyan-700 border border-cyan-200' : 'bg-purple-50 text-purple-700 border border-purple-200'}">
											{d.direction === 'INCOMING' ? '📥 MASUK' : '📤 KELUAR'}
										</span>
										<div class="text-[10px] text-on-surface-variant mt-0.5">{d.doc_type}</div>
									</td>
									<td class="py-3 px-4 font-medium text-on-surface">
										{d.courier_name || '-'}
									</td>
									<td class="py-3 px-4">
										<div class="font-bold text-on-surface">{d.sender_name}</div>
										<div class="text-[10px] text-on-surface-variant">{d.sender_company || '-'}</div>
									</td>
									<td class="py-3 px-4">
										<div class="font-semibold text-on-surface">{d.recipient_name}</div>
										<div class="text-[10px] text-on-surface-variant">{d.recipient_department}</div>
									</td>
									<td class="py-3 px-4 text-center whitespace-nowrap font-mono text-[11px]">
										{d.received_at}
									</td>
									<td class="py-3 px-4 text-center whitespace-nowrap">
										{#if d.status === 'DISERAHKAN'}
											<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 block">
												✓ Diserahkan
											</span>
											<span class="text-[9px] text-on-surface-variant font-medium">ke {d.handed_over_to}</span>
										{:else}
											<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
												⏳ Di Resepsionis
											</span>
										{/if}
									</td>
									<td class="py-3 px-4 text-center whitespace-nowrap">
										{#if d.file_path}
											<button
												type="button"
												onclick={() => openPreview(d.file_path, `Dokumen #${d.tracking_number || d.id}`)}
												class="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-teal-600 font-bold text-[10px] cursor-pointer"
											>
												<span class="material-symbols-outlined text-[13px]">{isPdf(d.file_path) ? 'picture_as_pdf' : 'image'}</span>
												<span>Lihat</span>
											</button>
										{:else}
											<span class="text-[10px] text-on-surface-variant italic">-</span>
										{/if}
									</td>
									<td class="py-3 px-4 text-center whitespace-nowrap">
										<div class="flex items-center justify-center gap-1">
											{#if d.status !== 'DISERAHKAN'}
												<button
													onclick={() => {
														selectedDocForHandover = d;
														isHandoverDocOpen = true;
													}}
													class="px-2 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-[10px] cursor-pointer"
													title="Serah Terima Fisik Dokumen ke Karyawan"
												>
													Serahkan
												</button>
											{/if}
											<button
												type="button"
												onclick={() => printReceipt(d, 'DOCUMENT')}
												class="p-1.5 rounded-lg text-slate-500 hover:bg-surface-container"
												title="Cetak Bukti Tanda Terima"
											>
												<span class="material-symbols-outlined text-sm">print</span>
											</button>
											<form
												method="POST"
												action="?/deleteDocument"
												use:enhance={() => {
													if (!confirm(`Hapus catatan dokumen ini?`)) return ({ cancel }: any) => cancel();
												}}
												class="inline"
											>
												<input type="hidden" name="id" value={d.id} />
												<button type="submit" class="p-1 rounded text-rose-500 hover:bg-rose-50 cursor-pointer">
													<span class="material-symbols-outlined text-base">delete</span>
												</button>
											</form>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<Pagination
					currentPage={docPage}
					totalPages={Math.max(1, Math.ceil(filteredDocuments.length / docPerPage))}
					totalItems={filteredDocuments.length}
					perPage={docPerPage}
					itemLabel="dokumen/paket"
					onPageChange={(p) => (docPage = p)}
				/>
			</div>
		</div>
	{/if}

	<!-- ==================== TAB 3: INVOICE MASUK (TAGIHAN VENDOR) ==================== -->
	{#if activeMainTab === 'INVOICES'}
		<div class="space-y-4">
			<div class="flex flex-col md:flex-row gap-3 items-center justify-between p-4 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 shadow-2xs">
				<div class="flex items-center gap-3 px-4 py-2 rounded-xl bg-surface-container-low w-full md:w-80">
					<span class="material-symbols-outlined text-on-surface-variant text-[18px]">search</span>
					<input
						type="text"
						bind:value={invSearch}
						placeholder="Cari vendor, no. invoice, no. tanda terima..."
						class="bg-transparent text-xs text-on-surface border-0 outline-none w-full"
					/>
				</div>

				<div class="flex flex-wrap items-center gap-2 w-full md:w-auto">
					<select
						bind:value={invStatusFilter}
						class="px-3.5 py-2 rounded-xl bg-surface-container-low border-0 text-xs text-on-surface font-medium cursor-pointer"
					>
						<option value="ALL">Semua Status Invoice</option>
						<option value="DITERIMA">Belum ke Finance (Di Resepsionis)</option>
						<option value="DISERAHKAN_KE_FINANCE">Sudah Diserahkan ke Finance</option>
					</select>
				</div>
			</div>

			<!-- Invoice Table -->
			<div class="rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 shadow-2xs overflow-hidden">
				<div class="overflow-x-auto">
					<table class="w-full text-left text-xs">
						<thead class="bg-surface-container-low text-on-surface-variant uppercase text-[10px] font-bold tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
							<tr>
								<th class="py-3 px-4">No. Tanda Terima</th>
								<th class="py-3 px-4">Nama Vendor / Supplier</th>
								<th class="py-3 px-4">No. Invoice & PO</th>
								<th class="py-3 px-4 text-right">Nilai Tagihan</th>
								<th class="py-3 px-4 text-center">Tgl Terima</th>
								<th class="py-3 px-4 text-center">Jatuh Tempo</th>
								<th class="py-3 px-4 text-center">Status Finance</th>
								<th class="py-3 px-4 text-center">Lampiran</th>
								<th class="py-3 px-4 text-center">Aksi & Slip</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
							{#each paginatedInvoices as inv (inv.id)}
								<tr class="hover:bg-surface-container transition-colors">
									<td class="py-3 px-4 font-mono font-black text-teal-700 dark:text-teal-400 whitespace-nowrap">
										{inv.receipt_number}
									</td>
									<td class="py-3 px-4 font-bold text-on-surface">
										{inv.vendor_name}
										<div class="text-[10px] text-on-surface-variant font-normal">Pengantar: {inv.courier_sender || '-'}</div>
									</td>
									<td class="py-3 px-4">
										<div class="font-bold text-on-surface">{inv.invoice_number}</div>
										{#if inv.po_number}
											<div class="text-[10px] text-slate-500 font-mono">PO: {inv.po_number}</div>
										{/if}
									</td>
									<td class="py-3 px-4 text-right font-mono font-bold text-on-surface whitespace-nowrap">
										{formatRupiah(inv.amount)}
									</td>
									<td class="py-3 px-4 text-center whitespace-nowrap font-mono text-[11px]">
										{formatIndoDate(inv.received_date)}
									</td>
									<td class="py-3 px-4 text-center whitespace-nowrap font-mono text-[11px]">
										{formatIndoDate(inv.due_date)}
									</td>
									<td class="py-3 px-4 text-center whitespace-nowrap">
										{#if inv.status === 'DISERAHKAN_KE_FINANCE'}
											<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 block">
												✓ Diserahkan ke Finance
											</span>
											<span class="text-[9px] text-on-surface-variant font-medium">ke {inv.finance_recipient_name} ({inv.handed_to_finance_at?.split(' ')[1] || ''})</span>
										{:else}
											<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
												⏳ Di Resepsionis
											</span>
										{/if}
									</td>
									<td class="py-3 px-4 text-center whitespace-nowrap">
										{#if inv.file_path}
											<button
												type="button"
												onclick={() => openPreview(inv.file_path, `Invoice #${inv.invoice_number}`)}
												class="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-cyan-600 font-bold text-[10px] cursor-pointer"
											>
												<span class="material-symbols-outlined text-[13px]">{isPdf(inv.file_path) ? 'picture_as_pdf' : 'image'}</span>
												<span>Lihat</span>
											</button>
										{:else}
											<span class="text-[10px] text-on-surface-variant italic">-</span>
										{/if}
									</td>
									<td class="py-3 px-4 text-center whitespace-nowrap">
										<div class="flex items-center justify-center gap-1">
											{#if inv.status !== 'DISERAHKAN_KE_FINANCE'}
												<button
													onclick={() => {
														selectedInvForHandover = inv;
														isHandoverInvOpen = true;
													}}
													class="px-2 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-[10px] cursor-pointer"
													title="Serahkan Fisik Tagihan ke Staf Finance"
												>
													Ke Finance
												</button>
											{/if}
											<button
												type="button"
												onclick={() => printReceipt(inv, 'INVOICE')}
												class="p-1.5 rounded-lg text-slate-500 hover:bg-surface-container cursor-pointer"
												title="Cetak Struk Bukti Tanda Terima (Receipt Slip)"
											>
												<span class="material-symbols-outlined text-sm text-cyan-600">receipt</span>
											</button>
											<form
												method="POST"
												action="?/deleteInvoice"
												use:enhance={() => {
													if (!confirm(`Hapus catatan invoice ${inv.invoice_number} dari ${inv.vendor_name}?`)) return ({ cancel }: any) => cancel();
												}}
												class="inline"
											>
												<input type="hidden" name="id" value={inv.id} />
												<button type="submit" class="p-1 rounded text-rose-500 hover:bg-rose-50 cursor-pointer">
													<span class="material-symbols-outlined text-base">delete</span>
												</button>
											</form>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<Pagination
					currentPage={invPage}
					totalPages={Math.max(1, Math.ceil(filteredInvoices.length / invPerPage))}
					totalItems={filteredInvoices.length}
					perPage={invPerPage}
					itemLabel="invoice"
					onPageChange={(p) => (invPage = p)}
				/>
			</div>
		</div>
	{/if}

	<!-- ==================== TAB 4: PROPOSAL MASUK ==================== -->
	{#if activeMainTab === 'PROPOSALS'}
		<div class="space-y-4">
			<div class="flex flex-col md:flex-row gap-3 items-center justify-between p-4 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 shadow-2xs">
				<div class="flex items-center gap-3 px-4 py-2 rounded-xl bg-surface-container-low w-full md:w-80">
					<span class="material-symbols-outlined text-on-surface-variant text-[18px]">search</span>
					<input
						type="text"
						bind:value={propSearch}
						placeholder="Cari instansi, judul proposal..."
						class="bg-transparent text-xs text-on-surface border-0 outline-none w-full"
					/>
				</div>

				<div class="flex flex-wrap items-center gap-2 w-full md:w-auto">
					<select
						bind:value={propCategoryFilter}
						class="px-3.5 py-2 rounded-xl bg-surface-container-low border-0 text-xs text-on-surface font-medium cursor-pointer"
					>
						<option value="ALL">Semua Kategori</option>
						<option value="PENAWARAN_HARGA">Penawaran Harga / Kerjasama Bisnis</option>
						<option value="SPONSORSHIP">Sponsorship / Acara</option>
						<option value="CSR_SOSIAL">Bantuan Sosial / CSR</option>
						<option value="LAINNYA">Lainnya</option>
					</select>

					<select
						bind:value={propStatusFilter}
						class="px-3.5 py-2 rounded-xl bg-surface-container-low border-0 text-xs text-on-surface font-medium cursor-pointer"
					>
						<option value="ALL">Semua Status Disposisi</option>
						<option value="MENUNGGU_REVIEW">Menunggu Review</option>
						<option value="DITERUSKAN">Diteruskan ke Manajemen</option>
						<option value="DISETUJUI">Disetujui</option>
						<option value="DITOLAK">Ditolak</option>
					</select>
				</div>
			</div>

			<!-- Proposal Table -->
			<div class="rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 shadow-2xs overflow-hidden">
				<div class="overflow-x-auto">
					<table class="w-full text-left text-xs">
						<thead class="bg-surface-container-low text-on-surface-variant uppercase text-[10px] font-bold tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
							<tr>
								<th class="py-3 px-4">No. Proposal</th>
								<th class="py-3 px-4">Pengirim & Kontak</th>
								<th class="py-3 px-4">Judul / Perihal</th>
								<th class="py-3 px-4">Kategori</th>
								<th class="py-3 px-4">Ditujukan Kepada</th>
								<th class="py-3 px-4 text-center">Tgl Terima</th>
								<th class="py-3 px-4 text-center">Status Disposisi</th>
								<th class="py-3 px-4 text-center">File Proposal</th>
								<th class="py-3 px-4 text-center">Aksi</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
							{#each paginatedProposals as p (p.id)}
								<tr class="hover:bg-surface-container transition-colors">
									<td class="py-3 px-4 font-mono font-black text-amber-700 dark:text-amber-400 whitespace-nowrap">
										{p.proposal_number || '-'}
									</td>
									<td class="py-3 px-4">
										<div class="font-bold text-on-surface">{p.sender_organization}</div>
										<div class="text-[10px] text-on-surface-variant">{p.contact_person} ({p.contact_phone || '-'})</div>
									</td>
									<td class="py-3 px-4 font-bold text-on-surface max-w-sm">
										{p.title}
										{#if p.disposition_notes}
											<div class="text-[10px] text-slate-500 font-normal italic mt-0.5">Catatan: "{p.disposition_notes}"</div>
										{/if}
									</td>
									<td class="py-3 px-4 whitespace-nowrap">
										<span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-surface-container-high text-on-surface-variant">
											{p.category}
										</span>
									</td>
									<td class="py-3 px-4 font-semibold text-on-surface">
										{p.target_recipient}
									</td>
									<td class="py-3 px-4 text-center whitespace-nowrap font-mono text-[11px]">
										{formatIndoDate(p.received_date)}
									</td>
									<td class="py-3 px-4 text-center whitespace-nowrap">
										<span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase {p.status === 'DISETUJUI' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : p.status === 'DITOLAK' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-amber-50 text-amber-800 border border-amber-300'}">
											{p.status}
										</span>
									</td>
									<td class="py-3 px-4 text-center whitespace-nowrap">
										{#if p.file_path}
											<button
												type="button"
												onclick={() => openPreview(p.file_path, `Proposal: ${p.title}`)}
												class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[10px] cursor-pointer"
											>
												<span class="material-symbols-outlined text-[13px]">picture_as_pdf</span>
												<span>PDF</span>
											</button>
										{:else}
											<span class="text-[10px] text-on-surface-variant italic">-</span>
										{/if}
									</td>
									<td class="py-3 px-4 text-center whitespace-nowrap">
										<div class="flex items-center justify-center gap-1">
											<button
												onclick={() => {
													selectedPropForDisposisi = p;
													isDisposisiPropOpen = true;
												}}
												class="px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] cursor-pointer"
												title="Update Disposisi Proposal"
											>
												Disposisi
											</button>
											<form
												method="POST"
												action="?/deleteProposal"
												use:enhance={() => {
													if (!confirm(`Hapus proposal ${p.title}?`)) return ({ cancel }: any) => cancel();
												}}
												class="inline"
											>
												<input type="hidden" name="id" value={p.id} />
												<button type="submit" class="p-1 rounded text-rose-500 hover:bg-rose-50 cursor-pointer">
													<span class="material-symbols-outlined text-base">delete</span>
												</button>
											</form>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<Pagination
					currentPage={propPage}
					totalPages={Math.max(1, Math.ceil(filteredProposals.length / propPerPage))}
					totalItems={filteredProposals.length}
					perPage={propPerPage}
					itemLabel="proposal"
					onPageChange={(p) => (propPage = p)}
				/>
			</div>
		</div>
	{/if}

	<!-- ==================== TAB 5: LOG PANGGILAN TELEPON ==================== -->
	{#if activeMainTab === 'CALLS'}
		<div class="space-y-4">
			<div class="flex flex-col md:flex-row gap-3 items-center justify-between p-4 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 shadow-2xs">
				<div class="flex items-center gap-3 px-4 py-2 rounded-xl bg-surface-container-low w-full md:w-80">
					<span class="material-symbols-outlined text-on-surface-variant text-[18px]">search</span>
					<input
						type="text"
						bind:value={callSearch}
						placeholder="Cari penelepon, tujuan, isi pesan..."
						class="bg-transparent text-xs text-on-surface border-0 outline-none w-full"
					/>
				</div>

				<div class="flex flex-wrap items-center gap-2 w-full md:w-auto">
					<select
						bind:value={callUrgencyFilter}
						class="px-3.5 py-2 rounded-xl bg-surface-container-low border-0 text-xs text-on-surface font-medium cursor-pointer"
					>
						<option value="ALL">Semua Tingkat Urgensi</option>
						<option value="MENDESAK">🚨 Mendesak (Segera)</option>
						<option value="PENTING">⚠️ Penting</option>
						<option value="NORMAL">Normal</option>
					</select>

					<select
						bind:value={callStatusFilter}
						class="px-3.5 py-2 rounded-xl bg-surface-container-low border-0 text-xs text-on-surface font-medium cursor-pointer"
					>
						<option value="ALL">Semua Status Panggilan</option>
						<option value="PENDING">Menunggu Tindak Lanjut</option>
						<option value="SELESAI">Sudah Selesai</option>
					</select>
				</div>
			</div>

			<!-- Call Table -->
			<div class="rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 shadow-2xs overflow-hidden">
				<div class="overflow-x-auto">
					<table class="w-full text-left text-xs">
						<thead class="bg-surface-container-low text-on-surface-variant uppercase text-[10px] font-bold tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
							<tr>
								<th class="py-3 px-4">Waktu Panggilan</th>
								<th class="py-3 px-4">Penelepon & Perusahaan</th>
								<th class="py-3 px-4">Tujuan (Karyawan & Dept)</th>
								<th class="py-3 px-4">Tindakan / Respon</th>
								<th class="py-3 px-4 text-center">Urgensi</th>
								<th class="py-3 px-4">Isi Pesan / Memo Panggilan</th>
								<th class="py-3 px-4 text-center">Status</th>
								<th class="py-3 px-4 text-center">Aksi</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
							{#each paginatedCalls as c (c.id)}
								<tr class="hover:bg-surface-container transition-colors {c.urgency === 'MENDESAK' && c.status === 'PENDING' ? 'bg-rose-50/40 dark:bg-rose-950/20' : ''}">
									<td class="py-3 px-4 font-mono font-bold text-on-surface whitespace-nowrap">
										{c.call_time}
									</td>
									<td class="py-3 px-4">
										<div class="font-bold text-on-surface">{c.caller_name}</div>
										<div class="text-[10px] text-on-surface-variant">{c.caller_company} • {c.caller_phone || '-'}</div>
									</td>
									<td class="py-3 px-4">
										<div class="font-bold text-on-surface">{c.target_employee_name}</div>
										<div class="text-[10px] text-on-surface-variant">{c.target_department}</div>
									</td>
									<td class="py-3 px-4 whitespace-nowrap">
										<span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-surface-container-high text-on-surface">
											{c.action_taken === 'TERHUBUNG_LANGSUNG' ? '📞 Terhubung' : c.action_taken === 'TITIP_PESAN' ? '📝 Titip Pesan' : c.action_taken}
										</span>
									</td>
									<td class="py-3 px-4 text-center whitespace-nowrap">
										<span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase {c.urgency === 'MENDESAK' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300' : c.urgency === 'PENTING' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300' : 'bg-slate-100 text-slate-700'}">
											{c.urgency}
										</span>
									</td>
									<td class="py-3 px-4 max-w-sm text-on-surface leading-snug">
										{c.message_content || '-'}
									</td>
									<td class="py-3 px-4 text-center whitespace-nowrap">
										<span class="px-2 py-0.5 rounded text-[10px] font-bold {c.status === 'SELESAI' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-300'}">
											{c.status}
										</span>
									</td>
									<td class="py-3 px-4 text-center whitespace-nowrap">
										<div class="flex items-center justify-center gap-1">
											{#if c.status === 'PENDING'}
												<form method="POST" action="?/updateCallStatus" use:enhance class="inline">
													<input type="hidden" name="id" value={c.id} />
													<input type="hidden" name="status" value="SELESAI" />
													<button type="submit" class="px-2 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-[10px] cursor-pointer">
														Selesai
													</button>
												</form>
											{/if}
											<form
												method="POST"
												action="?/deleteCallLog"
												use:enhance={() => {
													if (!confirm(`Hapus catatan panggilan ini?`)) return ({ cancel }: any) => cancel();
												}}
												class="inline"
											>
												<input type="hidden" name="id" value={c.id} />
												<button type="submit" class="p-1 rounded text-rose-500 hover:bg-rose-50 cursor-pointer">
													<span class="material-symbols-outlined text-base">delete</span>
												</button>
											</form>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<Pagination
					currentPage={callPage}
					totalPages={Math.max(1, Math.ceil(filteredCalls.length / callPerPage))}
					totalItems={filteredCalls.length}
					perPage={callPerPage}
					itemLabel="panggilan"
					onPageChange={(p) => (callPage = p)}
				/>
			</div>
		</div>
	{/if}
</div>

<!-- ==================== MODAL: CHECK-IN BUKU TAMU ==================== -->
{#if showCheckInModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
		<div class="bg-surface-container-lowest rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
			<div class="px-6 py-4 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
				<div class="flex items-center gap-2.5">
					<div class="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center">
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
						<label class="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">Nama Lengkap Tamu *</label>
						<input
							type="text"
							name="visitor_name"
							required
							placeholder="Contoh: Budi Santoso"
							class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-xs text-on-surface border-0 outline-none focus:ring-2 focus:ring-teal-500/40"
						/>
					</div>
					<div>
						<label class="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">Perusahaan / Instansi *</label>
						<input
							type="text"
							name="company"
							required
							placeholder="Contoh: PT Krakatau Posco"
							class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-xs text-on-surface border-0 outline-none focus:ring-2 focus:ring-teal-500/40"
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
							class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-xs text-on-surface border-0 outline-none focus:ring-2 focus:ring-teal-500/40"
						/>
					</div>
					<div>
						<label class="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">No. Kartu Tamu (Badge)</label>
						<input
							type="text"
							name="badge_number"
							placeholder="Contoh: 05"
							class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-xs text-on-surface border-0 outline-none focus:ring-2 focus:ring-teal-500/40 font-mono"
						/>
					</div>
					<div>
						<label class="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">Kota / Alamat</label>
						<input
							type="text"
							name="address"
							placeholder="Cilegon / Jakarta"
							class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-xs text-on-surface border-0 outline-none focus:ring-2 focus:ring-teal-500/40"
						/>
					</div>
				</div>

				<div class="pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
					<label class="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">Pilih Karyawan yang Ditemui (Opsional - Auto Fill)</label>
					<select
						value={selectedEmpNik}
						onchange={(e) => handleEmployeeChange((e.currentTarget as HTMLSelectElement).value)}
						class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-xs text-on-surface border-0 outline-none focus:ring-2 focus:ring-teal-500/40 mb-3"
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
								class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-xs text-on-surface border-0 outline-none focus:ring-2 focus:ring-teal-500/40"
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
								class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-xs text-on-surface border-0 outline-none focus:ring-2 focus:ring-teal-500/40"
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
						class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-xs text-on-surface border-0 outline-none focus:ring-2 focus:ring-teal-500/40"
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
						class="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs cursor-pointer"
					>
						Simpan Check-In
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- ==================== MODAL: CHECKOUT & SURVEI TAMU ==================== -->
{#if selectedVisitorForCheckout}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
		<div class="bg-surface-container-lowest rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-md overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
			<div class="px-6 py-4 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
				<div class="flex items-center gap-2.5">
					<div class="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
						<span class="material-symbols-outlined text-xl">sentiment_satisfied</span>
					</div>
					<div>
						<h3 class="text-sm font-black text-on-surface">Check-Out & Survei Layanan Tamu</h3>
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

				<div class="text-xs text-on-surface-variant bg-surface-container-low p-3.5 rounded-xl space-y-1">
					<div><strong class="text-on-surface">Karyawan Ditemui:</strong> {selectedVisitorForCheckout.host_name} ({selectedVisitorForCheckout.host_department})</div>
					<div><strong class="text-on-surface">Keperluan:</strong> {selectedVisitorForCheckout.purpose}</div>
					<div><strong class="text-on-surface">Kartu Tamu:</strong> #{selectedVisitorForCheckout.badge_number}</div>
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
						class="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs cursor-pointer"
					>
						Simpan & Selesai
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- ==================== MODAL: CATAT DOKUMEN / PAKET BARU ==================== -->
{#if isCreateDocOpen}
	<div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
		<div class="bg-surface-container-lowest rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
			<div class="p-5 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-teal-600">markunread_mailbox</span>
					<h3 class="font-bold text-base text-on-surface">Pencatatan Dokumen & Paket</h3>
				</div>
				<button onclick={() => (isCreateDocOpen = false)} class="text-on-surface-variant hover:text-on-surface">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<form
				method="POST"
				action="?/createDocument"
				enctype="multipart/form-data"
				use:enhance={() => {
					return async ({ result, update }) => {
						await update();
						if (result.type === 'success') isCreateDocOpen = false;
					};
				}}
				class="p-6 space-y-3.5 text-xs"
			>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="doc_dir" class="block font-bold mb-1">Arah Distribusi *</label>
						<select id="doc_dir" name="direction" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none">
							<option value="INCOMING">📥 Masuk (Dari Luar)</option>
							<option value="OUTGOING">📤 Keluar (Ke Luar)</option>
						</select>
					</div>
					<div>
						<label for="doc_tp" class="block font-bold mb-1">Jenis Dokumen / Paket</label>
						<select id="doc_tp" name="doc_type" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none">
							<option value="SURAT_DINAS">Surat Dinas / Resmi</option>
							<option value="PAKET_BARANG">Paket Barang / Logistik</option>
							<option value="BERKAS_KONTRAK">Berkas Perjanjian / Kontrak</option>
							<option value="DOKUMEN_LEGAL">Dokumen Legal / Pajak</option>
							<option value="LAINNYA">Lainnya</option>
						</select>
					</div>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="doc_track" class="block font-bold mb-1">Nomor Resi / Nomor Surat</label>
						<input id="doc_track" type="text" name="tracking_number" placeholder="JNE12345678 / NO: 042/BCS/2026" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none font-mono" />
					</div>
					<div>
						<label for="doc_cour" class="block font-bold mb-1">Ekspedisi / Kurir Pengantar</label>
						<input id="doc_cour" type="text" name="courier_name" placeholder="JNE / J&T / SiCepat / Kurir Internal" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none" />
					</div>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="doc_sndr" class="block font-bold mb-1">Nama Pengirim *</label>
						<input id="doc_sndr" type="text" name="sender_name" required placeholder="Nama pengirim" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none" />
					</div>
					<div>
						<label for="doc_scomp" class="block font-bold mb-1">Instansi / Perusahaan Pengirim</label>
						<input id="doc_scomp" type="text" name="sender_company" placeholder="Nama perusahaan asal" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none" />
					</div>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="doc_rcpt" class="block font-bold mb-1">Nama Penerima Tujuan *</label>
						<input id="doc_rcpt" type="text" name="recipient_name" required placeholder="Karyawan yang dituju" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none" />
					</div>
					<div>
						<label for="doc_rdept" class="block font-bold mb-1">Departemen Penerima</label>
						<input id="doc_rdept" type="text" name="recipient_department" placeholder="FINANCE / HRD / OPS" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none" />
					</div>
				</div>

				<div>
					<label for="doc_file" class="block font-bold mb-1">Upload Foto Fisik / Resi (Opsional)</label>
					<input id="doc_file" type="file" name="file" accept=".pdf,image/*" class="w-full text-xs p-2 rounded-xl bg-surface-container-low border border-dashed border-slate-300 dark:border-slate-700" />
				</div>

				<div class="flex justify-end gap-2 pt-2">
					<button type="button" onclick={() => (isCreateDocOpen = false)} class="px-4 py-2 rounded-xl bg-surface-container-low font-bold cursor-pointer">Batal</button>
					<button type="submit" class="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold cursor-pointer">Simpan Dokumen</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- ==================== MODAL: SERAH TERIMA DOKUMEN ==================== -->
{#if isHandoverDocOpen && selectedDocForHandover}
	<div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
		<div class="bg-surface-container-lowest rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden p-6 space-y-4 text-xs">
			<div class="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
				<h3 class="font-bold text-sm text-on-surface">Serah Terima Fisik Dokumen</h3>
				<button onclick={() => (isHandoverDocOpen = false)} class="text-on-surface-variant hover:text-on-surface">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<div class="p-3 rounded-2xl bg-surface-container-low">
				<p class="font-bold text-on-surface">Resi: {selectedDocForHandover.tracking_number || '-'}</p>
				<p class="text-[11px] text-on-surface-variant">Dari: {selectedDocForHandover.sender_name} ➔ Untuk: {selectedDocForHandover.recipient_name} ({selectedDocForHandover.recipient_department})</p>
			</div>

			<form
				method="POST"
				action="?/handoverDocument"
				use:enhance={() => {
					return async ({ result, update }) => {
						await update();
						if (result.type === 'success') isHandoverDocOpen = false;
					};
				}}
				class="space-y-3"
			>
				<input type="hidden" name="id" value={selectedDocForHandover.id} />
				<div>
					<label for="hand_doc_to" class="block font-bold mb-1">Nama Staf Penerima Fisik *</label>
					<input id="hand_doc_to" type="text" name="handed_over_to" required value={selectedDocForHandover.recipient_name} placeholder="Nama yang mengambil berkas" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none" />
				</div>
				<div>
					<label for="hand_doc_note" class="block font-bold mb-1">Catatan Tambahan (Opsional)</label>
					<input id="hand_doc_note" type="text" name="notes" placeholder="Diterima oleh sekretaris / staf..." class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none" />
				</div>
				<div class="flex justify-end gap-2 pt-2">
					<button type="button" onclick={() => (isHandoverDocOpen = false)} class="px-4 py-2 rounded-xl bg-surface-container-low font-bold cursor-pointer">Batal</button>
					<button type="submit" class="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold cursor-pointer">Konfirmasi Serah Terima</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- ==================== MODAL: TERIMA INVOICE VENDOR BARU ==================== -->
{#if isCreateInvOpen}
	<div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
		<div class="bg-surface-container-lowest rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
			<div class="p-5 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-teal-600">receipt_long</span>
					<h3 class="font-bold text-base text-on-surface">Penerimaan Invoice Tagihan Vendor</h3>
				</div>
				<button onclick={() => (isCreateInvOpen = false)} class="text-on-surface-variant hover:text-on-surface">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<form
				method="POST"
				action="?/createInvoice"
				enctype="multipart/form-data"
				use:enhance={() => {
					return async ({ result, update }) => {
						await update();
						if (result.type === 'success') isCreateInvOpen = false;
					};
				}}
				class="p-6 space-y-3.5 text-xs"
			>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="inv_vnd" class="block font-bold mb-1">Nama Vendor / Supplier *</label>
						<input id="inv_vnd" type="text" name="vendor_name" required placeholder="PT Sumber Berkat Abadi" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none" />
					</div>
					<div>
						<label for="inv_no" class="block font-bold mb-1">Nomor Invoice Vendor *</label>
						<input id="inv_no" type="text" name="invoice_number" required placeholder="INV/2026/0991" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none font-mono" />
					</div>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="inv_po" class="block font-bold mb-1">Nomor PO / SPK Terkait</label>
						<input id="inv_po" type="text" name="po_number" placeholder="PO-2026-0012" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none font-mono" />
					</div>
					<div>
						<label for="inv_amt" class="block font-bold mb-1">Nominal Tagihan (Rp) *</label>
						<input id="inv_amt" type="number" step="1000" name="amount" required placeholder="15000000" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none font-mono" />
					</div>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="inv_rcv_dt" class="block font-bold mb-1">Tanggal Terima Fisik *</label>
						<input id="inv_rcv_dt" type="date" name="received_date" value={new Date().toISOString().split('T')[0]} required class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none" />
					</div>
					<div>
						<label for="inv_due_dt" class="block font-bold mb-1">Tanggal Jatuh Tempo (Jika Ada)</label>
						<input id="inv_due_dt" type="date" name="due_date" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none" />
					</div>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="inv_cour" class="block font-bold mb-1">Nama Pengantar / Kurir</label>
						<input id="inv_cour" type="text" name="courier_sender" placeholder="Diantar langsung oleh sales / kurir" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none" />
					</div>
					<div>
						<label for="inv_rcp_name" class="block font-bold mb-1">Resepsionis Penerima</label>
						<input id="inv_rcp_name" type="text" name="received_by_receptionist" value="Resepsionis GA" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none" />
					</div>
				</div>

				<div>
					<label for="inv_file" class="block font-bold mb-1">Upload Scan Cover Invoice / Berkas (PDF / Gambar)</label>
					<input id="inv_file" type="file" name="file" accept=".pdf,image/*" class="w-full text-xs p-2 rounded-xl bg-surface-container-low border border-dashed border-slate-300 dark:border-slate-700" />
				</div>

				<div class="flex justify-end gap-2 pt-2">
					<button type="button" onclick={() => (isCreateInvOpen = false)} class="px-4 py-2 rounded-xl bg-surface-container-low font-bold cursor-pointer">Batal</button>
					<button type="submit" class="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold cursor-pointer">Simpan & Terbitkan Tanda Terima</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- ==================== MODAL: SERAH TERIMA INVOICE KE FINANCE ==================== -->
{#if isHandoverInvOpen && selectedInvForHandover}
	<div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
		<div class="bg-surface-container-lowest rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden p-6 space-y-4 text-xs">
			<div class="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
				<h3 class="font-bold text-sm text-on-surface">Serah Terima Invoice ke Finance</h3>
				<button onclick={() => (isHandoverInvOpen = false)} class="text-on-surface-variant hover:text-on-surface">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<div class="p-3 rounded-2xl bg-surface-container-low">
				<p class="font-mono text-teal-700 dark:text-teal-400 font-black">{selectedInvForHandover.receipt_number}</p>
				<p class="font-bold text-on-surface mt-0.5">{selectedInvForHandover.vendor_name} • Inv: {selectedInvForHandover.invoice_number}</p>
				<p class="text-cyan-700 dark:text-cyan-400 font-mono font-bold mt-1">{formatRupiah(selectedInvForHandover.amount)}</p>
			</div>

			<form
				method="POST"
				action="?/handoverInvoiceToFinance"
				use:enhance={() => {
					return async ({ result, update }) => {
						await update();
						if (result.type === 'success') isHandoverInvOpen = false;
					};
				}}
				class="space-y-3"
			>
				<input type="hidden" name="id" value={selectedInvForHandover.id} />
				<div>
					<label for="fin_rec_name" class="block font-bold mb-1">Nama Staf Finance Penerima *</label>
					<input id="fin_rec_name" type="text" name="finance_recipient_name" required placeholder="Staf AP / Finance Officer" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none" />
				</div>
				<div>
					<label for="fin_snd_name" class="block font-bold mb-1">Diserahkan Oleh</label>
					<input id="fin_snd_name" type="text" name="handed_to_finance_by" value="Resepsionis GA" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none" />
				</div>
				<div class="flex justify-end gap-2 pt-2">
					<button type="button" onclick={() => (isHandoverInvOpen = false)} class="px-4 py-2 rounded-xl bg-surface-container-low font-bold cursor-pointer">Batal</button>
					<button type="submit" class="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold cursor-pointer">Serahkan ke Finance</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- ==================== MODAL: REGISTRASI PROPOSAL MASUK ==================== -->
{#if isCreatePropOpen}
	<div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
		<div class="bg-surface-container-lowest rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
			<div class="p-5 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-teal-600">post_add</span>
					<h3 class="font-bold text-base text-on-surface">Pencatatan Proposal & Penawaran Masuk</h3>
				</div>
				<button onclick={() => (isCreatePropOpen = false)} class="text-on-surface-variant hover:text-on-surface">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<form
				method="POST"
				action="?/createProposal"
				enctype="multipart/form-data"
				use:enhance={() => {
					return async ({ result, update }) => {
						await update();
						if (result.type === 'success') isCreatePropOpen = false;
					};
				}}
				class="p-6 space-y-3.5 text-xs"
			>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="prop_org" class="block font-bold mb-1">Instansi / Organisasi Pengirim *</label>
						<input id="prop_org" type="text" name="sender_organization" required placeholder="Universitas / Mitra Bisnis / Panitia" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none" />
					</div>
					<div>
						<label for="prop_cat" class="block font-bold mb-1">Kategori Proposal *</label>
						<select id="prop_cat" name="category" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none">
							<option value="PENAWARAN_HARGA">Penawaran Harga / Bisnis</option>
							<option value="SPONSORSHIP">Sponsorship / Event</option>
							<option value="CSR_SOSIAL">Bantuan Sosial / CSR</option>
							<option value="KERJASAMA">Kerjasama Strategis</option>
							<option value="LAINNYA">Lainnya</option>
						</select>
					</div>
				</div>

				<div>
					<label for="prop_ttl" class="block font-bold mb-1">Judul / Perihal Proposal *</label>
					<input id="prop_ttl" type="text" name="title" required placeholder="Misal: Proposal Kerjasama Pengiriman Logistik Cilegon 2026" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none" />
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="prop_pic" class="block font-bold mb-1">Nama Kontak PIC Pengirim</label>
						<input id="prop_pic" type="text" name="contact_person" placeholder="Bpk. Hendra" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none" />
					</div>
					<div>
						<label for="prop_phn" class="block font-bold mb-1">No. HP / Kontak Pengirim</label>
						<input id="prop_phn" type="text" name="contact_phone" placeholder="08xxxxxxxx" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none" />
					</div>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="prop_rcpt" class="block font-bold mb-1">Ditujukan Kepada *</label>
						<input id="prop_rcpt" type="text" name="target_recipient" required value="Direktur Utama" placeholder="Direksi / GM / Marketing Head" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none" />
					</div>
					<div>
						<label for="prop_dt" class="block font-bold mb-1">Tanggal Terima *</label>
						<input id="prop_dt" type="date" name="received_date" value={new Date().toISOString().split('T')[0]} required class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none" />
					</div>
				</div>

				<div>
					<label for="prop_file" class="block font-bold mb-1">Lampirkan File Proposal (PDF / Scan)</label>
					<input id="prop_file" type="file" name="file" accept=".pdf,image/*" class="w-full text-xs p-2 rounded-xl bg-surface-container-low border border-dashed border-slate-300 dark:border-slate-700" />
				</div>

				<div class="flex justify-end gap-2 pt-2">
					<button type="button" onclick={() => (isCreatePropOpen = false)} class="px-4 py-2 rounded-xl bg-surface-container-low font-bold cursor-pointer">Batal</button>
					<button type="submit" class="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold cursor-pointer">Simpan Proposal</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- ==================== MODAL: DISPOSISI PROPOSAL ==================== -->
{#if isDisposisiPropOpen && selectedPropForDisposisi}
	<div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
		<div class="bg-surface-container-lowest rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden p-6 space-y-4 text-xs">
			<div class="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
				<h3 class="font-bold text-sm text-on-surface">Update Disposisi Proposal</h3>
				<button onclick={() => (isDisposisiPropOpen = false)} class="text-on-surface-variant hover:text-on-surface">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<div class="p-3 rounded-2xl bg-surface-container-low">
				<p class="font-bold text-on-surface">{selectedPropForDisposisi.title}</p>
				<p class="text-[11px] text-on-surface-variant">{selectedPropForDisposisi.sender_organization} • Ditujukan: {selectedPropForDisposisi.target_recipient}</p>
			</div>

			<form
				method="POST"
				action="?/updateProposalDisposition"
				use:enhance={() => {
					return async ({ result, update }) => {
						await update();
						if (result.type === 'success') isDisposisiPropOpen = false;
					};
				}}
				class="space-y-3"
			>
				<input type="hidden" name="id" value={selectedPropForDisposisi.id} />
				<div>
					<label for="disp_st" class="block font-bold mb-1">Status Disposisi *</label>
					<select id="disp_st" name="status" value={selectedPropForDisposisi.status} class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none">
						<option value="MENUNGGU_REVIEW">Menunggu Review</option>
						<option value="DITERUSKAN">Diteruskan ke Manajemen Terkait</option>
						<option value="DISETUJUI">Disetujui</option>
						<option value="DITOLAK">Ditolak</option>
					</select>
				</div>
				<div>
					<label for="disp_note" class="block font-bold mb-1">Catatan Arahan Disposisi</label>
					<textarea id="disp_note" name="disposition_notes" rows="3" placeholder="Arahan tindak lanjut dari direksi / manajer..." class="w-full p-3 rounded-xl bg-surface-container-low border-0 outline-none resize-none"></textarea>
				</div>
				<div>
					<label for="disp_by" class="block font-bold mb-1">Disposisi Oleh</label>
					<input id="disp_by" type="text" name="disposition_by" value="Manajemen GA" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none" />
				</div>
				<div class="flex justify-end gap-2 pt-2">
					<button type="button" onclick={() => (isDisposisiPropOpen = false)} class="px-4 py-2 rounded-xl bg-surface-container-low font-bold cursor-pointer">Batal</button>
					<button type="submit" class="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold cursor-pointer">Simpan Disposisi</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- ==================== MODAL: CATAT PANGGILAN TELEPON ==================== -->
{#if isCreateCallOpen}
	<div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
		<div class="bg-surface-container-lowest rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
			<div class="p-5 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-teal-600">add_call</span>
					<h3 class="font-bold text-base text-on-surface">Pencatatan Panggilan Telepon Meja Depan</h3>
				</div>
				<button onclick={() => (isCreateCallOpen = false)} class="text-on-surface-variant hover:text-on-surface">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<form
				method="POST"
				action="?/createCallLog"
				use:enhance={() => {
					return async ({ result, update }) => {
						await update();
						if (result.type === 'success') isCreateCallOpen = false;
					};
				}}
				class="p-6 space-y-3.5 text-xs"
			>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="call_name" class="block font-bold mb-1">Nama Penelepon *</label>
						<input id="call_name" type="text" name="caller_name" required placeholder="Bpk. Rahmat" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none" />
					</div>
					<div>
						<label for="call_comp" class="block font-bold mb-1">Perusahaan / Instansi</label>
						<input id="call_comp" type="text" name="caller_company" placeholder="Kementerian Perhubungan" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none" />
					</div>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="call_phn" class="block font-bold mb-1">Nomor Telepon Penelepon</label>
						<input id="call_phn" type="text" name="caller_phone" placeholder="021-xxxxxx / 08xxxx" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none font-mono" />
					</div>
					<div>
						<label for="call_urg" class="block font-bold mb-1">Tingkat Urgensi *</label>
						<select id="call_urg" name="urgency" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none font-bold">
							<option value="NORMAL">Normal</option>
							<option value="PENTING">⚠️ Penting</option>
							<option value="MENDESAK">🚨 Mendesak (Segera Tangani)</option>
						</select>
					</div>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="call_target" class="block font-bold mb-1">Ditujukan Kepada Karyawan *</label>
						<input id="call_target" type="text" name="target_employee_name" required placeholder="Nama Karyawan" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none" />
					</div>
					<div>
						<label for="call_dept" class="block font-bold mb-1">Departemen Tujuan</label>
						<input id="call_dept" type="text" name="target_department" placeholder="FINANCE / OPS / HRD" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none" />
					</div>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="call_tp" class="block font-bold mb-1">Jenis Panggilan</label>
						<select id="call_tp" name="call_type" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none">
							<option value="INCOMING">📞 Panggilan Masuk</option>
							<option value="OUTGOING">📱 Panggilan Keluar</option>
						</select>
					</div>
					<div>
						<label for="call_act" class="block font-bold mb-1">Tindakan Resepsionis</label>
						<select id="call_act" name="action_taken" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border-0 outline-none">
							<option value="TITIP_PESAN">Titip Pesan / Memo</option>
							<option value="TERHUBUNG_LANGSUNG">Terhubung Langsung</option>
							<option value="TIDAK_TERJAWAB">Tidak Terjawab / Line Sibuk</option>
							<option value="SALAH_SAMBUNG">Salah Sambung</option>
						</select>
					</div>
				</div>

				<div>
					<label for="call_msg" class="block font-bold mb-1">Isi Pesan / Memo Panggilan</label>
					<textarea id="call_msg" name="message_content" rows="3" placeholder="Rincian pesan yang ditinggalkan oleh penelepon..." class="w-full p-3 rounded-xl bg-surface-container-low border-0 outline-none resize-none"></textarea>
				</div>

				<div class="flex justify-end gap-2 pt-2">
					<button type="button" onclick={() => (isCreateCallOpen = false)} class="px-4 py-2 rounded-xl bg-surface-container-low font-bold cursor-pointer">Batal</button>
					<button type="submit" class="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold cursor-pointer">Simpan Panggilan</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- ==================== MODAL: CETAK BUKTI TANDA TERIMA (RECEIPT SLIP) ==================== -->
{#if isReceiptModalOpen && receiptData}
	<div class="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
		<div class="bg-surface-container-lowest rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
			<div class="p-4 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-teal-600">receipt</span>
					<h3 class="font-bold text-sm text-on-surface">Pratinjau Lembar Bukti Tanda Terima</h3>
				</div>
				<button onclick={() => (isReceiptModalOpen = false)} class="text-on-surface-variant hover:text-on-surface">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<div class="p-6 flex flex-col items-center">
				<!-- PRINTABLE SLIP CONTAINER -->
				<div id="printable-receipt-slip" class="w-full max-w-md p-6 rounded-2xl border-2 border-slate-900 bg-white text-slate-900 shadow-md font-sans">
					<!-- Kop Slip -->
					<div class="flex items-center justify-between border-b-2 border-slate-900 pb-3 mb-4">
						<div class="flex items-center gap-2.5">
							<div class="w-8 h-8 rounded-lg bg-[#57344f] text-white font-black text-xs flex items-center justify-center">
								BCS
							</div>
							<div>
								<h4 class="font-black text-xs tracking-wider uppercase text-[#57344f] leading-none">
									PT BANGUN CAKRAWALA SARI
								</h4>
								<p class="text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-0.5">
									Bukti Tanda Terima Meja Depan (Front Desk)
								</p>
							</div>
						</div>
						<div class="text-right">
							<span class="text-[10px] font-mono font-black bg-slate-100 px-2 py-0.5 rounded border border-slate-300 block">
								{receiptData.receipt_number || receiptData.tracking_number || `REC-${receiptData.id}`}
							</span>
							<span class="text-[8px] text-slate-500 font-bold uppercase">{receiptType}</span>
						</div>
					</div>

					<!-- Isi Tanda Terima -->
					<div class="space-y-2 text-xs">
						{#if receiptType === 'INVOICE'}
							<div class="grid grid-cols-3 gap-1">
								<span class="text-slate-500 font-semibold">Vendor:</span>
								<span class="col-span-2 font-black text-slate-950">{receiptData.vendor_name}</span>
							</div>
							<div class="grid grid-cols-3 gap-1">
								<span class="text-slate-500 font-semibold">No. Invoice:</span>
								<span class="col-span-2 font-mono font-bold text-slate-900">{receiptData.invoice_number}</span>
							</div>
							{#if receiptData.po_number}
								<div class="grid grid-cols-3 gap-1">
									<span class="text-slate-500 font-semibold">No. PO/SPK:</span>
									<span class="col-span-2 font-mono text-slate-800">{receiptData.po_number}</span>
								</div>
							{/if}
							<div class="grid grid-cols-3 gap-1">
								<span class="text-slate-500 font-semibold">Nilai Tagihan:</span>
								<span class="col-span-2 font-mono font-black text-slate-950">{formatRupiah(receiptData.amount)}</span>
							</div>
							<div class="grid grid-cols-3 gap-1">
								<span class="text-slate-500 font-semibold">Tgl Diterima:</span>
								<span class="col-span-2 font-bold">{receiptData.received_date}</span>
							</div>
							<div class="grid grid-cols-3 gap-1">
								<span class="text-slate-500 font-semibold">Pengantar:</span>
								<span class="col-span-2">{receiptData.courier_sender || 'Kurir Langsung'}</span>
							</div>
						{:else}
							<div class="grid grid-cols-3 gap-1">
								<span class="text-slate-500 font-semibold">Pengirim:</span>
								<span class="col-span-2 font-black text-slate-950">{receiptData.sender_name} ({receiptData.sender_company || '-'})</span>
							</div>
							<div class="grid grid-cols-3 gap-1">
								<span class="text-slate-500 font-semibold">Penerima Tujuan:</span>
								<span class="col-span-2 font-black text-slate-950">{receiptData.recipient_name} ({receiptData.recipient_department})</span>
							</div>
							<div class="grid grid-cols-3 gap-1">
								<span class="text-slate-500 font-semibold">No. Resi/Surat:</span>
								<span class="col-span-2 font-mono font-bold">{receiptData.tracking_number || '-'}</span>
							</div>
							<div class="grid grid-cols-3 gap-1">
								<span class="text-slate-500 font-semibold">Kurir:</span>
								<span class="col-span-2">{receiptData.courier_name || '-'}</span>
							</div>
							<div class="grid grid-cols-3 gap-1">
								<span class="text-slate-500 font-semibold">Waktu Terima:</span>
								<span class="col-span-2 font-mono">{receiptData.received_at}</span>
							</div>
						{/if}
					</div>

					<!-- Tanda Tangan Paraf Dua Belah Pihak -->
					<div class="mt-8 pt-4 border-t border-dashed border-slate-300 grid grid-cols-2 gap-4 text-center text-[10px]">
						<div>
							<p class="text-slate-500 font-bold uppercase">Diserahkan Oleh</p>
							<div class="h-14"></div>
							<p class="font-bold text-slate-900 border-t border-slate-300 pt-1">
								{receiptData.courier_sender || receiptData.sender_name || '(Kurir / Pengantar)'}
							</p>
						</div>

						<div>
							<p class="text-slate-500 font-bold uppercase">Diterima Petugas GA</p>
							<div class="h-14"></div>
							<p class="font-bold text-slate-900 border-t border-slate-300 pt-1">
								{receiptData.received_by_receptionist || 'Resepsionis GA'}
							</p>
						</div>
					</div>

					<div class="mt-4 pt-2 border-t border-dashed border-slate-200 text-center text-[8px] text-slate-400 font-bold uppercase tracking-wider">
						Bukti tanda terima sah PT Bangun Cakrawala Sari • Meja Resepsionis Kantor Pusat
					</div>
				</div>

				<div class="flex items-center gap-2 w-full mt-6">
					<button
						type="button"
						onclick={() => window.print()}
						class="flex-1 py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer"
					>
						<span class="material-symbols-outlined text-base">print</span>
						<span>Cetak Slip Tanda Terima</span>
					</button>
					<button
						type="button"
						onclick={() => (isReceiptModalOpen = false)}
						class="py-2.5 px-4 rounded-xl bg-surface-container-low text-xs font-bold text-on-surface hover:bg-surface-container cursor-pointer"
					>
						Tutup
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- ==================== MODAL: PREVIEW FILE SCAN / PDF ==================== -->
{#if isPreviewOpen && previewItem}
	{@const filePath = previewItem.filePath}
	<div class="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex flex-col p-2 sm:p-4 animate-in fade-in duration-150">
		<div class="flex items-center justify-between bg-slate-900 text-white px-5 py-3 rounded-t-2xl">
			<div class="flex items-center gap-2.5 truncate pr-2">
				<span class="material-symbols-outlined text-teal-400 text-xl">{isPdf(filePath) ? 'picture_as_pdf' : 'image'}</span>
				<h4 class="font-bold text-xs truncate">{previewItem.title}</h4>
			</div>
			<div class="flex items-center gap-2 flex-shrink-0">
				<a href="/api/uploads/{filePath}" target="_blank" class="p-2 rounded-xl text-slate-300 hover:text-white" title="Buka Tab Baru">
					<span class="material-symbols-outlined text-lg">open_in_new</span>
				</a>
				<a href="/api/uploads/{filePath}" download class="p-2 rounded-xl text-slate-300 hover:text-white" title="Unduh File">
					<span class="material-symbols-outlined text-lg">download</span>
				</a>
				<button onclick={() => (isPreviewOpen = false)} class="p-2 rounded-xl text-slate-300 hover:text-white cursor-pointer" title="Tutup">
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>
		</div>

		<div class="flex-1 bg-slate-950 rounded-b-2xl overflow-hidden flex items-center justify-center p-2 relative">
			{#if isPdf(filePath)}
				<iframe src="/api/uploads/{filePath}#toolbar=1" title="Preview Dokumen" class="w-full h-full rounded border-0 bg-white"></iframe>
			{:else}
				<img src="/api/uploads/{filePath}" alt="Pratinjau File" class="max-w-full max-h-full object-contain rounded" />
			{/if}
		</div>
	</div>
{/if}

<style>
	@media print {
		:global(body *) {
			visibility: hidden !important;
		}
		:global(#printable-receipt-slip),
		:global(#printable-receipt-slip *) {
			visibility: visible !important;
		}
		:global(#printable-receipt-slip) {
			position: fixed !important;
			left: 50% !important;
			top: 50% !important;
			transform: translate(-50%, -50%) !important;
			width: 140mm !important;
			max-width: 140mm !important;
			border: 2px solid #000 !important;
			box-shadow: none !important;
		}
	}
</style>
