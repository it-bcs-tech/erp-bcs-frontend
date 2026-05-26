<script lang="ts">
	import '../app.css';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { page } from '$app/stores';
	import { activeToasts, removeToast } from '$lib/stores/notifications';
	import { fade, fly } from 'svelte/transition';
	
	let { children } = $props();
</script>

{#if !$page.url.pathname.startsWith('/login')}
	<Header />
{/if}

{@render children()}

{#if !$page.url.pathname.startsWith('/login')}
	<Footer />
{/if}

<!-- Global Toast Container -->
<div class="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
	{#each $activeToasts as toast (toast.toastId)}
		<div 
			in:fly={{ y: 20, duration: 300 }} 
			out:fade={{ duration: 200 }}
			class="pointer-events-auto w-80 bg-surface-container-lowest rounded-xl shadow-2xl border flex overflow-hidden
				{toast.type === 'CRITICAL' ? 'border-rose-500/50' : toast.type === 'WARNING' ? 'border-amber-500/50' : 'border-blue-500/50'}"
		>
			<div class="w-1.5 {toast.type === 'CRITICAL' ? 'bg-rose-500' : toast.type === 'WARNING' ? 'bg-amber-500' : 'bg-blue-500'}"></div>
			<div class="p-4 flex gap-3 items-start flex-1">
				<span class="material-symbols-outlined mt-0.5 {toast.type === 'CRITICAL' ? 'text-rose-500' : toast.type === 'WARNING' ? 'text-amber-500' : 'text-blue-500'}">
					{toast.type === 'CRITICAL' ? 'error' : toast.type === 'WARNING' ? 'warning' : 'info'}
				</span>
				<div class="flex-1">
					<h4 class="text-sm font-bold text-on-surface">{toast.title}</h4>
					<p class="text-xs text-on-surface-variant mt-0.5 leading-relaxed">{toast.message}</p>
				</div>
				<button onclick={() => removeToast(toast.toastId)} class="text-on-surface-variant hover:text-on-surface transition-colors flex-shrink-0">
					<span class="material-symbols-outlined text-sm">close</span>
				</button>
			</div>
		</div>
	{/each}
</div>
