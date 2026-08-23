<script lang="ts">
	let { data } = $props();
	const employee = data.employee;

	let activeTab = $state('employment'); // 'employment', 'personal', 'documents', 'training'
</script>

<svelte:head>
	<title>{employee.name} - Profile | HRIS</title>
</svelte:head>

<div class="flex flex-col h-full max-w-6xl mx-auto space-y-6">
	<!-- Breadcrumb & Actions -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<nav class="flex items-center text-sm font-medium text-on-surface-variant">
			<a href="/hris" class="hover:text-primary transition-colors">HRIS</a>
			<span class="material-symbols-outlined text-[16px] mx-1 text-slate-400">chevron_right</span>
			<a href="/hris/employees" class="hover:text-primary transition-colors">Employees</a>
			<span class="material-symbols-outlined text-[16px] mx-1 text-slate-400">chevron_right</span>
			<span class="text-on-surface font-bold">{employee.name}</span>
		</nav>
		<div class="flex gap-2">
			<a href="/hris/certifications" class="bg-surface-container-low border border-slate-200 dark:border-slate-800 text-on-surface px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-surface-container transition-colors shadow-xs">
				<span class="material-symbols-outlined text-base text-primary">verified</span>
				<span>Cek Sertifikasi & K3</span>
			</a>
			<a href={`/hris/employees/${employee.rawId}/edit`} class="bg-primary text-on-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-primary/90 transition-colors shadow-xs">
				<span class="material-symbols-outlined text-base">edit</span>
				<span>Edit Profile</span>
			</a>
		</div>
	</div>

	<!-- Profile Header Card -->
	<div class="bg-surface-container-lowest rounded-[32px] overflow-hidden shadow-xs border border-slate-200/60 dark:border-slate-800/60 relative">
		<!-- Cover Photo -->
		<div class="h-44 w-full {employee.cover} relative">
			<div class="absolute inset-0 bg-gradient-to-b from-transparent to-black/20"></div>
		</div>
		
		<div class="px-8 pb-8 pt-0 relative flex flex-col md:flex-row gap-6 md:items-end">
			<!-- Avatar -->
			<div class="w-32 h-32 md:w-36 md:h-36 rounded-full border-4 border-surface-container-lowest overflow-hidden -mt-16 md:-mt-18 relative z-10 shadow-md bg-surface">
				<img src={employee.avatar} alt={employee.name} class="w-full h-full object-cover" />
			</div>
			
			<div class="flex-1 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 md:pb-2">
				<div>
					<h1 class="text-2xl md:text-3xl font-black text-on-surface mb-1 tracking-tight">{employee.name}</h1>
					<p class="text-sm text-on-surface-variant font-medium mb-3 flex items-center gap-2">
						<span class="font-bold text-on-surface">{employee.role}</span> 
						<span class="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700"></span> 
						<span class="px-2.5 py-0.5 rounded-lg bg-surface-container-high text-[11px] font-bold uppercase tracking-wider text-on-surface">{employee.department}</span>
					</p>
					<div class="flex flex-wrap items-center gap-4 text-xs font-medium text-on-surface-variant">
						<span class="flex items-center gap-1.5"><span class="material-symbols-outlined text-base">mail</span> {employee.email}</span>
						<span class="flex items-center gap-1.5"><span class="material-symbols-outlined text-base">location_on</span> {employee.location}</span>
						<span class="flex items-center gap-1.5"><span class="material-symbols-outlined text-base">calendar_today</span> Joined {employee.joinDate}</span>
					</div>
				</div>
				
				<div class="flex flex-col items-start md:items-end gap-3">
					{#if employee.status === 'Active'}
						<span class="inline-flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-xs bg-emerald-500/10 px-3.5 py-1.5 rounded-full border border-emerald-500/20">
							<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Active Employee
						</span>
					{:else}
						<span class="inline-flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold text-xs bg-rose-500/10 px-3.5 py-1.5 rounded-full border border-rose-500/20">
							<span class="w-2 h-2 rounded-full bg-rose-500"></span> {employee.status}
						</span>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<!-- Details Grid -->
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">
		
		<!-- Left Column: Quick Stats & Reporting Line -->
		<div class="space-y-6">
			<!-- Quick Stats Bento -->
			<div class="grid grid-cols-2 gap-4">
				<div class="bg-primary text-on-primary rounded-3xl p-5 shadow-xs flex flex-col justify-between aspect-square group relative overflow-hidden">
					<div class="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>
					<div class="relative z-10">
						<span class="material-symbols-outlined text-2xl mb-1">monitoring</span>
						<p class="text-[10px] uppercase tracking-widest font-bold opacity-80">Performance</p>
					</div>
					<div class="relative z-10">
						<p class="text-3xl font-black">{employee.performance}%</p>
						<p class="text-[11px] font-medium mt-1 text-primary-fixed">{parseFloat(employee.performance) >= 85 ? 'Exceeds Expec.' : parseFloat(employee.performance) >= 70 ? 'Meets Expec.' : 'Needs Improvement'}</p>
					</div>
				</div>
				
				<div class="bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 rounded-3xl p-5 shadow-xs flex flex-col justify-between aspect-square">
					<div>
						<span class="material-symbols-outlined text-2xl text-secondary mb-1">beach_access</span>
						<p class="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">Leave Balance</p>
					</div>
					<div>
						<p class="text-3xl font-black text-on-surface">{employee.leaveBalance}</p>
						<p class="text-[11px] font-medium mt-1 text-on-surface-variant">Days Remaining</p>
					</div>
				</div>
			</div>

			<!-- Manager & Direct Reports -->
			<div class="bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 rounded-3xl p-5 shadow-xs">
				<h3 class="text-sm font-bold text-on-surface mb-4 border-b border-slate-200/60 dark:border-slate-800/60 pb-3 flex items-center gap-2">
					<span class="material-symbols-outlined text-base text-primary">account_tree</span>
					<span>Reporting Line</span>
				</h3>
				
				<div>
					<p class="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mb-2">Reports To</p>
					<div class="flex items-center gap-3 p-3 bg-surface rounded-2xl border border-slate-200/60 dark:border-slate-800/60 hover:border-primary/40 transition-colors">
						<div class="w-9 h-9 rounded-xl bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-xs">
							{employee.manager.substring(0,2).toUpperCase()}
						</div>
						<div>
							<p class="text-xs font-bold text-on-surface">{employee.manager}</p>
							<p class="text-[10px] text-on-surface-variant font-medium">Direct Manager</p>
						</div>
					</div>
				</div>
			</div>

			<!-- Competencies & Skills -->
			<div class="bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 rounded-3xl p-5 shadow-xs">
				<h3 class="text-sm font-bold text-on-surface mb-3 flex items-center gap-2">
					<span class="material-symbols-outlined text-base text-primary">psychology</span>
					<span>Competencies</span>
				</h3>
				<div class="flex flex-wrap gap-1.5">
					{#if employee.skills && employee.skills.length > 0}
						{#each employee.skills as skill}
							<span class="px-2.5 py-1 bg-surface border border-slate-200 dark:border-slate-800 text-on-surface-variant text-[11px] font-bold rounded-lg">
								{skill}
							</span>
						{/each}
					{:else}
						<span class="text-xs text-on-surface-variant italic">No competency records found.</span>
					{/if}
				</div>
			</div>
		</div>

		<!-- Right Column: Tabs (Personal, Employment, Documents, Training L&D) -->
		<div class="lg:col-span-2 space-y-6">
			<!-- Main Information Card -->
			<div class="bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 rounded-3xl shadow-xs overflow-hidden flex flex-col h-full">
				<!-- Tabs Header (Segmented Control) -->
				<div class="p-4 border-b border-slate-200/60 dark:border-slate-800/60 bg-surface-container-low flex items-center justify-between overflow-x-auto">
					<div class="inline-flex p-1 rounded-2xl bg-surface-container border border-slate-200 dark:border-slate-800 overflow-x-auto max-w-full">
						<button 
							onclick={() => activeTab = 'employment'}
							class="px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer {activeTab === 'employment' ? 'bg-surface text-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}">
							Employment Info
						</button>
						<button 
							onclick={() => activeTab = 'personal'}
							class="px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer {activeTab === 'personal' ? 'bg-surface text-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}">
							Personal Info
						</button>
						<button 
							onclick={() => activeTab = 'documents'}
							class="px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer {activeTab === 'documents' ? 'bg-surface text-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}">
							Documents & Tax
						</button>
						<button 
							onclick={() => activeTab = 'training'}
							class="px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer {activeTab === 'training' ? 'bg-surface text-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}">
							Training & Certs (L&D)
						</button>
					</div>
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
								<p class="text-sm font-bold text-on-surface">Employee Files & Kontrak</p>
								<p class="text-xs text-on-surface-variant mt-1 mb-4">Akses berkas digital, scan KTP, NPWP, & surat perjanjian kerja.</p>
								<a href="/hris/certifications" class="px-4 py-2 bg-surface-container-highest text-on-surface text-xs font-bold rounded-xl hover:bg-outline-variant/20 transition-colors">
									Buka Direktori Dokumen
								</a>
							</div>
						</div>
					{/if}

					{#if activeTab === 'training'}
						<div class="space-y-6">
							<div class="flex items-center justify-between">
								<div>
									<h4 class="text-sm font-bold text-on-surface">Pelatihan & Riwayat Sertifikasi Kompetensi</h4>
									<p class="text-xs text-on-surface-variant mt-0.5">Sertifikat K3, Defensive Driving, dan Pelatihan Teknis BCS</p>
								</div>
								<a href="/hris/certifications" class="text-xs font-bold text-primary flex items-center gap-1 hover:underline">
									<span>Semua Sertifikasi</span>
									<span class="material-symbols-outlined text-sm">arrow_forward</span>
								</a>
							</div>

							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div class="p-4 rounded-2xl bg-surface border border-slate-200/60 dark:border-slate-800/60 shadow-xs space-y-2">
									<div class="flex items-center justify-between">
										<span class="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 text-[10px] font-bold">K3 & Keselamatan</span>
										<span class="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
											<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Valid
										</span>
									</div>
									<h5 class="text-xs font-bold text-on-surface">Defensive Driving Training (DDT) Level 2</h5>
									<p class="text-[11px] text-on-surface-variant">Penerbit: BCS Safety & Logistics Academy</p>
									<p class="text-[10px] font-mono text-slate-400">Berlaku s/d: 15 Des 2027</p>
								</div>

								<div class="p-4 rounded-2xl bg-surface border border-slate-200/60 dark:border-slate-800/60 shadow-xs space-y-2">
									<div class="flex items-center justify-between">
										<span class="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 text-[10px] font-bold">Lisensi Operasional</span>
										<span class="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
											<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Aktif
										</span>
									</div>
									<h5 class="text-xs font-bold text-on-surface">SIM B2 Umum / Sertifikasi Alat Berat</h5>
									<p class="text-[11px] text-on-surface-variant">Penerbit: Korlantas RI</p>
									<p class="text-[10px] font-mono text-slate-400">Berlaku s/d: 20 Aug 2028</p>
								</div>

								<div class="p-4 rounded-2xl bg-surface border border-slate-200/60 dark:border-slate-800/60 shadow-xs space-y-2">
									<div class="flex items-center justify-between">
										<span class="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 text-[10px] font-bold">Kesehatan & HSE</span>
										<span class="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
											<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Fit to Work
										</span>
									</div>
									<h5 class="text-xs font-bold text-on-surface">Medical Check Up (MCU) Tahunan 2026</h5>
									<p class="text-[11px] text-on-surface-variant">Penerbit: RS Krakatau Medika Cilegon</p>
									<p class="text-[10px] font-mono text-slate-400">Berlaku s/d: 01 Feb 2027</p>
								</div>

								<div class="p-4 rounded-2xl bg-surface border border-slate-200/60 dark:border-slate-800/60 shadow-xs space-y-2">
									<div class="flex items-center justify-between">
										<span class="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 text-[10px] font-bold">SOP Operasional</span>
										<span class="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600">
											<span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Selesai
										</span>
									</div>
									<h5 class="text-xs font-bold text-on-surface">Induksi SOP & Digital Fleet (FMS / OCS Mobile)</h5>
									<p class="text-[11px] text-on-surface-variant">Penerbit: PT BCS Logistics Head Office</p>
									<p class="text-[10px] font-mono text-slate-400">Nilai Kelulusan: 94 / 100</p>
								</div>
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>
