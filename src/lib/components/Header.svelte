<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';
	import { notificationsStore, unreadCount, initNotificationPolling, stopNotificationPolling, markAllAsRead } from '$lib/stores/notifications';
	import { clickOutside } from '$lib/utils/clickOutside';

	let isNotifOpen = $state(false);

	onMount(() => {
		initNotificationPolling();
	});

	onDestroy(() => {
		stopNotificationPolling();
	});

	function toggleNotifications() {
		isNotifOpen = !isNotifOpen;
		if (isNotifOpen) {
			markAllAsRead();
		}
	}

	async function handleLogout() {
		try {
			// Kirim request ke server untuk menghapus httpOnly cookie
			await fetch('/logout', { method: 'POST' });
		} catch {
			// Lanjutkan logout meski terjadi error jaringan
		} finally {
			// Navigasi ke halaman login secara eksplisit
			// Ini bekerja dengan andal di balik Nginx/Docker manapun
			window.location.replace('/login');
		}
	}
</script>

<header class="bg-slate-50/70 dark:bg-slate-900/70 backdrop-blur-xl docked full-width top-0 sticky z-50 flex justify-between items-center w-full px-6 py-3">
	<div class="flex items-center gap-8">
		<a href="/" class="text-xl font-bold text-[#57344f] dark:text-[#d1c3ca] block hover:opacity-80 transition-opacity">
			<img src="https://bcsgroup.co.id/assets/images/uploads/BCS%20Logistics%20HD.png" width="200" alt="BCS Logistics Logo" srcset="">
		</a>
		<nav class="hidden md:flex items-center gap-6">
			<a class="text-[#57344f] font-bold border-b-2 border-[#57344f] pb-1 text-sm" href="/">Main Dashboard</a>
			<a class="text-slate-500 dark:text-slate-400 hover:text-[#57344f] transition-colors text-sm" href="#">System Admin</a>
			<a class="text-slate-500 dark:text-slate-400 hover:text-[#57344f] transition-colors text-sm" href="#">Reports</a>
		</nav>
	</div>
	<div class="flex items-center gap-2">
		<div class="relative mr-4 hidden md:block">
			<span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">search</span>
			<input class="bg-surface-container-low border-none rounded-full py-1.5 pl-10 pr-4 text-sm w-64 focus:ring-2 focus:ring-primary/20 placeholder:text-on-surface-variant" placeholder="Search modules..." type="text"/>
		</div>
		<div class="relative" use:clickOutside={() => isNotifOpen = false}>
			<button onclick={toggleNotifications} class="p-2 text-slate-500 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-lg transition-all relative">
				<span class="material-symbols-outlined">notifications</span>
				{#if $unreadCount > 0}
					<span class="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-50 dark:border-slate-900 animate-pulse"></span>
				{/if}
			</button>

			<!-- Dropdown Menu -->
			{#if isNotifOpen}
				<div class="absolute right-0 mt-2 w-80 max-h-[80vh] bg-surface-container-lowest rounded-2xl shadow-xl border border-surface-container overflow-hidden flex flex-col z-50 animate-in fade-in zoom-in-95 duration-200">
					<div class="p-4 border-b border-surface-container flex items-center justify-between bg-surface-container-lowest sticky top-0">
						<h3 class="font-bold text-on-surface">Notification Center</h3>
						<span class="text-xs font-bold bg-primary-container text-on-primary-container px-2 py-0.5 rounded-full">{$notificationsStore.length}</span>
					</div>
					<div class="overflow-y-auto flex-1 p-2 space-y-1">
						{#if $notificationsStore.length === 0}
							<div class="p-6 text-center text-on-surface-variant flex flex-col items-center">
								<span class="material-symbols-outlined text-4xl mb-2 opacity-50">notifications_off</span>
								<p class="text-sm font-medium">All caught up!</p>
								<p class="text-xs mt-1">No recent system events.</p>
							</div>
						{:else}
							{#each $notificationsStore as notif}
								<div class="p-3 rounded-xl hover:bg-surface-container-low transition-colors border border-transparent hover:border-surface-container flex gap-3 items-start group cursor-pointer">
									<div class="flex-shrink-0 mt-0.5 w-8 h-8 rounded-full flex items-center justify-center 
										{notif.type === 'CRITICAL' ? 'bg-rose-100 text-rose-600' : notif.type === 'WARNING' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}">
										<span class="material-symbols-outlined text-[18px]">
											{notif.type === 'CRITICAL' ? 'error' : notif.type === 'WARNING' ? 'warning' : 'info'}
										</span>
									</div>
									<div class="flex-1">
										<h4 class="text-sm font-bold text-on-surface mb-0.5 flex justify-between">
											{notif.title}
											<span class="text-[10px] font-medium text-on-surface-variant mt-0.5">{new Date(notif.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
										</h4>
										<p class="text-xs text-on-surface-variant leading-relaxed line-clamp-3">{notif.message}</p>
									</div>
								</div>
							{/each}
						{/if}
					</div>
					<div class="p-2 border-t border-surface-container bg-surface-container-lowest sticky bottom-0">
						<button class="w-full text-center text-xs font-bold text-primary py-2 hover:bg-surface-container-low rounded-lg transition-colors">
							View All Activity
						</button>
					</div>
				</div>
			{/if}
		</div>
		<button class="p-2 text-slate-500 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-lg transition-all">
			<span class="material-symbols-outlined">apps</span>
		</button>
		<button onclick={handleLogout} title="Logout" class="p-2 text-red-500 hover:bg-red-100/50 dark:hover:bg-red-900/50 rounded-lg transition-all">
			<span class="material-symbols-outlined">logout</span>
		</button>
		<div class="ml-2 w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center border-2 border-surface-container-highest overflow-hidden">
			<span class="material-symbols-outlined text-on-primary-fixed text-[18px]">person</span>
		</div>
	</div>
</header>
