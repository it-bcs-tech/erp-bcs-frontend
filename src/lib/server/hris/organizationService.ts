/**
 * organizationService.ts — Service layer untuk manajemen struktur organisasi HRIS
 * Mengelola data master Jabatan (m_title), Departemen (m_dept), Divisi (m_division), dan Direktorat (m_directorat).
 */
import sql from '$lib/server/db';

export interface TitleItem {
	code: string;
	title: string;
	jobDesc: string | null;
	active: string;
	employeeCount: number;
	createdAt: string | null;
	updatedAt: string | null;
}

export interface DepartmentItem {
	id: number;
	code: string;
	name: string;
	divCode: string | null;
	divName: string | null;
	active: string;
	employeeCount: number;
	createdAt: string | null;
	updatedAt: string | null;
}

export interface DivisionItem {
	id: number;
	code: string;
	name: string;
	dirCode: string | null;
	dirName: string | null;
	active: string;
	deptCount: number;
	employeeCount: number;
	createdAt: string | null;
	updatedAt: string | null;
}

export interface DirectorateItem {
	id: number;
	code: string;
	name: string;
	active: string;
	divCount: number;
	employeeCount: number;
	createdAt: string | null;
	updatedAt: string | null;
}

export interface OrganizationSettingsData {
	summary: {
		totalTitles: number;
		activeTitles: number;
		totalDepts: number;
		activeDepts: number;
		totalDivs: number;
		activeDivs: number;
		totalDirs: number;
		activeDirs: number;
	};
	nextCodes: {
		title: string;
		dept: string;
		div: string;
		dir: string;
	};
	titles: TitleItem[];
	departments: DepartmentItem[];
	divisions: DivisionItem[];
	directorates: DirectorateItem[];
	parentLookups: {
		directorates: Array<{ code: string; name: string }>;
		divisions: Array<{ code: string; name: string; dirCode?: string }>;
	};
}

/**
 * Generate kode otomatis berikutnya
 */
export async function generateNextCodes() {
	const [titles, depts, divs, dirs] = await Promise.all([
		sql<any[]>`SELECT title_code FROM master.m_title WHERE title_code ~ '^JB_[0-9]+$'`,
		sql<any[]>`SELECT dept_code FROM master.m_dept WHERE dept_code ~ '^D_[0-9]+$' AND (app IS NULL OR app != 'finance_system')`,
		sql<any[]>`SELECT div_code FROM master.m_division WHERE div_code ~ '^DV_[0-9]+$'`,
		sql<any[]>`SELECT dir_code FROM master.m_directorat WHERE dir_code ~ '^DR_[0-9]+$'`
	]);

	const titleNums = titles.map(t => parseInt(t.title_code.replace('JB_', ''), 10)).filter(n => !isNaN(n));
	const nextTitle = 'JB_' + String(Math.max(...titleNums, 0) + 1).padStart(3, '0');

	const deptNums = depts.map(d => parseInt(d.dept_code.replace('D_', ''), 10)).filter(n => !isNaN(n));
	const nextDept = 'D_' + String(Math.max(...deptNums, 0) + 1).padStart(2, '0');

	const divNums = divs.map(d => parseInt(d.div_code.replace('DV_', ''), 10)).filter(n => !isNaN(n));
	const nextDiv = 'DV_' + String(Math.max(...divNums, 0) + 1).padStart(2, '0');

	const dirNums = dirs.map(d => parseInt(d.dir_code.replace('DR_', ''), 10)).filter(n => !isNaN(n));
	const nextDir = 'DR_' + String(Math.max(...dirNums, 0) + 1).padStart(2, '0');

	return {
		title: nextTitle,
		dept: nextDept,
		div: nextDiv,
		dir: nextDir
	};
}

/**
 * Mengambil seluruh data organisasi terpadu
 */
export async function getOrganizationSettingsData(): Promise<OrganizationSettingsData> {
	const [
		titlesRaw,
		deptsRaw,
		divsRaw,
		dirsRaw,
		empTitleCounts,
		empDeptCounts,
		empDivCounts,
		empDirCounts,
		divDeptCounts,
		dirDivCounts,
		nextCodes
	] = await Promise.all([
		sql<any[]>`SELECT title_code, title, job_desc, active, created_at, updated_at FROM master.m_title ORDER BY title ASC`,
		sql<any[]>`
			SELECT id, dept_code, dept_name, div_code, active, created_at, updated_at 
			FROM master.m_dept 
			WHERE (app IS NULL OR app != 'finance_system')
			ORDER BY dept_name ASC
		`,
		sql<any[]>`SELECT id, div_code, div_name, dir_code, active, created_at, updated_at FROM master.m_division ORDER BY div_name ASC`,
		sql<any[]>`SELECT id, dir_code, dir_name, active, created_at, updated_at FROM master.m_directorat ORDER BY dir_name ASC`,
		sql<any[]>`SELECT title, COUNT(*)::int as cnt FROM master.m_karyawan WHERE aktif = 'Y' AND title IS NOT NULL GROUP BY title`,
		sql<any[]>`SELECT dept_id, COUNT(*)::int as cnt FROM master.m_karyawan WHERE aktif = 'Y' AND dept_id IS NOT NULL GROUP BY dept_id`,
		sql<any[]>`SELECT div_id, COUNT(*)::int as cnt FROM master.m_karyawan WHERE aktif = 'Y' AND div_id IS NOT NULL GROUP BY div_id`,
		sql<any[]>`SELECT dir_id, COUNT(*)::int as cnt FROM master.m_karyawan WHERE aktif = 'Y' AND dir_id IS NOT NULL GROUP BY dir_id`,
		sql<any[]>`
			SELECT div_code, COUNT(*)::int as cnt 
			FROM master.m_dept 
			WHERE div_code IS NOT NULL AND (app IS NULL OR app != 'finance_system')
			GROUP BY div_code
		`,
		sql<any[]>`SELECT dir_code, COUNT(*)::int as cnt FROM master.m_division WHERE dir_code IS NOT NULL GROUP BY dir_code`,
		generateNextCodes()
	]);

	// Peta hitungan karyawan
	const titleEmpMap = new Map<string, number>();
	empTitleCounts.forEach(r => titleEmpMap.set(r.title, r.cnt));

	const deptEmpMap = new Map<string, number>();
	empDeptCounts.forEach(r => deptEmpMap.set(r.dept_id, r.cnt));

	const divEmpMap = new Map<string, number>();
	empDivCounts.forEach(r => divEmpMap.set(r.div_id, r.cnt));

	const dirEmpMap = new Map<string, number>();
	empDirCounts.forEach(r => dirEmpMap.set(r.dir_id, r.cnt));

	// Peta relasi induk
	const divDeptMap = new Map<string, number>();
	divDeptCounts.forEach(r => divDeptMap.set(r.div_code, r.cnt));

	const dirDivMap = new Map<string, number>();
	dirDivCounts.forEach(r => dirDivMap.set(r.dir_code, r.cnt));

	const dirNameMap = new Map<string, string>();
	dirsRaw.forEach(d => dirNameMap.set(d.dir_code, d.dir_name || d.dir_code));

	const divNameMap = new Map<string, string>();
	divsRaw.forEach(v => divNameMap.set(v.div_code, v.div_name || v.div_code));

	const titles: TitleItem[] = titlesRaw.map(t => ({
		code: t.title_code,
		title: t.title || t.title_code,
		jobDesc: t.job_desc || null,
		active: t.active === 'Y' ? 'Y' : 'N',
		employeeCount: titleEmpMap.get(t.title_code) || 0,
		createdAt: t.created_at ? new Date(t.created_at).toISOString() : null,
		updatedAt: t.updated_at ? new Date(t.updated_at).toISOString() : null
	}));

	const departments: DepartmentItem[] = deptsRaw.map(d => ({
		id: d.id,
		code: d.dept_code || `D_${d.id}`,
		name: d.dept_name || d.dept_code,
		divCode: d.div_code || null,
		divName: d.div_code ? (divNameMap.get(d.div_code) || d.div_code) : null,
		active: d.active === 'Y' ? 'Y' : 'N',
		employeeCount: deptEmpMap.get(d.dept_code) || 0,
		createdAt: d.created_at ? new Date(d.created_at).toISOString() : null,
		updatedAt: d.updated_at ? new Date(d.updated_at).toISOString() : null
	}));

	const divisions: DivisionItem[] = divsRaw.map(v => ({
		id: v.id,
		code: v.div_code || `DV_${v.id}`,
		name: v.div_name || v.div_code,
		dirCode: v.dir_code || null,
		dirName: v.dir_code ? (dirNameMap.get(v.dir_code) || v.dir_code) : null,
		active: v.active === 'Y' ? 'Y' : 'N',
		deptCount: divDeptMap.get(v.div_code) || 0,
		employeeCount: divEmpMap.get(v.div_code) || 0,
		createdAt: v.created_at ? new Date(v.created_at).toISOString() : null,
		updatedAt: v.updated_at ? new Date(v.updated_at).toISOString() : null
	}));

	const directorates: DirectorateItem[] = dirsRaw.map(r => ({
		id: r.id,
		code: r.dir_code,
		name: r.dir_name || r.dir_code,
		active: r.active === 'Y' ? 'Y' : 'N',
		divCount: dirDivMap.get(r.dir_code) || 0,
		employeeCount: dirEmpMap.get(r.dir_code) || 0,
		createdAt: r.created_at ? new Date(r.created_at).toISOString() : null,
		updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : null
	}));

	const summary = {
		totalTitles: titles.length,
		activeTitles: titles.filter(t => t.active === 'Y').length,
		totalDepts: departments.length,
		activeDepts: departments.filter(d => d.active === 'Y').length,
		totalDivs: divisions.length,
		activeDivs: divisions.filter(v => v.active === 'Y').length,
		totalDirs: directorates.length,
		activeDirs: directorates.filter(r => r.active === 'Y').length
	};

	return {
		summary,
		nextCodes,
		titles,
		departments,
		divisions,
		directorates,
		parentLookups: {
			directorates: directorates.filter(d => d.active === 'Y').map(d => ({ code: d.code, name: d.name })),
			divisions: divisions.filter(v => v.active === 'Y').map(v => ({ code: v.code, name: v.name, dirCode: v.dirCode || undefined }))
		}
	};
}

// ----------------------------------------------------
// CRUD OPERASI: JABATAN (master.m_title)
// ----------------------------------------------------

export async function saveTitle(data: { code: string; title: string; jobDesc?: string; active?: string; isEdit?: boolean }) {
	const code = data.code?.trim().toUpperCase();
	const title = data.title?.trim();
	const jobDesc = data.jobDesc?.trim() || null;
	const active = data.active === 'N' ? 'N' : 'Y';

	if (!code) throw new Error('Kode Jabatan wajib diisi.');
	if (!title) throw new Error('Nama Jabatan / Posisi wajib diisi.');

	if (data.isEdit) {
		await sql`
			UPDATE master.m_title
			SET title = ${title},
				job_desc = ${jobDesc},
				active = ${active},
				updated_at = NOW(),
				updated_by = 'HRIS_Admin'
			WHERE title_code = ${code};
		`;
		return { success: true, message: `Jabatan ${title} (${code}) berhasil diperbarui.` };
	} else {
		// Periksa duplikasi kode
		const exists = await sql`SELECT title_code FROM master.m_title WHERE title_code = ${code}`;
		if (exists.length > 0) {
			throw new Error(`Kode Jabatan ${code} sudah digunakan.`);
		}

		await sql`
			INSERT INTO master.m_title (title_code, title, job_desc, active, created_at, created_by, updated_at)
			VALUES (${code}, ${title}, ${jobDesc}, ${active}, NOW(), 'HRIS_Admin', NOW());
		`;
		return { success: true, message: `Jabatan baru ${title} (${code}) berhasil ditambahkan.` };
	}
}

export async function toggleTitleStatus(code: string) {
	const row = await sql`SELECT title_code, title, active FROM master.m_title WHERE title_code = ${code}`;
	if (row.length === 0) throw new Error('Data jabatan tidak ditemukan.');

	const newStatus = row[0].active === 'Y' ? 'N' : 'Y';
	await sql`
		UPDATE master.m_title
		SET active = ${newStatus}, updated_at = NOW(), updated_by = 'HRIS_Admin'
		WHERE title_code = ${code};
	`;
	return { success: true, message: `Status jabatan ${row[0].title} diubah menjadi ${newStatus === 'Y' ? 'Aktif' : 'Nonaktif'}.` };
}

export async function deleteTitle(code: string) {
	// Proteksi integritas relasi: periksa apakah ada karyawan aktif yang memakai jabatan ini
	const usage = await sql`SELECT COUNT(*)::int as cnt FROM master.m_karyawan WHERE title = ${code} AND aktif = 'Y'`;
	if (usage[0].cnt > 0) {
		throw new Error(`Jabatan ${code} tidak dapat dihapus permanen karena masih digunakan oleh ${usage[0].cnt} karyawan aktif. Silakan gunakan opsi Nonaktifkan.`);
	}

	// Periksa apakah dipakai di m_atasan
	const atasanUsage = await sql`SELECT COUNT(*)::int as cnt FROM master.m_atasan WHERE title_atasan = ${code} OR title_bawahan = ${code}`;
	if (atasanUsage[0].cnt > 0) {
		await sql`DELETE FROM master.m_atasan WHERE title_atasan = ${code} OR title_bawahan = ${code}`;
	}

	await sql`DELETE FROM master.m_title WHERE title_code = ${code};`;
	return { success: true, message: `Jabatan ${code} berhasil dihapus permanen.` };
}

// ----------------------------------------------------
// CRUD OPERASI: DEPARTEMEN (master.m_dept)
// ----------------------------------------------------

export async function saveDepartment(data: { id?: number; code: string; name: string; divCode?: string; active?: string; isEdit?: boolean }) {
	const code = data.code?.trim().toUpperCase();
	const name = data.name?.trim();
	const divCode = data.divCode?.trim() || null;
	const active = data.active === 'N' ? 'N' : 'Y';

	if (!code) throw new Error('Kode Departemen wajib diisi.');
	if (!name) throw new Error('Nama Departemen wajib diisi.');

	if (data.isEdit) {
		await sql`
			UPDATE master.m_dept
			SET dept_code = ${code},
				dept_name = ${name},
				div_code = ${divCode},
				active = ${active},
				updated_at = NOW(),
				updated_by = 'HRIS_Admin'
			WHERE id = ${data.id} OR dept_code = ${code};
		`;
		return { success: true, message: `Departemen ${name} (${code}) berhasil diperbarui.` };
	} else {
		const exists = await sql`SELECT id FROM master.m_dept WHERE dept_code = ${code}`;
		if (exists.length > 0) {
			throw new Error(`Kode Departemen ${code} sudah digunakan.`);
		}

		const nextIdRow = await sql`SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM master.m_dept`;
		const nextId = nextIdRow[0].next_id;

		await sql`
			INSERT INTO master.m_dept (id, dept_code, dept_name, div_code, active, created_at, created_by, updated_at)
			VALUES (${nextId}, ${code}, ${name}, ${divCode}, ${active}, NOW(), 'HRIS_Admin', NOW());
		`;
		return { success: true, message: `Departemen ${name} (${code}) berhasil ditambahkan.` };
	}
}

export async function toggleDepartmentStatus(code: string) {
	const row = await sql`SELECT dept_code, dept_name, active FROM master.m_dept WHERE dept_code = ${code}`;
	if (row.length === 0) throw new Error('Data departemen tidak ditemukan.');

	const newStatus = row[0].active === 'Y' ? 'N' : 'Y';
	await sql`
		UPDATE master.m_dept
		SET active = ${newStatus}, updated_at = NOW(), updated_by = 'HRIS_Admin'
		WHERE dept_code = ${code};
	`;
	return { success: true, message: `Status departemen ${row[0].dept_name} diubah menjadi ${newStatus === 'Y' ? 'Aktif' : 'Nonaktif'}.` };
}

export async function deleteDepartment(code: string) {
	const usage = await sql`SELECT COUNT(*)::int as cnt FROM master.m_karyawan WHERE dept_id = ${code} AND aktif = 'Y'`;
	if (usage[0].cnt > 0) {
		throw new Error(`Departemen ${code} tidak dapat dihapus permanen karena masih digunakan oleh ${usage[0].cnt} karyawan aktif. Silakan gunakan opsi Nonaktifkan.`);
	}

	await sql`DELETE FROM master.m_dept WHERE dept_code = ${code};`;
	return { success: true, message: `Departemen ${code} berhasil dihapus permanen.` };
}

// ----------------------------------------------------
// CRUD OPERASI: DIVISI (master.m_division)
// ----------------------------------------------------

export async function saveDivision(data: { id?: number; code: string; name: string; dirCode?: string; active?: string; isEdit?: boolean }) {
	const code = data.code?.trim().toUpperCase();
	const name = data.name?.trim();
	const dirCode = data.dirCode?.trim() || null;
	const active = data.active === 'N' ? 'N' : 'Y';

	if (!code) throw new Error('Kode Divisi wajib diisi.');
	if (!name) throw new Error('Nama Divisi wajib diisi.');

	if (data.isEdit) {
		await sql`
			UPDATE master.m_division
			SET div_code = ${code},
				div_name = ${name},
				dir_code = ${dirCode},
				active = ${active},
				updated_at = NOW(),
				updated_by = 'HRIS_Admin'
			WHERE id = ${data.id} OR div_code = ${code};
		`;
		return { success: true, message: `Divisi ${name} (${code}) berhasil diperbarui.` };
	} else {
		const exists = await sql`SELECT id FROM master.m_division WHERE div_code = ${code}`;
		if (exists.length > 0) {
			throw new Error(`Kode Divisi ${code} sudah digunakan.`);
		}

		const nextIdRow = await sql`SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM master.m_division`;
		const nextId = nextIdRow[0].next_id;

		await sql`
			INSERT INTO master.m_division (id, div_code, div_name, dir_code, active, created_at, created_by, updated_at)
			VALUES (${nextId}, ${code}, ${name}, ${dirCode}, ${active}, NOW(), 'HRIS_Admin', NOW());
		`;
		return { success: true, message: `Divisi ${name} (${code}) berhasil ditambahkan.` };
	}
}

export async function toggleDivisionStatus(code: string) {
	const row = await sql`SELECT div_code, div_name, active FROM master.m_division WHERE div_code = ${code}`;
	if (row.length === 0) throw new Error('Data divisi tidak ditemukan.');

	const newStatus = row[0].active === 'Y' ? 'N' : 'Y';
	await sql`
		UPDATE master.m_division
		SET active = ${newStatus}, updated_at = NOW(), updated_by = 'HRIS_Admin'
		WHERE div_code = ${code};
	`;
	return { success: true, message: `Status divisi ${row[0].div_name} diubah menjadi ${newStatus === 'Y' ? 'Aktif' : 'Nonaktif'}.` };
}

export async function deleteDivision(code: string) {
	const usage = await sql`SELECT COUNT(*)::int as cnt FROM master.m_karyawan WHERE div_id = ${code} AND aktif = 'Y'`;
	if (usage[0].cnt > 0) {
		throw new Error(`Divisi ${code} tidak dapat dihapus permanen karena masih digunakan oleh ${usage[0].cnt} karyawan aktif. Silakan gunakan opsi Nonaktifkan.`);
	}

	const deptUsage = await sql`SELECT COUNT(*)::int as cnt FROM master.m_dept WHERE div_code = ${code} AND (app IS NULL OR app != 'finance_system')`;
	if (deptUsage[0].cnt > 0) {
		throw new Error(`Divisi ${code} masih menjadi induk bagi ${deptUsage[0].cnt} departemen. Pindahkan atau hapus departemen tersebut terlebih dahulu.`);
	}

	await sql`DELETE FROM master.m_division WHERE div_code = ${code};`;
	return { success: true, message: `Divisi ${code} berhasil dihapus permanen.` };
}

// ----------------------------------------------------
// CRUD OPERASI: DIREKTORAT (master.m_directorat)
// ----------------------------------------------------

export async function saveDirectorate(data: { id?: number; code: string; name: string; active?: string; isEdit?: boolean }) {
	const code = data.code?.trim().toUpperCase();
	const name = data.name?.trim();
	const active = data.active === 'N' ? 'N' : 'Y';

	if (!code) throw new Error('Kode Direktorat wajib diisi.');
	if (!name) throw new Error('Nama Direktorat wajib diisi.');

	if (data.isEdit) {
		await sql`
			UPDATE master.m_directorat
			SET dir_code = ${code},
				dir_name = ${name},
				active = ${active},
				updated_at = NOW(),
				updated_by = 'HRIS_Admin'
			WHERE id = ${data.id} OR dir_code = ${code};
		`;
		return { success: true, message: `Direktorat ${name} (${code}) berhasil diperbarui.` };
	} else {
		const exists = await sql`SELECT id FROM master.m_directorat WHERE dir_code = ${code}`;
		if (exists.length > 0) {
			throw new Error(`Kode Direktorat ${code} sudah digunakan.`);
		}

		await sql`
			INSERT INTO master.m_directorat (dir_code, dir_name, active, created_at, created_by, updated_at)
			VALUES (${code}, ${name}, ${active}, NOW(), 'HRIS_Admin', NOW());
		`;
		return { success: true, message: `Direktorat ${name} (${code}) berhasil ditambahkan.` };
	}
}

export async function toggleDirectorateStatus(code: string) {
	const row = await sql`SELECT dir_code, dir_name, active FROM master.m_directorat WHERE dir_code = ${code}`;
	if (row.length === 0) throw new Error('Data direktorat tidak ditemukan.');

	const newStatus = row[0].active === 'Y' ? 'N' : 'Y';
	await sql`
		UPDATE master.m_directorat
		SET active = ${newStatus}, updated_at = NOW(), updated_by = 'HRIS_Admin'
		WHERE dir_code = ${code};
	`;
	return { success: true, message: `Status direktorat ${row[0].dir_name} diubah menjadi ${newStatus === 'Y' ? 'Aktif' : 'Nonaktif'}.` };
}

export async function deleteDirectorate(code: string) {
	const usage = await sql`SELECT COUNT(*)::int as cnt FROM master.m_karyawan WHERE dir_id = ${code} AND aktif = 'Y'`;
	if (usage[0].cnt > 0) {
		throw new Error(`Direktorat ${code} tidak dapat dihapus permanen karena masih digunakan oleh ${usage[0].cnt} karyawan aktif. Silakan gunakan opsi Nonaktifkan.`);
	}

	const divUsage = await sql`SELECT COUNT(*)::int as cnt FROM master.m_division WHERE dir_code = ${code}`;
	if (divUsage[0].cnt > 0) {
		throw new Error(`Direktorat ${code} masih menjadi induk bagi ${divUsage[0].cnt} divisi. Pindahkan atau hapus divisi tersebut terlebih dahulu.`);
	}

	await sql`DELETE FROM master.m_directorat WHERE dir_code = ${code};`;
	return { success: true, message: `Direktorat ${code} berhasil dihapus permanen.` };
}
