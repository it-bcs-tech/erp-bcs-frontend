/**
 * Scan SIM & KTP API Route — Terpusat 100% via Python AI Bridge
 * ─────────────────────────────────────────────────────────────
 * Seluruh pemrosesan Vision OCR kartu identitas (SIM / KTP) WAJIB melalui
 * Python AI Bridge (/ocs/scan-sim) menggunakan profil model aktif yang
 * dikonfigurasi di halaman Settings (database master.module_settings).
 * Tidak ada pemanggilan API pihak ketiga langsung dari frontend.
 */

import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import { getActiveAIConfig } from '$lib/server/aiConfig';

const AI_BRIDGE_CANDIDATES = [
	env.AI_BRIDGE_URL,
	'http://ai-bridge:8000',
	'http://127.0.0.1:8083',
	'http://127.0.0.1:8000',
	'http://localhost:8083',
	'http://localhost:8000'
].filter(Boolean) as string[];

export const POST: RequestHandler = async ({ request }) => {
	try {
		const formData = await request.formData();
		const file = formData.get('file') as File | null;
		const base64Input = formData.get('image_base64')?.toString();

		if (!file && !base64Input) {
			return json({ success: false, message: 'Berkas gambar SIM/KTP wajib diunggah.' }, { status: 400 });
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

		// Ambil konfigurasi model AI aktif dari database (/settings)
		const aiConfig = await getActiveAIConfig();

		// Kirim request terpusat ke Python AI Bridge (/ocs/scan-sim)
		for (const bridgeUrl of AI_BRIDGE_CANDIDATES) {
			try {
				const bridgeFormData = new FormData();
				bridgeFormData.append('image_base64', base64Data);
				bridgeFormData.append('mime_type', mimeType);
				if (aiConfig.model) bridgeFormData.append('model', aiConfig.model);
				if (aiConfig.baseUrl) bridgeFormData.append('base_url', aiConfig.baseUrl);
				if (aiConfig.apiKey) bridgeFormData.append('api_key', aiConfig.apiKey);
				bridgeFormData.append('temperature', String(aiConfig.temperature ?? 0.1));

				const bridgeResponse = await fetch(`${bridgeUrl}/ocs/scan-sim`, {
					method: 'POST',
					body: bridgeFormData,
					signal: AbortSignal.timeout(20000)
				});

				if (bridgeResponse.ok) {
					const bridgeResult = await bridgeResponse.json();

					// Tangani penolakan keras (Hard Reject) berkas non-SIM/KTP
					if (bridgeResult && bridgeResult.is_rejected) {
						return json({
							success: false,
							is_rejected: true,
							message: bridgeResult.message || 'Berkas Ditolak: Gambar yang diunggah bukan fisik kartu SIM atau e-KTP yang sah.'
						});
					}

					if (bridgeResult && bridgeResult.success) {
						return json(bridgeResult);
					}
				} else {
					console.warn(`[AI Bridge Scan] URL ${bridgeUrl} returned status ${bridgeResponse.status}`);
				}
			} catch (bridgeErr: any) {
				console.warn(`[AI Bridge Scan] Gagal menghubungi ${bridgeUrl}:`, bridgeErr?.message);
				// Lanjut mencoba kandidat URL AI Bridge berikutnya
			}
		}

		// Jika seluruh koneksi AI Bridge tidak merespons, buka form manual tanpa bypass ke cloud pihak ketiga
		return json({
			success: false,
			fallback_manual: true,
			message: 'Layanan AI Bridge sedang offline atau tidak dapat dijangkau. Form isian manual terbuka otomatis untuk diisi.',
			data: {
				doc_type: 'SIM',
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
