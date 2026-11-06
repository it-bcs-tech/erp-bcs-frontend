/**
 * aiConfig.ts — Layanan Manajemen Dinamis Katalog Profil & Custom Endpoint AI
 * ──────────────────────────────────────────────────────────────────────────
 * Mendukung manajemen CRUD profil model mandiri, custom OpenAI-compatible endpoint,
 * API Key, temperatur, batas token, dan pemilihan profil aktif secara dinamis.
 * Disimpan pada tabel database `master.module_settings` (module = 'ai', setting_key = 'models_catalog').
 */

import { getModuleSetting, setModuleSetting } from '$lib/server/settings';
import { env } from '$env/dynamic/private';

export interface AIModelProfile {
	id: string;
	name: string;
	provider: 'groq' | 'openai' | 'openrouter' | 'deepseek' | 'ollama' | 'openclaw' | 'custom' | string;
	baseUrl: string;
	apiKey: string;
	model: string;
	temperature: number;
	maxTokens: number;
	isDefault?: boolean;
	updatedAt?: string;
}

export interface AICatalogConfig {
	activeProfileId: string;
	profiles: AIModelProfile[];
}

export const DEFAULT_AI_PROFILE: AIModelProfile = {
	id: 'default-model',
	name: 'OpenClaw GLM 4.7 Flash (Bawaan)',
	provider: 'openclaw',
	baseUrl: 'https://api.groq.com/openai/v1',
	apiKey: '',
	model: env.OPENCLAW_MODEL || 'glm-4.7-flash',
	temperature: 0.7,
	maxTokens: 2048,
	isDefault: true,
	updatedAt: new Date().toISOString()
};

export const DEFAULT_AI_CATALOG: AICatalogConfig = {
	activeProfileId: 'default-model',
	profiles: [DEFAULT_AI_PROFILE]
};

/**
 * Mengambil seluruh katalog profil model AI dari database.
 * Melakukan auto-seed otomatis jika belum ada konfigurasi katalog di DB.
 */
export async function getAICatalogConfig(): Promise<AICatalogConfig> {
	try {
		const saved = await getModuleSetting<AICatalogConfig | null>('ai', 'models_catalog', null);

		if (saved && Array.isArray(saved.profiles) && saved.profiles.length > 0) {
			const activeId = saved.activeProfileId || saved.profiles[0].id;
			return {
				activeProfileId: activeId,
				profiles: saved.profiles.map((p) => ({
					id: String(p.id),
					name: String(p.name || 'Model AI'),
					provider: String(p.provider || 'custom'),
					baseUrl: String(p.baseUrl || 'https://api.groq.com/openai/v1'),
					apiKey: String(p.apiKey || ''),
					model: String(p.model || 'glm-4.7-flash'),
					temperature: typeof p.temperature === 'number' ? p.temperature : 0.7,
					maxTokens: typeof p.maxTokens === 'number' ? p.maxTokens : 2048,
					isDefault: Boolean(p.isDefault),
					updatedAt: p.updatedAt || new Date().toISOString()
				}))
			};
		}

		// Migrasi jika ada setting lama 'global_config'
		const legacyConfig = await getModuleSetting<any>('ai', 'global_config', null);
		const initialProfile: AIModelProfile = {
			id: 'default-model',
			name: legacyConfig?.model ? `Model Aktif (${legacyConfig.model})` : DEFAULT_AI_PROFILE.name,
			provider: legacyConfig?.provider || DEFAULT_AI_PROFILE.provider,
			baseUrl: DEFAULT_AI_PROFILE.baseUrl,
			apiKey: '',
			model: legacyConfig?.model || DEFAULT_AI_PROFILE.model,
			temperature: typeof legacyConfig?.temperature === 'number' ? legacyConfig.temperature : DEFAULT_AI_PROFILE.temperature,
			maxTokens: typeof legacyConfig?.maxTokens === 'number' ? legacyConfig.maxTokens : DEFAULT_AI_PROFILE.maxTokens,
			isDefault: true,
			updatedAt: new Date().toISOString()
		};

		const catalogToSeed: AICatalogConfig = {
			activeProfileId: initialProfile.id,
			profiles: [initialProfile]
		};

		// Simpan hasil seed ke DB agar selanjutnya langsung terbaca
		await saveAICatalogConfig(catalogToSeed, 'system-auto-seed');
		return catalogToSeed;
	} catch (e) {
		console.warn('[AI Config] Gagal memuat katalog AI dari DB, menggunakan fallback:', e);
		return DEFAULT_AI_CATALOG;
	}
}

/**
 * Menyimpan katalog konfigurasi profil AI ke database master.module_settings
 */
export async function saveAICatalogConfig(
	catalog: AICatalogConfig,
	updatedBy: string = 'system'
): Promise<boolean> {
	try {
		return await setModuleSetting(
			'ai',
			'models_catalog',
			catalog,
			'Katalog Profil Model Dinamis & Custom Endpoint AI ERP BCS',
			updatedBy
		);
	} catch (e) {
		console.error('[AI Config] Gagal menyimpan katalog AI ke DB:', e);
		return false;
	}
}

/**
 * Mengambil profil model AI yang saat ini sedang aktif dipilih.
 */
export async function getActiveAIConfig(): Promise<AIModelProfile> {
	try {
		const catalog = await getAICatalogConfig();
		const active = catalog.profiles.find((p) => p.id === catalog.activeProfileId);
		return active || catalog.profiles[0] || DEFAULT_AI_PROFILE;
	} catch (e) {
		console.warn('[AI Config] Gagal mengambil profil AI aktif, fallback default:', e);
		return DEFAULT_AI_PROFILE;
	}
}
