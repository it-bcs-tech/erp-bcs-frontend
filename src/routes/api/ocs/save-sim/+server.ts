import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { syncDriverSimToDb } from '$lib/server/sim-sync';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const formData = await request.formData();
		const driverId = formData.get('driver_id')?.toString();
		const karyawanId = formData.get('karyawan_id')?.toString();
		const driverName = formData.get('driver_name')?.toString() || 'Pengemudi';
		const simType = formData.get('sim_type')?.toString() || 'SIM B2 UMUM';
		const simNumber = formData.get('sim_number')?.toString()?.trim();
		const expiryDate = formData.get('expiry_date')?.toString()?.trim();
		const issueDate = formData.get('issue_date')?.toString()?.trim() || null;
		const base64Image = formData.get('image_base64')?.toString();
		const file = formData.get('file') as File | null;

		if ((!driverId && !karyawanId) || !simNumber || !expiryDate) {
			return json({
				success: false,
				message: 'Identitas Karyawan/Driver, Nomor SIM, dan Tanggal Kedaluwarsa wajib diisi.'
			}, { status: 400 });
		}

		let fileBuffer: Buffer | null = null;
		let fileExt: string | null = null;
		if (file && file.size > 0) {
			fileBuffer = Buffer.from(await file.arrayBuffer());
			fileExt = file.name.split('.').pop() || 'jpg';
		}

		const updatedBy = locals?.user?.name || locals?.user?.email || 'Tim Operasional OCS / HRIS';

		const result = await syncDriverSimToDb({
			driverId,
			karyawanId,
			driverName,
			simType,
			simNumber,
			expiryDate,
			issueDate,
			fileBuffer,
			fileExt,
			base64Image,
			updatedBy
		});

		return json(result);
	} catch (err: any) {
		console.error('[API OCS Save SIM] Error:', err);
		return json({
			success: false,
			message: 'Gagal menyimpan dan menyinkronkan data SIM: ' + err.message
		}, { status: 500 });
	}
};
