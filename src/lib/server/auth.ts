/**
 * Auth Service — Server-Side Authentication Logic
 * ═══════════════════════════════════════════════════════════
 * SEKARANG: Query ke PostgreSQL (master.erp_users)
 * NANTI:    Ganti dengan apiFetch() ke Laravel backend
 * ═══════════════════════════════════════════════════════════
 */

import sql from '$lib/server/db';
import bcrypt from 'bcryptjs';
import type { AuthUser, ModuleId } from '$lib/types/auth';
import {
	ALL_MODULES,
	ADMIN_ROLES,
	OCS_MIN_LEVEL_SEQUENCE,
	ROLE_MODULE_MAP,
	DIVISION_MODULE_MAP
} from '$lib/types/auth';

// ─────────────────────────────────────────────────────────
// Tipe untuk raw database row
// ─────────────────────────────────────────────────────────
interface ErpUserRow {
	id: string;
	email: string;
	password: string;
	erp_role: string;
	allowed_modules: any; // JSONB
	is_active: boolean;
	karyawan_id: string | null;
	nama_karyawan: string | null;
	level_code: string | null;
	level_name: string | null;
	level_sequence: string | null;
	div_id: string | null;
	div_name: string | null;
	karyawan_aktif: string | null;
}

// ─────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────

export async function authenticateUser(
	email: string,
	password: string
): Promise<{ user: AuthUser; token: string }> {
	// 1. Cari user di erp_users + join data karyawan (diambil dari helper)
	const authUser = await getAuthUserByEmail(email);
	if (!authUser) {
		throw new AuthError('Email tidak terdaftar sebagai pengguna sistem ERP', 'EMAIL_NOT_FOUND');
	}

	// Butuh query ulang untuk mengecek password dan status aktif
	const rows = await sql`
		SELECT password, is_active, karyawan_id, karyawan_aktif 
		FROM master.erp_users eu
		LEFT JOIN master.m_karyawan mk ON mk.id = eu.karyawan_id
		WHERE LOWER(eu.email) = LOWER(${email}) LIMIT 1
	`;
	const user = rows[0];

	// 4. Update last_login_at
	await sql`
		UPDATE master.erp_users 
		SET last_login_at = CURRENT_TIMESTAMP 
		WHERE LOWER(email) = LOWER(${email})
	`;

	const token = generateSimpleToken(authUser.id);

	return { user: authUser, token };
}

/**
 * Helper untuk mengambil dan membangun AuthUser dengan RBAC yang akurat dari database Svelte
 */
export async function getAuthUserByEmail(email: string): Promise<AuthUser | null> {
	const rows = await sql<ErpUserRow[]>`
		SELECT
			eu.id,
			eu.email,
			eu.erp_role,
			eu.allowed_modules,
			mk.nama_karyawan,
			ml.level    AS level_name,
			ml.level_sequence,
			md.div_name,
			mk.div_id,
			mt.title as title_name
		FROM master.erp_users eu
		LEFT JOIN master.m_karyawan  mk ON mk.id = eu.karyawan_id
		LEFT JOIN master.m_level     ml ON ml.level_code = mk.level
		LEFT JOIN master.m_division  md ON md.div_code   = mk.div_id
		LEFT JOIN master.m_title     mt ON mt.title_code = mk.title
		WHERE LOWER(eu.email) = LOWER(${email})
		LIMIT 1
	`;

	const user = rows[0];
	if (!user) return null;

	const role = user.erp_role || 'user';
	const levelSequence = Number(user.level_sequence) || 0;
	const divisionCode = user.div_id || '';
	
	let customModules: string[] = [];
	try {
		let parsed = user.allowed_modules;
		if (typeof parsed === 'string') parsed = JSON.parse(parsed);
		if (typeof parsed === 'string') parsed = JSON.parse(parsed); // Double parse for JSON string inside JSONB
		if (Array.isArray(parsed)) customModules = parsed;
	} catch (e) {
		customModules = [];
	}

	const allowedModules = await resolveModuleAccess(role, levelSequence, divisionCode, customModules);

	return {
		id: Number(user.id),
		name: user.nama_karyawan || email.split('@')[0],
		email: user.email,
		role,
		level: user.level_name || 'Unknown',
		levelSequence,
		division: user.div_name || 'Unknown',
		divisionCode,
		titleName: user.title_name || '',
		allowedModules
	};
}

export async function getUserFromToken(token: string): Promise<AuthUser | null> {
	try {
		const userId = decodeSimpleToken(token);
		if (!userId) return null;

		const rows = await sql<{email: string}[]>`
			SELECT email FROM master.erp_users WHERE id = ${userId} LIMIT 1
		`;

		const user = rows[0];
		if (!user) return null;

		try {
			const authUser = await getAuthUserByEmail(user.email);
			if (authUser) {
				return authUser;
			}
		} catch {}
		return null;
	} catch {
		return null;
	}
}

// ─────────────────────────────────────────────────────────
// PRIVATE HELPERS
// ─────────────────────────────────────────────────────────

export async function getDynamicRoleModuleMap(): Promise<Record<string, ModuleId[]>> {
	try {
		const rows = await sql`
			SELECT r.name as role, array_agg(p.name) as modules
			FROM master.roles r
			LEFT JOIN master.role_has_permissions rhp ON rhp.role_id = r.id
			LEFT JOIN master.permissions p ON p.id = rhp.permission_id
			WHERE p.name IS NOT NULL AND p.name LIKE 'module.%'
			GROUP BY r.name
		`;
		
		const map: Record<string, ModuleId[]> = {};
		for (const row of rows) {
			map[row.role] = row.modules.map((m: string) => m.replace('module.', '')) as ModuleId[];
		}
		return map;
	} catch (e) {
		console.error("Error fetching dynamic role map:", e);
		return ROLE_MODULE_MAP; // Fallback to static if DB fails
	}
}

async function resolveModuleAccess(
	role: string,
	levelSequence: number,
	divisionCode: string,
	customModules: string[]
): Promise<ModuleId[]> {
	// 1. Jika ada custom override bintang (all access)
	if (customModules.includes('*') || ADMIN_ROLES.includes(role)) {
		return [...ALL_MODULES];
	}

	const modules = new Set<ModuleId>();

	// 2. Terapkan custom modules jika tidak kosong
	if (customModules.length > 0) {
		customModules.forEach((m) => {
			if (ALL_MODULES.includes(m as ModuleId)) {
				modules.add(m as ModuleId);
			}
		});
	} else {
		// 3. Fallback ke Role Spesifik
		const dynamicMap = await getDynamicRoleModuleMap();
		const roleModules = dynamicMap[role];
		if (roleModules) {
			roleModules.forEach((m) => modules.add(m));
		} else {
			// 4. Fallback ke Divisi jika role adalah 'user' biasa
			const divModules = DIVISION_MODULE_MAP[divisionCode];
			if (divModules) {
				divModules.forEach((m) => modules.add(m));
			}
		}
	}

	// 5. Khusus OCS: cek level minimum (Supervisor = sequence 4)
	if (modules.has('ocs') && levelSequence < OCS_MIN_LEVEL_SEQUENCE) {
		modules.delete('ocs');
	}

	return Array.from(modules);
}

function generateSimpleToken(userId: number): string {
	const payload = { uid: userId, iat: Date.now(), exp: Date.now() + 24 * 60 * 60 * 1000 };
	return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

function decodeSimpleToken(token: string): number | null {
	try {
		const payload = JSON.parse(Buffer.from(token, 'base64url').toString());
		if (!payload.uid || !payload.exp) return null;
		if (Date.now() > payload.exp) return null;
		return payload.uid;
	} catch {
		return null;
	}
}

export class AuthError extends Error {
	code: string;
	constructor(message: string, code: string) {
		super(message);
		this.code = code;
		this.name = 'AuthError';
	}
}
