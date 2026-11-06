import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

const AI_BRIDGE_URL = env.AI_BRIDGE_URL ?? 'http://127.0.0.1:8000';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const model = body.model?.trim() || 'glm-4.7-flash';
	const temperature = typeof body.temperature === 'number' ? body.temperature : 0.7;
	const maxTokens = typeof body.maxTokens === 'number' ? body.maxTokens : 512;
	const testPrompt = body.prompt?.trim() || 'Tes koneksi sistem AI ERP BCS. Harap berikan konfirmasi kesiapan sistem dalam 1-2 kalimat singkat.';

	const startTime = Date.now();

	try {
		// Panggil AI Bridge chat endpoint dengan mode uji coba
		const response = await fetch(`${AI_BRIDGE_URL}/chat`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				messages: [
					{ role: 'user', content: testPrompt }
				],
				model,
				temperature,
				max_tokens: maxTokens
			}),
			signal: AbortSignal.timeout(15000) // 15 detik timeout limit
		});

		const latencyMs = Date.now() - startTime;

		if (!response.ok) {
			const errText = await response.text();
			return json({
				success: false,
				status: response.status,
				latencyMs,
				message: `AI Bridge merespon error (${response.status}): ${errText.slice(0, 300)}`
			}, { status: 200 });
		}

		// Baca stream teks respon
		const fullText = await response.text();
		return json({
			success: true,
			model,
			latencyMs,
			preview: fullText.trim() || 'Koneksi berhasil, respon diterima tanpa isi teks.'
		});
	} catch (err: any) {
		const latencyMs = Date.now() - startTime;
		return json({
			success: false,
			latencyMs,
			message: `Gagal terhubung ke AI Bridge (${AI_BRIDGE_URL}): ${err.message || 'Koneksi terputus / timeout'}`
		}, { status: 200 });
	}
};
