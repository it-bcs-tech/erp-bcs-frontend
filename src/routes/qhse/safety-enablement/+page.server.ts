import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import sql from '$lib/server/db';

export const load: PageServerLoad = async () => {
	try {
		const [apds, briefings, drivers, employees] = await Promise.all([
			sql`
				SELECT 
					id, recipient_name, role, item_name, quantity, 
					distribution_date, expiry_date, condition, notes
				FROM qhse.apd_distributions
				ORDER BY distribution_date DESC
			`,
			sql`
				SELECT 
					id, topic, briefing_type, date, location, 
					leader_name, participant_count, notes, photo_url
				FROM qhse.safety_briefings
				ORDER BY date DESC
			`,
			sql`SELECT d.id, k.nama_karyawan as name FROM master.m_drivers d JOIN master.m_karyawan k ON k.id = d.karyawan_id WHERE (k.aktif = 'Y' OR k.aktif = '1' OR k.aktif IS NULL) ORDER BY k.nama_karyawan ASC`,
			sql`SELECT id, nama_karyawan as name, dept_id FROM master.m_karyawan WHERE status_karyawan = 'AKTIF' ORDER BY nama_karyawan ASC LIMIT 200`
		]);

		const summary = {
			totalApdItems: apds.reduce((acc: number, a: any) => acc + (a.quantity || 1), 0),
			totalBriefings: briefings.length,
			totalParticipants: briefings.reduce((acc: number, b: any) => acc + (b.participant_count || 0), 0)
		};

		return {
			apds: apds as any[],
			briefings: briefings as any[],
			drivers: drivers as any[],
			employees: employees as any[],
			summary
		};
	} catch (error) {
		console.error("Error loading safety enablement:", error);
		return {
			apds: [],
			briefings: [],
			drivers: [],
			employees: [],
			summary: { totalApdItems: 0, totalBriefings: 0, totalParticipants: 0 }
		};
	}
};

export const actions: Actions = {
	distributeApd: async ({ request }) => {
		const data = await request.formData();
		const recipientName = data.get('recipient_name') as string;
		const role = data.get('role') as string;
		const itemName = data.get('item_name') as string;
		const quantity = parseInt(data.get('quantity') as string || '1', 10);
		const distributionDate = data.get('distribution_date') as string || new Date().toISOString().split('T')[0];
		const notes = data.get('notes') as string || null;

		if (!recipientName || !role || !itemName) {
			return fail(400, { message: 'Harap lengkapi nama penerima, peran, dan jenis APD!' });
		}

		try {
			await sql`
				INSERT INTO qhse.apd_distributions (
					recipient_name, role, item_name, quantity,
					distribution_date, expiry_date, condition, notes
				) VALUES (
					${recipientName}, ${role}, ${itemName}, ${quantity},
					${new Date(distributionDate)}, ${new Date(Date.now() + 365 * 24 * 3600 * 1000)}, 'NEW', ${notes}
				)
			`;

			return { success: true, message: `Distribusi APD untuk ${recipientName} berhasil dicatat.` };
		} catch (e: any) {
			console.error("Distribute APD error:", e);
			return fail(500, { error: e.message || 'Gagal menyimpan data APD.' });
		}
	},

	createBriefing: async ({ request }) => {
		const data = await request.formData();
		const topic = data.get('topic') as string;
		const briefingType = data.get('briefing_type') as string;
		const location = data.get('location') as string;
		const leaderName = data.get('leader_name') as string;
		const participantCount = parseInt(data.get('participant_count') as string || '0', 10);
		const notes = data.get('notes') as string || null;

		if (!topic || !briefingType || !location || !leaderName) {
			return fail(400, { message: 'Harap lengkapi topik briefing, jenis, lokasi, dan instruktur!' });
		}

		try {
			await sql`
				INSERT INTO qhse.safety_briefings (
					topic, briefing_type, date, location,
					leader_name, participant_count, notes
				) VALUES (
					${topic}, ${briefingType}, CURRENT_TIMESTAMP, ${location},
					${leaderName}, ${participantCount}, ${notes}
				)
			`;

			return { success: true, message: `Log briefing/FGD '${topic}' berhasil disimpan.` };
		} catch (e: any) {
			console.error("Create briefing error:", e);
			return fail(500, { error: e.message || 'Gagal menyimpan log briefing.' });
		}
	}
};
