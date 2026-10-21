import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';

const AI_BRIDGE_CANDIDATES = [
	env.AI_BRIDGE_URL,
	'http://ai-bridge:8000',
	'http://127.0.0.1:8083',
	'http://127.0.0.1:8000',
	'http://localhost:8083',
	'http://localhost:8000'
].filter(Boolean) as string[];

const GROQ_API_KEY = env.GROQ_API_KEY;

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

		// 1. Prioritas Utama: Panggil Python AI Bridge (/ocs/scan-sim)
		for (const bridgeUrl of AI_BRIDGE_CANDIDATES) {
			try {
				const bridgeFormData = new FormData();
				bridgeFormData.append('image_base64', base64Data);
				bridgeFormData.append('mime_type', mimeType);

				const bridgeResponse = await fetch(`${bridgeUrl}/ocs/scan-sim`, {
					method: 'POST',
					body: bridgeFormData,
					signal: AbortSignal.timeout(12000)
				});

				if (bridgeResponse.ok) {
					const bridgeResult = await bridgeResponse.json();
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
				}
			} catch (bridgeErr: any) {
				// Coba URL kandidat berikutnya jika gagal
			}
		}

		// 2. Fallback Cadangan: Langsung ke Groq Vision API jika key tersedia
		if (GROQ_API_KEY) {
			const candidateVisionModels = [
				'meta-llama/llama-4-scout-17b-16e-instruct',
				'qwen/qwen3.8-27b',
				'meta-llama/llama-4-maverick-17b-128e-instruct',
				'llama-3.2-11b-vision-preview'
			];

			const systemPrompt = 
				'Anda adalah asisten AI Vision OCR resmi untuk verifikasi kartu identitas Republik Indonesia: ' +
				'Surat Izin Mengemudi (SIM) atau Kartu Tanda Penduduk (e-KTP). ' +
				'Tugas utama Anda adalah MEMVERIFIKASI keaslian dan jenis dokumen terlebih dahulu. ' +
				'Jika gambar BUKAN fisik SIM asli dan BUKAN fisik e-KTP asli Republik Indonesia ' +
				'(misal: STNK, BPKB, foto hewan, pemandangan, selfie/wajah tanpa kartu, faktur/surat biasa, atau gambar acak/buram tidak terbaca), Anda WAJIB MENOLAKNYA. ' +
				'Kembalikan HANYA JSON murni tanpa markdown.';

			const userPrompt = 
				'Analisis gambar yang diunggah secara saksama:\n' +
				'1. Uji Keabsahan Dokumen:\n' +
				'   - Apakah gambar ini secara fisik adalah Surat Izin Mengemudi (SIM) Republik Indonesia yang jelas?\n' +
				'   - ATAU apakah gambar ini secara fisik adalah Kartu Tanda Penduduk Elektronik (e-KTP) Republik Indonesia yang jelas?\n' +
				'   - Jika BUKAN keduanya (misal: STNK, sertifikat, invoice, foto orang/selfie biasa, pemandangan, benda, teks dokumen biasa, atau gambar buram/palsu), maka KEMBALIKAN format penolakan:\n' +
				'   {\n' +
				'     "is_valid_id": false,\n' +
				'     "doc_type": "UNKNOWN",\n' +
				'     "rejection_reason": "Gambar yang diunggah bukan fisik kartu SIM atau e-KTP Republik Indonesia yang sah.",\n' +
				'     "confidence_score": 0.0\n' +
				'   }\n\n' +
				'2. Jika gambar BENAR adalah SIM atau e-KTP yang valid, kembalikan format:\n' +
				'   {\n' +
				'     "is_valid_id": true,\n' +
				'     "doc_type": "SIM", // "SIM" atau "KTP"\n' +
				'     "sim_type": "SIM B2 UMUM", // Jika SIM, pilih: "SIM A", "SIM B1", "SIM B1 UMUM", "SIM B2", "SIM B2 UMUM", "SIM C". Jika KTP, isi null.\n' +
				'     "sim_number": "123456789012", // Nomor SIM jika SIM, atau nomor NIK jika KTP\n' +
				'     "nik": "3671012345670001", // Nomor NIK jika KTP, atau null jika SIM\n' +
				'     "driver_name": "NAMA LENGKAP", // Sesuai kartu\n' +
				'     "expiry_date": "YYYY-MM-DD", // Tanggal masa berlaku ISO YYYY-MM-DD. Jika KTP Seumur Hidup, isi null.\n' +
				'     "birth_place": "KOTA LAHIR",\n' +
				'     "birth_date": "YYYY-MM-DD",\n' +
				'     "address": "ALAMAT LENGKAP",\n' +
				'     "gender": "L / P",\n' +
				'     "blood_type": "A / B / AB / O / -",\n' +
				'     "confidence_score": 0.95\n' +
				'   }\n\n' +
				'Aturan: Format tanggal WAJIB ISO YYYY-MM-DD. Berikan respons HANYA teks JSON valid tanpa backtick.';

			for (const visionModel of candidateVisionModels) {
				try {
					const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
						method: 'POST',
						headers: {
							'Authorization': `Bearer ${GROQ_API_KEY}`,
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({
							model: visionModel,
							messages: [
								{ role: 'system', content: systemPrompt },
								{
									role: 'user',
									content: [
										{ type: 'text', text: userPrompt },
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
							max_tokens: 1000
						}),
						signal: AbortSignal.timeout(15000)
					});

					if (groqRes.ok) {
						const groqData = await groqRes.json();
						const rawContent = groqData.choices?.[0]?.message?.content || '{}';
						let cleaned = rawContent.trim();
						if (cleaned.startsWith('```')) {
							cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
						}
						const parsed = JSON.parse(cleaned);

						// Validasi Penolakan Keras (Hard Reject)
						const isValid = parsed.is_valid_id !== false;
						const detectedDoc = String(parsed.doc_type || '').toUpperCase();
						const rejectionReason = parsed.rejection_reason || 'Gambar yang diunggah bukan fisik kartu SIM atau e-KTP yang sah.';

						if (
							!isValid ||
							detectedDoc.includes('UNKNOWN') ||
							detectedDoc.includes('INVALID') ||
							(!detectedDoc.includes('SIM') && !detectedDoc.includes('KTP')) ||
							(!parsed.sim_number && !parsed.nik)
						) {
							return json({
								success: false,
								is_rejected: true,
								message: `Berkas Ditolak: ${rejectionReason}`
							});
						}

						// Normalisasi Jenis SIM
						if (detectedDoc.includes('KTP')) {
							parsed.doc_type = 'KTP';
							if (!parsed.sim_type) parsed.sim_type = 'KTP KARYAWAN';
							if (!parsed.sim_number && parsed.nik) parsed.sim_number = parsed.nik;
						} else {
							parsed.doc_type = 'SIM';
							const rawType = String(parsed.sim_type || '').toUpperCase();
							if (rawType.includes('B2') && rawType.includes('UMUM')) parsed.sim_type = 'SIM B2 UMUM';
							else if (rawType.includes('B2')) parsed.sim_type = 'SIM B2';
							else if (rawType.includes('B1') && rawType.includes('UMUM')) parsed.sim_type = 'SIM B1 UMUM';
							else if (rawType.includes('B1')) parsed.sim_type = 'SIM B1';
							else if (rawType.includes('A')) parsed.sim_type = 'SIM A';
							else if (rawType.includes('C')) parsed.sim_type = 'SIM C';
							else parsed.sim_type = 'SIM B2 UMUM';
						}

						return json({
							success: true,
							is_rejected: false,
							message: `Dokumen ${parsed.doc_type} berhasil dipindai via Vision AI (${visionModel}).`,
							data: parsed
						});
					}
				} catch (groqErr: any) {
					console.warn(`[OCS Scan SIM] Model ${visionModel} failed:`, groqErr?.message);
				}
			}
		}

		// 3. Fallback Graceful jika AI belum tersedia / foto buram:
		return json({
			success: false,
			fallback_manual: true,
			message: 'AI Vision sedang offline atau foto buram. Form isian manual terbuka otomatis untuk diisi.',
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
