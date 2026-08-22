<script lang="ts">
	let { data } = $props();
	let metrics = $derived(data.metrics);
</script>

<svelte:head>
	<title>People & HR Overview | HRIS Dashboard</title>
</svelte:head>

<!-- Header Section -->
<header class="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
	<div>
		<div class="flex items-center gap-2.5">
			<span class="material-symbols-outlined text-primary text-2xl">dashboard</span>
			<h1 class="text-2xl font-black text-on-surface tracking-tight">People & HR Overview</h1>
		</div>
		<p class="text-on-surface-variant font-medium text-sm mt-0.5">
			Ringkasan Eksekutif Sumber Daya Manusia & Analisis Metrik Kehadiran Karyawan
		</p>
	</div>
</header>

<!-- Metrics Grid -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
	<!-- Total Employees -->
	<div class="bg-surface-container-lowest p-6 rounded-[24px] shadow-sm hover:scale-[1.02] transition-transform duration-300">
		<div class="flex items-center justify-between mb-4">
			<span class="font-bold text-on-surface-variant uppercase tracking-widest text-[10px]">Total Employees</span>
			<span class="material-symbols-outlined text-primary">diversity_3</span>
		</div>
		<p class="text-4xl font-black text-on-surface mb-1">{metrics.totalEmployees}</p>
		<div class="flex items-center gap-2">
			<span class="text-tertiary text-xs font-bold flex items-center">+12%</span>
			<span class="text-on-surface-variant/60 text-[10px] font-medium">v.s last month</span>
		</div>
	</div>

	<!-- Present Today -->
	<div class="bg-surface-container-lowest p-6 rounded-[24px] shadow-sm hover:scale-[1.02] transition-transform duration-300 relative overflow-hidden group">
		<div class="absolute -right-10 -top-10 w-32 h-32 bg-tertiary/10 rounded-full blur-2xl group-hover:bg-tertiary/20 transition-colors"></div>
		<div class="relative z-10">
			<div class="flex items-center justify-between mb-4">
				<span class="font-bold text-on-surface-variant uppercase tracking-widest text-[10px]">Present Today</span>
				<span class="material-symbols-outlined text-tertiary">how_to_reg</span>
			</div>
			<p class="text-4xl font-black text-on-surface mb-1">{metrics.presentToday}</p>
			<div class="w-full bg-surface-container-high h-1.5 rounded-full mt-4 overflow-hidden">
				<div class="bg-tertiary h-full rounded-full shadow-[0_0_8px_var(--color-tertiary)]" style="width: {metrics.attendanceCapacity}%"></div>
			</div>
			<p class="text-[10px] font-medium text-on-surface-variant mt-2">{metrics.attendanceCapacity}% Capacity</p>
		</div>
	</div>

	<!-- Leave Requests -->
	<div class="bg-surface-container-lowest p-6 rounded-[24px] shadow-sm hover:scale-[1.02] transition-transform duration-300">
		<div class="flex items-center justify-between mb-4">
			<span class="font-bold text-on-surface-variant uppercase tracking-widest text-[10px]">Leave Requests</span>
			<span class="material-symbols-outlined text-secondary">pending_actions</span>
		</div>
		<p class="text-4xl font-black text-on-surface mb-1">{metrics.totalLeaveRequests}</p>
		<div class="flex items-center gap-2 mt-2">
			<span class="px-2 py-0.5 bg-secondary-container text-on-secondary-container text-[10px] font-bold rounded-full">{metrics.pendingLeaveRequests} Pending</span>
		</div>
	</div>

	<!-- Open Positions -->
	<div class="bg-surface-container-lowest p-6 rounded-[24px] shadow-sm hover:scale-[1.02] transition-transform duration-300">
		<div class="flex items-center justify-between mb-4">
			<span class="font-bold text-on-surface-variant uppercase tracking-widest text-[10px]">Open Positions</span>
			<span class="material-symbols-outlined text-primary-container">work_outline</span>
		</div>
		<p class="text-4xl font-black text-on-surface mb-1">{metrics.openPositions}</p>
		<div class="flex items-center gap-2 mt-2">
			<span class="text-primary text-xs font-bold flex items-center">{metrics.highPriorityPositions} High Priority</span>
		</div>
	</div>
</div>

<!-- Middle Section: Asymmetric Layout -->
<div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
	<!-- Attendance Chart Area -->
	<div class="lg:col-span-2 bg-surface-container-lowest rounded-[24px] p-8 shadow-sm">
		<div class="flex items-center justify-between mb-8">
			<div>
				<h3 class="text-xl font-bold text-on-surface tracking-tight">Monthly Attendance Trend</h3>
				<p class="text-xs text-on-surface-variant mt-1">Yearly comparative analysis (2026)</p>
			</div>
			<div class="flex gap-4">
				<div class="flex items-center gap-2">
					<span class="w-3 h-3 rounded-full bg-primary shadow-[0_0_8px_var(--color-primary)]"></span>
					<span class="text-[10px] font-bold text-on-surface-variant uppercase">Remote</span>
				</div>
				<div class="flex items-center gap-2">
					<span class="w-3 h-3 rounded-full bg-tertiary shadow-[0_0_8px_var(--color-tertiary)]"></span>
					<span class="text-[10px] font-bold text-on-surface-variant uppercase">On-Site</span>
				</div>
			</div>
		</div>
		
		<!-- Abstract Visual Chart representation -->
		<div class="relative h-64 w-full flex items-end justify-between px-2 gap-4">
			{#each data.attendanceTrend as trend}
				<div class="flex flex-col items-center flex-1 gap-3 h-full group/bar cursor-pointer">
					<div class="w-full flex items-end justify-center gap-1.5 h-full relative">
						<!-- Remote Bar -->
						<div class="w-5 bg-primary/40 rounded-t-md transition-all duration-300 group-hover/bar:bg-primary" style="height: {trend.remote}"></div>
						<!-- Onsite Bar -->
						<div class="w-5 bg-tertiary/40 rounded-t-md transition-all duration-300 group-hover/bar:bg-tertiary" style="height: {trend.onsite}"></div>
						
						<div class="absolute -top-10 bg-surface-container-highest text-on-surface px-2 py-1 rounded text-[10px] font-bold opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap shadow-sm">
							Rem: {trend.remote} / On: {trend.onsite}
						</div>
					</div>
					<span class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider group-hover/bar:text-primary transition-colors">{trend.month}</span>
				</div>
			{/each}
		</div>
	</div>

	<!-- Celebration Sidebar Card -->
	<div class="bg-primary p-8 rounded-[24px] text-on-primary shadow-lg shadow-primary/20 flex flex-col justify-between overflow-hidden relative group">
		<div class="absolute top-0 right-0 w-48 h-48 bg-primary-container/30 rounded-full -mr-16 -mt-16 blur-3xl group-hover:scale-110 transition-transform duration-700"></div>
		<div class="relative z-10">
			<h3 class="text-xl font-extrabold mb-8 flex items-center gap-2">
				<span class="material-symbols-outlined text-3xl">celebration</span>
				Anniversaries
			</h3>
			<div class="space-y-6">
				{#each data.anniversaries as ann}
				<div class="flex items-center gap-4 bg-primary-container/20 p-3 -mx-3 rounded-xl backdrop-blur-sm transition-colors hover:bg-primary-container/30">
					<div class="w-12 h-12 rounded-full border-2 border-primary-container overflow-hidden flex-shrink-0">
						<img class="w-full h-full object-cover" alt="{ann.name}" src="https://ui-avatars.com/api/?name={encodeURIComponent(ann.name)}&background=ffd7f1&color=57344f" />
					</div>
					<div>
						<p class="text-sm font-bold">{ann.name}</p>
						<p class="text-xs text-primary-fixed font-medium mt-0.5">{ann.years} Years • This Month</p>
					</div>
				</div>
				{/each}
				{#if data.anniversaries.length === 0}
				<div class="text-sm text-primary-fixed/80 italic">No anniversaries this month.</div>
				{/if}
			</div>
		</div>
		<button class="mt-8 bg-surface-container-lowest text-primary py-3 px-6 rounded-xl text-sm font-bold hover:bg-surface-container-lowest/90 transition-all flex items-center justify-center gap-2 shadow-sm relative z-10">
			Send Congratulations
		</button>
	</div>
</div>

<!-- Bottom Grid: Birthdays & Activity -->
<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
	<div class="bg-surface-container-lowest rounded-[24px] p-8 shadow-sm">
		<div class="flex items-center justify-between mb-6">
			<h3 class="text-xl font-bold text-on-surface tracking-tight">Upcoming Birthdays</h3>
			<span class="text-xs font-bold text-primary cursor-pointer hover:underline px-3 py-1.5 rounded-lg hover:bg-primary-container/20 transition-colors">View All</span>
		</div>
		<div class="space-y-3">
			{#each data.birthdays as bday}
			<div class="flex items-center justify-between p-4 bg-surface-container-low rounded-xl hover:bg-surface-container-high transition-colors cursor-pointer group">
				<div class="flex items-center gap-4">
					<div class="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container font-bold text-xs group-hover:scale-110 transition-transform">
						{bday.name.split(' ').map((n: string) => n[0]).join('').substring(0,2).toUpperCase()}
					</div>
					<div>
						<p class="text-sm font-bold text-on-surface">{bday.name}</p>
						<p class="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider mt-0.5">{bday.department || 'Division'}</p>
					</div>
				</div>
				<div class="text-right">
					<p class="text-xs font-bold text-on-surface">{new Date(bday.birth_date).toLocaleDateString('en-US', {month:'short', day:'numeric'})}</p>
					<p class="text-[10px] text-tertiary font-bold mt-0.5">This Month</p>
				</div>
			</div>
			{/each}
			{#if data.birthdays.length === 0}
			<div class="text-sm text-on-surface-variant italic p-4">No upcoming birthdays.</div>
			{/if}
		</div>
	</div>

	<div class="bg-surface-container-lowest rounded-[24px] p-8 shadow-sm">
		<div class="flex items-center justify-between mb-6">
			<h3 class="text-xl font-bold text-on-surface tracking-tight">Recent Activity</h3>
			<button class="w-8 h-8 rounded-full hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors">
				<span class="material-symbols-outlined text-xl">more_horiz</span>
			</button>
		</div>
		<div class="space-y-6 relative pt-2">
			<!-- Timeline Line -->
			<div class="absolute left-[19px] top-4 bottom-4 w-0.5 bg-outline-variant/20"></div>
			
			{#each data.recentActivity as log}
			<div class="relative flex items-start gap-5 pl-10 group cursor-pointer">
				<div class="absolute left-[15px] top-1.5 w-2.5 h-2.5 rounded-full bg-tertiary ring-4 ring-surface-container-lowest group-hover:scale-125 transition-transform"></div>
				<div>
					<p class="text-sm text-on-surface group-hover:text-primary transition-colors"><span class="font-bold">{log.log_name || 'Activity'}:</span> {log.description}</p>
					<p class="text-[10px] text-on-surface-variant font-medium mt-1">{new Date(log.created_at).toLocaleString()}</p>
				</div>
			</div>
			{/each}
			
			{#if data.recentActivity.length === 0}
			<div class="relative flex items-start gap-5 pl-10">
				<p class="text-sm text-on-surface-variant italic">No recent activity.</p>
			</div>
			{/if}
		</div>
	</div>
</div>

<!-- Contextual FAB -->
<!-- <button class="fixed bottom-8 right-8 w-14 h-14 bg-primary text-on-primary rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center hover:scale-110 hover:-translate-y-1 transition-all duration-300 z-50 group">
	<span class="material-symbols-outlined text-2xl group-hover:rotate-90 transition-transform">add</span>
</button> -->
