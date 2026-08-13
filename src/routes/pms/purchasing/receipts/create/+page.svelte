<script lang="ts">
	import { enhance } from '$app/forms';
	import SearchableSelect from '$lib/components/SearchableSelect.svelte';
	
	let { data } = $props();

	// Format Dropdown Options
	const itemOpts = data.items.map((i: any) => ({ 
		value: i.id, 
		label: `[${i.material_code}] ${i.name} ${i.part_no ? '('+i.part_no+')' : ''}` 
	}));
	const poOpts = data.confirmedPos.map((po: any) => ({
		value: po.id.toString(),
		label: `${po.po_number} - ${po.vendor_name || 'Tanpa Vendor'}`
	}));

	let formState = $state({
		po_id: '',
		date: new Date().toISOString().split('T')[0],
		vendor_delivery_number: '',
		notes: '',
		created_by: data.userName,
		action: 'DRAFT', // or DONE
		items: [
			{ id: crypto.randomUUID(), po_line_id: '', item_id: '', qty_received: 1 }
		]
	});

	function addItem() {
		formState.items.push({ id: crypto.randomUUID(), po_line_id: '', item_id: '', qty_received: 1 });
	}

	function removeItem(index: number) {
		if (formState.items.length > 1) {
			formState.items.splice(index, 1);
		}
	}

	// Pull PO Data
	async function pullPOData() {
		if (!formState.po_id) return;

		try {
			const res = await fetch(`/api/pms/purchasing/orders/${formState.po_id}`);
			if (!res.ok) throw new Error('Gagal menarik data PO');
			
			const json = await res.json();
			if (json.success && json.data) {
				formState.items = json.data.map((poLine: any) => ({
					id: crypto.randomUUID(),
					po_line_id: poLine.po_line_id,
					item_id: poLine.item_id,
					qty_received: Number(poLine.qty_ordered) // default received = ordered
				}));
				alert('Berhasil menarik data Purchase Order!');
			} else {
				throw new Error(json.message || 'Gagal menarik data PO');
			}
		} catch (e: any) {
			alert(e.message);
		}
	}
</script>

<svelte:head>
	<title>Create Goods Receipt | PMS</title>
</svelte:head>

<div class="w-full px-4 sm:px-6 lg:px-8 py-6">
	<!-- Header -->
	<header class="mb-8 flex justify-between items-end">
		<div>
			<a href="/pms/purchasing/receipts" class="text-sm text-primary hover:underline font-bold mb-2 inline-flex items-center gap-1">
				<span class="material-symbols-outlined text-[16px]">arrow_back</span> Kembali ke Daftar GR
			</a>
			<h1 class="text-3xl font-extrabold text-on-surface tracking-tight mt-1">Penerimaan Barang (GR)</h1>
			<p class="text-on-surface-variant font-medium text-sm mt-1">Catat fisik barang yang masuk dari Vendor ke gudang.</p>
		</div>
		<div class="flex gap-3">
			<button onclick={() => history.back()} class="bg-surface-container-highest text-on-surface px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm hover:opacity-90 transition-opacity">
				Batal
			</button>
			<form method="POST" action="?/saveGR" use:enhance={() => {
				formState.action = 'DRAFT';
				let btn = document.getElementById('btnSaveDraft');
				if(btn) { btn.innerHTML = 'Menyimpan...'; (btn as HTMLButtonElement).disabled = true; }
				return async ({ result }) => {
					if (result.type === 'success' && result.data?.success) {
						alert(result.data.message);
						window.location.href = '/pms/purchasing/receipts';
					} else {
						alert(result.data?.message || 'Error occurred');
					}
					if(btn) { btn.innerHTML = '<span class="material-symbols-outlined text-lg">save</span> Simpan Draft'; (btn as HTMLButtonElement).disabled = false; }
				};
			}}>
				<input type="hidden" name="payload" value={JSON.stringify(formState)} />
				<button id="btnSaveDraft" type="submit" disabled={!formState.items[0].item_id} class="bg-surface-container-high text-on-surface px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50">
					<span class="material-symbols-outlined text-lg">save</span> Simpan Draft
				</button>
			</form>
			<form method="POST" action="?/saveGR" use:enhance={() => {
				const confirmPost = confirm("Apakah Anda yakin ingin mem-POST Penerimaan Barang ini? STOK GUDANG AKAN BERTAMBAH dan data tidak bisa dihapus.");
				if (!confirmPost) return ({ cancel }) => cancel();

				formState.action = 'DONE';
				let btn = document.getElementById('btnPost');
				if(btn) { btn.innerHTML = 'Memproses...'; (btn as HTMLButtonElement).disabled = true; }
				return async ({ result }) => {
					if (result.type === 'success' && result.data?.success) {
						alert(result.data.message);
						window.location.href = '/pms/purchasing/receipts';
					} else {
						alert(result.data?.message || 'Error occurred');
					}
					if(btn) { btn.innerHTML = '<span class="material-symbols-outlined text-lg">check_circle</span> Terima Barang'; (btn as HTMLButtonElement).disabled = false; }
				};
			}}>
				<input type="hidden" name="payload" value={JSON.stringify(formState)} />
				<button id="btnPost" type="submit" disabled={!formState.items[0].item_id} class="bg-primary text-on-primary px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50">
					<span class="material-symbols-outlined text-lg">check_circle</span> Terima Barang
				</button>
			</form>
		</div>
	</header>

	<div class="space-y-6">
		<!-- PO Integration Panel -->
		<div class="bg-amber-50 border border-amber-100 rounded-3xl p-6 flex flex-col md:flex-row gap-6 items-center">
			<div class="flex items-center gap-4 text-amber-700 flex-1">
				<div class="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
					<span class="material-symbols-outlined text-2xl">local_shipping</span>
				</div>
				<div>
					<h3 class="font-black text-sm uppercase tracking-wider mb-1">Tarik Data dari PO (Opsional)</h3>
					<p class="text-sm font-medium opacity-80">Pilih Purchase Order yang dikirim oleh vendor untuk menyesuaikan barang pesanan.</p>
				</div>
			</div>
			<div class="flex-1 w-full flex gap-3">
				<div class="flex-1">
					<SearchableSelect options={poOpts} bind:value={formState.po_id} placeholder="- Pilih PO -" />
				</div>
				<button type="button" onclick={pullPOData} disabled={!formState.po_id} class="bg-amber-600 text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-amber-700 transition-colors disabled:opacity-50 shrink-0">
					Tarik Data
				</button>
			</div>
		</div>

		<!-- Header Form -->
		<div class="bg-surface-container-lowest rounded-3xl p-8 shadow-sm border border-surface-variant/20">
			<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
				<div class="space-y-5">
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Tanggal Terima</label>
						<input type="date" bind:value={formState.date} class="w-full bg-surface-container rounded-xl px-4 py-2.5 text-sm font-medium border-none focus:ring-2 focus:ring-primary outline-none" />
					</div>
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">No. Surat Jalan Vendor <span class="text-error">*</span></label>
						<input type="text" bind:value={formState.vendor_delivery_number} class="w-full bg-surface-container rounded-xl px-4 py-2.5 text-sm font-medium border-none focus:ring-2 focus:ring-primary outline-none" placeholder="Misal: SJ-2026/001" />
					</div>
				</div>
				<div class="space-y-5">
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Penerima (Admin Gudang) <span class="text-error">*</span></label>
						<input type="text" bind:value={formState.created_by} readonly class="w-full bg-surface-container-high rounded-xl px-4 py-2.5 text-sm font-medium border-none focus:ring-2 focus:ring-primary outline-none cursor-not-allowed" />
					</div>
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Catatan Tambahan</label>
						<textarea bind:value={formState.notes} rows="2" class="w-full bg-surface-container rounded-xl px-4 py-2.5 text-sm font-medium border-none focus:ring-2 focus:ring-primary outline-none" placeholder="Kondisi barang, kekurangan pengiriman, dll..."></textarea>
					</div>
				</div>
			</div>
		</div>

		<!-- Lines Form -->
		<div class="bg-surface-container-lowest rounded-3xl shadow-sm border border-surface-variant/20 overflow-visible flex flex-col">
			<div class="p-6 border-b border-surface-container flex justify-between items-center bg-surface-container-low/30">
				<h2 class="text-lg font-bold text-secondary flex items-center gap-2">
					<span class="material-symbols-outlined">inventory_2</span> Rincian Barang Masuk
				</h2>
			</div>
			
			<div class="overflow-visible">
				<table class="w-full text-left">
					<thead class="bg-surface-container-low/50 border-b border-surface-container text-xs font-black uppercase text-on-surface-variant tracking-wider">
						<tr>
							<th class="p-4 w-12 text-center">No</th>
							<th class="p-4 min-w-[300px]">Barang / Item <span class="text-error">*</span></th>
							<th class="p-4 w-40">Qty Diterima</th>
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
									<input type="number" bind:value={item.qty_received} class="w-full bg-surface-container rounded-lg px-3 py-2 text-sm font-medium border-none focus:ring-2 focus:ring-primary outline-none text-center" min="1" step="0.01" />
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
	</div>
</div>
