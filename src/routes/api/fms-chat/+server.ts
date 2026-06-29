/**
 * FMS Chat API Route — Proxy ke Python AI Bridge (FARIDA)
 * ─────────────────────────────────────────────────────────
 * Endpoint ini meneruskan request dari browser ke FARIDA Agent
 * yang berjalan di Python AI Bridge endpoint /fms/chat.
 *
 * Alur: Browser → SvelteKit → Python AI Bridge /fms/chat → FARIDA → go-map GPS
 */

import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

// URL Python AI Bridge (sama dengan HRIS, tapi endpoint berbeda)
const AI_BRIDGE_URL = env.AI_BRIDGE_URL ?? 'http://127.0.0.1:8000';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();

	try {
		// Teruskan ke FARIDA endpoint di Python AI Bridge
		const response = await fetch(`${AI_BRIDGE_URL}/fms/chat`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error(`[FARIDA] Error ${response.status}:`, errorText);
			return new Response(
				`⚠️ FARIDA tidak merespons (status: ${response.status}). Pastikan AI Bridge dan go-map backend berjalan.`,
				{ status: 200, headers: { 'Content-Type': 'text/plain' } }
			);
		}

		// Stream langsung dari FARIDA ke browser
		return new Response(response.body, {
			status: 200,
			headers: {
				'Content-Type': 'text/plain',
				'Cache-Control': 'no-cache',
				'X-Content-Type-Options': 'nosniff',
			},
		});
	} catch (err) {
		console.error('[FARIDA] Connection error:', err);
		return new Response(
			'⚠️ Tidak dapat terhubung ke FARIDA. Pastikan AI Bridge (port 8083) dan go-map backend (port 8081) sudah berjalan.',
			{ status: 200, headers: { 'Content-Type': 'text/plain' } }
		);
	}
};
