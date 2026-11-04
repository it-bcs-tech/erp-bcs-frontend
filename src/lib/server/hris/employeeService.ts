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
	status_karyawan?: string | null;
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
}

/**
 * Update data karyawan di tabel master.m_karyawan
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

		const result = await sql`
			UPDATE master.m_karyawan
			SET
				nama_karyawan = ${data.nama_karyawan.trim()},
				email = ${data.email?.trim() || null},
				telp1 = ${data.telp1?.trim() || null},
				title = ${data.title?.trim() || null},
				div_id = ${data.div_id?.trim() || null},
				dept_id = ${data.dept_id?.trim() || null},
				lokasi = ${data.lokasi?.trim() || 'Head Office Cilegon'},
				status_karyawan = ${data.status_karyawan?.trim() || 'TETAP'},
				aktif = ${data.aktif === 'N' ? 'N' : 'Y'},
				tgl_masuk = ${cleanDate(data.tgl_masuk)}::date,
				no_ktp = ${data.no_ktp?.trim() || null},
				no_npwp = ${data.no_npwp?.trim() || null},
				tempat_lahir = ${data.tempat_lahir?.trim() || null},
				tgl_lahir = ${cleanDate(data.tgl_lahir)}::date,
				jenis_kelamin = ${data.jenis_kelamin?.trim() || null},
				agama = ${data.agama?.trim() || null},
				marital_status = ${data.marital_status?.trim() || null},
				alamat_ktp = ${data.alamat_ktp?.trim() || null},
				kota_ktp = ${data.kota_ktp?.trim() || null},
				pendidikan_terakhir = ${data.pendidikan_terakhir?.trim() || null},
				jurusan = ${data.jurusan?.trim() || null},
				last_updated = NOW()
			WHERE id = ${data.id}
			RETURNING id, payroll_id, nama_karyawan, email, telp1, title, div_id, dept_id, aktif;
		`;

		if (result.length === 0) {
			throw new Error('Data karyawan tidak ditemukan atau sudah dihapus.');
		}

		return {
			success: true,
			employee: result[0],
			message: `Data karyawan ${result[0].nama_karyawan} berhasil diperbarui.`
		};
	} catch (err: any) {
		logError('UPDATE_EMPLOYEE_RECORD_FAIL', err?.message);
		throw err;
	}
}

/**
 * Mengambil master data referensi (jabatan, divisi, departemen)
 */
export async function getEmployeeMasterLookups() {
	try {
		const [titles, divisions, departments] = await Promise.all([
			sql<any[]>`SELECT title_code, title FROM master.m_title ORDER BY title ASC`,
			sql<any[]>`SELECT div_code, div_name FROM master.m_division ORDER BY div_name ASC`,
			sql<any[]>`SELECT dept_code, dept_name, div_code FROM master.m_dept ORDER BY dept_name ASC`
		]);

		return {
			titles: titles.map(t => ({ code: t.title_code, name: t.title })),
			divisions: divisions.map(d => ({ code: d.div_code, name: d.div_name })),
			departments: departments.map(d => ({ code: d.dept_code, name: d.dept_name, divCode: d.div_code }))
		};
	} catch (e: any) {
		logError('GET_EMPLOYEE_LOOKUPS_FAIL', e?.message);
		return {
			titles: [],
			divisions: [],
			departments: []
		};
	}
}
