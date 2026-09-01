import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url }) => {
	const category = url.searchParams.get('category') || 'sim'; // 'sim', 'contract', 'k3'
	const severity = url.searchParams.get('severity') || ''; // 'expired', 'critical', 'warning', 'valid'
	const searchQuery = url.searchParams.get('search') || '';

	try {
		// 1. Ambil data SIM Driver (SIM A, B1, B2 Umum, C) dengan casting tipe data tanggal yang aman
		const simDocuments = await sql`
			SELECT 
				k.id,
				k.payroll_id,
				k.nama_karyawan,
				COALESCE(t.title, k.title, '-') as job_title,
				d.dept_name,
				COALESCE(
					NULLIF(TRIM(k.no_sim_b2_umum), ''),
					NULLIF(TRIM(k.no_sim_b1), ''),
					NULLIF(TRIM(k.no_sim_a), ''),
					NULLIF(TRIM(k.no_sim_c), '')
				) as doc_number,
				CASE 
					WHEN NULLIF(TRIM(k.no_sim_b2_umum), '') IS NOT NULL THEN 'SIM B2 Umum'
					WHEN NULLIF(TRIM(k.no_sim_b1), '') IS NOT NULL THEN 'SIM B1'
					WHEN NULLIF(TRIM(k.no_sim_a), '') IS NOT NULL THEN 'SIM A'
					WHEN NULLIF(TRIM(k.no_sim_c), '') IS NOT NULL THEN 'SIM C'
					ELSE 'SIM'
				END as doc_type,
				TO_CHAR(COALESCE(
					k.no_sim_b2_umum_expiredate,
					NULLIF(TRIM(k.no_sim_b1_expiredate), '')::date,
					k.no_sim_a_expiredate,
					k.no_sim_c_expiredate
				), 'YYYY-MM-DD') as expire_date,
				(COALESCE(
					k.no_sim_b2_umum_expiredate,
					NULLIF(TRIM(k.no_sim_b1_expiredate), '')::date,
					k.no_sim_a_expiredate,
					k.no_sim_c_expiredate
				) - CURRENT_DATE)::int as days_remaining
			FROM master.m_karyawan k
			LEFT JOIN master.m_title t ON t.title_code = k.title
			LEFT JOIN master.m_dept d ON d.dept_code = k.dept_id
			WHERE (
				NULLIF(TRIM(k.no_sim_b2_umum), '') IS NOT NULL OR 
				NULLIF(TRIM(k.no_sim_b1), '') IS NOT NULL OR 
				NULLIF(TRIM(k.no_sim_a), '') IS NOT NULL OR
				NULLIF(TRIM(k.no_sim_c), '') IS NOT NULL
			)
			  AND k.aktif = 'Y'
			ORDER BY expire_date ASC NULLS LAST
		`;

		// 2. Ambil data Kontrak Kerja PKWT
		const contractDocuments = await sql`
			SELECT 
				k.id,
				k.payroll_id,
				k.nama_karyawan,
				COALESCE(t.title, k.title, '-') as job_title,
				d.dept_name,
				COALESCE(k.payroll_id, '-') as doc_number,
				'Kontrak Kerja PKWT' as doc_type,
				TO_CHAR(COALESCE(k.tgl_finish_contract, k.agreement_expire), 'YYYY-MM-DD') as expire_date,
				(COALESCE(k.tgl_finish_contract, k.agreement_expire) - CURRENT_DATE)::int as days_remaining
			FROM master.m_karyawan k
			LEFT JOIN master.m_title t ON t.title_code = k.title
			LEFT JOIN master.m_dept d ON d.dept_code = k.dept_id
			WHERE (k.tgl_finish_contract IS NOT NULL OR k.agreement_expire IS NOT NULL)
			  AND k.aktif = 'Y'
			ORDER BY expire_date ASC NULLS LAST
		`;

		// 3. Ambil data Sertifikasi K3 & Training
		const k3Documents = await sql`
			SELECT 
				p.id as training_id,
				p.payroll_id,
				COALESCE(k.nama_karyawan, p.payroll_id) as nama_karyawan,
				COALESCE(t.title, k.title, '-') as job_title,
				d.dept_name,
				prog.title as doc_number,
				COALESCE(prog.category, 'K3 / Training') as doc_type,
				TO_CHAR(prog.certificate_expiry, 'YYYY-MM-DD') as expire_date,
				(prog.certificate_expiry - CURRENT_DATE)::int as days_remaining
			FROM hris.training_participants p
			JOIN hris.training_programs prog ON prog.id = p.program_id
			LEFT JOIN master.m_karyawan k ON k.payroll_id = p.payroll_id
			LEFT JOIN master.m_title t ON t.title_code = k.title
			LEFT JOIN master.m_dept d ON d.dept_code = k.dept_id
			WHERE prog.certificate_expiry IS NOT NULL
			ORDER BY prog.certificate_expiry ASC NULLS LAST
		`;

		// Helper function untuk menentukan severity
		const mapSeverity = (item: any) => {
			const days = item.days_remaining;
			if (days === null || days === undefined) return { ...item, status: 'valid', severity_label: 'Valid' };
			if (days <= 0) return { ...item, status: 'expired', severity_label: 'Expired' };
			if (days <= 30) return { ...item, status: 'critical', severity_label: 'Critical (H-30)' };
			if (days <= 60) return { ...item, status: 'warning', severity_label: 'Warning (H-60)' };
			return { ...item, status: 'valid', severity_label: 'Valid' };
		};

		const simMapped = (simDocuments || []).map(mapSeverity);
		const contractMapped = (contractDocuments || []).map(mapSeverity);
		const k3Mapped = (k3Documents || []).map(mapSeverity);

		// Gabungkan ringkasan KPI
		const allDocs = [...simMapped, ...contractMapped, ...k3Mapped];
		const summary = {
			total_expired: allDocs.filter(d => d.status === 'expired').length,
			total_critical: allDocs.filter(d => d.status === 'critical').length,
			total_warning: allDocs.filter(d => d.status === 'warning').length,
			total_valid: allDocs.filter(d => d.status === 'valid').length,
			total_docs: allDocs.length,
			sim_count: simMapped.length,
			contract_count: contractMapped.length,
			k3_count: k3Mapped.length
		};

		// Filter list sesuai category, severity, search
		let activeDocs = simMapped;
		if (category === 'contract') activeDocs = contractMapped;
		if (category === 'k3') activeDocs = k3Mapped;

		if (severity) {
			activeDocs = activeDocs.filter(d => d.status === severity);
		}

		if (searchQuery) {
			const q = searchQuery.toLowerCase();
			activeDocs = activeDocs.filter(
				d => (d.nama_karyawan && d.nama_karyawan.toLowerCase().includes(q)) ||
				     (d.payroll_id && d.payroll_id.toLowerCase().includes(q)) ||
				     (d.doc_number && d.doc_number.toLowerCase().includes(q)) ||
				     (d.doc_type && d.doc_type.toLowerCase().includes(q)) ||
				     (d.dept_name && d.dept_name.toLowerCase().includes(q))
			);
		}

		return {
			category,
			severity,
			searchQuery,
			summary,
			documents: activeDocs,
			dataSource: 'direct-db'
		};
	} catch (err: any) {
		console.error('❌ [HRD Certifications] Error loading documents:', err?.message);
		return {
			category: 'sim',
			severity: '',
			searchQuery: '',
			summary: { total_expired: 0, total_critical: 0, total_warning: 0, total_valid: 0, total_docs: 0, sim_count: 0, contract_count: 0, k3_count: 0 },
			documents: [],
			dataSource: 'direct-db'
		};
	}
};

export const actions: Actions = {
	renewDocument: async ({ request }) => {
		const formData = await request.formData();
		const payrollId = formData.get('payroll_id')?.toString();
		const docType = formData.get('doc_type')?.toString();
		const newDocNumber = formData.get('new_doc_number')?.toString()?.trim() || null;
		const newExpireDate = formData.get('new_expire_date')?.toString()?.trim();

		if (!payrollId || !newExpireDate) {
			return fail(400, { message: 'Payroll ID dan Tanggal Kedaluwarsa Baru wajib diisi' });
		}

		try {
			if (docType?.includes('SIM B2')) {
				await sql`
					UPDATE master.m_karyawan 
					SET no_sim_b2_umum = ${newDocNumber}, no_sim_b2_umum_expiredate = ${newExpireDate}::date 
					WHERE payroll_id = ${payrollId}
				`;
			} else if (docType?.includes('SIM B1')) {
				await sql`
					UPDATE master.m_karyawan 
					SET no_sim_b1 = ${newDocNumber}, no_sim_b1_expiredate = ${newExpireDate} 
					WHERE payroll_id = ${payrollId}
				`;
			} else if (docType?.includes('SIM A')) {
				await sql`
					UPDATE master.m_karyawan 
					SET no_sim_a = ${newDocNumber}, no_sim_a_expiredate = ${newExpireDate}::date 
					WHERE payroll_id = ${payrollId}
				`;
			} else if (docType?.includes('SIM C')) {
				await sql`
					UPDATE master.m_karyawan 
					SET no_sim_c = ${newDocNumber}, no_sim_c_expiredate = ${newExpireDate}::date 
					WHERE payroll_id = ${payrollId}
				`;
			} else if (docType?.includes('Kontrak')) {
				await sql`
					UPDATE master.m_karyawan 
					SET tgl_finish_contract = ${newExpireDate}::date 
					WHERE payroll_id = ${payrollId}
				`;
			}

			return { success: true, message: 'Berhasil memperbarui tanggal kedaluwarsa dokumen' };
		} catch (err: any) {
			console.error('❌ Error renewing document:', err?.message);
			return fail(500, { message: 'Gagal memperbarui dokumen: ' + (err?.message || 'Database error') });
		}
	}
};
