import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import sql from '$lib/server/db';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

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
						photo_condition,
						photo_completion,
						completion_notes,
						to_char(scheduled_date, 'YYYY-MM-DD') as scheduled_date,
						to_char(completion_date, 'YYYY-MM-DD') as completion_date,
						to_char(created_at, 'YYYY-MM-DD HH24:MI') as created_at_str,
						created_at
					FROM ga.facility_work_orders
					ORDER BY id DESC
					LIMIT 25
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
						photo_condition,
						photo_completion,
						completion_notes,
						to_char(scheduled_date, 'YYYY-MM-DD') as scheduled_date,
						to_char(completion_date, 'YYYY-MM-DD') as completion_date,
						to_char(created_at, 'YYYY-MM-DD HH24:MI') as created_at_str,
						created_at
					FROM ga.facility_work_orders
					WHERE 
						(${payrollId || null} IS NOT NULL AND requester_nik = ${payrollId || ''})
						OR (${userName || null} IS NOT NULL AND requester_name ILIKE ${'%' + (userName || '') + '%'})
						OR (${userName || null} IS NOT NULL AND created_by = ${userName || ''})
						OR (${userEmail || null} IS NOT NULL AND created_by = ${userEmail || ''})
					ORDER BY id DESC
					LIMIT 25
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
					photo_condition,
					photo_completion,
					completion_notes,
					to_char(scheduled_date, 'YYYY-MM-DD') as scheduled_date,
					to_char(completion_date, 'YYYY-MM-DD') as completion_date,
					to_char(created_at, 'YYYY-MM-DD HH24:MI') as created_at_str,
					created_at
				FROM ga.facility_work_orders
				WHERE 
					(${payrollId || null} IS NOT NULL AND requester_nik = ${payrollId || ''})
					OR (${userName || null} IS NOT NULL AND requester_name ILIKE ${'%' + (userName || '') + '%'})
					OR (${userName || null} IS NOT NULL AND created_by = ${userName || ''})
					OR (${userEmail || null} IS NOT NULL AND created_by = ${userEmail || ''})
				ORDER BY id DESC
				LIMIT 25
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
		const user = (locals as any)?.user;
		const contentType = request.headers.get('content-type') || '';

		let facility_type = '';
		let location = '';
		let description = '';
		let urgency = 'MEDIUM';
		let requester_name = (user?.name || 'Karyawan BCS').trim();
		let department = (user?.division || 'Umum').trim();
		let requester_nik = user?.payrollId || null;
		let photo_condition: string | null = null;

		if (contentType.includes('multipart/form-data')) {
			const formData = await request.formData();
			facility_type = (formData.get('facility_type')?.toString() || '').trim();
			location = (formData.get('location')?.toString() || '').trim();
			description = (formData.get('description')?.toString() || '').trim();
			urgency = (formData.get('urgency')?.toString() || 'MEDIUM').trim();

			if (formData.get('requester_name')) requester_name = formData.get('requester_name')!.toString().trim();
			if (formData.get('department')) department = formData.get('department')!.toString().trim();
			if (formData.get('requester_nik')) requester_nik = formData.get('requester_nik')!.toString().trim();

			// Handle upload foto kerusakan (Before)
			const file = formData.get('photo') as File | null;
			if (file && file.size > 0 && file.name !== 'undefined') {
				const uploadDir = join(process.cwd(), 'uploads');
				await mkdir(uploadDir, { recursive: true });
				const buffer = Buffer.from(await file.arrayBuffer());
				const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
				const filename = `WO_BEFORE_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
				await writeFile(join(uploadDir, filename), buffer);
				photo_condition = filename;
			}
		} else {
			const body = await request.json();
			facility_type = (body.facility_type || '').trim();
			location = (body.location || '').trim();
			description = (body.description || '').trim();
			urgency = (body.urgency || 'MEDIUM').trim();
			if (body.requester_name) requester_name = body.requester_name.trim();
			if (body.department) department = body.department.trim();
			if (body.requester_nik) requester_nik = body.requester_nik.trim();
			if (body.photo_condition) photo_condition = body.photo_condition.trim();
		}

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
				photo_condition,
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
				${photo_condition},
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
