import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import sql from '$lib/server/db';

function getNowWibTimestamp(): string {
	const now = new Date();
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone: 'Asia/Jakarta',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: false
	}).formatToParts(now);
	const map: Record<string, string> = {};
	for (const p of parts) map[p.type] = p.value;
	const hr = map.hour === '24' ? '00' : map.hour;
	return `${map.year}-${map.month}-${map.day} ${hr}:${map.minute}:${map.second || '00'}`;
}

export const load: PageServerLoad = async () => {
	try {
		const [visitors, statsRows, employees] = await Promise.all([
			sql`
				SELECT
					id,
					visitor_name,
					company,
					address,
					phone,
					purpose,
					badge_number,
					host_nik,
					host_name,
					host_department,
					to_char(check_in_time, 'YYYY-MM-DD') as check_in_date,
					to_char(check_in_time, 'HH24:MI') as check_in_clock,
					to_char(check_in_time, 'YYYY-MM-DD HH24:MI') as check_in_str,
					to_char(check_out_time, 'YYYY-MM-DD') as check_out_date,
					to_char(check_out_time, 'HH24:MI') as check_out_clock,
					to_char(check_out_time, 'YYYY-MM-DD HH24:MI') as check_out_str,
					survey_rating,
					photo_file,
					status
				FROM ga.visitors
				ORDER BY
					CASE WHEN status = 'CHECKED_IN' THEN 0 ELSE 1 END,
					check_in_time DESC,
					id DESC
			`,
			sql`
				SELECT
					COUNT(*)::int as total_visitors,
					COUNT(CASE WHEN status = 'CHECKED_IN' THEN 1 END)::int as active_visitors,
					COUNT(CASE WHEN survey_rating = 3 THEN 1 END)::int as rating_puas,
					COUNT(CASE WHEN survey_rating = 2 THEN 1 END)::int as rating_cukup,
					COUNT(CASE WHEN survey_rating = 1 THEN 1 END)::int as rating_kurang,
					COUNT(CASE WHEN survey_rating IS NOT NULL THEN 1 END)::int as total_rated,
					ROUND(AVG(survey_rating)::numeric, 2) as avg_rating
				FROM ga.visitors
			`,
			sql`
				SELECT
					k.payroll_id as nik,
					k.nama_karyawan as name,
					COALESCE(d.dept_name, 'GENERAL AFFAIRS') as department
				FROM master.m_karyawan k
				LEFT JOIN master.m_dept d ON d.dept_code = k.dept_id
				WHERE k.aktif = 'Y' AND k.nama_karyawan IS NOT NULL
				ORDER BY k.nama_karyawan ASC
				LIMIT 500
			`
		]);

		return {
			visitors,
			stats: statsRows[0] || {
				total_visitors: 0,
				active_visitors: 0,
				rating_puas: 0,
				rating_cukup: 0,
				rating_kurang: 0,
				total_rated: 0,
				avg_rating: 0
			},
			employees
		};
	} catch (err) {
		console.error('Error loading GA visitors:', err);
		return {
			visitors: [],
			stats: {
				total_visitors: 0,
				active_visitors: 0,
				rating_puas: 0,
				rating_cukup: 0,
				rating_kurang: 0,
				total_rated: 0,
				avg_rating: 0
			},
			employees: []
		};
	}
};

export const actions: Actions = {
	checkIn: async ({ request }) => {
		const fd = await request.formData();
		const visitor_name = String(fd.get('visitor_name') || '').trim();
		const company = String(fd.get('company') || '-').trim();
		const address = String(fd.get('address') || '-').trim();
		const phone = String(fd.get('phone') || '-').trim();
		const purpose = String(fd.get('purpose') || '-').trim();
		const badge_number = String(fd.get('badge_number') || '-').trim();
		const host_nik = String(fd.get('host_nik') || '').trim() || null;
		const host_name = String(fd.get('host_name') || '-').trim();
		const host_department = String(fd.get('host_department') || 'UMUM').trim();

		const check_in_date = String(fd.get('check_in_date') || '').trim();
		const check_in_clock = String(fd.get('check_in_clock') || '').trim();
		const check_in_timestamp =
			check_in_date && check_in_clock
				? `${check_in_date} ${check_in_clock}:00`
				: getNowWibTimestamp();

		if (!visitor_name || !purpose) {
			return fail(400, { error: 'Nama tamu dan keperluan kunjungan wajib diisi.' });
		}

		try {
			await sql`
				INSERT INTO ga.visitors (
					visitor_name, company, address, phone, purpose,
					badge_number, host_nik, host_name, host_department,
					check_in_time, status, act
				) VALUES (
					${visitor_name}, ${company}, ${address}, ${phone}, ${purpose},
					${badge_number}, ${host_nik}, ${host_name}, ${host_department},
					${check_in_timestamp}, 'CHECKED_IN', 1
				)
			`;
			return { success: true, message: `Tamu ${visitor_name} berhasil Check-In pada ${check_in_clock || ''} WIB.` };
		} catch (err) {
			console.error('Error checking in visitor:', err);
			return fail(500, { error: 'Gagal mencatat Check-In tamu.' });
		}
	},

	checkOut: async ({ request }) => {
		const fd = await request.formData();
		const id = Number(fd.get('id'));
		const survey_rating = Number(fd.get('survey_rating') || 3);
		const check_in_date = String(fd.get('check_in_date') || '').trim();
		const check_in_clock = String(fd.get('check_in_clock') || '').trim();
		const check_out_date = String(fd.get('check_out_date') || '').trim();
		const check_out_clock = String(fd.get('check_out_clock') || '').trim();

		if (!id) {
			return fail(400, { error: 'ID kunjungan tidak valid.' });
		}

		const check_in_timestamp =
			check_in_date && check_in_clock ? `${check_in_date} ${check_in_clock}:00` : null;
		const check_out_timestamp =
			check_out_date && check_out_clock
				? `${check_out_date} ${check_out_clock}:00`
				: getNowWibTimestamp();

		try {
			if (check_in_timestamp) {
				await sql`
					UPDATE ga.visitors
					SET
						check_in_time = ${check_in_timestamp},
						check_out_time = ${check_out_timestamp},
						status = 'CHECKED_OUT',
						survey_rating = ${survey_rating}
					WHERE id = ${id}
				`;
			} else {
				await sql`
					UPDATE ga.visitors
					SET
						check_out_time = ${check_out_timestamp},
						status = 'CHECKED_OUT',
						survey_rating = ${survey_rating}
					WHERE id = ${id}
				`;
			}
			return { success: true, message: `Waktu keluar (${check_out_clock || ''} WIB) & survei layanan berhasil disimpan.` };
		} catch (err) {
			console.error('Error checking out visitor:', err);
			return fail(500, { error: 'Gagal memproses Check-Out tamu.' });
		}
	},

	deleteVisitor: async ({ request }) => {
		const fd = await request.formData();
		const id = Number(fd.get('id'));
		if (!id) return fail(400, { error: 'ID tidak valid.' });

		try {
			await sql`DELETE FROM ga.visitors WHERE id = ${id}`;
			return { success: true, message: 'Data buku tamu berhasil dihapus.' };
		} catch (err) {
			console.error('Error deleting visitor:', err);
			return fail(500, { error: 'Gagal menghapus data buku tamu.' });
		}
	}
};
