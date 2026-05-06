<script lang="ts">
	let { data } = $props();
	const employee = data.employee;
</script>

<svelte:head>
	<title>{employee.name} - Profile | HRIS</title>
</svelte:head>

<div class="flex flex-col h-full max-w-6xl mx-auto">
	<!-- Breadcrumb & Actions -->
	<div class="mb-6 flex justify-between items-center">
		<nav class="flex items-center text-sm font-medium text-on-surface-variant">
			<a href="/hris" class="hover:text-primary transition-colors">HRIS</a>
			<span class="material-symbols-outlined text-[16px] mx-1">chevron_right</span>
			<a href="/hris/employees" class="hover:text-primary transition-colors">Employees</a>
			<span class="material-symbols-outlined text-[16px] mx-1">chevron_right</span>
			<span class="text-on-surface font-bold">{employee.name}</span>
		</nav>
		<div class="flex gap-2">
			<button class="bg-surface-container-lowest text-primary px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-surface-container-low transition-colors shadow-sm">
				<span class="material-symbols-outlined text-[18px]">edit</span>
				Edit Profile
			</button>
		</div>
	</div>

	<!-- Profile Header Card -->
	<div class="bg-surface-container-lowest rounded-[32px] overflow-hidden shadow-sm mb-8 relative">
		<!-- Cover Photo -->
		<div class="h-48 w-full {employee.cover} relative">
			<!-- Overlay gradient -->
			<div class="absolute inset-0 bg-gradient-to-b from-transparent to-black/20"></div>
		</div>
		
		<div class="px-8 pb-8 pt-0 relative flex flex-col md:flex-row gap-6 md:items-end">
			<!-- Avatar -->
			<div class="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-surface-container-lowest overflow-hidden -mt-16 md:-mt-20 relative z-10 shadow-lg bg-surface">
				<img src={employee.avatar} alt={employee.name} class="w-full h-full object-cover" />
			</div>
			
			<div class="flex-1 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 md:pb-2">
				<div>
					<h1 class="text-3xl font-black text-on-surface mb-1 tracking-tight">{employee.name}</h1>
					<p class="text-base text-on-surface-variant font-medium mb-3 flex items-center gap-2">
						{employee.role} 
						<span class="w-1 h-1 rounded-full bg-outline-variant"></span> 
						<span class="px-2 py-0.5 rounded-md bg-surface-container-high text-[10px] font-bold uppercase tracking-wider text-on-surface">{employee.department}</span>
					</p>
					<div class="flex flex-wrap items-center gap-4 text-sm font-medium text-on-surface-variant">
						<span class="flex items-center gap-1.5"><span class="material-symbols-outlined text-[18px]">mail</span> {employee.email}</span>
						<span class="flex items-center gap-1.5"><span class="material-symbols-outlined text-[18px]">location_on</span> {employee.location}</span>
						<span class="flex items-center gap-1.5"><span class="material-symbols-outlined text-[18px]">calendar_today</span> Joined {employee.joinDate}</span>
					</div>
				</div>
				
				<div class="flex flex-col items-start md:items-end gap-3">
					{#if employee.status === 'Active'}
						<span class="inline-flex items-center gap-2 text-tertiary font-bold text-sm bg-tertiary-container/30 px-4 py-2 rounded-full border border-tertiary/20">
							<span class="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span> Active Employee
						</span>
					{:else}
						<span class="inline-flex items-center gap-2 text-error font-bold text-sm bg-error-container/30 px-4 py-2 rounded-full border border-error/20">
							<span class="w-2 h-2 rounded-full bg-error"></span> {employee.status}
						</span>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<!-- Details Grid -->
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">
		
		<!-- Left Column: Quick Stats & Info -->
		<div class="space-y-8">
			<!-- Quick Stats Bento -->
			<div class="grid grid-cols-2 gap-4">
				<div class="bg-primary text-on-primary rounded-[24px] p-6 shadow-md shadow-primary/20 flex flex-col justify-between aspect-square group cursor-pointer relative overflow-hidden">
					<div class="absolute -right-4 -top-4 w-20 h-20 bg-primary-container/30 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>
					<div class="relative z-10">
						<span class="material-symbols-outlined text-3xl mb-2">monitoring</span>
						<p class="text-[10px] uppercase tracking-widest font-bold opacity-80">Performance</p>
					</div>
					<div class="relative z-10">
						<p class="text-4xl font-black">{employee.performance}%</p>
						<p class="text-xs font-medium mt-1 text-primary-fixed">Exceeds Expec.</p>
					</div>
				</div>
				
				<div class="bg-surface-container-lowest rounded-[24px] p-6 shadow-sm flex flex-col justify-between aspect-square hover:scale-[1.02] transition-transform duration-300">
					<div>
						<span class="material-symbols-outlined text-3xl text-secondary mb-2">beach_access</span>
						<p class="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">Leave Balance</p>
					</div>
					<div>
						<p class="text-4xl font-black text-on-surface">{employee.leaveBalance}</p>
						<p class="text-xs font-medium mt-1 text-on-surface-variant">Days Remaining</p>
					</div>
				</div>
			</div>

			<!-- Manager & Direct Reports -->
			<div class="bg-surface-container-lowest rounded-[24px] p-6 shadow-sm">
				<h3 class="text-lg font-bold text-on-surface mb-6 border-b border-surface-container pb-4">Reporting Line</h3>
				
				<div class="space-y-6">
					<div>
						<p class="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mb-3">Reports To</p>
						<div class="flex items-center gap-3 p-3 bg-surface-container-low rounded-xl hover:bg-surface-container-high transition-colors cursor-pointer">
							<div class="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-sm">
								MS
							</div>
							<div>
								<p class="text-sm font-bold text-on-surface">{employee.manager}</p>
								<p class="text-xs text-on-surface-variant font-medium">Chief Operating Officer</p>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Skills -->
			<div class="bg-surface-container-lowest rounded-[24px] p-6 shadow-sm">
				<h3 class="text-lg font-bold text-on-surface mb-4">Competencies</h3>
				<div class="flex flex-wrap gap-2">
					{#each employee.skills as skill}
						<span class="px-3 py-1.5 bg-surface-container-high text-on-surface-variant text-xs font-bold rounded-lg border border-outline-variant/10">
							{skill}
						</span>
					{/each}
				</div>
			</div>
		</div>

		<!-- Right Column: Tabs (Personal, Employment, Timeline) -->
		<div class="lg:col-span-2 space-y-6">
			<!-- Main Information Card -->
			<div class="bg-surface-container-lowest rounded-[24px] shadow-sm overflow-hidden flex flex-col h-full">
				<!-- Tabs Header -->
				<div class="flex border-b border-surface-container px-6 pt-2">
					<button class="px-6 py-4 text-sm font-bold text-primary border-b-2 border-primary relative">
						Employment Info
					</button>
					<button class="px-6 py-4 text-sm font-bold text-on-surface-variant hover:text-on-surface transition-colors border-b-2 border-transparent">
						Personal Info
					</button>
					<button class="px-6 py-4 text-sm font-bold text-on-surface-variant hover:text-on-surface transition-colors border-b-2 border-transparent">
						Documents
					</button>
				</div>

				<!-- Tab Content -->
				<div class="p-8 flex-1">
					<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
						<div class="space-y-6">
							<div>
								<p class="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mb-1">Employee ID</p>
								<p class="text-base font-semibold text-on-surface">{employee.id}</p>
							</div>
							<div>
								<p class="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mb-1">Employment Type</p>
								<p class="text-base font-semibold text-on-surface">Full-Time Permanent</p>
							</div>
							<div>
								<p class="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mb-1">Work Schedule</p>
								<p class="text-base font-semibold text-on-surface">Standard (Mon-Fri, 9am-5pm)</p>
							</div>
						</div>
						
						<div class="space-y-6">
							<div>
								<p class="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mb-1">Job Grade</p>
								<p class="text-base font-semibold text-on-surface">M3 - Senior Director</p>
							</div>
							<div>
								<p class="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mb-1">Base Location</p>
								<p class="text-base font-semibold text-on-surface">{employee.location}</p>
							</div>
							<div>
								<p class="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mb-1">Work Model</p>
								<p class="text-base font-semibold text-on-surface">Hybrid (3 Days Office)</p>
							</div>
						</div>
					</div>

					<div class="mt-10">
						<h4 class="text-sm font-bold text-on-surface mb-6 uppercase tracking-wider border-b border-surface-container pb-2">Recent Timeline</h4>
						
						<div class="space-y-6 relative pl-2">
							<div class="absolute left-4 top-2 bottom-2 w-0.5 bg-surface-container"></div>
							
							<div class="relative flex items-start gap-4 z-10">
								<div class="w-5 h-5 rounded-full bg-primary ring-4 ring-surface-container-lowest mt-0.5"></div>
								<div class="bg-surface-container-low p-4 rounded-xl flex-1 hover:bg-surface-container-high transition-colors cursor-pointer">
									<div class="flex justify-between items-start mb-1">
										<p class="text-sm font-bold text-on-surface">Promotion to Head of Operations</p>
										<span class="text-xs text-on-surface-variant font-medium">Jan 1, 2024</span>
									</div>
									<p class="text-xs text-on-surface-variant">Promoted from Senior Operations Manager.</p>
								</div>
							</div>

							<div class="relative flex items-start gap-4 z-10">
								<div class="w-5 h-5 rounded-full bg-tertiary ring-4 ring-surface-container-lowest mt-0.5"></div>
								<div class="bg-surface-container-low p-4 rounded-xl flex-1 hover:bg-surface-container-high transition-colors cursor-pointer">
									<div class="flex justify-between items-start mb-1">
										<p class="text-sm font-bold text-on-surface">Annual Performance Review</p>
										<span class="text-xs text-on-surface-variant font-medium">Dec 15, 2023</span>
									</div>
									<p class="text-xs text-on-surface-variant">Scored 92% (Exceeds Expectations).</p>
								</div>
							</div>
							
							<div class="relative flex items-start gap-4 z-10">
								<div class="w-5 h-5 rounded-full bg-surface-container-highest ring-4 ring-surface-container-lowest mt-0.5"></div>
								<div class="p-2 flex-1">
									<p class="text-sm font-bold text-on-surface-variant hover:text-primary transition-colors cursor-pointer">View full timeline</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
