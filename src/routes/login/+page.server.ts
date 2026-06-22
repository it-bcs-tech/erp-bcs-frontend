/**
 * Login Page Server Action
 * ─────────────────────────────────────────────────────────
 * Menangani form submission login dengan Fallback Mechanism.
 * Prioritas 1: Backend Laravel API (dari .env API_URL)
 * Prioritas 2 (Fallback): Direct Svelte DB (jika Laravel Down/Network Error)
 */

import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { authenticateUser, AuthError, getAuthUserByEmail } from '$lib/server/auth';
import { logError } from '$lib/utils/logger';
import { env } from '$env/dynamic/private';

const API_BASE_URL = env.API_URL || 'http://backend:9000';

export const actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const email = data.get('email')?.toString()?.trim();
		const password = data.get('password')?.toString();

		if (!email || !password) {
			return fail(400, { email, error: 'Email dan password wajib diisi' });
		}

		let isLaravelDownOrError = false;

		// ==========================================
		// PRIORITAS 1: REQUEST KE API LARAVEL
		// ==========================================
		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 10000);

			const loginUrl = `${API_BASE_URL}/api/v1/auth/login`;
			console.log(`🔗 [Login] Attempting Laravel API: ${loginUrl}`);

			const response = await fetch(loginUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Accept': 'application/json'
				},
				body: JSON.stringify({ email, password }),
				signal: controller.signal
			});

			clearTimeout(timeoutId);

			// Ambil raw text untuk debugging & parsing yang aman
			const textResponse = await response.text();
			console.log(`📡 [Login] Laravel Response Status: ${response.status}`);
			console.log(`📡 [Login] Laravel Raw Body: ${textResponse.substring(0, 500)}`);

			if (response.ok) {
				// Parse JSON dengan aman (handle jika ada karakter sampah di depan)
				let jsonStr = textResponse.trim();
				const realJsonStart = jsonStr.lastIndexOf('{"status"');
				if (realJsonStart > 0) {
					console.warn(`⚠️ [Login] Garbage detected before JSON at position ${realJsonStart}, cleaning...`);
					jsonStr = jsonStr.substring(realJsonStart);
				}
				
				try {
					const json = JSON.parse(jsonStr);
					if (json.status === 'success' && json.data) {
						console.log(`✅ [Login] Laravel login SUCCESS for: ${email}`);
						
						const userData = json.data.user;
						userData.authSource = 'laravel';
						userData.titleName = userData.title_name || userData.titleName || userData.title || '';
						
						// Jika Laravel tidak mengembalikan title_name, ambil dari database Svelte
						if (!userData.titleName) {
							try {
								const localUser = await getAuthUserByEmail(email);
								if (localUser && localUser.titleName) {
									userData.titleName = localUser.titleName;
								}
							} catch (err) {
								console.error("Gagal mengambil titleName lokal:", err);
							}
						}
						
						console.log(`🔍 [Login Debug] Raw allowedModules from Laravel:`, JSON.stringify(userData.allowedModules));
						
						// Bersihkan prefix 'module.' dari array permissions jika Laravel Spatie mengirimkannya
						if (Array.isArray(userData.allowedModules)) {
							userData.allowedModules = userData.allowedModules.map((m: string) => m.replace(/^module\./, ''));
						} else {
							console.warn(`⚠️ [Login Debug] allowedModules is NOT an array! Type: ${typeof userData.allowedModules}, Value: ${JSON.stringify(userData.allowedModules)}`);
							// Jika bukan array, coba parse
							if (typeof userData.allowedModules === 'string') {
								try { userData.allowedModules = JSON.parse(userData.allowedModules); } catch {}
							}
							if (!Array.isArray(userData.allowedModules)) {
								userData.allowedModules = [];
							}
							userData.allowedModules = userData.allowedModules.map((m: string) => m.replace(/^module\./, ''));
						}
						
						console.log(`✅ [Login Debug] Final allowedModules stored in cookie:`, JSON.stringify(userData.allowedModules));
						
						return processLoginSuccess(request, cookies, userData, json.data.token);
					} else {
						console.warn(`⚠️ [Login] Laravel returned OK but unexpected structure:`, json.status);
						isLaravelDownOrError = true;
					}
				} catch (e: any) {
					isLaravelDownOrError = true;
					logError('LOGIN_API_FAIL', 'Laravel returned OK but invalid JSON', `Raw: ${textResponse.substring(0, 300)} | Error: ${e?.message}`);
				}
			} else if (response.status >= 400 && response.status < 500) {
				// Validation error (400, 401, 404, 422) — JANGAN FALLBACK
				let errorJson: any = {};
				try {
					let jsonStr = textResponse.trim();
					const realJsonStart = jsonStr.lastIndexOf('{');
					if (realJsonStart > 0) jsonStr = jsonStr.substring(realJsonStart);
					errorJson = JSON.parse(jsonStr);
				} catch {
					// silent
				}
				const errorMessage = errorJson.error || errorJson.message || 'Email atau password salah';
				console.log(`❌ [Login] Laravel rejected (${response.status}): ${errorMessage}`);
				return fail(response.status, { email, error: errorMessage });
			} else {
				// Error Server (500, 502, 503, 504) -> Anggap Laravel Down
				console.warn(`⚠️ [Login] Laravel server error: ${response.status}`);
				isLaravelDownOrError = true;
			}

		} catch (error: any) {
			// Network error (Connection Refused, Timeout Abort, dll)
			isLaravelDownOrError = true;
			logError('LOGIN_API_FAIL', 'Laravel API unreachable or timed out', error?.message);
		}

		// ==========================================
		// PRIORITAS 2: FALLBACK SVELTE NATIVE (DB)
		// ==========================================
		if (isLaravelDownOrError) {
			console.warn('⚠️ [Auth Fallback] Laravel Backend is down or returning 5xx. Falling back to Svelte Native Authentication.');
			
			try {
				const { user, token } = await authenticateUser(email, password);
				// BERHASIL LOGIN VIA SVELTE NATIVE
				user.authSource = 'svelte-db';
				return processLoginSuccess(request, cookies, user, token);
			} catch (error: any) {
				if (error instanceof AuthError) {
					return fail(401, { email, error: error.message });
				}
				logError('LOGIN_FALLBACK_ACTION', 'Failed to login via Svelte Native', { email, error: error?.message || error });
				return fail(500, { email, error: 'Sistem otentikasi bermasalah. Silakan coba lagi nanti.' });
			}
		}
	}
} satisfies Actions;

/**
 * Helper: Fungsi terpusat untuk menyimpan Auth Cookie & mereturn success
 */
function processLoginSuccess(request: Request, cookies: any, user: any, token: string) {
	const isSecure = request.headers.get('x-forwarded-proto') === 'https';

	cookies.set('auth_token', token, {
		path: '/',
		httpOnly: true,
		secure: isSecure,
		sameSite: 'lax',
		maxAge: 60 * 60 * 24 // 1 hari
	});

	cookies.set('user_data', JSON.stringify(user), {
		path: '/',
		httpOnly: false,
		secure: isSecure,
		sameSite: 'lax',
		maxAge: 60 * 60 * 24 // 1 hari
	});

	return { success: true, userName: user.name };
}
