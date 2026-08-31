<script lang="ts">
	let {
		isOpen = $bindable(false),
		qrCodeId = '',
		docTitle = '',
		docNumber = '',
		entityName = '',
		filingLocation = '',
		expiryDate = ''
	} = $props();

	function printLabel() {
		window.print();
	}

	// Generate QR Code SVG URL using Google Charts / QuickChart or canvas SVG
	let qrUrl = $derived(
		`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeId || docNumber || docTitle)}`
	);
</script>

{#if isOpen}
	<div class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 print:p-0 print:bg-white print:fixed print:inset-0 animate-in fade-in duration-200">
		<div class="bg-surface-container-lowest dark:bg-surface-container-low rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 print:shadow-none print:border-none print:w-full">
			<!-- Modal Header (Hidden on Print) -->
			<div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between print:hidden">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-indigo-600 dark:text-indigo-400">qr_code_2</span>
					<h3 class="text-base font-extrabold text-on-surface">Cetak Label Fisik (QR & Barcode)</h3>
				</div>
				<button
					type="button"
					onclick={() => isOpen = false}
					class="w-8 h-8 rounded-lg hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant"
				>
					<span class="material-symbols-outlined text-xl">close</span>
				</button>
			</div>

			<!-- Printable Label Card Container -->
			<div class="p-6 flex flex-col items-center">
				<div class="w-full border-2 border-dashed border-slate-400 dark:border-slate-600 rounded-2xl p-6 bg-white text-slate-900 shadow-sm print:border-solid print:border-black print:rounded-none">
					<!-- Header Company -->
					<div class="flex items-center justify-between border-b-2 border-slate-900 pb-3 mb-4">
						<div>
							<h2 class="text-base font-black tracking-tight uppercase">PT BCS LOGISTICS</h2>
							<p class="text-[10px] font-bold tracking-widest text-slate-600 uppercase">Document Custody & Archive Tag</p>
						</div>
						<div class="text-right">
							<span class="text-xs font-mono font-black px-2 py-0.5 bg-slate-900 text-white rounded">
								{qrCodeId || 'DMS-TAG'}
							</span>
						</div>
					</div>

					<!-- Body: QR Code & Metadata -->
					<div class="flex items-center gap-5">
						<div class="w-32 h-32 flex-shrink-0 bg-slate-50 p-1.5 border border-slate-300 rounded-xl flex items-center justify-center">
							<img src={qrUrl} alt="QR Code Tag" class="w-full h-full object-contain" />
						</div>
						<div class="flex-1 space-y-1.5 min-w-0">
							<h4 class="text-xs font-black uppercase text-slate-900 leading-snug line-clamp-2">{docTitle}</h4>
							{#if docNumber}
								<p class="text-[11px] font-mono font-bold text-slate-700">No: {docNumber}</p>
							{/if}
							{#if entityName}
								<p class="text-[11px] font-bold text-indigo-700">Subjek: {entityName}</p>
							{/if}
							{#if filingLocation}
								<p class="text-[10px] font-bold text-slate-600">Lokasi: {filingLocation}</p>
							{/if}
							{#if expiryDate}
								<p class="text-[10px] font-bold text-rose-700">Kadaluarsa: {expiryDate}</p>
							{/if}
						</div>
					</div>

					<!-- Footer scan notice -->
					<div class="mt-4 pt-2.5 border-t border-slate-200 text-center">
						<p class="text-[9px] font-semibold text-slate-500">
							Pindai QR ini pada sistem ERP BCS untuk melakukan Check-Out / Check-In Peminjaman Berkas Fisik.
						</p>
					</div>
				</div>
			</div>

			<!-- Modal Footer Actions (Hidden on Print) -->
			<div class="px-6 py-4 bg-surface-container-low dark:bg-surface-container border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 print:hidden">
				<button
					type="button"
					onclick={() => isOpen = false}
					class="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-on-surface hover:bg-surface-container-high transition-colors"
				>
					Tutup
				</button>
				<button
					type="button"
					onclick={printLabel}
					class="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-sm flex items-center gap-1.5 transition-colors"
				>
					<span class="material-symbols-outlined text-base">print</span>
					<span>Cetak Label Stiker</span>
				</button>
			</div>
		</div>
	</div>
{/if}
