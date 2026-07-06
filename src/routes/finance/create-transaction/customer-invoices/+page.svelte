<script lang="ts">
	import { enhance } from '$app/forms';
	import SearchableSelect from '$lib/components/SearchableSelect.svelte';
	
	let { data } = $props();
	const { customers, contracts, banks, departments, projects, accounts, taxes } = data;

	// Prepare mapped options for SearchableSelect
	const customerOpts = customers.map((c: any) => ({ value: c.id, label: `${c.code} - ${c.name}` }));
	const contractOpts = contracts.map((c: any) => ({ value: c.id, label: `${c.id} ${c.project_name ? `(${c.project_name})` : ''}`, customer_id: c.customer_id, project_id: c.project_id }));
	const bankOpts = banks.map((b: any) => ({ value: b.id, label: b.name }));

	// Invoice form state
	let form = $state({
		customer_id: '',
		tgl_inv: '',
		no_inv: '*****/cust_code/dept_code/project_code/romawi_month/yyyy',
		no_kontrak: '',
		no_po_spk: '',
		periode_kegiatan: '',
		tgl_kirim_inv: '',
		term_pembayaran: 30,
		bank_id: '',
		uang_muka: 0,
		status: 'DRAFT',
		remark: '',
		items: [] as any[]
	});

	// Selected DN details state
	let selectedDnIds = $state<string[]>([]);
	let dnDetailPool = $state<any[]>([]); // Available DN details from server

	// Modal state
	let showDnModal = $state(false);
	let dnFilterStart = $state('');
	let dnFilterEnd = $state('');
	let isFetchingDn = $state(false);
	let dnFetchError = $state('');

	// Derived calculations
	const subtotal = $derived(form.items.reduce((sum: number, item: any) => sum + (item.qty * item.harga), 0));
	
	const taxTotal = $derived(form.items.reduce((sum: number, item: any) => {
		const tax = taxes.find((t: any) => t.id === item.pajak_id);
		const rate = tax ? tax.rate / 100 : 0;
		return sum + (item.qty * item.harga * rate);
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
			deskripsi: '', qty: 1, satuan: 'Ton', harga: 0, pajak_id: ''
		}];

		showDnModal = false;
	}

	function addItem() {
		form.items.push({
			department_id: '', project_id: '', akun_pendapatan: '', akun_piutang: '',
			deskripsi: '', qty: 1, satuan: 'PCS', harga: 0, pajak_id: ''
		});
	}

	function removeItem(index: number) {
		if (form.items.length > 1) {
			form.items.splice(index, 1);
		}
	}
	
	const formatCurrency = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
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

<!-- ===================== MAIN PAGE ===================== -->
<div class="max-w-7xl mx-auto p-8">
	<!-- Page Header -->
	<header class="mb-8 flex justify-between items-end">
		<div>
			<a href="/finance/create-transaction" class="text-sm text-primary hover:underline font-bold mb-2 inline-flex items-center gap-1">
				<span class="material-symbols-outlined text-[16px]">arrow_back</span> Back to Hub
			</a>
			<h1 class="text-3xl font-extrabold text-on-surface tracking-tight mt-1">Customer Invoices</h1>
			<p class="text-on-surface-variant font-medium text-sm mt-1">Buat faktur penjualan baru (Account Receivable).</p>
		</div>
		<div class="flex gap-3">
			<button onclick={() => history.back()} class="bg-surface-container-highest text-on-surface px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm hover:opacity-90 transition-opacity">
				Cancel
			</button>
			<form method="POST" action="?/saveInvoice" use:enhance={() => {
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
					Save Invoice
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
						<SearchableSelect 
							options={customerOpts} 
							bind:value={form.customer_id} 
							placeholder="-- Cari Customer --" 
						/>
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
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">No PO / SPK <span class="text-error">*</span></label>
						<input type="text" bind:value={form.no_po_spk} class="w-full bg-surface-container rounded-xl px-4 py-2.5 text-sm font-medium border-none focus:ring-2 focus:ring-primary outline-none" placeholder="No PO Pelanggan" />
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
				<div class="overflow-x-auto">
					<table class="w-full text-left border-collapse">
						<thead class="bg-surface-container text-on-surface-variant text-[10px] uppercase tracking-wider">
							<tr>
								<th class="p-3 font-black whitespace-nowrap">Deskripsi</th>
								<th class="p-3 font-black">Department</th>
								<th class="p-3 font-black">Akun Pdk.</th>
								<th class="p-3 font-black text-right w-24">Qty</th>
								<th class="p-3 font-black text-right w-32">Harga</th>
								<th class="p-3 font-black w-32">Pajak</th>
								<th class="p-3 font-black text-right w-32">Total</th>
								<th class="p-3 w-10"></th>
							</tr>
						</thead>
						<tbody class="divide-y divide-surface-container">
							{#if form.items.length === 0}
								<tr>
									<td colspan="8" class="py-8 text-center text-sm text-on-surface-variant">
										<p class="font-bold">Belum ada item</p>
										<p class="text-xs mt-1">Klik <strong>"Pilih Surat Jalan"</strong> untuk mengisi otomatis dari data operasional, atau <strong>"Add Row"</strong> untuk menginput manual.</p>
									</td>
								</tr>
							{:else}
								{#each form.items as item, i}
									<tr class="hover:bg-surface-container-lowest group">
										<td class="p-3">
											<input type="text" bind:value={item.deskripsi} class="w-full min-w-[150px] bg-transparent border-b border-surface-variant/30 focus:border-primary outline-none py-1 text-sm font-medium" placeholder="Nama Layanan/Barang" />
										</td>
										<td class="p-3">
											<select bind:value={item.department_id} class="w-full min-w-[100px] bg-transparent border-b border-surface-variant/30 focus:border-primary outline-none py-1 text-sm">
												<option value="">-Dept-</option>
												{#each departments as d}<option value={d.id}>{d.name}</option>{/each}
											</select>
										</td>
										<td class="p-3">
											<select bind:value={item.akun_pendapatan} class="w-full min-w-[100px] bg-transparent border-b border-surface-variant/30 focus:border-primary outline-none py-1 text-sm">
												<option value="">-Akun-</option>
												{#each accounts as a}<option value={a.id}>{a.name}</option>{/each}
											</select>
										</td>
										<td class="p-3">
											<div class="flex items-center gap-1">
												<input type="number" bind:value={item.qty} class="w-full min-w-[50px] bg-transparent border-b border-surface-variant/30 focus:border-primary outline-none py-1 text-sm text-right font-bold" min="0" step="0.001" />
												<span class="text-[10px] text-on-surface-variant">{item.satuan}</span>
											</div>
										</td>
										<td class="p-3">
											<input type="number" bind:value={item.harga} class="w-full min-w-[80px] bg-transparent border-b border-surface-variant/30 focus:border-primary outline-none py-1 text-sm text-right font-bold" />
										</td>
										<td class="p-3">
											<select bind:value={item.pajak_id} class="w-full min-w-[80px] bg-transparent border-b border-surface-variant/30 focus:border-primary outline-none py-1 text-sm">
												<option value="">-Pajak-</option>
												{#each taxes as t}<option value={t.id}>{t.name}</option>{/each}
											</select>
										</td>
										<td class="p-3 text-right">
											<span class="text-sm font-black text-on-surface">{formatCurrency(item.qty * item.harga)}</span>
										</td>
										<td class="p-3 text-center">
											<button onclick={() => removeItem(i)} class="text-error opacity-0 group-hover:opacity-100 transition-opacity hover:bg-error-container p-1.5 rounded-lg" disabled={form.items.length === 1}>
												<span class="material-symbols-outlined text-sm">delete</span>
											</button>
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
