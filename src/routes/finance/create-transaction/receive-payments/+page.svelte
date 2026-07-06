<script lang="ts">
	import { enhance } from '$app/forms';
	import SearchableSelect from '$lib/components/SearchableSelect.svelte';

	let { data } = $props();
	const { customers, accounts } = data;

	const customerOpts = customers.map((c: any) => ({ value: c.id, label: `${c.code} - ${c.name}` }));
	const accountOpts = accounts.map((a: any) => ({ value: a.id, label: `${a.code} - ${a.name}` }));

	let formState = $state({
		partner_id: '',
		date: new Date().toISOString().split('T')[0],
		account_id: '',
		amount: 0,
		reference: '',
		notes: '',
		allocations: [] as any[]
	});

	let isFetchingInvoices = $state(false);

	// Fetch invoices when customer changes
	let lastCustomer = $state('');
	$effect(() => {
		if (formState.partner_id && formState.partner_id !== lastCustomer) {
			lastCustomer = formState.partner_id;
			fetchOutstandingInvoices(formState.partner_id);
		} else if (!formState.partner_id && lastCustomer) {
			lastCustomer = '';
			formState.allocations = [];
		}
	});

	async function fetchOutstandingInvoices(customerId: string) {
		isFetchingInvoices = true;
		try {
			const res = await fetch(`/api/finance/outstanding-invoices/${customerId}`);
			const json = await res.json();
			if (json.success) {
				formState.allocations = json.data.map((inv: any) => ({
					invoice_id: inv.id,
					invoice_number: inv.invoice_number,
					date: inv.date,
					due_date: inv.due_date,
					total_amount: Number(inv.total_amount),
					due_amount: Number(inv.due_amount),
					payment_amount: 0
				}));
			} else {
				alert(json.message);
				formState.allocations = [];
			}
		} catch (e) {
			console.error(e);
			formState.allocations = [];
		} finally {
			isFetchingInvoices = false;
		}
	}

	const totalAllocated = $derived(
		formState.allocations.reduce((sum, alloc) => sum + (Number(alloc.payment_amount) || 0), 0)
	);

	const unallocated = $derived(
		Number(formState.amount) - totalAllocated
	);

	function autoAllocate() {
		let remaining = Number(formState.amount);
		
		for (let i = 0; i < formState.allocations.length; i++) {
			const alloc = formState.allocations[i];
			if (remaining > 0) {
				if (remaining >= alloc.due_amount) {
					alloc.payment_amount = alloc.due_amount;
					remaining -= alloc.due_amount;
				} else {
					alloc.payment_amount = remaining;
					remaining = 0;
				}
			} else {
				alloc.payment_amount = 0;
			}
		}
	}

	const formatCurrency = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
	const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' }) : '-';
</script>

<svelte:head>
	<title>Receive Payment | Finance ERP</title>
</svelte:head>

<div class="w-full px-4 sm:px-6 lg:px-8 py-6">
	<!-- Page Header -->
	<header class="mb-8 flex justify-between items-end">
		<div>
			<a href="/finance/create-transaction" class="text-sm text-primary hover:underline font-bold mb-2 inline-flex items-center gap-1">
				<span class="material-symbols-outlined text-[16px]">arrow_back</span> Back to Hub
			</a>
			<h1 class="text-3xl font-extrabold text-on-surface tracking-tight mt-1">Receive Payment</h1>
			<p class="text-on-surface-variant font-medium text-sm mt-1">Catat penerimaan pembayaran dan alokasikan ke tagihan Kustomer.</p>
		</div>
		<div class="flex gap-3">
			<button onclick={() => history.back()} class="bg-surface-container-highest text-on-surface px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm hover:opacity-90 transition-opacity">
				Batal
			</button>
			<form method="POST" action="?/savePayment" use:enhance={() => {
				if (unallocated < 0) {
					alert("Total alokasi melebihi jumlah uang yang diterima!");
					return ({ cancel }) => cancel();
				}
				if (totalAllocated === 0) {
					alert("Anda belum mengalokasikan pembayaran ke invoice mana pun.");
					return ({ cancel }) => cancel();
				}

				let btn = document.getElementById('btnSave');
				if(btn) { btn.innerHTML = 'Menyimpan...'; (btn as HTMLButtonElement).disabled = true; }
				return async ({ result }) => {
					if (result.type === 'success' && result.data?.success) {
						alert(result.data.message);
						window.location.href = '/finance/invoices'; // Redirect to invoices list for now
					} else {
						alert(result.data?.message || 'Error occurred');
					}
					if(btn) { btn.innerHTML = '<span class="material-symbols-outlined text-lg">save</span> Simpan Pembayaran'; (btn as HTMLButtonElement).disabled = false; }
				};
			}}>
				<input type="hidden" name="payload" value={JSON.stringify(formState)} />
				<button id="btnSave" type="submit" class="bg-primary text-on-primary px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm hover:opacity-90 transition-opacity" disabled={!formState.partner_id || !formState.account_id || totalAllocated === 0 || unallocated < 0}>
					<span class="material-symbols-outlined text-lg">save</span>
					Simpan Pembayaran
				</button>
			</form>
		</div>
	</header>

	<div class="space-y-6">
		<!-- Payment Info -->
		<div class="bg-surface-container-lowest rounded-3xl p-8 shadow-sm border border-surface-variant/20">
				<h2 class="text-lg font-bold text-primary mb-4 flex items-center gap-2">
					<span class="material-symbols-outlined">payments</span> Informasi Pembayaran
				</h2>
				
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Kustomer <span class="text-error">*</span></label>
						<SearchableSelect 
							options={customerOpts} 
							bind:value={formState.partner_id} 
							placeholder="-- Pilih Kustomer --" 
						/>
					</div>
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Jumlah Diterima (Amount) <span class="text-error">*</span></label>
						<div class="relative">
							<span class="absolute left-4 top-2.5 font-bold text-on-surface-variant">Rp</span>
							<input type="number" bind:value={formState.amount} min="0" class="w-full bg-surface-container rounded-xl pl-12 pr-4 py-2.5 text-lg font-black border-none focus:ring-2 focus:ring-primary outline-none text-emerald-700 dark:text-emerald-400" />
						</div>
					</div>
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Tanggal Pembayaran <span class="text-error">*</span></label>
						<input type="date" bind:value={formState.date} class="w-full bg-surface-container rounded-xl px-4 py-2.5 text-sm font-medium border-none focus:ring-2 focus:ring-primary outline-none" />
					</div>
					
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Simpan Ke (Akun Kas/Bank) <span class="text-error">*</span></label>
						<SearchableSelect 
							options={accountOpts} 
							bind:value={formState.account_id} 
							placeholder="-- Pilih Rekening Penerima --" 
						/>
					</div>
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Nomor Referensi (Transfer/Cek)</label>
						<input type="text" bind:value={formState.reference} class="w-full bg-surface-container rounded-xl px-4 py-2.5 text-sm font-medium border-none focus:ring-2 focus:ring-primary outline-none" placeholder="Contoh: TF BCA 12345" />
					</div>
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Catatan</label>
						<input type="text" bind:value={formState.notes} class="w-full bg-surface-container rounded-xl px-4 py-2.5 text-sm font-medium border-none focus:ring-2 focus:ring-primary outline-none" placeholder="Keterangan tambahan..." />
					</div>
				</div>
			</div>

			<!-- Outstanding Invoices Table -->
			<div class="bg-surface-container-lowest rounded-3xl p-8 shadow-sm border border-surface-variant/20">
				<div class="flex items-center justify-between mb-4">
					<h2 class="text-lg font-bold text-secondary flex items-center gap-2">
						<span class="material-symbols-outlined">receipt_long</span> Outstanding Invoices
					</h2>
					<div class="flex items-center gap-4">
						<div class="flex flex-col text-right">
							<span class="text-xs font-bold uppercase text-on-surface-variant">Sisa Belum Dialokasi</span>
							<span class="text-lg font-black {unallocated < 0 ? 'text-rose-600' : (unallocated === 0 ? 'text-emerald-600' : 'text-amber-600')}">
								{formatCurrency(unallocated)}
							</span>
						</div>
						<button onclick={autoAllocate} disabled={formState.amount <= 0 || formState.allocations.length === 0} class="bg-secondary text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-secondary/90 transition-colors disabled:opacity-50 flex items-center gap-2">
							<span class="material-symbols-outlined text-[16px]">auto_awesome</span>
							Auto-Allocate
						</button>
					</div>
				</div>

				{#if !formState.partner_id}
					<div class="p-8 text-center text-on-surface-variant bg-surface-container/30 rounded-2xl border-2 border-dashed border-surface-variant/30">
						Pilih kustomer terlebih dahulu untuk melihat daftar tagihan yang belum lunas.
					</div>
				{:else if isFetchingInvoices}
					<div class="p-8 flex flex-col items-center justify-center text-on-surface-variant">
						<span class="material-symbols-outlined animate-spin text-3xl mb-2">sync</span>
						<p class="font-bold">Mencari tagihan...</p>
					</div>
				{:else if formState.allocations.length === 0}
					<div class="p-8 text-center text-emerald-600 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border-2 border-dashed border-emerald-200 dark:border-emerald-800">
						<span class="material-symbols-outlined text-4xl mb-2">check_circle</span>
						<p class="font-bold">Hore! Kustomer ini tidak memiliki tagihan yang belum dibayar.</p>
					</div>
				{:else}
					<div class="border border-surface-container rounded-2xl overflow-hidden">
						<table class="w-full text-left">
							<thead class="bg-surface-container-low/50 border-b border-surface-container text-xs font-black uppercase text-on-surface-variant tracking-wider">
								<tr>
									<th class="p-4">Deskripsi Invoice</th>
									<th class="p-4">Jatuh Tempo</th>
									<th class="p-4 text-right">Total Tagihan</th>
									<th class="p-4 text-right">Sisa Tagihan</th>
									<th class="p-4 text-right w-48">Jumlah Pembayaran</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-surface-container">
								{#each formState.allocations as alloc}
									<tr class="hover:bg-surface-container-lowest transition-colors">
										<td class="p-4">
											<div class="font-bold text-sm text-on-surface">{alloc.invoice_number}</div>
											<div class="text-xs text-on-surface-variant mt-0.5">{formatDate(alloc.date)}</div>
										</td>
										<td class="p-4">
											<div class="text-sm font-medium {new Date(alloc.due_date) < new Date() ? 'text-rose-600 font-bold' : 'text-on-surface-variant'}">
												{formatDate(alloc.due_date)}
											</div>
										</td>
										<td class="p-4 text-sm font-bold text-on-surface-variant text-right">
											{formatCurrency(alloc.total_amount)}
										</td>
										<td class="p-4 text-sm font-black text-rose-600 dark:text-rose-400 text-right">
											{formatCurrency(alloc.due_amount)}
										</td>
										<td class="p-4 text-right">
											<div class="relative inline-block w-full">
												<span class="absolute left-3 top-2.5 text-xs font-bold text-on-surface-variant">Rp</span>
												<input type="number" bind:value={alloc.payment_amount} min="0" max={alloc.due_amount} class="w-full bg-white dark:bg-slate-900 border border-surface-container rounded-xl pl-8 pr-3 py-2 text-base font-bold focus:outline-none focus:ring-2 focus:ring-primary text-right" />
											</div>
										</td>
									</tr>
								{/each}
							</tbody>
							<tfoot class="bg-surface-container-low/50 border-t-2 border-surface-container font-black text-sm text-on-surface">
								<tr>
									<td colspan="4" class="p-4 text-right uppercase tracking-wider text-xs">Total Alokasi</td>
									<td class="p-4 text-right text-lg text-emerald-600 dark:text-emerald-400">
										{formatCurrency(totalAllocated)}
									</td>
								</tr>
							</tfoot>
						</table>
					</div>
				{/if}
			</div>
		</div>
	</div>
