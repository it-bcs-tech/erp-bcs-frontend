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

		if (response.ok && (json.status === 'success' || !json.status || json.message)) {
			console.log(`✅ [AdminUsers] Laravel ${method} ${endpoint} success`);
			return { ok: true, status: response.status, data: json.data || json };
		} else if (response.status >= 400 && response.status < 500) {
			// Validation/auth error — JANGAN fallback
			return { ok: false, status: response.status, error: json.message || json.error || 'Request rejected by Laravel' };
		} else {
			// 5xx or bad JSON
			console.error(`❌ [AdminUsers] 500 Error Raw Response:`, textResponse);
			return { ok: false, status: response.status };
		}
	} catch (error: any) {
		logError('ADMIN_API_FAIL', `Laravel ${method} ${endpoint} unreachable`, error?.message);
		return { ok: false, status: 0 };
	}
}

// ─────────────────────────────────────────────────────────
// LOAD: GET Users List
// ─────────────────────────────────────────────────────────
export const load: PageServerLoad = async ({ cookies }) => {
	const authToken = cookies.get('auth_token');
	const { getDynamicRoleModuleMap } = await import('$lib/server/auth');
	const roleModuleMap = await getDynamicRoleModuleMap();

	// PRIORITAS TUNGGAL: Laravel API
	const apiResult = await tryLaravelApi('GET', '/api/v1/admin/users', authToken);

	if (apiResult.ok && apiResult.data) {
		return { usersList: apiResult.data, dataSource: 'laravel' as const, roleModuleMap };
	}

	// Laravel returned 4xx/5xx — return empty with error
	return { usersList: [], dataSource: 'laravel' as const, error: apiResult.error || 'Failed to connect to API', roleModuleMap };
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

		// PRIORITAS TUNGGAL: Laravel API
		const apiResult = await tryLaravelApi('POST', '/api/v1/admin/users', authToken, {
			email, password, role,
			karyawan_id: karyawanId ? Number(karyawanId) : null,
			allowed_modules: customModulesStr
		});

		if (apiResult.ok) {
			return { success: true, message: 'User successfully created' };
		}

		// Jika error (baik 4xx maupun 5xx), lempar ke client
		return fail(apiResult.status || 500, { success: false, message: apiResult.error || 'Failed to create user' });
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

		// PRIORITAS TUNGGAL: Laravel API
		const apiResult = await tryLaravelApi('PUT', `/api/v1/admin/users/${id}`, authToken, {
			role,
			allowed_modules: customModulesStr,
			reset_password: resetPassword || ''
		});

		if (apiResult.ok) {
			return { success: true, message: 'User updated successfully' };
		}

		return fail(apiResult.status || 500, { success: false, message: apiResult.error || 'Failed to update user' });
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

		// PRIORITAS TUNGGAL: Laravel API
		const apiResult = await tryLaravelApi('PATCH', `/api/v1/admin/users/${id}/toggle-status`, authToken, {
			current_status: currentStatus
		});

		if (apiResult.ok) {
			const newStatus = !currentStatus;
			return { success: true, message: `User successfully ${newStatus ? 'activated' : 'deactivated'}` };
		}

		return fail(apiResult.status || 500, { success: false, message: apiResult.error || 'Failed to toggle status' });
	}
} satisfies Actions;
