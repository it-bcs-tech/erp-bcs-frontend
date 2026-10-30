<script lang="ts">
	let {
		isOpen = $bindable(false),
		moduleName = 'Document Management System (DMS)'
	} = $props();
</script>

{#if isOpen}
	<div class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
		<div class="bg-surface-container-lowest dark:bg-surface-container-low rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 p-6 space-y-4">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<div class="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
						<span class="material-symbols-outlined text-2xl">lock</span>
					</div>
					<div>
						<h3 class="text-base font-extrabold text-on-surface">Akses Modul Terbatas</h3>
						<p class="text-xs text-rose-600 dark:text-rose-400 font-bold uppercase tracking-wider">Izin Otorisasi Diperlukan</p>
					</div>
				</div>
				<button
					type="button"
					onclick={() => isOpen = false}
					class="w-8 h-8 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-on-surface-variant flex items-center justify-center transition-colors cursor-pointer"
					aria-label="Tutup"
				>
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>

			<div class="p-4 rounded-2xl bg-surface-container border border-slate-200/80 dark:border-slate-800 text-xs text-on-surface space-y-2">
				<p>Akun Anda saat ini <strong>belum diberikan izin akses</strong> ke modul <strong>{moduleName}</strong>.</p>
				<p class="text-on-surface-variant leading-relaxed">
					Untuk menjaga kepatuhan dan integritas dokumen legalitas perusahaan, silakan <strong>hubungi Tim IT Developer</strong> atau Administrator sistem BCS untuk mengajukan pembukaan hak akses modul ini.
				</p>
			</div>

			<div class="flex items-center justify-end gap-2 pt-2">
				<button
					type="button"
					onclick={() => isOpen = false}
					class="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer"
				>
					Saya Mengerti
				</button>
			</div>
		</div>
	</div>
{/if}
