/**
 * FINA Chat API Route — Proxy ke Python AI Bridge (Finance & Kasir)
 * ──────────────────────────────────────────────────────────────────────────
 * Meneruskan percakapan FINA dari browser ke endpoint FastAPI AI Bridge:
 *   POST http://127.0.0.1:8002/finance/chat
 */

import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

const AI_BRIDGE_URL = env.AI_BRIDGE_URL ?? 'http://127.0.0.1:8002';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();

	try {
		const response = await fetch(`${AI_BRIDGE_URL}/finance/chat`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error(`[FINA AI Bridge] Error ${response.status}:`, errorText);
			return new Response(
				`⚠️ Gagal terhubung ke AI Bridge FINA (status: ${response.status}). Pastikan service AI Bridge sedang berjalan.`,
				{ status: 200, headers: { 'Content-Type': 'text/plain' } }
			);
		}

		return new Response(response.body, {
			status: 200,
			headers: {
				'Content-Type': 'text/plain; charset=utf-8',
				'Cache-Control': 'no-cache',
				'X-Content-Type-Options': 'nosniff',
			},
		});
	} catch (err) {
		console.error('[FINA AI Bridge] Connection error:', err);
		return new Response(
			'⚠️ Tidak dapat terhubung ke AI Bridge service. Pastikan AI Bridge berjalan di port 8002.',
			{ status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
		);
	}
};
