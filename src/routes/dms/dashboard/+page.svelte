<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>DMS Dashboard | ERP BCS</title>
</svelte:head>

<div class="px-6 py-8 w-full max-w-7xl mx-auto">
	<header class="mb-8">
		<h1 class="text-3xl font-extrabold text-on-surface tracking-tight">DMS Dashboard</h1>
		<p class="text-sm font-medium text-on-surface-variant mt-1">Overview of your Document Management System</p>
	</header>

	<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
		<!-- Total Docs -->
		<div class="bg-surface-container-lowest border rounded-2xl p-6 shadow-sm flex flex-col justify-between">
			<div class="flex items-center gap-4 mb-4">
				<div class="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">description</span>
				</div>
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Documents</p>
					<h3 class="text-3xl font-extrabold text-on-surface">{data.stats.total}</h3>
				</div>
			</div>
		</div>

		<!-- Active Docs -->
		<div class="bg-surface-container-lowest border border-emerald-500/20 rounded-2xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
			<div class="absolute right-0 top-0 w-32 h-32 bg-emerald-500/5 rounded-bl-full -mr-10 -mt-10 pointer-events-none"></div>
			<div class="flex items-center gap-4 mb-4">
				<div class="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">check_circle</span>
				</div>
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Active</p>
					<h3 class="text-3xl font-extrabold text-emerald-600">{data.stats.active}</h3>
				</div>
			</div>
		</div>

		<!-- Expired Docs -->
		<div class="bg-surface-container-lowest border border-rose-500/20 rounded-2xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
			<div class="absolute right-0 top-0 w-32 h-32 bg-rose-500/5 rounded-bl-full -mr-10 -mt-10 pointer-events-none"></div>
			<div class="flex items-center gap-4 mb-4">
				<div class="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">error</span>
				</div>
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Expired</p>
					<h3 class="text-3xl font-extrabold text-rose-600">{data.stats.expired}</h3>
				</div>
			</div>
		</div>
	</div>

	<div class="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-surface-variant/20">
		<h3 class="text-lg font-bold text-on-surface mb-4">Recent Documents</h3>
		<p class="text-sm text-on-surface-variant">Data is empty. Navigate to Transactions > All Documents to add new records.</p>
	</div>
</div>
