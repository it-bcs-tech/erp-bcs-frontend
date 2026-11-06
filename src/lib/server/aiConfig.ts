/**
 * aiConfig.ts — Layanan Manajemen Konfigurasi Dinamis AI Engine & LLM
 * ─────────────────────────────────────────────────────────────────
 * Membaca pengaturan model aktif, provider, temperature, dan token
 * dari database `master.module_settings` dengan fallback aman ke .env.
 */
import { getModuleSetting } from '$lib/server/settings';
import { env } from '$env/dynamic/private';

export interface AIConfig {
	model: string;
	provider: string;
	temperature: number;
	maxTokens: number;
}

export const DEFAULT_AI_CONFIG: AIConfig = {
	model: env.OPENCLAW_MODEL || 'glm-4.7-flash',
	provider: 'openclaw',
	temperature: 0.7,
	maxTokens: 2048
};

/**
 * Mengambil konfigurasi AI aktif saat runtime.
 * Mengutamakan database `master.module_settings`, jika kosong fallback ke default .env.
 */
export async function getActiveAIConfig(): Promise<AIConfig> {
	try {
		const config = await getModuleSetting<AIConfig>('ai', 'global_config', DEFAULT_AI_CONFIG);
		return {
			model: config?.model?.trim() || env.OPENCLAW_MODEL || 'glm-4.7-flash',
			provider: config?.provider?.trim() || 'openclaw',
			temperature: typeof config?.temperature === 'number' ? config.temperature : 0.7,
			maxTokens: typeof config?.maxTokens === 'number' ? config.maxTokens : 2048
		};
	} catch (e) {
		console.warn('[AI Config] Gagal memuat setting dari DB, fallback ke .env:', e);
		return DEFAULT_AI_CONFIG;
	}
}
