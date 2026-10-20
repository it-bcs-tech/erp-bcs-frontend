<script lang="ts">
	import { goto } from '$app/navigation';

	interface Props {
		currentPage?: number;
		totalPages?: number;
		totalItems?: number;
		perPage?: number;
		itemLabel?: string;
		onPageChange?: (page: number) => void;
		useUrlNavigation?: boolean;
		pageParamName?: string;
	}

	let {
		currentPage = 1,
		totalPages = 1,
		totalItems = 0,
		perPage = 10,
		itemLabel = 'data',
		onPageChange,
		useUrlNavigation = undefined,
		pageParamName = 'page'
	}: Props = $props();

	// Jika useUrlNavigation tidak diset eksplisit, otomatis false jika ada onPageChange, true jika tidak ada
	let shouldNavigateUrl = $derived(useUrlNavigation !== undefined ? useUrlNavigation : !onPageChange);

	let startItem = $derived(totalItems === 0 ? 0 : (currentPage - 1) * perPage + 1);
	let endItem = $derived(Math.min(currentPage * perPage, totalItems));

	type PageItem = number | '...';

	let pageItems = $derived.by<PageItem[]>(() => {
		if (totalPages <= 1) return [1];
		if (totalPages <= 7) {
			return Array.from({ length: totalPages }, (_, i) => i + 1);
		}

		const pages: PageItem[] = [];

		if (currentPage <= 4) {
			for (let i = 1; i <= 5; i++) pages.push(i);
			pages.push('...');
			pages.push(totalPages);
		} else if (currentPage >= totalPages - 3) {
			pages.push(1);
			pages.push('...');
			for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
		} else {
			pages.push(1);
			pages.push('...');
			pages.push(currentPage - 1);
			pages.push(currentPage);
			pages.push(currentPage + 1);
			pages.push('...');
			pages.push(totalPages);
		}

		return pages;
	});

	function handlePageClick(p: number) {
		if (p < 1 || p > totalPages || p === currentPage) return;

		if (onPageChange) {
			onPageChange(p);
		}

		if (shouldNavigateUrl && typeof window !== 'undefined') {
			const url = new URL(window.location.href);
			url.searchParams.set(pageParamName, p.toString());
			goto(url.toString(), { invalidateAll: true, noScroll: true });
		}
	}
</script>

<div class="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface-container-low">
	<p class="text-xs text-on-surface-variant font-medium">
		Menampilkan <span class="font-bold text-on-surface">{startItem}</span> - <span class="font-bold text-on-surface">{endItem}</span> dari <span class="font-bold text-on-surface">{totalItems}</span> {itemLabel}
	</p>

	<div class="flex items-center gap-1">
		<!-- Tombol Sebelumnya (<) -->
		<button
			type="button"
			class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed"
			disabled={currentPage <= 1}
			onclick={() => handlePageClick(currentPage - 1)}
			aria-label="Halaman Sebelumnya"
		>
			<span class="material-symbols-outlined text-lg">chevron_left</span>
		</button>

		<!-- Daftar Angka Halaman (< 1 2 3 ... >) -->
		{#each pageItems as item, idx (idx + '-' + item)}
			{#if item === '...'}
				<span class="w-8 h-8 flex items-center justify-center text-on-surface-variant text-xs font-bold select-none">
					...
				</span>
			{:else}
				<button
					type="button"
					class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs transition-colors cursor-pointer {currentPage === item ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface hover:bg-surface-container'}"
					onclick={() => handlePageClick(item)}
					aria-current={currentPage === item ? 'page' : undefined}
				>
					{item}
				</button>
			{/if}
		{/each}

		<!-- Tombol Selanjutnya (>) -->
		<button
			type="button"
			class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed"
			disabled={currentPage >= totalPages}
			onclick={() => handlePageClick(currentPage + 1)}
			aria-label="Halaman Selanjutnya"
		>
			<span class="material-symbols-outlined text-lg">chevron_right</span>
		</button>
	</div>
</div>
