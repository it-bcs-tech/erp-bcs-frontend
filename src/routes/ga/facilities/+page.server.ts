import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';
import { fail } from '@sveltejs/kit';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

async function recalculateWoCosts(woId: number) {
	const [mp] = await sql`
		SELECT COALESCE(SUM(GREATEST(0, total_cost)), 0)::numeric as total
		FROM ga.facility_wo_manpower
		WHERE wo_id = ${woId}
	`;
	const [mt] = await sql`
		SELECT COALESCE(SUM(GREATEST(0, total_cost)), 0)::numeric as total
		FROM ga.facility_wo_materials
		WHERE wo_id = ${woId}
	`;
	const mpCost = parseFloat(mp?.total || '0');
	const mtCost = parseFloat(mt?.total || '0');
	const total = mpCost + mtCost;
	await sql`
		UPDATE ga.facility_work_orders
		SET manpower_cost = ${mpCost},
			material_cost = ${mtCost},
			actual_cost = CASE WHEN ${total} > 0 THEN ${total} ELSE actual_cost END,
			updated_at = NOW()
		WHERE id = ${woId}
	`;
}

export const load: PageServerLoad = async ({ url }) => {
	try {
		const search = (url.searchParams.get('search') || '').trim().toLowerCase();
		const statusFilter = url.searchParams.get('status') || 'All';
		const facilityFilter = url.searchParams.get('facility') || 'All';
		const locationFilter = url.searchParams.get('location') || 'All';

		const [rawWorkOrders, rawManpower, rawMaterials, rawAreas] = await Promise.all([
			sql`
				SELECT 
					id,
					wo_number,
					facility_type,
					location,
					location_code,
					requester_nik,
					requester_name,
					department,
					description,
					urgency,
					status,
					raw_status,
					technician_vendor,
					photo_condition,
					photo_completion,
					COALESCE(estimated_cost, 0)::numeric as estimated_cost,
					COALESCE(actual_cost, 0)::numeric as actual_cost,
					COALESCE(manpower_cost, 0)::numeric as manpower_cost,
					COALESCE(material_cost, 0)::numeric as material_cost,
					to_char(scheduled_date, 'YYYY-MM-DD') as scheduled_date,
					to_char(completion_date, 'YYYY-MM-DD') as completion_date,
					completion_notes,
					to_char(created_at, 'YYYY-MM-DD HH24:MI') as created_at_str,
					created_at
				FROM ga.facility_work_orders
				ORDER BY 
					CASE 
						WHEN urgency = 'EMERGENCY' AND status != 'COMPLETED' THEN 1
						WHEN status = 'PENDING' THEN 2
						WHEN status = 'IN_PROGRESS' THEN 3
						WHEN status = 'APPROVED' THEN 4
						ELSE 5
					END,
					scheduled_date DESC NULLS LAST,
					id DESC
			`,
			sql`
				SELECT id, wo_id, worker_name,
					COALESCE(daily_wage, 0)::numeric as daily_wage,
					COALESCE(duration_days, 1)::numeric as duration_days,
					COALESCE(total_cost, 0)::numeric as total_cost,
					status, to_char(created_at, 'YYYY-MM-DD') as created_at
				FROM ga.facility_wo_manpower
				ORDER BY id ASC
			`,
			sql`
				SELECT id, wo_id, material_name,
					COALESCE(unit_price, 0)::numeric as unit_price,
					COALESCE(quantity, 1)::numeric as quantity,
					COALESCE(total_cost, 0)::numeric as total_cost,
					attachment, status, to_char(created_at, 'YYYY-MM-DD') as created_at
				FROM ga.facility_wo_materials
				ORDER BY id ASC
			`,
			sql`
				SELECT id, area_name FROM ga.facility_areas ORDER BY id ASC
			`
		]);

		const mpMap = new Map<number, any[]>();
		for (const mp of rawManpower) {
			const wid = Number(mp.wo_id);
			if (!mpMap.has(wid)) mpMap.set(wid, []);
			mpMap.get(wid)!.push({
				...mp,
				daily_wage: parseFloat(mp.daily_wage || '0'),
				duration_days: parseFloat(mp.duration_days || '1'),
				total_cost: parseFloat(mp.total_cost || '0')
			});
		}

		const matMap = new Map<number, any[]>();
		for (const mt of rawMaterials) {
			const wid = Number(mt.wo_id);
			if (!matMap.has(wid)) matMap.set(wid, []);
			matMap.get(wid)!.push({
				...mt,
				unit_price: parseFloat(mt.unit_price || '0'),
				quantity: parseFloat(mt.quantity || '1'),
				total_cost: parseFloat(mt.total_cost || '0')
			});
		}

		const processed = rawWorkOrders.map((wo: any) => {
			const manpowerList = mpMap.get(wo.id) || [];
			const materialList = matMap.get(wo.id) || [];
			return {
				...wo,
				estimated_cost: parseFloat(wo.estimated_cost || '0'),
				actual_cost: parseFloat(wo.actual_cost || '0'),
				manpower_cost: parseFloat(wo.manpower_cost || '0'),
				material_cost: parseFloat(wo.material_cost || '0'),
				manpower: manpowerList,
				materials: materialList
			};
		});

		const totalWo = processed.length;
		const pendingCount = processed.filter((w) => w.status === 'PENDING').length;
		const inProgressCount = processed.filter((w) => w.status === 'IN_PROGRESS' || w.status === 'APPROVED').length;
		const completedCount = processed.filter((w) => w.status === 'COMPLETED').length;
		const emergencyCount = processed.filter((w) => w.urgency === 'EMERGENCY' && w.status !== 'COMPLETED').length;
		const totalActualExpense = processed.reduce((acc, cur) => acc + cur.actual_cost, 0);

		let filtered = processed;
		if (search) {
			filtered = filtered.filter(
				(w: any) =>
					(w.wo_number && w.wo_number.toLowerCase().includes(search)) ||
					(w.description && w.description.toLowerCase().includes(search)) ||
					(w.requester_name && w.requester_name.toLowerCase().includes(search)) ||
					(w.department && w.department.toLowerCase().includes(search)) ||
					(w.technician_vendor && w.technician_vendor.toLowerCase().includes(search)) ||
					(w.location && w.location.toLowerCase().includes(search))
			);
		}
		if (statusFilter !== 'All') {
			filtered = filtered.filter((w: any) => w.status === statusFilter);
		}
		if (facilityFilter !== 'All') {
			filtered = filtered.filter((w: any) => w.facility_type === facilityFilter);
		}
		if (locationFilter !== 'All') {
			filtered = filtered.filter((w: any) => w.location?.toLowerCase().includes(locationFilter.toLowerCase()));
		}

		return {
			workOrders: filtered,
			areas: rawAreas,
			stats: {
				totalWo,
				pendingCount,
				inProgressCount,
				completedCount,
				emergencyCount,
				totalActualExpense
			}
		};
	} catch (err) {
		console.error('Error loading facility work orders:', err);
		return {
			workOrders: [],
			areas: [],
			stats: {
				totalWo: 0,
				pendingCount: 0,
				inProgressCount: 0,
				completedCount: 0,
				emergencyCount: 0,
				totalActualExpense: 0
			}
		};
	}
};

export const actions: Actions = {
	createWorkOrder: async ({ request }) => {
		const data = await request.formData();
		const facility_type = data.get('facility_type')?.toString();
		const location = data.get('location')?.toString().trim();
		const requester_name = data.get('requester_name')?.toString().trim();
		const department = data.get('department')?.toString().trim();
		const description = data.get('description')?.toString().trim();
		const urgency = data.get('urgency')?.toString() || 'MEDIUM';
		const estimated_cost = parseFloat(data.get('estimated_cost')?.toString() || '0');

		if (!facility_type || !location || !requester_name || !department || !description) {
			return fail(400, { message: 'Semua bidang wajib diisi!' });
		}

		try {
			// Handle upload foto kondisi awal (Before) - Opsional
			let photo_condition: string | null = null;
			const photo = data.get('photo') as File | null;
			if (photo && photo.size > 0 && photo.name !== 'undefined') {
				const uploadDir = join(process.cwd(), 'uploads');
				await mkdir(uploadDir, { recursive: true });
				const buffer = Buffer.from(await photo.arrayBuffer());
				const ext = photo.name.split('.').pop()?.toLowerCase() || 'jpg';
				const filename = `WO_BEFORE_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
				await writeFile(join(uploadDir, filename), buffer);
				photo_condition = filename;
			}

			const [seq] = await sql`SELECT COALESCE(MAX(id), 0) + 1 as next_seq FROM ga.facility_work_orders`;
			const pad = String(seq.next_seq).padStart(7, '0');
			const wo_number = `WO${pad}`;

			await sql`
				INSERT INTO ga.facility_work_orders (
					wo_number, facility_type, location, requester_name, department,
					description, urgency, status, raw_status, photo_condition, estimated_cost, scheduled_date
				) VALUES (
					${wo_number}, ${facility_type}, ${location}, ${requester_name}, ${department},
					${description}, ${urgency}, 'PENDING', '1', ${photo_condition}, ${estimated_cost}, CURRENT_DATE
				)
			`;
			return { success: true, message: `Tiket perbaikan ${wo_number} berhasil dibuat` };
		} catch (e: any) {
			console.error('Error creating facility work order:', e);
			return fail(500, { message: e.message || 'Gagal membuat tiket perbaikan' });
		}
	},

	addManpower: async ({ request }) => {
		const data = await request.formData();
		const wo_id = Number(data.get('wo_id'));
		const worker_name = data.get('worker_name')?.toString().trim();
		const daily_wage = parseFloat(data.get('daily_wage')?.toString() || '0');
		const duration_days = parseFloat(data.get('duration_days')?.toString() || '1');

		if (!wo_id || !worker_name) {
			return fail(400, { message: 'Nama pekerja/tukang wajib diisi!' });
		}

		try {
			const total_cost = daily_wage * duration_days;
			await sql`
				INSERT INTO ga.facility_wo_manpower (wo_id, worker_name, daily_wage, duration_days, total_cost, status, created_by)
				VALUES (${wo_id}, ${worker_name}, ${daily_wage}, ${duration_days}, ${total_cost}, '1', 'admin')
			`;
			await recalculateWoCosts(wo_id);
			return { success: true, message: `Tukang/Pekerja ${worker_name} berhasil ditambahkan` };
		} catch (e: any) {
			console.error('Error adding manpower:', e);
			return fail(500, { message: 'Gagal menambahkan data pekerja' });
		}
	},

	deleteManpower: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		const wo_id = Number(data.get('wo_id'));
		if (!id || !wo_id) return fail(400, { message: 'ID tidak valid' });

		try {
			await sql`DELETE FROM ga.facility_wo_manpower WHERE id = ${id}`;
			await recalculateWoCosts(wo_id);
			return { success: true, message: 'Rincian pekerja dihapus' };
		} catch (e: any) {
			console.error('Error deleting manpower:', e);
			return fail(500, { message: 'Gagal menghapus pekerja' });
		}
	},

	addMaterial: async ({ request }) => {
		const data = await request.formData();
		const wo_id = Number(data.get('wo_id'));
		const material_name = data.get('material_name')?.toString().trim();
		const unit_price = parseFloat(data.get('unit_price')?.toString() || '0');
		const quantity = parseFloat(data.get('quantity')?.toString() || '1');

		if (!wo_id || !material_name) {
			return fail(400, { message: 'Nama material wajib diisi!' });
		}

		try {
			const total_cost = unit_price * quantity;
			await sql`
				INSERT INTO ga.facility_wo_materials (wo_id, material_name, unit_price, quantity, total_cost, status, created_by)
				VALUES (${wo_id}, ${material_name}, ${unit_price}, ${quantity}, ${total_cost}, '1', 'admin')
			`;
			await recalculateWoCosts(wo_id);
			return { success: true, message: `Material ${material_name} berhasil ditambahkan` };
		} catch (e: any) {
			console.error('Error adding material:', e);
			return fail(500, { message: 'Gagal menambahkan material' });
		}
	},

	deleteMaterial: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		const wo_id = Number(data.get('wo_id'));
		if (!id || !wo_id) return fail(400, { message: 'ID tidak valid' });

		try {
			await sql`DELETE FROM ga.facility_wo_materials WHERE id = ${id}`;
			await recalculateWoCosts(wo_id);
			return { success: true, message: 'Rincian material dihapus' };
		} catch (e: any) {
			console.error('Error deleting material:', e);
			return fail(500, { message: 'Gagal menghapus material' });
		}
	},

	approveWorkOrder: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();
		const technician_vendor = data.get('technician_vendor')?.toString().trim();
		const scheduled_date = data.get('scheduled_date')?.toString() || null;
		const estimated_cost = parseFloat(data.get('estimated_cost')?.toString() || '0');

		if (!id || !technician_vendor) {
			return fail(400, { message: 'Nama teknisi / vendor penanggung jawab wajib diisi!' });
		}

		try {
			await sql`
				UPDATE ga.facility_work_orders SET
					status = 'APPROVED',
					raw_status = '2',
					technician_vendor = ${technician_vendor},
					scheduled_date = ${scheduled_date},
					estimated_cost = ${estimated_cost},
					updated_at = NOW()
				WHERE id = ${id}
			`;
			return { success: true, message: 'Tiket berhasil disetujui & teknisi ditugaskan' };
		} catch (e: any) {
			console.error('Error approving work order:', e);
			return fail(500, { message: 'Gagal menyetujui tiket' });
		}
	},

	startWorkOrder: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();
		if (!id) return fail(400, { message: 'ID tiket tidak valid' });

		try {
			await sql`
				UPDATE ga.facility_work_orders SET
					status = 'IN_PROGRESS',
					raw_status = '2',
					updated_at = NOW()
				WHERE id = ${id}
			`;
			return { success: true, message: 'Status pekerjaan diubah menjadi sedang dikerjakan' };
		} catch (e: any) {
			console.error('Error starting work order:', e);
			return fail(500, { message: 'Gagal memperbarui status tiket' });
		}
	},

	completeWorkOrder: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();
		const actual_cost = parseFloat(data.get('actual_cost')?.toString() || '0');
		const completion_date = data.get('completion_date')?.toString() || new Date().toISOString().split('T')[0];
		const completion_notes = data.get('completion_notes')?.toString().trim() || null;
		const photo = data.get('photo_completion') as File | null;

		if (!id) return fail(400, { message: 'ID tiket tidak valid' });

		// Foto hasil perbaikan (After) wajib dilampirkan saat menutup tiket
		if (!photo || photo.size === 0 || photo.name === 'undefined') {
			return fail(400, { message: 'Foto hasil perbaikan (After) wajib diunggah untuk menutup tiket!' });
		}

		try {
			const uploadDir = join(process.cwd(), 'uploads');
			await mkdir(uploadDir, { recursive: true });
			const buffer = Buffer.from(await photo.arrayBuffer());
			const ext = photo.name.split('.').pop()?.toLowerCase() || 'jpg';
			const filename = `WO_AFTER_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
			await writeFile(join(uploadDir, filename), buffer);
			const photo_completion = filename;

			await sql`
				UPDATE ga.facility_work_orders SET
					status = 'COMPLETED',
					raw_status = '3',
					actual_cost = ${actual_cost},
					completion_date = ${completion_date},
					completion_notes = ${completion_notes},
					photo_completion = ${photo_completion},
					updated_at = NOW()
				WHERE id = ${id}
			`;
			return { success: true, message: 'Pekerjaan perbaikan fasilitas telah selesai dicatat' };
		} catch (e: any) {
			console.error('Error completing work order:', e);
			return fail(500, { message: 'Gagal menyelesaikan tiket' });
		}
	},

	cancelWorkOrder: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();
		const reason = data.get('reason')?.toString().trim();

		if (!id) return fail(400, { message: 'ID tiket tidak valid' });

		try {
			await sql`
				UPDATE ga.facility_work_orders SET
					status = 'CANCELLED',
					completion_notes = ${reason || 'Dibatalkan oleh pemohon/GA'},
					updated_at = NOW()
				WHERE id = ${id}
			`;
			return { success: true, message: 'Tiket berhasil dibatalkan' };
		} catch (e: any) {
			console.error('Error cancelling work order:', e);
			return fail(500, { message: 'Gagal membatalkan tiket' });
		}
	},

	deleteWorkOrder: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();
		if (!id) return fail(400, { message: 'ID tiket tidak valid' });

		try {
			await sql`DELETE FROM ga.facility_wo_manpower WHERE wo_id = ${id}`;
			await sql`DELETE FROM ga.facility_wo_materials WHERE wo_id = ${id}`;
			await sql`DELETE FROM ga.facility_work_orders WHERE id = ${id}`;
			return { success: true, message: 'Tiket berhasil dihapus' };
		} catch (e: any) {
			console.error('Error deleting work order:', e);
			return fail(500, { message: 'Gagal menghapus tiket' });
		}
	}
};
