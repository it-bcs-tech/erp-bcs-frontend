<script lang="ts">
    import { slide } from 'svelte/transition';

    let { 
        options = [], // Expected format: { value: string|number, label: string }[]
        value = $bindable([]), // Array of selected values
        placeholder = 'Cari dan Pilih (Bisa Lebih Dari Satu)...',
        class: className = '' 
    } = $props();

    let search = $state('');
    let open = $state(false);
    let containerNode: HTMLElement;
    
    // Derived selected objects for rendering chips
    const selectedOptions = $derived(
        options.filter(opt => value.includes(opt.value))
    );

    // Filtered options for the dropdown (exclude already selected)
    const filteredOptions = $derived(
        options.filter(opt => 
            !value.includes(opt.value) && 
            opt.label.toLowerCase().includes(search.toLowerCase())
        )
    );

    function toggleOption(optValue: any) {
        if (value.includes(optValue)) {
            value = value.filter((v: any) => v !== optValue);
        } else {
            value = [...value, optValue];
        }
        search = '';
    }

    function removeOption(optValue: any, e: Event) {
        e.stopPropagation();
        value = value.filter((v: any) => v !== optValue);
    }

    function toggleOpen() {
        open = true;
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape') open = false;
        if (e.key === 'Backspace' && search === '' && value.length > 0) {
            value = value.slice(0, -1);
        }
    }

    function handleClickOutside(e: MouseEvent) {
        if (containerNode && !containerNode.contains(e.target as Node)) {
            open = false;
        }
    }
</script>

<svelte:window onclick={handleClickOutside} />

<div bind:this={containerNode} class="relative w-full text-left {className}">
    <div 
        class="min-h-[44px] w-full bg-surface-container rounded-xl px-2 py-1.5 border border-transparent focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all flex flex-wrap items-center gap-1.5 cursor-text"
        onclick={toggleOpen}
    >
        {#each selectedOptions as opt}
            <span class="flex items-center gap-1 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-2 py-1 rounded-lg text-xs font-bold whitespace-nowrap border border-blue-200 dark:border-blue-800/50">
                {opt.label.split(' • ')[0]}
                <button type="button" onclick={(e) => removeOption(opt.value, e)} class="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5 flex items-center justify-center transition-colors">
                    <span class="material-symbols-outlined text-[14px]">close</span>
                </button>
            </span>
        {/each}
        <input 
            type="text" 
            bind:value={search} 
            onfocus={toggleOpen}
            onkeydown={handleKeydown}
            {placeholder}
            class="flex-1 min-w-[150px] bg-transparent outline-none border-none text-sm font-medium px-2 py-1 h-[32px] text-on-surface"
        />
        <span class="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none transition-transform {open ? 'rotate-180' : ''}">
            arrow_drop_down
        </span>
    </div>

    {#if open && filteredOptions.length > 0}
        <div transition:slide={{duration: 200}} class="absolute z-50 w-full mt-2 bg-surface-container-lowest border border-surface-container shadow-xl rounded-xl max-h-60 overflow-y-auto custom-scrollbar">
            {#each filteredOptions as opt}
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <div 
                    class="px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer transition-colors border-b border-surface-container last:border-0 flex items-center gap-2"
                    onclick={() => toggleOption(opt.value)}
                >
                    <span class="material-symbols-outlined text-blue-500 text-[18px]">add_circle</span>
                    <span class="text-sm font-medium text-on-surface">{opt.label}</span>
                </div>
            {/each}
        </div>
    {:else if open && filteredOptions.length === 0}
        <div class="absolute z-50 w-full mt-2 bg-surface-container-lowest border border-surface-container shadow-xl rounded-xl p-4 text-center">
            <p class="text-xs font-bold text-on-surface-variant">Tidak ada hasil ditemukan</p>
        </div>
    {/if}
</div>
