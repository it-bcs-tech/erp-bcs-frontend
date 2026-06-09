/**
 * Auth Types — Definisi tipe data untuk sistem RBAC ERP-BCS
 * ─────────────────────────────────────────────────────────
 */

/** ID modul ERP yang tersedia */
export type ModuleId = 'fms' | 'ocs' | 'hris' | 'marketing' | 'pms' | 'kasir' | 'finance' | 'dms' | 'qhse';

/** Data user yang disimpan setelah login (dikirim via cookie & store) */
export interface AuthUser {
	id: number;
	name: string;
	email: string;
	role: string;            // role dari erp_users (superadmin, operator_fms, dll)
	level: string;           // level name dari m_level (Operator, Staff, Officer, Spv, Mgr, GM)
	levelSequence: number;   // urutan hierarki (0=unclassified, 1=Operator, 2=Staff, 3=Officer, 4=Spv, 5=Mgr, 6=GM)
	division: string;        // nama divisi dari m_division
	divisionCode: string;    // kode divisi (DV_41, DV_37, dll)
	allowedModules: ModuleId[];  // daftar modul yang bisa diakses
	authSource?: 'laravel' | 'svelte-db'; // sumber otentikasi saat login
}

/** Semua modul yang tersedia di ERP */
export const ALL_MODULES: ModuleId[] = ['fms', 'ocs', 'hris', 'marketing', 'pms', 'kasir', 'finance', 'dms', 'qhse'];

/** Level sequence minimum untuk akses OCS (Supervisor = 4) */
export const OCS_MIN_LEVEL_SEQUENCE = 4;

/** Role yang dianggap sebagai administrator (akses semua modul) */
export const ADMIN_ROLES = ['superadmin', 'administrator'];

/**
 * Mapping Role Spesifik ERP → Modul
 * Digunakan jika user tidak memiliki override di kolom allowed_modules
 */
export const ROLE_MODULE_MAP: Record<string, ModuleId[]> = {
	'operator_fms': ['fms'],
	'admin_fms': ['fms', 'kasir'],
	'operator_ocs': ['ocs', 'fms', 'kasir'], // OCS check level tetap berlaku di service
	'staff_finance': ['finance'],
	'admin_finance': ['finance', 'kasir'],
	'staff_hr': ['hris'],
	'manager_hr': ['hris'],
	'staff_marketing': ['marketing'],
	'staff_procurement': ['pms'],
	'staff_dms': ['dms'],
	'staff_qhse': ['qhse']
};

/**
 * Mapping divisi → modul default yang bisa diakses
 * Fallback jika role user adalah 'user' biasa
 */
export const DIVISION_MODULE_MAP: Record<string, ModuleId[]> = {
	'DV_41': ['fms', 'kasir'],                       // OPERATION
	'DV_37': ['hris'],                                // HUMAN CAPITAL
	'DV_36': ['finance'],                             // FINANCE
	'DV_43': ['marketing', 'pms'],                    // BUSINESS DEV
	'DV_28': ALL_MODULES,                             // IT DEVELOPER
	'DV_44': ALL_MODULES,                             // DIREKTORAT UTAMA
	'DV_18': ['fms'],                                 // MAINTENANCE & ASSET
	'DV_35': ['fms', 'ocs', 'kasir', 'marketing'],   // COMMERCIAL
	'DV_06': ALL_MODULES,                             // INTERNAL AUDIT
	'DV_07': ALL_MODULES,                             // GENERAL MANAGEMENT
	'DV_25': ['fms', 'kasir'],                        // OTHER
};
