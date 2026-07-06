<script lang="ts">
	import { enhance } from '$app/forms';
	import SearchableSelect from '$lib/components/SearchableSelect.svelte';
	
	let { data } = $props();

	// Format Dropdown Options
	const itemOpts = data.items.map((i: any) => ({ 
		value: i.id, 
		label: `[${i.material_code}] ${i.name} ${i.part_no ? '('+i.part_no+')' : ''}` 
	}));

	let formState = $state({
		date: new Date().toISOString().split('T')[0],
		department: 'Maintenance / Workshop',
		requested_by: '',
		notes: '',
		action: 'DRAFT', // or APPROVED
		items: [
			{ id: crypto.randomUUID(), item_id: '', qty_requested: 1, remarks: '' }
		]
	});

	function addItem() {
		formState.items.push({ id: crypto.randomUUID(), item_id: '', qty_requested: 1, remarks: '' });
	}

	function removeItem(index: number) {
		if (formState.items.length > 1) {
			formState.items.splice(index, 1);
		}
	}
</script>

<svelte:head>
	<title>Create Purchase Request | PMS</title>
</svelte:head>

<div class="w-full px-4 sm:px-6 lg:px-8 py-6">
	<!-- Header -->
	<header class="mb-8 flex justify-between items-end">
		<div>
			<a href="/pms/purchasing/requests" class="text-sm text-primary hover:underline font-bold mb-2 inline-flex items-center gap-1">
				<span class="material-symbols-outlined text-[16px]">arrow_back</span> Kembali ke Daftar PR
			</a>
			<h1 class="text-3xl font-extrabold text-on-surface tracking-tight mt-1">Buat Purchase Request</h1>
			<p class="text-on-surface-variant font-medium text-sm mt-1">Permintaan pembelian barang/sparepart internal.</p>
		</div>
		<div class="flex gap-3">
			<button onclick={() => history.back()} class="bg-surface-container-highest text-on-surface px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm hover:opacity-90 transition-opacity">
				Batal
			</button>
			<form method="POST" action="?/savePR" use:enhance={() => {
				formState.action = 'DRAFT';
				let btn = document.getElementById('btnSaveDraft');
				if(btn) { btn.innerHTML = 'Menyimpan...'; (btn as HTMLButtonElement).disabled = true; }
				return async ({ result }) => {
					if (result.type === 'success' && result.data?.success) {
						alert(result.data.message);
						window.location.href = '/pms/purchasing/requests';
					} else {
						alert(result.data?.message || 'Error occurred');
					}
					if(btn) { btn.innerHTML = '<span class="material-symbols-outlined text-lg">save</span> Simpan Draft'; (btn as HTMLButtonElement).disabled = false; }
				};
			}}>
				<input type="hidden" name="payload" value={JSON.stringify(formState)} />
				<button id="btnSaveDraft" type="submit" disabled={!formState.requested_by || !formState.items[0].item_id} class="bg-surface-container-high text-on-surface px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50">
					<span class="material-symbols-outlined text-lg">save</span> Simpan Draft
				</button>
			</form>
			<form method="POST" action="?/savePR" use:enhance={() => {
				const confirmPost = confirm("Apakah Anda yakin ingin menyetujui dan mem-POST permintaan ini? Dokumen PR yang diapprove akan diteruskan ke tim Purchasing (PO).");
				if (!confirmPost) return ({ cancel }) => cancel();

				formState.action = 'APPROVED';
				let btn = document.getElementById('btnApprove');
				if(btn) { btn.innerHTML = 'Memproses...'; (btn as HTMLButtonElement).disabled = true; }
				return async ({ result }) => {
					if (result.type === 'success' && result.data?.success) {
						alert(result.data.message);
						window.location.href = '/pms/purchasing/requests';
					} else {
						alert(result.data?.message || 'Error occurred');
					}
					if(btn) { btn.innerHTML = '<span class="material-symbols-outlined text-lg">check_circle</span> Setujui & Post'; (btn as HTMLButtonElement).disabled = false; }
				};
			}}>
				<input type="hidden" name="payload" value={JSON.stringify(formState)} />
				<button id="btnApprove" type="submit" disabled={!formState.requested_by || !formState.items[0].item_id} class="bg-primary text-on-primary px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50">
					<span class="material-symbols-outlined text-lg">check_circle</span> Setujui & Post
				</button>
			</form>
		</div>
	</header>

	<div class="space-y-6">
		<!-- Header Form -->
		<div class="bg-surface-container-lowest rounded-3xl p-8 shadow-sm border border-surface-variant/20">
			<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
				<div class="space-y-5">
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Tanggal Permintaan</label>
						<input type="date" bind:value={formState.date} class="w-full bg-surface-container rounded-xl px-4 py-2.5 text-sm font-medium border-none focus:ring-2 focus:ring-primary outline-none" />
					</div>
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Diminta Oleh (Pemohon) <span class="text-error">*</span></label>
						<input type="text" bind:value={formState.requested_by} class="w-full bg-surface-container rounded-xl px-4 py-2.5 text-sm font-medium border-none focus:ring-2 focus:ring-primary outline-none" placeholder="Nama mekanik / admin..." />
					</div>
				</div>
				<div class="space-y-5">
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Departemen / Divisi</label>
						<input type="text" bind:value={formState.department} class="w-full bg-surface-container rounded-xl px-4 py-2.5 text-sm font-medium border-none focus:ring-2 focus:ring-primary outline-none" placeholder="Misal: Workshop, Finance, dll" />
					</div>
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Catatan / Alasan Permintaan</label>
						<textarea bind:value={formState.notes} rows="2" class="w-full bg-surface-container rounded-xl px-4 py-2.5 text-sm font-medium border-none focus:ring-2 focus:ring-primary outline-none" placeholder="Opsional..."></textarea>
					</div>
				</div>
			</div>
		</div>

		<!-- Lines Form -->
		<div class="bg-surface-container-lowest rounded-3xl shadow-sm border border-surface-variant/20 overflow-visible flex flex-col">
			<div class="p-6 border-b border-surface-container flex justify-between items-center bg-surface-container-low/30">
				<h2 class="text-lg font-bold text-secondary flex items-center gap-2">
					<span class="material-symbols-outlined">category</span> Rincian Barang Diminta
				</h2>
			</div>
			
			<div class="overflow-visible">
				<table class="w-full text-left">
					<thead class="bg-surface-container-low/50 border-b border-surface-container text-xs font-black uppercase text-on-surface-variant tracking-wider">
						<tr>
							<th class="p-4 w-12 text-center">No</th>
							<th class="p-4 min-w-[300px]">Barang / Item <span class="text-error">*</span></th>
							<th class="p-4 w-32">Qty Diminta</th>
							<th class="p-4 min-w-[200px]">Keterangan</th>
							<th class="p-4 w-12"></th>
						</tr>
					</thead>
					<tbody class="divide-y divide-surface-container">
						{#each formState.items as item, i}
							<tr class="hover:bg-surface-container-low/20 transition-colors">
								<td class="p-4 text-center font-bold text-on-surface-variant">{i + 1}</td>
								<td class="p-4">
									<SearchableSelect options={itemOpts} bind:value={item.item_id} placeholder="- Cari Barang -" />
								</td>
								<td class="p-4">
									<input type="number" bind:value={item.qty_requested} class="w-full bg-surface-container rounded-lg px-3 py-2 text-sm font-medium border-none focus:ring-2 focus:ring-primary outline-none text-center" min="1" step="0.01" />
								</td>
								<td class="p-4">
									<input type="text" bind:value={item.remarks} class="w-full bg-surface-container rounded-lg px-3 py-2 text-sm font-medium border-none focus:ring-2 focus:ring-primary outline-none" placeholder="Mendesak, dll..." />
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
