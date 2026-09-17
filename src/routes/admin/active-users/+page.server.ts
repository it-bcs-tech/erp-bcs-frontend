import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';
import { ADMIN_ROLES } from '$lib/types/auth';

export const load: PageServerLoad = async ({ parent }) => {
	const { user } = await parent();
	if (!user || !ADMIN_ROLES.includes(user.role?.toLowerCase())) {
		throw redirect(303, '/?access_denied=admin_only');
	}

	try {
		// 1. Ambil daftar kehadiran user
		const presenceRows = await sql`
			SELECT 
				p.user_id,
				p.current_path,
				p.activity_label,
				p.module_code,
				p.status as reported_status,
				p.last_ping_at,
				p.login_at,
				p.ip_address,
				p.user_agent,
				p.is_force_logout,
				u.email,
				u.erp_role,
				u.is_active as is_account_active,
				k.nama_karyawan,
				k.payroll_id,
				d.div_name as division,
				t.title as title_name,
				EXTRACT(EPOCH FROM (NOW() - p.last_ping_at))::int as seconds_ago
			FROM master.user_presence p
			JOIN master.erp_users u ON u.id = p.user_id
			LEFT JOIN master.m_karyawan k ON k.id = u.karyawan_id
			LEFT JOIN master.m_division d ON d.div_code = k.div_id
			LEFT JOIN master.m_title t ON t.title_code = k.title
			ORDER BY p.last_ping_at DESC
		`;

		const users = presenceRows.map((row: any) => {
			const secondsAgo = row.seconds_ago ?? 999999;
			let calculatedStatus: 'online' | 'idle' | 'offline' = 'offline';

			if (!row.is_force_logout) {
				if (secondsAgo <= 120) {
					calculatedStatus = row.reported_status === 'idle' ? 'idle' : 'online';
				} else if (secondsAgo <= 360) {
					calculatedStatus = 'idle';
				} else {
					calculatedStatus = 'offline';
				}
			}

			return {
				userId: Number(row.user_id),
				email: row.email,
				erpRole: row.erp_role || 'User',
				namaKaryawan: row.nama_karyawan || row.email,
				payrollId: row.payroll_id || '-',
				division: row.division || '-',
				titleName: row.title_name || '-',
				currentPath: row.current_path || '/',
				activityLabel: row.activity_label || 'Mengakses sistem ERP',
				moduleCode: row.module_code || 'portal',
				status: calculatedStatus,
				lastPingAt: row.last_ping_at ? new Date(row.last_ping_at).toISOString() : null,
				loginAt: row.login_at ? new Date(row.login_at).toISOString() : null,
				ipAddress: row.ip_address || '-',
				userAgent: row.user_agent || '-',
				isForceLogout: Boolean(row.is_force_logout),
				secondsAgo
			};
		});

		// 2. Ambil riwayat log aktivitas terbaru
		const logRows = await sql`
			SELECT 
				l.id,
				l.user_id,
				l.module_code,
				l.action_type,
				l.activity_label,
				l.path,
				l.ip_address,
				l.created_at,
				u.email,
				k.nama_karyawan,
				d.div_name as division
			FROM master.user_activity_logs l
			JOIN master.erp_users u ON u.id = l.user_id
			LEFT JOIN master.m_karyawan k ON k.id = u.karyawan_id
			LEFT JOIN master.m_division d ON d.div_code = k.div_id
			ORDER BY l.created_at DESC
			LIMIT 35
		`;

		const activityLogs = logRows.map((r: any) => ({
			id: Number(r.id),
			userId: Number(r.user_id),
			email: r.email,
			namaKaryawan: r.nama_karyawan || r.email,
			division: r.division || '-',
			moduleCode: r.module_code || 'portal',
			actionType: r.action_type,
			activityLabel: r.activity_label,
			path: r.path,
			ipAddress: r.ip_address,
			createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
		}));

		// 3. Ringkasan KPI
		const onlineCount = users.filter((u: any) => u.status === 'online').length;
		const idleCount = users.filter((u: any) => u.status === 'idle').length;
		const offlineCount = users.filter((u: any) => u.status === 'offline').length;

		// Hitung modul paling aktif
		const moduleFrequency: Record<string, number> = {};
		users
			.filter((u: any) => u.status !== 'offline')
			.forEach((u: any) => {
				const mod = u.moduleCode?.toUpperCase() || 'PORTAL';
				moduleFrequency[mod] = (moduleFrequency[mod] || 0) + 1;
			});

		let topModule = '-';
		let maxFreq = 0;
		for (const [mod, count] of Object.entries(moduleFrequency)) {
			if (count > maxFreq) {
				maxFreq = count;
				topModule = mod;
			}
		}

		return {
			users,
			activityLogs,
			kpi: {
				onlineCount,
				idleCount,
				offlineCount,
				totalTracked: users.length,
				topModule
			}
		};
	} catch (error: any) {
		console.error('[Admin Active Users Load Error]', error);
		return {
			users: [],
			activityLogs: [],
			kpi: {
				onlineCount: 0,
				idleCount: 0,
				offlineCount: 0,
				totalTracked: 0,
				topModule: '-'
			},
			error: error?.message || 'Gagal memuat data pengguna aktif'
		};
	}
};

export const actions: Actions = {
	forceLogout: async ({ request, locals }) => {
		const currentUser = locals.user;
		if (!currentUser || !ADMIN_ROLES.includes(currentUser.role?.toLowerCase())) {
			return fail(403, { error: 'Akses ditolak.' });
		}

		const data = await request.formData();
		const targetUserId = Number(data.get('targetUserId'));

		if (!targetUserId) {
			return fail(400, { error: 'Target user ID tidak valid' });
		}

		if (targetUserId === currentUser.id) {
			return fail(400, { error: 'Anda tidak dapat memutuskan sesi akun Anda sendiri.' });
		}

		try {
			await sql`
				UPDATE master.user_presence 
				SET 
					is_force_logout = true,
					status = 'offline',
					updated_at = NOW()
				WHERE user_id = ${targetUserId}
			`;

			const forwardedFor = request.headers.get('x-forwarded-for');
			const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : '127.0.0.1';

			await sql`
				INSERT INTO master.user_activity_logs (
					user_id, module_code, action_type, activity_label, path, ip_address
				) VALUES (
					${targetUserId}, 'admin', 'FORCE_LOGOUT', ${`Sesi diputuskan paksa oleh Admin (${currentUser.email})`}, '/admin/active-users', ${ipAddress}
				)
			`;

			return { success: true, message: 'Sesi pengguna berhasil diputuskan.' };
		} catch (error: any) {
			console.error('[Action Force Logout Error]', error);
			return fail(500, { error: error?.message || 'Gagal memutuskan sesi' });
		}
	},

	cancelForceLogout: async ({ request, locals }) => {
		const currentUser = locals.user;
		if (!currentUser || !ADMIN_ROLES.includes(currentUser.role?.toLowerCase())) {
			return fail(403, { error: 'Akses ditolak.' });
		}

		const data = await request.formData();
		const targetUserId = Number(data.get('targetUserId'));

		if (!targetUserId) {
			return fail(400, { error: 'Target user ID tidak valid' });
		}

		try {
			await sql`
				UPDATE master.user_presence 
				SET 
					is_force_logout = false,
					updated_at = NOW()
				WHERE user_id = ${targetUserId}
			`;

			return { success: true, message: 'Status force logout berhasil dicabut.' };
		} catch (error: any) {
			console.error('[Action Cancel Force Logout Error]', error);
			return fail(500, { error: error?.message || 'Gagal membatalkan status' });
		}
	}
};
