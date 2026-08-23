import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import sql from '$lib/server/db';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const unitId = url.searchParams.get('unitId');
		const eventType = url.searchParams.get('type');
		const limit = parseInt(url.searchParams.get('limit') || '50', 10);

		let events;
		if (unitId && eventType) {
			events = await sql`
				SELECT * FROM fleet.telematics_events
				WHERE unit_id = ${unitId} AND event_type = ${eventType}
				ORDER BY timestamp DESC
				LIMIT ${limit}
			`;
		} else if (unitId) {
			events = await sql`
				SELECT * FROM fleet.telematics_events
				WHERE unit_id = ${unitId}
				ORDER BY timestamp DESC
				LIMIT ${limit}
			`;
		} else if (eventType) {
			events = await sql`
				SELECT * FROM fleet.telematics_events
				WHERE event_type = ${eventType}
				ORDER BY timestamp DESC
				LIMIT ${limit}
			`;
		} else {
			events = await sql`
				SELECT * FROM fleet.telematics_events
				ORDER BY timestamp DESC
				LIMIT ${limit}
			`;
		}

		return json({ success: true, data: events });
	} catch (err: any) {
		console.error('Error fetching telematics events:', err);
		return json({ success: false, message: err.message }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const { id, is_resolved, incident_ref_id } = body;

		if (!id) {
			return json({ success: false, message: 'Event ID is required' }, { status: 400 });
		}

		const [updated] = await sql`
			UPDATE fleet.telematics_events
			SET 
				is_resolved = COALESCE(${is_resolved}, is_resolved),
				incident_ref_id = COALESCE(${incident_ref_id}, incident_ref_id)
			WHERE id = ${id}
			RETURNING *
		`;

		return json({ success: true, data: updated });
	} catch (err: any) {
		console.error('Error updating telematics event:', err);
		return json({ success: false, message: err.message }, { status: 500 });
	}
};
