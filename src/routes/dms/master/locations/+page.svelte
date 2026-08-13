<script lang="ts">
	import { enhance } from '$app/forms';

	let { data } = $props();
	let isSubmitting = $state(false);
	let isModalOpen = $state(false);
</script>

<svelte:head>
	<title>Filing Locations | DMS | ERP BCS</title>
</svelte:head>

<div class="px-6 py-8 w-full max-w-5xl mx-auto">
	<header class="mb-8 flex justify-between items-end">
		<div>
			<h1 class="text-3xl font-extrabold text-on-surface tracking-tight">Filing Locations</h1>
			<p class="text-sm font-medium text-on-surface-variant mt-1">Manage physical archiving locations (Brankas, Lemari, etc).</p>
		</div>
		<button onclick={() => isModalOpen = true} class="bg-primary text-on-primary px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm hover:opacity-90 transition-opacity">
			<span class="material-symbols-outlined text-[18px]">add</span>
			Add Location
		</button>
	</header>

	<div class="bg-surface-container-lowest border border-surface-variant/20 rounded-3xl overflow-hidden shadow-sm">
		<table class="w-full text-left border-collapse">
			<thead>
				<tr class="bg-surface-container-low text-on-surface-variant text-xs uppercase tracking-wider font-bold border-b border-surface-variant/20">
					<th class="p-4">Code</th>
					<th class="p-4">Name</th>
					<th class="p-4">Description</th>
					<th class="p-4 text-center">Status</th>
				</tr>
			</thead>
			<tbody class="text-sm font-medium divide-y divide-surface-variant/10">
				{#each data.locations as loc}
					<tr class="hover:bg-surface-container-low/50 transition-colors">
						<td class="p-4 font-bold text-primary">{loc.code}</td>
						<td class="p-4 text-on-surface">{loc.name}</td>
						<td class="p-4 text-on-surface-variant">{loc.description || '-'}</td>
						<td class="p-4 text-center">
							<span class="px-3 py-1 rounded-full text-xs font-extrabold tracking-wider border {loc.is_active ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200'}">
								{loc.is_active ? 'ACTIVE' : 'INACTIVE'}
							</span>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

{#if isModalOpen}
	<div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
		<div class="bg-surface-container-lowest rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
			<div class="p-6 border-b border-surface-variant/20 flex justify-between items-center">
				<h3 class="text-lg font-bold text-on-surface">Add Filing Location</h3>
				<button onclick={() => isModalOpen = false} class="text-on-surface-variant hover:text-on-surface">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>
			<form method="POST" action="?/save" use:enhance={() => {
				isSubmitting = true;
				return async ({ result, update }) => {
					if (result.type === 'success' && result.data?.success) {
						isModalOpen = false;
						update();
					} else {
						alert(result.data?.message || 'Error occurred');
					}
					isSubmitting = false;
				};
			}}>
				<div class="p-6 space-y-4">
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Code <span class="text-error">*</span></label>
						<input type="text" name="code" required class="w-full bg-surface-container rounded-xl px-4 py-2.5 text-sm font-medium border-none focus:ring-2 focus:ring-primary outline-none" placeholder="e.g. BRK-01" />
					</div>
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Name / Location <span class="text-error">*</span></label>
						<input type="text" name="name" required class="w-full bg-surface-container rounded-xl px-4 py-2.5 text-sm font-medium border-none focus:ring-2 focus:ring-primary outline-none" placeholder="e.g. Brankas Utama (Legal)" />
					</div>
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Description</label>
						<textarea name="description" rows="2" class="w-full bg-surface-container rounded-xl px-4 py-2.5 text-sm font-medium border-none focus:ring-2 focus:ring-primary outline-none" placeholder="Ruang HRD lantai 2..."></textarea>
					</div>
				</div>
				<div class="p-4 border-t border-surface-variant/20 bg-surface-container-low flex justify-end gap-3">
					<button type="button" onclick={() => isModalOpen = false} class="px-4 py-2 text-sm font-bold text-on-surface-variant hover:text-on-surface">Cancel</button>
					<button type="submit" disabled={isSubmitting} class="bg-primary text-on-primary px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50">
						{isSubmitting ? 'Saving...' : 'Save'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
