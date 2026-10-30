<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { beforeNavigate } from '$app/navigation';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import PresenceTracker from '$lib/components/PresenceTracker.svelte';
	import AccessDeniedModal from '$lib/components/AccessDeniedModal.svelte';
	import { page } from '$app/stores';
	import { activeToasts, removeToast } from '$lib/stores/notifications';
	import { authUser } from '$lib/stores/auth';
	import { systemSettings } from '$lib/stores/settings';
	import { checkUrlAccess } from '$lib/utils/rbacNavigation';
	import { fade, fly } from 'svelte/transition';
	
	let { data, children } = $props();

	// Hydrate auth store dari server layout data
	$effect(() => {
		if (data.user) {
			authUser.set(data.user);
		} else {
			authUser.set(null);
		}
	});

	// Hydrate global privacy settings dari database
	$effect(() => {
		if (data.privacySettings) {
			systemSettings.updateSettings(data.privacySettings);
		}
	});

	const currentUser = $derived(data.user || $authUser);

	// State Modal Hak Akses Global
	let isAccessDeniedModalOpen = $state(false);
	let deniedTargetName = $state('Modul');
	let deniedDescription = $state('');
	let deniedTitle = $state('Akses Terbatas');

	function triggerAccessDenied(targetName: string, reason: string) {
		deniedTargetName = targetName || 'Modul';
		deniedDescription = reason || '';
		deniedTitle = 'Akses Terbatas';
		isAccessDeniedModalOpen = true;
	}

	// Tangkap klik link <a> secara global (capture-phase) untuk mencegah tab baru / navigasi tidak berizin
	function handleGlobalLinkClick(event: MouseEvent) {
		const target = event.target as HTMLElement | null;
		if (!target) return;
		const anchor = target.closest('a') as HTMLAnchorElement | null;
		if (!anchor) return;

		const href = anchor.getAttribute('href');
		if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
			return;
		}

		// Periksa jika link mengarah ke path internal
		let targetPath = href;
		if (href.startsWith('http://') || href.startsWith('https://')) {
			try {
				const parsed = new URL(href);
				if (parsed.origin !== window.location.origin) {
					return; // Tautan ke domain eksternal tidak dicegat
				}
				targetPath = parsed.pathname + parsed.search + parsed.hash;
			} catch {
				return;
			}
		}

		const accessResult = checkUrlAccess(targetPath, currentUser);
		if (!accessResult.allowed) {
			event.preventDefault();
			event.stopPropagation();
			event.stopImmediatePropagation();
			triggerAccessDenied(accessResult.targetName || 'Modul', accessResult.reason || '');
		}
	}

	onMount(() => {
		window.addEventListener('click', handleGlobalLinkClick, true);
		return () => {
			window.removeEventListener('click', handleGlobalLinkClick, true);
		};
	});

	// Tangkap navigasi terprogram (misal goto())
	beforeNavigate(({ to, cancel }) => {
		if (!to) return;
		const targetPath = to.url.pathname + to.url.search + to.url.hash;
		const accessResult = checkUrlAccess(targetPath, currentUser);
		if (!accessResult.allowed) {
			cancel();
			triggerAccessDenied(accessResult.targetName || 'Modul', accessResult.reason || '');
		}
	});

	const isPrintRoute = $derived(
		$page.url.pathname.endsWith('/print') || 
		$page.url.pathname.includes('/print/') || 
		$page.url.searchParams.has('embedded')
	);

	const isStandaloneRoute = $derived(
		$page.url.pathname.startsWith('/login') || 
		isPrintRoute || 
		$page.url.pathname.startsWith('/p2h') ||
		$page.url.pathname.startsWith('/scan')
	);
</script>

{#if !isStandaloneRoute}
	<Header />
	<PresenceTracker />
{/if}

{@render children()}

{#if !isStandaloneRoute}
	<Footer />
{/if}

<!-- Global Access Denied Modal -->
<AccessDeniedModal
	bind:isOpen={isAccessDeniedModalOpen}
	title={deniedTitle}
	targetName={deniedTargetName}
	description={deniedDescription}
/>

<!-- Global Toast Container -->
{#if !isPrintRoute}
<div class="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
	{#each $activeToasts as toast (toast.toastId)}
		<div 
			in:fly={{ y: 20, duration: 300 }} 
			out:fade={{ duration: 200 }}
			class="pointer-events-auto w-80 bg-surface-container-lowest rounded-xl shadow-2xl border flex overflow-hidden
				{toast.type === 'CRITICAL' ? 'border-rose-500/50' : toast.type === 'WARNING' ? 'border-amber-500/50' : toast.type === 'SUCCESS' ? 'border-emerald-500/50' : 'border-blue-500/50'}"
		>
			<div class="w-1.5 {toast.type === 'CRITICAL' ? 'bg-rose-500' : toast.type === 'WARNING' ? 'bg-amber-500' : toast.type === 'SUCCESS' ? 'bg-emerald-500' : 'bg-blue-500'}"></div>
			<div class="p-4 flex gap-3 items-start flex-1">
				<span class="material-symbols-outlined mt-0.5 {toast.type === 'CRITICAL' ? 'text-rose-500' : toast.type === 'WARNING' ? 'text-amber-500' : toast.type === 'SUCCESS' ? 'text-emerald-500' : 'text-blue-500'}">
					{toast.type === 'CRITICAL' ? 'error' : toast.type === 'WARNING' ? 'warning' : toast.type === 'SUCCESS' ? 'check_circle' : 'info'}
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
{/if}
