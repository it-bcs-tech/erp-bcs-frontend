/**
 * Admin Users — Server-Side Data Loader & Actions
 * ═══════════════════════════════════════════════════════════
 * Load (GET):
 *   Prioritas 1: Laravel API (GET /api/v1/admin/users)
 *   Prioritas 2: Direct PostgreSQL Fallback (master.erp_users)
 *
 * Actions (Create, Update, Toggle):
 *   Prioritas 1: Laravel API (POST/PUT/PATCH)
 *   Prioritas 2: Direct PostgreSQL Fallback (master.erp_users)
 * ═══════════════════════════════════════════════════════════
 */

import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';
import bcrypt from 'bcryptjs';
import { env } from '$env/dynamic/private';
import { logError } from '$lib/utils/logger';
import { ADMIN_ROLES } from '$lib/types/auth';

const API_BASE_URL = env.API_URL || 'http://backend:9000';

/**
 * Helper untuk normalisasi dan parsing allowed_modules yang aman dan recursive
 */
function parseAllowedModules(val: any): string[] {
	if (!val) return [];
	if (Array.isArray(val)) return val;
	if (typeof val === 'string') {
		try {
			let parsed = JSON.parse(val);
			if (typeof parsed === 'string') parsed = JSON.parse(parsed);
			if (Array.isArray(parsed)) return parsed;
		} catch {
			return [];
		}
	}
	return [];
}

/**
 * Menghasilkan hash bcrypt standar PHP ($2y$) agar kompatibel 100% dengan Laravel BcryptHasher
 */
async function hashPassword(password: string): Promise<string> {
	const rawHash = await bcrypt.hash(password, 12);
	if (rawHash.startsWith('$2a$') || rawHash.startsWith('$2b$')) {
		return '$2y$' + rawHash.slice(4);
	}
	return rawHash;
}

// ─────────────────────────────────────────────────────────
// Helper: Panggil Laravel API dengan timeout & error handling
// ─────────────────────────────────────────────────────────
async function tryLaravelApi(
	method: string,
	endpoint: string,
	authToken?: string,
	body?: any
): Promise<{ ok: boolean; status: number; data?: any; error?: string }> {
	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 8000);

		const apiUrl = `${API_BASE_URL}${endpoint}`;
		console.log(`🔗 [AdminUsers] ${method} ${apiUrl}`);

		const headers: Record<string, string> = { 'Accept': 'application/json' };
		if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
		if (body) headers['Content-Type'] = 'application/json';

		const response = await fetch(apiUrl, {
			method,
			headers,
			body: body ? JSON.stringify(body) : undefined,
			signal: controller.signal
		});

		clearTimeout(timeoutId);

		const textResponse = await response.text();
		console.log(`📡 [AdminUsers] Response Status: ${response.status}`);

		let jsonStr = textResponse.trim();
		const realJsonStart = jsonStr.lastIndexOf('{"status"');
		if (realJsonStart > 0) jsonStr = jsonStr.substring(realJsonStart);

		let json: any = {};
		try { json = JSON.parse(jsonStr); } catch { /* silent */ }

		if (response.ok && (json.status === 'success' || !json.status || json.message)) {
			console.log(`✅ [AdminUsers] Laravel ${method} ${endpoint} success`);
			return { ok: true, status: response.status, data: json.data || json };
		} else {
			return { 
				ok: false, 
				status: response.status, 
				error: json.message || json.error || `API returned status ${response.status}` 
			};
		}
	} catch (error: any) {
		logError('ADMIN_API_FAIL', `Laravel ${method} ${endpoint} unreachable`, error?.message);
		return { ok: false, status: 0, error: error?.message || 'Network error' };
	}
}

// ─────────────────────────────────────────────────────────
// Helper: Fallback Query Users Langsung dari PostgreSQL
// ─────────────────────────────────────────────────────────
async function getUsersFromDatabase() {
	const dbUsers = await sql`
		SELECT 
			u.id,
			u.email,
			u.erp_role,
			u.allowed_modules,
			u.is_active,
			u.karyawan_id,
			k.nama_karyawan,
			k.payroll_id,
			d.div_name as division,
			t.title as title_name
		FROM master.erp_users u
		LEFT JOIN master.m_karyawan k ON k.id = u.karyawan_id
		LEFT JOIN master.m_division d ON d.div_code = k.div_id
		LEFT JOIN master.m_title t ON t.title_code = k.title
		ORDER BY u.id ASC
	`;

	return dbUsers.map((u: any) => ({
		id: Number(u.id),
		email: u.email,
		erp_role: u.erp_role,
		allowed_modules: parseAllowedModules(u.allowed_modules),
		is_active: Boolean(u.is_active),
		karyawan_id: u.karyawan_id ? Number(u.karyawan_id) : null,
		nama_karyawan: u.nama_karyawan || u.email,
		payroll_id: u.payroll_id || '-',
		division: u.division || '-',
		title_name: u.title_name || '-'
	}));
}

// ─────────────────────────────────────────────────────────
// LOAD: GET Users List
// ─────────────────────────────────────────────────────────
export const load: PageServerLoad = async ({ cookies, parent }) => {
	const { user } = await parent();

	// Proteksi Halaman: Hanya Super Admin / Administrator yang dapat mengakses
	const isSuperAdmin = user && (ADMIN_ROLES.includes(user.role) || ['superadmin', 'superhyperadmin', 'super_admin', 'administrator'].includes(user.role));
	if (!isSuperAdmin) {
		throw redirect(303, '/');
	}

	const authToken = cookies.get('auth_token');
	const { getDynamicRoleModuleMap } = await import('$lib/server/auth');
	const roleModuleMap = await getDynamicRoleModuleMap();

	// Prioritas 1: Laravel API
	if (authToken) {
		const apiResult = await tryLaravelApi('GET', '/api/v1/admin/users', authToken);
		if (apiResult.ok && apiResult.data) {
			const users = (apiResult.data as any[]).map((u: any) => ({
				...u,
				allowed_modules: parseAllowedModules(u.allowed_modules)
			}));
			return { usersList: users, dataSource: 'laravel' as const, roleModuleMap };
		}
	}

	// Prioritas 2: Fallback ke PostgreSQL langsung
	try {
		console.log('🔄 [AdminUsers] Loading users from PostgreSQL database fallback...');
		const usersList = await getUsersFromDatabase();
		return { usersList, dataSource: 'svelte-db' as const, roleModuleMap };
	} catch (dbErr: any) {
		console.error('❌ [AdminUsers] Database fallback error:', dbErr?.message);
		return { usersList: [], dataSource: 'svelte-db' as const, error: 'Gagal memuat data pengguna', roleModuleMap };
	}
};

// ─────────────────────────────────────────────────────────
// ACTIONS
// ─────────────────────────────────────────────────────────
export const actions = {
	// ── CREATE NEW USER ──
	create: async ({ request, cookies }) => {
		const data = await request.formData();
		const email = data.get('email')?.toString().trim();
		const password = data.get('password')?.toString();
		const role = data.get('role')?.toString().trim();
		const karyawanId = data.get('karyawan_id')?.toString();
		const customModulesStr = data.get('allowed_modules')?.toString() || '[]';
		const modulesArray = parseAllowedModules(customModulesStr);

		if (!email || !password || !role) {
			return fail(400, { success: false, message: 'Email, password, dan role wajib diisi' });
		}

		const authToken = cookies.get('auth_token');

		// Prioritas 1: Laravel API
		if (authToken) {
			const apiResult = await tryLaravelApi('POST', '/api/v1/admin/users', authToken, {
				email, password, role,
				karyawan_id: karyawanId ? Number(karyawanId) : null,
				allowed_modules: modulesArray
			});

			if (apiResult.ok) {
				return { success: true, message: 'User berhasil dibuat (Laravel API)' };
			}
		}

		// Prioritas 2: Fallback ke PostgreSQL Langsung
		try {
			const hashedPassword = await hashPassword(password);
			
			await sql`
				INSERT INTO master.erp_users (
					email, password, erp_role, karyawan_id, allowed_modules, is_active, created_at, updated_at
				) VALUES (
					${email}, 
					${hashedPassword}, 
					${role}, 
					${karyawanId ? Number(karyawanId) : null}, 
					${JSON.stringify(modulesArray)}::jsonb, 
					true, 
					CURRENT_TIMESTAMP, 
					CURRENT_TIMESTAMP
				)
			`;

			return { success: true, message: 'User berhasil dibuat di database' };
		} catch (dbErr: any) {
			console.error('❌ [AdminUsers DB Create Error]:', dbErr?.message);
			return fail(500, { success: false, message: 'Gagal membuat user: ' + (dbErr?.message || 'Database error') });
		}
	},

	// ── UPDATE USER ──
	update: async ({ request, cookies }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();
		const role = data.get('role')?.toString().trim();
		const customModulesStr = data.get('allowed_modules')?.toString() || '[]';
		const resetPassword = data.get('reset_password')?.toString();
		const modulesArray = parseAllowedModules(customModulesStr);

		if (!id || !role) {
			return fail(400, { success: false, message: 'ID dan role wajib diisi' });
		}

		const authToken = cookies.get('auth_token');

		// Prioritas 1: Laravel API
		if (authToken) {
			const apiResult = await tryLaravelApi('PUT', `/api/v1/admin/users/${id}`, authToken, {
				role,
				allowed_modules: modulesArray,
				reset_password: resetPassword || ''
			});

			if (apiResult.ok) {
				return { success: true, message: 'User berhasil diperbarui (Laravel API)' };
			}
		}

		// Prioritas 2: Fallback ke PostgreSQL Langsung
		try {
			if (resetPassword && resetPassword.trim()) {
				const hashedPassword = await hashPassword(resetPassword.trim());
				await sql`
					UPDATE master.erp_users 
					SET erp_role = ${role}, 
					    allowed_modules = ${JSON.stringify(modulesArray)}::jsonb, 
					    password = ${hashedPassword}, 
					    updated_at = CURRENT_TIMESTAMP
					WHERE id = ${id}
				`;
			} else {
				await sql`
					UPDATE master.erp_users 
					SET erp_role = ${role}, 
					    allowed_modules = ${JSON.stringify(modulesArray)}::jsonb, 
					    updated_at = CURRENT_TIMESTAMP
					WHERE id = ${id}
				`;
			}

			return { success: true, message: 'User berhasil diperbarui di database' };
		} catch (dbErr: any) {
			console.error('❌ [AdminUsers DB Update Error]:', dbErr?.message);
			return fail(500, { success: false, message: 'Gagal memperbarui user: ' + (dbErr?.message || 'Database error') });
		}
	},

	// ── TOGGLE ACTIVE STATUS ──
	toggleStatus: async ({ request, cookies }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();
		const currentStatus = data.get('current_status') === 'true';

		if (!id) {
			return fail(400, { success: false, message: 'User ID wajib diisi' });
		}

		const authToken = cookies.get('auth_token');

		// Prioritas 1: Laravel API
		if (authToken) {
			const apiResult = await tryLaravelApi('PATCH', `/api/v1/admin/users/${id}/toggle-status`, authToken, {
				current_status: currentStatus
			});

			if (apiResult.ok) {
				const newStatus = !currentStatus;
				return { success: true, message: `User berhasil ${newStatus ? 'diaktifkan' : 'dinonaktifkan'} (Laravel API)` };
			}
		}

		// Prioritas 2: Fallback ke PostgreSQL Langsung
		try {
			const newStatus = !currentStatus;
			await sql`
				UPDATE master.erp_users 
				SET is_active = ${newStatus}, updated_at = CURRENT_TIMESTAMP
				WHERE id = ${id}
			`;

			return { success: true, message: `User berhasil ${newStatus ? 'diaktifkan' : 'dinonaktifkan'} di database` };
		} catch (dbErr: any) {
			console.error('❌ [AdminUsers DB Toggle Error]:', dbErr?.message);
			return fail(500, { success: false, message: 'Gagal mengubah status user: ' + (dbErr?.message || 'Database error') });
		}
	}
} satisfies Actions;
