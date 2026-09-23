import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import sql from '$lib/server/db';

export const load: PageServerLoad = async () => {
	try {
		// Ambil seluruh master gerbang tol
		const gerbangTols = await sql`
			SELECT 
				id, 
				ruas, 
				asal, 
				tujuan, 
				tarif_gol_1, 
				tarif_gol_2_3, 
				tarif_gol_4_5, 
				created_at
			FROM master.m_gerbang_tol
			ORDER BY ruas ASC, asal ASC, tujuan ASC
		`;

		// Ambil daftar unik ruas untuk filter dropdown
		const ruasRows = await sql`
			SELECT DISTINCT ruas 
			FROM master.m_gerbang_tol 
			WHERE ruas IS NOT NULL AND trim(ruas) != '' 
			ORDER BY ruas ASC
		`;
		const ruasList = ruasRows.map(r => r.ruas as string);

		// Ambil set ID gerbang tol yang sedang dipakai di rute UJO
		const usedRows = await sql`
			SELECT DISTINCT gerbang_tol_id 
			FROM master.m_rute_ujo_tol
		`;
		const usedGateIds = usedRows.map(r => Number(r.gerbang_tol_id));

		// Kalkulasi statistik ringkas
		const totalGerbang = gerbangTols.length;
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
			ruasList,
			usedGateIds,
			stats: {
				totalGerbang,
				totalRuas,
				avgTarifGol23,
				maxTarif
			}
		};
	} catch (error) {
		console.error('Error loading master gerbang tol:', error);
		return {
			gerbangTols: [],
			ruasList: [],
			usedGateIds: [],
			stats: {
				totalGerbang: 0,
				totalRuas: 0,
				avgTarifGol23: 0,
				maxTarif: 0
			}
		};
	}
};

export const actions: Actions = {
	create: async ({ request }) => {
		const data = await request.formData();
		const ruas = (data.get('ruas') as string)?.trim();
		const asal = (data.get('asal') as string)?.trim();
		const tujuan = (data.get('tujuan') as string)?.trim();

		const tarif_gol_1 = Math.max(0, parseFloat(data.get('tarif_gol_1') as string) || 0);
		const tarif_gol_2_3 = Math.max(0, parseFloat(data.get('tarif_gol_2_3') as string) || 0);
		const tarif_gol_4_5 = Math.max(0, parseFloat(data.get('tarif_gol_4_5') as string) || 0);

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
					ruas, asal, tujuan, tarif_gol_1, tarif_gol_2_3, tarif_gol_4_5
				) VALUES (
					${ruas}, ${asal}, ${tujuan}, ${tarif_gol_1}, ${tarif_gol_2_3}, ${tarif_gol_4_5}
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
			// Cek duplikasi selain dirinya sendiri
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
					tarif_gol_4_5 = ${tarif_gol_4_5}
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
			// Proteksi relasi ke master.m_rute_ujo_tol
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
	}
};
