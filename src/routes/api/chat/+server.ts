/**
 * Chat API Route — Proxy ke Python AI Bridge
 * ─────────────────────────────────────────────────
 * Endpoint ini hanya meneruskan request dari browser ke Python AI Bridge.
 * Semua logic AI (intent detection, database query, LLM call) ada di Python.
 *
 * Alur:  Browser → SvelteKit → Python AI Bridge → Openclaw + PostgreSQL
 */

import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

// URL Python AI Bridge
// Di Docker: http://ai-bridge:8000 | Di lokal: http://localhost:8083
const AI_BRIDGE_URL = env.AI_BRIDGE_URL ?? 'http://127.0.0.1:8000';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();

	try {
		// Teruskan ke Python AI Bridge
		const response = await fetch(`${AI_BRIDGE_URL}/chat`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error(`[AI Bridge] Error ${response.status}:`, errorText);
			return new Response(
				`⚠️ Gagal terhubung ke AI Bridge (status: ${response.status}). Pastikan service Python sedang berjalan.`,
				{ status: 200, headers: { 'Content-Type': 'text/plain' } }
			);
		}

		// Stream langsung dari Python ke browser — tidak ada processing di SvelteKit
		return new Response(response.body, {
			status: 200,
			headers: {
				'Content-Type': 'text/plain',
				'Cache-Control': 'no-cache',
				'X-Content-Type-Options': 'nosniff',
			},
		});
	} catch (err) {
		console.error('[AI Bridge] Connection error:', err);
		return new Response(
			'⚠️ Tidak dapat terhubung ke AI Bridge service. Pastikan Python AI Bridge sudah dijalankan di port 8083.',
			{ status: 200, headers: { 'Content-Type': 'text/plain' } }
		);
	}
};
