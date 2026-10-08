import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';

const sql = postgres(env.DATABASE_URL || 'postgres://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db');

function parseJsonSafe<T>(val: any, fallback: T): T {
	if (!val) return fallback;
	let curr = val;
	while (typeof curr === 'string') {
		try {
			curr = JSON.parse(curr);
		} catch {
			break;
		}
	}
	return (curr ?? fallback) as T;
}

export const load: PageServerLoad = async ({ params }) => {
	const idOrNo = decodeURIComponent(params.id);

	try {
		const inspections = await sql`
			SELECT 
				i.*,
				k.nama_karyawan as driver_name,
				w.status as wo_status,
				w.wo_date,
				COALESCE(u.nama_karyawan, w.mechanic_id) as mechanic_name,
				w.repaired_items,
				w.checklist_items as wo_checklist_items
			FROM fleet.vehicle_inspections i
			LEFT JOIN master.m_karyawan k ON i.driver_id = k.payroll_id
			LEFT JOIN fleet.work_orders w ON i.wo_no = w.wo_no
			LEFT JOIN master.m_karyawan u ON w.mechanic_id = u.payroll_id
			WHERE i.inspection_no = ${idOrNo} OR i.id::text = ${idOrNo}
			LIMIT 1
		`;

		if (inspections.length === 0) {
			throw error(404, 'Data inspeksi tidak ditemukan.');
		}

		const insp = inspections[0];

		return {
			inspection: {
				id: insp.id,
				inspectionNo: insp.inspection_no,
				date: insp.inspection_date ? new Date(insp.inspection_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-',
				entryTime: insp.entry_time ? new Date(insp.entry_time).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-',
				exitTime: insp.exit_time ? new Date(insp.exit_time).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-',
				type: insp.inspection_type || 'MASUK_KELUAR',
				unitId: insp.unit_id,
				unitType: insp.unit_type || 'DT',
				policeNo: insp.police_no || insp.unit_id,
				noApar: insp.no_apar || '-',
				destination: insp.destination || '-',
				driverId: insp.driver_id,
				driverName: insp.driver_name || insp.driver_id || 'Tanpa Driver',
				kenekName: insp.kenek_name || '-',
				odometer: insp.odometer ? insp.odometer.toLocaleString('id-ID') : '-',
				checklistData: parseJsonSafe(insp.checklist_data, []),
				defectCount: insp.defect_count || 0,
				driverHealth: parseJsonSafe(insp.driver_health, {}),
				tireDepthData: parseJsonSafe(insp.tire_depth_data, { head: [], trailer: [], spare: null }),
				status: insp.status,
				woNo: insp.wo_no,
				woStatus: insp.wo_status,
				mechanicName: insp.mechanic_name || 'Belum Ditugaskan',
				repairedItems: parseJsonSafe(insp.repaired_items, []),
				inspectorName: insp.inspector_name || 'Inspector Workshop',
				inspectorId: insp.inspector_id || '-',
				notes: insp.notes || ''
			}
		};
	} catch (err: any) {
		if (err?.status === 404) throw err;
		console.error("Error fetching inspection detail:", err);
		throw error(500, 'Gagal memuat detail inspeksi.');
	}
};
