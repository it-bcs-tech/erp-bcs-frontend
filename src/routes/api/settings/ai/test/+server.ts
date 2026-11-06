import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const baseUrl = (body.baseUrl || '').trim() || 'https://api.groq.com/openai/v1';
	const apiKey = (body.apiKey || '').trim();
	const model = (body.model || '').trim() || 'glm-4.7-flash';
	const temperature = typeof body.temperature === 'number' ? body.temperature : 0.7;
	const maxTokens = typeof body.maxTokens === 'number' ? body.maxTokens : 256;
	const testPrompt =
		body.prompt?.trim() ||
		'Tes konektivitas endpoint AI ERP BCS. Jawab dengan 1 kalimat singkat bahwa sistem siap.';

	// Susun endpoint target OpenAI-compatible
	let targetUrl = baseUrl.replace(/\/+$/, '');
	if (!targetUrl.endsWith('/chat/completions')) {
		targetUrl += '/chat/completions';
	}

	const startTime = Date.now();

	try {
		const headers: Record<string, string> = {
			'Content-Type': 'application/json'
		};
		if (apiKey) {
			headers['Authorization'] = `Bearer ${apiKey}`;
		}

		const response = await fetch(targetUrl, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				model,
				messages: [{ role: 'user', content: testPrompt }],
				temperature,
				max_tokens: maxTokens,
				stream: false
			}),
			signal: AbortSignal.timeout(15000) // 15 detik timeout limit
		});

		const latencyMs = Date.now() - startTime;

		if (!response.ok) {
			const errText = await response.text();
			let detail = errText;
			try {
				const errJson = JSON.parse(errText);
				detail = errJson.error?.message || errJson.message || errText;
			} catch {
				// Gunakan raw text jika bukan JSON
			}
			return json(
				{
					success: false,
					status: response.status,
					latencyMs,
					message: `Endpoint merespon error (${response.status}): ${detail.slice(0, 300)}`
				},
				{ status: 200 }
			);
		}

		const data = await response.json();
		const previewText =
			data.choices?.[0]?.message?.content?.trim() ||
			'Koneksi berhasil dan handshake endpoint valid.';

		return json({
			success: true,
			model,
			baseUrl,
			latencyMs,
			preview: previewText
		});
	} catch (err: any) {
		const latencyMs = Date.now() - startTime;
		return json(
			{
				success: false,
				latencyMs,
				message: `Gagal terhubung ke endpoint (${targetUrl}): ${err.message || 'Koneksi terputus / timeout'}`
			},
			{ status: 200 }
		);
	}
};
