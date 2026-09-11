<script lang="ts">
	import { enhance } from '$app/forms';
	import SearchableSelect from '$lib/components/SearchableSelect.svelte';
	
	let { data } = $props();
	const { customers, contracts, banks, departments, projects, accounts, taxes } = data;

	// Prepare mapped options for SearchableSelect
	const customerOpts = customers.map((c: any) => ({ value: c.id, label: `${c.code} - ${c.name}` }));
	const contractOpts = contracts.map((c: any) => ({ value: c.id, label: `${c.id} ${c.project_name ? `(${c.project_name})` : ''}`, customer_id: c.customer_id, project_id: c.project_id }));
	const bankOpts = banks.map((b: any) => ({ value: b.id, label: b.name }));
	const departmentOpts = departments.map((d: any) => {
		const rawName = d.name || '';
		const cleanName = rawName.replace(/^[\d\s\-]+(?=[A-Za-z])/, '').trim() || rawName;
		return { value: d.id, label: cleanName };
	}).sort((a: any, b: any) => a.label.localeCompare(b.label));

	let form = $state({
		customer_id: data.invoice.partner_id || '',
		tgl_inv: data.invoice.date ? new Date(data.invoice.date).toISOString().split('T')[0] : '',
		no_inv: data.invoice.invoice_number || '',
		no_kontrak: data.invoice.contract_id || '',
		no_po_spk: data.invoice.po_spk_number || '',
		no_lhp: data.invoice.no_lhp || '',
		periode_kegiatan: data.invoice.activity_period || '',
		tgl_kirim_inv: data.invoice.delivery_date ? new Date(data.invoice.delivery_date).toISOString().split('T')[0] : '',
		term_pembayaran: data.invoice.payment_term_days || 30,
		bank_id: data.invoice.bank_account_id || '',
		uang_muka: data.invoice.advance_payment || 0,
		status: data.invoice.status || 'DRAFT',
		remark: data.invoice.notes || '',
		items: data.invoiceLines.map((line: any) => ({
			id: crypto.randomUUID(),
			department_id: line.department_id || '',
			project_id: line.project_id || '',
			akun_pendapatan: line.account_id || '',
			deskripsi: line.description || '',
			satuan: line.uom || '',
			qty: Number(line.quantity) || 0,
			harga: Number(line.unit_price) || 0,
			diskon: 0,
			pajak_id: line.tax_id || ''
		}))
	});

	// Selected DN details state
	let selectedDnIds = $state<string[]>(data.selectedDns.map((dn: any) => dn.id));
	let dnDetailPool = $state<any[]>(data.selectedDns); // Available DN details from server
	let isEditMode = true;

	// Modal state
	let showDnModal = $state(false);
	let dnFilterStart = $state('');
	let dnFilterEnd = $state('');
	let isFetchingDn = $state(false);
	let dnFetchError = $state('');

	// Derived calculations
	const subtotal = $derived(form.items.reduce((sum: number, item: any) => {
		const gross = (parseFloat(item.qty) || 0) * (parseFloat(item.harga) || 0);
		const disc = parseFloat(item.diskon) || 0;
		return sum + Math.max(0, gross - disc);
	}, 0));
	
	const taxTotal = $derived(form.items.reduce((sum: number, item: any) => {
		const gross = (parseFloat(item.qty) || 0) * (parseFloat(item.harga) || 0);
		const disc = parseFloat(item.diskon) || 0;
		const lineDpp = Math.max(0, gross - disc);
		const tax = taxes.find((t: any) => t.id === item.pajak_id);
		const rate = tax ? (parseFloat(tax.rate || tax.value || 0) / 100) : 0;
		return sum + (lineDpp * rate);
	}, 0));

	const grandTotal = $derived(subtotal + taxTotal - form.uang_muka);

	const filteredContractOpts = $derived(
		form.customer_id 
			? contractOpts.filter((c: any) => c.customer_id === form.customer_id) 
			: contractOpts
	);

	// Reactive Invoice Number logic
	const toRoman = (num: number) => {
		const roman = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
		return roman[num] || "";
	};

	let lastContract = $state('');
	$effect(() => {
		if (form.no_kontrak && form.no_kontrak !== lastContract) {
			form.no_po_spk = form.no_kontrak;
			const selectedContract = contracts.find((c: any) => c.id === form.no_kontrak);
			if (selectedContract && selectedContract.project_id) {
				form.items.forEach((item: any) => item.project_id = selectedContract.project_id);
			}
			lastContract = form.no_kontrak;
		} else if (!form.no_kontrak && lastContract) {
			form.no_po_spk = '';
			lastContract = '';
		}

		// Auto-generate invoice number
		const customer = customers.find((c: any) => c.id === form.customer_id)?.code || 'cust_code';
		const dept = departments.find((d: any) => d.id === form.items[0]?.department_id)?.code || 'dept_code';
		const project = projects.find((p: any) => p.id === form.items[0]?.project_id)?.name?.substring(0,3).toUpperCase() || 'project_code';
		
		let month = 'romawi_month';
		let year = 'yyyy';
		if (form.tgl_inv) {
			const d = new Date(form.tgl_inv);
			month = toRoman(d.getMonth() + 1);
			year = d.getFullYear().toString();
		}
		
		if (form.no_inv.startsWith('*****') || form.no_inv.includes('cust_code')) {
			form.no_inv = `*****/${customer}/${dept}/${project}/${month}/${year}`;
		}
	});

	// Fetch DN details from server via form action
	async function fetchDnDetails() {
		if (!form.customer_id) {
			dnFetchError = 'Pilih Customer terlebih dahulu.';
			return;
		}
		isFetchingDn = true;
		dnFetchError = '';
		try {
			const fd = new FormData();
			fd.append('customerId', form.customer_id);
			fd.append('startDate', dnFilterStart);
			fd.append('endDate', dnFilterEnd);
			
			const res = await fetch('?/getDnDetails', { 
				method: 'POST', 
				body: fd,
				headers: {
					'x-sveltekit-action': 'true'
				}
			});
			
			const { deserialize } = await import('$app/forms');
			const text = await res.text();
			const result = deserialize(text);
			
			if (result.type === 'success' && result.data?.details) {
				dnDetailPool = result.data.details;
			} else if (result.type === 'failure') {
				dnFetchError = result.data?.message || 'Gagal mengambil data surat jalan.';
			}

		} catch (e) {
			dnFetchError = 'Gagal mengambil data surat jalan.';
		} finally {
			isFetchingDn = false;
		}
	}

	function openDnModal() {
		if (!form.customer_id) {
			alert('Pilih Customer terlebih dahulu sebelum memilih Surat Jalan.');
			return;
		}
		showDnModal = true;
		fetchDnDetails();
	}

	function toggleDn(id: string) {
		if (selectedDnIds.includes(id)) {
			selectedDnIds = selectedDnIds.filter(x => x !== id);
		} else {
			selectedDnIds = [...selectedDnIds, id];
		}
	}

	function toggleAllDn() {
		if (selectedDnIds.length === dnDetailPool.length) {
			selectedDnIds = [];
		} else {
			selectedDnIds = dnDetailPool.map((d: any) => d.id);
		}
	}

	// Apply selected DNs — group by project_id, sum total_berat, use tarif for harga
	// Apply selected DNs — group by project_id, sum total_berat, use tarif for harga
	function applyDnSelection() {
		const selected = dnDetailPool.filter((d: any) => selectedDnIds.includes(d.id));
		
		// Group by project_id (or 'null' if no project)
		const grouped: Record<string, any> = {};
		for (const dn of selected) {
			const key = dn.project_id ?? 'no-project';
			if (!grouped[key]) {
				grouped[key] = {
					project_id: dn.project_id || '',
					project_name: dn.project_name || 'Tanpa Project',
					total_berat: 0,
					total_amount: 0,
					tarif: dn.tarif,
					jenis_muatan: dn.jenis_muatan
				};
			}
			grouped[key].total_berat += parseFloat(dn.total_berat || 0);
			grouped[key].total_amount += parseFloat(dn.total_amount || 0);
		}

		// Build invoice items from groups
		const newItems = Object.values(grouped).map((g: any) => {
			const deskripsi = `Rekap Surat Jalan – ${g.project_name} (${g.jenis_muatan || 'Operasional'})`;
			const existingItem = form.items.find(i => i.deskripsi === deskripsi);

			return {
				id: existingItem ? existingItem.id : crypto.randomUUID(),
				department_id: existingItem ? existingItem.department_id : '',
				project_id: existingItem ? existingItem.project_id : g.project_id,
				akun_pendapatan: existingItem ? existingItem.akun_pendapatan : '',
				akun_piutang: '',
				deskripsi: deskripsi,
				qty: parseFloat(g.total_berat.toFixed(3)),
				satuan: 'Ton',
				harga: existingItem ? existingItem.harga : parseFloat(g.tarif || 0),
				pajak_id: existingItem ? existingItem.pajak_id : ''
			};
		});

		// Preserve manual items (those that don't start with "Rekap Surat Jalan")
		const manualItems = form.items.filter(item => !item.deskripsi?.startsWith('Rekap Surat Jalan'));

		const combined = [...newItems, ...manualItems];
		form.items = combined.length > 0 ? combined : [{
			id: crypto.randomUUID(), department_id: '', project_id: '', akun_pendapatan: '', akun_piutang: '',
			deskripsi: '', qty: 1, satuan: 'Ton', harga: 0, diskon: 0, pajak_id: ''
		}];

		showDnModal = false;
	}

	const STANDARD_UOMS = ['Ton', 'Kg', 'Trip', 'M3', 'Dus', 'Sak', 'Rit', 'Pcs', 'Unit', 'Box', 'Bulan', 'Hari'];

	// Reference Document types and numbers
	let refOrderType = $state('PO');
	let refOrderNumber = $state('');
	let refLhpType = $state('LHP');
	let refLhpNumber = $state('');

	function syncOrderRef() {
		if (refOrderType === 'CUSTOM') {
			form.no_po_spk = refOrderNumber.trim();
		} else {
			const cleanNum = refOrderNumber.trim();
			if (!cleanNum) {
				form.no_po_spk = '';
			} else if (cleanNum.toLowerCase().startsWith(refOrderType.toLowerCase())) {
				form.no_po_spk = cleanNum;
			} else {
				form.no_po_spk = `${refOrderType} - ${cleanNum}`;
			}
		}
	}

	function parseOrderRef(val: string) {
		if (!val) {
			refOrderNumber = '';
			return;
		}
		const m = val.match(/^(PO|SPK|SPH|Quotation)[\s\-:]*(.*)$/i);
		if (m) {
			const rawType = m[1].toUpperCase();
			if (rawType === 'PO') refOrderType = 'PO';
			else if (rawType === 'SPK') refOrderType = 'SPK';
			else if (rawType === 'SPH') refOrderType = 'SPH';
			else if (rawType === 'QUOTATION') refOrderType = 'Quotation';
			refOrderNumber = m[2] || '';
		} else {
			refOrderType = 'CUSTOM';
			refOrderNumber = val;
		}
	}

	function syncLhpRef() {
		if (refLhpType === 'CUSTOM') {
			form.no_lhp = refLhpNumber.trim();
		} else {
			const cleanNum = refLhpNumber.trim();
			if (!cleanNum) {
				form.no_lhp = '';
			} else if (cleanNum.toLowerCase().startsWith(refLhpType.toLowerCase())) {
				form.no_lhp = cleanNum;
			} else {
				form.no_lhp = `${refLhpType} - ${cleanNum}`;
			}
		}
	}

	function parseLhpRef(val: string) {
		if (!val) {
			refLhpNumber = '';
			return;
		}
		const m = val.match(/^(LHP|RR|GR)[\s\-:]*(.*)$/i);
		if (m) {
			const rawType = m[1].toUpperCase();
			if (rawType === 'LHP') refLhpType = 'LHP';
			else if (rawType === 'RR') refLhpType = 'RR';
			else if (rawType === 'GR') refLhpType = 'GR';
			refLhpNumber = m[2] || '';
		} else {
			refLhpType = 'CUSTOM';
			refLhpNumber = val;
		}
	}

	// Initialize reference values from form
	parseOrderRef(form.no_po_spk);
	parseLhpRef(form.no_lhp);

	let editingItemIndex = $state<number | null>(null);
	let modalItemData = $state({
		deskripsi: '',
		department_id: '',
		project_id: '',
		akun_pendapatan: '',
		qty: 1,
		satuanSelect: 'Ton',
		customSatuan: '',
		harga: 0,
		diskon: 0,
		pajak_id: ''
	});

	function openItemModal(index: number) {
		const item = form.items[index];
		if (!item) return;
		editingItemIndex = index;
		const isStandard = STANDARD_UOMS.includes(item.satuan);
		modalItemData = {
			deskripsi: item.deskripsi || '',
			department_id: item.department_id ? item.department_id.toString() : '',
			project_id: item.project_id ? item.project_id.toString() : '',
			akun_pendapatan: item.akun_pendapatan ? item.akun_pendapatan.toString() : '',
			qty: item.qty ?? 1,
			satuanSelect: isStandard ? item.satuan : 'CUSTOM',
			customSatuan: isStandard ? '' : (item.satuan || ''),
			harga: item.harga ?? 0,
			diskon: item.diskon ?? 0,
			pajak_id: item.pajak_id ? item.pajak_id.toString() : ''
		};
	}

	function saveItemModal() {
		if (editingItemIndex === null) return;
		const finalSatuan = modalItemData.satuanSelect === 'CUSTOM'
			? (modalItemData.customSatuan.trim() || 'Pcs')
			: modalItemData.satuanSelect;

		form.items[editingItemIndex].deskripsi = modalItemData.deskripsi.trim();
		form.items[editingItemIndex].department_id = modalItemData.department_id;
		form.items[editingItemIndex].project_id = modalItemData.project_id;
		form.items[editingItemIndex].akun_pendapatan = modalItemData.akun_pendapatan;
		form.items[editingItemIndex].qty = parseFloat(Number(modalItemData.qty).toFixed(3)) || 0;
		form.items[editingItemIndex].satuan = finalSatuan;
		form.items[editingItemIndex].harga = Number(modalItemData.harga) || 0;
		form.items[editingItemIndex].diskon = Number(modalItemData.diskon) || 0;
		form.items[editingItemIndex].pajak_id = modalItemData.pajak_id;

		editingItemIndex = null;
	}

	function closeItemModal() {
		editingItemIndex = null;
	}

	let modalGross = $derived((Number(modalItemData.qty) || 0) * (Number(modalItemData.harga) || 0));
	let modalDiscountAmount = $derived(Number(modalItemData.diskon) || 0);
	let modalSubtotal = $derived(Math.max(0, modalGross - modalDiscountAmount));
	let modalTaxRate = $derived.by(() => {
		if (!modalItemData.pajak_id) return 0;
		const tax = taxes.find((t: any) => t.id.toString() === modalItemData.pajak_id.toString());
		return tax ? parseFloat(tax.rate || tax.value || 0) : 0;
	});
	let modalTaxAmount = $derived((modalSubtotal * modalTaxRate) / 100);
	let modalTotal = $derived(modalSubtotal + modalTaxAmount);

	function addItem() {
		form.items.push({
			department_id: '', project_id: '', akun_pendapatan: '', akun_piutang: '',
			deskripsi: '', qty: 1, satuan: 'Ton', harga: 0, diskon: 0, pajak_id: ''
		});
	}

	function removeItem(index: number) {
		if (form.items.length > 1) {
			form.items.splice(index, 1);
		}
	}
	
	const formatCurrency = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
	const formatQty = (val: any) => {
		if (val === null || val === undefined || isNaN(Number(val))) return '0';
		return parseFloat(Number(val).toFixed(3)).toString();
	};
	const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' }) : '-';
</script>

<svelte:head>
	<title>Customer Invoices | Finance ERP</title>
</svelte:head>

<!-- ===================== DN SELECTION MODAL ===================== -->
{#if showDnModal}
	<div class="fixed inset-0 z-[70] flex items-center justify-center p-4">
		<div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onclick={() => showDnModal = false} role="presentation"></div>
		<div class="relative w-full max-w-4xl bg-surface-container-lowest rounded-[24px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
			<!-- Header -->
			<div class="p-6 border-b border-surface-container bg-blue-50/50 dark:bg-blue-900/10">
				<div class="flex items-start justify-between">
					<div>
						<h3 class="text-xl font-bold text-blue-700 dark:text-blue-400">Pilih Surat Jalan</h3>
						<p class="text-xs text-on-surface-variant mt-1">Pilih surat jalan yang akan dimasukkan ke dalam Invoice ini.</p>
					</div>
					<button onclick={() => showDnModal = false} class="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant">
						<span class="material-symbols-outlined text-lg">close</span>
					</button>
				</div>

				<!-- Filter -->
				<div class="flex flex-wrap items-center gap-3 mt-4">
					<div class="flex items-center gap-2">
						<input type="date" bind:value={dnFilterStart} class="bg-white border border-surface-container rounded-xl px-3 py-2 text-sm font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
						<span class="text-on-surface-variant text-sm">s/d</span>
						<input type="date" bind:value={dnFilterEnd} class="bg-white border border-surface-container rounded-xl px-3 py-2 text-sm font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
					</div>
					<button onclick={fetchDnDetails} disabled={isFetchingDn} class="px-4 py-2 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2">
						{#if isFetchingDn}
							<span class="material-symbols-outlined text-[16px] animate-spin">sync</span>
						{:else}
							<span class="material-symbols-outlined text-[16px]">search</span>
						{/if}
						Filter
					</button>
				</div>
			</div>

			<!-- Table -->
			<div class="flex-1 overflow-y-auto custom-scrollbar">
				{#if dnFetchError}
					<div class="p-6 text-center text-rose-600 text-sm font-bold">{dnFetchError}</div>
				{:else if isFetchingDn}
					<div class="p-6 text-center text-on-surface-variant text-sm">Memuat data...</div>
				{:else if dnDetailPool.length === 0}
					<div class="p-12 text-center">
						<span class="material-symbols-outlined text-[48px] text-on-surface-variant">receipt_long</span>
						<p class="text-sm font-bold text-on-surface-variant mt-2">Tidak ada surat jalan tersedia</p>
						<p class="text-xs text-on-surface-variant">Coba ubah rentang tanggal atau pilih customer lain.</p>
					</div>
				{:else}
					<table class="w-full text-left border-collapse">
						<thead class="sticky top-0 bg-surface-container-low border-b border-surface-container">
							<tr>
								<th class="py-3 px-4">
									<input type="checkbox" checked={selectedDnIds.length === dnDetailPool.length && dnDetailPool.length > 0} onchange={toggleAllDn} class="rounded" />
								</th>
								<th class="py-3 px-4 text-xs font-black uppercase tracking-wider text-on-surface-variant">No. Surat Jalan</th>
								<th class="py-3 px-4 text-xs font-black uppercase tracking-wider text-on-surface-variant">Tanggal</th>
								<th class="py-3 px-4 text-xs font-black uppercase tracking-wider text-on-surface-variant">Project</th>
								<th class="py-3 px-4 text-xs font-black uppercase tracking-wider text-on-surface-variant">Muatan</th>
								<th class="py-3 px-4 text-xs font-black uppercase tracking-wider text-on-surface-variant text-right">Tonase</th>
								<th class="py-3 px-4 text-xs font-black uppercase tracking-wider text-on-surface-variant text-right">Tarif/Ton</th>
								<th class="py-3 px-4 text-xs font-black uppercase tracking-wider text-on-surface-variant text-right">Nilai</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-surface-container">
							{#each dnDetailPool as dn}
								<!-- svelte-ignore a11y_click_events_have_key_events -->
								<tr class="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 cursor-pointer transition-colors {selectedDnIds.includes(dn.id) ? 'bg-blue-50 dark:bg-blue-900/10' : ''}" onclick={() => toggleDn(dn.id)}>
									<td class="py-3 px-4">
										<input type="checkbox" checked={selectedDnIds.includes(dn.id)} onchange={() => toggleDn(dn.id)} class="rounded" onclick={(e) => e.stopPropagation()} />
									</td>
									<td class="py-3 px-4 font-bold text-sm text-on-surface">{dn.no_surat_jalan}</td>
									<td class="py-3 px-4 text-sm text-on-surface-variant">{formatDate(dn.tgl_surat_jalan)}</td>
									<td class="py-3 px-4 text-sm text-on-surface-variant">{dn.project_name || '-'}</td>
									<td class="py-3 px-4 text-sm text-on-surface-variant">{dn.jenis_muatan || '-'}</td>
									<td class="py-3 px-4 text-sm font-bold text-on-surface text-right">{parseFloat(dn.total_berat || 0).toFixed(3)} Ton</td>
									<td class="py-3 px-4 text-sm text-on-surface-variant text-right">{formatCurrency(parseFloat(dn.tarif || 0))}</td>
									<td class="py-3 px-4 text-sm font-bold text-on-surface text-right">{formatCurrency(parseFloat(dn.total_berat || 0) * parseFloat(dn.tarif || 0))}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{/if}
			</div>

			<!-- Footer -->
			<div class="p-4 border-t border-surface-container bg-surface-container-low/50 flex items-center justify-between gap-4">
				<div class="text-sm font-bold text-on-surface-variant">
					{selectedDnIds.length} dari {dnDetailPool.length} surat jalan dipilih
				</div>
				<div class="flex gap-3">
					<button onclick={() => showDnModal = false} class="px-4 py-2 rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container transition-colors">Batal</button>
					<button onclick={applyDnSelection} disabled={selectedDnIds.length === 0} class="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2">
						<span class="material-symbols-outlined text-[16px]">check_circle</span>
						Konfirmasi ({selectedDnIds.length} SJ)
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- ===================== COMPREHENSIVE ITEM EDIT MODAL ===================== -->
{#if editingItemIndex !== null}
	<div class="fixed inset-0 z-[80] flex items-center justify-center p-4">
		<div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onclick={closeItemModal} role="presentation"></div>
		<div class="relative w-full max-w-2xl bg-surface-container-lowest rounded-3xl shadow-2xl border border-surface-container overflow-hidden max-h-[90vh] flex flex-col">
			<!-- Header -->
			<div class="p-6 border-b border-surface-container bg-surface-container-low/50 flex items-center justify-between shrink-0">
				<div>
					<h3 class="text-lg font-black text-on-surface flex items-center gap-2">
						<span class="material-symbols-outlined text-primary">edit_note</span>
						Detail & Edit Invoice Line Item
					</h3>
					<p class="text-xs text-on-surface-variant mt-0.5">
						Atur rincian deskripsi pekerjaan, departemen, kuantitas, harga, diskon, dan perpajakan untuk baris #{editingItemIndex + 1}
					</p>
				</div>
				<button type="button" onclick={closeItemModal} class="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors">
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>

			<!-- Body (Scrollable if screen small) -->
			<div class="p-6 space-y-5 overflow-y-auto flex-1">
				<!-- 1. Posisi Paling Atas: Deskripsi / Keterangan Pekerjaan -->
				<div>
					<label for="modal-deskripsi" class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
						Deskripsi / Keterangan Pekerjaan <span class="text-error">*</span>
					</label>
					<textarea 
						id="modal-deskripsi" 
						bind:value={modalItemData.deskripsi} 
						rows="2" 
						class="w-full bg-surface-container rounded-xl px-3.5 py-2.5 text-sm font-medium text-on-surface border-2 border-transparent focus:border-primary focus:bg-surface-container-lowest outline-none transition-all placeholder:text-on-surface-variant/50" 
						placeholder="Contoh: Angkutan Semen Curah Karawang - Cilegon / Jasa Sewa Unit..."
					></textarea>
				</div>

				<!-- 2. Kategori/Departemen Layanan & Akun Pendapatan -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div>
						<label for="modal-dept" class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Departemen / Layanan
						</label>
						<select 
							id="modal-dept" 
							bind:value={modalItemData.department_id} 
							class="w-full bg-surface-container rounded-xl px-3.5 py-2.5 text-xs font-bold text-on-surface border-2 border-transparent focus:border-primary outline-none transition-all cursor-pointer"
						>
							<option value="">-- Pilih Departemen --</option>
							{#each departmentOpts as d}
								<option value={d.value}>{d.label}</option>
							{/each}
						</select>
					</div>

					<div>
						<label for="modal-akun" class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Akun Pendapatan
						</label>
						<select 
							id="modal-akun" 
							bind:value={modalItemData.akun_pendapatan} 
							class="w-full bg-surface-container rounded-xl px-3.5 py-2.5 text-xs font-bold text-on-surface border-2 border-transparent focus:border-primary outline-none transition-all cursor-pointer"
						>
							<option value="">-- Pilih Akun --</option>
							{#each accounts as a}
								<option value={a.id}>{a.name}</option>
							{/each}
						</select>
					</div>
				</div>

				<!-- 3. Quantity, Satuan & Harga Satuan -->
				<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
					<!-- Quantity -->
					<div>
						<label for="modal-qty" class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Quantity (Qty) <span class="text-error">*</span>
						</label>
						<input 
							id="modal-qty" 
							type="number" 
							bind:value={modalItemData.qty} 
							step="0.001" 
							min="0" 
							class="w-full bg-surface-container rounded-xl px-3.5 py-2.5 text-base font-bold font-mono text-on-surface border-2 border-transparent focus:border-primary focus:bg-surface-container-lowest outline-none transition-all text-right" 
							placeholder="0.000"
						/>
						<p class="text-[10px] text-on-surface-variant mt-1 italic">3 digit desimal (12.345)</p>
					</div>

					<!-- Satuan (UOM) -->
					<div>
						<label for="modal-satuan" class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Satuan / UOM <span class="text-error">*</span>
						</label>
						<select 
							id="modal-satuan" 
							bind:value={modalItemData.satuanSelect} 
							class="w-full bg-surface-container rounded-xl px-3.5 py-2.5 text-sm font-bold text-on-surface border-2 border-transparent focus:border-primary outline-none transition-all cursor-pointer"
						>
							{#each STANDARD_UOMS as uom}
								<option value={uom}>{uom}</option>
							{/each}
							<option value="CUSTOM">-- Lainnya (Manual) --</option>
						</select>

						{#if modalItemData.satuanSelect === 'CUSTOM'}
							<div class="mt-2">
								<input 
									type="text" 
									bind:value={modalItemData.customSatuan} 
									placeholder="Ketik satuan..." 
									class="w-full bg-surface-container-lowest border-2 border-primary/50 rounded-xl px-3 py-1.5 text-xs font-semibold uppercase text-on-surface outline-none focus:border-primary"
								/>
							</div>
						{/if}
					</div>

					<!-- Harga Satuan -->
					<div>
						<label for="modal-harga" class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Harga Satuan (Rp) <span class="text-error">*</span>
						</label>
						<div class="relative">
							<span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-on-surface-variant font-mono">Rp</span>
							<input 
								id="modal-harga" 
								type="number" 
								bind:value={modalItemData.harga} 
								min="0" 
								step="any" 
								class="w-full bg-surface-container rounded-xl pl-9 pr-3 py-2.5 text-base font-bold font-mono text-on-surface border-2 border-transparent focus:border-primary focus:bg-surface-container-lowest outline-none transition-all text-right" 
								placeholder="0"
							/>
						</div>
						<p class="text-[11px] text-on-surface-variant font-medium mt-1 text-right">
							{formatCurrency(modalItemData.harga || 0)}
						</p>
					</div>
				</div>

				<!-- 4. Diskon & Pajak (PPN) -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div>
						<label for="modal-diskon" class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Potongan Diskon (Rp)
						</label>
						<div class="relative">
							<span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-on-surface-variant font-mono">Rp</span>
							<input 
								id="modal-diskon" 
								type="number" 
								bind:value={modalItemData.diskon} 
								min="0" 
								step="any" 
								class="w-full bg-surface-container rounded-xl pl-9 pr-4 py-2.5 text-sm font-bold font-mono text-on-surface border-2 border-transparent focus:border-primary focus:bg-surface-container-lowest outline-none transition-all text-right" 
								placeholder="0"
							/>
						</div>
						<p class="text-[11px] text-on-surface-variant font-medium mt-1 text-right">
							{formatCurrency(modalItemData.diskon || 0)}
						</p>
					</div>

					<div>
						<label for="modal-pajak" class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Pajak (PPN)
						</label>
						<select 
							id="modal-pajak" 
							bind:value={modalItemData.pajak_id} 
							class="w-full bg-surface-container rounded-xl px-3.5 py-2.5 text-xs font-bold text-on-surface border-2 border-transparent focus:border-primary outline-none transition-all cursor-pointer"
						>
							<option value="">- Tanpa Pajak (0%) -</option>
							{#each taxes as t}
								<option value={t.id}>{t.name} ({t.rate || t.value || 0}%)</option>
							{/each}
						</select>
						<p class="text-[11px] text-on-surface-variant mt-1">
							Tarif: <strong>{modalTaxRate}%</strong> (+ {formatCurrency(modalTaxAmount)})
						</p>
					</div>
				</div>

				<!-- 5. Live Summary Bento Preview -->
				<div class="p-4 rounded-2xl bg-surface-container border border-surface-variant/30 space-y-2">
					<div class="flex items-center justify-between text-xs text-on-surface-variant">
						<span>Gross ({formatQty(modalItemData.qty || 0)} × {formatCurrency(modalItemData.harga || 0)}):</span>
						<span class="font-mono font-bold">{formatCurrency(modalGross)}</span>
					</div>
					{#if modalDiscountAmount > 0}
						<div class="flex items-center justify-between text-xs text-rose-600">
							<span>Potongan Diskon:</span>
							<span class="font-mono font-bold">- {formatCurrency(modalDiscountAmount)}</span>
						</div>
					{/if}
					<div class="flex items-center justify-between text-xs text-on-surface-variant">
						<span>Dasar Pengenaan Pajak (DPP):</span>
						<span class="font-mono font-bold">{formatCurrency(modalSubtotal)}</span>
					</div>
					{#if modalTaxAmount > 0}
						<div class="flex items-center justify-between text-xs text-teal-600 dark:text-teal-400">
							<span>PPN ({modalTaxRate}%):</span>
							<span class="font-mono font-bold">+ {formatCurrency(modalTaxAmount)}</span>
						</div>
					{/if}
					<div class="border-t border-surface-variant/30 pt-2 flex items-center justify-between">
						<span class="text-xs font-bold text-on-surface uppercase tracking-wider">Subtotal / Total Baris:</span>
						<span class="text-lg font-black text-primary font-mono">{formatCurrency(modalTotal)}</span>
					</div>
				</div>
			</div>

			<!-- Footer Actions -->
			<div class="p-4 border-t border-surface-container bg-surface-container-low/30 flex items-center justify-end gap-3 shrink-0">
				<button 
					type="button" 
					onclick={closeItemModal} 
					class="px-4 py-2 rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container transition-colors"
				>
					Batal
				</button>
				<button 
					type="button" 
					onclick={saveItemModal} 
					class="px-5 py-2 bg-primary text-on-primary rounded-xl text-sm font-bold hover:opacity-90 shadow-sm flex items-center gap-2 transition-all"
				>
					<span class="material-symbols-outlined text-[18px]">check</span>
					Terapkan ke Baris
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- ===================== MAIN PAGE ===================== -->
<div class="max-w-7xl mx-auto p-8">
	<!-- Page Header -->
	<header class="mb-8 flex justify-between items-end">
		<div>
			<a href="/finance/create-transaction" class="text-sm text-primary hover:underline font-bold mb-2 inline-flex items-center gap-1">
				<span class="material-symbols-outlined text-[16px]">arrow_back</span> Back to Hub
			</a>
			<h1 class="text-3xl font-extrabold text-on-surface tracking-tight mt-1">Edit Invoice</h1>
			<p class="text-on-surface-variant font-medium text-sm mt-1">Ubah detail faktur penjualan (Account Receivable).</p>
		</div>
		<div class="flex gap-3">
			<button onclick={() => history.back()} class="bg-surface-container-highest text-on-surface px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm hover:opacity-90 transition-opacity">
				Cancel
			</button>
			<form method="POST" action="?/updateInvoice" use:enhance={() => {
				let btn = document.getElementById('btnSave');
				if(btn) { btn.innerHTML = 'Saving...'; (btn as HTMLButtonElement).disabled = true; }
				return async ({ result }: { result: any }) => {
					if (result.type === 'success' && result.data?.success) {
						alert(result.data.message + ' No: ' + result.data.invoice_number);
						window.location.href = '/finance/invoices';
					} else {
						alert(result.data?.message || 'Error occurred');
					}
					if(btn) { btn.innerHTML = '<span class="material-symbols-outlined text-lg">save</span> Save Invoice'; (btn as HTMLButtonElement).disabled = false; }
				};
			}}>
				<input type="hidden" name="invoice" value={JSON.stringify(form)} />
				<input type="hidden" name="selectedDnIds" value={JSON.stringify(selectedDnIds)} />
				<button id="btnSave" type="submit" class="bg-primary text-on-primary px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm hover:opacity-90 transition-opacity">
					<span class="material-symbols-outlined text-lg">save</span>
					Update Invoice
				</button>
			</form>
		</div>
	</header>

	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<!-- Left Column: Header Form -->
		<div class="lg:col-span-2 space-y-6">
			<!-- General Info -->
			<div class="bg-surface-container-lowest rounded-3xl p-6 shadow-sm border border-surface-variant/20">
				<h2 class="text-lg font-bold text-primary mb-4 flex items-center gap-2">
					<span class="material-symbols-outlined">info</span> General Information
				</h2>
				
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Customer <span class="text-error">*</span></label>
						<div class="relative">
							<SearchableSelect 
								options={customerOpts} 
								bind:value={form.customer_id} 
								placeholder="-- Cari Customer --"
							/>
							<!-- Overlay to block clicks -->
							<div class="absolute inset-0 z-10 cursor-not-allowed bg-transparent" title="Kustomer tidak bisa diubah saat mode Edit"></div>
						</div>
					</div>
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Status</label>
						<select bind:value={form.status} class="w-full bg-surface-container rounded-xl px-4 py-2.5 text-sm font-medium border-none focus:ring-2 focus:ring-primary outline-none">
							<option value="DRAFT">Draft</option>
							<option value="POSTED">Posted</option>
						</select>
					</div>

					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">No Invoice</label>
						<input type="text" bind:value={form.no_inv} class="w-full bg-surface-container rounded-xl px-4 py-2.5 text-sm font-medium border-none focus:ring-2 focus:ring-primary outline-none text-on-surface-variant" placeholder="Otomatis digenerate" />
						<p class="text-[10px] text-on-surface-variant mt-1 italic">Di-generate otomatis / ubah jika perlu</p>
					</div>
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Tgl Invoice <span class="text-error">*</span></label>
						<input type="date" bind:value={form.tgl_inv} class="w-full bg-surface-container rounded-xl px-4 py-2.5 text-sm font-medium border-none focus:ring-2 focus:ring-primary outline-none" />
					</div>

					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">No Kontrak</label>
						<SearchableSelect 
							options={filteredContractOpts} 
							bind:value={form.no_kontrak} 
							placeholder="-- Cari Kontrak --" 
						/>
					</div>
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">
							Dokumen Order / Kontrak <span class="text-error">*</span>
						</label>
						<div class="flex rounded-xl overflow-hidden bg-surface-container border border-surface-variant/30 focus-within:ring-2 focus-within:ring-primary">
							<select 
								bind:value={refOrderType} 
								onchange={syncOrderRef}
								class="bg-surface-container-high text-xs font-bold text-on-surface px-3 py-2.5 outline-none border-r border-surface-variant/30 cursor-pointer shrink-0"
							>
								<option value="PO">PO</option>
								<option value="SPK">SPK</option>
								<option value="SPH">SPH</option>
								<option value="Quotation">Quotation</option>
								<option value="CUSTOM">Lainnya</option>
							</select>
							<input 
								type="text" 
								bind:value={refOrderNumber} 
								oninput={syncOrderRef}
								class="flex-1 bg-transparent px-3.5 py-2.5 text-sm font-medium outline-none text-on-surface placeholder:text-on-surface-variant/50" 
								placeholder={refOrderType === 'CUSTOM' ? 'Nomor referensi manual...' : `Nomor ${refOrderType} pelanggan...`} 
							/>
						</div>
						{#if form.no_po_spk}
							<p class="text-[10px] text-on-surface-variant mt-1 font-mono">
								Tersimpan: <strong class="text-primary">{form.no_po_spk}</strong>
							</p>
						{/if}
					</div>
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">
							Dokumen Penerimaan / Pengiriman (LHP / Penerimaan)
						</label>
						<div class="flex rounded-xl overflow-hidden bg-surface-container border border-surface-variant/30 focus-within:ring-2 focus-within:ring-primary">
							<select 
								bind:value={refLhpType} 
								onchange={syncLhpRef}
								class="bg-surface-container-high text-xs font-bold text-on-surface px-3 py-2.5 outline-none border-r border-surface-variant/30 cursor-pointer shrink-0"
							>
								<option value="LHP">LHP</option>
								<option value="RR">RR</option>
								<option value="GR">GR</option>
								<option value="CUSTOM">Lainnya</option>
							</select>
							<input 
								type="text" 
								bind:value={refLhpNumber} 
								oninput={syncLhpRef}
								class="flex-1 bg-transparent px-3.5 py-2.5 text-sm font-medium outline-none text-on-surface placeholder:text-on-surface-variant/50" 
								placeholder={refLhpType === 'CUSTOM' ? 'Nomor dokumen manual...' : `Nomor ${refLhpType}... (Opsional)`} 
							/>
						</div>
						{#if form.no_lhp}
							<p class="text-[10px] text-on-surface-variant mt-1 font-mono">
								Tersimpan: <strong class="text-primary">{form.no_lhp}</strong>
							</p>
						{/if}
					</div>
				</div>
			</div>

			<!-- Line Items Table -->
			<div class="bg-surface-container-lowest rounded-3xl shadow-sm border border-surface-variant/20 overflow-hidden">
				<div class="p-6 border-b border-surface-variant/20 flex justify-between items-center bg-surface-container-lowest">
					<h2 class="text-lg font-bold text-secondary flex items-center gap-2">
						<span class="material-symbols-outlined">list_alt</span> Invoice Line Items
						{#if selectedDnIds.length > 0}
							<span class="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded-lg border border-blue-200">{selectedDnIds.length} SJ dipilih</span>
						{/if}
					</h2>
					<div class="flex gap-2">
						<button onclick={openDnModal} class="text-xs font-bold bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1 shadow-sm">
							<span class="material-symbols-outlined text-sm">receipt</span> Pilih Surat Jalan
						</button>
						<button onclick={addItem} class="text-xs font-bold bg-secondary-container text-on-secondary-container px-3 py-1.5 rounded-lg hover:brightness-95 transition-all flex items-center gap-1 shadow-sm">
							<span class="material-symbols-outlined text-sm">add</span> Add Row
						</button>
					</div>
				</div>
				<div class="overflow-x-auto min-h-[320px]">
					<table class="w-full text-left border-collapse">
						<thead class="bg-surface-container text-on-surface-variant text-[10px] uppercase tracking-wider">
							<tr>
								<th class="p-3 font-black whitespace-nowrap">Deskripsi</th>
								<th class="p-3 font-black w-48">Department</th>
								<th class="p-3 font-black">Akun Pdk.</th>
								<th class="p-3 font-black text-right w-24">Qty</th>
								<th class="p-3 font-black w-24">Satuan</th>
								<th class="p-3 font-black text-right w-36">Harga</th>
								<th class="p-3 font-black w-32">Pajak</th>
								<th class="p-3 font-black text-right w-32">Total</th>
								<th class="p-3 w-10"></th>
							</tr>
						</thead>
						<tbody class="divide-y divide-surface-container">
							{#if form.items.length === 0}
								<tr>
									<td colspan="9" class="py-8 text-center text-sm text-on-surface-variant">
										<p class="font-bold">Belum ada item</p>
										<p class="text-xs mt-1">Klik <strong>"Pilih Surat Jalan"</strong> untuk mengisi otomatis dari data operasional, atau <strong>"Add Row"</strong> untuk menginput manual.</p>
									</td>
								</tr>
							{:else}
								{#each form.items as item, i}
									<tr class="hover:bg-surface-container-lowest group">
										<td class="p-3">
											<input type="text" bind:value={item.deskripsi} class="w-full min-w-[150px] bg-surface-container rounded-lg px-2.5 py-1.5 text-xs font-medium border border-surface-variant/30 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" placeholder="Nama Layanan/Barang" />
										</td>
										<td class="p-3 min-w-[160px]">
											<SearchableSelect 
												options={departmentOpts} 
												bind:value={item.department_id} 
												placeholder="- Dept -" 
												btnClass="bg-surface-container rounded-lg px-2.5 py-1.5 text-xs border border-surface-variant/30" 
											/>
										</td>
										<td class="p-3">
											<select bind:value={item.akun_pendapatan} class="w-full min-w-[110px] bg-surface-container rounded-lg px-2.5 py-1.5 text-xs font-medium border border-surface-variant/30 focus:border-primary focus:ring-1 focus:ring-primary outline-none cursor-pointer">
												<option value="">- Akun -</option>
												{#each accounts as a}<option value={a.id}>{a.name}</option>{/each}
											</select>
										</td>
										<td class="p-3">
											<button 
												type="button" 
												onclick={() => openItemModal(i)} 
												class="w-full text-right px-2 py-1.5 rounded-lg bg-surface-container/60 hover:bg-primary/10 hover:text-primary border border-surface-variant/30 hover:border-primary/50 transition-all font-mono font-bold text-sm flex items-center justify-end gap-1 group/btn cursor-pointer"
												title="Klik untuk ubah Qty, Satuan & Harga"
											>
												<span>{formatQty(item.qty)}</span>
												<span class="material-symbols-outlined text-[13px] opacity-0 group-hover/btn:opacity-100 text-primary">edit</span>
											</button>
										</td>
										<td class="p-3">
											<button 
												type="button" 
												onclick={() => openItemModal(i)} 
												class="w-full text-left px-2 py-1.5 rounded-lg bg-surface-container/60 hover:bg-primary/10 hover:text-primary border border-surface-variant/30 hover:border-primary/50 transition-all font-semibold text-xs uppercase flex items-center justify-between gap-1 group/btn cursor-pointer"
												title="Klik untuk ubah Qty, Satuan & Harga"
											>
												<span class="truncate">{item.satuan || '-'}</span>
												<span class="material-symbols-outlined text-[13px] text-on-surface-variant group-hover/btn:text-primary">arrow_drop_down</span>
											</button>
										</td>
										<td class="p-3">
											<button 
												type="button" 
												onclick={() => openItemModal(i)} 
												class="w-full text-right px-2 py-1.5 rounded-lg bg-surface-container/60 hover:bg-primary/10 hover:text-primary border border-surface-variant/30 hover:border-primary/50 transition-all font-mono font-bold text-sm flex items-center justify-end gap-1 group/btn cursor-pointer"
												title="Klik untuk ubah Qty, Satuan & Harga"
											>
												<span>{formatCurrency(item.harga)}</span>
												<span class="material-symbols-outlined text-[13px] opacity-0 group-hover/btn:opacity-100 text-primary">edit</span>
											</button>
										</td>
										<td class="p-3">
											<select bind:value={item.pajak_id} class="w-full min-w-[90px] bg-surface-container rounded-lg px-2.5 py-1.5 text-xs font-medium border border-surface-variant/30 focus:border-primary focus:ring-1 focus:ring-primary outline-none cursor-pointer">
												<option value="">- Pajak -</option>
												{#each taxes as t}<option value={t.id}>{t.name}</option>{/each}
											</select>
										</td>
										<td class="p-3 text-right">
											<div class="flex flex-col items-end">
												<span class="text-sm font-black text-on-surface">{formatCurrency(Math.max(0, (item.qty * item.harga) - (item.diskon || 0)))}</span>
												{#if item.diskon > 0}
													<span class="text-[10px] text-rose-500 font-bold font-mono">Disc -{formatCurrency(item.diskon)}</span>
												{/if}
											</div>
										</td>
										<td class="p-3 text-center">
											<div class="flex items-center justify-center gap-1">
												<button 
													type="button" 
													onclick={() => openItemModal(i)} 
													class="w-7 h-7 rounded-lg bg-surface-container hover:bg-primary/10 hover:text-primary flex items-center justify-center text-on-surface-variant transition-colors" 
													title="Detail & Edit Baris (Modal)"
												>
													<span class="material-symbols-outlined text-[16px]">edit_note</span>
												</button>
												<button 
													type="button" 
													onclick={() => removeItem(i)} 
													class="w-7 h-7 rounded-lg bg-surface-container hover:bg-error/10 hover:text-error flex items-center justify-center text-on-surface-variant transition-colors" 
													disabled={form.items.length === 1}
													title="Hapus Baris"
												>
													<span class="material-symbols-outlined text-[16px]">delete</span>
												</button>
											</div>
										</td>
									</tr>
								{/each}
							{/if}
						</tbody>
					</table>
				</div>
			</div>
			
			<!-- Additional Remarks -->
			<div>
				<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Remarks / Notes</label>
				<textarea bind:value={form.remark} class="w-full bg-surface-container-lowest border border-surface-variant/20 rounded-2xl p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-primary shadow-sm" rows="3" placeholder="Tambahkan catatan khusus untuk invoice ini..."></textarea>
			</div>
		</div>

		<!-- Right Column: Settings & Summary -->
		<div class="space-y-6">
			<!-- Term & Payment settings -->
			<div class="bg-surface-container-lowest rounded-3xl p-6 shadow-sm border border-surface-variant/20">
				<h2 class="text-lg font-bold text-tertiary mb-4 flex items-center gap-2">
					<span class="material-symbols-outlined">settings_suggest</span> Terms & Settings
				</h2>
				<div class="space-y-4">
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Periode Kegiatan</label>
						<input type="month" bind:value={form.periode_kegiatan} class="w-full bg-surface-container rounded-xl px-4 py-2.5 text-sm font-medium border-none focus:ring-2 focus:ring-tertiary outline-none" />
					</div>
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Tgl Kirim Invoice</label>
						<input type="date" bind:value={form.tgl_kirim_inv} class="w-full bg-surface-container rounded-xl px-4 py-2.5 text-sm font-medium border-none focus:ring-2 focus:ring-tertiary outline-none" />
					</div>
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Term Pembayaran (Hari)</label>
						<div class="relative">
							<input type="number" bind:value={form.term_pembayaran} class="w-full bg-surface-container rounded-xl px-4 py-2.5 pr-12 text-sm font-bold border-none focus:ring-2 focus:ring-tertiary outline-none" min="0" />
							<span class="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-on-surface-variant">Hari</span>
						</div>
					</div>
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Bank Penerima</label>
						<SearchableSelect 
							options={bankOpts} 
							bind:value={form.bank_id} 
							placeholder="-- Cari Bank --" 
						/>
					</div>
				</div>
			</div>

			<!-- Summary -->
			<div class="bg-surface-container-lowest rounded-3xl p-6 shadow-lg border-2 border-primary/20 relative overflow-hidden">
				<div class="absolute -right-10 -bottom-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>

				<h2 class="text-lg font-bold text-on-surface mb-6 flex items-center gap-2">
					<span class="material-symbols-outlined">receipt_long</span> Summary
				</h2>
				
				<div class="space-y-3 relative z-10">
					<div class="flex justify-between items-center">
						<span class="text-sm font-medium text-on-surface-variant">Subtotal</span>
						<span class="text-sm font-bold text-on-surface">{formatCurrency(subtotal)}</span>
					</div>
					<div class="flex justify-between items-center">
						<span class="text-sm font-medium text-on-surface-variant">Pajak (Tax)</span>
						<span class="text-sm font-bold text-on-surface">{formatCurrency(taxTotal)}</span>
					</div>
					
					<div class="pt-3 border-t border-surface-variant/30 flex justify-between items-center">
						<span class="text-sm font-medium text-on-surface-variant">Uang Muka (Advance)</span>
						<input type="number" bind:value={form.uang_muka} class="w-32 bg-surface-container rounded-lg px-2 py-1 text-sm text-right font-bold border-none outline-none focus:ring-1 focus:ring-primary text-error" />
					</div>

					<div class="pt-4 border-t-2 border-surface-variant/50 mt-4 flex justify-between items-end">
						<span class="text-xs font-black uppercase tracking-widest text-on-surface">Grand Total</span>
						<span class="text-2xl font-black text-primary">{formatCurrency(grandTotal)}</span>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
