import sql from '$lib/server/db';

export interface ApproverSetting {
	name: string;
	position: string;
	payroll_id?: string;
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
		const jsonVal = typeof value === 'object' ? JSON.stringify(value) : value;
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
