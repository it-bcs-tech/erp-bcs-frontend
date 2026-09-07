import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url }) => {
	try {
		const search = (url.searchParams.get('search') || '').trim().toLowerCase();
		const categoryFilter = url.searchParams.get('category') || 'All';
		const statusFilter = url.searchParams.get('status') || 'All';

		const [rawItems, rawRequests, rawRequestItems] = await Promise.all([
			sql`
				SELECT 
					id,
					item_code,
					name,
					category,
					unit,
					stock_quantity,
					minimum_stock,
					COALESCE(unit_price_estimate, 0)::numeric as unit_price_estimate,
					(stock_quantity * COALESCE(unit_price_estimate, 0))::numeric as total_value,
					to_char(created_at, 'YYYY-MM-DD') as created_at
				FROM ga.stationery_items
				ORDER BY id ASC
			`,
			sql`
				SELECT 
					r.id,
					r.req_number,
					to_char(r.request_date, 'YYYY-MM-DD') as request_date,
					r.department,
					r.requester_name,
					r.status,
					r.approved_by,
					to_char(r.approved_at, 'YYYY-MM-DD HH24:MI') as approved_at,
					r.total_items_count,
					r.notes,
					to_char(r.created_at, 'YYYY-MM-DD HH24:MI') as created_at
				FROM ga.stationery_requests r
				ORDER BY r.request_date DESC, r.id DESC
			`,
			sql`
				SELECT 
					ri.id,
					ri.request_id,
					ri.item_id,
					ri.item_name,
					ri.quantity_requested,
					ri.quantity_approved,
					ri.unit,
					ri.notes
				FROM ga.stationery_request_items ri
				ORDER BY ri.id ASC
			`
		]);

		// Group request items by request_id
		const requestItemsMap = new Map<number, any[]>();
		for (const ri of rawRequestItems) {
			if (!requestItemsMap.has(ri.request_id)) {
				requestItemsMap.set(ri.request_id, []);
			}
			requestItemsMap.get(ri.request_id)!.push(ri);
		}

		const processedRequests = rawRequests.map((r: any) => ({
			...r,
			items: requestItemsMap.get(r.id) || []
		}));

		const processedItems = rawItems.map((i: any) => ({
			...i,
			unit_price_estimate: parseFloat(i.unit_price_estimate || '0'),
			total_value: parseFloat(i.total_value || '0'),
			isLowStock: i.stock_quantity <= i.minimum_stock
		}));

		// Stats
		const totalItemCount = processedItems.length;
		const lowStockCount = processedItems.filter(i => i.isLowStock).length;
		const pendingRequestCount = processedRequests.filter(r => r.status === 'SUBMITTED').length;
		const totalStockValuation = processedItems.reduce((acc, cur) => acc + cur.total_value, 0);

		// Filtering
		let filteredItems = processedItems;
		if (search) {
			filteredItems = filteredItems.filter((i: any) =>
				(i.name && i.name.toLowerCase().includes(search)) ||
				(i.item_code && i.item_code.toLowerCase().includes(search)) ||
				(i.category && i.category.toLowerCase().includes(search))
			);
		}
		if (categoryFilter !== 'All') {
			filteredItems = filteredItems.filter((i: any) => i.category === categoryFilter);
		}

		let filteredRequests = processedRequests;
		if (statusFilter !== 'All') {
			filteredRequests = filteredRequests.filter((r: any) => r.status === statusFilter);
		}

		return {
			items: filteredItems,
			allItems: processedItems,
			requests: filteredRequests,
			stats: {
				totalItemCount,
				lowStockCount,
				pendingRequestCount,
				totalStockValuation
			}
		};
	} catch (err) {
		console.error('Error loading stationery data:', err);
		return {
			items: [],
			allItems: [],
			requests: [],
			stats: {
				totalItemCount: 0,
				lowStockCount: 0,
				pendingRequestCount: 0,
				totalStockValuation: 0
			}
		};
	}
};

export const actions: Actions = {
	createItem: async ({ request }) => {
		const data = await request.formData();
		const name = data.get('name')?.toString().trim();
		const category = data.get('category')?.toString();
		const unit = data.get('unit')?.toString().trim();
		const stock_quantity = parseInt(data.get('stock_quantity')?.toString() || '0', 10);
		const minimum_stock = parseInt(data.get('minimum_stock')?.toString() || '5', 10);
		const unit_price_estimate = parseFloat(data.get('unit_price_estimate')?.toString() || '0');
		let item_code = data.get('item_code')?.toString().trim();

		if (!name || !category || !unit) {
			return fail(400, { message: 'Nama barang, kategori, dan satuan wajib diisi!' });
		}

		if (!item_code) {
			const [seq] = await sql`SELECT count(*) + 1 as next_seq FROM ga.stationery_items`;
			item_code = `ATK-${String(seq.next_seq).padStart(3, '0')}`;
		}

		try {
			await sql`
				INSERT INTO ga.stationery_items (
					item_code, name, category, unit, stock_quantity, minimum_stock, unit_price_estimate
				) VALUES (
					${item_code}, ${name}, ${category}, ${unit}, ${stock_quantity}, ${minimum_stock}, ${unit_price_estimate}
				)
			`;
			return { success: true, message: `Barang ${name} berhasil ditambahkan ke katalog ATK` };
		} catch (e: any) {
			console.error('Error creating stationery item:', e);
			return fail(500, { message: e.message || 'Gagal menambahkan barang ATK' });
		}
	},

	restockItem: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();
		const added_quantity = parseInt(data.get('added_quantity')?.toString() || '0', 10);

		if (!id || added_quantity <= 0) {
			return fail(400, { message: 'Jumlah barang masuk harus lebih dari 0!' });
		}

		try {
			await sql`
				UPDATE ga.stationery_items SET
					stock_quantity = stock_quantity + ${added_quantity}
				WHERE id = ${id}
			`;
			return { success: true, message: `Stok berhasil ditambahkan sebanyak +${added_quantity}` };
		} catch (e: any) {
			console.error('Error restocking item:', e);
			return fail(500, { message: 'Gagal menambahkan stok barang' });
		}
	},

	createRequest: async ({ request }) => {
		const data = await request.formData();
		const department = data.get('department')?.toString().trim();
		const requester_name = data.get('requester_name')?.toString().trim();
		const notes = data.get('notes')?.toString().trim() || null;
		const itemsJson = data.get('items_json')?.toString();

		if (!department || !requester_name || !itemsJson) {
			return fail(400, { message: 'Departemen, nama pemohon, dan daftar item wajib diisi!' });
		}

		let items: any[] = [];
		try {
			items = JSON.parse(itemsJson);
		} catch {
			return fail(400, { message: 'Format data item tidak valid' });
		}

		if (items.length === 0) {
			return fail(400, { message: 'Pilih minimal 1 item barang yang diajukan!' });
		}

		try {
			const year = new Date().getFullYear();
			const [seq] = await sql`SELECT count(*) + 1 as next_seq FROM ga.stationery_requests`;
			const pad = String(seq.next_seq).padStart(3, '0');
			const req_number = `REQ-ATK-${year}-${pad}`;

			const [newReq] = await sql`
				INSERT INTO ga.stationery_requests (
					req_number, request_date, department, requester_name, status,
					total_items_count, notes
				) VALUES (
					${req_number}, CURRENT_DATE, ${department}, ${requester_name}, 'SUBMITTED',
					${items.length}, ${notes}
				)
				RETURNING id
			`;

			for (const it of items) {
				await sql`
					INSERT INTO ga.stationery_request_items (
						request_id, item_id, item_name, quantity_requested, quantity_approved, unit, notes
					) VALUES (
						${newReq.id}, ${it.item_id}, ${it.item_name}, ${it.quantity}, ${it.quantity}, ${it.unit}, ${it.notes || null}
					)
				`;
			}

			return { success: true, message: `Pengajuan ATK ${req_number} berhasil dikirim` };
		} catch (e: any) {
			console.error('Error creating stationery request:', e);
			return fail(500, { message: 'Gagal membuat pengajuan ATK' });
		}
	},

	approveRequest: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();
		const approved_by = data.get('approved_by')?.toString().trim() || 'Lead General Affair';

		if (!id) return fail(400, { message: 'ID pengajuan tidak valid' });

		try {
			await sql`
				UPDATE ga.stationery_requests SET
					status = 'APPROVED',
					approved_by = ${approved_by},
					approved_at = NOW(),
					updated_at = NOW()
				WHERE id = ${id}
			`;
			return { success: true, message: 'Pengajuan ATK berhasil disetujui' };
		} catch (e: any) {
			console.error('Error approving request:', e);
			return fail(500, { message: 'Gagal menyetujui pengajuan ATK' });
		}
	},

	distributeRequest: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();

		if (!id) return fail(400, { message: 'ID pengajuan tidak valid' });

		try {
			// Get all items in this request
			const items = await sql`
				SELECT item_id, quantity_approved 
				FROM ga.stationery_request_items 
				WHERE request_id = ${id}
			`;

			// Deduct stock for each approved item
			for (const it of items) {
				if (it.item_id && it.quantity_approved > 0) {
					await sql`
						UPDATE ga.stationery_items SET
							stock_quantity = GREATEST(0, stock_quantity - ${it.quantity_approved})
						WHERE id = ${it.item_id}
					`;
				}
			}

			// Update request status to DISTRIBUTED
			await sql`
				UPDATE ga.stationery_requests SET
					status = 'DISTRIBUTED',
					updated_at = NOW()
				WHERE id = ${id}
			`;

			return { success: true, message: 'Barang ATK telah diserahkan & stok fisik gudang otomatis terpotong' };
		} catch (e: any) {
			console.error('Error distributing request:', e);
			return fail(500, { message: 'Gagal mencatat penyerahan barang ATK' });
		}
	},

	rejectRequest: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();
		const reason = data.get('reason')?.toString().trim() || 'Stok tidak mencukupi / tidak disetujui';

		if (!id) return fail(400, { message: 'ID pengajuan tidak valid' });

		try {
			await sql`
				UPDATE ga.stationery_requests SET
					status = 'REJECTED',
					notes = CONCAT(COALESCE(notes, ''), ' [DITOLAK: ', ${reason}::text, ']'),
					updated_at = NOW()
				WHERE id = ${id}
			`;
			return { success: true, message: 'Pengajuan ATK ditolak' };
		} catch (e: any) {
			console.error('Error rejecting request:', e);
			return fail(500, { message: 'Gagal menolak pengajuan ATK' });
		}
	},

	deleteItem: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();
		if (!id) return fail(400, { message: 'ID barang tidak valid' });

		try {
			await sql`DELETE FROM ga.stationery_items WHERE id = ${id}`;
			return { success: true, message: 'Barang berhasil dihapus dari katalog' };
		} catch (e: any) {
			console.error('Error deleting item:', e);
			return fail(500, { message: 'Gagal menghapus barang ATK' });
		}
	}
};
