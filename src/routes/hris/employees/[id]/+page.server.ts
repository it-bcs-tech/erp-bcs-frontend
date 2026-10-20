import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/utils/api';
import { error } from '@sveltejs/kit';
import { calculateExpiryGate } from '$lib/server/dms';
import { logError } from '$lib/utils/logger';
import sql from '$lib/server/db';

export const load: PageServerLoad = async ({ params, cookies }) => {
	const authToken = cookies.get('auth_token');
	const empId = params.id;
	const empNumericId = Number(String(empId).replace(/[^0-9]/g, ''));

	// 1. Ambil data master karyawan dari PostgreSQL untuk fallback & enrichment
	let dbKaryawan: any = null;
	try {
		if (empNumericId > 0 || empId) {
			const rows = await sql`
				SELECT 
					k.*,
					t.title as job_title,
					d.dept_name,
					div.div_name
				FROM master.m_karyawan k
				LEFT JOIN master.m_title t ON t.title_code = k.title
				LEFT JOIN master.m_dept d ON d.dept_code = k.dept_id
				LEFT JOIN master.m_division div ON div.div_code = k.div_id
				WHERE k.id = ${empNumericId > 0 ? empNumericId : -1} OR k.payroll_id = ${empId}
				LIMIT 1
			`;
			if (rows.length > 0) {
				dbKaryawan = rows[0];
			}
		}
	} catch (dbErr: any) {
		console.warn('[HRIS Employee Detail] Direct master.m_karyawan query failed:', dbErr?.message);
	}

	// 2. Ambil dari Laravel API (jika authToken ada dan endpoint aktif)
	let employee: any = null;
	let apiSuccess = false;
	try {
		const response = await apiFetch<any>(
			`/api/v1/hris/employees/${empId}`,
			{},
			authToken
		);
		if (response?.data) {
			employee = response.data;
			apiSuccess = true;
		}
	} catch (apiErr: any) {
		console.warn(`[HRIS Employee Detail] Laravel API fetch failed for ${empId}, falling back to DB:`, apiErr?.message);
	}

	// Jika API gagal tapi ada data di database master, bangun objek employee
	if (!employee) {
		if (dbKaryawan) {
			employee = {
				id: `EMP-${dbKaryawan.id}`,
				rawId: dbKaryawan.id,
				dbId: dbKaryawan.id,
				name: dbKaryawan.nama_karyawan,
				role: dbKaryawan.job_title || dbKaryawan.title || 'Staff',
				department: dbKaryawan.dept_name || 'General',
				email: dbKaryawan.email || `${(dbKaryawan.nama_karyawan || 'user').toLowerCase().replace(/\s+/g, '.')}@bcslabs.tech`,
				phone: dbKaryawan.telp1 || dbKaryawan.telp2 || '-',
				location: dbKaryawan.lokasi || 'Cilegon Head Office',
				joinDate: dbKaryawan.tgl_masuk ? new Date(dbKaryawan.tgl_masuk).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' }) : '2020-01-15',
				status: dbKaryawan.aktif === 'Y' ? 'Active' : 'Inactive',
				performance: '92',
				leaveBalance: 12,
				manager: 'Management Team',
				skills: [],
				timeline: [],
				cover: 'bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900',
				avatar: dbKaryawan.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(dbKaryawan.nama_karyawan || 'User')}&background=2563eb&color=fff`,
				payrollId: dbKaryawan.payroll_id,
				payroll_id: dbKaryawan.payroll_id,
				nik: dbKaryawan.no_ktp || dbKaryawan.payroll_id,
				npwp: dbKaryawan.no_npwp || '-',
				birthPlace: dbKaryawan.tempat_lahir,
				birthDate: dbKaryawan.tgl_lahir ? new Date(dbKaryawan.tgl_lahir).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' }) : '-',
				gender: dbKaryawan.jenis_kelamin,
				religion: dbKaryawan.agama,
				maritalStatus: dbKaryawan.marital_status,
				address: dbKaryawan.alamat_ktp || dbKaryawan.alamat_ktp2 || '-',
				city: dbKaryawan.kota_ktp || 'Cilegon',
				education: dbKaryawan.pendidikan_terakhir ? `${dbKaryawan.pendidikan_terakhir} - ${dbKaryawan.jurusan || ''}` : '-'
			};
		} else {
			throw error(404, 'Employee not found');
		}
	} else if (dbKaryawan) {
		// Sinkronkan data master ke employee jika ada properti yang belum lengkap dari Laravel
		employee.payroll_id = employee.payroll_id || employee.payrollId || dbKaryawan.payroll_id;
		employee.payrollId = employee.payroll_id;
		employee.nik = employee.nik || dbKaryawan.no_ktp || dbKaryawan.payroll_id;
		employee.npwp = employee.npwp || dbKaryawan.no_npwp || '-';
		employee.birthPlace = employee.birthPlace || dbKaryawan.tempat_lahir;
		employee.birthDate = employee.birthDate || (dbKaryawan.tgl_lahir ? new Date(dbKaryawan.tgl_lahir).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' }) : '-');
		employee.gender = employee.gender || dbKaryawan.jenis_kelamin;
		employee.religion = employee.religion || dbKaryawan.agama;
		employee.maritalStatus = employee.maritalStatus || dbKaryawan.marital_status;
		employee.address = employee.address || dbKaryawan.alamat_ktp || dbKaryawan.alamat_ktp2 || '-';
		employee.city = employee.city || dbKaryawan.kota_ktp || 'Cilegon';
		employee.education = employee.education || (dbKaryawan.pendidikan_terakhir ? `${dbKaryawan.pendidikan_terakhir} - ${dbKaryawan.jurusan || ''}` : '-');
		employee.rawId = employee.rawId || dbKaryawan.id;
		employee.department = typeof employee.department === 'object' ? (employee.department.name || dbKaryawan.dept_name || 'General') : (employee.department || dbKaryawan.dept_name || 'General');
	}

	employee.skills = employee.skills || [];
	employee.timeline = employee.timeline || [];

	// Map timeline dates jika ada
	if (employee.timeline.length > 0) {
		employee.timeline = employee.timeline.map((t: any) => ({
			...t,
			date: t.date ? new Date(t.date).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Unknown'
		}));
	}

	const effectivePayrollId = String(employee.payroll_id || employee.payrollId || dbKaryawan?.payroll_id || '').trim();
	const effectiveEmpId = Number(employee.rawId || employee.dbId || dbKaryawan?.id || empNumericId);
	const effectiveEmpName = String(employee.name || dbKaryawan?.nama_karyawan || '').trim();

	// 3. Ambil Dokumen Legalitas & Lisensi DMS (SIM, SIO, KTP, B3, MCU, Kontrak)
	let dmsDocs: any[] = [];
	try {
		const orConditions = [];
		if (effectivePayrollId) {
			orConditions.push(sql`(d.metadata->>'payroll_id' = ${effectivePayrollId} OR d.metadata->>'driver_payroll' = ${effectivePayrollId})`);
		}
		if (effectiveEmpId > 0) {
			orConditions.push(sql`(d.employee_id = ${effectiveEmpId} OR d.employee_id IN (SELECT id FROM master.m_drivers WHERE karyawan_id = ${effectiveEmpId}))`);
		}

		if (orConditions.length > 0) {
			const whereClause = orConditions.reduce((acc, curr) => sql`${acc} OR ${curr}`);
			const docs = await sql`
				SELECT 
					d.id,
					d.doc_number,
					d.title,
					to_char(d.expiry_date, 'YYYY-MM-DD') as expiry_date,
					dt.code as type_code,
					dt.name as type_name,
					d.status,
					(d.expiry_date::date - CURRENT_DATE)::int as days_remaining
				FROM dms.documents d
				JOIN dms.m_doc_type dt ON dt.id = d.doc_type_id
				WHERE ${whereClause}
				ORDER BY d.expiry_date ASC NULLS LAST
			`;

			dmsDocs = docs.map((doc: any) => {
				const gate = calculateExpiryGate(doc.expiry_date, doc.status);
				return {
					...doc,
					daysRemaining: gate.daysRemaining,
					gateLevel: gate.gateLevel,
					computedStatus: gate.computedStatus
				};
			});
		}
	} catch (dbErr: any) {
		console.warn('[HRIS Employee Detail] Direct DMS lookup failed:', dbErr?.message);
		if (employee.documents && Array.isArray(employee.documents)) {
			dmsDocs = employee.documents.map((doc: any) => {
				const gate = calculateExpiryGate(doc.expiry_date);
				return {
					...doc,
					daysRemaining: gate.daysRemaining,
					gateLevel: gate.gateLevel,
					computedStatus: gate.computedStatus
				};
			});
		}
	}

	// 4. Ambil Riwayat Training & Sertifikasi Asli (LMS & HRIS)
	let trainings: any[] = [];
	let lmsCertificates: any[] = [];
	let lmsEnrollments: any[] = [];
	let competencyCerts: any[] = [];
	const driverLicenses: any[] = [];

	try {
		// A. Riwayat Pelatihan HRIS (hris.training_participants & hris.training_programs)
		if (effectivePayrollId) {
			const tRows = await sql`
				SELECT 
					p.id,
					p.program_id,
					prog.title,
					COALESCE(prog.category, 'SAFETY') as category,
					TO_CHAR(prog.start_date, 'YYYY-MM-DD') as start_date,
					TO_CHAR(prog.end_date, 'YYYY-MM-DD') as end_date,
					COALESCE(prog.trainer, 'BCS Academy Internal') as trainer,
					prog.batch,
					COALESCE(p.score, prog.score, 'EFEKTIF') as score,
					COALESCE(p.status, 'LULUS') as status,
					TO_CHAR(prog.certificate_expiry, 'YYYY-MM-DD') as certificate_expiry,
					(prog.certificate_expiry - CURRENT_DATE)::int as days_remaining,
					p.attachment
				FROM hris.training_participants p
				JOIN hris.training_programs prog ON prog.id = p.program_id
				WHERE p.payroll_id = ${effectivePayrollId}
				ORDER BY prog.start_date DESC NULLS LAST, p.id DESC
			`;

			trainings = tRows.map((t: any) => {
				const gate = calculateExpiryGate(t.certificate_expiry);
				return {
					id: t.id,
					programId: t.program_id,
					title: t.title,
					category: t.category,
					startDate: t.start_date,
					endDate: t.end_date,
					trainer: t.trainer,
					batch: t.batch,
					score: t.score,
					status: t.status,
					certificateExpiry: t.certificate_expiry,
					daysRemaining: gate.daysRemaining,
					gateLevel: gate.gateLevel,
					computedStatus: gate.computedStatus,
					attachment: t.attachment
				};
			});
		}

		// B. Sertifikat Resmi LMS (hris.lms_certificates)
		const lmsCertRows = await sql`
			SELECT 
				c.certificate_number,
				c.course_id,
				c.course_title,
				c.category,
				c.score,
				TO_CHAR(c.issued_at, 'YYYY-MM-DD') as issued_at,
				TO_CHAR(c.valid_until, 'YYYY-MM-DD') as valid_until,
				c.qr_verify_url,
				(c.valid_until::date - CURRENT_DATE)::int as days_remaining
			FROM hris.lms_certificates c
			WHERE (
				${effectivePayrollId ? sql`c.payroll_id = ${effectivePayrollId} OR ` : sql``}
				${effectiveEmpId > 0 ? sql`c.payroll_id = ${'EMP-' + effectiveEmpId} OR ` : sql``}
				c.employee_name ILIKE ${'%' + effectiveEmpName + '%'}
			)
			ORDER BY c.issued_at DESC
		`;

		lmsCertificates = lmsCertRows.map((c: any) => {
			const gate = calculateExpiryGate(c.valid_until);
			return {
				certificateNumber: c.certificate_number,
				courseId: c.course_id,
				courseTitle: c.course_title,
				category: c.category || 'Operations',
				score: c.score ? Number(c.score).toFixed(0) : '90',
				issuedAt: c.issued_at,
				validUntil: c.valid_until,
				qrVerifyUrl: c.qr_verify_url,
				daysRemaining: gate.daysRemaining,
				gateLevel: gate.gateLevel,
				computedStatus: gate.computedStatus
			};
		});

		// C. E-Learning Course Enrollments (hris.lms_enrollments & hris.lms_courses)
		if (effectivePayrollId) {
			const enrollRows = await sql`
				SELECT 
					e.id,
					e.course_id,
					c.title as course_title,
					c.category as course_category,
					c.instructor,
					e.status,
					e.progress_percent,
					e.pre_test_score,
					e.post_test_score,
					TO_CHAR(e.enrolled_at, 'YYYY-MM-DD') as enrolled_at,
					TO_CHAR(e.completed_at, 'YYYY-MM-DD') as completed_at,
					TO_CHAR(e.deadline, 'YYYY-MM-DD') as deadline
				FROM hris.lms_enrollments e
				JOIN hris.lms_courses c ON c.id = e.course_id
				WHERE e.payroll_id = ${effectivePayrollId}
				ORDER BY e.enrolled_at DESC
			`;

			lmsEnrollments = enrollRows.map((e: any) => ({
				id: e.id,
				courseId: e.course_id,
				courseTitle: e.course_title,
				category: e.course_category || 'General',
				instructor: e.instructor || 'Tim Trainer BCS',
				status: e.status || 'ENROLLED',
				progressPercent: Number(e.progress_percent || 0),
				preTestScore: e.pre_test_score ? Number(e.pre_test_score) : null,
				postTestScore: e.post_test_score ? Number(e.post_test_score) : null,
				enrolledAt: e.enrolled_at,
				completedAt: e.completed_at,
				deadline: e.deadline
			}));
		}

		// D. Sertifikat Lisensi & SIO dari DMS (dms.documents)
		competencyCerts = dmsDocs.filter((d: any) => {
			const code = d.type_code?.toUpperCase() || '';
			const name = d.type_name?.toUpperCase() || '';
			return code.includes('SIO') || code.includes('SERTIFIKAT') || code.includes('K3') || name.includes('SIO') || name.includes('SERTIFIKAT');
		});

		// E. Lisensi Driver SIM dari master.m_karyawan
		if (dbKaryawan) {
			if (dbKaryawan.no_sim_b2_umum) {
				const gate = calculateExpiryGate(dbKaryawan.no_sim_b2_umum_expiredate);
				driverLicenses.push({
					type: 'SIM B2 UMUM',
					docNumber: dbKaryawan.no_sim_b2_umum,
					expiryDate: dbKaryawan.no_sim_b2_umum_expiredate ? new Date(dbKaryawan.no_sim_b2_umum_expiredate).toISOString().slice(0, 10) : null,
					daysRemaining: gate.daysRemaining,
					gateLevel: gate.gateLevel,
					computedStatus: gate.computedStatus
				});
			}
			if (dbKaryawan.no_sim_b1) {
				const expStr = dbKaryawan.no_sim_b1_expiredate ? String(dbKaryawan.no_sim_b1_expiredate).slice(0, 10) : null;
				const gate = calculateExpiryGate(expStr);
				driverLicenses.push({
					type: 'SIM B1',
					docNumber: dbKaryawan.no_sim_b1,
					expiryDate: expStr,
					daysRemaining: gate.daysRemaining,
					gateLevel: gate.gateLevel,
					computedStatus: gate.computedStatus
				});
			}
			if (dbKaryawan.no_sim_a) {
				const gate = calculateExpiryGate(dbKaryawan.no_sim_a_expiredate);
				driverLicenses.push({
					type: 'SIM A',
					docNumber: dbKaryawan.no_sim_a,
					expiryDate: dbKaryawan.no_sim_a_expiredate ? new Date(dbKaryawan.no_sim_a_expiredate).toISOString().slice(0, 10) : null,
					daysRemaining: gate.daysRemaining,
					gateLevel: gate.gateLevel,
					computedStatus: gate.computedStatus
				});
			}
			if (dbKaryawan.no_sim_c) {
				const gate = calculateExpiryGate(dbKaryawan.no_sim_c_expiredate);
				driverLicenses.push({
					type: 'SIM C',
					docNumber: dbKaryawan.no_sim_c,
					expiryDate: dbKaryawan.no_sim_c_expiredate ? new Date(dbKaryawan.no_sim_c_expiredate).toISOString().slice(0, 10) : null,
					daysRemaining: gate.daysRemaining,
					gateLevel: gate.gateLevel,
					computedStatus: gate.computedStatus
				});
			}
		}
	} catch (trainErr: any) {
		console.warn('[HRIS Employee Detail] Training data load failed:', trainErr?.message);
	}

	// Ringkasan KPI
	const allExpiryGates = [
		...trainings.filter(t => t.certificateExpiry).map(t => t.computedStatus),
		...lmsCertificates.map(c => c.computedStatus),
		...competencyCerts.map(c => c.computedStatus),
		...driverLicenses.map(l => l.computedStatus)
	];

	const summary = {
		totalTrainings: trainings.length,
		totalCertificates: lmsCertificates.length + competencyCerts.length,
		activeCourses: lmsEnrollments.filter(e => e.status !== 'COMPLETED').length,
		validLicenses: driverLicenses.filter(l => l.computedStatus === 'ACTIVE').length + driverLicenses.length,
		hasExpired: allExpiryGates.some(s => s === 'EXPIRED'),
		hasWarning: allExpiryGates.some(s => s === 'EXPIRING_SOON'),
		expiredCount: allExpiryGates.filter(s => s === 'EXPIRED').length,
		warningCount: allExpiryGates.filter(s => s === 'EXPIRING_SOON').length
	};

	return {
		employee,
		dmsDocs,
		trainingData: {
			trainings,
			lmsCertificates,
			lmsEnrollments,
			competencyCerts,
			driverLicenses,
			summary
		},
		dataSource: apiSuccess ? 'laravel+postgres' : 'postgres-direct'
	};
};
