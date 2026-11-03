/**
 * Global Sidebar Store — BCS Logistics ERP
 * ─────────────────────────────────────────────────────────
 * Mengelola status buka-tutup (collapse/expand) sidebar navigasi modul.
 * Terintegrasi dengan localStorage sehingga preferensi pengguna tersinkronisasi
 * di seluruh 11 modul ERP dan tetap terjaga saat refresh halaman.
 */

import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const STORAGE_KEY = 'bcs_erp_sidebar_expanded';

function createSidebarStore() {
	let initial = true;

	if (browser) {
		try {
			const saved = localStorage.getItem(STORAGE_KEY);
			if (saved !== null) {
				initial = saved === 'true';
			}
		} catch (e) {
			console.error('Error reading sidebar expanded state from localStorage:', e);
		}
	}

	const { subscribe, set, update } = writable<boolean>(initial);

	return {
		subscribe,
		toggle: () => {
			update((expanded) => {
				const next = !expanded;
				if (browser) {
					try {
						localStorage.setItem(STORAGE_KEY, String(next));
					} catch (e) {
						console.error('Error saving sidebar expanded state to localStorage:', e);
					}
				}
				return next;
			});
		},
		setExpanded: (expanded: boolean) => {
			if (browser) {
				try {
					localStorage.setItem(STORAGE_KEY, String(expanded));
				} catch (e) {
					console.error('Error saving sidebar expanded state to localStorage:', e);
				}
			}
			set(expanded);
		}
	};
}

export const isSidebarExpanded = createSidebarStore();
