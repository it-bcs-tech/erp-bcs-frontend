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
	// 1. Cari user di erp_users + join data karyawan
	const rows = await sql<ErpUserRow[]>`
		SELECT
			eu.id,
			eu.email,
			eu.password,
			eu.erp_role,
			eu.allowed_modules,
			eu.is_active,
			eu.karyawan_id,
			mk.nama_karyawan,
			mk.level    AS level_code,
			ml.level    AS level_name,
			ml.level_sequence,
			mk.div_id,
			md.div_name,
			mk.aktif    AS karyawan_aktif
		FROM master.erp_users eu
		LEFT JOIN master.m_karyawan  mk ON mk.id = eu.karyawan_id
		LEFT JOIN master.m_level     ml ON ml.level_code = mk.level
		LEFT JOIN master.m_division  md ON md.div_code   = mk.div_id
		WHERE LOWER(eu.email) = LOWER(${email})
		LIMIT 1
	`;

	const user = rows[0];
	if (!user) {
		throw new AuthError('Email tidak terdaftar sebagai pengguna sistem ERP', 'EMAIL_NOT_FOUND');
	}

	// 2. Verifikasi password (bcrypt)
	const isPasswordValid = await bcrypt.compare(password, user.password);
	if (!isPasswordValid) {
		throw new AuthError('Password yang Anda masukkan salah', 'INVALID_PASSWORD');
	}

	// 3. Cek status aktif
	if (!user.is_active) {
		throw new AuthError('Akun ERP Anda dinonaktifkan. Hubungi Administrator.', 'ACCOUNT_INACTIVE');
	}
	if (user.karyawan_id && user.karyawan_aktif !== 'Y') {
		throw new AuthError('Status Karyawan Anda tidak aktif.', 'ACCOUNT_INACTIVE');
	}

	// 4. Resolve module access
	const role = user.erp_role || 'user';
	const levelSequence = Number(user.level_sequence) || 0;
	const divisionCode = user.div_id || '';
	
	// Parse JSONB
	let customModules: string[] = [];
	try {
		if (typeof user.allowed_modules === 'string') {
			customModules = JSON.parse(user.allowed_modules);
		} else if (Array.isArray(user.allowed_modules)) {
			customModules = user.allowed_modules;
		}
	} catch (e) {
		customModules = [];
	}

	const allowedModules = resolveModuleAccess(role, levelSequence, divisionCode, customModules);

	// 5. Update last_login_at
	await sql`
		UPDATE master.erp_users 
		SET last_login_at = CURRENT_TIMESTAMP 
		WHERE id = ${user.id}
	`;

	// 6. Build AuthUser
	const authUser: AuthUser = {
		id: Number(user.id),
		name: user.nama_karyawan || email.split('@')[0],
		email: user.email,
		role,
		level: user.level_name || 'Unknown',
		levelSequence,
		division: user.div_name || 'Unknown',
		divisionCode,
		allowedModules
	};

	const token = generateSimpleToken(authUser.id);

	return { user: authUser, token };
}

export async function getUserFromToken(token: string): Promise<AuthUser | null> {
	try {
		const userId = decodeSimpleToken(token);
		if (!userId) return null;

		const rows = await sql<ErpUserRow[]>`
			SELECT
				eu.id,
				eu.email,
				eu.password,
				eu.erp_role,
				eu.allowed_modules,
				eu.is_active,
				eu.karyawan_id,
				mk.nama_karyawan,
				mk.level    AS level_code,
				ml.level    AS level_name,
				ml.level_sequence,
				mk.div_id,
				md.div_name,
				mk.aktif    AS karyawan_aktif
			FROM master.erp_users eu
			LEFT JOIN master.m_karyawan  mk ON mk.id = eu.karyawan_id
			LEFT JOIN master.m_level     ml ON ml.level_code = mk.level
			LEFT JOIN master.m_division  md ON md.div_code   = mk.div_id
			WHERE eu.id = ${userId}
			LIMIT 1
		`;

		const user = rows[0];
		if (!user || !user.is_active || (user.karyawan_id && user.karyawan_aktif !== 'Y')) {
			return null;
		}

		const role = user.erp_role || 'user';
		const levelSequence = Number(user.level_sequence) || 0;
		const divisionCode = user.div_id || '';
		
		let customModules: string[] = [];
		try {
			if (typeof user.allowed_modules === 'string') {
				customModules = JSON.parse(user.allowed_modules);
			} else if (Array.isArray(user.allowed_modules)) {
				customModules = user.allowed_modules;
			}
		} catch (e) {
			customModules = [];
		}

		const allowedModules = resolveModuleAccess(role, levelSequence, divisionCode, customModules);

		return {
			id: Number(user.id),
			name: user.nama_karyawan || user.email.split('@')[0],
			email: user.email,
			role,
			level: user.level_name || 'Unknown',
			levelSequence,
			division: user.div_name || 'Unknown',
			divisionCode,
			allowedModules
		};
	} catch {
		return null;
	}
}

// ─────────────────────────────────────────────────────────
// PRIVATE HELPERS
// ─────────────────────────────────────────────────────────

function resolveModuleAccess(
	role: string,
	levelSequence: number,
	divisionCode: string,
	customModules: string[]
): ModuleId[] {
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
		const roleModules = ROLE_MODULE_MAP[role];
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
