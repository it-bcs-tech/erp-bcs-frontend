<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatRupiah, formatNumber } from '$lib/utils/pms';
	import SearchableSelect from '$lib/components/SearchableSelect.svelte';
	import { generatePoNumber, getCategoryCode, PO_PAYMENT_TERMS } from '$lib/utils/pmsNumbering';

	let { data } = $props();

	let date = $state(new Date().toISOString().split('T')[0]);
	let vendorId = $state(data.vendors?.length ? String(data.vendors[0].id) : '');
	let projectId = $state(data.initialPR?.project_id ? String(data.initialPR.project_id) : '');
	let siteId = $state(data.initialPR?.site_id ? String(data.initialPR.site_id) : '');
	let shipmentDate = $state('');
	let shipmentLocation = $state('');
	const prNumbers = data.initialPRs?.length
		? data.initialPRs.map((p: any) => p.pr_number).join(', ')
		: (data.initialPR?.pr_number || '');
	let refNo = $state(prNumbers ? `PR REF: ${prNumbers}` : '');
	let dueDate = $state('');
	let paymentTerm = $state('30 Hari');
	let currency = $state('IDR');
	let discountPercent = $state(0);
	let vatPercent = $state(11);
	const combinedNotes = data.initialPRs?.length
		? data.initialPRs.map((p: any) => p.notes).filter(Boolean).join('\n')
		: (data.initialPR?.notes || '');
	let notes = $state(combinedNotes);
	let wrsNotes = $state('');

	// Penomoran PO Otomatis
	let counter = $state<number>(data.nextCounter || 1);
	let isPoNumberManual = $state(false);
	let poNumber = $state('');

	const paymentTermOpts = PO_PAYMENT_TERMS;
	const paymentTermSelectOpts = paymentTermOpts.map(t => ({
		value: t.value,
		label: t.label,
		sublabel: t.days > 0 ? `Jatuh tempo +${t.days} hari` : 'Bayar langsung',
		searchTerms: `${t.label} ${t.value} ${t.code}`
	}));

	let selectedVendor = $derived(data.vendors?.find((v: any) => String(v.id) === String(vendorId)));
	let selectedProject = $derived(data.projects?.find((p: any) => String(p.id) === String(projectId)));
	let selectedSite = $derived(data.sites?.find((s: any) => String(s.id) === String(siteId)));
	let chosenAlias = $derived(
		selectedSite?.alias || selectedProject?.alias || 'GEN'
	);

	function updatePoNumber() {
		const catCode = selectedProject?.cat_code || (selectedProject?.category ? getCategoryCode(selectedProject.category) : 'GEN');
		const vendorAlias = selectedVendor?.alias || (selectedVendor?.kode_kustomer ? selectedVendor.kode_kustomer.replace(/[^A-Za-z0-9]/g, '').slice(0, 3) : 'VND');
		poNumber = generatePoNumber({
			counter,
			categoryCode: catCode,
			vendorAlias,
			siteAlias: chosenAlias,
			date
		});
	}

	$effect(() => {
		const curDate = date;
		const curVendor = vendorId;
		const curProj = projectId;
		const curSite = siteId;
		const curCounter = counter;

		if (!isPoNumberManual) {
			updatePoNumber();
		}
	});

	$effect(() => {
		if (selectedSite) {
			shipmentLocation = selectedSite.address_1
				? `${selectedSite.loc_name} - ${selectedSite.address_1}${selectedSite.city ? `, ${selectedSite.city}` : ''}`
				: selectedSite.loc_name;
		}
	});

	function updateDueDateFromTerm(term: string, baseDate: string) {
		if (!baseDate) return;
		const opt = paymentTermOpts.find(o => o.value === term || o.code === term);
		const days = opt ? opt.days : 0;
		const d = new Date(baseDate);
		d.setDate(d.getDate() + days);
		dueDate = d.toISOString().split('T')[0];
	}

	function onPaymentTermChange(term: string) {
		paymentTerm = term;
		updateDueDateFromTerm(term, date);
	}

	function handlePriceInput(index: number, e: Event) {
		const target = e.target as HTMLInputElement;
		const rawDigits = target.value.replace(/\D/g, '');
		const num = rawDigits ? parseInt(rawDigits, 10) : 0;
		items[index].unit_price = num;
		target.value = num ? num.toLocaleString('id-ID') : '';
	}

	let vendorOpts = $derived(
		data.vendors.map((v: any) => ({
			value: v.id,
			label: v.nama_kustomer,
			sublabel: v.kode_kustomer
		}))
	);

	let projectOpts = $derived([
		{ value: '', label: '-- Bebas / Non-Project --' },
		...data.projects.map((p: any) => ({
			value: p.id,
			label: p.project_code ? `${p.project_name} (${p.project_code})` : p.project_name,
			searchTerms: `${p.project_name} ${p.project_code || ''}`
		}))
	]);

	let siteOpts = $derived([
		{ value: '', label: '-- Pilih Lokasi Site Penerima --' },
		...data.sites.map((s: any) => ({
			value: s.id,
			label: s.contact_person
				? `${s.loc_name} - ${s.contact_person} (${s.loc_code || '-'})`
				: `${s.loc_name} (${s.loc_code || '-'})`,
			searchTerms: `${s.loc_name} ${s.contact_person || ''} ${s.loc_code || ''}`
		}))
	]);

	let materialOpts = $derived(
		data.materials.map((m: any) => ({
			value: m.ref_pr_line_id ? `${m.id}-${m.ref_pr_line_id}` : `${m.id}`,
			label: `${m.name} (${m.uom})`,
			sublabel: m.ref_pr_number ? `[PR: ${m.ref_pr_number}] ${m.spec && m.spec !== '-' ? m.spec : ''}` : (m.spec || undefined),
			searchTerms: `${m.ref_pr_number || ''} ${m.spec || ''} ${m.material_code || ''} ${m.brand || ''} ${m.part_no || ''}`
		}))
	);

	// Line items
	let items = $state<Array<{
		material_id: number;
		material_code: string;
		name: string;
		spec: string;
		uom: string;
		qty: number;
		unit_price: number;
		pr_line_id?: number;
		pr_id?: number;
		pr_number?: string;
		remarks?: string;
	}>>([]);

	$effect(() => {
		if (data.initialItems && data.initialItems.length > 0 && items.length === 0) {
			items = data.initialItems.map((itm: any) => ({
				material_id: itm.item_id,
				material_code: itm.material_code,
				name: itm.name,
				spec: itm.spec || '-',
				uom: itm.uom || 'Pcs',
				qty: parseFloat(itm.qty_ordered) || 1,
				unit_price: parseFloat(itm.unit_price) || 0,
				pr_line_id: itm.pr_line_id,
				pr_id: itm.pr_id,
				pr_number: itm.pr_number,
				remarks: itm.remarks || ''
			}));
		}
		if (!dueDate && date) {
			updateDueDateFromTerm(paymentTerm, date);
		}
		if (siteId && !shipmentLocation) {
			const s = data.sites?.find((st: any) => st.id.toString() === siteId.toString());
			if (s) shipmentLocation = s.loc_name;
		}
	});

	let selectedMaterialId = $state('');

	function getVendorSpecificPrice(matId: number, vId: string): number | null {
		if (!vId || !data.vendorPrices) return null;
		const vIdNum = parseInt(vId);
		const vp = data.vendorPrices.find((p: any) => p.material_id === matId && p.vendor_id === vIdNum);
		return vp ? parseFloat(vp.price) : null;
	}

	function onVendorChange() {
		if (!vendorId) return;
		items.forEach(itm => {
			const vp = getVendorSpecificPrice(itm.material_id, vendorId);
			if (vp !== null) {
				itm.unit_price = vp;
			}
		});
	}

	function addItem() {
		if (!selectedMaterialId) return;
		const mat = data.materials.find((m: any) => 
			(m.ref_pr_line_id && `${m.id}-${m.ref_pr_line_id}` === selectedMaterialId) || 
			m.id.toString() === selectedMaterialId
		);
		if (!mat) return;

		const exists = items.find(i => 
			(mat.ref_pr_line_id && i.pr_line_id === mat.ref_pr_line_id) || 
			(!mat.ref_pr_line_id && i.material_id === mat.id)
		);
		if (exists) {
			exists.qty += 1;
			selectedMaterialId = '';
			return;
		}

		const vp = getVendorSpecificPrice(mat.id, vendorId);
		const initialPrice = vp !== null ? vp : (parseFloat(mat.standard_price) || 0);

		items.push({
			material_id: mat.id,
			material_code: mat.material_code,
			name: mat.name,
			spec: mat.spec || '-',
			uom: mat.uom || 'Pcs',
			qty: parseFloat(mat.ref_qty_requested) || 1,
			unit_price: initialPrice,
			pr_line_id: mat.ref_pr_line_id,
			pr_id: mat.ref_pr_id,
			pr_number: mat.ref_pr_number
		});

		selectedMaterialId = '';
	}

	function removeItem(idx: number) {
		items.splice(idx, 1);
	}

	// Live Totals
	let subtotal = $derived.by(() => {
		return items.reduce((sum, itm) => sum + ((itm.qty || 0) * (itm.unit_price || 0)), 0);
	});

	let discountAmount = $derived((subtotal * (discountPercent || 0)) / 100);
	let netSubtotal = $derived(subtotal - discountAmount);
	let vatAmount = $derived((netSubtotal * (vatPercent || 0)) / 100);
	let grandTotal = $derived(netSubtotal + vatAmount);
</script>

<svelte:head>
	<title>Buat Purchase Order (PO) Baru | PMS | ERP BCS</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6 max-w-5xl mx-auto">
	<!-- Header -->
	<header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<a href="/pms/transactions/po" class="p-1 rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-colors">
					<span class="material-symbols-outlined text-lg">arrow_back</span>
				</a>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Buat Purchase Order (PO)</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-xs sm:text-sm mt-0.5 ml-8">
				Formulir pesanan resmi pembelian barang dengan rincian vendor, pengiriman, diskon, dan PPN 11%
			</p>
		</div>
	</header>

	{#if (data.initialPRs && data.initialPRs.length > 0) || data.initialPR}
		{@const prs = data.initialPRs && data.initialPRs.length > 0 ? data.initialPRs : [data.initialPR]}
		<div class="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
			<div class="flex items-start sm:items-center gap-3">
				<div class="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
					<span class="material-symbols-outlined text-lg">{prs.length > 1 ? 'layers' : 'assignment'}</span>
				</div>
				<div>
					<div class="flex flex-wrap items-center gap-1.5 font-bold text-on-surface">
						<span>Referensi Purchase Request ({prs.length}):</span>
						{#each prs as pr}
							<span class="inline-flex items-center px-2 py-0.5 rounded-md font-mono text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/60 dark:border-amber-800/60">
								{pr.pr_number}
							</span>
						{/each}
					</div>
					<p class="text-[11px] text-on-surface-variant mt-1">
						{prs.length > 1 
							? `PO ini merupakan gabungan dari ${prs.length} pengajuan PR. Material dari setiap PR dikumpulkan ke dalam 1 pesanan.`
							: 'PO ini dibuat terikat langsung dengan pengajuan PR terkait.'}
					</p>
				</div>
			</div>
			<a
				href="/pms/transactions/pr"
				class="text-[11px] font-bold text-amber-700 dark:text-amber-300 hover:underline flex items-center gap-1 self-start sm:self-auto shrink-0"
			>
				<span>Ganti / Pilih PR Lain</span>
				<span class="material-symbols-outlined text-xs">arrow_forward</span>
			</a>
		</div>
	{:else}
		<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
			<div class="flex items-start sm:items-center gap-3">
				<div class="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
					<span class="material-symbols-outlined text-lg">edit_document</span>
				</div>
				<div>
					<p class="font-bold text-on-surface">Pembuatan Purchase Order Manual</p>
					<p class="text-[11px] text-on-surface-variant mt-0.5">
						PO ini dibuat secara langsung tanpa memilih PR terlebih dahulu. Pilihan material tetap difilter otomatis dari PR yang berstatus Open/Aktif.
					</p>
				</div>
			</div>
			<a
				href="/pms/transactions/pr"
				class="text-[11px] font-bold text-amber-700 dark:text-amber-300 hover:underline flex items-center gap-1 self-start sm:self-auto shrink-0"
			>
				<span>Pilih dari PR</span>
				<span class="material-symbols-outlined text-xs">arrow_forward</span>
			</a>
		</div>
	{/if}

	<form method="POST" action="?/create" use:enhance={() => {
		isSubmitting = true;
		return async ({ update }) => {
			isSubmitting = false;
			await update();
		};
	}}>
		<input type="hidden" name="prIds" value={(data.initialPRs || (data.initialPR ? [data.initialPR] : [])).map((p: any) => p.id).join(',')} />
		<input type="hidden" name="items" value={JSON.stringify(items)} />

		<div class="space-y-6">
			<!-- Section 1: Informasi Header PO -->
			<div class="p-6 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs space-y-5">
				<!-- PO Number Banner (Auto Generated) -->
				<div class="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
					<div class="flex items-center gap-3">
						<div class="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
							<span class="material-symbols-outlined text-[22px]">tag</span>
						</div>
						<div>
							<div class="flex items-center gap-2">
								<span class="text-xs font-bold text-on-surface uppercase tracking-wider">Nomor Purchase Order (PO)</span>
								<span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider {isPoNumberManual ? 'bg-amber-200 text-amber-900 dark:bg-amber-900/50 dark:text-amber-200' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'}">
									{isPoNumberManual ? 'Manual Edit' : 'Auto Generated'}
								</span>
							</div>
							<p class="text-[11px] text-on-surface-variant font-medium mt-0.5">
								Format: <code class="font-mono text-amber-700 dark:text-amber-300 font-bold">[Counter]-[Kategori]/BCS-[Vendor]/[Site/Project]/[Romawi]/[YYYY]</code>
							</p>
						</div>
					</div>
					<div class="flex items-center gap-2 w-full sm:w-auto">
						<input
							type="text"
							name="poNumber"
							bind:value={poNumber}
							oninput={() => { isPoNumberManual = true; }}
							placeholder="e.g. 123-T/BCS-TSN/MTC/IX/2026"
							class="w-full sm:w-72 h-10 bg-surface border border-slate-300 dark:border-slate-700 text-on-surface font-mono font-bold text-xs rounded-xl px-3.5 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none shadow-xs"
						/>
						{#if isPoNumberManual}
							<button
								type="button"
								onclick={() => { isPoNumberManual = false; updatePoNumber(); }}
								class="h-10 px-3 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-on-surface text-xs font-bold transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
								title="Reset ke format penomoran otomatis"
							>
								<span class="material-symbols-outlined text-[16px]">restart_alt</span>
								<span class="text-[11px]">Auto</span>
							</button>
						{/if}
					</div>
				</div>

				<h3 class="text-sm font-bold text-on-surface uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60 pb-3 flex items-center gap-2">
					<span class="material-symbols-outlined text-amber-600">shopping_cart</span>
					<span>Informasi Order & Vendor</span>
				</h3>

				<!-- Hidden input for shipmentLocation -->
				<input type="hidden" name="shipmentLocation" value={shipmentLocation} />

				<!-- Row 1: Vendor, Tanggal PO, Ref PR -->
				<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
					<div>
						<label class="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Pilih Vendor / Supplier <span class="text-rose-500">*</span>
						</label>
						<SearchableSelect
							name="vendorId"
							options={vendorOpts}
							bind:value={vendorId}
							onchange={onVendorChange}
							placeholder="-- Pilih Vendor --"
							required
							btnClass="bg-surface border-slate-200 dark:border-slate-700 text-xs font-normal"
						/>
					</div>

					<div>
						<label class="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Tanggal PO <span class="text-rose-500">*</span>
						</label>
						<input
							type="date"
							name="date"
							required
							bind:value={date}
							onchange={() => updateDueDateFromTerm(paymentTerm, date)}
							class="w-full h-10 bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl px-3.5 text-xs font-normal focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all"
						/>
					</div>

					<div>
						<label class="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							No. Referensi / Ref PR
						</label>
						<input
							type="text"
							name="refNo"
							bind:value={refNo}
							placeholder="No. Kontrak / PR"
							class="w-full h-10 bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl px-3.5 text-xs font-normal focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all"
						/>
					</div>
				</div>

				<!-- Row 2: Alokasi Project, Site Penerima, Target Pengiriman -->
				<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
					<div>
						<label class="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Alokasi Project
						</label>
						<SearchableSelect
							name="projectId"
							options={projectOpts}
							bind:value={projectId}
							placeholder="-- Bebas / Non-Project --"
							btnClass="bg-surface border-slate-200 dark:border-slate-700 text-xs font-normal"
						/>
					</div>

					<div>
						<label class="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Site Penerima & Tujuan Pengiriman
						</label>
						<SearchableSelect
							name="siteId"
							options={siteOpts}
							bind:value={siteId}
							placeholder="-- Pilih Site Penerima --"
							btnClass="bg-surface border-slate-200 dark:border-slate-700 text-xs font-normal"
						/>
					</div>

					<div>
						<label class="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Target Tanggal Pengiriman
						</label>
						<input
							type="date"
							name="shipmentDate"
							bind:value={shipmentDate}
							class="w-full h-10 bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl px-3.5 text-xs font-normal focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all"
						/>
					</div>
				</div>

				<!-- Row 3: Term Pembayaran & Jatuh Tempo -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div>
						<label class="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Term Pembayaran (Payment Term) <span class="text-rose-500">*</span>
						</label>
						<SearchableSelect
							name="paymentTerm"
							options={paymentTermSelectOpts}
							bind:value={paymentTerm}
							onchange={onPaymentTermChange}
							placeholder="-- Pilih Term Pembayaran --"
							required
							btnClass="bg-surface border-slate-200 dark:border-slate-700 text-xs font-normal"
						/>
					</div>

					<div>
						<label class="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Jatuh Tempo Pembayaran (Due Date)
						</label>
						<input
							type="date"
							name="dueDate"
							bind:value={dueDate}
							title="Jatuh Tempo Pembayaran"
							class="w-full h-10 bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl px-3.5 text-xs font-normal focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all"
						/>
					</div>
				</div>

				<!-- Info Card PIC Site Penerima jika dipilih -->
				{#if selectedSite}
					<div class="p-3.5 rounded-xl bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/20 flex items-start gap-3 text-xs">
						<span class="material-symbols-outlined text-amber-600 dark:text-amber-400 mt-0.5 text-lg">location_on</span>
						<div class="flex-1 space-y-1">
							<div class="flex items-center gap-2 font-bold text-on-surface">
								<span>Site Penerima: {selectedSite.loc_name}</span>
								{#if selectedSite.alias}
									<span class="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 font-mono text-[10px] font-bold">Alias: {selectedSite.alias}</span>
								{/if}
								{#if selectedSite.loc_code}
									<span class="text-on-surface-variant font-mono text-[10px]">({selectedSite.loc_code})</span>
								{/if}
							</div>
							<div class="text-on-surface-variant grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-1 text-[11px]">
								<div><span class="font-semibold text-on-surface">PIC Penerima:</span> {selectedSite.contact_person || 'Belum diatur'}</div>
								<div><span class="font-semibold text-on-surface">No. Telepon / HP:</span> {selectedSite.phone || '-'}</div>
								<div><span class="font-semibold text-on-surface">Kota:</span> {selectedSite.city || '-'}</div>
								{#if selectedSite.address_1}
									<div class="sm:col-span-3 text-[11px]"><span class="font-semibold text-on-surface">Alamat Tujuan Pengiriman:</span> {selectedSite.address_1}</div>
								{/if}
							</div>
						</div>
					</div>
				{/if}
			</div>

			<!-- Section 2: Line Items -->
			<div class="p-6 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs space-y-4">
				<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/60 dark:border-slate-800/60 pb-3">
					<h3 class="text-sm font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
						<span class="material-symbols-outlined text-amber-600">format_list_bulleted</span>
						<span>Rincian Barang / Material ({items.length})</span>
					</h3>

					<div class="flex items-center gap-2 min-w-[280px] sm:min-w-[360px]">
						<SearchableSelect
							options={materialOpts}
							bind:value={selectedMaterialId}
							placeholder="-- Cari & Tambah Material --"
							btnClass="bg-surface border-slate-200 dark:border-slate-700 text-xs font-normal"
						/>
						<button
							type="button"
							onclick={addItem}
							disabled={!selectedMaterialId}
							class="h-10 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3.5 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
						>
							<span class="material-symbols-outlined text-base">add</span>
							<span>Tambah</span>
						</button>
					</div>
				</div>

				<div class="overflow-x-auto">
					<table class="w-full text-left text-sm min-w-[750px]">
						<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
							<tr>
								<th class="py-3 px-3">Nama Material</th>
								<th class="py-3 px-3">Spesifikasi</th>
								<th class="py-3 px-3 text-center w-24">Qty Order</th>
								<th class="py-3 px-3">Satuan</th>
								<th class="py-3 px-3 text-right w-36">Harga Satuan (Rp)</th>
								<th class="py-3 px-3 text-right w-36">Total (Rp)</th>
								<th class="py-3 px-3 text-center w-12">Hapus</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60 font-medium text-xs">
							{#if items.length === 0}
								<tr>
									<td colspan="7" class="py-8 text-center text-on-surface-variant">
										<p class="text-xs font-semibold">Belum ada item material dalam PO ini.</p>
										<p class="text-[11px] text-slate-400 mt-0.5">Pilih material dari dropdown di atas lalu klik Tambah.</p>
									</td>
								</tr>
							{:else}
								{#each items as item, idx}
									<tr>
										<td class="py-3 px-3 font-bold text-on-surface text-xs">
											<div class="flex items-center gap-1.5 flex-wrap">
												{#if item.pr_number}
													<span class="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/40 dark:border-amber-800/40 shrink-0">
														{item.pr_number}
													</span>
												{/if}
												<span>{item.name}</span>
											</div>
										</td>
										<td class="py-3 px-3 text-on-surface-variant">{item.spec}</td>
										<td class="py-3 px-3 text-center">
											<input
												type="number"
												min="1"
												step="any"
												bind:value={item.qty}
												class="w-20 bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-lg px-2 py-1 text-center font-mono font-bold text-xs focus:ring-2 focus:ring-amber-500 outline-none"
											/>
										</td>
										<td class="py-3 px-3 font-semibold">{item.uom}</td>
										<td class="py-3 px-3 text-right">
											<div class="relative flex items-center justify-end">
												<span class="absolute left-2.5 text-[10px] font-bold text-on-surface-variant pointer-events-none">Rp</span>
												<input
													type="text"
													inputmode="numeric"
													value={item.unit_price ? Number(item.unit_price).toLocaleString('id-ID') : ''}
													oninput={(e) => handlePriceInput(idx, e)}
													placeholder="0"
													class="w-36 bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-lg pl-8 pr-2.5 py-1 text-right font-mono font-bold text-xs focus:ring-2 focus:ring-amber-500 outline-none"
												/>
											</div>
											{#if getVendorSpecificPrice(item.material_id, vendorId) !== null}
												<span class="block text-[9px] font-bold text-amber-600 dark:text-amber-400 mt-0.5">
													★ Harga Vendor
												</span>
											{/if}
										</td>
										<td class="py-3 px-3 text-right font-mono font-bold text-on-surface">
											{formatRupiah((item.qty || 0) * (item.unit_price || 0))}
										</td>
										<td class="py-3 px-3 text-center">
											<button
												type="button"
												onclick={() => removeItem(idx)}
												class="text-rose-600 hover:text-rose-800 p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
											>
												<span class="material-symbols-outlined text-base">delete</span>
											</button>
										</td>
									</tr>
								{/each}
							{/if}
						</tbody>
					</table>
				</div>

				<!-- Kalkulasi Total Section -->
				<div class="border-t border-slate-200/60 dark:border-slate-800/60 pt-4 flex flex-col sm:flex-row justify-between items-start gap-6">
					<div class="space-y-3 w-full sm:w-1/2">
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">
								Catatan Pembelian (PO Notes)
							</label>
							<textarea
								name="notes"
								bind:value={notes}
								rows="2"
								placeholder="Instruksi penagihan, syarat pembayaran..."
								class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl p-2.5 text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none resize-none"
							></textarea>
						</div>
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">
								Catatan Penerimaan Gudang (WRS Note)
							</label>
							<input
								type="text"
								name="wrsNotes"
								bind:value={wrsNotes}
								placeholder="Catatan inspeksi saat barang tiba di gudang..."
								class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none"
							/>
						</div>
					</div>

					<div class="w-full sm:w-80 bg-surface-container rounded-2xl p-4 space-y-2 border border-slate-200/60 dark:border-slate-800/60 font-medium text-xs">
						<div class="flex justify-between">
							<span class="text-on-surface-variant">Subtotal:</span>
							<span class="font-mono font-bold">{formatRupiah(subtotal)}</span>
						</div>

						<div class="flex items-center justify-between">
							<div class="flex items-center gap-1">
								<span class="text-on-surface-variant">Diskon (%):</span>
								<input
									type="number"
									min="0"
									max="100"
									name="discountPercent"
									bind:value={discountPercent}
									class="w-12 bg-surface border border-slate-200 dark:border-slate-700 rounded px-1 text-center font-bold font-mono text-[11px]"
								/>
							</div>
							<span class="font-mono text-rose-600">- {formatRupiah(discountAmount)}</span>
						</div>

						<div class="flex items-center justify-between">
							<div class="flex items-center gap-1">
								<span class="text-on-surface-variant">PPN (%):</span>
								<input
									type="number"
									min="0"
									max="100"
									name="vatPercent"
									bind:value={vatPercent}
									class="w-12 bg-surface border border-slate-200 dark:border-slate-700 rounded px-1 text-center font-bold font-mono text-[11px]"
								/>
							</div>
							<span class="font-mono font-bold text-on-surface">+ {formatRupiah(vatAmount)}</span>
						</div>

						<div class="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between items-center text-sm font-black text-on-surface">
							<span>Total Nilai PO:</span>
							<span class="text-amber-600 dark:text-amber-400 font-mono text-base">{formatRupiah(grandTotal)}</span>
						</div>
					</div>
				</div>
			</div>

			<!-- Actions -->
			<div class="flex items-center justify-end gap-3 pt-2">
				<a href="/pms/transactions/po" class="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-on-surface-variant hover:text-on-surface transition-colors">
					Batal
				</a>
				<button
					type="submit"
					disabled={isSubmitting || items.length === 0 || !vendorId}
					class="bg-amber-600 hover:bg-amber-700 text-white text-xs font-black px-6 py-2.5 rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center gap-2"
				>
					{#if isSubmitting}
						<span class="material-symbols-outlined text-sm animate-spin">progress_activity</span>
						<span>Menerbitkan PO...</span>
					{:else}
						<span class="material-symbols-outlined text-sm">send</span>
						<span>Terbitkan Purchase Order</span>
					{/if}
				</button>
			</div>
		</div>
	</form>
</div>
