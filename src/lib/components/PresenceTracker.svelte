<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { authUser } from '$lib/stores/auth';

	let lastInteractionTime = Date.now();
	let currentStatus: 'online' | 'idle' = 'online';
	let heartbeatInterval: any = null;
	let isLoggingOut = false;

	// Inactivity threshold: 5 minutes (300,000 ms)
	const IDLE_THRESHOLD_MS = 5 * 60 * 1000;
	// Ping interval: 35 seconds
	const PING_INTERVAL_MS = 35 * 1000;

	function registerUserActivity() {
		lastInteractionTime = Date.now();
		if (currentStatus === 'idle') {
			currentStatus = 'online';
			sendHeartbeat('online');
		}
	}

	async function sendHeartbeat(forcedStatus?: 'online' | 'idle') {
		if (!browser || isLoggingOut) return;

		const user = $page.data?.user || $authUser;
		if (!user) return;

		// Hitung status online vs idle
		const isIdle = Date.now() - lastInteractionTime > IDLE_THRESHOLD_MS;
		currentStatus = forcedStatus || (isIdle ? 'idle' : 'online');

		try {
			const res = await fetch('/api/presence/heartbeat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					path: $page.url.pathname,
					status: currentStatus
				})
			});

			if (res.ok) {
				const data = await res.json();
				if (data.force_logout && !isLoggingOut) {
					isLoggingOut = true;
					handleForcedLogout();
				}
			}
		} catch (err) {
			// Fail silently on network drop
		}
	}

	function handleForcedLogout() {
		// Hapus cookie sesi dan redirect ke login
		document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
		document.cookie = 'user_data=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
		window.location.href = '/login?reason=session_terminated';
	}

	onMount(() => {
		if (!browser) return;

		// Throttle event listener interaksi
		let throttleTimer: any = null;
		const handleActivity = () => {
			if (!throttleTimer) {
				registerUserActivity();
				throttleTimer = setTimeout(() => {
					throttleTimer = null;
				}, 3000);
			}
		};

		const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
		events.forEach((evt) => window.addEventListener(evt, handleActivity, { passive: true }));

		// Ping awal saat mount
		sendHeartbeat('online');

		// Heartbeat interval
		heartbeatInterval = setInterval(() => {
			sendHeartbeat();
		}, PING_INTERVAL_MS);

		return () => {
			events.forEach((evt) => window.removeEventListener(evt, handleActivity));
			if (heartbeatInterval) clearInterval(heartbeatInterval);
			if (throttleTimer) clearTimeout(throttleTimer);
		};
	});

	// Reaktif terhadap perubahan halaman/route
	let lastTrackedPath = '';
	$effect(() => {
		const currentPath = $page.url.pathname;
		if (browser && currentPath && currentPath !== lastTrackedPath) {
			lastTrackedPath = currentPath;
			registerUserActivity();
			sendHeartbeat('online');
		}
	});
</script>
