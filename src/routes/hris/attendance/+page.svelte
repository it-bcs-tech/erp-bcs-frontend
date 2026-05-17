<script lang="ts">
	import type { PageData } from './$types';
	
	let { data }: { data: PageData } = $props();
	
	const { attendanceLogs, metrics } = data;

	let searchQuery = '';
	let dateFilter = '2026-05-07';
</script>

<svelte:head>
	<title>Time & Attendance | HRIS Dashboard</title>
</svelte:head>

<div class="flex flex-col h-full">
	<!-- Header & Actions -->
	<header class="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
		<div>
			<h1 class="text-3xl font-extrabold text-on-surface tracking-tight mb-2">Time & Attendance</h1>
			<p class="text-on-surface-variant font-medium text-sm">Monitor daily attendance records from the Mobile Presensi App</p>
		</div>
		<div class="flex gap-3">
			<button class="bg-surface-container-lowest border border-outline-variant/30 text-on-surface px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-surface-container-low transition-colors">
				<span class="material-symbols-outlined text-lg">download</span>
				Export Report
			</button>
			<button class="bg-primary text-on-primary px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm flex items-center gap-2 hover:bg-primary/90 transition-colors">
				<span class="material-symbols-outlined text-lg">map</span>
				Live GPS Map
			</button>
		</div>
	</header>

	<!-- Metrics Cards -->
	<div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
		<div class="bg-surface-container-lowest p-5 rounded-2xl border border-surface-container shadow-sm">
			<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Total Workforce</p>
			<div class="flex items-end justify-between">
				<h3 class="text-3xl font-black text-on-surface">{metrics.totalEmployees}</h3>
				<span class="material-symbols-outlined text-3xl text-surface-variant">group</span>
			</div>
		</div>
		<div class="bg-tertiary-container/20 p-5 rounded-2xl border border-tertiary/20 shadow-sm">
			<p class="text-xs font-bold text-tertiary uppercase tracking-wider mb-2">Present Today</p>
			<div class="flex items-end justify-between">
				<h3 class="text-3xl font-black text-tertiary">{metrics.presentToday}</h3>
				<span class="material-symbols-outlined text-3xl text-tertiary/50">how_to_reg</span>
			</div>
		</div>
		<div class="bg-error-container/20 p-5 rounded-2xl border border-error/20 shadow-sm">
			<p class="text-xs font-bold text-error uppercase tracking-wider mb-2">Late Check-In</p>
			<div class="flex items-end justify-between">
				<h3 class="text-3xl font-black text-error">{metrics.lateToday}</h3>
				<span class="material-symbols-outlined text-3xl text-error/50">schedule</span>
			</div>
		</div>
		<div class="bg-surface-container p-5 rounded-2xl border border-outline-variant/30 shadow-sm">
			<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Absent / No Log</p>
			<div class="flex items-end justify-between">
				<h3 class="text-3xl font-black text-on-surface-variant">{metrics.absentToday}</h3>
				<span class="material-symbols-outlined text-3xl text-on-surface-variant/50">person_off</span>
			</div>
		</div>
	</div>

	<!-- Filters & Search -->
	<div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
		<div class="flex gap-3">
			<input 
				type="date" 
				bind:value={dateFilter}
				class="bg-surface-container-lowest border border-outline-variant/30 text-on-surface rounded-xl py-2 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm font-medium shadow-sm"
			/>
			<select class="bg-surface-container-lowest border border-outline-variant/30 text-on-surface rounded-xl py-2 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm font-medium shadow-sm appearance-none cursor-pointer">
				<option value="All">All Departments</option>
				<option value="Engineering">Engineering</option>
				<option value="Logistics">Logistics</option>
				<option value="Marketing">Marketing</option>
			</select>
		</div>

		<div class="relative w-full lg:w-72 flex-shrink-0">
			<span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">search</span>
			<input 
				type="text" 
				bind:value={searchQuery}
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
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Employee</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Status</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Check In</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Check Out</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Location (GPS)</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-right">Details</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-surface-container">
					{#each attendanceLogs as log}
						<tr class="group hover:bg-surface-container-low transition-colors">
							<td class="py-4 px-6">
								<div class="flex items-center gap-3">
									<div class="w-10 h-10 rounded-full overflow-hidden bg-surface-container-high border border-outline-variant/30 flex-shrink-0">
										<img src={log.avatar} alt={log.employeeName} class="w-full h-full object-cover" />
									</div>
									<div>
										<p class="text-sm font-bold text-on-surface">{log.employeeName}</p>
										<p class="text-[11px] font-medium text-on-surface-variant mt-0.5">{log.employeeId} • {log.department}</p>
									</div>
								</div>
							</td>
							<td class="py-4 px-6">
								{#if log.status === 'On Time'}
									<span class="inline-flex items-center gap-1.5 text-tertiary font-bold text-[11px] bg-tertiary-container/30 px-2.5 py-1 rounded-md uppercase tracking-wider">
										<span class="w-1.5 h-1.5 rounded-full bg-tertiary"></span> On Time
									</span>
								{:else if log.status === 'Late'}
									<span class="inline-flex items-center gap-1.5 text-error font-bold text-[11px] bg-error-container/30 px-2.5 py-1 rounded-md uppercase tracking-wider">
										<span class="w-1.5 h-1.5 rounded-full bg-error"></span> Late
									</span>
								{:else}
									<span class="inline-flex items-center gap-1.5 text-on-surface-variant font-bold text-[11px] bg-surface-container-high px-2.5 py-1 rounded-md uppercase tracking-wider">
										<span class="w-1.5 h-1.5 rounded-full bg-surface-variant"></span> Absent
									</span>
								{/if}
							</td>
							<td class="py-4 px-6">
								<div class="flex flex-col">
									<span class="text-sm font-bold {log.checkIn === '-' ? 'text-on-surface-variant/50' : 'text-on-surface'}">{log.checkIn}</span>
								</div>
							</td>
							<td class="py-4 px-6">
								<div class="flex flex-col">
									<span class="text-sm font-bold {log.checkOut === '-' ? 'text-on-surface-variant/50' : 'text-on-surface'}">{log.checkOut}</span>
								</div>
							</td>
							<td class="py-4 px-6">
								<div class="flex flex-col gap-1">
									{#if log.checkInLocation !== '-'}
										<div class="flex items-center gap-1.5 text-xs text-on-surface-variant">
											<span class="material-symbols-outlined text-[14px] text-primary">location_on</span>
											<span class="truncate max-w-[150px]" title={log.checkInLocation}>IN: {log.checkInLocation}</span>
										</div>
									{/if}
									{#if log.checkOutLocation !== '-'}
										<div class="flex items-center gap-1.5 text-xs text-on-surface-variant">
											<span class="material-symbols-outlined text-[14px] text-tertiary">location_off</span>
											<span class="truncate max-w-[150px]" title={log.checkOutLocation}>OUT: {log.checkOutLocation}</span>
										</div>
									{:else if log.checkInLocation !== '-' && log.checkOutLocation === '-'}
										<div class="flex items-center gap-1.5 text-xs text-on-surface-variant/50">
											<span class="material-symbols-outlined text-[14px]">location_off</span>
											<span>OUT: Pending</span>
										</div>
									{/if}
									{#if log.checkInLocation === '-' && log.checkOutLocation === '-'}
										<span class="text-sm font-bold text-on-surface-variant/50">-</span>
									{/if}
								</div>
							</td>
							<td class="py-4 px-6 text-right">
								<button class="p-2 rounded-lg text-primary hover:bg-primary-container/20 transition-colors tooltip tooltip-left" data-tip="View Details & Photos">
									<span class="material-symbols-outlined text-[20px]">photo_camera</span>
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		
		<!-- Pagination Footer -->
		<div class="px-6 py-4 border-t border-surface-container flex items-center justify-between bg-surface-container-lowest">
			<p class="text-xs text-on-surface-variant font-medium">Showing records for May 07, 2026</p>
			<div class="flex gap-1">
				<button class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high disabled:opacity-50 transition-colors" disabled>
					<span class="material-symbols-outlined text-lg">chevron_left</span>
				</button>
				<button class="w-8 h-8 rounded-lg flex items-center justify-center bg-primary text-on-primary font-bold text-sm shadow-sm transition-colors">1</button>
				<button class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface font-bold text-sm hover:bg-surface-container-high transition-colors">2</button>
				<button class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors">
					<span class="material-symbols-outlined text-lg">chevron_right</span>
				</button>
			</div>
		</div>
	</div>
</div>
