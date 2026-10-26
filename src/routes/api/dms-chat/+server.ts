/**
 * DMS Chat API Route — Proxy ke Python AI Bridge (/dms/chat)
 * ────────────────────────────────────────────────────────────
 * Endpoint proxy dari SvelteKit ke Python AI Bridge untuk agent DIMAS.
 */

import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

const AI_BRIDGE_URL = env.AI_BRIDGE_URL ?? 'http://127.0.0.1:8002';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();

	try {
		const response = await fetch(`${AI_BRIDGE_URL}/dms/chat`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error(`[AI Bridge DMS] Error ${response.status}:`, errorText);
			return new Response(
				`⚠️ Gagal terhubung ke AI Bridge (status: ${response.status}). Pastikan service Python sedang berjalan.`,
				{ status: 200, headers: { 'Content-Type': 'text/plain' } }
			);
		}

		return new Response(response.body, {
			status: 200,
			headers: {
				'Content-Type': 'text/plain',
				'Cache-Control': 'no-cache',
				'X-Content-Type-Options': 'nosniff',
			},
		});
	} catch (err) {
		console.error('[AI Bridge DMS] Connection error:', err);
		return new Response(
			'⚠️ Tidak dapat terhubung ke AI Bridge service. Pastikan AI Bridge aktif di port 8002.',
			{ status: 200, headers: { 'Content-Type': 'text/plain' } }
		);
	}
};
