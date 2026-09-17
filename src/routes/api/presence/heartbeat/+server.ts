import { json, type RequestHandler } from '@sveltejs/kit';
import sql from '$lib/server/db';
import { resolveActivity } from '$lib/utils/activity-resolver';

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = locals.user;
	if (!user || !user.id) {
		return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = await request.json().catch(() => ({}));
		const path: string = body.path || '/';
		const clientStatus: string = body.status === 'idle' ? 'idle' : 'online';

		const resolved = resolveActivity(path);
		const activityLabel: string = body.activityLabel || resolved.activityLabel;
		const moduleCode: string = resolved.moduleCode;

		// Extract Client IP
		const forwardedFor = request.headers.get('x-forwarded-for');
		const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : (request.headers.get('x-real-ip') || '127.0.0.1');
		const userAgent = request.headers.get('user-agent') || 'Unknown';

		// Cek apakah ada record presence sebelumnya untuk mendeteksi perpindahan halaman / aksi
		const prev = await sql`
			SELECT current_path, is_force_logout 
			FROM master.user_presence 
			WHERE user_id = ${user.id}
			LIMIT 1
		`;

		// Jika administrator telah menandai force logout untuk user ini
		if (prev.length > 0 && prev[0].is_force_logout) {
			return json({ ok: true, force_logout: true });
		}

		// Jika halaman/pekerjaan berganti, catat log riwayat aktivitas baru
		if (prev.length === 0 || prev[0].current_path !== path) {
			await sql`
				INSERT INTO master.user_activity_logs (
					user_id, module_code, action_type, activity_label, path, ip_address
				) VALUES (
					${user.id}, ${moduleCode}, 'NAVIGATION', ${activityLabel}, ${path}, ${ipAddress}
				)
			`.catch((err) => console.error('[Presence] Error logging activity:', err));
		}

		// Upsert state terkini ke master.user_presence
		const upsertRes = await sql`
			INSERT INTO master.user_presence (
				user_id, current_path, activity_label, module_code, status, last_ping_at, ip_address, user_agent, updated_at
			) VALUES (
				${user.id}, ${path}, ${activityLabel}, ${moduleCode}, ${clientStatus}, NOW(), ${ipAddress}, ${userAgent}, NOW()
			)
			ON CONFLICT (user_id) DO UPDATE SET
				current_path = EXCLUDED.current_path,
				activity_label = EXCLUDED.activity_label,
				module_code = EXCLUDED.module_code,
				status = EXCLUDED.status,
				last_ping_at = NOW(),
				ip_address = EXCLUDED.ip_address,
				user_agent = EXCLUDED.user_agent,
				updated_at = NOW()
			RETURNING is_force_logout
		`;

		const forceLogout = upsertRes[0]?.is_force_logout ?? false;

		return json({
			ok: true,
			force_logout: Boolean(forceLogout)
		});
	} catch (error: any) {
		console.error('[Presence Heartbeat Error]', error);
		return json({ ok: false, error: error?.message || 'Server error' }, { status: 500 });
	}
};
