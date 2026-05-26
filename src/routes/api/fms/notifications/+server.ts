import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import sql from '$lib/server/db';

export const GET: RequestHandler = async () => {
	try {
		// Fetch latest 20 system events or anomalies
		const notifsQuery = await sql`
			SELECT 
				c.id as notif_id,
				u.nomor_unit as nopol,
				c.event as event_type,
				c.notes,
				c.recorded_at as time
			FROM fleet.trip_checkpoint c
			JOIN fleet.trip t ON t.id = c.trip_id
			JOIN fleet.unit u ON u.id = t.unit_id
			WHERE c.notes LIKE '%Auto-pilot:%' 
			   OR c.notes LIKE '%Sistem:%' 
			   OR c.notes LIKE '%ANOMALI:%'
			   OR c.notes LIKE '%INCIDENT%'
			ORDER BY c.recorded_at DESC
			LIMIT 30
		`;

		const notifications = notifsQuery.map((n: any) => {
			let type = 'INFO';
			let title = 'Sistem Update';

			if (n.notes.includes('ANOMALI') || n.notes.includes('INCIDENT') || n.notes.includes('CRITICAL')) {
				type = 'CRITICAL';
				title = '🚨 Peringatan AI';
			} else if (n.notes.includes('WARNING') || n.notes.includes('shortcut')) {
				type = 'WARNING';
				title = '⚠️ Perhatian Sistem';
			} else if (n.notes.includes('Auto-pilot')) {
				type = 'INFO';
				title = '🤖 Auto-pilot Update';
			}

			// Clean up notes for message
			let message = n.notes.replace('Auto-pilot: ', '').replace('Sistem: ', '').replace('ANOMALI: ', '');
			message = `Truk ${n.nopol}: ${message}`;

			return {
				id: String(n.notif_id),
				title,
				message,
				type,
				timestamp: n.time
			};
		});

		return json({ success: true, notifications });
	} catch (error: any) {
		console.error('Failed to fetch notifications:', error);
		return json({ success: false, error: error.message }, { status: 500 });
	}
};
