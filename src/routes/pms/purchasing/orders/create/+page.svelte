<script lang="ts">
	import { enhance } from '$app/forms';
	import SearchableSelect from '$lib/components/SearchableSelect.svelte';
	
	let { data } = $props();

	// Format Dropdown Options
	const vendorOpts = data.vendors.map((v: any) => ({ value: v.id, label: v.name }));
	const itemOpts = data.items.map((i: any) => ({ 
		value: i.id, 
		label: `[${i.material_code}] ${i.name} ${i.part_no ? '('+i.part_no+')' : ''}` 
	}));
	const prOpts = data.approvedPrs.map((pr: any) => ({
		value: pr.id.toString(),
		label: `${pr.pr_number} - ${pr.department}`
	}));
	const taxOpts = data.taxes.map((t: any) => ({ value: t.id, label: `${t.name} (${t.rate}%)`, rate: Number(t.rate) }));

	let selectedPrId = $state('');

	let formState = $state({
		vendor_id: '',
		date: new Date().toISOString().split('T')[0],
		notes: '',
		action: 'DRAFT', // or CONFIRMED
		items: [
			{ id: crypto.randomUUID(), pr_line_id: '', item_id: '', qty_ordered: 1, unit_price: 0, tax_id: '', tax_amount: 0, total: 0 }
		]
	});

	// Totals
	let subtotal = $derived(formState.items.reduce((sum, item) => sum + (item.qty_ordered * item.unit_price), 0));
	let taxAmount = $derived(formState.items.reduce((sum, item) => sum + item.tax_amount, 0));
	let grandTotal = $derived(subtotal + taxAmount);

	// Update Line Total
	function updateLine(index: number) {
		const item = formState.items[index];
		const baseTotal = item.qty_ordered * item.unit_price;
		
		let lineTax = 0;
		if (item.tax_id) {
			const tax = taxOpts.find(t => t.value === item.tax_id);
			if (tax) {
				lineTax = baseTotal * (tax.rate / 100);
			}
		}
		
		item.tax_amount = lineTax;
		item.total = baseTotal + lineTax;
	}

	function addItem() {
		formState.items.push({ id: crypto.randomUUID(), pr_line_id: '', item_id: '', qty_ordered: 1, unit_price: 0, tax_id: '', tax_amount: 0, total: 0 });
	}

	function removeItem(index: number) {
		if (formState.items.length > 1) {
			formState.items.splice(index, 1);
		}
	}

	// Pull PR Data
	async function pullPRData() {
		if (!selectedPrId) return;

		try {
			const res = await fetch(`/api/pms/purchasing/requests/${selectedPrId}`);
			if (!res.ok) throw new Error('Gagal menarik data PR');
			
			const json = await res.json();
			if (json.success && json.data) {
				// Map PR lines to PO lines
				formState.items = json.data.map((prLine: any) => ({
					id: crypto.randomUUID(),
					pr_line_id: prLine.pr_line_id,
					item_id: prLine.item_id,
					qty_ordered: Number(prLine.qty_requested),
					unit_price: 0,
					tax_id: '',
					tax_amount: 0,
					total: 0
				}));
				alert('Berhasil menarik data Purchase Request!');
			} else {
				throw new Error(json.message || 'Gagal menarik data PR');
			}
		} catch (e: any) {
			alert(e.message);
		}
	}

	const formatCurrency = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
</script>

<svelte:head>
	<title>Create Purchase Order | PMS</title>
</svelte:head>

<div class="w-full px-4 sm:px-6 lg:px-8 py-6">
	<!-- Header -->
	<header class="mb-8 flex justify-between items-end">
		<div>
			<a href="/pms/purchasing/orders" class="text-sm text-primary hover:underline font-bold mb-2 inline-flex items-center gap-1">
				<span class="material-symbols-outlined text-[16px]">arrow_back</span> Kembali ke Daftar PO
			</a>
			<h1 class="text-3xl font-extrabold text-on-surface tracking-tight mt-1">Buat Purchase Order</h1>
			<p class="text-on-surface-variant font-medium text-sm mt-1">Terbitkan pesanan pembelian (PO) ke Vendor.</p>
		</div>
		<div class="flex gap-3">
			<button onclick={() => history.back()} class="bg-surface-container-highest text-on-surface px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm hover:opacity-90 transition-opacity">
				Batal
			</button>
			<form method="POST" action="?/savePO" use:enhance={() => {
				formState.action = 'DRAFT';
				let btn = document.getElementById('btnSaveDraft');
				if(btn) { btn.innerHTML = 'Menyimpan...'; (btn as HTMLButtonElement).disabled = true; }
				return async ({ result }) => {
					if (result.type === 'success' && result.data?.success) {
						alert(result.data.message);
						window.location.href = '/pms/purchasing/orders';
					} else {
						alert(result.data?.message || 'Error occurred');
					}
					if(btn) { btn.innerHTML = '<span class="material-symbols-outlined text-lg">save</span> Simpan Draft'; (btn as HTMLButtonElement).disabled = false; }
				};
			}}>
				<input type="hidden" name="payload" value={JSON.stringify({ ...formState, subtotal, tax_amount: taxAmount, total_amount: grandTotal })} />
				<button id="btnSaveDraft" type="submit" disabled={!formState.vendor_id || !formState.items[0].item_id} class="bg-surface-container-high text-on-surface px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50">
					<span class="material-symbols-outlined text-lg">save</span> Simpan Draft
				</button>
			</form>
			<form method="POST" action="?/savePO" use:enhance={() => {
				const confirmPost = confirm("Apakah Anda yakin ingin mem-POST Purchase Order ini? PO yang di-post akan berstatus CONFIRMED.");
				if (!confirmPost) return ({ cancel }) => cancel();

				formState.action = 'CONFIRMED';
				let btn = document.getElementById('btnPost');
				if(btn) { btn.innerHTML = 'Memproses...'; (btn as HTMLButtonElement).disabled = true; }
				return async ({ result }) => {
					if (result.type === 'success' && result.data?.success) {
						alert(result.data.message);
						window.location.href = '/pms/purchasing/orders';
					} else {
						alert(result.data?.message || 'Error occurred');
					}
					if(btn) { btn.innerHTML = '<span class="material-symbols-outlined text-lg">check_circle</span> Confirm PO'; (btn as HTMLButtonElement).disabled = false; }
				};
			}}>
				<input type="hidden" name="payload" value={JSON.stringify({ ...formState, subtotal, tax_amount: taxAmount, total_amount: grandTotal })} />
				<button id="btnPost" type="submit" disabled={!formState.vendor_id || !formState.items[0].item_id} class="bg-primary text-on-primary px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50">
					<span class="material-symbols-outlined text-lg">check_circle</span> Confirm PO
				</button>
			</form>
		</div>
	</header>

	<div class="space-y-6">
		<!-- PR Integration Panel -->
		<div class="bg-indigo-50 border border-indigo-100 rounded-3xl p-6 flex flex-col md:flex-row gap-6 items-center">
			<div class="flex items-center gap-4 text-indigo-700 flex-1">
				<div class="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
					<span class="material-symbols-outlined text-2xl">assignment_returned</span>
				</div>
				<div>
					<h3 class="font-black text-sm uppercase tracking-wider mb-1">Tarik Data dari PR (Opsional)</h3>
					<p class="text-sm font-medium opacity-80">Pilih Purchase Request yang sudah di-Approve untuk mengisi rincian secara otomatis.</p>
				</div>
			</div>
			<div class="flex-1 w-full flex gap-3">
				<div class="flex-1">
					<SearchableSelect options={prOpts} bind:value={selectedPrId} placeholder="- Pilih PR -" />
				</div>
				<button type="button" onclick={pullPRData} disabled={!selectedPrId} class="bg-indigo-600 text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 shrink-0">
					Tarik Data
				</button>
			</div>
		</div>

		<!-- Header Form -->
		<div class="bg-surface-container-lowest rounded-3xl p-8 shadow-sm border border-surface-variant/20">
			<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
				<div class="space-y-5">
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Vendor (Supplier) <span class="text-error">*</span></label>
						<SearchableSelect options={vendorOpts} bind:value={formState.vendor_id} placeholder="-- Pilih Vendor --" />
					</div>
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Tanggal PO</label>
						<input type="date" bind:value={formState.date} class="w-full bg-surface-container rounded-xl px-4 py-2.5 text-sm font-medium border-none focus:ring-2 focus:ring-primary outline-none" />
					</div>
				</div>
				<div class="space-y-5">
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Catatan Tambahan</label>
						<textarea bind:value={formState.notes} rows="4" class="w-full bg-surface-container rounded-xl px-4 py-2.5 text-sm font-medium border-none focus:ring-2 focus:ring-primary outline-none" placeholder="Term of Payment, alamat pengiriman, dll..."></textarea>
					</div>
				</div>
			</div>
		</div>

		<!-- Lines Form -->
		<div class="bg-surface-container-lowest rounded-3xl shadow-sm border border-surface-variant/20 overflow-visible flex flex-col">
			<div class="p-6 border-b border-surface-container flex justify-between items-center bg-surface-container-low/30">
				<h2 class="text-lg font-bold text-secondary flex items-center gap-2">
					<span class="material-symbols-outlined">category</span> Rincian Pesanan
				</h2>
			</div>
			
			<div class="overflow-visible">
				<table class="w-full text-left">
					<thead class="bg-surface-container-low/50 border-b border-surface-container text-xs font-black uppercase text-on-surface-variant tracking-wider">
						<tr>
							<th class="p-4 w-12 text-center">No</th>
							<th class="p-4 min-w-[250px]">Barang / Item <span class="text-error">*</span></th>
							<th class="p-4 w-28">Qty</th>
							<th class="p-4 w-40">Harga Satuan</th>
							<th class="p-4 w-40">Pajak</th>
							<th class="p-4 w-32 text-right">Total</th>
							<th class="p-4 w-12"></th>
						</tr>
					</thead>
					<tbody class="divide-y divide-surface-container">
						{#each formState.items as item, i}
							<tr class="hover:bg-surface-container-low/20 transition-colors">
								<td class="p-4 text-center font-bold text-on-surface-variant">{i + 1}</td>
								<td class="p-4">
									<SearchableSelect options={itemOpts} bind:value={item.item_id} placeholder="- Pilih Barang -" />
								</td>
								<td class="p-4">
									<input type="number" bind:value={item.qty_ordered} oninput={() => updateLine(i)} class="w-full bg-surface-container rounded-lg px-3 py-2 text-sm font-medium border-none focus:ring-2 focus:ring-primary outline-none text-center" min="1" step="0.01" />
								</td>
								<td class="p-4">
									<input type="number" bind:value={item.unit_price} oninput={() => updateLine(i)} class="w-full bg-surface-container rounded-lg px-3 py-2 text-sm font-medium border-none focus:ring-2 focus:ring-primary outline-none text-right" min="0" />
								</td>
								<td class="p-4">
									<select bind:value={item.tax_id} onchange={() => updateLine(i)} class="w-full bg-surface-container rounded-lg px-3 py-2 text-sm font-medium border-none focus:ring-2 focus:ring-primary outline-none">
										<option value="">-- No Tax --</option>
										{#each taxOpts as t}
											<option value={t.value}>{t.label}</option>
										{/each}
									</select>
								</td>
								<td class="p-4 text-right font-black text-on-surface">
									{formatCurrency(item.total)}
								</td>
								<td class="p-4 text-center">
									<button type="button" onclick={() => removeItem(i)} disabled={formState.items.length === 1} class="w-8 h-8 rounded-full bg-surface-container hover:bg-rose-100 hover:text-rose-700 flex items-center justify-center transition-colors disabled:opacity-30">
										<span class="material-symbols-outlined text-[18px]">delete</span>
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			
			<div class="p-4 border-t border-surface-container bg-surface-container-lowest">
				<button type="button" onclick={addItem} class="text-sm font-bold text-primary hover:bg-primary/10 px-4 py-2 rounded-xl transition-colors inline-flex items-center gap-1">
					<span class="material-symbols-outlined text-[18px]">add_circle</span> Tambah Barang
				</button>
			</div>
		</div>

		<!-- Summary & Totals -->
		<div class="flex justify-end">
			<div class="w-full max-w-md bg-surface-container-lowest rounded-3xl p-8 shadow-sm border border-surface-variant/20 space-y-4">
				<div class="flex justify-between items-center text-on-surface-variant font-medium">
					<span>Subtotal</span>
					<span class="font-bold text-on-surface">{formatCurrency(subtotal)}</span>
				</div>
				<div class="flex justify-between items-center text-on-surface-variant font-medium">
					<span>Pajak (Tax)</span>
					<span class="font-bold text-on-surface">{formatCurrency(taxAmount)}</span>
				</div>
				<div class="pt-4 border-t border-surface-container flex justify-between items-center">
					<span class="text-lg font-black text-on-surface">Total Pesanan</span>
					<span class="text-2xl font-black text-primary">{formatCurrency(grandTotal)}</span>
				</div>
			</div>
		</div>
	</div>
</div>
