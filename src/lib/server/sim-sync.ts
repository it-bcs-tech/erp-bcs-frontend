import sql from '$lib/server/db';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { calculateExpiryGate, logDocumentAudit } from '$lib/server/dms';

export interface SaveDriverSimParams {
	driverId?: number | string | null;
	karyawanId?: number | string | null;
	driverName: string;
	simType: string; // 'SIM B2 UMUM' | 'SIM B2' | 'SIM B1 UMUM' | 'SIM B1' | 'SIM A' | 'SIM C'
	simNumber: string;
	expiryDate: string; // YYYY-MM-DD
	issueDate?: string | null;
	fileBuffer?: Buffer | null;
	fileExt?: string | null;
	base64Image?: string | null;
	updatedBy?: string;
}

/**
 * Menyimpan fisik SIM dan menyinkronkan data 3 arah:
 * 1. Storage uploads/dms & Arsip dms.documents (SIM_DRIVER)
 * 2. Operasional master.m_drivers
 * 3. Master HRIS master.m_karyawan
 */
export async function syncDriverSimToDb({
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
	updatedBy = 'Tim Operasional OCS / HRIS'
}: SaveDriverSimParams) {
	if ((!driverId && !karyawanId) || !simNumber || !expiryDate) {
		throw new Error('Identitas Karyawan/Driver, Nomor SIM, dan Tanggal Kedaluwarsa wajib diisi.');
	}

	let numericDriverId = driverId ? Number(driverId) : null;
	let numericKaryawanId = karyawanId ? Number(karyawanId) : null;

	// Jika driverId belum ada tapi karyawanId ada, cari di master.m_drivers
	if (!numericDriverId && numericKaryawanId) {
		const [drv] = await sql`SELECT id FROM master.m_drivers WHERE karyawan_id = ${numericKaryawanId} LIMIT 1`;
		if (drv) numericDriverId = Number(drv.id);
	}

	// Jika karyawanId belum ada tapi driverId ada, cari dari master.m_drivers
	if (!numericKaryawanId && numericDriverId && numericDriverId > 0) {
		const [drv] = await sql`SELECT karyawan_id FROM master.m_drivers WHERE id = ${numericDriverId} LIMIT 1`;
		if (drv) numericKaryawanId = Number(drv.karyawan_id);
	}

	// 1. Simpan Berkas Fisik jika ada
	let filePath: string | null = null;
	if (fileBuffer && fileExt) {
		const uploadDir = join(process.cwd(), 'uploads/dms');
		await mkdir(uploadDir, { recursive: true });
		const filename = `SIM_${Date.now()}_${randomUUID().substring(0, 6)}.${fileExt}`;
		await writeFile(join(uploadDir, filename), fileBuffer);
		filePath = filename;
	} else if (base64Image) {
		let cleanBase64 = base64Image;
		let ext = 'jpg';
		if (base64Image.includes(',')) {
			const parts = base64Image.split(',');
			cleanBase64 = parts[1];
			const match = parts[0].match(/:(.*?);/);
			if (match && match[1].includes('png')) ext = 'png';
			else if (match && match[1].includes('pdf')) ext = 'pdf';
		}
		const buffer = Buffer.from(cleanBase64, 'base64');
		const uploadDir = join(process.cwd(), 'uploads/dms');
		await mkdir(uploadDir, { recursive: true });
		const filename = `SIM_${Date.now()}_${randomUUID().substring(0, 6)}.${ext}`;
		await writeFile(join(uploadDir, filename), buffer);
		filePath = filename;
	}

	// 2. Format jenis SIM untuk master.m_drivers & master.m_karyawan
	let standardizedCategory = 'TRAILER';
	const upperType = simType.toUpperCase();
	if (upperType.includes('DUMP') || upperType.includes('DT')) standardizedCategory = 'DUMPTRUCK';
	else if (upperType.includes('SLAB') || upperType.includes('PROJECT')) standardizedCategory = 'PROJECT';

	// 3. Update master.m_drivers jika driver_id valid atau buat jika lisensi sopir berat
	if (numericDriverId && numericDriverId > 0) {
		await sql`
			UPDATE master.m_drivers
			SET 
				sim_type = ${simType},
				sim_expiry_date = ${expiryDate}::date,
				status = 'ACTIVE',
				updated_at = NOW()
			WHERE id = ${numericDriverId}
		`;
	} else if (numericKaryawanId && (upperType.includes('B2') || upperType.includes('B1') || upperType.includes('TRAILER') || upperType.includes('DUMP'))) {
		// Otomatis buat / link master.m_drivers
		const [newDrv] = await sql`
			INSERT INTO master.m_drivers (karyawan_id, sim_type, sim_expiry_date, category, status, created_at, updated_at)
			VALUES (${numericKaryawanId}, ${simType}, ${expiryDate}::date, ${standardizedCategory}, 'ACTIVE', NOW(), NOW())
			ON CONFLICT (karyawan_id) DO UPDATE
			SET sim_type = EXCLUDED.sim_type,
			    sim_expiry_date = EXCLUDED.sim_expiry_date,
			    status = 'ACTIVE',
			    updated_at = NOW()
			RETURNING id
		`;
		if (newDrv) numericDriverId = Number(newDrv.id);
	}

	// 4. Update master.m_karyawan jika ada karyawan_id
	if (numericKaryawanId) {
		if (upperType.includes('B2')) {
			await sql`
				UPDATE master.m_karyawan
				SET 
					no_sim_b2_umum = ${simNumber},
					no_sim_b2_umum_expiredate = ${expiryDate}::date,
					scan_sim_b2 = COALESCE(${filePath}, scan_sim_b2),
					last_updated = NOW()
				WHERE id = ${numericKaryawanId}
			`;
		} else if (upperType.includes('B1')) {
			await sql`
				UPDATE master.m_karyawan
				SET 
					no_sim_b1 = ${simNumber},
					no_sim_b1_expiredate = ${expiryDate},
					scan_sim_b1 = COALESCE(${filePath}, scan_sim_b1),
					last_updated = NOW()
				WHERE id = ${numericKaryawanId}
			`;
		} else if (upperType.includes('A')) {
			await sql`
				UPDATE master.m_karyawan
				SET 
					no_sim_a = ${simNumber},
					no_sim_a_expiredate = ${expiryDate}::date,
					scan_sim_a = COALESCE(${filePath}, scan_sim_a),
					last_updated = NOW()
				WHERE id = ${numericKaryawanId}
			`;
		} else if (upperType.includes('C')) {
			await sql`
				UPDATE master.m_karyawan
				SET 
					no_sim_c = ${simNumber},
					no_sim_c_expiredate = ${expiryDate}::date,
					last_updated = NOW()
				WHERE id = ${numericKaryawanId}
			`;
		}
	}

	// 5. Simpan / Perbarui di dms.documents (SIM_DRIVER)
	const [docTypeRow] = await sql`SELECT id FROM dms.m_doc_type WHERE code = 'SIM_DRIVER' LIMIT 1`;
	const docTypeId = docTypeRow?.id;

	const [categoryRow] = await sql`SELECT id FROM dms.m_doc_category WHERE code = 'LEGAL' OR name ILIKE '%legal%' LIMIT 1`;
	const categoryId = categoryRow?.id;

	// Periksa apakah dokumen SIM pengemudi ini sudah ada sebelumnya di DMS
	const existingDocs = await sql`
		SELECT id, file_path FROM dms.documents
		WHERE (
			(doc_type_id = ${docTypeId} AND employee_id = ${numericDriverId || numericKaryawanId}) OR
			(doc_type_id = ${docTypeId} AND metadata->>'driver_id' = ${String(numericDriverId || '')}) OR
			(doc_type_id = ${docTypeId} AND metadata->>'karyawan_id' = ${String(numericKaryawanId || '')})
		)
		LIMIT 1
	`;

	const gate = calculateExpiryGate(expiryDate);
	let documentId = '';

	if (existingDocs.length > 0) {
		documentId = existingDocs[0].id;
		await sql`
			UPDATE dms.documents
			SET 
				doc_number = ${simNumber},
				title = ${`SIM ${simType} Pengemudi - ${driverName}`},
				expiry_date = ${expiryDate}::date,
				file_path = COALESCE(${filePath}, file_path),
				status = ${gate.computedStatus},
				metadata = jsonb_set(
					COALESCE(metadata, '{}'::jsonb),
					'{sim_type}',
					to_jsonb(${simType}::text)
				),
				updated_at = NOW()
			WHERE id = ${documentId}
		`;
	} else if (docTypeId) {
		const [newDoc] = await sql`
			INSERT INTO dms.documents (
				doc_number,
				doc_type_id,
				category_id,
				title,
				entity_type,
				employee_id,
				issue_date,
				expiry_date,
				file_path,
				status,
				notes,
				metadata,
				created_at,
				updated_at
			) VALUES (
				${simNumber},
				${docTypeId},
				${categoryId || null},
				${`SIM ${simType} Pengemudi - ${driverName}`},
				'EMPLOYEE',
				${numericDriverId || numericKaryawanId},
				${issueDate ? sql`${issueDate}::date` : sql`CURRENT_DATE`},
				${expiryDate}::date,
				${filePath},
				${gate.computedStatus},
				'Dipindai & disinkronkan otomatis via AI Vision (OCS/HRIS)',
				${JSON.stringify({
					driver_id: numericDriverId,
					karyawan_id: numericKaryawanId,
					driver_name: driverName,
					sim_type: simType,
					scanned_by: updatedBy
				})}::jsonb,
				NOW(),
				NOW()
			)
			RETURNING id
		`;
		documentId = newDoc?.id;
	}

	if (documentId) {
		await logDocumentAudit({
			documentId,
			action: 'UPDATE',
			userId: updatedBy,
			userName: updatedBy,
			details: {
				action_desc: 'Perpanjangan / Pembaruan SIM via AI Vision OCS',
				sim_type: simType,
				sim_number: simNumber,
				expiry_date: expiryDate
			}
		}).catch(() => {});
	}

	return {
		success: true,
		message: `SIM ${simType} atas nama ${driverName} berhasil diperbarui & disinkronkan 3 arah (OCS, HRIS, DMS).`,
		filePath,
		documentId
	};
}
