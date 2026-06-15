import { redirect, type Handle } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { hasModuleAccess } from '$lib/stores/auth';
import type { AuthUser } from '$lib/types/auth';
import { ADMIN_ROLES } from '$lib/types/auth';

// ─────────────────────────────────────────────────────────────────
// DEV_BYPASS: set true untuk skip auth check di development mode
// Set false atau hapus sebelum deploy ke production
// ─────────────────────────────────────────────────────────────────
const DEV_BYPASS = dev;

// Daftar route modul yang perlu dicek hak akses
const MODULE_ROUTES = ['fms', 'ocs', 'hris', 'marketing', 'pms', 'kasir', 'finance', 'dms', 'qhse'];

export const handle: Handle = async ({ event, resolve }) => {
	const authToken = event.cookies.get('auth_token');
	const pathname  = event.url.pathname;
	const isLoginPage       = pathname.startsWith('/login');
	const isLogoutEndpoint  = pathname.startsWith('/logout');
	const isApiRoute        = pathname.startsWith('/api');
	const isAdminRoute      = pathname.startsWith('/admin');

	// Biarkan logout dan API berjalan tanpa guard
	if (isLogoutEndpoint || isApiRoute) {
		return resolve(event);
	}

	// DEV MODE: bypass auth untuk semua route (untuk uji coba direct DB)
	if (DEV_BYPASS && !isLoginPage && !isAdminRoute) {
		// Pengecualian: Admin route tetap dicek authnya meskipun dev bypass aktif
		// agar dev bisa ngetes fitur admin
		return resolve(event);
	}

	// Jika pengguna belum login, arahkan ke halaman login
	if (!authToken && !isLoginPage) {
		return redirect(303, '/login');
	}

	// Jika pengguna sudah login tapi membuka halaman login, arahkan ke home
	if (authToken && isLoginPage) {
		return redirect(303, '/');
	}

	// ── Pengecekan Khusus Route Admin ──
	if (authToken && isAdminRoute) {
		const userDataCookie = event.cookies.get('user_data');
		if (userDataCookie) {
			try {
				const user: AuthUser = JSON.parse(userDataCookie);
				if (!ADMIN_ROLES.includes(user.role)) {
					// Tolak akses jika bukan admin
					return redirect(303, '/?access_denied=system_admin');
				}
			} catch {
				return redirect(303, '/login');
			}
		} else {
			return redirect(303, '/login');
		}
	}

	// ── Cek hak akses modul ──
	if (authToken && !DEV_BYPASS) {
		const requestedModule = MODULE_ROUTES.find((m) => pathname.startsWith('/' + m));

		if (requestedModule) {
			const userDataCookie = event.cookies.get('user_data');
			if (userDataCookie) {
				try {
					const user: AuthUser = JSON.parse(userDataCookie);
					if (!hasModuleAccess(user, requestedModule)) {
						return redirect(303, '/?access_denied=' + requestedModule);
					}
				} catch {
					// Cookie corrupt
				}
			}
		}
	}

	return resolve(event);
};

// ─────────────────────────────────────────────────────────────────
// GEOFENCE AUTO-PILOT BACKGROUND WORKER
// ─────────────────────────────────────────────────────────────────
import { runGeofenceEngine } from '$lib/server/geofence';

const globalStore = globalThis as any;
if (!globalStore.__geofenceCronStarted) {
	globalStore.__geofenceCronStarted = true;
	console.log('[CRON] Geofence Auto-Pilot initialized.');

	const runCron = async () => {
		try {
			await runGeofenceEngine();
		} catch (e) {
			console.error('[CRON] Geofence Auto-Pilot Error:', e);
		}
	};

	// Run every 2 minutes
	setInterval(runCron, 2 * 60 * 1000);
}
