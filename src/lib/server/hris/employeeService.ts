import sql from '$lib/server/db';
import { logError } from '$lib/utils/logger';

export interface UpdateEmployeeData {
	id: number;
	nama_karyawan: string;
	email?: string | null;
	telp1?: string | null;
	title?: string | null;
	div_id?: string | null;
	dept_id?: string | null;
	lokasi?: string | null;
	status?: string | null;
	aktif?: string | null;
	tgl_masuk?: string | null;
	no_ktp?: string | null;
	no_npwp?: string | null;
	tempat_lahir?: string | null;
	tgl_lahir?: string | null;
	jenis_kelamin?: string | null;
	agama?: string | null;
	marital_status?: string | null;
	alamat_ktp?: string | null;
	kota_ktp?: string | null;
	pendidikan_terakhir?: string | null;
	jurusan?: string | null;
	title_atasan?: string | null;
	subordinate_titles?: string[] | null;
}

export interface CreateEmployeeData {
	payroll_id?: string | null;
	nama_karyawan: string;
	email?: string | null;
	telp1?: string | null;
	title?: string | null;
	div_id?: string | null;
	dept_id?: string | null;
	lokasi?: string | null;
	status?: string | null;
	aktif?: string | null;
	tgl_masuk?: string | null;
	no_ktp?: string | null;
	no_npwp?: string | null;
	tempat_lahir?: string | null;
	tgl_lahir?: string | null;
	jenis_kelamin?: string | null;
	agama?: string | null;
	marital_status?: string | null;
	alamat_ktp?: string | null;
	kota_ktp?: string | null;
	pendidikan_terakhir?: string | null;
	jurusan?: string | null;
	title_atasan?: string | null;
	subordinate_titles?: string[] | null;
}

/**
 * Normalisasi jenis kelamin sesuai constraint: 'MALE' | 'FEMALE'
 */
function normalizeGender(g?: string | null): string {
	if (!g) return 'MALE';
	const upper = g.trim().toUpperCase();
	if (upper === 'P' || upper === 'PEREMPUAN' || upper === 'FEMALE' || upper === 'WANITA') {
		return 'FEMALE';
	}
	return 'MALE';
}

/**
 * Normalisasi status kepegawaian
 */
function normalizeStatus(s?: string | null): string {
	if (!s) return 'PERMANENT';
	const upper = s.trim().toUpperCase();
	if (upper.includes('TETAP') || upper.includes('PERMANENT')) return 'PERMANENT';
	if (upper.includes('KONTRAK') || upper.includes('CONTRACT')) return 'CONTRACT';
	if (upper.includes('MITRA')) return 'MITRA KERJA';
	if (upper.includes('BORONGAN')) return 'BORONGAN';
	if (upper.includes('MAGANG') || upper.includes('INTERN')) return 'INTERNSHIP';
	if (upper.includes('HARIAN')) return 'HARIAN';
	return upper;
}

/**
 * Update data karyawan di tabel master.m_karyawan dan relasi hirarki di master.m_atasan
 */
export async function updateEmployeeRecord(data: UpdateEmployeeData) {
	if (!data.id || data.id <= 0) {
		throw new Error('ID Karyawan tidak valid.');
	}

	if (!data.nama_karyawan || !data.nama_karyawan.trim()) {
		throw new Error('Nama Karyawan wajib diisi.');
	}

	try {
		const cleanDate = (d?: string | null) => (d && d.trim() ? d.trim() : null);
		const genderVal = normalizeGender(data.jenis_kelamin);
		const statusVal = normalizeStatus(data.status);
		const titleVal = data.title?.trim() || null;

		const result = await sql`
			UPDATE master.m_karyawan
			SET
				nama_karyawan = ${data.nama_karyawan.trim()},
				email = ${data.email?.trim() || null},
				telp1 = ${data.telp1?.trim() || null},
				title = ${titleVal},
				div_id = ${data.div_id?.trim() || null},
				dept_id = ${data.dept_id?.trim() || null},
				lokasi = ${data.lokasi?.trim() || 'Head Office Cilegon'},
				status = ${statusVal},
				aktif = ${data.aktif === 'N' ? 'N' : 'Y'},
				tgl_masuk = ${cleanDate(data.tgl_masuk)}::date,
				no_ktp = ${data.no_ktp?.trim() || null},
				no_npwp = ${data.no_npwp?.trim() || null},
				tempat_lahir = ${data.tempat_lahir?.trim() || null},
				tgl_lahir = ${cleanDate(data.tgl_lahir)}::date,
				jenis_kelamin = ${genderVal},
				agama = ${data.agama?.trim() || null},
				marital_status = ${data.marital_status?.trim() || null},
				alamat_ktp = ${data.alamat_ktp?.trim() || null},
				kota_ktp = ${data.kota_ktp?.trim() || null},
				pendidikan_terakhir = ${data.pendidikan_terakhir?.trim() || null},
				jurusan = ${data.jurusan?.trim() || null},
				last_updated = NOW()
			WHERE id = ${data.id}
			RETURNING id, payroll_id, nama_karyawan, email, telp1, title, div_id, dept_id, aktif, status;
		`;

		if (result.length === 0) {
			throw new Error('Data karyawan tidak ditemukan atau sudah dihapus.');
		}

		// Update Hirarki di master.m_atasan jika jabatan karyawan valid
		if (titleVal) {
			// 1. Update Atasan Langsung (title_atasan untuk title_bawahan = titleVal)
			if (data.title_atasan && data.title_atasan.trim()) {
				const atasanCode = data.title_atasan.trim();
				// Hapus relasi atasan lama untuk jabatan bawahan ini
				await sql`
					DELETE FROM master.m_atasan 
					WHERE title_bawahan = ${titleVal};
				`;
				// Masukkan relasi baru
				await sql`
					INSERT INTO master.m_atasan (title_atasan, title_bawahan, status, create_date)
					VALUES (${atasanCode}, ${titleVal}, '1', NOW());
				`;
			}

			// 2. Update Tim Bawahan Langsung (title_atasan = titleVal)
			if (data.subordinate_titles && Array.isArray(data.subordinate_titles)) {
				// Ambil bawahan lama
				await sql`
					DELETE FROM master.m_atasan 
					WHERE title_atasan = ${titleVal};
				`;
				for (const subCode of data.subordinate_titles) {
					if (subCode && subCode.trim() && subCode.trim() !== titleVal) {
						await sql`
							INSERT INTO master.m_atasan (title_atasan, title_bawahan, status, create_date)
							VALUES (${titleVal}, ${subCode.trim()}, '1', NOW())
							ON CONFLICT DO NOTHING;
						`;
					}
				}
			}
		}

		return {
			success: true,
			employee: result[0],
			message: `Data karyawan ${result[0].nama_karyawan} dan struktur hirarki berhasil diperbarui.`
		};
	} catch (err: any) {
		logError('UPDATE_EMPLOYEE_RECORD_FAIL', err?.message);
		throw err;
	}
}

/**
 * Generate nomor urut Payroll ID berikutnya dengan format standar YYMM.NNNN
 */
export async function generateNextPayrollId(joinDateStr?: string): Promise<string> {
	try {
		const date = joinDateStr ? new Date(joinDateStr) : new Date();
		const validDate = isNaN(date.getTime()) ? new Date() : date;
		const yy = String(validDate.getFullYear()).slice(-2);
		const mm = String(validDate.getMonth() + 1).padStart(2, '0');
		const prefix = `${yy}${mm}`;

		const [row] = await sql`
			SELECT MAX(SUBSTRING(payroll_id FROM '\\.([0-9]+)$')::integer) as max_seq
			FROM master.m_karyawan
			WHERE payroll_id ~ '^(9[0-9]|[0-2][0-9])[0-1][0-9]\\.[0-9]{4}$'
		`;
		const nextSeq = (row?.max_seq || 4398) + 1;
		return `${prefix}.${String(nextSeq).padStart(4, '0')}`;
	} catch (e: any) {
		logError('GENERATE_PAYROLL_ID_FAIL', e?.message);
		const now = new Date();
		const yy = String(now.getFullYear()).slice(-2);
		const mm = String(now.getMonth() + 1).padStart(2, '0');
		return `${yy}${mm}.4399`;
	}
}

/**
 * Tambah data karyawan baru ke master.m_karyawan dan relasi hirarki di master.m_atasan
 */
export async function createEmployeeRecord(data: CreateEmployeeData) {
	if (!data.nama_karyawan || !data.nama_karyawan.trim()) {
		throw new Error('Nama Lengkap Karyawan wajib diisi.');
	}

	try {
		const cleanDate = (d?: string | null) => (d && d.trim() ? d.trim() : null);
		const genderVal = normalizeGender(data.jenis_kelamin);
		const statusVal = normalizeStatus(data.status);
		const titleVal = data.title?.trim() || null;
		const ptkpVal = data.marital_status?.trim() || 'TK-0';
		const payrollIdVal = data.payroll_id?.trim() || (await generateNextPayrollId(data.tgl_masuk || undefined));

		const result = await sql`
			INSERT INTO master.m_karyawan (
				payroll_id,
				nama_karyawan,
				email,
				telp1,
				title,
				div_id,
				dept_id,
				lokasi,
				status,
				aktif,
				ptkp,
				tgl_masuk,
				no_ktp,
				no_npwp,
				tempat_lahir,
				tgl_lahir,
				jenis_kelamin,
				agama,
				marital_status,
				alamat_ktp,
				kota_ktp,
				pendidikan_terakhir,
				jurusan,
				created_by,
				date_created,
				created_at,
				last_updated
			) VALUES (
				${payrollIdVal},
				${data.nama_karyawan.trim()},
				${data.email?.trim() || null},
				${data.telp1?.trim() || null},
				${titleVal},
				${data.div_id?.trim() || null},
				${data.dept_id?.trim() || null},
				${data.lokasi?.trim() || 'Head Office Cilegon'},
				${statusVal},
				${data.aktif === 'N' ? 'N' : 'Y'},
				${ptkpVal},
				${cleanDate(data.tgl_masuk)}::date,
				${data.no_ktp?.trim() || null},
				${data.no_npwp?.trim() || null},
				${data.tempat_lahir?.trim() || null},
				${cleanDate(data.tgl_lahir)}::date,
				${genderVal},
				${data.agama?.trim() || null},
				${data.marital_status?.trim() || null},
				${data.alamat_ktp?.trim() || null},
				${data.kota_ktp?.trim() || null},
				${data.pendidikan_terakhir?.trim() || null},
				${data.jurusan?.trim() || null},
				'HRIS_SYSTEM',
				NOW(),
				NOW(),
				NOW()
			)
			RETURNING id, payroll_id, nama_karyawan, email, telp1, title, div_id, dept_id, aktif, status;
		`;

		if (result.length === 0) {
			throw new Error('Gagal menyimpan data karyawan baru ke database.');
		}

		const newEmployee = result[0];

		// Simpan Hirarki di master.m_atasan jika jabatan valid
		if (titleVal) {
			// 1. Hubungkan Atasan Langsung
			if (data.title_atasan && data.title_atasan.trim()) {
				await sql`
					INSERT INTO master.m_atasan (title_atasan, title_bawahan, status, create_date)
					VALUES (${data.title_atasan.trim()}, ${titleVal}, '1', NOW())
					ON CONFLICT DO NOTHING;
				`;
			}

			// 2. Hubungkan Bawahan Langsung
			if (data.subordinate_titles && Array.isArray(data.subordinate_titles)) {
				for (const subCode of data.subordinate_titles) {
					if (subCode && subCode.trim() && subCode.trim() !== titleVal) {
						await sql`
							INSERT INTO master.m_atasan (title_atasan, title_bawahan, status, create_date)
							VALUES (${titleVal}, ${subCode.trim()}, '1', NOW())
							ON CONFLICT DO NOTHING;
						`;
					}
				}
			}
		}

		return {
			success: true,
			employee: newEmployee,
			message: `Karyawan baru ${newEmployee.nama_karyawan} (${newEmployee.payroll_id}) berhasil ditambahkan.`
		};
	} catch (err: any) {
		logError('CREATE_EMPLOYEE_RECORD_FAIL', err?.message);
		throw err;
	}
}

/**
 * Mengambil master data referensi lengkap termasuk pemetaan atasan-bawahan dan daftar personel aktif
 */
export async function getEmployeeMasterLookups() {
	try {
		const [titles, divisions, departments, supervisorMappings, activePersonnel, locations, nextPayrollId] = await Promise.all([
			sql<any[]>`
				SELECT title_code, title, active 
				FROM master.m_title 
				WHERE active = 'Y' 
				   OR title_code IN (SELECT DISTINCT title FROM master.m_karyawan WHERE title IS NOT NULL)
				ORDER BY title ASC
			`,
			sql<any[]>`SELECT div_code, div_name FROM master.m_division ORDER BY div_name ASC`,
			sql<any[]>`
				SELECT dept_code, dept_name, div_code 
				FROM master.m_dept 
				WHERE (app IS NULL OR app != 'finance_system')
				  AND (active = 'Y' OR dept_code IN (SELECT DISTINCT dept_id FROM master.m_karyawan WHERE dept_id IS NOT NULL))
				ORDER BY dept_name ASC
			`,
			sql<any[]>`SELECT id, title_atasan, title_bawahan FROM master.m_atasan WHERE status IN ('0', '1', 'Y') OR status IS NULL`,
			sql<any[]>`
				SELECT 
					k.id, k.payroll_id, k.nama_karyawan as name, k.title as title_code, 
					COALESCE(k.foto, '') as avatar, k.div_id, k.dept_id
				FROM master.m_karyawan k
				WHERE k.aktif = 'Y'
				ORDER BY k.nama_karyawan ASC
			`,
			sql<any[]>`SELECT loc_code, loc_name, city FROM master.m_lokasi ORDER BY loc_name ASC`,
			generateNextPayrollId()
		]);

		return {
			titles: titles.map(t => ({ code: t.title_code, name: t.title, active: t.active })),
			divisions: divisions.map(d => ({ code: d.div_code, name: d.div_name })),
			departments: departments.map(d => ({ code: d.dept_code, name: d.dept_name, divCode: d.div_code })),
			supervisorMappings: supervisorMappings.map(m => ({
				id: m.id,
				titleAtasan: m.title_atasan,
				titleBawahan: m.title_bawahan
			})),
			activePersonnel: activePersonnel.map(p => ({
				id: p.id,
				payrollId: p.payroll_id,
				name: p.name,
				titleCode: p.title_code,
				avatar: p.avatar,
				divId: p.div_id,
				deptId: p.dept_id
			})),
			locations: locations.map(l => ({
				code: l.loc_code,
				name: l.loc_name,
				city: l.city
			})),
			nextPayrollId
		};
	} catch (e: any) {
		logError('GET_EMPLOYEE_LOOKUPS_FAIL', e?.message);
		return {
			titles: [],
			divisions: [],
			departments: [],
			supervisorMappings: [],
			activePersonnel: [],
			locations: [],
			nextPayrollId: ''
		};
	}
}
