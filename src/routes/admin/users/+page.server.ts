import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';
import bcrypt from 'bcryptjs';

// Load list of users for the datatable
export const load: PageServerLoad = async () => {
	try {
		const usersList = await sql`
			SELECT 
				eu.id,
				eu.email,
				eu.erp_role,
				eu.allowed_modules,
				eu.is_active,
				eu.last_login_at,
				eu.created_at,
				mk.id AS karyawan_id,
				mk.payroll_id AS nik,
				mk.nama_karyawan,
				ml.level AS level_name,
				md.div_name
			FROM master.erp_users eu
			LEFT JOIN master.m_karyawan mk ON mk.id = eu.karyawan_id
			LEFT JOIN master.m_level ml ON ml.level_code = mk.level
			LEFT JOIN master.m_division md ON md.div_code = mk.div_id
			ORDER BY eu.id DESC
		`;

		return {
			usersList
		};
	} catch (error: any) {
		return { usersList: [], error: error.message };
	}
};

export const actions = {
	// ── CREATE NEW USER ──
	create: async ({ request }) => {
		const data = await request.formData();
		const email = data.get('email')?.toString().trim();
		const password = data.get('password')?.toString();
		const role = data.get('role')?.toString().trim();
		const karyawanId = data.get('karyawan_id')?.toString();
		const customModulesStr = data.get('allowed_modules')?.toString() || '[]';

		if (!email || !password || !role) {
			return fail(400, { success: false, message: 'Email, password, and role are required' });
		}

		try {
			// Check if email already exists
			const [existing] = await sql`SELECT id FROM master.erp_users WHERE email = ${email}`;
			if (existing) {
				return fail(400, { success: false, message: 'Email already registered in ERP' });
			}

			// Validate JSON modules
			let allowedModules = '[]';
			try {
				JSON.parse(customModulesStr);
				allowedModules = customModulesStr;
			} catch {
				allowedModules = '[]';
			}

			// Hash password
			const salt = await bcrypt.genSalt(10);
			const hashedPassword = await bcrypt.hash(password, salt);

			// Insert
			await sql`
				INSERT INTO master.erp_users (
					karyawan_id, email, password, erp_role, allowed_modules
				) VALUES (
					${karyawanId ? Number(karyawanId) : null}, 
					${email}, 
					${hashedPassword}, 
					${role}, 
					${allowedModules}::jsonb
				)
			`;

			return { success: true, message: 'User successfully created' };
		} catch (error: any) {
			return fail(500, { success: false, message: error.message });
		}
	},

	// ── UPDATE USER ──
	update: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();
		const role = data.get('role')?.toString().trim();
		const customModulesStr = data.get('allowed_modules')?.toString() || '[]';
		const resetPassword = data.get('reset_password')?.toString();

		if (!id || !role) {
			return fail(400, { success: false, message: 'ID and role are required' });
		}

		try {
			// Validate JSON
			let allowedModules = '[]';
			try {
				JSON.parse(customModulesStr);
				allowedModules = customModulesStr;
			} catch {
				allowedModules = '[]';
			}

			if (resetPassword && resetPassword.trim().length > 0) {
				// Update with new password
				const salt = await bcrypt.genSalt(10);
				const hashedPassword = await bcrypt.hash(resetPassword, salt);
				await sql`
					UPDATE master.erp_users 
					SET erp_role = ${role}, 
					    allowed_modules = ${allowedModules}::jsonb,
					    password = ${hashedPassword},
					    updated_at = CURRENT_TIMESTAMP
					WHERE id = ${Number(id)}
				`;
			} else {
				// Update without password
				await sql`
					UPDATE master.erp_users 
					SET erp_role = ${role}, 
					    allowed_modules = ${allowedModules}::jsonb,
					    updated_at = CURRENT_TIMESTAMP
					WHERE id = ${Number(id)}
				`;
			}

			return { success: true, message: 'User updated successfully' };
		} catch (error: any) {
			return fail(500, { success: false, message: error.message });
		}
	},

	// ── TOGGLE ACTIVE STATUS ──
	toggleStatus: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();
		const currentStatus = data.get('current_status') === 'true';

		if (!id) {
			return fail(400, { success: false, message: 'User ID is required' });
		}

		try {
			const newStatus = !currentStatus;
			await sql`
				UPDATE master.erp_users 
				SET is_active = ${newStatus}, updated_at = CURRENT_TIMESTAMP 
				WHERE id = ${Number(id)}
			`;

			return { 
				success: true, 
				message: `User successfully ${newStatus ? 'activated' : 'deactivated'}` 
			};
		} catch (error: any) {
			return fail(500, { success: false, message: error.message });
		}
	}
} satisfies Actions;
