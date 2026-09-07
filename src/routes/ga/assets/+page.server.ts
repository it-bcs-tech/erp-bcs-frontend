import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url }) => {
	try {
		const search = (url.searchParams.get('search') || '').trim().toLowerCase();
		const category = url.searchParams.get('category') || 'All';
		const location = url.searchParams.get('location') || 'All';
		const condition = url.searchParams.get('condition') || 'All';
		const status = url.searchParams.get('status') || 'All';

		const [rawAssets, rawMutations, employees] = await Promise.all([
			sql`
				SELECT 
					a.id,
					a.asset_code,
					a.name,
					a.category,
					a.brand_model,
					a.serial_number,
					to_char(a.acquisition_date, 'YYYY-MM-DD') as acquisition_date,
					COALESCE(a.acquisition_cost, 0)::numeric as acquisition_cost,
					COALESCE(a.economic_life_months, 60)::int as economic_life_months,
					COALESCE(a.salvage_value, 0)::numeric as salvage_value,
					a.location,
					a.room,
					a.pic_employee_id,
					a.pic_name,
					a.condition,
					a.status,
					a.barcode_qr,
					a.notes,
					to_char(a.created_at, 'YYYY-MM-DD HH24:MI') as created_at
				FROM ga.assets a
				ORDER BY a.id DESC
			`,
			sql`
				SELECT 
					m.id,
					m.asset_id,
					to_char(m.mutation_date, 'YYYY-MM-DD') as mutation_date,
					m.from_location,
					m.to_location,
					m.from_pic,
					m.to_pic,
					m.reason,
					m.approved_by,
					to_char(m.created_at, 'YYYY-MM-DD') as created_at
				FROM ga.asset_mutations m
				ORDER BY m.mutation_date DESC, m.id DESC
			`,
			sql`
				SELECT id, nama_karyawan, jabatan, lokasi
				FROM master.m_karyawan
				WHERE aktif = 'Y'
				ORDER BY nama_karyawan ASC
				LIMIT 100
			`
		]);

		// Group mutations by asset_id
		const mutationsMap = new Map<number, any[]>();
		for (const m of rawMutations) {
			if (!mutationsMap.has(m.asset_id)) {
				mutationsMap.set(m.asset_id, []);
			}
			mutationsMap.get(m.asset_id)!.push(m);
		}

		// Calculate Straight-Line Depreciation for each asset
		const today = new Date();
		const processedAssets = rawAssets.map((asset: any) => {
			const cost = parseFloat(asset.acquisition_cost || '0');
			const salvage = parseFloat(asset.salvage_value || '0');
			const months = parseInt(asset.economic_life_months || '60', 10);

			let elapsedMonths = 0;
			if (asset.acquisition_date) {
				const acqDate = new Date(asset.acquisition_date);
				elapsedMonths = Math.max(0, (today.getFullYear() - acqDate.getFullYear()) * 12 + (today.getMonth() - acqDate.getMonth()));
			}

			const depreciableAmount = Math.max(0, cost - salvage);
			const monthlyDepreciation = months > 0 ? depreciableAmount / months : 0;
			const accumulatedMonths = Math.min(elapsedMonths, months);
			const accumulatedDepreciation = accumulatedMonths * monthlyDepreciation;
			const bookValue = Math.max(salvage, cost - accumulatedDepreciation);
			const remainingMonths = Math.max(0, months - elapsedMonths);

			return {
				...asset,
				acquisition_cost: cost,
				salvage_value: salvage,
				economic_life_months: months,
				elapsedMonths,
				monthlyDepreciation,
				accumulatedDepreciation,
				bookValue,
				remainingMonths,
				mutations: mutationsMap.get(asset.id) || []
			};
		});

		// Calculate Totals
		const totalCost = processedAssets.reduce((acc, a) => acc + a.acquisition_cost, 0);
		const totalAccumulatedDepreciation = processedAssets.reduce((acc, a) => acc + a.accumulatedDepreciation, 0);
		const totalBookValue = processedAssets.reduce((acc, a) => acc + a.bookValue, 0);

		// Apply Filters in memory
		let filtered = processedAssets;
		if (search) {
			filtered = filtered.filter((a: any) =>
				(a.name && a.name.toLowerCase().includes(search)) ||
				(a.asset_code && a.asset_code.toLowerCase().includes(search)) ||
				(a.brand_model && a.brand_model.toLowerCase().includes(search)) ||
				(a.serial_number && a.serial_number.toLowerCase().includes(search)) ||
				(a.pic_name && a.pic_name.toLowerCase().includes(search))
			);
		}
		if (category !== 'All') {
			filtered = filtered.filter((a: any) => a.category === category);
		}
		if (location !== 'All') {
			filtered = filtered.filter((a: any) => a.location === location);
		}
		if (condition !== 'All') {
			filtered = filtered.filter((a: any) => a.condition === condition);
		}
		if (status !== 'All') {
			filtered = filtered.filter((a: any) => a.status === status);
		}

		return {
			assets: filtered,
			allAssetsCount: processedAssets.length,
			totals: {
				totalCost,
				totalAccumulatedDepreciation,
				totalBookValue,
				activeCount: processedAssets.filter(a => a.status === 'ACTIVE').length
			},
			employees: employees || []
		};
	} catch (err) {
		console.error('Error loading assets data:', err);
		return {
			assets: [],
			allAssetsCount: 0,
			totals: { totalCost: 0, totalAccumulatedDepreciation: 0, totalBookValue: 0, activeCount: 0 },
			employees: []
		};
	}
};

export const actions: Actions = {
	createAsset: async ({ request }) => {
		const data = await request.formData();
		const name = data.get('name')?.toString().trim();
		const category = data.get('category')?.toString();
		let asset_code = data.get('asset_code')?.toString().trim();
		const brand_model = data.get('brand_model')?.toString().trim() || null;
		const serial_number = data.get('serial_number')?.toString().trim() || null;
		const acquisition_date = data.get('acquisition_date')?.toString() || null;
		const acquisition_cost = parseFloat(data.get('acquisition_cost')?.toString() || '0');
		const economic_life_months = parseInt(data.get('economic_life_months')?.toString() || '60', 10);
		const salvage_value = parseFloat(data.get('salvage_value')?.toString() || '0');
		const location = data.get('location')?.toString().trim();
		const room = data.get('room')?.toString().trim() || null;
		const pic_name = data.get('pic_name')?.toString().trim() || null;
		const condition = data.get('condition')?.toString() || 'GOOD';
		const notes = data.get('notes')?.toString().trim() || null;

		if (!name || !category || !location) {
			return fail(400, { message: 'Nama aset, kategori, dan lokasi wajib diisi!' });
		}

		// Auto generate asset_code if empty
		if (!asset_code) {
			const year = new Date().getFullYear();
			const [seq] = await sql`SELECT count(*) + 1 as next_seq FROM ga.assets`;
			const pad = String(seq.next_seq).padStart(3, '0');
			asset_code = `AST-OFC-${year}-${pad}`;
		}

		try {
			await sql`
				INSERT INTO ga.assets (
					asset_code, name, category, brand_model, serial_number, acquisition_date,
					acquisition_cost, economic_life_months, salvage_value, location, room,
					pic_name, condition, status, barcode_qr, notes
				) VALUES (
					${asset_code}, ${name}, ${category}, ${brand_model}, ${serial_number}, ${acquisition_date},
					${acquisition_cost}, ${economic_life_months}, ${salvage_value}, ${location}, ${room},
					${pic_name}, ${condition}, 'ACTIVE', ${asset_code}, ${notes}
				)
			`;
			return { success: true, message: 'Aset baru berhasil ditambahkan' };
		} catch (e: any) {
			console.error('Error creating asset:', e);
			return fail(500, { message: e.message || 'Gagal menambahkan aset baru' });
		}
	},

	updateAsset: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();
		const name = data.get('name')?.toString().trim();
		const category = data.get('category')?.toString();
		const brand_model = data.get('brand_model')?.toString().trim() || null;
		const serial_number = data.get('serial_number')?.toString().trim() || null;
		const acquisition_date = data.get('acquisition_date')?.toString() || null;
		const acquisition_cost = parseFloat(data.get('acquisition_cost')?.toString() || '0');
		const economic_life_months = parseInt(data.get('economic_life_months')?.toString() || '60', 10);
		const salvage_value = parseFloat(data.get('salvage_value')?.toString() || '0');
		const location = data.get('location')?.toString().trim();
		const room = data.get('room')?.toString().trim() || null;
		const pic_name = data.get('pic_name')?.toString().trim() || null;
		const condition = data.get('condition')?.toString() || 'GOOD';
		const status = data.get('status')?.toString() || 'ACTIVE';
		const notes = data.get('notes')?.toString().trim() || null;

		if (!id || !name || !category || !location) {
			return fail(400, { message: 'Data yang dikirim tidak lengkap!' });
		}

		try {
			await sql`
				UPDATE ga.assets SET
					name = ${name},
					category = ${category},
					brand_model = ${brand_model},
					serial_number = ${serial_number},
					acquisition_date = ${acquisition_date},
					acquisition_cost = ${acquisition_cost},
					economic_life_months = ${economic_life_months},
					salvage_value = ${salvage_value},
					location = ${location},
					room = ${room},
					pic_name = ${pic_name},
					condition = ${condition},
					status = ${status},
					notes = ${notes},
					updated_at = NOW()
				WHERE id = ${id}
			`;
			return { success: true, message: 'Data aset berhasil diperbarui' };
		} catch (e: any) {
			console.error('Error updating asset:', e);
			return fail(500, { message: 'Gagal memperbarui data aset' });
		}
	},

	recordMutation: async ({ request }) => {
		const data = await request.formData();
		const asset_id = data.get('asset_id')?.toString();
		const mutation_date = data.get('mutation_date')?.toString() || new Date().toISOString().split('T')[0];
		const to_location = data.get('to_location')?.toString().trim();
		const to_room = data.get('to_room')?.toString().trim() || null;
		const to_pic = data.get('to_pic')?.toString().trim() || null;
		const reason = data.get('reason')?.toString().trim();
		const approved_by = data.get('approved_by')?.toString().trim() || 'Manager GA';

		if (!asset_id || !to_location || !reason) {
			return fail(400, { message: 'Lokasi tujuan dan alasan mutasi wajib diisi!' });
		}

		try {
			// Get current asset location & PIC
			const [cur] = await sql`SELECT location, room, pic_name FROM ga.assets WHERE id = ${asset_id}`;
			if (!cur) return fail(404, { message: 'Aset tidak ditemukan' });

			const from_location = cur.room ? `${cur.location} (${cur.room})` : cur.location;
			const target_location_str = to_room ? `${to_location} (${to_room})` : to_location;

			// Insert mutation log
			await sql`
				INSERT INTO ga.asset_mutations (
					asset_id, mutation_date, from_location, to_location,
					from_pic, to_pic, reason, approved_by
				) VALUES (
					${asset_id}, ${mutation_date}, ${from_location}, ${target_location_str},
					${cur.pic_name}, ${to_pic}, ${reason}, ${approved_by}
				)
			`;

			// Update asset record
			await sql`
				UPDATE ga.assets SET
					location = ${to_location},
					room = ${to_room},
					pic_name = ${to_pic || cur.pic_name},
					updated_at = NOW()
				WHERE id = ${asset_id}
			`;

			return { success: true, message: 'Mutasi aset berhasil dicatat' };
		} catch (e: any) {
			console.error('Error recording mutation:', e);
			return fail(500, { message: 'Gagal mencatat mutasi aset' });
		}
	},

	deleteAsset: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();
		if (!id) return fail(400, { message: 'ID aset tidak valid' });

		try {
			await sql`DELETE FROM ga.assets WHERE id = ${id}`;
			return { success: true, message: 'Aset berhasil dihapus' };
		} catch (e: any) {
			console.error('Error deleting asset:', e);
			return fail(500, { message: 'Gagal menghapus aset' });
		}
	}
};
