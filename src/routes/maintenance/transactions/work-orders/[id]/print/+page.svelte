<script lang="ts">
	import type { PageData } from './$types';
	import SpkPrintDocument from '$lib/components/maintenance/SpkPrintDocument.svelte';

	let { data }: { data: PageData } = $props();
	const wo = $derived(data.wo || ({} as any));

	function printDocument() {
		window.print();
	}
</script>

<svelte:head>
	<title>Surat Perintah Kerja (SPK) - {wo?.woNo || ''}</title>
</svelte:head>

<!-- Print Control Floating Header (Hidden when printing) -->
<div class="print:hidden p-4 bg-slate-900 text-white flex items-center justify-between sticky top-0 z-50 shadow-md">
	<div class="flex items-center gap-2">
		<span class="material-symbols-outlined text-amber-400">print</span>
		<span class="font-bold text-sm">Pratinjau Format Cetak Surat Perintah Kerja (SPK) Bengkel</span>
	</div>
	<div class="flex items-center gap-2">
		<button 
			onclick={printDocument}
			class="px-4 py-1.5 rounded-lg bg-primary text-white font-bold text-xs hover:opacity-90 flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
		>
			<span class="material-symbols-outlined text-[16px]">print</span>
			<span>Cetak SPK Fisik</span>
		</button>
		<button 
			onclick={() => window.close()}
			class="px-3 py-1.5 rounded-lg bg-slate-700 text-slate-200 text-xs font-semibold hover:bg-slate-600 cursor-pointer transition-all"
		>
			Tutup
		</button>
	</div>
</div>

<!-- Main Printable Document Container -->
<div class="p-4 sm:p-8 bg-slate-100 min-h-screen print:p-0 print:bg-white flex justify-center">
	<SpkPrintDocument {wo} />
</div>

<style>
	@media print {
		body {
			background: white !important;
		}
	}
</style>
