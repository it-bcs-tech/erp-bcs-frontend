<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let summary = $derived(data.summary);
	let documents = $derived(data.documents || []);
	let complaints = $derived(data.complaints || []);
	let customers = $derived(data.customers || []);

	let showSopModal = $state(false);
	let showComplaintModal = $state(false);
	let showResolveModal = $state(false);
	let selectedComplaint = $state<any>(null);

	function openResolveModal(cmp: any) {
		selectedComplaint = cmp;
		showResolveModal = true;
	}
</script>

<svelte:head>
	<title>SOP & Customer Complain | QHSE ERP BCS</title>
</svelte:head>

<div class="space-y-6">
	<!-- Page Header -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-indigo-600 dark:text-indigo-400 text-2xl">policy</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Sistem Mutu, SOP & Customer Complain</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-sm mt-0.5">
				Standar Operasional Prosedur (ISO 9001 & 45001), Instruksi Kerja, dan penanganan keluhan ketidaksesuaian kargo
			</p>
		</div>

		<div class="flex items-center gap-3">
			<button
				onclick={() => showSopModal = true}
				class="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-bold transition-colors cursor-pointer"
			>
				<span class="material-symbols-outlined text-lg">note_add</span>
				<span>Daftar SOP Baru</span>
			</button>
			<button
				onclick={() => showComplaintModal = true}
				class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
			>
				<span class="material-symbols-outlined text-lg">feedback</span>
				<span>Lapor Customer Complain</span>
			</button>
		</div>
	</div>

	{#if form?.error}
		<div class="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2.5">
			<span class="material-symbols-outlined text-rose-500 text-lg">error</span>
			<span>{form.error}</span>
		</div>
	{/if}
	{#if form?.message}
		<div class="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2.5">
			<span class="material-symbols-outlined text-emerald-500 text-lg">check_circle</span>
			<span>{form.message}</span>
		</div>
	{/if}

	<!-- Metric Cards (Bento Style) -->
	<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Dokumen Mutu & SOP Aktif</p>
					<h3 class="text-2xl font-black text-indigo-600 mt-1">{summary.activeSops} Dokumen</h3>
				</div>
				<div class="w-11 h-11 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">menu_book</span>
				</div>
			</div>
			<p class="text-xs text-on-surface-variant mt-2 font-medium">SOP, Petunjuk Kerja (WI), & Form K3</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Customer Complain Open</p>
					<h3 class="text-2xl font-black text-amber-600 mt-1">{summary.openComplaints}</h3>
				</div>
				<div class="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">sentiment_dissatisfied</span>
				</div>
			</div>
			<p class="text-xs text-amber-600 mt-2 font-bold">{summary.resolvedComplaints} Keluhan Selesai Ditangani</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Sertifikasi & Kepatuhan</p>
					<h3 class="text-2xl font-black text-emerald-600 mt-1">ISO Compliant</h3>
				</div>
				<div class="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">workspace_premium</span>
				</div>
			</div>
			<p class="text-xs text-emerald-600 mt-2 font-bold">ISO 45001 K3 & ISO 9001 Mutu</p>
		</div>
	</div>

	<!-- Split Grids: SOP Register & Complaints -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- Left: Register SOP & WI -->
		<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs overflow-hidden flex flex-col max-h-[500px]">
			<div class="px-5 py-4 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-indigo-600 text-lg">menu_book</span>
					<h3 class="text-sm font-bold text-on-surface">Master Dokumen Mutu & SOP K3</h3>
				</div>
				<span class="text-xs font-bold text-on-surface-variant">{documents.length} Dokumen</span>
			</div>

			<div class="overflow-y-auto flex-1 p-4 divide-y divide-slate-100 dark:divide-slate-800/80">
				{#if documents.length === 0}
					<div class="py-12 text-center text-xs text-on-surface-variant">Belum ada SOP terdaftar.</div>
				{:else}
					{#each documents as d}
						<div class="py-3.5 first:pt-0 last:pb-0 space-y-1">
							<div class="flex items-center justify-between">
								<span class="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">{d.doc_number}</span>
								<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
									{d.category.replace(/_/g, ' ')} • {d.revision}
								</span>
							</div>
							<p class="text-xs font-bold text-on-surface">{d.title}</p>
							<div class="flex items-center justify-between text-[10px] text-on-surface-variant pt-0.5">
								<span>Efektif: {new Date(d.effective_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
								<span class="font-bold text-emerald-600">{d.status}</span>
							</div>
						</div>
					{/each}
				{/if}
			</div>
		</div>

		<!-- Right: Customer Complaints -->
		<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs overflow-hidden flex flex-col max-h-[500px]">
			<div class="px-5 py-4 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-amber-600 text-lg">feedback</span>
					<h3 class="text-sm font-bold text-on-surface">Keluhan Kustomer & Tindak Lanjut CAR</h3>
				</div>
				<span class="text-xs font-bold text-on-surface-variant">{complaints.length} Kasus</span>
			</div>

			<div class="overflow-y-auto flex-1 p-4 divide-y divide-slate-100 dark:divide-slate-800/80">
				{#if complaints.length === 0}
					<div class="py-12 text-center text-xs text-on-surface-variant">Belum ada keluhan kustomer tercatat.</div>
				{:else}
					{#each complaints as c}
						<div class="py-3.5 first:pt-0 last:pb-0 space-y-1.5">
							<div class="flex items-center justify-between">
								<span class="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">{c.complaint_number}</span>
								<span class="px-2 py-0.5 rounded-full text-[10px] font-bold {c.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
									{c.status}
								</span>
							</div>
							<p class="text-xs font-bold text-on-surface">{c.customer_name} ({c.issue_category})</p>
							<p class="text-[11px] text-on-surface-variant">{c.description}</p>
							{#if c.investigation_result}
								<p class="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Resolusi: {c.investigation_result}</p>
							{/if}
							<div class="flex items-center justify-between text-[10px] text-on-surface-variant pt-1">
								<span>Tanggal: {new Date(c.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
								{#if c.status !== 'RESOLVED'}
									<button
										onclick={() => openResolveModal(c)}
										class="px-2 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer transition-colors"
									>
										Investigasi & CAR
									</button>
								{/if}
							</div>
						</div>
					{/each}
				{/if}
			</div>
		</div>
	</div>
</div>

<!-- Modal: Daftarkan Dokumen SOP Baru -->
{#if showSopModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
		<div class="bg-surface-container-lowest rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden">
			<div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
				<h3 class="text-base font-bold text-on-surface flex items-center gap-2">
					<span class="material-symbols-outlined text-indigo-600 text-xl">note_add</span>
					<span>Daftarkan Dokumen SOP / WI K3</span>
				</h3>
				<button onclick={() => showSopModal = false} class="text-on-surface-variant hover:text-on-surface cursor-pointer">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<form action="?/createSop" method="POST" use:enhance={() => {
				return async ({ result, update }) => {
					await update();
					if (result.type === 'success') showSopModal = false;
				};
			}} class="p-6 space-y-4">
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5" for="sop_num">
							Nomor Dokumen
						</label>
						<input id="sop_num" type="text" name="doc_number" placeholder="SOP-BCS-QHSE-005" required class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface text-sm font-medium" />
					</div>
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5" for="sop_rev">
							Revisi
						</label>
						<input id="sop_rev" type="text" name="revision" value="Rev 00" required class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface text-sm font-medium" />
					</div>
				</div>

				<div>
					<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5" for="sop_title">
						Judul Dokumen SOP
					</label>
					<input id="sop_title" type="text" name="title" placeholder="Cth: SOP Pemeriksaan Pra-Jalan Harian (P2H)" required class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface text-sm font-medium" />
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5" for="sop_cat">
							Kategori Dokumen
						</label>
						<select id="sop_cat" name="category" required class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface text-sm font-medium">
							<option value="SOP">SOP (Standar Operasional)</option>
							<option value="WI_Work_Instruction">WI (Instruksi Kerja)</option>
							<option value="Form_K3">Form Checklist K3</option>
							<option value="Policy">Kebijakan K3 Mutu</option>
						</select>
					</div>
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5" for="sop_eff">
							Tanggal Efektif
						</label>
						<input id="sop_eff" type="date" name="effective_date" value={new Date().toISOString().split('T')[0]} required class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface text-sm font-medium" />
					</div>
				</div>

				<div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
					<button type="button" onclick={() => showSopModal = false} class="px-4 py-2.5 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-container">
						Batal
					</button>
					<button type="submit" class="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs">
						Daftarkan Dokumen
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Modal: Lapor Customer Complain Baru -->
{#if showComplaintModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
		<div class="bg-surface-container-lowest rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden">
			<div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
				<h3 class="text-base font-bold text-on-surface flex items-center gap-2">
					<span class="material-symbols-outlined text-amber-600 text-xl">feedback</span>
					<span>Lapor Customer Complain</span>
				</h3>
				<button onclick={() => showComplaintModal = false} class="text-on-surface-variant hover:text-on-surface cursor-pointer">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<form action="?/createComplaint" method="POST" use:enhance={() => {
				return async ({ result, update }) => {
					await update();
					if (result.type === 'success') showComplaintModal = false;
				};
			}} class="p-6 space-y-4">
				<div>
					<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5" for="cmp_cust">
						Nama Kustomer
					</label>
					<input id="cmp_cust" type="text" name="customer_name" placeholder="PT Semen Indonesia / PT Solusi Bangun Indonesia" required class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface text-sm font-medium" />
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5" for="cmp_cat">
							Kategori Masalah
						</label>
						<select id="cmp_cat" name="issue_category" required class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface text-sm font-medium">
							<option value="Keterlambatan">Keterlambatan Tiba (Late Arrival)</option>
							<option value="Kerusakan Kargo">Kerusakan Kargo / Sak Robek</option>
							<option value="Perilaku Sopir">Pelanggaran / Perilaku Sopir</option>
							<option value="Klaim Susut">Klaim Selisih Susut Tonase</option>
							<option value="Lainnya">Lainnya</option>
						</select>
					</div>
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5" for="cmp_so">
							No. DO / Order (Opsional)
						</label>
						<input id="cmp_so" type="text" name="sales_order_id" placeholder="DO-2026-XXXX" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface text-sm font-medium" />
					</div>
				</div>

				<div>
					<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5" for="cmp_desc">
						Rincian Keluhan
					</label>
					<textarea id="cmp_desc" name="description" rows="3" placeholder="Uraikan keluhan kustomer secara mendetail..." required class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface text-sm font-medium"></textarea>
				</div>

				<div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
					<button type="button" onclick={() => showComplaintModal = false} class="px-4 py-2.5 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-container">
						Batal
					</button>
					<button type="submit" class="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs">
						Simpan Keluhan
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Modal: Resolusi Keluhan & CAR -->
{#if showResolveModal && selectedComplaint}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
		<div class="bg-surface-container-lowest rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden">
			<div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
				<div>
					<h3 class="text-base font-bold text-on-surface flex items-center gap-2">
						<span class="material-symbols-outlined text-emerald-600 text-xl">fact_check</span>
						<span>Investigasi & Resolusi Keluhan</span>
					</h3>
					<p class="text-xs text-on-surface-variant font-mono mt-0.5">{selectedComplaint.complaint_number} — {selectedComplaint.customer_name}</p>
				</div>
				<button onclick={() => showResolveModal = false} class="text-on-surface-variant hover:text-on-surface cursor-pointer">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<form action="?/resolveComplaint" method="POST" use:enhance={() => {
				return async ({ result, update }) => {
					await update();
					if (result.type === 'success') showResolveModal = false;
				};
			}} class="p-6 space-y-4">
				<input type="hidden" name="id" value={selectedComplaint.id} />

				<div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-xs">
					<p class="font-bold text-on-surface">Keluhan:</p>
					<p class="text-on-surface-variant mt-0.5">{selectedComplaint.description}</p>
				</div>

				<div>
					<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5" for="res_inv">
						Hasil Investigasi & Klarifikasi
					</label>
					<textarea id="res_inv" name="investigation_result" rows="2" placeholder="Penyebab keterlambatan/kerusakan setelah dicek ke operasional..." required class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface text-sm font-medium"></textarea>
				</div>

				<div>
					<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5" for="res_car">
						Tindakan Korektif & Kompensasi (CAR)
					</label>
					<textarea id="res_car" name="car_action" rows="2" placeholder="Langkah perbaikan / kompensasi ke kustomer..." required class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface text-sm font-medium"></textarea>
				</div>

				<div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
					<button type="button" onclick={() => showResolveModal = false} class="px-4 py-2.5 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-container">
						Batal
					</button>
					<button type="submit" class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs">
						Selesaikan Kasus (Resolved)
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
