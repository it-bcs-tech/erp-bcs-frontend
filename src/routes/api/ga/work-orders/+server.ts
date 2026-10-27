import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import sql from '$lib/server/db';

export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		const user = (locals as any)?.user;
		const payrollId = user?.payrollId;
		const userName = user?.name;
		const userEmail = user?.email;
		const isGaOrAdmin = user?.role === 'superadmin' || 
			user?.allowedModules?.includes('ga') || 
			user?.allowedModules?.includes('*');

		const requestedScope = url.searchParams.get('scope') || 'my';
		const scope = (requestedScope === 'all' && isGaOrAdmin) ? 'all' : 'my';

		let rows: any[] = [];
		let myCount = 0;
		let allCount = 0;

		if (isGaOrAdmin) {
			// Hitung ringkasan count untuk switcher tab admin
			const [counts] = await sql`
				SELECT
					(SELECT COUNT(*)::int FROM ga.facility_work_orders) as all_count,
					(SELECT COUNT(*)::int FROM ga.facility_work_orders 
					 WHERE 
						(${payrollId || null} IS NOT NULL AND requester_nik = ${payrollId || ''})
						OR (${userName || null} IS NOT NULL AND requester_name ILIKE ${'%' + (userName || '') + '%'})
						OR (${userName || null} IS NOT NULL AND created_by = ${userName || ''})
						OR (${userEmail || null} IS NOT NULL AND created_by = ${userEmail || ''})) as my_count
			`;
			allCount = counts?.all_count || 0;
			myCount = counts?.my_count || 0;

			if (scope === 'all') {
				rows = await sql`
					SELECT 
						id,
						wo_number,
						facility_type,
						location,
						requester_name,
						requester_nik,
						department,
						description,
						urgency,
						status,
						to_char(scheduled_date, 'YYYY-MM-DD') as scheduled_date,
						to_char(created_at, 'YYYY-MM-DD HH24:MI') as created_at_str,
						created_at
					FROM ga.facility_work_orders
					ORDER BY id DESC
					LIMIT 20
				`;
			} else {
				rows = await sql`
					SELECT 
						id,
						wo_number,
						facility_type,
						location,
						requester_name,
						requester_nik,
						department,
						description,
						urgency,
						status,
						to_char(scheduled_date, 'YYYY-MM-DD') as scheduled_date,
						to_char(created_at, 'YYYY-MM-DD HH24:MI') as created_at_str,
						created_at
					FROM ga.facility_work_orders
					WHERE 
						(${payrollId || null} IS NOT NULL AND requester_nik = ${payrollId || ''})
						OR (${userName || null} IS NOT NULL AND requester_name ILIKE ${'%' + (userName || '') + '%'})
						OR (${userName || null} IS NOT NULL AND created_by = ${userName || ''})
						OR (${userEmail || null} IS NOT NULL AND created_by = ${userEmail || ''})
					ORDER BY id DESC
					LIMIT 20
				`;
			}
		} else {
			rows = await sql`
				SELECT 
					id,
					wo_number,
					facility_type,
					location,
					requester_name,
					requester_nik,
					department,
					description,
					urgency,
					status,
					to_char(scheduled_date, 'YYYY-MM-DD') as scheduled_date,
					to_char(created_at, 'YYYY-MM-DD HH24:MI') as created_at_str,
					created_at
				FROM ga.facility_work_orders
				WHERE 
					(${payrollId || null} IS NOT NULL AND requester_nik = ${payrollId || ''})
					OR (${userName || null} IS NOT NULL AND requester_name ILIKE ${'%' + (userName || '') + '%'})
					OR (${userName || null} IS NOT NULL AND created_by = ${userName || ''})
					OR (${userEmail || null} IS NOT NULL AND created_by = ${userEmail || ''})
				ORDER BY id DESC
				LIMIT 20
			`;
			myCount = rows.length;
			allCount = rows.length;
		}

		return json({
			success: true,
			workOrders: rows,
			scope,
			isGaOrAdmin,
			myCount,
			allCount
		});
	} catch (err: any) {
		console.error('Error in GET /api/ga/work-orders:', err);
		return json(
			{
				success: false,
				message: err.message || 'Gagal memuat daftar tiket perbaikan.',
				workOrders: [],
				scope: 'my',
				isGaOrAdmin: false,
				myCount: 0,
				allCount: 0
			},
			{ status: 500 }
		);
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const body = await request.json();
		const user = (locals as any)?.user;

		const facility_type = (body.facility_type || '').trim();
		const location = (body.location || '').trim();
		const description = (body.description || '').trim();
		const urgency = (body.urgency || 'MEDIUM').trim();

		// Data pelapor: prioritaskan user yang login, fallback ke body
		const requester_name = (user?.name || body.requester_name || 'Karyawan BCS').trim();
		const department = (user?.division || body.department || 'Umum').trim();
		const requester_nik = user?.payrollId || body.requester_nik || null;
		const created_by = user?.name || user?.email || requester_name;

		// Validasi input
		if (!facility_type) {
			return json({ success: false, message: 'Kategori sarana/fasilitas wajib dipilih!' }, { status: 400 });
		}
		if (!location) {
			return json({ success: false, message: 'Lokasi detail wajib diisi!' }, { status: 400 });
		}
		if (!description) {
			return json({ success: false, message: 'Deskripsi kendala / kerusakan wajib diisi!' }, { status: 400 });
		}

		// Generate sequential wo_number (format: WO0000001)
		const [seq] = await sql`SELECT COALESCE(MAX(id), 0) + 1 as next_seq FROM ga.facility_work_orders`;
		const pad = String(seq.next_seq).padStart(7, '0');
		const wo_number = `WO${pad}`;

		// Insert tiket ke ga.facility_work_orders
		await sql`
			INSERT INTO ga.facility_work_orders (
				wo_number,
				facility_type,
				location,
				requester_name,
				requester_nik,
				department,
				description,
				urgency,
				status,
				raw_status,
				estimated_cost,
				actual_cost,
				manpower_cost,
				material_cost,
				scheduled_date,
				created_by
			) VALUES (
				${wo_number},
				${facility_type},
				${location},
				${requester_name},
				${requester_nik},
				${department},
				${description},
				${urgency},
				'PENDING',
				'1',
				0,
				0,
				0,
				0,
				CURRENT_DATE,
				${created_by}
			)
		`;

		return json({
			success: true,
			woNumber: wo_number,
			message: `Tiket perbaikan ${wo_number} berhasil dibuat dan diteruskan ke tim General Affair.`
		});
	} catch (err: any) {
		console.error('Error in POST /api/ga/work-orders:', err);
		return json(
			{
				success: false,
				message: err.message || 'Terjadi kesalahan sistem saat membuat tiket perbaikan.'
			},
			{ status: 500 }
		);
	}
};
