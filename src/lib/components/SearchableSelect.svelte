<script lang="ts">
    let { 
        options = [], // Expected format: { value: string|number, label: string }[]
        value = $bindable(), 
        placeholder = 'Search & Select...',
        class: className = '' 
    } = $props();

    let search = $state('');
    let open = $state(false);
    let containerNode: HTMLElement;
    let inputNode: HTMLInputElement;
    
    const filteredOptions = $derived(
        options.filter(opt => opt.label.toLowerCase().includes(search.toLowerCase()))
    );

    const selectedLabel = $derived(
        options.find(opt => opt.value === value)?.label || ''
    );

    function selectOption(opt: any) {
        value = opt.value;
        open = false;
        search = '';
    }

    function toggleOpen() {
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
</script>

<svelte:window onclick={handleOutsideClick} />

<div class="relative w-full {className}" bind:this={containerNode}>
    <button 
        type="button" 
        class="w-full text-left bg-surface-container rounded-xl px-4 py-2.5 text-sm font-medium border-none focus:ring-2 focus:ring-primary outline-none flex justify-between items-center transition-all"
        onclick={toggleOpen}
    >
        <span class="truncate {value ? 'text-on-surface' : 'text-on-surface-variant'}">
            {value ? selectedLabel : placeholder}
        </span>
        <span class="material-symbols-outlined text-[18px] text-on-surface-variant">
            {open ? 'expand_less' : 'expand_more'}
        </span>
    </button>

    {#if open}
        <div class="absolute z-50 mt-1 w-full bg-surface-container-highest border border-surface-variant/20 rounded-xl shadow-lg max-h-60 flex flex-col overflow-hidden">
            <div class="p-2 border-b border-surface-variant/20">
                <input 
                    type="text" 
                    bind:value={search} 
                    bind:this={inputNode}
                    placeholder="Search..." 
                    class="w-full bg-surface-container rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary text-on-surface"
                />
            </div>
            <ul class="overflow-y-auto flex-1 p-1">
                {#if filteredOptions.length === 0}
                    <li class="px-3 py-2 text-xs text-on-surface-variant text-center">No results found</li>
                {/if}
                {#each filteredOptions as opt}
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                    <li 
                        class="px-3 py-2 text-sm rounded-lg cursor-pointer hover:bg-primary/10 transition-colors {value === opt.value ? 'bg-primary/10 text-primary font-bold' : 'text-on-surface'}"
                        onclick={() => selectOption(opt)}
                    >
                        {opt.label}
                    </li>
                {/each}
            </ul>
        </div>
    {/if}
</div>
