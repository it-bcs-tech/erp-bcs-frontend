import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';

const AI_BRIDGE_URL = env.AI_BRIDGE_URL || 'http://127.0.0.1:8000';
const GROQ_API_KEY = env.GROQ_API_KEY;

export const POST: RequestHandler = async ({ request }) => {
	try {
		const formData = await request.formData();
		const file = formData.get('file') as File | null;
		const base64Input = formData.get('image_base64')?.toString();

		if (!file && !base64Input) {
			return json({ success: false, message: 'Berkas gambar SIM wajib diunggah.' }, { status: 400 });
		}

		let base64Data = '';
		let mimeType = 'image/jpeg';

		if (file && file.size > 0) {
			const buffer = Buffer.from(await file.arrayBuffer());
			base64Data = buffer.toString('base64');
			mimeType = file.type || 'image/jpeg';
		} else if (base64Input) {
			if (base64Input.includes(',')) {
				const parts = base64Input.split(',');
				base64Data = parts[1];
				const match = parts[0].match(/:(.*?);/);
				if (match) mimeType = match[1];
			} else {
				base64Data = base64Input;
			}
		}

		// 1. Prioritas Utama: Panggil Python AI Bridge (/ocs/scan-sim)
		try {
			const bridgeFormData = new FormData();
			bridgeFormData.append('image_base64', base64Data);
			bridgeFormData.append('mime_type', mimeType);

			const bridgeResponse = await fetch(`${AI_BRIDGE_URL}/ocs/scan-sim`, {
				method: 'POST',
				body: bridgeFormData,
				signal: AbortSignal.timeout(10000) // 10s timeout
			});

			if (bridgeResponse.ok) {
				const bridgeResult = await bridgeResponse.json();
				if (bridgeResult && bridgeResult.success) {
					return json(bridgeResult);
				}
			}
		} catch (bridgeErr: any) {
			console.warn('[OCS Scan SIM] AI Bridge unreachable or returned error:', bridgeErr?.message);
		}

		// 2. Fallback Cadangan: Langsung ke Groq Vision API jika key tersedia
		if (GROQ_API_KEY) {
			try {
				const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
					method: 'POST',
					headers: {
						'Authorization': `Bearer ${GROQ_API_KEY}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						model: 'llama-3.2-11b-vision-preview',
						messages: [
							{
								role: 'system',
								content: 'Anda adalah asisten AI OCR cerdas khusus membaca Surat Izin Mengemudi (SIM) Republik Indonesia. Ekstrak data dan kembalikan HANYA JSON murni.'
							},
							{
								role: 'user',
								content: [
									{
										type: 'text',
										text: 'Ekstrak data foto SIM ini menjadi JSON:\n{\n  "sim_type": "SIM B2 UMUM",\n  "sim_number": "123456789012",\n  "driver_name": "NAMA LENGKAP",\n  "expiry_date": "YYYY-MM-DD",\n  "birth_place": "KOTA",\n  "birth_date": "YYYY-MM-DD",\n  "address": "ALAMAT",\n  "blood_type": "O",\n  "confidence_score": 0.95\n}'
									},
									{
										type: 'image_url',
										image_url: {
											url: `data:${mimeType};base64,${base64Data}`
										}
									}
								]
							}
						],
						temperature: 0.1,
						max_tokens: 800
					})
				});

				if (groqRes.ok) {
					const groqData = await groqRes.json();
					const rawContent = groqData.choices?.[0]?.message?.content || '{}';
					let cleaned = rawContent.trim();
					if (cleaned.startsWith('```')) {
						cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
					}
					const parsed = JSON.parse(cleaned);

					// Normalisasi Jenis SIM
					const rawType = String(parsed.sim_type || '').toUpperCase();
					if (rawType.includes('B2') && rawType.includes('UMUM')) parsed.sim_type = 'SIM B2 UMUM';
					else if (rawType.includes('B2')) parsed.sim_type = 'SIM B2';
					else if (rawType.includes('B1') && rawType.includes('UMUM')) parsed.sim_type = 'SIM B1 UMUM';
					else if (rawType.includes('B1')) parsed.sim_type = 'SIM B1';
					else if (rawType.includes('A')) parsed.sim_type = 'SIM A';
					else if (rawType.includes('C')) parsed.sim_type = 'SIM C';

					return json({
						success: true,
						message: 'Foto SIM berhasil dipindai via Vision AI.',
						data: parsed
					});
				}
			} catch (groqErr: any) {
				console.warn('[OCS Scan SIM] Direct Groq Vision call failed:', groqErr?.message);
			}
		}

		// 3. Fallback Graceful jika AI belum tersedia / foto buram:
		return json({
			success: false,
			fallback_manual: true,
			message: 'AI Vision sedang offline atau foto buram. Form isian manual terbuka otomatis untuk diisi.',
			data: {
				sim_type: 'SIM B2 UMUM',
				sim_number: '',
				driver_name: '',
				expiry_date: '',
				birth_place: '',
				birth_date: '',
				address: '',
				blood_type: ''
			}
		});

	} catch (err: any) {
		console.error('[OCS Scan SIM] Internal error:', err);
		return json({
			success: false,
			fallback_manual: true,
			message: 'Terjadi kesalahan sistem saat memproses pemindaian: ' + err.message
		}, { status: 500 });
	}
};
