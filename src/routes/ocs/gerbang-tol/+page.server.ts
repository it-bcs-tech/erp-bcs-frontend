import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import sql from '$lib/server/db';
import { env } from '$env/dynamic/private';

export const load: PageServerLoad = async () => {
	try {
		// 1. Ambil seluruh master tarif ruas gerbang tol
		const gerbangTols = await sql`
			SELECT 
				g.id, 
				g.ruas, 
				g.asal, 
				g.tujuan, 
				g.tarif_gol_1, 
				g.tarif_gol_2_3, 
				g.tarif_gol_4_5, 
				g.gerbang_asal_id,
				g.gerbang_tujuan_id,
				g.jarak_ruas_km,
				g.created_at,
				ta.nama_gerbang as nama_titik_asal,
				ta.km_pos as km_asal,
				tt.nama_gerbang as nama_titik_tujuan,
				tt.km_pos as km_tujuan
			FROM master.m_gerbang_tol g
			LEFT JOIN master.m_titik_gerbang_tol ta ON ta.id = g.gerbang_asal_id
			LEFT JOIN master.m_titik_gerbang_tol tt ON tt.id = g.gerbang_tujuan_id
			ORDER BY g.ruas ASC, g.asal ASC, g.tujuan ASC
		`;

		// 2. Ambil master titik fisik gerbang tol (peta & polygon)
		const titikGerbangList = await sql`
			SELECT 
				id,
				kode_gerbang,
				nama_gerbang,
				ruas_tol,
				km_pos,
				latitude,
				longitude,
				polygon_points,
				radius_m,
				is_active,
				created_at,
				updated_at
			FROM master.m_titik_gerbang_tol
			ORDER BY ruas_tol ASC, km_pos ASC NULLS LAST, nama_gerbang ASC
		`;

		// 3. Ambil daftar unik ruas untuk filter dropdown
		const ruasRows = await sql`
			SELECT DISTINCT ruas 
			FROM master.m_gerbang_tol 
			WHERE ruas IS NOT NULL AND trim(ruas) != '' 
			ORDER BY ruas ASC
		`;
		const ruasList = ruasRows.map((r: any) => r.ruas as string);

		// 4. Ambil set ID gerbang tol yang sedang dipakai di rute UJO
		const usedRows = await sql`
			SELECT DISTINCT gerbang_tol_id 
			FROM master.m_rute_ujo_tol
		`;
		const usedGateIds = usedRows.map((r: any) => Number(r.gerbang_tol_id));

		// 5. Kalkulasi statistik ringkas
		const totalGerbang = gerbangTols.length;
		const totalTitik = titikGerbangList.length;
		const totalRuas = ruasList.length;

		let sumGol23 = 0;
		let maxTarif = 0;
		for (const g of gerbangTols) {
			const t23 = Number(g.tarif_gol_2_3) || 0;
			const t45 = Number(g.tarif_gol_4_5) || 0;
			sumGol23 += t23;
			if (t45 > maxTarif) maxTarif = t45;
			if (t23 > maxTarif) maxTarif = t23;
		}
		const avgTarifGol23 = totalGerbang > 0 ? Math.round(sumGol23 / totalGerbang) : 0;

		return {
			gerbangTols: gerbangTols as any[],
			titikGerbangList: titikGerbangList as any[],
			ruasList,
			usedGateIds,
			googleMapsApiKey: env.GOOGLE_MAPS_API_KEY || '',
			stats: {
				totalGerbang,
				totalTitik,
				totalRuas,
				avgTarifGol23,
				maxTarif
			}
		};
	} catch (error) {
		console.error('Error loading master gerbang tol:', error);
		return {
			gerbangTols: [],
			titikGerbangList: [],
			ruasList: [],
			usedGateIds: [],
			googleMapsApiKey: env.GOOGLE_MAPS_API_KEY || '',
			stats: {
				totalGerbang: 0,
				totalTitik: 0,
				totalRuas: 0,
				avgTarifGol23: 0,
				maxTarif: 0
			}
		};
	}
};

export const actions: Actions = {
	// ==================== AKSI RUAS TARIF GERBANG TOL ====================
	create: async ({ request }) => {
		const data = await request.formData();
		const ruas = (data.get('ruas') as string)?.trim();
		const asal = (data.get('asal') as string)?.trim();
		const tujuan = (data.get('tujuan') as string)?.trim();

		const tarif_gol_1 = Math.max(0, parseFloat(data.get('tarif_gol_1') as string) || 0);
		const tarif_gol_2_3 = Math.max(0, parseFloat(data.get('tarif_gol_2_3') as string) || 0);
		const tarif_gol_4_5 = Math.max(0, parseFloat(data.get('tarif_gol_4_5') as string) || 0);

		const gerbang_asal_id = data.get('gerbang_asal_id') ? parseInt(data.get('gerbang_asal_id') as string, 10) : null;
		const gerbang_tujuan_id = data.get('gerbang_tujuan_id') ? parseInt(data.get('gerbang_tujuan_id') as string, 10) : null;
		const jarak_ruas_km = data.get('jarak_ruas_km') ? parseFloat(data.get('jarak_ruas_km') as string) : null;

		if (!ruas || !asal || !tujuan) {
			return fail(400, {
				action: 'create',
				message: 'Nama Ruas, Gerbang Asal, dan Gerbang Tujuan wajib diisi!'
			});
		}

		try {
			// Cek duplikasi ruas, asal, dan tujuan
			const duplicate = await sql`
				SELECT id FROM master.m_gerbang_tol 
				WHERE LOWER(ruas) = LOWER(${ruas}) 
				  AND LOWER(asal) = LOWER(${asal}) 
				  AND LOWER(tujuan) = LOWER(${tujuan})
				LIMIT 1
			`;

			if (duplicate.length > 0) {
				return fail(400, {
					action: 'create',
					message: `Gerbang tol untuk ${asal} → ${tujuan} pada ruas "${ruas}" sudah ada!`
				});
			}

			await sql`
				INSERT INTO master.m_gerbang_tol (
					ruas, asal, tujuan, tarif_gol_1, tarif_gol_2_3, tarif_gol_4_5,
					gerbang_asal_id, gerbang_tujuan_id, jarak_ruas_km
				) VALUES (
					${ruas}, ${asal}, ${tujuan}, ${tarif_gol_1}, ${tarif_gol_2_3}, ${tarif_gol_4_5},
					${gerbang_asal_id}, ${gerbang_tujuan_id}, ${jarak_ruas_km}
				)
			`;

			return { success: true, action: 'create', message: 'Gerbang tol baru berhasil ditambahkan.' };
		} catch (error: any) {
			console.error('Error creating gerbang tol:', error);
			return fail(500, {
				action: 'create',
				message: error.message || 'Gagal menyimpan gerbang tol baru.'
			});
		}
	},

	update: async ({ request }) => {
		const data = await request.formData();
		const id = parseInt(data.get('id') as string, 10);
		const ruas = (data.get('ruas') as string)?.trim();
		const asal = (data.get('asal') as string)?.trim();
		const tujuan = (data.get('tujuan') as string)?.trim();

		const tarif_gol_1 = Math.max(0, parseFloat(data.get('tarif_gol_1') as string) || 0);
		const tarif_gol_2_3 = Math.max(0, parseFloat(data.get('tarif_gol_2_3') as string) || 0);
		const tarif_gol_4_5 = Math.max(0, parseFloat(data.get('tarif_gol_4_5') as string) || 0);

		const gerbang_asal_id = data.get('gerbang_asal_id') ? parseInt(data.get('gerbang_asal_id') as string, 10) : null;
		const gerbang_tujuan_id = data.get('gerbang_tujuan_id') ? parseInt(data.get('gerbang_tujuan_id') as string, 10) : null;
		const jarak_ruas_km = data.get('jarak_ruas_km') ? parseFloat(data.get('jarak_ruas_km') as string) : null;

		if (!id || isNaN(id)) {
			return fail(400, { action: 'update', message: 'ID Gerbang Tol tidak valid!' });
		}

		if (!ruas || !asal || !tujuan) {
			return fail(400, {
				action: 'update',
				message: 'Nama Ruas, Gerbang Asal, dan Gerbang Tujuan wajib diisi!'
			});
		}

		try {
			const duplicate = await sql`
				SELECT id FROM master.m_gerbang_tol 
				WHERE LOWER(ruas) = LOWER(${ruas}) 
				  AND LOWER(asal) = LOWER(${asal}) 
				  AND LOWER(tujuan) = LOWER(${tujuan})
				  AND id != ${id}
				LIMIT 1
			`;

			if (duplicate.length > 0) {
				return fail(400, {
					action: 'update',
					message: `Gerbang tol lain untuk ${asal} → ${tujuan} pada ruas "${ruas}" sudah terdaftar!`
				});
			}

			const result = await sql`
				UPDATE master.m_gerbang_tol
				SET 
					ruas = ${ruas},
					asal = ${asal},
					tujuan = ${tujuan},
					tarif_gol_1 = ${tarif_gol_1},
					tarif_gol_2_3 = ${tarif_gol_2_3},
					tarif_gol_4_5 = ${tarif_gol_4_5},
					gerbang_asal_id = ${gerbang_asal_id},
					gerbang_tujuan_id = ${gerbang_tujuan_id},
					jarak_ruas_km = ${jarak_ruas_km}
				WHERE id = ${id}
				RETURNING id
			`;

			if (result.length === 0) {
				return fail(404, { action: 'update', message: 'Data gerbang tol tidak ditemukan.' });
			}

			return { success: true, action: 'update', message: 'Data gerbang tol berhasil diperbarui.' };
		} catch (error: any) {
			console.error('Error updating gerbang tol:', error);
			return fail(500, {
				action: 'update',
				message: error.message || 'Gagal memperbarui data gerbang tol.'
			});
		}
	},

	delete: async ({ request }) => {
		const data = await request.formData();
		const id = parseInt(data.get('id') as string, 10);

		if (!id || isNaN(id)) {
			return fail(400, { action: 'delete', message: 'ID Gerbang Tol tidak valid!' });
		}

		try {
			const usedCheck = await sql`
				SELECT COUNT(*) as count 
				FROM master.m_rute_ujo_tol 
				WHERE gerbang_tol_id = ${id}
			`;

			const count = parseInt(usedCheck[0].count, 10);
			if (count > 0) {
				return fail(400, {
					action: 'delete',
					message: `Tidak dapat menghapus: Gerbang tol ini terhubung dengan ${count} rute UJO aktif.`
				});
			}

			const deleted = await sql`
				DELETE FROM master.m_gerbang_tol 
				WHERE id = ${id} 
				RETURNING id
			`;

			if (deleted.length === 0) {
				return fail(404, { action: 'delete', message: 'Data gerbang tol tidak ditemukan.' });
			}

			return { success: true, action: 'delete', message: 'Gerbang tol berhasil dihapus.' };
		} catch (error: any) {
			console.error('Error deleting gerbang tol:', error);
			return fail(500, {
				action: 'delete',
				message: error.message || 'Gagal menghapus gerbang tol.'
			});
		}
	},

	// ==================== AKSI TITIK FISIK GERBANG TOL & GEOFENCE ====================
	createTitik: async ({ request }) => {
		const data = await request.formData();
		const kode_gerbang = (data.get('kode_gerbang') as string)?.trim().toUpperCase();
		const nama_gerbang = (data.get('nama_gerbang') as string)?.trim();
		const ruas_tol = (data.get('ruas_tol') as string)?.trim() || null;
		const km_pos = data.get('km_pos') ? parseFloat(data.get('km_pos') as string) : null;
		const latitude = parseFloat(data.get('latitude') as string);
		const longitude = parseFloat(data.get('longitude') as string);
		const radius_m = parseInt(data.get('radius_m') as string, 10) || 300;
		const polygon_points_raw = data.get('polygon_points') as string;

		if (!kode_gerbang || !nama_gerbang) {
			return fail(400, { action: 'createTitik', message: 'Kode Gerbang dan Nama Gerbang wajib diisi!' });
		}
		if (isNaN(latitude) || isNaN(longitude)) {
			return fail(400, { action: 'createTitik', message: 'Koordinat Latitude dan Longitude wajib ditentukan via peta!' });
		}

		let polygon_points = null;
		if (polygon_points_raw) {
			try {
				polygon_points = JSON.parse(polygon_points_raw);
			} catch (e) {
				console.warn('Invalid polygon points JSON:', e);
			}
		}

		try {
			await sql`
				INSERT INTO master.m_titik_gerbang_tol (
					kode_gerbang, nama_gerbang, ruas_tol, km_pos, latitude, longitude, radius_m, polygon_points, is_active
				) VALUES (
					${kode_gerbang}, ${nama_gerbang}, ${ruas_tol}, ${km_pos}, ${latitude}, ${longitude}, ${radius_m}, ${polygon_points ? JSON.stringify(polygon_points) : null}::jsonb, true
				)
			`;
			return { success: true, action: 'createTitik', message: `Titik gerbang tol "${nama_gerbang}" berhasil disimpan.` };
		} catch (error: any) {
			console.error('Error creating titik gerbang:', error);
			return fail(500, { action: 'createTitik', message: error.message || 'Gagal menyimpan titik gerbang tol.' });
		}
	},

	updateTitik: async ({ request }) => {
		const data = await request.formData();
		const id = parseInt(data.get('id') as string, 10);
		const kode_gerbang = (data.get('kode_gerbang') as string)?.trim().toUpperCase();
		const nama_gerbang = (data.get('nama_gerbang') as string)?.trim();
		const ruas_tol = (data.get('ruas_tol') as string)?.trim() || null;
		const km_pos = data.get('km_pos') ? parseFloat(data.get('km_pos') as string) : null;
		const latitude = parseFloat(data.get('latitude') as string);
		const longitude = parseFloat(data.get('longitude') as string);
		const radius_m = parseInt(data.get('radius_m') as string, 10) || 300;
		const polygon_points_raw = data.get('polygon_points') as string;
		const is_active = data.get('is_active') === 'true' || data.get('is_active') === '1';

		if (!id || isNaN(id)) {
			return fail(400, { action: 'updateTitik', message: 'ID Titik Gerbang tidak valid!' });
		}
		if (!kode_gerbang || !nama_gerbang) {
			return fail(400, { action: 'updateTitik', message: 'Kode Gerbang dan Nama Gerbang wajib diisi!' });
		}
		if (isNaN(latitude) || isNaN(longitude)) {
			return fail(400, { action: 'updateTitik', message: 'Koordinat Latitude dan Longitude tidak valid!' });
		}

		let polygon_points = null;
		if (polygon_points_raw) {
			try {
				polygon_points = JSON.parse(polygon_points_raw);
			} catch (e) {
				console.warn('Invalid polygon points JSON:', e);
			}
		}

		try {
			await sql`
				UPDATE master.m_titik_gerbang_tol
				SET 
					kode_gerbang = ${kode_gerbang},
					nama_gerbang = ${nama_gerbang},
					ruas_tol = ${ruas_tol},
					km_pos = ${km_pos},
					latitude = ${latitude},
					longitude = ${longitude},
					radius_m = ${radius_m},
					polygon_points = ${polygon_points ? JSON.stringify(polygon_points) : null}::jsonb,
					is_active = ${is_active},
					updated_at = CURRENT_TIMESTAMP
				WHERE id = ${id}
			`;
			return { success: true, action: 'updateTitik', message: `Data titik gerbang "${nama_gerbang}" berhasil diperbarui.` };
		} catch (error: any) {
			console.error('Error updating titik gerbang:', error);
			return fail(500, { action: 'updateTitik', message: error.message || 'Gagal memperbarui titik gerbang tol.' });
		}
	},

	deleteTitik: async ({ request }) => {
		const data = await request.formData();
		const id = parseInt(data.get('id') as string, 10);

		if (!id || isNaN(id)) {
			return fail(400, { action: 'deleteTitik', message: 'ID Titik Gerbang tidak valid!' });
		}

		try {
			// Cek apakah dipakai di ruas tol
			const usedCheck = await sql`
				SELECT COUNT(*) as count 
				FROM master.m_gerbang_tol 
				WHERE gerbang_asal_id = ${id} OR gerbang_tujuan_id = ${id}
			`;
			const count = parseInt(usedCheck[0].count, 10);
			if (count > 0) {
				return fail(400, {
					action: 'deleteTitik',
					message: `Tidak dapat menghapus: Titik gerbang ini terhubung dengan ${count} konfigurasi tarif ruas tol.`
				});
			}

			await sql`DELETE FROM master.m_titik_gerbang_tol WHERE id = ${id}`;
			return { success: true, action: 'deleteTitik', message: 'Titik gerbang tol berhasil dihapus.' };
		} catch (error: any) {
			console.error('Error deleting titik gerbang:', error);
			return fail(500, { action: 'deleteTitik', message: error.message || 'Gagal menghapus titik gerbang tol.' });
		}
	}
};
