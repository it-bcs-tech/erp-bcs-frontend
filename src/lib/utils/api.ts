/**
 * Server-Side API Utility
 * ─────────────────────────────────────────────────────────
 * File ini HANYA boleh diimpor dari file server-side:
 *   - +page.server.ts
 *   - +layout.server.ts
 *   - +server.ts
 *   - hooks.server.ts
 *
 * JANGAN impor dari file client-side (+page.svelte, +layout.svelte)
 * karena API_URL bersifat PRIVATE (tidak terekspos ke browser)
 * ─────────────────────────────────────────────────────────
 */

import { env } from '$env/dynamic/private';
import { logError } from './logger';

// Base URL diambil dari variabel PRIVATE (tanpa prefix PUBLIC_)
// Di Docker production: http://backend:9000 (jalur internal, sangat cepat)
// Di lokal development: http://localhost:8080 (fallback)
const API_BASE_URL = env.API_URL || 'http://backend:9000';

export interface ApiResponse<T> {
	status: 'success' | 'error';
	message?: string;
	data: T;
	meta?: {
		current_page?: number;
		total?: number;
		per_page?: number;
	};
}

/**
 * Standard HTTP Fetch Wrapper (Server-Side Only)
 * Digunakan agar semua request ke Backend Laravel memiliki headers standar.
 *
 * @param endpoint - Path API (contoh: '/api/v1/hris/employees')
 * @param options - RequestInit tambahan (method, body, dll)
 * @param authToken - Token autentikasi dari cookie user (opsional)
 */
export async function apiFetch<T>(
	endpoint: string,
	options: RequestInit = {},
	authToken?: string
): Promise<ApiResponse<T>> {
	const url = `${API_BASE_URL}${endpoint}`;

	const headers = new Headers(options.headers || {});
	headers.set('Content-Type', 'application/json');
	headers.set('Accept', 'application/json');

	// Sertakan token autentikasi jika tersedia
	if (authToken) {
		headers.set('Authorization', `Bearer ${authToken}`);
	}

	try {
		const response = await fetch(url, { ...options, headers });
		const textResponse = await response.text();

		if (!response.ok) {
			logError('API_FETCH', `Error [${response.status}] on ${url}`, textResponse);
			throw new Error(`API Error: ${response.status} ${response.statusText}`);
		}

		let jsonStr = textResponse.trim();
		
		// Auto-cleaner: Jika tim backend secara tidak sengaja meninggalkan 'echo' 
		// atau mencetak debug data (seperti payload request) sebelum response asli
		const realJsonStart = jsonStr.lastIndexOf('{"status"');
		if (realJsonStart > 0) {
			jsonStr = jsonStr.substring(realJsonStart);
		}

		try {
			return JSON.parse(jsonStr) as ApiResponse<T>;
		} catch (parseError: any) {
			logError('API_PARSE_ERROR', `Invalid JSON from ${url}`, `Raw Response:\n${textResponse}\n\nParse Error: ${parseError.message}`);
			throw new Error('Backend returned invalid JSON format (possibly PHP warning/error leaked). Check logs.');
		}
	} catch (err: any) {
		logError('API_FETCH_EXCEPTION', `Fetch failed for ${url}`, err?.message || err);
		throw err;
	}
}
