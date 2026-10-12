import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';

const sql = postgres(env.DATABASE_URL || 'postgres://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db');

function parseJsonSafe(val: any, fallback: any = []) {
	if (!val) return fallback;
	if (typeof val === 'object') return val;
	try {
		const parsed = JSON.parse(val);
		return typeof parsed === 'string' ? parseJsonSafe(parsed, fallback) : parsed;
	} catch (e) {
		return fallback;
	}
}

export const load: PageServerLoad = async ({ params }) => {
	const idOrNo = decodeURIComponent(params.id);

	try {
		const inspections = await sql`
			SELECT 
				i.*,
				k.nama_karyawan as driver_name,
				w.wo_no,
				w.status as wo_status
			FROM fleet.vehicle_inspections i
			LEFT JOIN master.m_karyawan k ON i.driver_id = k.payroll_id
			LEFT JOIN fleet.work_orders w ON i.wo_no = w.wo_no
			WHERE i.inspection_no = ${idOrNo} OR i.id::text = ${idOrNo}
			LIMIT 1
		`;

		if (inspections.length === 0) {
			throw error(404, 'Data inspeksi P2H tidak ditemukan.');
		}

		const insp = inspections[0];

		return {
			inspection: {
				id: insp.id,
				inspectionNo: insp.inspection_no,
				date: insp.inspection_date ? new Date(insp.inspection_date).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' }) : '-',
				unitId: insp.unit_id,
				unitType: insp.unit_type || 'Truck',
				policeNo: insp.police_no || insp.unit_id,
				driverId: insp.driver_id,
				driverName: insp.driver_name || insp.driver_id || 'Tanpa Driver',
				kenekName: insp.kenek_name || '-',
				odometer: insp.odometer ? Number(insp.odometer).toLocaleString('id-ID') : '-',
				checklistData: parseJsonSafe(insp.checklist_data, []),
				tireDepthData: parseJsonSafe(insp.tire_depth_data, {}),
				defectCount: Number(insp.defect_count || 0),
				driverHealth: insp.driver_health || 'SEHAT',
				status: insp.status,
				woNo: insp.wo_no,
				woStatus: insp.wo_status,
				inspectorName: insp.inspector_name || 'Inspector Workshop',
				notes: insp.notes || '',
				noApar: insp.no_apar || 'APAR OK',
				destination: insp.destination || '-',
				entryTime: insp.entry_time ? new Date(insp.entry_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-',
				exitTime: insp.exit_time ? new Date(insp.exit_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-',
				entryDate: insp.entry_time ? new Date(insp.entry_time).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-',
				exitDate: insp.exit_time ? new Date(insp.exit_time).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'
			}
		};
	} catch (err: any) {
		if (err?.status === 404) throw err;
		console.error("Error loading P2H detail:", err);
		throw error(500, 'Gagal memuat detail inspeksi P2H.');
	}
};
