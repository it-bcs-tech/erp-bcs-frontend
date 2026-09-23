import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import sql from '$lib/server/db';

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
	const R = 6371; // km
	const dLat = (lat2 - lat1) * Math.PI / 180;
	const dLon = (lon2 - lon1) * Math.PI / 180;
	const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
			  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
			  Math.sin(dLon/2) * Math.sin(dLon/2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
	return R * c;
}

export const load: PageServerLoad = async () => {
	try {
		// Get Rute List with attached toll details
		const ruteList = await sql`
			SELECT 
				r.*,
				ori.nama_kustomer as origin_name,
				dest.nama_kustomer as destination_name,
				tu.nama_tipe as tipe_unit_name,
				tu.golongan_tol as tipe_unit_golongan_tol,
				COALESCE(
					(
						SELECT json_agg(
							json_build_object(
								'id', rut.id,
								'gerbang_tol_id', rut.gerbang_tol_id,
								'tarif', rut.tarif,
								'ruas', gt.ruas,
								'asal', gt.asal,
								'tujuan', gt.tujuan,
								'tarif_gol_1', gt.tarif_gol_1,
								'tarif_gol_2_3', gt.tarif_gol_2_3,
								'tarif_gol_4_5', gt.tarif_gol_4_5
							)
						)
						FROM master.m_rute_ujo_tol rut
						JOIN master.m_gerbang_tol gt ON gt.id = rut.gerbang_tol_id
						WHERE rut.rute_ujo_id = r.id
					), '[]'::json
				) as rincian_tol
			FROM master.m_rute_ujo r
			JOIN master.m_customer ori ON ori.id = r.origin_id
			JOIN master.m_customer dest ON dest.id = r.destination_id
			JOIN master.m_tipe_unit tu ON tu.id = r.tipe_unit_id
			ORDER BY r.created_at DESC
		`;

		// Get Data for Dropdowns
		const customers = await sql`SELECT id, nama_kustomer as name, latitude, longitude FROM master.m_customer WHERE is_active = true ORDER BY nama_kustomer ASC`;
		const tipeUnits = await sql`SELECT id, nama_tipe as name, golongan_tol FROM master.m_tipe_unit ORDER BY nama_tipe ASC`;
		const gerbangTols = await sql`SELECT id, ruas, asal, tujuan, tarif_gol_1, tarif_gol_2_3, tarif_gol_4_5 FROM master.m_gerbang_tol ORDER BY ruas ASC, asal ASC`;

		return {
			ruteList: ruteList as any[],
			customers: customers as any[],
			tipeUnits: tipeUnits as any[],
			gerbangTols: gerbangTols as any[]
		};
	} catch (error) {
		console.error("Error loading master rute:", error);
		return { ruteList: [], customers: [], tipeUnits: [], gerbangTols: [] };
	}
};

export const actions: Actions = {
	createRute: async ({ request }) => {
		const data = await request.formData();
		const origin_id = data.get('origin_id') as string;
		const destination_id = data.get('destination_id') as string;
		const tipe_unit_id = data.get('tipe_unit_id') as string;
		
		const input_jarak_km = parseFloat(data.get('jarak_km') as string);
		const input_biaya_solar = parseFloat(data.get('biaya_solar') as string);
		const input_liter_solar = parseFloat(data.get('liter_solar') as string);
		const biaya_tol = parseFloat(data.get('biaya_tol') as string) || 0;
		const biaya_bongkar_muat = parseFloat(data.get('biaya_bongkar_muat') as string) || 0;
		const uang_makan = parseFloat(data.get('uang_makan') as string) || 0;
		const retribusi = parseFloat(data.get('retribusi') as string) || 0;
		const ritase = parseFloat(data.get('ritase') as string) || 0;
		const komisi = parseFloat(data.get('komisi') as string) || 0;
		const biaya_lain = parseFloat(data.get('biaya_lain') as string) || 0;
		const tarif_customer = parseFloat(data.get('tarif_customer') as string) || 0;
		const google_distance_km = parseFloat(data.get('google_distance_km') as string) || 0;
		const rincian_tol_json = data.get('rincian_tol_json') as string || '[]';

		if (!origin_id || !destination_id || !tipe_unit_id) {
			return fail(400, { message: 'Origin, Destination, dan Tipe Unit harus diisi!' });
		}

		try {
			let jarak_km = 0;
			if (!isNaN(input_jarak_km) && input_jarak_km > 0) {
				jarak_km = input_jarak_km;
			} else if (google_distance_km > 0) {
				jarak_km = google_distance_km;
			} else {
				// Fetch Lat/Lon for automatic distance calculation
				const originData = await sql`SELECT latitude, longitude FROM master.m_customer WHERE id = ${origin_id}`;
				const destData = await sql`SELECT latitude, longitude FROM master.m_customer WHERE id = ${destination_id}`;
				
				if (originData.length === 0 || destData.length === 0) {
					return fail(400, { message: 'Lokasi Origin atau Destination tidak valid.' });
				}
				if (!originData[0].latitude || !destData[0].latitude) {
					return fail(400, { message: 'Gagal: Lokasi belum memiliki koordinat GPS di Master Customer, silakan isi Jarak Tempuh (KM) secara manual.' });
				}

				jarak_km = calculateDistance(
					parseFloat(originData[0].latitude), parseFloat(originData[0].longitude),
					parseFloat(destData[0].latitude), parseFloat(destData[0].longitude)
				);
			}

			// Fuel Consumption logic: allow manual typing, fallback to distance calculation
			const harga_solar_per_liter = 6800; // Fixed national price for Bio Solar
			let rasio = 3; // default 3 km/L
			let liter_solar = 0;
			let biaya_solar = 0;

			if (!isNaN(input_biaya_solar) && input_biaya_solar > 0) {
				biaya_solar = input_biaya_solar;
				liter_solar = (!isNaN(input_liter_solar) && input_liter_solar > 0)
					? input_liter_solar
					: Math.round((biaya_solar / harga_solar_per_liter) * 10) / 10;
			} else if (!isNaN(input_liter_solar) && input_liter_solar > 0) {
				liter_solar = input_liter_solar;
				biaya_solar = Math.round(liter_solar * harga_solar_per_liter);
			} else {
				liter_solar = Math.round((jarak_km / rasio) * 10) / 10;
				biaya_solar = Math.round(liter_solar * harga_solar_per_liter);
			}

			const total_ujo = biaya_solar + biaya_tol + biaya_bongkar_muat + uang_makan + retribusi + ritase + komisi + biaya_lain;

			const insertedRute = await sql`
				INSERT INTO master.m_rute_ujo (
					origin_id, destination_id, tipe_unit_id,
					jarak_km, liter_solar, harga_solar_per_liter, biaya_solar,
					biaya_tol, biaya_bongkar_muat, uang_makan, retribusi,
					ritase, komisi, biaya_lain, total_ujo, tarif_customer
				) VALUES (
					${origin_id}, ${destination_id}, ${tipe_unit_id},
					${jarak_km}, ${liter_solar}, ${harga_solar_per_liter}, ${biaya_solar},
					${biaya_tol}, ${biaya_bongkar_muat}, ${uang_makan}, ${retribusi},
					${ritase}, ${komisi}, ${biaya_lain}, ${total_ujo}, ${tarif_customer}
				) RETURNING id
			`;
			
			const rute_ujo_id = insertedRute[0].id;

			// Insert toll breakdown if any
			if (rincian_tol_json && rincian_tol_json !== '[]') {
				try {
					const rincian = JSON.parse(rincian_tol_json);
					if (Array.isArray(rincian) && rincian.length > 0) {
						const tollInserts = rincian.map((t: any) => ({
							rute_ujo_id: rute_ujo_id,
							gerbang_tol_id: t.gerbang_tol_id,
							tarif: t.tarif
						}));
						await sql`INSERT INTO master.m_rute_ujo_tol ${sql(tollInserts)}`;
					}
				} catch (e) {
					console.error("Failed parsing rincian_tol_json", e);
				}
			}

			return { success: true, message: 'Master Rute & UJO berhasil ditambahkan!' };
		} catch (e: any) {
			console.error("Create Rute error:", e);
			if (e.code === '23505') {
				return fail(400, { message: 'Rute ini sudah ada untuk Tipe Unit tersebut.' });
			}
			return fail(500, { error: e.message || 'Gagal menyimpan data.' });
		}
	},

	updateRute: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id') as string;
		const origin_id = data.get('origin_id') as string;
		const destination_id = data.get('destination_id') as string;
		const tipe_unit_id = data.get('tipe_unit_id') as string;
		
		const input_jarak_km = parseFloat(data.get('jarak_km') as string);
		const input_biaya_solar = parseFloat(data.get('biaya_solar') as string);
		const input_liter_solar = parseFloat(data.get('liter_solar') as string);
		const biaya_tol = parseFloat(data.get('biaya_tol') as string) || 0;
		const biaya_bongkar_muat = parseFloat(data.get('biaya_bongkar_muat') as string) || 0;
		const uang_makan = parseFloat(data.get('uang_makan') as string) || 0;
		const retribusi = parseFloat(data.get('retribusi') as string) || 0;
		const ritase = parseFloat(data.get('ritase') as string) || 0;
		const komisi = parseFloat(data.get('komisi') as string) || 0;
		const biaya_lain = parseFloat(data.get('biaya_lain') as string) || 0;
		const tarif_customer = parseFloat(data.get('tarif_customer') as string) || 0;
		const google_distance_km = parseFloat(data.get('google_distance_km') as string) || 0;
		const rincian_tol_json = data.get('rincian_tol_json') as string || '[]';

		if (!id || !origin_id || !destination_id || !tipe_unit_id) {
			return fail(400, { message: 'ID, Origin, Destination, dan Tipe Unit harus diisi!' });
		}

		try {
			let jarak_km = 0;
			if (!isNaN(input_jarak_km) && input_jarak_km > 0) {
				jarak_km = input_jarak_km;
			} else if (google_distance_km > 0) {
				jarak_km = google_distance_km;
			} else {
				// Fetch Lat/Lon for distance calculation
				const originData = await sql`SELECT latitude, longitude FROM master.m_customer WHERE id = ${origin_id}`;
				const destData = await sql`SELECT latitude, longitude FROM master.m_customer WHERE id = ${destination_id}`;
				
				if (originData.length === 0 || destData.length === 0) {
					return fail(400, { message: 'Lokasi Origin atau Destination tidak valid.' });
				}
				if (!originData[0].latitude || !destData[0].latitude) {
					return fail(400, { message: 'Gagal: Lokasi belum memiliki koordinat GPS di Master Customer, silakan isi Jarak Tempuh (KM) secara manual.' });
				}

				jarak_km = calculateDistance(
					parseFloat(originData[0].latitude), parseFloat(originData[0].longitude),
					parseFloat(destData[0].latitude), parseFloat(destData[0].longitude)
				);
			}

			// Fuel Consumption logic: allow manual typing, fallback to distance calculation
			const harga_solar_per_liter = 6800; // Fixed national price for Bio Solar
			let rasio = 3; // default 3 km/L
			let liter_solar = 0;
			let biaya_solar = 0;

			if (!isNaN(input_biaya_solar) && input_biaya_solar > 0) {
				biaya_solar = input_biaya_solar;
				liter_solar = (!isNaN(input_liter_solar) && input_liter_solar > 0)
					? input_liter_solar
					: Math.round((biaya_solar / harga_solar_per_liter) * 10) / 10;
			} else if (!isNaN(input_liter_solar) && input_liter_solar > 0) {
				liter_solar = input_liter_solar;
				biaya_solar = Math.round(liter_solar * harga_solar_per_liter);
			} else {
				liter_solar = Math.round((jarak_km / rasio) * 10) / 10;
				biaya_solar = Math.round(liter_solar * harga_solar_per_liter);
			}

			const total_ujo = biaya_solar + biaya_tol + biaya_bongkar_muat + uang_makan + retribusi + ritase + komisi + biaya_lain;

			await sql`
				UPDATE master.m_rute_ujo SET
					origin_id = ${origin_id},
					destination_id = ${destination_id},
					tipe_unit_id = ${tipe_unit_id},
					jarak_km = ${jarak_km},
					liter_solar = ${liter_solar},
					harga_solar_per_liter = ${harga_solar_per_liter},
					biaya_solar = ${biaya_solar},
					biaya_tol = ${biaya_tol},
					biaya_bongkar_muat = ${biaya_bongkar_muat},
					uang_makan = ${uang_makan},
					retribusi = ${retribusi},
					ritase = ${ritase},
					komisi = ${komisi},
					biaya_lain = ${biaya_lain},
					total_ujo = ${total_ujo},
					tarif_customer = ${tarif_customer}
				WHERE id = ${id}
			`;

			// Replace toll breakdown
			await sql`DELETE FROM master.m_rute_ujo_tol WHERE rute_ujo_id = ${id}`;

			if (rincian_tol_json && rincian_tol_json !== '[]') {
				try {
					const rincian = JSON.parse(rincian_tol_json);
					if (Array.isArray(rincian) && rincian.length > 0) {
						const tollInserts = rincian.map((t: any) => ({
							rute_ujo_id: parseInt(id, 10),
							gerbang_tol_id: t.gerbang_tol_id,
							tarif: t.tarif
						}));
						await sql`INSERT INTO master.m_rute_ujo_tol ${sql(tollInserts)}`;
					}
				} catch (e) {
					console.error("Failed parsing rincian_tol_json in update", e);
				}
			}

			return { success: true, message: 'Master Rute & UJO berhasil diperbarui!' };
		} catch (e: any) {
			console.error("Update Rute error:", e);
			if (e.code === '23505') {
				return fail(400, { message: 'Rute ini sudah ada untuk Tipe Unit tersebut.' });
			}
			return fail(500, { error: e.message || 'Gagal memperbarui data rute.' });
		}
	}
};
