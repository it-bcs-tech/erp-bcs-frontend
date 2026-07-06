<script lang="ts">
	import { onMount } from 'svelte';
	let { data } = $props();

	onMount(() => {
		// Automatically trigger print dialog when page loads
		setTimeout(() => {
			window.print();
		}, 500);
	});

	function formatCurrency(amount: number) {
		return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
	}

	function formatDate(dateStr: string | null) {
		if (!dateStr) return '-';
		return new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
	}
</script>

<svelte:head>
	<title>Invoice - {data.invoice.invoice_number}</title>
</svelte:head>

<div class="print-container">
	<!-- Print-specific styles to hide browser UI and set A4 paper -->
	<style>
		@media print {
			@page { margin: 1cm; size: A4 portrait; }
			body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white !important; }
			/* Hide global nav/sidebars assuming they use typical class names, though usually they are layout scoped. 
			   Since we might be rendered inside the global +layout.svelte, we might need to force full screen. */
		}
		
		/* We'll force this container to cover everything and have a white background, effectively hiding the app shell for printing */
		.print-container {
			position: absolute;
			top: 0;
			left: 0;
			right: 0;
			min-height: 100vh;
			background: white;
			z-index: 9999; /* Cover the sidebar */
			color: black;
			padding: 2rem;
			font-family: 'Inter', sans-serif;
		}

		table {
			width: 100%;
			border-collapse: collapse;
			margin-top: 2rem;
			margin-bottom: 2rem;
		}
		th, td {
			border: 1px solid #000;
			padding: 0.5rem;
			text-align: left;
		}
		th {
			background-color: #f3f4f6; /* light gray */
			font-weight: bold;
		}
		.text-right { text-align: right; }
		.font-bold { font-weight: bold; }
	</style>

	<div class="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
		<div>
			<h1 class="text-3xl font-black uppercase tracking-tight">INVOICE</h1>
			<p class="text-sm mt-1">No: <strong>{data.invoice.invoice_number}</strong></p>
			<p class="text-sm">Tanggal: <strong>{formatDate(data.invoice.date)}</strong></p>
			<p class="text-sm">Jatuh Tempo: <strong>{formatDate(data.invoice.due_date)}</strong></p>
		</div>
		<div class="text-right max-w-xs">
			<h2 class="text-xl font-bold">PT. BUMI CIKANDEL SEJAHTERA</h2>
			<p class="text-sm mt-1">Gedung BCS, Serang, Banten</p>
		</div>
	</div>

	<div class="grid grid-cols-2 gap-8 mb-6">
		<div>
			<h3 class="text-sm font-bold uppercase border-b border-black pb-1 mb-2">Ditagihkan Kepada:</h3>
			<p class="font-bold text-lg">{data.invoice.customer_name || '-'}</p>
			<p class="text-sm whitespace-pre-wrap">{data.invoice.customer_address || '-'}</p>
		</div>
		<div>
			<h3 class="text-sm font-bold uppercase border-b border-black pb-1 mb-2">Informasi Tambahan:</h3>
			<p class="text-sm">No. PO/SPK: <strong>{data.invoice.po_spk_number || '-'}</strong></p>
			<p class="text-sm">Periode Kegiatan: <strong>{data.invoice.activity_period || '-'}</strong></p>
			<p class="text-sm">Tgl Kirim Invoice: <strong>{formatDate(data.invoice.delivery_date)}</strong></p>
		</div>
	</div>

	<table>
		<thead>
			<tr>
				<th class="w-12">No</th>
				<th>Deskripsi</th>
				<th class="w-24 text-right">Qty</th>
				<th class="w-32 text-right">Harga Satuan</th>
				<th class="w-40 text-right">Total</th>
			</tr>
		</thead>
		<tbody>
			{#each data.invoiceLines as line, i}
				<tr>
					<td>{i + 1}</td>
					<td>{line.description}</td>
					<td class="text-right">{Number(line.quantity).toFixed(2)} {line.uom}</td>
					<td class="text-right">{formatCurrency(Number(line.unit_price))}</td>
					<td class="text-right">{formatCurrency(Number(line.total))}</td>
				</tr>
			{/each}
		</tbody>
	</table>

	<div class="flex justify-end">
		<div class="w-1/2">
			<div class="flex justify-between border-b border-gray-300 py-1">
				<span>Subtotal</span>
				<span class="font-bold">{formatCurrency(Number(data.invoice.subtotal))}</span>
			</div>
			<div class="flex justify-between border-b border-gray-300 py-1">
				<span>Pajak</span>
				<span class="font-bold">{formatCurrency(Number(data.invoice.tax_amount))}</span>
			</div>
			{#if Number(data.invoice.advance_payment) > 0}
				<div class="flex justify-between border-b border-gray-300 py-1 text-red-600">
					<span>Uang Muka</span>
					<span class="font-bold">- {formatCurrency(Number(data.invoice.advance_payment))}</span>
				</div>
			{/if}
			<div class="flex justify-between py-2 mt-1">
				<span class="font-black text-lg">TOTAL TAGIHAN</span>
				<span class="font-black text-xl">{formatCurrency(Number(data.invoice.total_amount))}</span>
			</div>
		</div>
	</div>

	<div class="mt-12 grid grid-cols-2 gap-8">
		<div>
			<h3 class="text-sm font-bold uppercase mb-2">Instruksi Pembayaran</h3>
			<p class="text-sm">Mohon lakukan pembayaran transfer ke rekening berikut:</p>
			<div class="mt-2 p-3 border border-black inline-block">
				<p class="font-bold">{data.invoice.bank_name || '-'}</p>
				<p class="font-bold text-lg tracking-wider">{data.invoice.account_number || '-'}</p>
				<p class="text-sm">a.n {data.invoice.account_name || '-'}</p>
			</div>
		</div>
		<div class="text-center">
			<p class="text-sm mb-16">Hormat Kami,</p>
			<p class="font-bold border-b border-black inline-block px-8 pb-1">Finance Dept.</p>
			<p class="text-sm mt-1">PT. Bumi Cikandel Sejahtera</p>
		</div>
	</div>
	
	<div class="mt-16 text-center text-xs text-gray-500 print:block hidden">
		Dicetak pada {new Date().toLocaleString('id-ID')}
	</div>
</div>
