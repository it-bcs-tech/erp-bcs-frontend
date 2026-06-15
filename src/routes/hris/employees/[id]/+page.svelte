<script lang="ts">
	let { data } = $props();
	const employee = data.employee;

	let activeTab = $state('employment'); // 'employment', 'personal', 'documents'
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
			<a href={`/hris/employees/${employee.rawId}/edit`} class="bg-surface-container-lowest text-primary px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-surface-container-low transition-colors shadow-sm">
				<span class="material-symbols-outlined text-[18px]">edit</span>
				Edit Profile
			</a>
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
						<span class="inline-flex items-center gap-2 text-green-700 font-bold text-sm bg-green-500/20 px-4 py-2 rounded-full border border-green-600/20">
							<span class="w-2 h-2 rounded-full bg-green-600 animate-pulse"></span> Active Employee
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
						<p class="text-xs font-medium mt-1 text-primary-fixed">{parseFloat(employee.performance) >= 85 ? 'Exceeds Expec.' : parseFloat(employee.performance) >= 70 ? 'Meets Expec.' : 'Needs Improvement'}</p>
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
								{employee.manager.substring(0,2).toUpperCase()}
							</div>
							<div>
								<p class="text-sm font-bold text-on-surface">{employee.manager}</p>
								<p class="text-xs text-on-surface-variant font-medium">Direct Manager</p>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Skills -->
			<div class="bg-surface-container-lowest rounded-[24px] p-6 shadow-sm">
				<h3 class="text-lg font-bold text-on-surface mb-4">Competencies</h3>
				<div class="flex flex-wrap gap-2">
					{#if employee.skills && employee.skills.length > 0}
						{#each employee.skills as skill}
							<span class="px-3 py-1.5 bg-surface-container-high text-on-surface-variant text-xs font-bold rounded-lg border border-outline-variant/10">
								{skill}
							</span>
						{/each}
					{:else}
						<span class="text-xs text-on-surface-variant italic">No training records found.</span>
					{/if}
				</div>
			</div>
		</div>

		<!-- Right Column: Tabs (Personal, Employment, Timeline) -->
		<div class="lg:col-span-2 space-y-6">
			<!-- Main Information Card -->
			<div class="bg-surface-container-lowest rounded-[24px] shadow-sm overflow-hidden flex flex-col h-full">
				<!-- Tabs Header -->
				<div class="flex border-b border-surface-container px-6 pt-2">
					<button 
						onclick={() => activeTab = 'employment'}
						class={`px-6 py-4 text-sm font-bold transition-colors border-b-2 ${activeTab === 'employment' ? 'text-primary border-primary' : 'text-on-surface-variant hover:text-on-surface border-transparent'}`}>
						Employment Info
					</button>
					<button 
						onclick={() => activeTab = 'personal'}
						class={`px-6 py-4 text-sm font-bold transition-colors border-b-2 ${activeTab === 'personal' ? 'text-primary border-primary' : 'text-on-surface-variant hover:text-on-surface border-transparent'}`}>
						Personal Info
					</button>
					<button 
						onclick={() => activeTab = 'documents'}
						class={`px-6 py-4 text-sm font-bold transition-colors border-b-2 ${activeTab === 'documents' ? 'text-primary border-primary' : 'text-on-surface-variant hover:text-on-surface border-transparent'}`}>
						Documents
					</button>
				</div>

				<!-- Tab Content -->
				<div class="p-8 flex-1 overflow-y-auto">
					{#if activeTab === 'employment'}
						<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
							<div class="space-y-6">
								<div>
									<p class="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mb-1">Employee ID</p>
									<p class="text-base font-semibold text-on-surface">{employee.id}</p>
								</div>
								<div>
									<p class="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mb-1">Employment Type</p>
									<p class="text-base font-semibold text-on-surface">{employee.type}</p>
								</div>
								<div>
									<p class="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mb-1">Work Schedule</p>
									<p class="text-base font-semibold text-on-surface">Standard (Mon-Fri)</p>
								</div>
							</div>
							
							<div class="space-y-6">
								<div>
									<p class="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mb-1">Job Role</p>
									<p class="text-base font-semibold text-on-surface">{employee.role}</p>
								</div>
								<div>
									<p class="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mb-1">Base Location</p>
									<p class="text-base font-semibold text-on-surface">{employee.location}</p>
								</div>
								<div>
									<p class="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mb-1">Business Unit</p>
									<p class="text-base font-semibold text-on-surface">{employee.businessUnit}</p>
								</div>
							</div>
						</div>

						<div class="mt-10">
							<h4 class="text-sm font-bold text-on-surface mb-6 uppercase tracking-wider border-b border-surface-container pb-2">Recent Timeline</h4>
							
							<div class="space-y-6 relative pl-2">
								<div class="absolute left-4 top-2 bottom-2 w-0.5 bg-surface-container"></div>
								
								{#if employee.timeline && employee.timeline.length > 0}
									{#each employee.timeline as item, i}
										<div class="relative flex items-start gap-4 z-10">
											<div class="w-5 h-5 rounded-full {i === 0 ? 'bg-primary' : 'bg-surface-container-highest'} ring-4 ring-surface-container-lowest mt-0.5"></div>
											<div class="bg-surface-container-low p-4 rounded-xl flex-1 hover:bg-surface-container-high transition-colors cursor-pointer">
												<div class="flex justify-between items-start mb-1">
													<p class="text-sm font-bold text-on-surface">{item.type}</p>
													<span class="text-xs text-on-surface-variant font-medium">{item.date}</span>
												</div>
												<p class="text-xs text-on-surface-variant">{item.desc}</p>
											</div>
										</div>
									{/each}
								{:else}
									<div class="relative flex items-start gap-4 z-10">
										<div class="w-5 h-5 rounded-full bg-surface-container-highest ring-4 ring-surface-container-lowest mt-0.5"></div>
										<div class="p-2 flex-1">
											<p class="text-sm font-bold text-on-surface-variant italic">No recent timeline records found.</p>
										</div>
									</div>
								{/if}
							</div>
						</div>
					{/if}

					{#if activeTab === 'personal'}
						<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
							<div class="space-y-6">
								<div>
									<p class="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mb-1">Full Name</p>
									<p class="text-base font-semibold text-on-surface">{employee.name}</p>
								</div>
								<div>
									<p class="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mb-1">Birth Info</p>
									<p class="text-base font-semibold text-on-surface">{employee.birthPlace || '-'}, {employee.birthDate || '-'}</p>
								</div>
								<div>
									<p class="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mb-1">Gender & Religion</p>
									<p class="text-base font-semibold text-on-surface">{employee.gender === 'MALE' || employee.gender === 'L' ? 'Male' : employee.gender === 'FEMALE' || employee.gender === 'P' ? 'Female' : (employee.gender || '-')} - {employee.religion || '-'}</p>
								</div>
								<div>
									<p class="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mb-1">Marital Status</p>
									<p class="text-base font-semibold text-on-surface">{employee.maritalStatus || '-'}</p>
								</div>
							</div>
							
							<div class="space-y-6">
								<div>
									<p class="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mb-1">Address</p>
									<p class="text-base font-semibold text-on-surface">{employee.address || '-'}</p>
									{#if employee.city}
										<p class="text-sm text-on-surface-variant mt-1">{employee.city}</p>
									{/if}
								</div>
								<div>
									<p class="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mb-1">Contact Details</p>
									<p class="text-base font-semibold text-on-surface">{employee.phone || 'No Phone Number'}</p>
									<p class="text-sm text-on-surface-variant mt-1">{employee.email || 'No Email'}</p>
								</div>
								<div>
									<p class="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mb-1">Education</p>
									<p class="text-base font-semibold text-on-surface">{employee.education || '-'}</p>
								</div>
							</div>
						</div>
					{/if}

					{#if activeTab === 'documents'}
						<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
							<div class="space-y-6">
								<div>
									<p class="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mb-1">National ID (NIK/KTP)</p>
									<div class="flex items-center gap-3 mt-1">
										<p class="text-base font-semibold text-on-surface">{employee.nik || 'Not Provided'}</p>
										{#if employee.nik}
											<span class="material-symbols-outlined text-tertiary text-[18px]">verified</span>
										{/if}
									</div>
								</div>
								<div>
									<p class="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mb-1">Tax ID (NPWP)</p>
									<p class="text-base font-semibold text-on-surface">{employee.npwp || 'Not Provided'}</p>
								</div>
							</div>
							
							<div class="bg-surface-container-low rounded-2xl p-6 border border-dashed border-outline-variant/50 flex flex-col items-center justify-center text-center">
								<span class="material-symbols-outlined text-4xl text-on-surface-variant mb-2">folder_open</span>
								<p class="text-sm font-bold text-on-surface">Employee Files</p>
								<p class="text-xs text-on-surface-variant mt-1 mb-4">View contracts, ID scans, and other documents.</p>
								<button class="px-4 py-2 bg-surface-container-highest text-on-surface text-xs font-bold rounded-xl hover:bg-outline-variant/20 transition-colors">
									Open File Directory
								</button>
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>
