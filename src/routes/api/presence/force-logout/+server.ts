import { json, type RequestHandler } from '@sveltejs/kit';
import sql from '$lib/server/db';
import { ADMIN_ROLES } from '$lib/types/auth';

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = locals.user;
	if (!user || !ADMIN_ROLES.includes(user.role?.toLowerCase())) {
		return json({ ok: false, error: 'Akses ditolak. Hanya Administrator yang dapat memutuskan sesi.' }, { status: 403 });
	}

	try {
		const body = await request.json().catch(() => ({}));
		const targetUserId = Number(body.targetUserId);

		if (!targetUserId) {
			return json({ ok: false, error: 'Target user ID tidak valid' }, { status: 400 });
		}

		// Cegah admin me-logout dirinya sendiri secara tidak sengaja via API ini
		if (targetUserId === user.id) {
			return json({ ok: false, error: 'Anda tidak dapat memutuskan sesi akun Anda sendiri melalui fitur ini.' }, { status: 400 });
		}

		// Set flag is_force_logout di master.user_presence
		await sql`
			UPDATE master.user_presence 
			SET 
				is_force_logout = true,
				status = 'offline',
				updated_at = NOW()
			WHERE user_id = ${targetUserId}
		`;

		// Catat ke log audit
		const forwardedFor = request.headers.get('x-forwarded-for');
		const adminIp = forwardedFor ? forwardedFor.split(',')[0].trim() : (request.headers.get('x-real-ip') || '127.0.0.1');

		await sql`
			INSERT INTO master.user_activity_logs (
				user_id, module_code, action_type, activity_label, path, ip_address
			) VALUES (
				${targetUserId}, 'admin', 'FORCE_LOGOUT', ${`Sesi diputuskan paksa oleh Admin (${user.email})`}, '/admin/active-users', ${adminIp}
			)
		`.catch(() => {});

		return json({ ok: true, message: 'Sesi pengguna berhasil diputuskan.' });
	} catch (error: any) {
		console.error('[Force Logout Error]', error);
		return json({ ok: false, error: error?.message || 'Server error' }, { status: 500 });
	}
};
