import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface SystemSettings {
	// Privasi & Mode Presentasi
	hideSalaryNominals: boolean;
	maskSensitiveInfo: boolean;

	// Profil Perusahaan
	companyName: string;
	companyShortName: string;
	headOfficeAddress: string;
	poolCilegonAddress: string;
	poolGunungPutriAddress: string;
	companyTaxId: string;
	companyPhone: string;
	companyEmail: string;

	// Preferensi Sistem
	theme: 'system' | 'light' | 'dark';
	dateFormat: 'DD/MM/YYYY' | 'YYYY-MM-DD';
	enableAudioAlerts: boolean;
	autoLogoutMinutes: number;
}

const defaultSettings: SystemSettings = {
	hideSalaryNominals: false,
	maskSensitiveInfo: false,
	companyName: 'PT. Buana Centra Swakarsa',
	companyShortName: 'BCS Logistics',
	headOfficeAddress: 'Jl. Raya Merak KM 115, Gerem, Grogol, Kota Cilegon, Banten 42438',
	poolCilegonAddress: 'Pool Utama BCS, Gerem, Grogol, Cilegon',
	poolGunungPutriAddress: 'Pool BCS Gunung Putri, Jl. Mercedes Benz, Wanaherang, Bogor',
	companyTaxId: '01.234.567.8-412.000',
	companyPhone: '+62 254 571234',
	companyEmail: 'corporate@bcsgroup.co.id',
	theme: 'system',
	dateFormat: 'DD/MM/YYYY',
	enableAudioAlerts: true,
	autoLogoutMinutes: 60
};

function createSettingsStore() {
	let initial = { ...defaultSettings };

	if (browser) {
		try {
			const saved = localStorage.getItem('bcs_erp_system_settings');
			if (saved) {
				initial = { ...defaultSettings, ...JSON.parse(saved) };
			}
		} catch (e) {
			console.error('Error loading settings from localStorage:', e);
		}
	}

	const { subscribe, set, update } = writable<SystemSettings>(initial);

	return {
		subscribe,
		updateSettings: (partial: Partial<SystemSettings>) => {
			update((current) => {
				const updated = { ...current, ...partial };
				if (browser) {
					try {
						localStorage.setItem('bcs_erp_system_settings', JSON.stringify(updated));
					} catch (e) {
						console.error('Error saving settings to localStorage:', e);
					}
				}
				return updated;
			});
		},
		toggleSalaryPrivacy: () => {
			update((current) => {
				const updated = { ...current, hideSalaryNominals: !current.hideSalaryNominals };
				if (browser) {
					try {
						localStorage.setItem('bcs_erp_system_settings', JSON.stringify(updated));
					} catch (e) {
						console.error('Error saving settings to localStorage:', e);
					}
				}
				return updated;
			});
		},
		resetToDefault: () => {
			if (browser) {
				localStorage.removeItem('bcs_erp_system_settings');
			}
			set(defaultSettings);
		}
	};
}

export const systemSettings = createSettingsStore();

/**
 * Format mata uang dengan mempertimbangkan Mode Presentasi / Sensor Gaji
 */
export function formatCurrencyPrivacy(amount: number | null | undefined, hideNominal: boolean = false): string {
	if (hideNominal) {
		return 'Rp ••••••••';
	}
	return new Intl.NumberFormat('id-ID', {
		style: 'currency',
		currency: 'IDR',
		maximumFractionDigits: 0
	}).format(amount || 0);
}

/**
 * Format teks sensitif seperti NIK atau Nomor Rekening
 */
export function formatMaskedText(text: string | null | undefined, mask: boolean = false): string {
	if (!text) return '-';
	if (!mask) return text;
	if (text.length <= 4) return '••••';
	return text.slice(0, 3) + '••••' + text.slice(-3);
}
