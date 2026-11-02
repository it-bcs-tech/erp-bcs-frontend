<script lang="ts">
	import { formatDateTimeId, resolveUploadUrl } from '$lib/utils/dms';

	let {
		isOpen = $bindable(false),
		filePath = '',
		docTitle = '',
		docNumber = '',
		userName = 'Staff ERP',
		docId = ''
	} = $props();

	let nowStr = $derived(formatDateTimeId(new Date()));
	let watermarkText = $derived(`${userName.toUpperCase()} • ${nowStr} • ERP BCS CONFIDENTIAL • ISO 27001`);
	let resolvedUrl = $derived(resolveUploadUrl(filePath));

	let fileStatus = $state<'checking' | 'available' | 'missing' | 'error'>('checking');
	let isChecking = $state(false);

	async function checkFileAvailability(url: string) {
		if (!url) {
			fileStatus = 'missing';
			return;
		}

		isChecking = true;
		fileStatus = 'checking';
		try {
			const res = await fetch(url, { method: 'HEAD' });
			if (res.ok) {
				fileStatus = 'available';
			} else if (res.status === 404) {
				fileStatus = 'missing';
			} else {
				// Coba fallback GET jika HEAD tidak didukung sepenuhnya
				const getRes = await fetch(url, { method: 'GET', headers: { Range: 'bytes=0-0' } });
				if (getRes.ok || getRes.status === 206) {
					fileStatus = 'available';
				} else {
					fileStatus = 'missing';
				}
			}
		} catch {
			fileStatus = 'error';
		} finally {
			isChecking = false;
		}
	}

	$effect(() => {
		if (isOpen) {
			if (filePath) {
				checkFileAvailability(resolvedUrl);
			} else {
				fileStatus = 'missing';
			}
		}
	});

	function getDisplayFileName(path: string): string {
		if (!path) return '-';
		const parts = path.split('/');
		return parts[parts.length - 1];
	}
</script>

{#if isOpen}
	<div class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200">
		<div class="bg-surface-container-lowest dark:bg-surface-container-low rounded-3xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
			<!-- Modal Header -->
			<div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-surface-container-low dark:bg-surface-container">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center justify-center flex-shrink-0">
						<span class="material-symbols-outlined text-rose-600 dark:text-rose-400 text-xl">picture_as_pdf</span>
					</div>
					<div>
						<h3 class="text-sm md:text-base font-extrabold text-on-surface line-clamp-1">{docTitle}</h3>
						<p class="text-[11px] text-on-surface-variant font-medium">
							{docNumber ? `No: ${docNumber}` : 'Pratinjau Berkas'} &bull; <span class="text-indigo-600 dark:text-indigo-400 font-bold">Secure Watermarked Viewer</span>
						</p>
					</div>
				</div>
				<div class="flex items-center gap-2">
					{#if fileStatus === 'available' && resolvedUrl}
						<a
							href={resolvedUrl}
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
				{#if fileStatus === 'checking'}
					<div class="text-center text-slate-300 p-8 z-10 flex flex-col items-center gap-3">
						<div class="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
						<p class="text-sm font-semibold">Memeriksa ketersediaan berkas digital...</p>
					</div>
				{:else if fileStatus === 'available'}
					<iframe
						src={`${resolvedUrl}#toolbar=0`}
						title={docTitle}
						class="w-full h-full border-none z-10"
					></iframe>

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
				{:else}
					<!-- Fallback UI for Missing / Legacy Migrated Document -->
					<div class="max-w-xl mx-auto p-6 md:p-8 z-10 bg-slate-800/90 backdrop-blur-md rounded-3xl border border-slate-700 text-center shadow-2xl animate-in zoom-in-95 duration-200">
						<div class="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-4">
							<span class="material-symbols-outlined text-3xl">sync_problem</span>
						</div>

						<h4 class="text-lg font-black text-white mb-2">Berkas Fisik Sedang Dalam Proses Sinkronisasi</h4>
						<p class="text-xs text-slate-300 leading-relaxed mb-6">
							Metadata dokumen legalitas ini telah tercatat dalam database (migrasi sistem armada), namun berkas scan fisik digital belum tersedia pada repositori server baru.
						</p>

						<div class="bg-slate-900/80 rounded-2xl p-4 border border-slate-700/60 mb-6 text-left space-y-2">
							<div class="flex items-center justify-between text-xs">
								<span class="text-slate-400">Nama Berkas Target:</span>
								<span class="font-mono font-bold text-amber-300 truncate max-w-xs">{getDisplayFileName(filePath)}</span>
							</div>
							<div class="flex items-center justify-between text-xs">
								<span class="text-slate-400">Status Penyimpanan:</span>
								<span class="px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 font-bold text-[10px]">Menunggu Sinkronisasi / Scan</span>
							</div>
							{#if docNumber}
								<div class="flex items-center justify-between text-xs">
									<span class="text-slate-400">Nomor Registrasi:</span>
									<span class="font-mono font-bold text-slate-200">{docNumber}</span>
								</div>
							{/if}
						</div>

						<div class="flex items-center justify-center gap-3 flex-wrap">
							{#if docId}
								<a
									href={`/dms/transactions/documents/${docId}`}
									class="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all"
								>
									<span class="material-symbols-outlined text-base">cloud_upload</span>
									<span>Unggah Berkas Baru / Perpanjangan</span>
								</a>
							{/if}
							<button
								type="button"
								onclick={() => isOpen = false}
								class="px-5 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-xs transition-colors"
							>
								Tutup Pratinjau
							</button>
						</div>
					</div>
				{/if}
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
