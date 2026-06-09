/**
 * Auth Store — Client-Side Authentication State
 * ─────────────────────────────────────────────────────────
 * Menyimpan data user yang sedang login di client-side.
 * Di-hydrate dari data yang dikirim oleh +layout.server.ts.
 *
 * Menggunakan Svelte writable stores (kompatibel dengan Svelte 5).
 */

import { writable, derived } from 'svelte/store';
import type { AuthUser, ModuleId } from '$lib/types/auth';
import { OCS_MIN_LEVEL_SEQUENCE } from '$lib/types/auth';

// ─────────────────────────────────────────────────────────
// Store: User yang sedang login
// ─────────────────────────────────────────────────────────
export const authUser = writable<AuthUser | null>(null);

// ─────────────────────────────────────────────────────────
// Derived: Shortcut booleans
// ─────────────────────────────────────────────────────────

/** Apakah user sudah login */
export const isLoggedIn = derived(authUser, ($user) => $user !== null);

/** Apakah user adalah admin (superadmin/superhyperadmin) */
export const isAdmin = derived(authUser, ($user) =>
	$user ? ['superadmin', 'superhyperadmin'].includes($user.role) : false
);

/** Nama display user */
export const displayName = derived(authUser, ($user) => $user?.name ?? 'Guest');

/** Inisial untuk avatar */
export const userInitials = derived(authUser, ($user) => {
	if (!$user?.name) return '?';
	const parts = $user.name.split(' ').filter(Boolean);
	if (parts.length >= 2) {
		return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
	}
	return parts[0][0].toUpperCase();
});

// ─────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────

/**
 * Cek apakah user punya akses ke modul tertentu.
 * Digunakan untuk filtering modul cards di homepage
 * dan route guard di client-side.
 */
export function hasModuleAccess(user: AuthUser | null, moduleId: string): boolean {
	if (!user) return false;
	return user.allowedModules.includes(moduleId as ModuleId);
}

/**
 * Mendapatkan label display yang friendly untuk role
 */
export function getRoleLabel(role: string): string {
	const labels: Record<string, string> = {
		superhyperadmin: 'Super Administrator',
		superadmin: 'Administrator',
		manager: 'Manager',
		supervisor: 'Supervisor',
		hr: 'Human Resources',
		user: 'User',
		karyawan: 'Karyawan'
	};
	return labels[role] || role;
}

/**
 * Mendapatkan warna badge untuk role
 */
export function getRoleBadgeColor(role: string): { bg: string; text: string } {
	const colors: Record<string, { bg: string; text: string }> = {
		superhyperadmin: { bg: 'bg-amber-100', text: 'text-amber-800' },
		superadmin: { bg: 'bg-purple-100', text: 'text-purple-800' },
		manager: { bg: 'bg-blue-100', text: 'text-blue-800' },
		supervisor: { bg: 'bg-teal-100', text: 'text-teal-800' },
		hr: { bg: 'bg-rose-100', text: 'text-rose-800' },
		user: { bg: 'bg-slate-100', text: 'text-slate-700' },
		karyawan: { bg: 'bg-slate-100', text: 'text-slate-700' }
	};
	return colors[role] || { bg: 'bg-slate-100', text: 'text-slate-700' };
}
