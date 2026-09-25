import sql from '$lib/server/db';

export interface ApproverSetting {
	name: string;
	position: string;
	payroll_id?: string;
}

export interface EmployeeOption {
	payrollId: string;
	name: string;
	position: string;
	department?: string;
}

/**
 * Mengambil daftar karyawan yang telah difilter fokus & relevan dengan user yang login:
 * 1. Satu departemen dengan user
 * 2. Relasi atasan / bawahan langsung (m_atasan)
 * 3. Khusus modul PMS: Karyawan departemen Procurement (D_19) & Manajemen/Direksi (DV_44)
 * 4. Karyawan tingkat manajerial (Spv, Mgr, GM) jika user admin tanpa departemen
 * 5. Mengabaikan level operator pelaksana biasa (Lvl_005) agar dropdown tidak penuh
 */
export async function getFilteredEmployeesForSettings(
	user: { id?: number; email?: string; payrollId?: string | null } | null | undefined,
	moduleName: string = 'pms'
): Promise<EmployeeOption[]> {
	try {
		let userDept: string | null = null;
		let userTitle: string | null = null;

		if (user) {
			const userEmpRows = await sql`
				SELECT mk.payroll_id, mk.title, mk.dept_id, mk.div_id
				FROM master.erp_users eu
				LEFT JOIN master.m_karyawan mk ON mk.id = eu.karyawan_id
				WHERE eu.id = ${user.id || 0}
				   OR (${user.email || ''} != '' AND LOWER(eu.email) = LOWER(${user.email || ''}))
				   OR (${user.payrollId || ''} != '' AND mk.payroll_id = ${user.payrollId || ''})
				LIMIT 1
			`;
			if (userEmpRows.length > 0) {
				userDept = userEmpRows[0].dept_id || null;
				userTitle = userEmpRows[0].title || null;
			}
		}

		let empRows = await sql`
			SELECT 
				k.payroll_id as "payrollId", 
				k.nama_karyawan as name, 
				COALESCE(t.title, k.title, '') as position,
				COALESCE(dp.dept_name, '') as department
			FROM master.m_karyawan k
			LEFT JOIN master.m_title t ON t.title_code = k.title
			LEFT JOIN master.m_dept dp ON dp.dept_code = k.dept_id
			WHERE (k.aktif = 'Y' OR k.aktif = '1' OR k.aktif IS NULL)
			  AND (k.level != 'Lvl_005' OR k.level IS NULL)
			  AND (
				(${userDept}::text IS NOT NULL AND k.dept_id = ${userDept})
				OR (${userTitle}::text IS NOT NULL AND k.title IN (
					SELECT title_atasan FROM master.m_atasan WHERE title_bawahan = ${userTitle}
					UNION
					SELECT title_bawahan FROM master.m_atasan WHERE title_atasan = ${userTitle}
				))
				OR (${moduleName} = 'pms' AND (
					k.dept_id = 'D_19' 
					OR k.div_id = 'DV_44'
				))
				OR (${userDept}::text IS NULL AND k.level IN ('Lvl_002', 'Lvl_003', 'Lvl_007'))
			  )
			ORDER BY k.nama_karyawan ASC
		`;

		// Fallback jika hasil kosong: ambil seluruh pejabat/manajerial dan departemen pengadaan
		if (!empRows || empRows.length === 0) {
			empRows = await sql`
				SELECT 
					k.payroll_id as "payrollId", 
					k.nama_karyawan as name, 
					COALESCE(t.title, k.title, '') as position,
					COALESCE(dp.dept_name, '') as department
				FROM master.m_karyawan k
				LEFT JOIN master.m_title t ON t.title_code = k.title
				LEFT JOIN master.m_dept dp ON dp.dept_code = k.dept_id
				WHERE (k.aktif = 'Y' OR k.aktif = '1' OR k.aktif IS NULL)
				  AND (k.level != 'Lvl_005' OR k.level IS NULL)
				  AND (k.div_id = 'DV_44' OR k.dept_id = 'D_19' OR k.level IN ('Lvl_002', 'Lvl_003', 'Lvl_007'))
				ORDER BY k.nama_karyawan ASC
			`;
		}

		return empRows.map((r: any) => ({
			payrollId: r.payrollId || '',
			name: r.name || '',
			position: r.position || '',
			department: r.department || ''
		}));
	} catch (err) {
		console.error('Error in getFilteredEmployeesForSettings:', err);
		return [];
	}
}

export async function getModuleSetting<T = any>(
	module: string,
	key: string,
	defaultValue: T
): Promise<T> {
	try {
		const [row] = await sql`
			SELECT setting_value
			FROM master.module_settings
			WHERE module = ${module} AND setting_key = ${key}
			LIMIT 1
		`;
		if (!row || row.setting_value === null || row.setting_value === undefined) {
			return defaultValue;
		}
		if (typeof row.setting_value === 'string') {
			try {
				return JSON.parse(row.setting_value);
			} catch {
				return row.setting_value as unknown as T;
			}
		}
		return row.setting_value as T;
	} catch (err) {
		console.error(`Error loading setting ${module}.${key}:`, err);
		return defaultValue;
	}
}

export async function getModuleSettings(module: string): Promise<Record<string, any>> {
	try {
		const rows = await sql`
			SELECT setting_key, setting_value, description, updated_at, updated_by
			FROM master.module_settings
			WHERE module = ${module}
			ORDER BY setting_key ASC
		`;
		const settings: Record<string, any> = {};
		for (const r of rows) {
			settings[r.setting_key] = typeof r.setting_value === 'string'
				? JSON.parse(r.setting_value)
				: r.setting_value;
		}
		return settings;
	} catch (err) {
		console.error(`Error loading settings for module ${module}:`, err);
		return {};
	}
}

export async function getAllModuleSettings(): Promise<Array<{
	id: number;
	module: string;
	setting_key: string;
	setting_value: any;
	description: string;
	updated_at: string;
	updated_by: string;
}>> {
	try {
		const rows = await sql`
			SELECT id, module, setting_key, setting_value, description, to_char(updated_at, 'YYYY-MM-DD HH24:MI') as updated_at, updated_by
			FROM master.module_settings
			ORDER BY module ASC, setting_key ASC
		`;
		return rows.map((r: any) => ({
			...r,
			setting_value: typeof r.setting_value === 'string' ? JSON.parse(r.setting_value) : r.setting_value
		}));
	} catch (err) {
		console.error('Error loading all module settings:', err);
		return [];
	}
}

export async function setModuleSetting(
	module: string,
	key: string,
	value: any,
	description?: string,
	updatedBy?: string
): Promise<boolean> {
	try {
		const jsonVal = JSON.stringify(value);
		await sql`
			INSERT INTO master.module_settings (module, setting_key, setting_value, description, updated_at, updated_by)
			VALUES (
				${module}, 
				${key}, 
				${jsonVal}::jsonb, 
				${description || null}, 
				CURRENT_TIMESTAMP, 
				${updatedBy || 'system'}
			)
			ON CONFLICT (module, setting_key) 
			DO UPDATE SET 
				setting_value = EXCLUDED.setting_value,
				description = COALESCE(EXCLUDED.description, master.module_settings.description),
				updated_at = CURRENT_TIMESTAMP,
				updated_by = EXCLUDED.updated_by
		`;
		return true;
	} catch (err) {
		console.error(`Error saving setting ${module}.${key}:`, err);
		return false;
	}
}
