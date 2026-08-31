<script lang="ts">
	import { formatDateTimeId } from '$lib/utils/dms';

	let {
		isOpen = $bindable(false),
		filePath = '',
		docTitle = '',
		docNumber = '',
		userName = 'Staff ERP'
	} = $props();

	let nowStr = $derived(formatDateTimeId(new Date()));
	let watermarkText = $derived(`${userName.toUpperCase()} • ${nowStr} • ERP BCS CONFIDENTIAL • ISO 27001`);
</script>

{#if isOpen}
	<div class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200">
		<div class="bg-surface-container-lowest dark:bg-surface-container-low rounded-3xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
			<!-- Modal Header -->
			<div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-surface-container-low dark:bg-surface-container">
				<div class="flex items-center gap-3">
					<span class="material-symbols-outlined text-rose-600 dark:text-rose-400 text-2xl">picture_as_pdf</span>
					<div>
						<h3 class="text-sm md:text-base font-extrabold text-on-surface line-clamp-1">{docTitle}</h3>
						<p class="text-[11px] text-on-surface-variant font-medium">
							{docNumber ? `No: ${docNumber}` : 'Pratinjau Berkas'} &bull; <span class="text-indigo-600 dark:text-indigo-400 font-bold">Secure Watermarked Viewer</span>
						</p>
					</div>
				</div>
				<div class="flex items-center gap-2">
					{#if filePath}
						<a
							href={`/uploads/${filePath}`}
							download
							class="px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 text-xs font-bold transition-colors flex items-center gap-1.5"
						>
							<span class="material-symbols-outlined text-base">download</span>
							<span class="hidden sm:inline">Unduh PDF Asli</span>
						</a>
					{/if}
					<button
						type="button"
						onclick={() => isOpen = false}
						class="w-9 h-9 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-on-surface-variant flex items-center justify-center transition-colors"
					>
						<span class="material-symbols-outlined text-xl">close</span>
					</button>
				</div>
			</div>

			<!-- Viewer Area with Dynamic Watermark Overlay -->
			<div class="relative flex-1 bg-slate-900 overflow-hidden flex items-center justify-center">
				{#if filePath}
					<iframe
						src={`/uploads/${filePath}#toolbar=0`}
						title={docTitle}
						class="w-full h-full border-none z-10"
					></iframe>
				{:else}
					<div class="text-center text-slate-400 p-8 z-10">
						<span class="material-symbols-outlined text-5xl mb-2 text-slate-500">description</span>
						<p class="text-sm font-semibold">Berkas fisik scan digital belum diunggah.</p>
					</div>
				{/if}

				<!-- Dynamic SVG Watermark Overlay -->
				<div class="absolute inset-0 pointer-events-none z-20 overflow-hidden select-none flex flex-col justify-around opacity-15">
					{#each Array(6) as _, rowIndex}
						<div class="flex justify-around transform -rotate-12 whitespace-nowrap text-white font-black tracking-widest text-xs md:text-sm">
							{#each Array(3) as _, colIndex}
								<span class="mx-8">{watermarkText}</span>
							{/each}
						</div>
					{/each}
				</div>
			</div>

			<!-- Footer info -->
			<div class="px-6 py-2.5 bg-surface-container-low dark:bg-surface-container border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-on-surface-variant">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-emerald-600 text-base">verified_user</span>
					<span>Akses ini diaudit dan dicatat dalam log ISO 27001.</span>
				</div>
				<span class="font-mono">{nowStr}</span>
			</div>
		</div>
	</div>
{/if}
