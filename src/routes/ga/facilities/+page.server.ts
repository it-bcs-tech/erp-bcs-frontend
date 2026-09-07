import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url }) => {
	try {
		const search = (url.searchParams.get('search') || '').trim().toLowerCase();
		const statusFilter = url.searchParams.get('status') || 'All';
		const facilityFilter = url.searchParams.get('facility') || 'All';
		const locationFilter = url.searchParams.get('location') || 'All';

		const rawWorkOrders = await sql`
			SELECT 
				id,
				wo_number,
				facility_type,
				location,
				requester_name,
				department,
				description,
				urgency,
				status,
				technician_vendor,
				COALESCE(estimated_cost, 0)::numeric as estimated_cost,
				COALESCE(actual_cost, 0)::numeric as actual_cost,
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
				created_at DESC
		`;

		const processed = rawWorkOrders.map((wo: any) => ({
			...wo,
			estimated_cost: parseFloat(wo.estimated_cost || '0'),
			actual_cost: parseFloat(wo.actual_cost || '0')
		}));

		// Stats
		const totalWo = processed.length;
		const pendingCount = processed.filter(w => w.status === 'PENDING').length;
		const inProgressCount = processed.filter(w => w.status === 'IN_PROGRESS' || w.status === 'APPROVED').length;
		const completedCount = processed.filter(w => w.status === 'COMPLETED').length;
		const emergencyCount = processed.filter(w => w.urgency === 'EMERGENCY' && w.status !== 'COMPLETED').length;
		const totalActualExpense = processed.reduce((acc, cur) => acc + cur.actual_cost, 0);

		// Filtering
		let filtered = processed;
		if (search) {
			filtered = filtered.filter((w: any) =>
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
			filtered = filtered.filter((w: any) => w.location.startsWith(locationFilter));
		}

		return {
			workOrders: filtered,
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
			const year = new Date().getFullYear();
			const [seq] = await sql`SELECT count(*) + 1 as next_seq FROM ga.facility_work_orders`;
			const pad = String(seq.next_seq).padStart(3, '0');
			const wo_number = `WO-GA-${year}-${pad}`;

			await sql`
				INSERT INTO ga.facility_work_orders (
					wo_number, facility_type, location, requester_name, department,
					description, urgency, status, estimated_cost
				) VALUES (
					${wo_number}, ${facility_type}, ${location}, ${requester_name}, ${department},
					${description}, ${urgency}, 'PENDING', ${estimated_cost}
				)
			`;
			return { success: true, message: `Tiket perbaikan ${wo_number} berhasil dibuat` };
		} catch (e: any) {
			console.error('Error creating facility work order:', e);
			return fail(500, { message: e.message || 'Gagal membuat tiket perbaikan' });
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

		if (!id) return fail(400, { message: 'ID tiket tidak valid' });

		try {
			await sql`
				UPDATE ga.facility_work_orders SET
					status = 'COMPLETED',
					actual_cost = ${actual_cost},
					completion_date = ${completion_date},
					completion_notes = ${completion_notes},
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
			await sql`DELETE FROM ga.facility_work_orders WHERE id = ${id}`;
			return { success: true, message: 'Tiket berhasil dihapus' };
		} catch (e: any) {
			console.error('Error deleting work order:', e);
			return fail(500, { message: 'Gagal menghapus tiket' });
		}
	}
};
