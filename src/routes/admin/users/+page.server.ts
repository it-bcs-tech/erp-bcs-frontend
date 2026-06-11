/**
 * Admin Users — Server-Side Data Loader & Actions
 * ═══════════════════════════════════════════════════════════
 * Load (GET):
 *   Prioritas 1: Laravel API (GET /api/v1/admin/users)
 *   Prioritas 2: Direct PostgreSQL (Svelte Fallback)
 *
 * Actions (Create, Update, Toggle):
 *   Prioritas 1: Laravel API (POST/PUT/PATCH)
 *   Prioritas 2: Direct PostgreSQL (Svelte Fallback)
 * ═══════════════════════════════════════════════════════════
 */

import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';
import bcrypt from 'bcryptjs';
import { env } from '$env/dynamic/private';
import { logError } from '$lib/utils/logger';

const API_BASE_URL = env.API_URL || 'http://backend:9000';

// ─────────────────────────────────────────────────────────
// Helper: Panggil Laravel API dengan fallback handling
// ─────────────────────────────────────────────────────────
async function tryLaravelApi(
	method: string,
	endpoint: string,
	authToken?: string,
	body?: any
): Promise<{ ok: boolean; status: number; data?: any; error?: string }> {
	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 10000);

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

		if (response.ok && json.status === 'success') {
			console.log(`✅ [AdminUsers] Laravel ${method} ${endpoint} success`);
			return { ok: true, status: response.status, data: json.data };
		} else if (response.status >= 400 && response.status < 500) {
			// Validation/auth error — JANGAN fallback
			return { ok: false, status: response.status, error: json.message || json.error || 'Request rejected by Laravel' };
		} else {
			// 5xx or bad JSON
			return { ok: false, status: response.status };
		}
	} catch (error: any) {
		logError('ADMIN_API_FAIL', `Laravel ${method} ${endpoint} unreachable`, error?.message);
		return { ok: false, status: 0 };
	}
}

function isLaravelDown(result: { ok: boolean; status: number }) {
	return !result.ok && (result.status === 0 || result.status >= 500);
}

// ─────────────────────────────────────────────────────────
// LOAD: GET Users List
// ─────────────────────────────────────────────────────────
export const load: PageServerLoad = async ({ cookies }) => {
	const authToken = cookies.get('auth_token');

	// PRIORITAS 1: Laravel API
	const apiResult = await tryLaravelApi('GET', '/api/v1/admin/users', authToken);

	if (apiResult.ok && apiResult.data) {
		return { usersList: apiResult.data, dataSource: 'laravel' as const };
	}

	// PRIORITAS 2: Fallback Svelte DB
	if (isLaravelDown(apiResult)) {
		console.warn('⚠️ [AdminUsers Fallback] Loading users from Svelte DB.');
		try {
			const usersList = await sql`
				SELECT 
					eu.id,
					eu.email,
					eu.erp_role,
					eu.allowed_modules,
					eu.is_active,
					eu.last_login_at,
					eu.created_at,
					mk.id AS karyawan_id,
					mk.payroll_id AS nik,
					mk.nama_karyawan,
					ml.level AS level_name,
					md.div_name
				FROM master.erp_users eu
				LEFT JOIN master.m_karyawan mk ON mk.id = eu.karyawan_id
				LEFT JOIN master.m_level ml ON ml.level_code = mk.level
				LEFT JOIN master.m_division md ON md.div_code = mk.div_id
				ORDER BY eu.id DESC
			`;
			return { usersList, dataSource: 'svelte-db' as const };
		} catch (error: any) {
			return { usersList: [], dataSource: 'svelte-db' as const, error: error.message };
		}
	}

	// Laravel returned 4xx (auth issue) — return empty with error
	return { usersList: [], dataSource: 'laravel' as const, error: apiResult.error };
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

		if (!email || !password || !role) {
			return fail(400, { success: false, message: 'Email, password, and role are required' });
		}

		const authToken = cookies.get('auth_token');

		// PRIORITAS 1: Laravel API
		const apiResult = await tryLaravelApi('POST', '/api/v1/admin/users', authToken, {
			email, password, role,
			karyawan_id: karyawanId ? Number(karyawanId) : null,
			allowed_modules: customModulesStr
		});

		if (apiResult.ok) {
			return { success: true, message: 'User successfully created' };
		}

		if (!isLaravelDown(apiResult)) {
			// Laravel rejected (400/401) — teruskan error
			return fail(apiResult.status, { success: false, message: apiResult.error || 'Failed to create user' });
		}

		// PRIORITAS 2: Fallback Svelte DB
		console.warn('⚠️ [AdminUsers Fallback] Creating user via Svelte DB.');
		try {
			const [existing] = await sql`SELECT id FROM master.erp_users WHERE email = ${email}`;
			if (existing) {
				return fail(400, { success: false, message: 'Email already registered in ERP' });
			}

			let allowedModules = '[]';
			try { JSON.parse(customModulesStr); allowedModules = customModulesStr; } catch { allowedModules = '[]'; }

			const salt = await bcrypt.genSalt(10);
			const hashedPassword = await bcrypt.hash(password, salt);

			await sql`
				INSERT INTO master.erp_users (
					karyawan_id, email, password, erp_role, allowed_modules
				) VALUES (
					${karyawanId ? Number(karyawanId) : null}, 
					${email}, 
					${hashedPassword}, 
					${role}, 
					${allowedModules}::jsonb
				)
			`;

			return { success: true, message: 'User successfully created' };
		} catch (error: any) {
			return fail(500, { success: false, message: error.message });
		}
	},

	// ── UPDATE USER ──
	update: async ({ request, cookies }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();
		const role = data.get('role')?.toString().trim();
		const customModulesStr = data.get('allowed_modules')?.toString() || '[]';
		const resetPassword = data.get('reset_password')?.toString();

		if (!id || !role) {
			return fail(400, { success: false, message: 'ID and role are required' });
		}

		const authToken = cookies.get('auth_token');

		// PRIORITAS 1: Laravel API
		const apiResult = await tryLaravelApi('PUT', `/api/v1/admin/users/${id}`, authToken, {
			role,
			allowed_modules: customModulesStr,
			reset_password: resetPassword || ''
		});

		if (apiResult.ok) {
			return { success: true, message: 'User updated successfully' };
		}

		if (!isLaravelDown(apiResult)) {
			return fail(apiResult.status, { success: false, message: apiResult.error || 'Failed to update user' });
		}

		// PRIORITAS 2: Fallback Svelte DB
		console.warn('⚠️ [AdminUsers Fallback] Updating user via Svelte DB.');
		try {
			let allowedModules = '[]';
			try { JSON.parse(customModulesStr); allowedModules = customModulesStr; } catch { allowedModules = '[]'; }

			if (resetPassword && resetPassword.trim().length > 0) {
				const salt = await bcrypt.genSalt(10);
				const hashedPassword = await bcrypt.hash(resetPassword, salt);
				await sql`
					UPDATE master.erp_users 
					SET erp_role = ${role}, 
					    allowed_modules = ${allowedModules}::jsonb,
					    password = ${hashedPassword},
					    updated_at = CURRENT_TIMESTAMP
					WHERE id = ${Number(id)}
				`;
			} else {
				await sql`
					UPDATE master.erp_users 
					SET erp_role = ${role}, 
					    allowed_modules = ${allowedModules}::jsonb,
					    updated_at = CURRENT_TIMESTAMP
					WHERE id = ${Number(id)}
				`;
			}

			return { success: true, message: 'User updated successfully' };
		} catch (error: any) {
			return fail(500, { success: false, message: error.message });
		}
	},

	// ── TOGGLE ACTIVE STATUS ──
	toggleStatus: async ({ request, cookies }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();
		const currentStatus = data.get('current_status') === 'true';

		if (!id) {
			return fail(400, { success: false, message: 'User ID is required' });
		}

		const authToken = cookies.get('auth_token');

		// PRIORITAS 1: Laravel API
		const apiResult = await tryLaravelApi('PATCH', `/api/v1/admin/users/${id}/toggle-status`, authToken, {
			current_status: currentStatus
		});

		if (apiResult.ok) {
			const newStatus = !currentStatus;
			return { success: true, message: `User successfully ${newStatus ? 'activated' : 'deactivated'}` };
		}

		if (!isLaravelDown(apiResult)) {
			return fail(apiResult.status, { success: false, message: apiResult.error || 'Failed to toggle status' });
		}

		// PRIORITAS 2: Fallback Svelte DB
		console.warn('⚠️ [AdminUsers Fallback] Toggling status via Svelte DB.');
		try {
			const newStatus = !currentStatus;
			await sql`
				UPDATE master.erp_users 
				SET is_active = ${newStatus}, updated_at = CURRENT_TIMESTAMP 
				WHERE id = ${Number(id)}
			`;

			return { 
				success: true, 
				message: `User successfully ${newStatus ? 'activated' : 'deactivated'}` 
			};
		} catch (error: any) {
			return fail(500, { success: false, message: error.message });
		}
	}
} satisfies Actions;
