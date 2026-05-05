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

// Base URL diambil dari variabel PRIVATE (tanpa prefix PUBLIC_)
// Di Docker production: http://backend:9000 (jalur internal, sangat cepat)
// Di lokal development: http://localhost:8080 (fallback)
const API_BASE_URL = env.API_URL || 'http://localhost:8080';

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

	const response = await fetch(url, { ...options, headers });

	if (!response.ok) {
		const errorBody = await response.text();
		console.error(`API Error [${response.status}] on ${url}:`, errorBody);
		throw new Error(`API Error: ${response.status} ${response.statusText}`);
	}

	return (await response.json()) as ApiResponse<T>;
}
