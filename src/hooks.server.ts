import { redirect, type Handle } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { ADMIN_ROLES } from '$lib/types/auth';
import { verifyUserData } from '$lib/server/auth';
import { checkUrlAccess } from '$lib/utils/rbacNavigation';

// ─────────────────────────────────────────────────────────────────
// DEV_BYPASS: set true untuk skip auth check di development mode
// Set false atau hapus sebelum deploy ke production
// ─────────────────────────────────────────────────────────────────
const DEV_BYPASS = dev;


export const handle: Handle = async ({ event, resolve }) => {
	const authToken = event.cookies.get('auth_token');
	const pathname  = event.url.pathname;
	const isLoginPage       = pathname.startsWith('/login');
	const isLogoutEndpoint  = pathname.startsWith('/logout');
	const isApiRoute        = pathname.startsWith('/api');
	const isAdminRoute      = pathname.startsWith('/admin');
	const isScanRoute       = pathname.startsWith('/scan');

	// Populate event.locals.user dari cookie yang terverifikasi
	let currentUser: AuthUser | null = null;
	const userDataCookie = event.cookies.get('user_data');
	if (userDataCookie) {
		try {
			currentUser = verifyUserData(userDataCookie);
		} catch {
			currentUser = null;
		}
	}
	event.locals.user = currentUser;

	// Biarkan logout, API, dan Scan publik berjalan tanpa guard
	if (isLogoutEndpoint || isApiRoute || isScanRoute) {
		return resolve(event);
	}

	// DEV MODE: bypass auth untuk semua route (untuk uji coba direct DB)
	if (DEV_BYPASS && !isLoginPage && !isAdminRoute) {
		// Pengecualian: Admin route tetap dicek authnya meskipun dev bypass aktif
		// agar dev bisa ngetes fitur admin
		return resolve(event);
	}

	// Jika pengguna belum login, arahkan ke halaman login
	if (!authToken && !isLoginPage && !isScanRoute) {
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
				const user: AuthUser | null = verifyUserData(userDataCookie);
				if (!user) {
					// Invalid signature
					event.cookies.delete('auth_token', { path: '/' });
					event.cookies.delete('user_data', { path: '/' });
					return redirect(303, '/login');
				}
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

	// ── Cek hak akses modul & sub-menu secara terpadu ──
	if (authToken && !DEV_BYPASS) {
		const accessResult = checkUrlAccess(pathname, currentUser);
		if (!accessResult.allowed) {
			if (!currentUser) {
				event.cookies.delete('auth_token', { path: '/' });
				event.cookies.delete('user_data', { path: '/' });
				return redirect(303, '/login');
			}
			const deniedCode = accessResult.menuId || accessResult.moduleCode || 'module';
			return redirect(303, `/?access_denied=${deniedCode}`);
		}
	}

	return resolve(event);
};

// ─────────────────────────────────────────────────────────────────
// GEOFENCE AUTO-PILOT BACKGROUND WORKER
// ─────────────────────────────────────────────────────────────────
import { runGeofenceEngine } from '$lib/server/geofence';

const globalStore = globalThis as any;
if (typeof process !== 'undefined' && !process.env.__unhandledRejectionHandled) {
	process.env.__unhandledRejectionHandled = 'true';
	process.on('unhandledRejection', (reason: any) => {
		console.warn('[Server Network/DB Warning]:', reason?.message || reason);
	});
}

if (!dev && !globalStore.__geofenceCronStarted) {
	globalStore.__geofenceCronStarted = true;
	console.log('[CRON] Geofence Auto-Pilot initialized.');

	const runCron = async () => {
		try {
			await runGeofenceEngine();
		} catch (e) {
			console.warn('[CRON] Geofence Auto-Pilot Skipped:', (e as any)?.message || e);
		}
	};

	// Run every 2 minutes (Production only)
	setInterval(runCron, 2 * 60 * 1000);
}
