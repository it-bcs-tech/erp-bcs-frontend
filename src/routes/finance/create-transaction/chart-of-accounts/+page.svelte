<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();
	let showModal = $state(false);
	let searchQuery = $state('');

	let filteredAccounts = $derived.by(() => {
		let list = data.accounts || [];
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			list = list.filter((a: any) =>
				(a.code && a.code.toLowerCase().includes(q)) ||
				(a.name && a.name.toLowerCase().includes(q)) ||
				(a.account_type && a.account_type.toLowerCase().includes(q))
			);
		}
		return list;
	});
</script>

<svelte:head>
	<title>Bagan Akun (Chart of Accounts) | Finance ERP</title>
</svelte:head>

<div class="flex flex-col h-full space-y-6">
	<!-- Header -->
	<header class="flex flex-col md:flex-row md:items-end justify-between gap-4 flex-shrink-0">
		<div>
			<div class="flex items-center gap-2.5">
				<a href="/finance/create-transaction" class="p-1 rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-colors">
					<span class="material-symbols-outlined text-lg">arrow_back</span>
				</a>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Bagan Akun (Chart of Accounts)</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-sm mt-0.5 ml-8">
				Struktur klasifikasi akun buku besar untuk pencatatan aktiva, kewajiban, ekuitas, pendapatan, dan beban
			</p>
		</div>
		<div class="flex gap-3">
			<button
				type="button"
				onclick={() => showModal = true}
				class="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
			>
				<span class="material-symbols-outlined text-lg">add</span>
				<span>Tambah Akun COA</span>
			</button>
		</div>
	</header>

	{#if form?.message}
		<div class="p-4 rounded-xl text-xs font-bold {form.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}">
			{form.message}
		</div>
	{/if}

	<!-- Search Bar -->
	<div class="p-4 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex items-center justify-between gap-4">
		<div class="relative flex-1 max-w-md">
			<span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Cari kode akun, nama, atau tipe..."
				class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl py-2 pl-10 pr-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/40"
			/>
		</div>
		<span class="text-xs font-medium text-on-surface-variant">
			Total: <strong class="text-on-surface">{filteredAccounts.length}</strong> Akun COA
		</span>
	</div>

	<!-- Table Container -->
	<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs flex-1 flex flex-col">
		<div class="overflow-x-auto flex-1">
			<table class="w-full text-left text-sm min-w-[800px]">
				<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
					<tr>
						<th class="py-3.5 px-5 w-36">Kode Akun</th>
						<th class="py-3.5 px-5">Nama Akun</th>
						<th class="py-3.5 px-5">Tipe Klasifikasi</th>
						<th class="py-3.5 px-5">Deskripsi</th>
						<th class="py-3.5 px-5 text-center">Status</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60 font-medium text-xs">
					{#if filteredAccounts.length === 0}
						<tr>
							<td colspan="5" class="py-16 text-center text-on-surface-variant">
								<span class="material-symbols-outlined text-4xl text-on-surface-variant/40 block mb-2">account_tree</span>
								<p class="font-bold text-on-surface">Belum ada data Akun COA yang cocok.</p>
							</td>
						</tr>
					{:else}
						{#each filteredAccounts as acc}
							<tr class="hover:bg-surface-container-high/40 transition-colors">
								<td class="py-3.5 px-5 font-mono font-bold text-amber-700 dark:text-amber-300">{acc.code}</td>
								<td class="py-3.5 px-5 font-bold text-on-surface">{acc.name}</td>
								<td class="py-3.5 px-5">
									<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700">
										{acc.account_type || 'GENERAL'}
									</span>
								</td>
								<td class="py-3.5 px-5 text-on-surface-variant">{acc.description || '-'}</td>
								<td class="py-3.5 px-5 text-center">
									<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border {acc.is_active ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}">
										{acc.is_active ? 'Aktif' : 'Non-Aktif'}
									</span>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>

<!-- Modal Tambah Akun COA -->
{#if showModal}
	<div class="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
		<div class="bg-surface-container-lowest rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
			<div class="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-amber-600">account_tree</span>
					<h3 class="text-base font-extrabold text-on-surface">Tambah Akun COA Baru</h3>
				</div>
				<button type="button" onclick={() => showModal = false} class="text-on-surface-variant hover:text-on-surface">
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>

			<form method="POST" action="?/saveAccount" use:enhance={() => {
				return async ({ update }) => {
					showModal = false;
					await update();
				};
			}}>
				<div class="p-6 space-y-4 text-xs">
					<div>
						<label class="block font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Kode Akun <span class="text-rose-500">*</span>
						</label>
						<input
							type="text"
							name="code"
							required
							placeholder="Misal: 1101-01"
							class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl p-2.5 font-mono font-bold focus:ring-2 focus:ring-amber-500 outline-none uppercase"
						/>
					</div>

					<div>
						<label class="block font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Nama Akun <span class="text-rose-500">*</span>
						</label>
						<input
							type="text"
							name="name"
							required
							placeholder="Misal: Kas Kecil Pool Cilegon"
							class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl p-2.5 font-bold focus:ring-2 focus:ring-amber-500 outline-none"
						/>
					</div>

					<div>
						<label class="block font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Tipe Klasifikasi <span class="text-rose-500">*</span>
						</label>
						<select
							name="account_type"
							required
							class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl p-2.5 font-bold focus:ring-2 focus:ring-amber-500 outline-none"
						>
							<option value="ASSET">ASSET (Aktiva / Harta)</option>
							<option value="LIABILITY">LIABILITY (Kewajiban / Hutang)</option>
							<option value="EQUITY">EQUITY (Modal / Ekuitas)</option>
							<option value="INCOME">INCOME (Pendapatan Usaha)</option>
							<option value="EXPENSE">EXPENSE (Beban Operasional)</option>
						</select>
					</div>

					<div>
						<label class="block font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
							Deskripsi Akun
						</label>
						<textarea
							name="description"
							rows="2"
							placeholder="Penjelasan fungsi akun..."
							class="w-full bg-surface border border-slate-200 dark:border-slate-700 text-on-surface rounded-xl p-2.5 focus:ring-2 focus:ring-amber-500 outline-none resize-none"
						></textarea>
					</div>
				</div>

				<div class="p-4 border-t border-slate-200 dark:border-slate-800 bg-surface-container-low flex justify-end gap-3">
					<button
						type="button"
						onclick={() => showModal = false}
						class="px-4 py-2 bg-surface-container border border-slate-200 dark:border-slate-700 text-xs font-bold text-on-surface rounded-xl hover:bg-surface-container-high transition-colors"
					>
						Batal
					</button>
					<button
						type="submit"
						class="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-xs font-bold text-white rounded-xl shadow-xs transition-colors"
					>
						Simpan Akun
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
