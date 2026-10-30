/**
 * RBAC Navigation Utility — Global Route & Menu Access Verification
 * ─────────────────────────────────────────────────────────────────
 * Memverifikasi hak akses pengguna terhadap URL tujuan (modul & sub-menu)
 * untuk digunakan pada client-side interceptor maupun server-side route guard.
 */

import type { AuthUser } from '$lib/types/auth';
import { MODULE_MENUS, OCS_MIN_LEVEL_SEQUENCE } from '$lib/types/auth';
import { hasModuleAccess, hasMenuAccess } from '$lib/stores/auth';

export const MODULE_ROUTES = [
	'fms',
	'maintenance',
	'ocs',
	'hris',
	'marketing',
	'pms',
	'kasir',
	'finance',
	'dms',
	'qhse',
	'ga'
] as const;

export type ModuleRoute = (typeof MODULE_ROUTES)[number];

export const MODULE_NAMES: Record<string, string> = {
	fms: 'Fleet Management System (FMS)',
	maintenance: 'Workshop & Maintenance',
	ocs: 'Operations Control System (OCS)',
	hris: 'Human Capital (HRIS)',
	marketing: 'Marketing & Contracts',
	pms: 'Procurement Management System (PMS)',
	kasir: 'Cashier & Settlement (Kasir)',
	finance: 'Finance & Accounting',
	dms: 'Document Management System (DMS)',
	qhse: 'QHSE & Safety',
	ga: 'General Affair (GA)'
};

export interface AccessCheckResult {
	allowed: boolean;
	moduleCode?: string;
	moduleName?: string;
	menuId?: string;
	targetName?: string;
	reason?: string;
}

/**
 * Mencocokkan pathname ke sub-menu ID yang terdaftar di MODULE_MENUS
 */
export function resolveMenuId(moduleCode: string, pathname: string): { menuId: string; menuName: string } | null {
	const menus = MODULE_MENUS[moduleCode];
	if (!menus || menus.length === 0) return null;

	const cleanPath = pathname.split('?')[0].split('#')[0].replace(/\/+$/, '');
	const pathParts = cleanPath.split('/').filter(Boolean);

	// Kasus khusus modul DMS
	if (moduleCode === 'dms') {
		if (cleanPath.includes('/transactions/documents/create')) {
			return { menuId: 'dms.register', menuName: 'Register Document' };
		}
		if (cleanPath.includes('/transactions/documents')) {
			return { menuId: 'dms.documents', menuName: 'All Documents' };
		}
		if (cleanPath.includes('/master/types')) {
			return { menuId: 'dms.master-types', menuName: 'Document Types' };
		}
		if (cleanPath.includes('/master/locations')) {
			return { menuId: 'dms.master-locations', menuName: 'Storage Locations' };
		}
		if (cleanPath.includes('/master/issuers')) {
			return { menuId: 'dms.master-issuers', menuName: 'Issuing Authorities' };
		}
		if (cleanPath.includes('/master/notaries')) {
			return { menuId: 'dms.master-notaries', menuName: 'Notaries' };
		}
		if (cleanPath === '/dms' || cleanPath === '/dms/dashboard') {
			return { menuId: 'dms.dashboard', menuName: 'Overview & Horizon' };
		}
	}

	// Kasus khusus modul PMS: /pms/transactions/pr -> pms.transactions-pr, /pms/master/vendors -> pms.master-vendors
	if (moduleCode === 'pms' && pathParts.length >= 3) {
		const combined = `${moduleCode}.${pathParts[1]}-${pathParts[2]}`;
		const match = menus.find((m) => m.id === combined);
		if (match) return { menuId: match.id, menuName: match.name };
	}

	// Kasus standar: pathParts[1] (misal: /fms/vehicles -> fms.vehicles)
	if (pathParts.length > 1) {
		const candidateId = `${moduleCode}.${pathParts[1]}`;
		const match = menus.find((m) => m.id === candidateId);
		if (match) return { menuId: match.id, menuName: match.name };
	}

	// Kasus default overview / dashboard
	const defaultMenu = menus.find((m) => m.id === `${moduleCode}.overview` || m.id === `${moduleCode}.dashboard`);
	if (defaultMenu && pathParts.length <= 1) {
		return { menuId: defaultMenu.id, menuName: defaultMenu.name };
	}

	return null;
}

/**
 * Memeriksa hak akses untuk URL/pathname tertentu.
 * Mengembalikan `{ allowed: true }` jika berhak, atau detail penolakan jika tidak berhak.
 */
export function checkUrlAccess(urlOrPath: string, user: AuthUser | null): AccessCheckResult {
	if (!user) {
		return {
			allowed: false,
			targetName: 'Sistem ERP BCS',
			reason: 'Sesi login telah berakhir atau pengguna belum terotentikasi.'
		};
	}

	// Administrator selalu diizinkan
	if (['superadmin', 'administrator', 'superhyperadmin', 'super_admin'].includes(user.role?.toLowerCase())) {
		return { allowed: true };
	}

	// Parsing pathname
	let pathname = urlOrPath;
	try {
		if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://')) {
			const parsed = new URL(urlOrPath);
			pathname = parsed.pathname;
		}
	} catch {
		// Gunakan string mentah jika parsing URL gagal
	}

	// Normalisasi: buang query, hash, dan suffix SvelteKit __data.json
	pathname = pathname.split('?')[0].split('#')[0].replace('/__data.json', '').replace(/\/+$/, '') || '/';

	// Cari apakah pathname mengarah ke salah satu modul ERP
	const targetModule = MODULE_ROUTES.find(
		(mod) => pathname === `/${mod}` || pathname.startsWith(`/${mod}/`)
	);

	// Jika bukan route modul ERP (misal: '/', '/profile', '/settings'), izinkan
	if (!targetModule) {
		return { allowed: true };
	}

	const moduleLabel = MODULE_NAMES[targetModule] || targetModule.toUpperCase();

	// 1. Cek aturan khusus hierarki OCS (minimal Supervisor / sequence 4)
	if (targetModule === 'ocs' && typeof user.levelSequence === 'number' && user.levelSequence < OCS_MIN_LEVEL_SEQUENCE) {
		return {
			allowed: false,
			moduleCode: targetModule,
			moduleName: moduleLabel,
			targetName: `${moduleLabel}`,
			reason: `Akses modul OCS dibatasi hanya untuk posisi minimal Supervisor atau ke atas (Hierarki Level ${user.levelSequence} < 4).`
		};
	}

	// 2. Cek hak akses modul dasar
	if (!hasModuleAccess(user, targetModule)) {
		return {
			allowed: false,
			moduleCode: targetModule,
			moduleName: moduleLabel,
			targetName: `Modul ${moduleLabel}`,
			reason: `Akun Anda belum diberikan izin akses ke modul ${moduleLabel}. Silakan hubungi Tim IT Developer atau Administrator BCS.`
		};
	}

	// 3. Cek hak akses sub-menu jika ada
	const resolvedMenu = resolveMenuId(targetModule, pathname);
	if (resolvedMenu) {
		if (!hasMenuAccess(user, targetModule, resolvedMenu.menuId)) {
			return {
				allowed: false,
				moduleCode: targetModule,
				moduleName: moduleLabel,
				menuId: resolvedMenu.menuId,
				targetName: `Menu ${resolvedMenu.menuName} (${moduleLabel})`,
				reason: `Akun Anda memiliki akses ke modul ${moduleLabel}, namun belum diberikan izin untuk mengakses menu "${resolvedMenu.menuName}".`
			};
		}
	}

	return { allowed: true };
}
