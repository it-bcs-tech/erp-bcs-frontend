<script lang="ts">
	export interface OptionItem {
		value: string | number;
		label: string;
		sublabel?: string;
		searchTerms?: string;
	}

	let { 
		options = [] as OptionItem[], 
		value = $bindable(), 
		placeholder = 'Pilih opsi...',
		class: className = '',
		btnClass = '',
		dropdownClass = '',
		name = '',
		required = false,
		disabled = false,
		allowClear = true,
		onchange = undefined
	}: {
		options?: OptionItem[];
		value?: any;
		placeholder?: string;
		class?: string;
		btnClass?: string;
		dropdownClass?: string;
		name?: string;
		required?: boolean;
		disabled?: boolean;
		allowClear?: boolean;
		onchange?: (val: any) => void;
	} = $props();

	let search = $state('');
	let open = $state(false);
	let containerNode: HTMLElement | undefined = $state();
	let inputNode: HTMLInputElement | undefined = $state();
	
	const filteredOptions = $derived(
		options.filter(opt => {
			if (!search.trim()) return true;
			const s = search.toLowerCase();
			const labelMatch = (opt.label || '').toLowerCase().includes(s);
			const subMatch = opt.sublabel ? opt.sublabel.toLowerCase().includes(s) : false;
			const termMatch = opt.searchTerms ? opt.searchTerms.toLowerCase().includes(s) : false;
			return labelMatch || subMatch || termMatch;
		})
	);

	const selectedOption = $derived(
		options.find(opt => String(opt.value) === String(value))
	);

	const selectedLabel = $derived(
		selectedOption ? selectedOption.label : ''
	);

	function selectOption(opt: OptionItem) {
		value = opt.value;
		open = false;
		search = '';
		if (onchange) {
			onchange(opt.value);
		}
	}

	function clearSelection(e: MouseEvent) {
		e.stopPropagation();
		value = '';
		if (onchange) {
			onchange('');
		}
	}

	function toggleOpen() {
		if (disabled) return;
		open = !open;
		if (open) {
			search = '';
			setTimeout(() => inputNode?.focus(), 50);
		}
	}

	function handleOutsideClick(e: MouseEvent) {
		if (open && containerNode && !containerNode.contains(e.target as Node)) {
			open = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (open && e.key === 'Escape') {
			open = false;
		}
	}
</script>

<svelte:window onclick={handleOutsideClick} onkeydown={handleKeydown} />

<div class="relative w-full {className}" bind:this={containerNode}>
	{#if name}
		<input type="hidden" {name} value={value ?? ''} {required} />
	{/if}

	<button 
		type="button" 
		{disabled}
		class="w-full text-left bg-surface-container rounded-xl px-4 py-2.5 text-xs font-normal border border-outline-variant/30 dark:border-slate-700 focus:ring-2 focus:ring-amber-500/40 outline-none flex justify-between items-center transition-all disabled:opacity-60 disabled:cursor-not-allowed {btnClass}"
		onclick={toggleOpen}
	>
		<span class="truncate flex items-center gap-2 {value ? 'text-on-surface font-normal' : 'text-on-surface-variant font-normal'}">
			{value && selectedLabel ? selectedLabel : placeholder}
			{#if selectedOption?.sublabel}
				<span class="text-[10px] px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-mono">
					{selectedOption.sublabel}
				</span>
			{/if}
		</span>
		<div class="flex items-center gap-1 shrink-0 ml-2">
			{#if value && allowClear && !disabled}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<span 
					role="button"
					tabindex="0"
					onclick={clearSelection}
					class="material-symbols-outlined text-[16px] text-on-surface-variant hover:text-rose-500 transition-colors p-0.5 rounded-full hover:bg-surface-container-high cursor-pointer"
					title="Hapus pilihan"
				>
					close
				</span>
			{/if}
			<span class="material-symbols-outlined text-[18px] text-on-surface-variant">
				{open ? 'expand_less' : 'expand_more'}
			</span>
		</div>
	</button>

	{#if open}
		<div class="absolute left-0 z-50 mt-1 min-w-full min-w-[260px] {dropdownClass} bg-surface-container-highest dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-64 flex flex-col overflow-hidden">
			<div class="p-2 border-b border-slate-200/60 dark:border-slate-800 bg-surface-container dark:bg-slate-800/80">
				<input 
					type="text" 
					bind:value={search} 
					bind:this={inputNode}
					placeholder="Ketik untuk mencari..." 
					class="w-full bg-surface dark:bg-slate-900 rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-amber-500 text-on-surface border border-slate-200 dark:border-slate-700"
				/>
			</div>
			<ul class="overflow-y-auto flex-1 p-1 max-h-52">
				{#if filteredOptions.length === 0}
					<li class="px-3 py-3 text-xs text-on-surface-variant text-center italic">Tidak ada data ditemukan</li>
				{/if}
				{#each filteredOptions as opt}
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
					<li 
						class="px-3 py-2 text-xs rounded-lg cursor-pointer hover:bg-amber-500/15 dark:hover:bg-amber-500/20 transition-colors flex items-center justify-between gap-2 {String(value) === String(opt.value) ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium' : 'text-on-surface font-normal'}"
						onclick={() => selectOption(opt)}
					>
						<span class="truncate">{opt.label}</span>
						{#if opt.sublabel}
							<span class="text-[10px] px-1.5 py-0.5 rounded bg-surface-container dark:bg-slate-800 text-on-surface-variant font-mono shrink-0">
								{opt.sublabel}
							</span>
						{/if}
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>
