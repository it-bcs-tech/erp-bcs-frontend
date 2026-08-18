<script lang="ts">
	import type { PageData } from './$types';
	
	let { data }: { data: PageData } = $props();
	const { actions, metrics, dataSource } = data;

	let activeTab = $state('All Actions');
	const tabs = ['All Actions', 'Mutations & Promotions', 'Warning Letters (SP)', 'Terminations'];

	let filteredActions = $derived(
		activeTab === 'All Actions' ? actions :
		activeTab === 'Mutations & Promotions' ? actions.filter((a: Record<string, any>) => a.type.includes('Mutation') || a.type.includes('Promotion')) :
		activeTab === 'Warning Letters (SP)' ? actions.filter((a: Record<string, any>) => a.type.includes('Warning')) :
		actions.filter((a: Record<string, any>) => a.type.includes('Termination'))
	);

	// Pagination State
	let currentPage = $state(1);
	const itemsPerPage = 10;

	$effect(() => {
		activeTab;
		currentPage = 1;
	});

	let totalPages = $derived(Math.max(1, Math.ceil(filteredActions.length / itemsPerPage)));
	let startItem = $derived(filteredActions.length === 0 ? 0 : ((currentPage - 1) * itemsPerPage) + 1);
	let endItem = $derived(Math.min(currentPage * itemsPerPage, filteredActions.length));
	let paginatedActions = $derived(filteredActions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage));

	let isAddModalOpen = $state(false);
	let actionType = $state('');
	const masterData = data.masterData;

	// Official Letter Document Generator State
	let showDocModal = $state(false);
	let selectedActionDoc = $state<any>(null);

	function openOfficialLetter(action: any) {
		selectedActionDoc = action;
		showDocModal = true;
	}

	function closeDocModal() {
		showDocModal = false;
		selectedActionDoc = null;
	}

	function getLetterTypeTitle(type: string) {
		if (type?.includes('Warning')) return 'SURAT PERINGATAN (SP)';
		if (type?.includes('Mutation')) return 'SURAT KEPUTUSAN MUTASI KERJA';
		if (type?.includes('Promotion')) return 'SURAT KEPUTUSAN PROMOSI JABATAN';
		if (type?.includes('Termination')) return 'SURAT PENGALAMAN KERJA (PAKLARING)';
		return 'SURAT KEPUTUSAN RESMI PERUSAHAAN';
	}

	function getLetterNumber(action: any) {
		const prefix = action.type?.includes('Warning') ? 'SP-01' :
					   action.type?.includes('Mutation') ? 'SK-MUT' :
					   action.type?.includes('Promotion') ? 'SK-PROM' : 'PKL';
		return `${prefix}/BCS-HRD/2026/08/${action.id?.replace(/[^0-9]/g, '') || '042'}`;
	}
</script>

<svelte:head>
	<title>Lifecycle & Disciplinary | HRIS BCS</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Header & Actions -->
	<header class="flex flex-col md:flex-row md:items-end justify-between gap-4">
		<div>
			<div class="flex items-center gap-2">
				<span class="material-symbols-outlined text-primary text-2xl">manage_accounts</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Lifecycle & Dokumen Resmi HRD</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-sm mt-0.5">
				Kelola Mutasi, Promosi, Surat Peringatan (SP), Terminasi & Cetak Dokumen Legal BCS
			</p>
		</div>
		<div class="flex gap-2.5 items-center">
			<button 
				class="bg-primary text-on-primary px-4 py-2.5 rounded-xl text-sm font-bold shadow-xs flex items-center gap-2 hover:bg-primary/90 transition-colors cursor-pointer"
				onclick={() => { isAddModalOpen = true; actionType = ''; }}
			>
				<span class="material-symbols-outlined text-lg">post_add</span>
				<span>Buat Tindakan Baru</span>
			</button>
		</div>
	</header>

	<!-- Metrics Cards -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
		<div class="bg-surface-container-low p-5 rounded-2xl border border-primary/20 shadow-xs flex items-center justify-between">
			<div>
				<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Mutasi & Promosi Aktif</p>
				<h3 class="text-3xl font-black text-on-surface">{metrics.activeMutations}</h3>
			</div>
			<div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
				<span class="material-symbols-outlined text-2xl">swap_horiz</span>
			</div>
		</div>
		<div class="bg-surface-container-low p-5 rounded-2xl border border-rose-500/20 shadow-xs flex items-center justify-between">
			<div>
				<p class="text-xs font-bold text-rose-600 uppercase tracking-wider mb-1">Surat Peringatan (SP)</p>
				<h3 class="text-3xl font-black text-rose-600">{metrics.activeWarnings}</h3>
			</div>
			<div class="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600">
				<span class="material-symbols-outlined text-2xl">warning</span>
			</div>
		</div>
		<div class="bg-surface-container-low p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex items-center justify-between">
			<div>
				<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Offboarding & Paklaring</p>
				<h3 class="text-3xl font-black text-on-surface">{metrics.pendingTerminations}</h3>
			</div>
			<div class="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
				<span class="material-symbols-outlined text-2xl">description</span>
			</div>
		</div>
	</div>

	<!-- Tabs -->
	<div class="flex gap-2 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
		{#each tabs as tab}
			<button 
				class="px-4 py-2.5 text-xs font-bold whitespace-nowrap rounded-xl transition-all cursor-pointer {activeTab === tab ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface-variant hover:bg-surface-container'}"
				onclick={() => activeTab = tab}
			>
				{tab}
			</button>
		{/each}
	</div>

	<!-- Data Table -->
	<div class="bg-surface-container-low rounded-2xl shadow-xs border border-slate-200/60 dark:border-slate-800/60 overflow-hidden">
		<div class="overflow-x-auto">
			<table class="w-full text-left border-collapse min-w-[900px] text-sm">
				<thead>
					<tr class="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50">
						<th class="py-4 px-6 text-xs font-bold uppercase tracking-wider text-on-surface-variant">No. Dokumen & Tanggal</th>
						<th class="py-4 px-6 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Jenis Tindakan</th>
						<th class="py-4 px-6 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Karyawan</th>
						<th class="py-4 px-6 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Keterangan / Alasan</th>
						<th class="py-4 px-6 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Status</th>
						<th class="py-4 px-6 text-xs font-bold uppercase tracking-wider text-on-surface-variant text-right">Cetak Surat</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
					{#if paginatedActions.length === 0}
						<tr>
							<td colspan="6" class="py-12 text-center text-slate-400">Belum ada data tindakan resmi pada filter ini.</td>
						</tr>
					{:else}
						{#each paginatedActions as action}
							<tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
								<td class="py-4 px-6">
									<div class="flex flex-col">
										<span class="text-xs font-mono font-bold text-primary">{action.id}</span>
										<span class="text-xs text-on-surface-variant mt-0.5">{action.date}</span>
									</div>
								</td>
								<td class="py-4 px-6">
									<span class="inline-flex items-center gap-1.5 font-bold text-xs px-2.5 py-1 rounded-lg {action.type.includes('Warning') ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20' : action.type.includes('Mutation') ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'}">
										{#if action.type.includes('Mutation')}
											<span class="material-symbols-outlined text-[14px]">swap_horiz</span>
										{:else if action.type.includes('Promotion')}
											<span class="material-symbols-outlined text-[14px]">trending_up</span>
										{:else if action.type.includes('Warning')}
											<span class="material-symbols-outlined text-[14px]">warning</span>
										{:else}
											<span class="material-symbols-outlined text-[14px]">person_remove</span>
										{/if}
										{action.type}
									</span>
								</td>
								<td class="py-4 px-6">
									<p class="font-bold text-on-surface">{action.employeeName}</p>
									<p class="text-xs text-on-surface-variant font-mono mt-0.5">{action.employeeId}</p>
								</td>
								<td class="py-4 px-6">
									<p class="text-xs text-on-surface max-w-[280px] truncate" title={action.description}>{action.description}</p>
								</td>
								<td class="py-4 px-6">
									<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
										{action.status}
									</span>
								</td>
								<td class="py-4 px-6 text-right">
									<button 
										onclick={() => openOfficialLetter(action)}
										class="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-primary transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
									>
										<span class="material-symbols-outlined text-sm">print</span>
										<span>Cetak Dokumen</span>
									</button>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
		
		<!-- Pagination Footer -->
		<div class="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-surface-container-low">
			<p class="text-xs text-on-surface-variant font-medium">Menampilkan {startItem} - {endItem} dari {filteredActions.length} data</p>
			<div class="flex gap-1">
				<button 
					class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container disabled:opacity-50 transition-colors" 
					disabled={currentPage <= 1}
					onclick={() => currentPage -= 1}>
					<span class="material-symbols-outlined text-lg">chevron_left</span>
				</button>
				<span class="w-8 h-8 rounded-lg flex items-center justify-center bg-primary text-on-primary font-bold text-xs shadow-xs">{currentPage}</span>
				<button 
					class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container disabled:opacity-50 transition-colors"
					disabled={currentPage >= totalPages}
					onclick={() => currentPage += 1}>
					<span class="material-symbols-outlined text-lg">chevron_right</span>
				</button>
			</div>
		</div>
	</div>
</div>

<!-- MODAL DOKUMEN RESMI RESMI KOP SURAT (SP / MUTASI / PAKLARING) -->
{#if showDocModal && selectedActionDoc}
	<div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white">
		<div class="bg-surface rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-3xl overflow-hidden my-8 print:my-0 print:border-none print:shadow-none print:w-full">
			<!-- Header Kop Perusahaan -->
			<div class="p-6 bg-slate-900 text-white flex items-center justify-between print:bg-white print:text-black print:border-b-2 print:border-black">
				<div class="flex items-center gap-4">
					<div class="w-12 h-12 rounded-2xl bg-white/10 text-white flex items-center justify-center font-black text-xl border border-white/20 print:bg-slate-100 print:text-black">
						BCS
					</div>
					<div>
						<h2 class="text-base font-black tracking-tight print:text-lg">PT BUMI CITRA SENTOSA (BCS LOGISTICS)</h2>
						<p class="text-xs text-slate-400 print:text-slate-600 font-medium">Head Office: Jl. Raya Anyer No. 88, Cilegon, Banten | Telp: (0254) 389-1234</p>
					</div>
				</div>
				<button onclick={closeDocModal} class="text-slate-400 hover:text-white transition-colors cursor-pointer print:hidden">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<!-- Lembar Surat Resmi (A4 Layout) -->
			<div class="p-8 space-y-6 text-xs text-on-surface leading-relaxed">
				<div class="text-center space-y-1 pb-4 border-b border-slate-200 dark:border-slate-800">
					<h3 class="text-base font-black uppercase tracking-wider text-on-surface underline">
						{getLetterTypeTitle(selectedActionDoc.type)}
					</h3>
					<p class="text-xs font-mono font-bold text-slate-500">
						Nomor: {getLetterNumber(selectedActionDoc)}
					</p>
				</div>

				<p>Yang bertanda tangan di bawah ini atas nama Manajemen PT Bumi Citra Sentosa:</p>

				<div class="space-y-1 pl-4 border-l-2 border-primary/40 font-medium">
					<p><span class="w-32 inline-block text-slate-400">Nama Perusahaan</span>: <strong>PT Bumi Citra Sentosa</strong></p>
					<p><span class="w-32 inline-block text-slate-400">Alamat Kantor</span>: Jl. Raya Anyer No. 88, Cilegon, Banten</p>
					<p><span class="w-32 inline-block text-slate-400">Bidang Usaha</span>: Jasa Transportasi Darat & Logistik Industri</p>
				</div>

				<p>Dengan ini menerangkan/menetapkan kepada karyawan di bawah ini:</p>

				<div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
					<div class="grid grid-cols-2 gap-2">
						<div>
							<span class="text-slate-400 block text-[11px]">Nama Karyawan:</span>
							<span class="text-sm font-bold text-on-surface">{selectedActionDoc.employeeName}</span>
						</div>
						<div>
							<span class="text-slate-400 block text-[11px]">Nomor Induk Karyawan (NIK):</span>
							<span class="text-sm font-mono font-bold text-on-surface">{selectedActionDoc.employeeId}</span>
						</div>
					</div>
				</div>

				<!-- Isi Dokumen Sesuai Jenis Surat -->
				{#if selectedActionDoc.type.includes('Warning')}
					<div class="space-y-3">
						<p class="font-bold text-rose-600">Dasar dan Alasan Pemberian Surat Peringatan:</p>
						<p class="p-3 bg-rose-500/5 rounded-xl border border-rose-500/20 text-on-surface italic">
							"{selectedActionDoc.description}"
						</p>
						<p>
							Surat Peringatan ini berlaku selama <strong>6 (enam) bulan</strong> terhitung sejak tanggal diterbitkan. Apabila dalam kurun waktu tersebut karyawan yang bersangkutan melakukan pelanggaran serupa atau melanggar Peraturan Perusahaan, maka akan dikenakan sanksi disipliner yang lebih berat sesuai ketentuan ketenagakerjaan yang berlaku.
						</p>
					</div>
				{:else if selectedActionDoc.type.includes('Mutation') || selectedActionDoc.type.includes('Promotion')}
					<div class="space-y-3">
						<p class="font-bold text-primary">Ketetapan Penyesuaian Penempatan & Tugas:</p>
						<p class="p-3 bg-primary/5 rounded-xl border border-primary/20 text-on-surface">
							"{selectedActionDoc.description}"
						</p>
						<p>
							Ketetapan ini mulai berlaku efektif sejak tanggal <strong>{selectedActionDoc.date}</strong>. Diharapkan karyawan yang bersangkutan dapat segera melakukan serah terima tugas (handover) dan menjalankan amanah dengan penuh tanggung jawab.
						</p>
					</div>
				{:else}
					<div class="space-y-3">
						<p class="font-bold text-slate-700 dark:text-slate-300">Keterangan Masa Kerja & Dedikasi:</p>
						<p class="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-on-surface">
							"{selectedActionDoc.description}"
						</p>
						<p>
							Perusahaan mengucapkan terima kasih yang sebesar-besarnya atas segala dedikasi, kerja sama, dan loyalitas yang telah diberikan selama menjadi bagian dari keluarga besar PT Bumi Citra Sentosa.
						</p>
					</div>
				{/if}

				<!-- Tanda Tangan Resmi -->
				<div class="grid grid-cols-2 gap-8 pt-8 border-t border-slate-200 dark:border-slate-800">
					<div class="space-y-1">
						<p class="text-slate-400">Karyawan Yang Bersangkutan,</p>
						<div class="h-16"></div>
						<p class="font-bold text-on-surface underline">{selectedActionDoc.employeeName}</p>
						<p class="text-[10px] text-slate-400">NIK: {selectedActionDoc.employeeId}</p>
					</div>
					<div class="text-right space-y-1">
						<p class="text-slate-400">Cilegon, {selectedActionDoc.date}</p>
						<p class="font-bold text-on-surface">PT BUMI CITRA SENTOSA</p>
						<div class="h-12 flex items-center justify-end">
							<span class="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-600 font-mono font-bold border border-emerald-500/20">
								✅ VALID DIGITAL SIGNED
							</span>
						</div>
						<p class="font-bold text-on-surface underline">Human Resources Department</p>
						<p class="text-[10px] text-slate-400">Management Representative</p>
					</div>
				</div>
			</div>

			<!-- Footer Modal Action -->
			<div class="p-4 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center border-t border-slate-200 dark:border-slate-800 print:hidden">
				<p class="text-[10px] text-slate-400">Dokumen Legal Sah - PT Bumi Citra Sentosa</p>
				<div class="flex gap-2">
					<button
						onclick={closeDocModal}
						class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 cursor-pointer"
					>
						Tutup
					</button>
					<button
						onclick={() => window.print()}
						class="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
					>
						<span class="material-symbols-outlined text-sm">print</span>
						<span>Cetak Dokumen Resmi (A4)</span>
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- NEW ACTION MODAL -->
{#if isAddModalOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<div class="absolute inset-0 bg-black/40 backdrop-blur-sm" onclick={() => isAddModalOpen = false}></div>
		
		<div class="relative bg-surface-container-lowest rounded-[24px] shadow-xl w-full max-w-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
			<!-- Modal Header -->
			<div class="px-8 py-6 border-b border-surface-container flex items-center justify-between bg-surface-container-lowest z-10">
				<div>
					<h2 class="text-xl font-bold text-on-surface">Create New Action</h2>
					<p class="text-sm text-on-surface-variant mt-1">Record a mutation, promotion, warning, or termination.</p>
				</div>
				<button class="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors" onclick={() => isAddModalOpen = false}>
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<!-- Modal Body -->
			<div class="p-8 overflow-y-auto max-h-[70vh] flex-1">
				<form method="POST" action="?/addAction" id="action-form" class="space-y-6" onsubmit={() => setTimeout(() => window.location.reload(), 500)}>
					
					<!-- 1. Select Employee -->
					<div class="space-y-1.5">
						<label class="text-sm font-bold text-on-surface flex items-center gap-2">
							<span class="material-symbols-outlined text-[16px] text-primary">person</span>
							Select Employee
						</label>
						<select name="employeeId" class="w-full px-4 py-3 rounded-xl bg-surface-container border border-outline-variant/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm font-medium cursor-pointer" required>
							<option value="" disabled selected>Search and select employee...</option>
							{#each masterData?.employees || [] as emp}
								<option value={emp.id}>{emp.name} ({emp.id})</option>
							{/each}
						</select>
					</div>

					<!-- 2. Select Action Type -->
					<div class="space-y-1.5">
						<label class="text-sm font-bold text-on-surface flex items-center gap-2">
							<span class="material-symbols-outlined text-[16px] text-primary">category</span>
							Action Type
						</label>
						<select name="actionType" bind:value={actionType} class="w-full px-4 py-3 rounded-xl bg-surface-container border border-outline-variant/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm font-medium cursor-pointer" required>
							<option value="" disabled selected>Select action type...</option>
							<option value="Mutation">Mutation (Transfer)</option>
							<option value="Promotion">Promotion</option>
							<option value="Demotion">Demotion</option>
							<option value="Warning">Warning Letter (SP)</option>
							<option value="Termination">Termination (Resign/PHK)</option>
						</select>
					</div>

					<div class="h-px bg-surface-container w-full"></div>

					<!-- 3. Dynamic Form Fields -->
					{#if ['Mutation', 'Promotion', 'Demotion'].includes(actionType)}
						<div class="space-y-4 animate-in fade-in slide-in-from-top-4">
							<h3 class="text-sm font-bold text-primary uppercase tracking-wider mb-2">New Position Details</h3>
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div class="space-y-1.5">
									<label class="text-xs font-bold text-on-surface-variant">New Title / Role</label>
									<select name="newTitle" class="w-full px-3 py-2 rounded-lg bg-surface-container border border-outline-variant/50 focus:border-primary text-sm" required>
										<option value="" disabled selected>Select title...</option>
										{#each masterData?.titles || [] as t}
											<option value={t.id}>{t.name}</option>
										{/each}
									</select>
								</div>
								<div class="space-y-1.5">
									<label class="text-xs font-bold text-on-surface-variant">New Department</label>
									<select name="newDept" class="w-full px-3 py-2 rounded-lg bg-surface-container border border-outline-variant/50 focus:border-primary text-sm" required>
										<option value="" disabled selected>Select department...</option>
										{#each masterData?.departments || [] as d}
											<option value={d.id}>{d.name}</option>
										{/each}
									</select>
								</div>
								<div class="space-y-1.5">
									<label class="text-xs font-bold text-on-surface-variant">New Location</label>
									<select name="newLoc" class="w-full px-3 py-2 rounded-lg bg-surface-container border border-outline-variant/50 focus:border-primary text-sm" required>
										<option value="" disabled selected>Select location...</option>
										{#each masterData?.locations || [] as l}
											<option value={l.id}>{l.name}</option>
										{/each}
									</select>
								</div>
								<div class="space-y-1.5">
									<label class="text-xs font-bold text-on-surface-variant">Effective Date</label>
									<input type="date" name="effectiveDate" class="w-full px-3 py-2 rounded-lg bg-surface-container border border-outline-variant/50 focus:border-primary text-sm" required />
								</div>
								<div class="space-y-1.5 md:col-span-2">
									<label class="text-xs font-bold text-on-surface-variant">Remarks / Reason</label>
									<textarea name="reason" rows="2" class="w-full px-3 py-2 rounded-lg bg-surface-container border border-outline-variant/50 focus:border-primary text-sm resize-none"></textarea>
								</div>
							</div>
						</div>
					{:else if actionType === 'Warning'}
						<div class="space-y-4 animate-in fade-in slide-in-from-top-4">
							<h3 class="text-sm font-bold text-error uppercase tracking-wider mb-2">Warning Letter Details</h3>
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div class="space-y-1.5">
									<label class="text-xs font-bold text-on-surface-variant">Warning Level</label>
									<select name="warningLevel" class="w-full px-3 py-2 rounded-lg bg-surface-container border border-outline-variant/50 focus:border-error focus:ring-1 focus:ring-error text-sm" required>
										<option value="" disabled selected>Select SP Level...</option>
										<option value="SP1">SP 1 (First Warning)</option>
										<option value="SP2">SP 2 (Second Warning)</option>
										<option value="SP3">SP 3 (Final Warning)</option>
									</select>
								</div>
								<div class="space-y-1.5">
									<label class="text-xs font-bold text-on-surface-variant">Issue Date</label>
									<input type="date" name="effectiveDate" class="w-full px-3 py-2 rounded-lg bg-surface-container border border-outline-variant/50 focus:border-error focus:ring-1 focus:ring-error text-sm" required />
								</div>
								<div class="space-y-1.5 md:col-span-2">
									<label class="text-xs font-bold text-on-surface-variant">Violation Reason</label>
									<textarea name="reason" rows="3" class="w-full px-3 py-2 rounded-lg bg-surface-container border border-outline-variant/50 focus:border-error focus:ring-1 focus:ring-error text-sm resize-none" placeholder="Describe the violation in detail..." required></textarea>
								</div>
							</div>
						</div>
					{:else if actionType === 'Termination'}
						<div class="space-y-4 animate-in fade-in slide-in-from-top-4">
							<h3 class="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2">Termination Details</h3>
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div class="space-y-1.5">
									<label class="text-xs font-bold text-on-surface-variant">Termination Type</label>
									<select name="termType" class="w-full px-3 py-2 rounded-lg bg-surface-container border border-outline-variant/50 focus:border-primary text-sm" required>
										<option value="" disabled selected>Select reason...</option>
										<option value="Resign">Voluntary Resign</option>
										<option value="Fired">Dismissal (PHK)</option>
										<option value="Contract Ended">End of Contract</option>
										<option value="Retired">Retirement</option>
									</select>
								</div>
								<div class="space-y-1.5">
									<label class="text-xs font-bold text-on-surface-variant">Effective Out Date</label>
									<input type="date" name="effectiveDate" class="w-full px-3 py-2 rounded-lg bg-surface-container border border-outline-variant/50 focus:border-primary text-sm" required />
								</div>
								<div class="space-y-1.5 md:col-span-2">
									<label class="text-xs font-bold text-on-surface-variant">Additional Notes / Handover</label>
									<textarea name="reason" rows="3" class="w-full px-3 py-2 rounded-lg bg-surface-container border border-outline-variant/50 focus:border-primary text-sm resize-none" placeholder="e.g. Asset return status, final payload details..."></textarea>
								</div>
							</div>
						</div>
					{/if}
				</form>
			</div>

			<!-- Modal Footer -->
			<div class="px-8 py-5 border-t border-surface-container bg-surface-container-lowest flex justify-end gap-3 z-10">
				<button class="px-6 py-2.5 rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container-high transition-colors" onclick={() => isAddModalOpen = false}>
					Cancel
				</button>
				<button form="action-form" disabled={!actionType} class="px-6 py-2.5 rounded-xl text-sm font-bold bg-primary text-on-primary hover:bg-primary/90 shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
					<span class="material-symbols-outlined text-sm">save</span>
					Save Action
				</button>
			</div>
		</div>
	</div>
{/if}
