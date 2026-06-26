<script lang="ts">
	import { enhance } from '$app/forms';

	let {
		isOpen = $bindable(false),
		contract = null,
		initialMonthStr = '',
		dailyPlans = [],
		dispatches = [],
		monthlyTargets = [],
		onClose = () => {},
		onOpenMonthlyModal = () => {}
	} = $props<{
		isOpen: boolean;
		contract: any;
		initialMonthStr?: string;
		dailyPlans: any[];
		dispatches: any[];
		monthlyTargets?: any[];
		form?: any;
		onClose?: () => void;
		onOpenMonthlyModal?: (contract: any, monthStr: string) => void;
	}>();

	import { untrack } from 'svelte';
	
	let currentMonth = $state(new Date());
	let initializedContractId = $state<string | null>(null);
	let editingDate = $state<string | null>(null);
	let editTonnage = $state(0);
	let editRitase = $state(0);
	let editUnits = $state(0);
	let editNotes = $state('');
	let localError = $state('');
	let isGenerating = $state(false);

	$effect(() => {
		if (isOpen && contract?.startDate) {
			untrack(() => {
				if (initializedContractId !== contract.id) {
					if (initialMonthStr) {
						currentMonth = new Date(initialMonthStr + '-01T12:00:00');
					} else {
						currentMonth = new Date(contract.startDate);
					}
					initializedContractId = contract.id;
				}
			});
		} else if (!isOpen) {
			untrack(() => {
				initializedContractId = null;
			});
		}
	});

	// Calendar helpers
	function getDaysInMonth(date: Date): Date[] {
		const year = date.getFullYear();
		const month = date.getMonth();
		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);
		const days: Date[] = [];
		const startPad = (firstDay.getDay() + 6) % 7;
		for (let i = startPad - 1; i >= 0; i--) {
			days.push(new Date(year, month, -i));
		}
		for (let i = 1; i <= lastDay.getDate(); i++) {
			days.push(new Date(year, month, i));
		}
		while (days.length < 42) {
			days.push(new Date(year, month + 1, days.length - lastDay.getDate() - startPad + 1));
		}
		return days;
	}

	function formatDateKey(d: Date): string {
		const year = d.getFullYear();
		const month = String(d.getMonth() + 1).padStart(2, '0');
		const day = String(d.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}
	function isCurrentMonth(d: Date): boolean {
		return d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear();
	}
	function isToday(d: Date): boolean {
		const today = new Date();
		return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
	}
	function isInContractRange(d: Date): boolean {
		if (!contract?.startDate || !contract?.endDate) return false;
		const start = new Date(contract.startDate); start.setHours(0,0,0,0);
		const end = new Date(contract.endDate); end.setHours(23,59,59,999);
		const check = new Date(d); check.setHours(12,0,0,0);
		return check >= start && check <= end;
	}

	let planMap = $derived(() => {
		const map: Record<string, any> = {};
		for (const p of dailyPlans) {
			const key = typeof p.plan_date === 'string' ? p.plan_date.split('T')[0] : new Date(p.plan_date).toISOString().split('T')[0];
			map[key] = p;
		}
		return map;
	});

	let dispatchMap = $derived(() => {
		const map: Record<string, any[]> = {};
		for (const d of dispatches) {
			const key = typeof d.trip_date === 'string' ? d.trip_date.split('T')[0] : new Date(d.trip_date).toISOString().split('T')[0];
			if (!map[key]) map[key] = [];
			map[key].push(d);
		}
		return map;
	});

	let calendarDays = $derived(getDaysInMonth(currentMonth));
	let monthLabel = $derived(currentMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }));

	// Filter plans for the CURRENT MONTH only
	let currentMonthPlans = $derived(dailyPlans.filter((p: any) => {
		const pDate = new Date(p.plan_date);
		return pDate.getMonth() === currentMonth.getMonth() && pDate.getFullYear() === currentMonth.getFullYear();
	}));

	let totalPlannedTonnage = $derived(currentMonthPlans.reduce((sum: number, p: any) => sum + Number(p.target_tonnage || 0), 0));

	// Tentukan target yang akan dibandingkan: target bulanan atau target kontrak
	let activeTargetTonnage = $derived.by(() => {
		if (Number(contract?.targetTonnage) === 0 && monthlyTargets && monthlyTargets.length > 0) {
			// Cari target bulanan yang sesuai dengan currentMonth
			const currentTarget = monthlyTargets.find((m: any) => {
				const mDate = new Date(m.target_month);
				return mDate.getMonth() === currentMonth.getMonth() && mDate.getFullYear() === currentMonth.getFullYear();
			});
			if (currentTarget) return Number(currentTarget.target_tonnage);
		}
		return Number(contract?.targetTonnage || 0);
	});

	let daysWithPlan = $derived.by(() => {
		let days = 0;
		let accumulated = 0;
		for (const p of currentMonthPlans) {
			const tonnage = Number(p.target_tonnage) || 0;
			if (tonnage > 0) {
				days++;
				accumulated += tonnage;
				if (activeTargetTonnage > 0 && accumulated >= activeTargetTonnage) {
					break;
				}
			}
		}
		return days;
	});

	function prevMonth() { currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1); }
	function nextMonth() { currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1); }

	let popupPosition = $state({ top: 0, left: 0, align: 'left', caretTop: 0 });

	function openEditDay(d: Date, event: MouseEvent) {
		if (!isInContractRange(d)) return;
		const key = formatDateKey(d);
		const plan = planMap()[key];
		editingDate = key;
		editTonnage = plan ? Number(plan.target_tonnage) : 0;
		editRitase = plan ? Number(plan.target_ritase) : 0;
		editUnits = plan ? Number(plan.target_units) : 0;
		editNotes = plan ? (plan.notes || '') : '';
		localError = '';

		// Calculate popup position based on the clicked cell
		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		const popupWidth = 320; 
		const windowWidth = window.innerWidth;
		
		let align = 'left';
		// Default: open to the right of the cell
		let left = rect.right + 12; 
		if (left + popupWidth > windowWidth - 20) {
			// If not enough space, open to the left of the cell
			align = 'right';
			left = rect.left - popupWidth - 12;
		}
		
		let top = rect.top - 100; 
		if (top < 20) top = 20;
		if (top + 600 > window.innerHeight) top = Math.max(20, window.innerHeight - 620);
		
		let caretTop = rect.top + (rect.height / 2) - top - 8;
		if (caretTop < 20) caretTop = 20;
		if (caretTop > 550) caretTop = 550;

		popupPosition = { top, left, align, caretTop };
	}

	function closeEdit() { editingDate = null; }
	function closeCalendar() { isOpen = false; onClose(); }

	// Dispatch data for editing date
	let editDateDispatches = $derived(() => {
		if (!editingDate) return [];
		return dispatchMap()[editingDate] || [];
	});

	let isLocked = $derived.by(() => {
		if (!editingDate) return false;
		const today = new Date();
		const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
		return editingDate <= todayStr;
	});

	let realizedTonnage = $derived(editDateDispatches().reduce((sum, trip) => sum + Number(trip.tonnage || 0), 0));
	let realizedRitase = $derived(editDateDispatches().length);
	let realizedUnits = $derived(new Set(editDateDispatches().map(t => t.unit)).size);

	const formatNum = (n: number) => new Intl.NumberFormat('id-ID').format(n || 0);
	const dayNames = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

	const statusColors: Record<string, string> = {
		'SCHEDULED': 'bg-amber-100 text-amber-700',
		'DISPATCHED': 'bg-sky-100 text-sky-700',
		'AT_ORIGIN': 'bg-indigo-100 text-indigo-700',
		'ON_ROUTE': 'bg-blue-100 text-blue-700',
		'AT_DESTINATION': 'bg-violet-100 text-violet-700',
		'RETURNING': 'bg-orange-100 text-orange-700',
		'COMPLETED': 'bg-emerald-100 text-emerald-700',
	};
</script>

{#if isOpen && contract}
<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onclick={closeCalendar}></div>
	<div class="relative w-full max-w-5xl bg-surface-container-lowest rounded-[24px] shadow-2xl flex flex-col overflow-hidden max-h-[92vh]">
		
		<!-- Header -->
		<div class="p-6 border-b border-surface-container bg-indigo-50/50 dark:bg-indigo-900/10 flex items-start justify-between">
			<div>
				<h3 class="text-xl font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
					<span class="material-symbols-outlined">calendar_month</span> Kalender Target Harian
				</h3>
				<p class="text-xs text-on-surface-variant mt-1">{contract.project} — {contract.customer}</p>
				<p class="text-[10px] text-on-surface-variant mt-0.5">Kontrak: {formatNum(activeTargetTonnage)} Ton | {contract.startDate} s/d {contract.endDate}</p>
			</div>
			<button onclick={closeCalendar} class="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors">
				<span class="material-symbols-outlined text-lg">close</span>
			</button>
		</div>

		<div class="p-6 overflow-y-auto flex-1">
			<!-- Summary + Generate -->
			<div class="flex flex-wrap items-center justify-between gap-4 mb-6">
				<!-- Stats Cards -->
				<div class="flex gap-4">
					{#if totalPlannedTonnage > activeTargetTonnage}
						<div class="bg-surface-container-low px-4 py-2 rounded-xl border border-surface-container">
							<p class="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">Target Terpenuhi</p>
							<p class="text-lg font-black text-indigo-600">{formatNum(activeTargetTonnage)} <span class="text-xs font-medium text-on-surface-variant">Ton</span></p>
						</div>
						<div class="bg-orange-50 dark:bg-orange-900/20 px-4 py-2 rounded-xl border border-orange-200/50 dark:border-orange-500/30">
							<p class="text-[9px] font-bold text-orange-600 uppercase tracking-wider">Extra Muatan</p>
							<p class="text-lg font-black text-orange-600">+{formatNum(totalPlannedTonnage - activeTargetTonnage)} <span class="text-xs font-medium text-orange-600/80">Ton</span></p>
						</div>
						<div class="bg-surface-container-low px-4 py-2 rounded-xl border border-surface-container">
							<p class="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">Total Keseluruhan</p>
							<p class="text-lg font-black text-indigo-900 dark:text-indigo-200">{formatNum(totalPlannedTonnage)} <span class="text-xs font-medium text-on-surface-variant">Ton</span></p>
						</div>
					{:else}
						<div class="bg-surface-container-low px-4 py-2 rounded-xl border border-surface-container">
							<p class="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">Total Direncanakan</p>
							<p class="text-lg font-black text-indigo-600">{formatNum(totalPlannedTonnage)} <span class="text-xs font-medium text-on-surface-variant">Ton</span></p>
						</div>
						<div class="bg-surface-container-low px-4 py-2 rounded-xl border border-surface-container">
							<p class="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">Sisa Belum Direncanakan</p>
							<p class="text-lg font-black {activeTargetTonnage - totalPlannedTonnage > 0 ? 'text-amber-600' : 'text-emerald-600'}">{formatNum(Math.max(0, activeTargetTonnage - totalPlannedTonnage))} <span class="text-xs font-medium text-on-surface-variant">Ton</span></p>
						</div>
					{/if}
					<div class="bg-surface-container-low px-4 py-2 rounded-xl border border-surface-container">
						<p class="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">Hari Terencana</p>
						<p class="text-lg font-black text-sky-600">{daysWithPlan} <span class="text-xs font-medium text-on-surface-variant">Hari</span></p>
					</div>
				</div>
				{#if Number(contract?.targetTonnage) > 0}
					<form method="POST" action="?/generatePlan" use:enhance={() => {
						isGenerating = true;
						return async ({ update }) => { await update(); isGenerating = false; };
					}}>
						<input type="hidden" name="contractId" value={contract.id} />
						<button type="submit" disabled={isGenerating} class="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50">
							<span class="material-symbols-outlined text-lg">{isGenerating ? 'hourglass_top' : 'auto_fix_high'}</span>
							{isGenerating ? 'Generating...' : 'Generate Otomatis'}
						</button>
					</form>
				{:else}
					<button onclick={() => {
						// Pass target month string formatted from currentMonth
						const currentMonthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
						onOpenMonthlyModal(contract, currentMonthStr);
					}} class="bg-indigo-50 text-indigo-700 px-5 py-2.5 rounded-xl text-sm font-semibold border border-indigo-200 hover:bg-indigo-100 transition-colors flex items-center gap-2">
						<span class="material-symbols-outlined text-lg">edit_calendar</span>
						Set Target Bulanan
					</button>
				{/if}
			</div>

			<!-- Month Navigation -->
			<div class="flex items-center justify-between mb-4">
				<button onclick={prevMonth} class="w-9 h-9 rounded-xl bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors">
					<span class="material-symbols-outlined">chevron_left</span>
				</button>
				<h4 class="text-base font-black text-on-surface capitalize">{monthLabel}</h4>
				<button onclick={nextMonth} class="w-9 h-9 rounded-xl bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors">
					<span class="material-symbols-outlined">chevron_right</span>
				</button>
			</div>

			<!-- Calendar Grid -->
			<div class="grid grid-cols-7 gap-1">
				{#each dayNames as day}
					<div class="text-center text-[10px] font-black text-on-surface-variant uppercase tracking-wider py-2">{day}</div>
				{/each}

				{#each calendarDays as d}
					{@const key = formatDateKey(d)}
					{@const plan = planMap()[key]}
					{@const dayDispatches = dispatchMap()[key] || []}
					{@const inRange = isInContractRange(d)}
					{@const isCurrMonth = isCurrentMonth(d)}
					{@const hasPlan = plan && Number(plan.target_tonnage) > 0}
					{@const isEditable = inRange && activeTargetTonnage > 0}
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div 
						class="min-h-[72px] rounded-xl border p-1.5 transition-all duration-150
							{isCurrMonth ? '' : 'opacity-30'}
							{isToday(d) ? 'ring-2 ring-indigo-500' : ''}
							{isEditable ? 'cursor-pointer hover:shadow-md hover:scale-[1.02]' : (inRange ? 'cursor-not-allowed opacity-75' : 'cursor-default')}
							{hasPlan ? 'bg-sky-50 dark:bg-sky-900/10 border-sky-200 dark:border-sky-800' : 'border-surface-container bg-surface-container-low/30'}
						"
						onclick={(e) => { if (isEditable) openEditDay(d, e); }}
					>
						<div class="flex items-center justify-between">
							<p class="text-[11px] font-bold {isToday(d) ? 'text-indigo-600' : 'text-on-surface-variant'}">{d.getDate()}</p>
							{#if dayDispatches.length > 0}
								<span class="w-4 h-4 rounded-full bg-sky-500 text-white text-[8px] font-black flex items-center justify-center">{dayDispatches.length}</span>
							{/if}
						</div>
						{#if inRange && hasPlan}
							<p class="text-[10px] font-black text-sky-700 dark:text-sky-400 mt-0.5">{formatNum(Number(plan.target_tonnage))}t</p>
							<p class="text-[9px] text-on-surface-variant">{plan.target_ritase}rit · {plan.target_units}u</p>
						{:else if inRange}
							<p class="text-[9px] text-on-surface-variant/50 mt-1 italic">—</p>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	</div>
</div>

<!-- Date Detail Popup Modal (Apple Mac Style Popover) -->
{#if editingDate}
{@const displayDate = new Date(editingDate + 'T12:00:00')} <!-- Use midday to avoid any timezone shifting -->
<div class="fixed inset-0 z-[60]">
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- Invisible overlay to close popover when clicking outside -->
	<div class="absolute inset-0 bg-transparent" onclick={closeEdit}></div>
	
	<!-- Glassmorphism Floating Card -->
	<div class="absolute w-[320px] bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/60 dark:border-white/10 transition-all z-10 flex flex-col"
		 style="left: {popupPosition.left}px; top: {popupPosition.top}px; max-height: calc(100vh - 40px);">
		
		<!-- Pointer Caret -->
		{#if popupPosition.align === 'left'}
			<div class="absolute w-4 h-4 bg-white/85 dark:bg-slate-900/85 border-l border-b border-white/60 dark:border-white/10 transform rotate-45 pointer-events-none z-0"
				 style="left: -8px; top: {popupPosition.caretTop}px; backdrop-filter: blur(24px);"></div>
		{:else}
			<div class="absolute w-4 h-4 bg-white/85 dark:bg-slate-900/85 border-r border-t border-white/60 dark:border-white/10 transform rotate-45 pointer-events-none z-0"
				 style="right: -8px; top: {popupPosition.caretTop}px; backdrop-filter: blur(24px);"></div>
		{/if}

		<div class="relative w-full h-full rounded-2xl overflow-hidden flex flex-col z-20 bg-white/40 dark:bg-slate-900/40">
		
		<!-- Popup Header -->
		<div class="px-5 py-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between shrink-0">
			<div class="flex flex-col">
				<span class="text-[10px] font-bold text-sky-500 uppercase tracking-widest">{displayDate.toLocaleDateString('id-ID', { weekday: 'long' })}</span>
				<h4 class="text-xl font-medium text-slate-800 dark:text-slate-100 tracking-tight">
					{displayDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
				</h4>
			</div>
			<button onclick={closeEdit} class="w-7 h-7 rounded-full bg-slate-200/50 hover:bg-slate-300/50 dark:bg-slate-700/50 dark:hover:bg-slate-600/50 flex items-center justify-center text-slate-500 dark:text-slate-400 transition-colors">
				<span class="material-symbols-outlined text-[16px]">close</span>
			</button>
		</div>

		<!-- Popup Body -->
		<div class="p-5 space-y-5 overflow-y-auto custom-scrollbar">
			<!-- Realization Summary -->
			<div class="flex items-center gap-4 px-1">
				<div class="flex-1">
					<p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Target</p>
					<p class="text-sm font-black text-sky-600">{formatNum(editTonnage)} <span class="text-[10px] font-medium text-slate-500">Ton</span></p>
					<p class="text-[10px] text-slate-500">{editRitase} Rit · {editUnits} Unit</p>
				</div>
				<div class="w-px h-8 bg-slate-200 dark:bg-slate-700"></div>
				<div class="flex-1">
					<p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Realisasi</p>
					<div class="flex items-center gap-2">
						<p class="text-sm font-black {realizedTonnage >= editTonnage && editTonnage > 0 ? 'text-emerald-600' : 'text-amber-600'}">
							{formatNum(realizedTonnage)} <span class="text-[10px] font-medium text-slate-500">Ton</span>
						</p>
						{#if realizedTonnage > editTonnage && editTonnage > 0}
							<span class="text-[8px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded uppercase">Tambahan Muatan</span>
						{/if}
					</div>
					<p class="text-[10px] text-slate-500">{realizedRitase} Rit · {realizedUnits} Unit</p>
				</div>
			</div>

			<div class="h-[1px] w-full bg-black/5 dark:bg-white/5"></div>

			<!-- Edit Target Form -->
			<form method="POST" action="?/updateDayPlan" use:enhance={() => {
				localError = '';
				return async ({ update, result }) => { 
					await update(); 
					if (result.type === 'success' || result.type === 'redirect') {
						editingDate = null; 
					} else if (result.type === 'failure') {
						localError = result.data?.error || 'Terjadi kesalahan.';
					}
				};
			}}>
				<input type="hidden" name="contractId" value={contract.id} />
				<input type="hidden" name="planDate" value={editingDate} />

				{#if localError}
					<div class="mb-4 bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2 text-rose-600">
						<span class="material-symbols-outlined text-[16px] mt-0.5">error</span>
						<p class="text-xs font-medium leading-tight">{localError}</p>
					</div>
				{/if}

				{#if isLocked}
					<div class="mb-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-3 flex items-start gap-2">
						<span class="material-symbols-outlined text-amber-600 text-[16px] mt-0.5">lock</span>
						<p class="text-xs text-amber-800 dark:text-amber-400 leading-tight">Tanggal ini sudah berjalan atau berlalu. Target tidak dapat diubah lagi untuk menjaga riwayat.</p>
					</div>
				{/if}

				<div class="grid grid-cols-3 gap-3 mb-3">
					<div>
						<label class="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 ml-1">Tonase</label>
						<input type="number" name="targetTonnage" bind:value={editTonnage} step="0.01" min="0" disabled={isLocked} class="w-full bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-shadow disabled:opacity-50 disabled:cursor-not-allowed" />
					</div>
					<div>
						<label class="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 ml-1">Ritase</label>
						<input type="number" name="targetRitase" bind:value={editRitase} oninput={() => { editTonnage = editUnits * editRitase * (contract.unit_capacity || contract.master_capacity || 35); }} min="0" disabled={isLocked} class="w-full bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-shadow disabled:opacity-50 disabled:cursor-not-allowed" />
					</div>
					<div>
						<label class="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 ml-1">Unit</label>
						<input type="number" name="targetUnits" bind:value={editUnits} oninput={() => { editTonnage = editUnits * editRitase * (contract.unit_capacity || contract.master_capacity || 35); }} min="0" disabled={isLocked} class="w-full bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-shadow disabled:opacity-50 disabled:cursor-not-allowed" />
					</div>
				</div>
				<div class="mb-4">
					<label class="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 ml-1">Catatan</label>
					<input type="text" name="notes" bind:value={editNotes} placeholder="Tambahkan catatan (opsional)..." disabled={isLocked} class="w-full bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-shadow disabled:opacity-50 disabled:cursor-not-allowed" />
				</div>
				
				{#if !isLocked}
				<button type="submit" class="w-full bg-sky-500 text-white py-2 rounded-xl text-sm font-semibold hover:bg-sky-600 active:scale-[0.98] transition-all shadow-sm">
					Simpan Perubahan
				</button>
				{/if}
			</form>

			<div class="h-[1px] w-full bg-black/5 dark:bg-white/5"></div>

			<!-- Dispatched Units for this date -->
			<div>
				<p class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 px-1">Unit Ditugaskan ({editDateDispatches().length})</p>
				
				{#if editDateDispatches().length > 0}
					<div class="space-y-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
						{#each editDateDispatches() as trip}
							<div class="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30 hover:bg-white dark:hover:bg-slate-800 transition-colors">
								<div class="flex items-center gap-3">
									<div class="w-8 h-8 rounded-full bg-slate-200/50 dark:bg-slate-700/50 flex items-center justify-center text-slate-600 dark:text-slate-300">
										<span class="material-symbols-outlined text-[16px]">local_shipping</span>
									</div>
									<div class="leading-tight">
										<p class="text-xs font-semibold text-slate-800 dark:text-slate-200">{trip.unit}</p>
										<p class="text-[10px] text-slate-500 dark:text-slate-400">{trip.driver}</p>
									</div>
								</div>
								<div class="text-right leading-tight">
									<p class="text-xs font-bold text-slate-700 dark:text-slate-300 mb-0.5">{formatNum(Number(trip.tonnage))}t</p>
									<span class="text-[8px] font-bold px-1.5 py-0.5 rounded-md {statusColors[trip.status] || 'bg-slate-200 text-slate-600'}">{trip.status}</span>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<div class="text-center py-6 text-slate-400 dark:text-slate-500">
						<p class="text-xs font-medium">Belum ada armada untuk hari ini.</p>
					</div>
				{/if}
			</div>
		</div>
		</div>
	</div>
</div>

<style>
	/* Subtle custom scrollbar for the unit list */
	.custom-scrollbar::-webkit-scrollbar {
		width: 4px;
	}
	.custom-scrollbar::-webkit-scrollbar-track {
		background: transparent;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb {
		background: rgba(148, 163, 184, 0.3);
		border-radius: 4px;
	}
</style>
{/if}
{/if}
