import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';

export interface AppNotification {
	id: string;
	title: string;
	message: string;
	type: 'INFO' | 'WARNING' | 'CRITICAL';
	timestamp: string;
	isRead?: boolean;
}

export interface ToastMessage extends AppNotification {
	toastId: string;
}

// Stores
export const notificationsStore = writable<AppNotification[]>([]);
export const unreadCount = writable<number>(0);
export const activeToasts = writable<ToastMessage[]>([]);

let pollingInterval: any;
let lastKnownNotifIds = new Set<string>();

export function initNotificationPolling() {
	if (!browser) return;
	
	// Fetch immediately
	fetchNotifications(true);

	// Then poll every 10 seconds
	if (pollingInterval) clearInterval(pollingInterval);
	pollingInterval = setInterval(() => fetchNotifications(false), 10000);
}

export function stopNotificationPolling() {
	if (pollingInterval) clearInterval(pollingInterval);
}

async function fetchNotifications(isInitial: boolean) {
	try {
		const res = await fetch('/api/fms/notifications');
		if (!res.ok) return;
		const data = await res.json();
		
		if (data.success && data.notifications) {
			const fetchedNotifs: AppNotification[] = data.notifications;
			
			const currentUnread = get(unreadCount);
			let newUnreadCount = currentUnread;
			let hasNewItems = false;
			
			// Detect new notifications that we haven't seen before
			for (const n of fetchedNotifs) {
				if (!lastKnownNotifIds.has(n.id)) {
					lastKnownNotifIds.add(n.id);
					hasNewItems = true;
					
					// If this is not the first load, trigger a Toast!
					if (!isInitial) {
						newUnreadCount++;
						spawnToast(n);
					}
				}
			}

			// On initial load, if there are notifications, we just mark some as unread if we want,
			// but usually we just set unread to 0 initially or based on localstorage.
			// For simplicity, let's just use the server list.
			notificationsStore.set(fetchedNotifs);
			
			if (!isInitial && hasNewItems) {
				unreadCount.set(newUnreadCount);
			}
		}
	} catch (e) {
		console.error('Polling notifications failed', e);
	}
}

export function spawnToast(notif: AppNotification) {
	const toast: ToastMessage = {
		...notif,
		toastId: Math.random().toString(36).substring(2, 9)
	};
	
	activeToasts.update(toasts => [...toasts, toast]);
	
	// Auto remove after 5 seconds
	setTimeout(() => {
		removeToast(toast.toastId);
	}, 5000);
}

export function removeToast(toastId: string) {
	activeToasts.update(toasts => toasts.filter(t => t.toastId !== toastId));
}

export function markAllAsRead() {
	unreadCount.set(0);
}
