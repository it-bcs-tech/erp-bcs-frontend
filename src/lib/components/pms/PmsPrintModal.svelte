<script lang="ts">
	let {
		isOpen = false,
		title = 'Pratinjau Cetak Dokumen',
		docNumber = '',
		printUrl = '',
		onClose = () => {}
	}: {
		isOpen: boolean;
		title?: string;
		docNumber?: string;
		printUrl?: string;
		onClose?: () => void;
	} = $props();

	let kopMode = $state<'kop' | 'no-kop'>('kop');
	let isPrinting = $state(false);
	let isLoading = $state(true);
	let iframeEl: HTMLIFrameElement | null = $state(null);

	let iframeSrc = $derived(
		printUrl ? `${printUrl}?kop=${kopMode === 'kop'}&embedded=true` : ''
	);

	$effect(() => {
		if (isOpen) {
			isLoading = true;
			kopMode = 'kop';
		}
	});

	function setKopMode(mode: 'kop' | 'no-kop') {
		kopMode = mode;
		if (iframeEl?.contentWindow) {
			iframeEl.contentWindow.postMessage({ type: 'SET_KOP_MODE', kopMode: mode }, '*');
		}
	}

	function handleIframeLoad() {
		isLoading = false;
		if (iframeEl?.contentWindow) {
			iframeEl.contentWindow.postMessage({ type: 'SET_KOP_MODE', kopMode }, '*');
		}
	}

	function executePrint() {
		if (!iframeEl) return;
		isPrinting = true;
		try {
			iframeEl.contentWindow?.focus();
			iframeEl.contentWindow?.print();
		} catch (e) {
			console.error('Print iframe error:', e);
		} finally {
			setTimeout(() => {
				isPrinting = false;
			}, 800);
		}
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Escape' && isOpen) {
			onClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if isOpen && printUrl}
	<div class="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
		<!-- Backdrop (Identical to Finance) -->
		<div 
			class="absolute inset-0 bg-slate-950/75 backdrop-blur-sm" 
			onclick={onClose} 
			role="presentation"
		></div>

		<!-- Modal Container -->
		<div class="relative w-full max-w-5xl bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[94vh] max-h-[96vh] border border-slate-700 animate-in zoom-in-95 duration-150">
			<!-- Header Bar (Identical to Finance) -->
			<div class="px-6 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 bg-slate-950 text-white shrink-0">
				<div class="flex items-center gap-3">
					<span class="p-2 rounded-xl bg-amber-600/20 text-amber-400">
						<span class="material-symbols-outlined text-xl">print</span>
					</span>
					<div>
						<h3 class="text-base font-black text-white">{title}</h3>
						{#if docNumber}
							<p class="text-xs text-slate-400 font-mono font-bold">{docNumber}</p>
						{/if}
					</div>
				</div>

				<!-- Toggle Kop / Non-Kop -->
				<div class="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
					<button 
						type="button" 
						onclick={() => setKopMode('kop')} 
						class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all {kopMode === 'kop' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-300 hover:text-white cursor-pointer'}"
					>
						<span class="material-symbols-outlined text-[15px]">article</span>
						<span>Dengan Kop</span>
					</button>
					<button 
						type="button" 
						onclick={() => setKopMode('no-kop')} 
						class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all {kopMode === 'no-kop' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-300 hover:text-white cursor-pointer'}"
					>
						<span class="material-symbols-outlined text-[15px]">crop_portrait</span>
						<span>Tanpa Kop (Kertas Fisik)</span>
					</button>
				</div>

				<!-- Action Buttons -->
				<div class="flex items-center gap-3">
					<button 
						type="button" 
						onclick={executePrint} 
						disabled={isPrinting || isLoading}
						class="px-5 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
					>
						<span class="material-symbols-outlined text-[16px]">{isPrinting ? 'hourglass_top' : 'print'}</span>
						<span>{isPrinting ? 'Mencetak...' : 'Cetak Sekarang'}</span>
					</button>
					<button 
						type="button" 
						onclick={onClose} 
						class="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
						title="Tutup Modal"
					>
						<span class="material-symbols-outlined text-lg">close</span>
					</button>
				</div>
			</div>

			<!-- Body: Scrollable Canvas Frame -->
			<div class="flex-1 overflow-hidden bg-slate-950/70 flex justify-center items-stretch relative">
				{#if isLoading}
					<div class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-900/90 backdrop-blur-xs text-slate-400">
						<span class="material-symbols-outlined animate-spin text-4xl text-amber-500">sync</span>
						<p class="font-bold text-sm">Menyiapkan Lembar Cetak...</p>
					</div>
				{/if}
				<iframe 
					bind:this={iframeEl}
					src={iframeSrc}
					onload={handleIframeLoad}
					class="w-full h-full border-0 bg-transparent"
					title="Pratinjau Dokumen Cetak"
				></iframe>
			</div>
		</div>
	</div>
{/if}
