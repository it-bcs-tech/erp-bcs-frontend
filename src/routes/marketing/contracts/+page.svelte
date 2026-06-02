<script lang="ts">
	import type { PageData } from './$types';
	
	let { data }: { data: PageData } = $props();
	let contracts = $derived(data.contracts || []);

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
	};
</script>

<svelte:head>
	<title>Master Kontrak (PO) | Marketing Dashboard</title>
</svelte:head>

<div class="flex flex-col h-full">
	<!-- Header -->
	<header class="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
		<div>
			<h1 class="text-3xl font-extrabold text-on-surface tracking-tight mb-2">Master Kontrak (PO)</h1>
			<p class="text-on-surface-variant font-medium text-sm">Kelola kontrak bulanan, target tonase, tarif, dan UJO baku</p>
		</div>
		<div class="flex gap-3">
			<button class="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm flex items-center gap-2 hover:bg-blue-700 transition-colors">
				<span class="material-symbols-outlined text-lg">add_circle</span>
				Buat Kontrak Baru
			</button>
		</div>
	</header>

	<!-- Contracts List -->
	<div class="grid grid-cols-1 gap-4">
		{#each contracts as contract}
			<div class="bg-surface-container-lowest p-6 rounded-2xl border border-surface-container shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
				
				<div class="flex flex-col lg:flex-row gap-6 justify-between">
					
					<!-- Info Section -->
					<div class="flex-1">
						<div class="flex items-center gap-3 mb-2">
							<span class="text-xs font-black tracking-widest uppercase text-blue-600 bg-blue-600/10 px-2 py-1 rounded">{contract.id}</span>
							<span class="text-xs font-bold px-2 py-1 rounded {contract.status === 'Active' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-surface-container-high text-on-surface-variant'}">{contract.status}</span>
						</div>
						<h3 class="text-xl font-bold text-on-surface mb-4">{contract.customer}</h3>
						
						<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
							<div>
								<p class="text-[10px] uppercase font-bold text-on-surface-variant mb-1">Rute</p>
								<p class="text-sm font-semibold text-on-surface">{contract.origin} &rarr; {contract.destination}</p>
							</div>
							<div>
								<p class="text-[10px] uppercase font-bold text-on-surface-variant mb-1">Periode</p>
								<p class="text-sm font-semibold text-on-surface">{contract.startDate} - {contract.endDate}</p>
							</div>
							<div>
								<p class="text-[10px] uppercase font-bold text-on-surface-variant mb-1">Tarif / Ton</p>
								<p class="text-sm font-bold text-emerald-600">{formatCurrency(contract.tariffPerTon)}</p>
							</div>
							<div>
								<p class="text-[10px] uppercase font-bold text-on-surface-variant mb-1">UJO Baku</p>
								<p class="text-sm font-bold text-blue-600">{formatCurrency(contract.fixedUjo)}</p>
							</div>
						</div>
					</div>

					<!-- Progress Section -->
					<div class="w-full lg:w-72 bg-surface-container-low p-4 rounded-xl border border-surface-container-high self-center">
						<p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Progress Tonase</p>
						<div class="flex items-end justify-between mb-2">
							<span class="text-2xl font-black text-on-surface">{contract.deliveredTonnage}</span>
							<span class="text-sm font-medium text-on-surface-variant">/ {contract.targetTonnage} Ton</span>
						</div>
						
						<div class="w-full h-2.5 bg-surface-container-highest rounded-full overflow-hidden mb-2">
							<div class="h-full bg-blue-500 rounded-full" style="width: {(contract.deliveredTonnage / contract.targetTonnage) * 100}%"></div>
						</div>
						
						<p class="text-[10px] font-medium text-on-surface-variant text-right">
							{Math.round((contract.deliveredTonnage / contract.targetTonnage) * 100)}% Fulfilled
						</p>
					</div>

				</div>
			</div>
		{/each}
	</div>
</div>
