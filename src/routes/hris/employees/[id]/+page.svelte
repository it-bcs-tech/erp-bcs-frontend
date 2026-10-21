<script lang="ts">
	import DriverSimAiScannerModal from '$lib/components/DriverSimAiScannerModal.svelte';
	import { invalidateAll } from '$app/navigation';

	let { data } = $props();
	const employee = data.employee;
	const trainingData = $derived(data.trainingData || {
		trainings: [],
		lmsCertificates: [],
		lmsEnrollments: [],
		competencyCerts: [],
		driverLicenses: [],
		summary: { totalTrainings: 0, totalCertificates: 0, activeCourses: 0, validLicenses: 0, hasExpired: false, hasWarning: false, expiredCount: 0, warningCount: 0 }
	});

	let showSimModal = $state(false);

	const selectedDriverForSim = $derived({
		id: (data as any).driverInfo?.id || employee.id,
		karyawan_id: employee.id,
		name: employee.name,
		payroll_id: employee.payrollId,
		sim_type: (data as any).driverInfo?.sim_type || (trainingData.driverLicenses && trainingData.driverLicenses[0]?.type) || 'SIM B2 UMUM',
		sim_expiry_date: (data as any).driverInfo?.sim_expiry_date || (trainingData.driverLicenses && trainingData.driverLicenses[0]?.expiryDate) || ''
	});

	let activeTab = $state('employment'); // 'employment', 'personal', 'documents', 'training'
	let trainingCategoryFilter = $state('all'); // 'all', 'certificates', 'trainings', 'elearning', 'licenses'
	let trainingSearch = $state('');
	let trainingStatusFilter = $state('all'); // 'all', 'valid', 'warning', 'expired'

	function formatDate(d: string | null | undefined): string {
		if (!d) return '-';
		try {
			const parts = d.split('-');
			if (parts.length === 3) {
				const dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
				return dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
			}
			return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
		} catch {
			return d;
		}
	}

	function getCategoryColor(cat: string | null | undefined) {
		const c = (cat || '').toUpperCase();
		if (c.includes('SAFETY') || c.includes('K3')) return 'bg-rose-500/10 text-rose-600 border-rose-500/20';
		if (c.includes('HARD') || c.includes('TEKNIS')) return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
		if (c.includes('SOFT') || c.includes('LEADERSHIP')) return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
		if (c.includes('OPERA') || c.includes('LOGISTIK') || c.includes('FLEET')) return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
		if (c.includes('DIGITAL') || c.includes('SYSTEM')) return 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20';
		return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
	}

	// Derived filtered lists
	let filteredLmsCertificates = $derived(
		(trainingData.lmsCertificates || []).filter((c: any) => {
			const q = trainingSearch.toLowerCase();
			const matchSearch = !q || c.courseTitle?.toLowerCase().includes(q) || c.certificateNumber?.toLowerCase().includes(q) || c.category?.toLowerCase().includes(q);
			const matchStatus = trainingStatusFilter === 'all' || 
				(trainingStatusFilter === 'valid' && (c.computedStatus === 'ACTIVE' || c.computedStatus === 'VALID')) ||
				(trainingStatusFilter === 'warning' && c.computedStatus === 'EXPIRING_SOON') ||
				(trainingStatusFilter === 'expired' && c.computedStatus === 'EXPIRED');
			return matchSearch && matchStatus;
		})
	);

	let filteredCompetencyCerts = $derived(
		(trainingData.competencyCerts || []).filter((c: any) => {
			const q = trainingSearch.toLowerCase();
			const matchSearch = !q || c.title?.toLowerCase().includes(q) || c.doc_number?.toLowerCase().includes(q) || c.type_name?.toLowerCase().includes(q);
			const matchStatus = trainingStatusFilter === 'all' || 
				(trainingStatusFilter === 'valid' && (c.computedStatus === 'ACTIVE' || c.computedStatus === 'VALID')) ||
				(trainingStatusFilter === 'warning' && c.computedStatus === 'EXPIRING_SOON') ||
				(trainingStatusFilter === 'expired' && c.computedStatus === 'EXPIRED');
			return matchSearch && matchStatus;
		})
	);

	let filteredTrainings = $derived(
		(trainingData.trainings || []).filter((t: any) => {
			const q = trainingSearch.toLowerCase();
			const matchSearch = !q || t.title?.toLowerCase().includes(q) || t.trainer?.toLowerCase().includes(q) || t.category?.toLowerCase().includes(q) || t.programId?.toLowerCase().includes(q);
			const matchStatus = trainingStatusFilter === 'all' || 
				(trainingStatusFilter === 'valid' && (!t.certificateExpiry || t.computedStatus === 'ACTIVE' || t.computedStatus === 'VALID')) ||
				(trainingStatusFilter === 'warning' && t.computedStatus === 'EXPIRING_SOON') ||
				(trainingStatusFilter === 'expired' && t.computedStatus === 'EXPIRED');
			return matchSearch && matchStatus;
		})
	);

	let filteredLmsEnrollments = $derived(
		(trainingData.lmsEnrollments || []).filter((e: any) => {
			const q = trainingSearch.toLowerCase();
			const matchSearch = !q || e.courseTitle?.toLowerCase().includes(q) || e.instructor?.toLowerCase().includes(q) || e.category?.toLowerCase().includes(q);
			const matchStatus = trainingStatusFilter === 'all' || 
				(trainingStatusFilter === 'valid' && e.status === 'COMPLETED') ||
				(trainingStatusFilter === 'warning' && e.status === 'IN_PROGRESS') ||
				(trainingStatusFilter === 'expired' && e.status === 'ENROLLED');
			return matchSearch && matchStatus;
		})
	);

	let filteredDriverLicenses = $derived(
		(trainingData.driverLicenses || []).filter((l: any) => {
			const q = trainingSearch.toLowerCase();
			const matchSearch = !q || l.type?.toLowerCase().includes(q) || l.docNumber?.toLowerCase().includes(q);
			const matchStatus = trainingStatusFilter === 'all' || 
				(trainingStatusFilter === 'valid' && (l.computedStatus === 'ACTIVE' || l.computedStatus === 'VALID')) ||
				(trainingStatusFilter === 'warning' && l.computedStatus === 'EXPIRING_SOON') ||
				(trainingStatusFilter === 'expired' && l.computedStatus === 'EXPIRED');
			return matchSearch && matchStatus;
		})
	);

	let totalCertificatesCount = $derived(
		(trainingData.lmsCertificates || []).length + (trainingData.competencyCerts || []).length
	);

	let totalFilteredCount = $derived(
		(trainingCategoryFilter === 'all' || trainingCategoryFilter === 'certificates' ? filteredLmsCertificates.length + filteredCompetencyCerts.length : 0) +
		(trainingCategoryFilter === 'all' || trainingCategoryFilter === 'trainings' ? filteredTrainings.length : 0) +
		(trainingCategoryFilter === 'all' || trainingCategoryFilter === 'elearning' ? filteredLmsEnrollments.length : 0) +
		(trainingCategoryFilter === 'all' || trainingCategoryFilter === 'licenses' ? filteredDriverLicenses.length : 0)
	);
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
							class="px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 {activeTab === 'training' ? 'bg-surface text-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}">
							<span>Training & Certs (L&D)</span>
							{#if trainingData.summary.totalTrainings > 0 || totalCertificatesCount > 0}
								<span class="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
									{trainingData.summary.totalTrainings + totalCertificatesCount}
								</span>
							{/if}
						</button>
					</div>
				</div>

				<!-- Tab Content -->
				<div class="p-6 md:p-8 flex-1 overflow-y-auto">
					{#if activeTab === 'employment'}
						<div class="space-y-6">
							<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div>
									<p class="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mb-1">Employee ID</p>
									<p class="text-base font-semibold text-on-surface">{employee.payrollId || employee.payroll_id || employee.id}</p>
								</div>
								<div>
									<p class="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mb-1">Job Title</p>
									<p class="text-base font-semibold text-on-surface">{employee.role}</p>
								</div>
								<div>
									<p class="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mb-1">Department</p>
									<p class="text-base font-semibold text-on-surface">{employee.department}</p>
								</div>
								<div>
									<p class="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mb-1">Work Location</p>
									<p class="text-base font-semibold text-on-surface">{employee.location}</p>
								</div>
								<div>
									<p class="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mb-1">Employment Type</p>
									<p class="text-base font-semibold text-on-surface">PKWT / Permanent</p>
								</div>
								<div>
									<p class="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mb-1">Join Date</p>
									<p class="text-base font-semibold text-on-surface">{employee.joinDate}</p>
								</div>
							</div>

							<!-- Timeline History -->
							<div class="pt-6 border-t border-slate-200/60 dark:border-slate-800/60">
								<h4 class="text-sm font-bold text-on-surface mb-4">Career Timeline</h4>
								<div class="space-y-4 relative before:absolute before:inset-0 before:left-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
									{#if employee.timeline && employee.timeline.length > 0}
										{#each employee.timeline as item}
											<div class="relative flex items-start gap-4 ml-2">
												<div class="w-2.5 h-2.5 rounded-full bg-primary mt-1.5 -ml-[5px] ring-4 ring-surface"></div>
												<div>
													<p class="text-xs font-bold text-on-surface">{item.title}</p>
													<p class="text-[11px] text-on-surface-variant">{item.subtitle} • {item.date}</p>
												</div>
											</div>
										{/each}
									{:else}
										<div class="relative flex items-start gap-4 ml-2">
											<div class="w-2.5 h-2.5 rounded-full bg-primary mt-1.5 -ml-[5px] ring-4 ring-surface"></div>
											<div>
												<p class="text-xs font-bold text-on-surface">Joined PT Buana Centra Swakarsa</p>
												<p class="text-[11px] text-on-surface-variant">Bergabung sebagai {employee.role} • {employee.joinDate}</p>
											</div>
										</div>
									{/if}
								</div>
							</div>
						</div>
					{/if}

					{#if activeTab === 'personal'}
						<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
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
						<div class="space-y-6">
							<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
								<div>
									<h4 class="text-sm font-bold text-on-surface">Dokumen Legalitas & Lisensi Driver (DMS)</h4>
									<p class="text-xs text-on-surface-variant mt-0.5">SIM, SIO, KTP, MCU, dan Surat Perjanjian Kerja yang tercatat di DMS</p>
								</div>
								<div class="flex items-center gap-2.5">
									<button
										type="button"
										onclick={() => showSimModal = true}
										class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold rounded-xl shadow-xs hover:from-blue-700 hover:to-indigo-700 transition-all cursor-pointer">
										<span class="material-symbols-outlined text-sm">auto_awesome</span>
										<span>Scan SIM AI</span>
									</button>
									<a href="/dms/transactions/documents/create" class="text-xs font-bold text-primary flex items-center gap-1 hover:underline">
										<span class="material-symbols-outlined text-sm">upload_file</span>
										<span>Tambah Dokumen</span>
									</a>
								</div>
							</div>

							<!-- Static NIK / NPWP Cards -->
							<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div class="p-4 rounded-2xl bg-surface border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
									<p class="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mb-1">National ID (NIK/KTP)</p>
									<p class="text-sm font-semibold text-on-surface">{employee.nik || employee.payrollId || 'Not Provided'}</p>
								</div>
								<div class="p-4 rounded-2xl bg-surface border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
									<p class="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mb-1">Tax ID (NPWP)</p>
									<p class="text-sm font-semibold text-on-surface">{employee.npwp || 'Not Provided'}</p>
								</div>
							</div>

							<!-- Live DMS Documents List -->
							{#if data.dmsDocs && data.dmsDocs.length > 0}
								<div class="space-y-3">
									<p class="text-xs font-bold text-on-surface uppercase tracking-wider">Berkas Tersinkronisasi ({data.dmsDocs.length})</p>
									<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
										{#each data.dmsDocs as doc}
											<div class="p-4 rounded-2xl bg-surface border border-slate-200/60 dark:border-slate-800/60 hover:border-primary/40 transition-colors shadow-xs space-y-2">
												<div class="flex items-center justify-between">
													<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300">
														{doc.type_name || 'Dokumen'}
													</span>
													{#if doc.computedStatus === 'EXPIRED'}
														<span class="text-[10px] font-black text-rose-600">Expired</span>
													{:else if doc.daysRemaining !== null && doc.daysRemaining <= 30}
														<span class="text-[10px] font-black text-amber-600">H-{doc.daysRemaining} (Kritis)</span>
													{:else}
														<span class="text-[10px] font-bold text-emerald-600">Valid</span>
													{/if}
												</div>
												<h5 class="text-xs font-bold text-on-surface line-clamp-1">{doc.title}</h5>
												<p class="text-[11px] font-mono text-on-surface-variant">No: {doc.doc_number || '-'}</p>
												<div class="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
													<span class="text-slate-500">Exp: {doc.expiry_date || 'Permanen'}</span>
													<a href="/dms/transactions/documents/{doc.id}" class="text-primary font-bold hover:underline inline-flex items-center gap-1">
														<span>Detail</span>
														<span class="material-symbols-outlined text-xs">arrow_forward</span>
													</a>
												</div>
											</div>
										{/each}
									</div>
								</div>
							{:else}
								<div class="bg-surface-container-low rounded-2xl p-6 border border-dashed border-outline-variant/50 text-center">
									<span class="material-symbols-outlined text-3xl text-on-surface-variant mb-1">description</span>
									<p class="text-xs font-bold text-on-surface">Belum ada dokumen legal driver di DMS</p>
									<p class="text-[11px] text-on-surface-variant mt-0.5 mb-3">Registrasikan SIM, SIO, atau MCU driver ini di modul DMS.</p>
									<a href="/dms/transactions/documents/create" class="inline-flex items-center gap-1 px-3.5 py-1.5 bg-primary text-on-primary text-xs font-bold rounded-xl">
										<span class="material-symbols-outlined text-sm">add</span>
										<span>Registrasi Dokumen di DMS</span>
									</a>
								</div>
							{/if}
						</div>
					{/if}

					{#if activeTab === 'training'}
						<div class="space-y-6">
							<!-- Header & Action Links -->
							<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
								<div>
									<h4 class="text-sm font-bold text-on-surface">Pelatihan & Riwayat Sertifikasi Kompetensi</h4>
									<p class="text-xs text-on-surface-variant mt-0.5">Data terintegrasi dari BCS Academy (LMS), Katalog Pelatihan HRIS, dan Dokumen Kompetensi DMS</p>
								</div>
								<div class="flex items-center gap-2">
									<a href="/hris/lms" class="text-xs font-bold text-primary flex items-center gap-1.5 hover:underline bg-primary/10 px-3 py-1.5 rounded-xl transition-colors">
										<span class="material-symbols-outlined text-sm">school</span>
										<span>Portal LMS</span>
									</a>
									<a href="/hris/certifications" class="text-xs font-bold text-on-surface flex items-center gap-1.5 hover:bg-surface-container bg-surface-container-low border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl transition-colors">
										<span class="material-symbols-outlined text-sm text-primary">verified</span>
										<span>Katalog K3 & Lisensi</span>
									</a>
								</div>
							</div>

							<!-- Quick KPI Summary Bento -->
							<div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
								<div class="p-4 rounded-2xl bg-surface border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
									<div class="flex items-center justify-between mb-1.5">
										<span class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Total Pelatihan</span>
										<span class="material-symbols-outlined text-base text-blue-600">model_training</span>
									</div>
									<div class="text-2xl font-black text-on-surface">{trainingData.summary.totalTrainings}</div>
									<p class="text-[10px] text-on-surface-variant mt-0.5">Sesi & Workshop Diikuti</p>
								</div>

								<div class="p-4 rounded-2xl bg-surface border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
									<div class="flex items-center justify-between mb-1.5">
										<span class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Sertifikat Resmi</span>
										<span class="material-symbols-outlined text-base text-emerald-600">verified</span>
									</div>
									<div class="text-2xl font-black text-on-surface">{totalCertificatesCount}</div>
									<p class="text-[10px] text-on-surface-variant mt-0.5">LMS & Lisensi SIO/B3</p>
								</div>

								<div class="p-4 rounded-2xl bg-surface border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
									<div class="flex items-center justify-between mb-1.5">
										<span class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Kursus LMS</span>
										<span class="material-symbols-outlined text-base text-purple-600">play_lesson</span>
									</div>
									<div class="text-2xl font-black text-on-surface">{trainingData.lmsEnrollments.length}</div>
									<p class="text-[10px] text-on-surface-variant mt-0.5">{trainingData.summary.activeCourses} Kursus Berjalan</p>
								</div>

								<div class="p-4 rounded-2xl bg-surface border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
									<div class="flex items-center justify-between mb-1.5">
										<span class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Status Masa Berlaku</span>
										{#if trainingData.summary.hasExpired}
											<span class="material-symbols-outlined text-base text-rose-600">warning</span>
										{:else if trainingData.summary.hasWarning}
											<span class="material-symbols-outlined text-base text-amber-600">schedule</span>
										{:else}
											<span class="material-symbols-outlined text-base text-emerald-600">check_circle</span>
										{/if}
									</div>
									{#if trainingData.summary.hasExpired}
										<div class="text-base font-black text-rose-600">{trainingData.summary.expiredCount} Kedaluwarsa</div>
										<p class="text-[10px] text-rose-600 font-medium mt-0.5">Perlu perpanjangan</p>
									{:else if trainingData.summary.hasWarning}
										<div class="text-base font-black text-amber-600">{trainingData.summary.warningCount} Segera Berakhir</div>
										<p class="text-[10px] text-amber-600 font-medium mt-0.5">Masa berlaku &lt; 60 hari</p>
									{:else}
										<div class="text-base font-black text-emerald-600">Semua Valid</div>
										<p class="text-[10px] text-emerald-600 font-medium mt-0.5">Kepatuhan 100%</p>
									{/if}
								</div>
							</div>

							<!-- Segmented Filter Pills & Search Bar (Borderless Style Standard) -->
							<div class="space-y-3 pt-1">
								<!-- Category Filter Tabs -->
								<div class="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
									<button 
										onclick={() => trainingCategoryFilter = 'all'}
										class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer {trainingCategoryFilter === 'all' ? 'bg-primary text-on-primary shadow-xs' : 'bg-surface-container text-on-surface-variant hover:text-on-surface'}">
										Semua Data ({trainingData.summary.totalTrainings + totalCertificatesCount + trainingData.lmsEnrollments.length + trainingData.driverLicenses.length})
									</button>
									<button 
										onclick={() => trainingCategoryFilter = 'certificates'}
										class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer {trainingCategoryFilter === 'certificates' ? 'bg-primary text-on-primary shadow-xs' : 'bg-surface-container text-on-surface-variant hover:text-on-surface'}">
										Sertifikat Resmi ({totalCertificatesCount})
									</button>
									<button 
										onclick={() => trainingCategoryFilter = 'trainings'}
										class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer {trainingCategoryFilter === 'trainings' ? 'bg-primary text-on-primary shadow-xs' : 'bg-surface-container text-on-surface-variant hover:text-on-surface'}">
										Riwayat Pelatihan ({trainingData.trainings.length})
									</button>
									<button 
										onclick={() => trainingCategoryFilter = 'elearning'}
										class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer {trainingCategoryFilter === 'elearning' ? 'bg-primary text-on-primary shadow-xs' : 'bg-surface-container text-on-surface-variant hover:text-on-surface'}">
										E-Learning LMS ({trainingData.lmsEnrollments.length})
									</button>
									<button 
										onclick={() => trainingCategoryFilter = 'licenses'}
										class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer {trainingCategoryFilter === 'licenses' ? 'bg-primary text-on-primary shadow-xs' : 'bg-surface-container text-on-surface-variant hover:text-on-surface'}">
										Lisensi SIM ({trainingData.driverLicenses.length})
									</button>
								</div>

								<!-- Search & Status Filter Controls -->
								<div class="flex flex-col sm:flex-row gap-2.5">
									<div class="flex-1 flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-surface-container-low focus-within:ring-2 focus-within:ring-primary/20 transition-all">
										<span class="material-symbols-outlined text-on-surface-variant text-[18px]">search</span>
										<input 
											type="text" 
											bind:value={trainingSearch} 
											placeholder="Cari judul pelatihan, instruktur, nomor sertifikat, atau kategori..." 
											class="bg-transparent text-xs text-on-surface border-0 outline-none w-full placeholder:text-on-surface-variant/50 focus:ring-0" 
										/>
										{#if trainingSearch}
											<button onclick={() => trainingSearch = ''} class="text-on-surface-variant hover:text-on-surface">
												<span class="material-symbols-outlined text-sm">close</span>
											</button>
										{/if}
									</div>

									<div class="flex items-center gap-1.5">
										<select 
											bind:value={trainingStatusFilter} 
											class="bg-surface-container-low text-on-surface rounded-xl px-3 py-2 text-xs border-0 outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer font-medium">
											<option value="all">Semua Status</option>
											<option value="valid">Lulus / Valid</option>
											<option value="warning">Masa Berlaku Kritis (H-60)</option>
											<option value="expired">Kedaluwarsa (Expired)</option>
										</select>
									</div>
								</div>
							</div>

							<!-- Section 1: Sertifikat Resmi & Lisensi Khusus (LMS Certificates & DMS Docs) -->
							{#if (trainingCategoryFilter === 'all' || trainingCategoryFilter === 'certificates') && (filteredLmsCertificates.length > 0 || filteredCompetencyCerts.length > 0)}
								<div class="space-y-3 pt-2">
									<div class="flex items-center justify-between">
										<h5 class="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
											<span class="material-symbols-outlined text-base text-emerald-600">verified</span>
											<span>Sertifikat Resmi & Lisensi Khusus ({filteredLmsCertificates.length + filteredCompetencyCerts.length})</span>
										</h5>
									</div>

									<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
										<!-- LMS Official Certificates -->
										{#each filteredLmsCertificates as cert}
											<div class="p-4 rounded-2xl bg-surface border border-slate-200/60 dark:border-slate-800/60 shadow-xs space-y-3 hover:border-primary/40 transition-colors">
												<div class="flex items-center justify-between">
													<span class="px-2 py-0.5 rounded-md text-[10px] font-bold border {getCategoryColor(cert.category)}">
														{cert.category}
													</span>
													{#if cert.computedStatus === 'EXPIRED'}
														<span class="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800">
															<span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Expired
														</span>
													{:else if cert.daysRemaining !== null && cert.daysRemaining <= 60}
														<span class="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
															<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> H-{cert.daysRemaining} Hari
														</span>
													{:else}
														<span class="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
															<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Valid
														</span>
													{/if}
												</div>

												<div>
													<h6 class="text-xs font-bold text-on-surface line-clamp-2">{cert.courseTitle}</h6>
													<p class="text-[11px] font-mono text-on-surface-variant mt-1">No: {cert.certificateNumber}</p>
												</div>

												<div class="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
													<div>
														<p class="text-on-surface-variant text-[10px]">Terbit: {formatDate(cert.issuedAt)}</p>
														<p class="text-on-surface-variant text-[10px]">Berlaku: {cert.validUntil ? formatDate(cert.validUntil) : 'Permanen'}</p>
													</div>
													<div class="text-right">
														<span class="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 text-[10px] font-bold">
															Skor: {cert.score}
														</span>
														{#if cert.qrVerifyUrl}
															<div class="mt-1">
																<a href={cert.qrVerifyUrl} target="_blank" rel="noopener noreferrer" class="text-primary hover:underline text-[10px] font-bold inline-flex items-center gap-0.5">
																	<span>Verifikasi QR</span>
																	<span class="material-symbols-outlined text-[10px]">open_in_new</span>
																</a>
															</div>
														{/if}
													</div>
												</div>
											</div>
										{/each}

										<!-- DMS SIO & B3 Competency Docs -->
										{#each filteredCompetencyCerts as doc}
											<div class="p-4 rounded-2xl bg-surface border border-slate-200/60 dark:border-slate-800/60 shadow-xs space-y-3 hover:border-primary/40 transition-colors">
												<div class="flex items-center justify-between">
													<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
														{doc.type_name || 'Lisensi Kompetensi'}
													</span>
													{#if doc.computedStatus === 'EXPIRED'}
														<span class="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800">
															<span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Expired
														</span>
													{:else if doc.daysRemaining !== null && doc.daysRemaining <= 60}
														<span class="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
															<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> H-{doc.daysRemaining} Hari
														</span>
													{:else}
														<span class="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
															<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Aktif
														</span>
													{/if}
												</div>

												<div>
													<h6 class="text-xs font-bold text-on-surface line-clamp-2">{doc.title}</h6>
													<p class="text-[11px] font-mono text-on-surface-variant mt-1">No: {doc.doc_number || '-'}</p>
												</div>

												<div class="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
													<span class="text-on-surface-variant text-[10px]">
														Exp: {doc.expiry_date ? formatDate(doc.expiry_date) : 'Permanen'}
													</span>
													<a href="/dms/transactions/documents/{doc.id}" class="text-primary hover:underline text-[11px] font-bold inline-flex items-center gap-1">
														<span>Buka Berkas DMS</span>
														<span class="material-symbols-outlined text-xs">arrow_forward</span>
													</a>
												</div>
											</div>
										{/each}
									</div>
								</div>
							{/if}

							<!-- Section 2: E-Learning LMS (Courses & Progress) -->
							{#if (trainingCategoryFilter === 'all' || trainingCategoryFilter === 'elearning') && filteredLmsEnrollments.length > 0}
								<div class="space-y-3 pt-2">
									<div class="flex items-center justify-between">
										<h5 class="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
											<span class="material-symbols-outlined text-base text-purple-600">play_lesson</span>
											<span>Kursus E-Learning LMS Terdaftar ({filteredLmsEnrollments.length})</span>
										</h5>
									</div>

									<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
										{#each filteredLmsEnrollments as item}
											<div class="p-4 rounded-2xl bg-surface border border-slate-200/60 dark:border-slate-800/60 shadow-xs space-y-3 hover:border-primary/40 transition-colors">
												<div class="flex items-center justify-between">
													<span class="px-2 py-0.5 rounded-md text-[10px] font-bold border {getCategoryColor(item.category)}">
														{item.category}
													</span>
													{#if item.status === 'COMPLETED'}
														<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
															Selesai
														</span>
													{:else if item.status === 'IN_PROGRESS'}
														<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
															Sedang Berjalan
														</span>
													{:else}
														<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
															Terdaftar
														</span>
													{/if}
												</div>

												<div>
													<h6 class="text-xs font-bold text-on-surface line-clamp-2">{item.courseTitle}</h6>
													<p class="text-[11px] text-on-surface-variant mt-0.5">Instruktur: {item.instructor}</p>
												</div>

												<!-- Progress Bar -->
												<div class="space-y-1">
													<div class="flex justify-between text-[10px] font-bold">
														<span class="text-on-surface-variant">Progress Pembelajaran</span>
														<span class="text-primary">{item.progressPercent}%</span>
													</div>
													<div class="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
														<div class="bg-primary h-1.5 rounded-full transition-all duration-300" style="width: {item.progressPercent}%"></div>
													</div>
												</div>

												<div class="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
													<div class="text-[10px] text-on-surface-variant">
														<span>Daftar: {formatDate(item.enrolledAt)}</span>
														{#if item.deadline}
															<span class="ml-2">Batas: {formatDate(item.deadline)}</span>
														{/if}
													</div>
													{#if item.preTestScore !== null}
														<span class="text-[10px] font-bold text-on-surface-variant">
															Pre-Test: {item.preTestScore}
														</span>
													{/if}
												</div>
											</div>
										{/each}
									</div>
								</div>
							{/if}

							<!-- Section 3: Driver Operational Licenses (SIM) -->
							{#if (trainingCategoryFilter === 'all' || trainingCategoryFilter === 'licenses') && filteredDriverLicenses.length > 0}
								<div class="space-y-3 pt-2">
									<div class="flex items-center justify-between">
										<h5 class="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
											<span class="material-symbols-outlined text-base text-amber-600">badge</span>
											<span>Lisensi Mengemudi Pengemudi ({filteredDriverLicenses.length})</span>
										</h5>
										<button
											type="button"
											onclick={() => showSimModal = true}
											class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 rounded-xl text-xs font-bold hover:bg-amber-500/20 transition-colors cursor-pointer">
											<span class="material-symbols-outlined text-sm">auto_awesome</span>
											<span>Scan SIM AI</span>
										</button>
									</div>

									<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
										{#each filteredDriverLicenses as lic}
											<div class="p-4 rounded-2xl bg-surface border border-slate-200/60 dark:border-slate-800/60 shadow-xs space-y-2 hover:border-primary/40 transition-colors">
												<div class="flex items-center justify-between">
													<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20">
														{lic.type}
													</span>
													{#if lic.computedStatus === 'EXPIRED'}
														<span class="text-[10px] font-bold text-rose-600">Expired</span>
													{:else if lic.daysRemaining !== null && lic.daysRemaining <= 60}
														<span class="text-[10px] font-bold text-amber-600">H-{lic.daysRemaining}</span>
													{:else}
														<span class="text-[10px] font-bold text-emerald-600">Valid</span>
													{/if}
												</div>
												<h6 class="text-xs font-bold text-on-surface font-mono">{lic.docNumber}</h6>
												<p class="text-[11px] text-on-surface-variant">Penerbit: Korlantas RI</p>
												<p class="text-[10px] text-slate-400 font-mono">Exp: {lic.expiryDate ? formatDate(lic.expiryDate) : 'Permanen'}</p>
											</div>
										{/each}
									</div>
								</div>
							{:else if trainingCategoryFilter === 'licenses' && filteredDriverLicenses.length === 0}
								<div class="bg-surface-container-low rounded-2xl p-6 border border-dashed border-outline-variant/50 text-center space-y-3 pt-4">
									<div class="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
										<span class="material-symbols-outlined text-2xl">badge</span>
									</div>
									<div>
										<p class="text-xs font-bold text-on-surface">Belum ada lisensi mengemudi terdata</p>
										<p class="text-[11px] text-on-surface-variant mt-0.5">Karyawan ini belum memiliki data SIM A, B1, B2 Umum, atau C aktif.</p>
									</div>
									<button
										type="button"
										onclick={() => showSimModal = true}
										class="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold rounded-xl shadow-xs hover:from-blue-700 hover:to-indigo-700 transition-all cursor-pointer">
										<span class="material-symbols-outlined text-sm">auto_awesome</span>
										<span>Scan & Daftarkan SIM (AI)</span>
									</button>
								</div>
							{/if}

							<!-- Section 4: Riwayat Katalog Pelatihan HRIS (Programs & Workshops) -->
							{#if (trainingCategoryFilter === 'all' || trainingCategoryFilter === 'trainings') && filteredTrainings.length > 0}
								<div class="space-y-3 pt-2">
									<div class="flex items-center justify-between">
										<h5 class="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
											<span class="material-symbols-outlined text-base text-blue-600">history_edu</span>
											<span>Riwayat Program Pelatihan & Workshop ({filteredTrainings.length})</span>
										</h5>
									</div>

									<!-- Compact Card Grid / List -->
									<div class="space-y-2.5">
										{#each filteredTrainings as trn}
											<div class="p-4 rounded-2xl bg-surface border border-slate-200/60 dark:border-slate-800/60 hover:border-primary/40 transition-colors shadow-xs">
												<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
													<div class="flex items-center gap-2 flex-wrap">
														<span class="px-2 py-0.5 rounded text-[10px] font-bold border {getCategoryColor(trn.category)}">
															{trn.category}
														</span>
														<span class="font-mono text-[10px] text-slate-400">
															{trn.programId}
														</span>
														{#if trn.batch}
															<span class="px-1.5 py-0.5 rounded bg-surface-container text-[10px] font-medium text-on-surface-variant">
																Batch {trn.batch}
															</span>
														{/if}
													</div>

													<div class="flex items-center gap-2">
														{#if trn.score && trn.score !== '-'}
															<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-surface-container text-on-surface">
																Hasil: {trn.score}
															</span>
														{/if}
														{#if trn.status === 'LULUS'}
															<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
																Lulus
															</span>
														{:else if trn.status === 'ATTENDED' || trn.status === 'SELESAI'}
															<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
																Hadir
															</span>
														{:else}
															<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
																{trn.status || 'Tercatat'}
															</span>
														{/if}
													</div>
												</div>

												<div class="flex flex-col md:flex-row md:items-center justify-between gap-2">
													<div>
														<h6 class="text-xs font-bold text-on-surface">{trn.title}</h6>
														<p class="text-[11px] text-on-surface-variant mt-0.5 flex items-center gap-2">
															<span>Instruktur: <strong class="text-on-surface font-semibold">{trn.trainer}</strong></span>
															{#if trn.startDate}
																<span>•</span>
																<span>Pelaksanaan: {formatDate(trn.startDate)}{trn.endDate && trn.endDate !== trn.startDate ? ` s/d ${formatDate(trn.endDate)}` : ''}</span>
															{/if}
														</p>
													</div>

													{#if trn.certificateExpiry}
														<div class="text-right sm:text-right">
															<span class="text-[10px] font-mono {trn.computedStatus === 'EXPIRED' ? 'text-rose-600 font-bold' : trn.computedStatus === 'EXPIRING_SOON' ? 'text-amber-600 font-bold' : 'text-slate-400'}">
																Berlaku s/d: {formatDate(trn.certificateExpiry)}
															</span>
															{#if trn.daysRemaining !== null}
																<p class="text-[10px] {trn.daysRemaining < 0 ? 'text-rose-600 font-bold' : trn.daysRemaining <= 60 ? 'text-amber-600 font-bold' : 'text-emerald-600 font-medium'}">
																	{trn.daysRemaining < 0 ? 'Telah kedaluwarsa' : `Sisa ${trn.daysRemaining} hari`}
																</p>
															{/if}
														</div>
													{/if}
												</div>
											</div>
										{/each}
									</div>
								</div>
							{/if}

							<!-- Section 5: Empty State when no data or search yields nothing -->
							{#if totalFilteredCount === 0}
								<div class="bg-surface-container-low rounded-2xl p-8 border border-dashed border-outline-variant/50 text-center space-y-3">
									<div class="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center mx-auto text-on-surface-variant">
										<span class="material-symbols-outlined text-2xl">school</span>
									</div>
									<div>
										<p class="text-xs font-bold text-on-surface">Tidak ada data pelatihan atau sertifikasi ditemukan</p>
										<p class="text-[11px] text-on-surface-variant mt-1 max-w-md mx-auto">
											{#if trainingSearch || trainingStatusFilter !== 'all'}
												Tidak ada data yang cocok dengan kriteria pencarian "{trainingSearch}". Coba ubah kata kunci atau bersihkan filter.
											{:else}
												Karyawan ini belum memiliki riwayat kursus di BCS Academy, riwayat pelatihan terdata, atau lisensi kompetensi pada kategori ini.
											{/if}
										</p>
									</div>
									<div class="flex items-center justify-center gap-2 pt-2">
										{#if trainingSearch || trainingStatusFilter !== 'all'}
											<button 
												onclick={() => { trainingSearch = ''; trainingStatusFilter = 'all'; }}
												class="inline-flex items-center gap-1 px-3.5 py-1.5 bg-surface border border-slate-200 dark:border-slate-800 text-on-surface text-xs font-bold rounded-xl hover:bg-surface-container transition-colors">
												<span class="material-symbols-outlined text-sm">restart_alt</span>
												<span>Reset Filter</span>
											</button>
										{/if}
										<a 
											href="/hris/lms"
											class="inline-flex items-center gap-1 px-3.5 py-1.5 bg-primary text-on-primary text-xs font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-xs">
											<span class="material-symbols-outlined text-sm">add_circle</span>
											<span>Daftarkan ke Kursus LMS</span>
										</a>
									</div>
								</div>
							{/if}
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>

<!-- AI SIM Scanner Modal -->
<DriverSimAiScannerModal
	isOpen={showSimModal}
	selectedDriver={selectedDriverForSim}
	onClose={() => { showSimModal = false; }}
	onSuccess={() => { invalidateAll(); }}
/>
