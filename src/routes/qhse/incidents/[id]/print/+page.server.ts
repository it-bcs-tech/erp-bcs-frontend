import type { PageServerLoad } from './$types';
import sql from '$lib/server/db';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
	const id = params.id;
	if (!id) throw error(400, 'ID Insiden tidak valid');

	try {
		const [incident] = await sql`
			SELECT 
				i.id,
				i.incident_number,
				i.incident_date,
				i.incident_type,
				i.severity,
				i.unit_id,
				i.driver_id,
				i.location,
				i.description,
				i.root_cause_analysis,
				i.car_number,
				i.corrective_action,
				i.preventive_action,
				i.pic_followup,
				i.due_date,
				i.status,
				COALESCE(i.financial_loss, 0) as financial_loss,
				COALESCE(i.lost_work_days, 0) as lost_work_days,
				i.consequence,
				i.is_human_factor,
				i.is_equipment_factor,
				i.is_method_factor,
				i.is_environment_factor,
				i.analysis_data,
				u.nomor_unit as unit_number,
				COALESCE(k.nama_karyawan, 'Pengemudi Tidak Terdaftar') as driver_name
			FROM qhse.incidents i
			LEFT JOIN fleet.unit u ON u.id = i.unit_id
			LEFT JOIN master.m_drivers d ON d.id = i.driver_id
			LEFT JOIN master.m_karyawan k ON k.id = d.karyawan_id
			WHERE i.id = ${id}
		`;

		if (!incident) {
			throw error(404, 'Data insiden tidak ditemukan');
		}

		let parsedAnalysis: any = {
			why1: '',
			why2: '',
			why3: '',
			why4: '',
			why5: '',
			closing_notes: '',
			verified_by: '',
			closed_date: ''
		};

		if (incident.analysis_data) {
			if (typeof incident.analysis_data === 'string') {
				try {
					parsedAnalysis = { ...parsedAnalysis, ...JSON.parse(incident.analysis_data) };
				} catch {}
			} else if (typeof incident.analysis_data === 'object') {
				parsedAnalysis = { ...parsedAnalysis, ...incident.analysis_data };
			}
		}

		return {
			incident: {
				...incident,
				analysis: parsedAnalysis
			}
		};
	} catch (e: any) {
		if (e.status) throw e;
		console.error('Error loading incident print data:', e);
		throw error(500, 'Gagal memuat data Berita Acara Insiden');
	}
};
