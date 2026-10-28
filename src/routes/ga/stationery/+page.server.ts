import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url }) => {
	try {
		const search = (url.searchParams.get('search') || '').trim().toLowerCase();
		const categoryFilter = url.searchParams.get('category') || 'All';
		const statusFilter = url.searchParams.get('status') || 'All';

		const [rawItems, rawRequests, rawRequestItems, rawGaPrs, rawGaPrLines, rawDepts] = await Promise.all([
			sql`
				SELECT 
					g.id,
					g.item_code,
					g.name,
					g.category,
					g.category_id,
					g.unit,
					g.stock_quantity,
					g.minimum_stock,
					g.material_id,
					COALESCE(g.unit_price_estimate, 0)::numeric as unit_price_estimate,
					(g.stock_quantity * COALESCE(g.unit_price_estimate, 0))::numeric as total_value,
					to_char(g.created_at, 'YYYY-MM-DD') as created_at,
					m.material_code as pms_code,
					m.spec as pms_spec,
					COALESCE(m.stock, 0)::numeric as pms_stock,
					COALESCE(m.standard_price, 0)::numeric as pms_price
				FROM ga.stationery_items g
				LEFT JOIN master.m_materials m ON m.id = g.material_id
				ORDER BY g.id ASC
			`,
			sql`
				SELECT 
					r.id,
					r.req_number,
					to_char(r.request_date, 'YYYY-MM-DD') as request_date,
					r.department,
					r.cost_center_code,
					r.requester_nik,
					r.requester_name,
					r.status,
					r.raw_status,
					r.status_desc,
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
			`,
			sql`
				SELECT 
					pr.id,
					pr.pr_number as "prNumber",
					to_char(pr.date, 'YYYY-MM-DD') as date,
					to_char(pr.required_date, 'YYYY-MM-DD') as "requiredDate",
					pr.department,
					pr.requested_by as "requestedBy",
					pr.status,
					COALESCE(pr.order_type, 'RO') as "orderType",
					pr.notes,
					COUNT(prl.id)::int as item_count,
					COALESCE(SUM(prl.qty_requested), 0)::numeric as total_qty,
					COALESCE(SUM(prl.qty_requested * COALESCE(m.standard_price, gsi.unit_price_estimate, 0)), 0)::numeric as total_estimate,
					bool_or(po.id IS NOT NULL) as has_po,
					COUNT(DISTINCT po.id)::int as po_count
				FROM procurement.purchase_request pr
				LEFT JOIN procurement.purchase_request_line prl ON prl.pr_id = pr.id
				LEFT JOIN master.m_materials m ON m.id = prl.item_id
				LEFT JOIN ga.stationery_items gsi ON gsi.material_id = m.id
				LEFT JOIN procurement.purchase_order_line pol ON pol.pr_line_id = prl.id
				LEFT JOIN procurement.purchase_order po ON po.id = pol.po_id
				WHERE pr.department ILIKE '%GA%' OR pr.department ILIKE '%UMUM%' OR pr.pr_number ILIKE '%-GA/%'
				GROUP BY pr.id, pr.pr_number, pr.date, pr.required_date, pr.department, pr.requested_by, pr.status, pr.order_type, pr.notes
				ORDER BY pr.date DESC, pr.id DESC
			`,
			sql`
				SELECT 
					prl.id,
					prl.pr_id as "prId",
					prl.item_id as "itemId",
					prl.qty_requested as "qtyRequested",
					prl.remarks,
					m.material_code as "materialCode",
					COALESCE(m.name, gsi.name) as "itemName",
					COALESCE(m.uom, gsi.unit, 'PCS') as unit,
					COALESCE(m.standard_price, gsi.unit_price_estimate, 0)::numeric as "unitPrice",
					(prl.qty_requested * COALESCE(m.standard_price, gsi.unit_price_estimate, 0))::numeric as "lineTotal",
					gsi.id as "gaItemId",
					COALESCE(gsi.stock_quantity, 0) as "currentStock",
					COALESCE(gsi.minimum_stock, 5) as "minimumStock"
				FROM procurement.purchase_request_line prl
				JOIN procurement.purchase_request pr ON pr.id = prl.pr_id
				LEFT JOIN master.m_materials m ON m.id = prl.item_id
				LEFT JOIN ga.stationery_items gsi ON gsi.material_id = m.id
				WHERE pr.department ILIKE '%GA%' OR pr.department ILIKE '%UMUM%' OR pr.pr_number ILIKE '%-GA/%'
				ORDER BY prl.id ASC
			`,
			sql`
				SELECT dept_code, dept_name, alias
				FROM master.m_dept
				WHERE active = 'Y'
				ORDER BY dept_name ASC
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

		// Group GA PR lines by PR ID
		const gaPrLinesMap = new Map<number, any[]>();
		for (const line of rawGaPrLines) {
			if (!gaPrLinesMap.has(line.prId)) {
				gaPrLinesMap.set(line.prId, []);
			}
			gaPrLinesMap.get(line.prId)!.push({
				...line,
				qtyRequested: parseFloat(line.qtyRequested || '0'),
				unitPrice: parseFloat(line.unitPrice || '0'),
				lineTotal: parseFloat(line.lineTotal || '0')
			});
		}

		const processedGaPrs = rawGaPrs.map((pr: any) => ({
			...pr,
			total_qty: parseFloat(pr.total_qty || '0'),
			total_estimate: parseFloat(pr.total_estimate || '0'),
			lines: gaPrLinesMap.get(pr.id) || []
		}));

		const processedItems = rawItems.map((i: any) => ({
			...i,
			unit_price_estimate: parseFloat(i.unit_price_estimate || '0'),
			total_value: parseFloat(i.total_value || '0'),
			isLowStock: i.stock_quantity <= i.minimum_stock
		}));

		// Stats
		const totalItemCount = processedItems.length;
		const lowStockCount = processedItems.filter((i) => i.isLowStock).length;
		const pendingRequestCount = processedRequests.filter((r) => r.status === 'SUBMITTED').length;
		const totalStockValuation = processedItems.reduce((acc, cur) => acc + cur.total_value, 0);

		// Budget Monitoring COMS Data (Target Bulanan & Tahunan)
		const budgetComs = {
			monthName: new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
			year: new Date().getFullYear(),
			categories: [
				{ key: 'ATK', label: 'ATK (Alat Tulis Kantor)', monthlyTarget: 3000000, yearlyTarget: 36000000, spentMonth: 0, spentYear: 0 },
				{ key: 'FORM', label: 'Formulir Operasional', monthlyTarget: 4000000, yearlyTarget: 48000000, spentMonth: 0, spentYear: 0 },
				{ key: 'TONNER', label: 'Toner & Tinta Printer', monthlyTarget: 2000000, yearlyTarget: 24000000, spentMonth: 0, spentYear: 0 },
				{ key: 'MATERAI', label: 'Materai Resmi 10.000', monthlyTarget: 1900000, yearlyTarget: 22800000, spentMonth: 0, spentYear: 0 },
				{ key: 'SANITASI_COVID', label: 'Sanitasi & Kebersihan Kantor', monthlyTarget: 1500000, yearlyTarget: 18000000, spentMonth: 0, spentYear: 0 }
			],
			totalMonthlyTarget: 12400000,
			totalYearlyTarget: 148800000,
			totalSpentMonth: 0,
			totalSpentYear: 0
		};

		// Hitung realisasi anggaran dari PR yang sudah APPROVED/PROCESSED/DELIVERED
		const currentMonth = new Date().getMonth() + 1;
		const currentYear = new Date().getFullYear();

		for (const pr of processedGaPrs) {
			if (['APPROVED', 'PROCESSED', 'DELIVERED', 'DONE'].includes(pr.status)) {
				const prDate = new Date(pr.date);
				const isThisYear = prDate.getFullYear() === currentYear;
				const isThisMonth = isThisYear && (prDate.getMonth() + 1) === currentMonth;

				if (isThisYear) {
					budgetComs.totalSpentYear += pr.total_estimate;
				}
				if (isThisMonth) {
					budgetComs.totalSpentMonth += pr.total_estimate;
				}

				// Per-line category allocation
				for (const line of pr.lines) {
					const gaItem = processedItems.find((it) => it.id === line.gaItemId);
					const catKey = gaItem?.category || 'ATK';
					const catEntry = budgetComs.categories.find((c) => c.key === catKey) || budgetComs.categories[0];

					if (isThisYear) catEntry.spentYear += line.lineTotal;
					if (isThisMonth) catEntry.spentMonth += line.lineTotal;
				}
			}
		}

		// Filtering Items
		let filteredItems = processedItems;
		if (search) {
			filteredItems = filteredItems.filter(
				(i: any) =>
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
			gaPrs: processedGaPrs,
			departments: rawDepts,
			budgetComs,
			stats: {
				totalItemCount,
				lowStockCount,
				pendingRequestCount,
				totalStockValuation,
				gaPrCount: processedGaPrs.length,
				pendingPrCount: processedGaPrs.filter((p) => p.status === 'PENDING').length
			}
		};
	} catch (err) {
		console.error('Error loading stationery data:', err);
		return {
			items: [],
			allItems: [],
			requests: [],
			gaPrs: [],
			departments: [],
			budgetComs: {
				monthName: '',
				year: new Date().getFullYear(),
				categories: [],
				totalMonthlyTarget: 0,
				totalYearlyTarget: 0,
				totalSpentMonth: 0,
				totalSpentYear: 0
			},
			stats: {
				totalItemCount: 0,
				lowStockCount: 0,
				pendingRequestCount: 0,
				totalStockValuation: 0,
				gaPrCount: 0,
				pendingPrCount: 0
			}
		};
	}
};

export const actions: Actions = {
	createItem: async ({ request }) => {
		const data = await request.formData();
		const name = data.get('name')?.toString().trim();
		const category = data.get('category')?.toString() || 'ATK';
		const unit = data.get('unit')?.toString().trim() || 'PCS';
		const stock_quantity = parseInt(data.get('stock_quantity')?.toString() || '0', 10);
		const minimum_stock = parseInt(data.get('minimum_stock')?.toString() || '5', 10);
		const unit_price_estimate = parseFloat(data.get('unit_price_estimate')?.toString() || '0');
		let item_code = data.get('item_code')?.toString().trim();

		if (!name) {
			return fail(400, { message: 'Nama barang wajib diisi!' });
		}

		if (!item_code) {
			const [seq] = await sql`SELECT count(*) + 1 as next_seq FROM ga.stationery_items`;
			item_code = `ATK-${String(seq.next_seq).padStart(3, '0')}`;
		}

		try {
			// Auto create in PMS material if not linked
			const [pmsMat] = await sql`
				INSERT INTO master.m_materials (
					material_code, type_code, name, uom, standard_price, is_active, created_by
				) VALUES (
					${'M-GA-' + Date.now().toString().slice(-6)}, 'T00009', ${name.toUpperCase()}, ${unit.toUpperCase()}, ${unit_price_estimate}, true, 'ga_user'
				) RETURNING id
			`;

			await sql`
				INSERT INTO ga.stationery_items (
					item_code, name, category, unit, stock_quantity, minimum_stock, unit_price_estimate, material_id
				) VALUES (
					${item_code}, ${name}, ${category}, ${unit}, ${stock_quantity}, ${minimum_stock}, ${unit_price_estimate}, ${pmsMat.id}
				)
			`;
			return { success: true, message: `Barang ${name} berhasil ditambahkan ke katalog ATK & sinkron ke PMS` };
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
			const [item] = await sql`
				UPDATE ga.stationery_items SET
					stock_quantity = stock_quantity + ${added_quantity}
				WHERE id = ${id}
				RETURNING name, material_id
			`;
			if (item && item.material_id) {
				await sql`
					UPDATE master.m_materials SET
						stock = COALESCE(stock, 0) + ${added_quantity},
						updated_at = NOW()
					WHERE id = ${item.material_id}
				`;
			}
			await sql`
				INSERT INTO ga.stationery_stock_in (
					item_id, item_name, qty, created_by, created_at
				) VALUES (
					${id}, ${item.name}, ${added_quantity}, 'GA Restock Manual', NOW()
				)
			`;
			return { success: true, message: `Stok ${item.name} berhasil ditambahkan sebanyak +${added_quantity}` };
		} catch (e: any) {
			console.error('Error restocking item:', e);
			return fail(500, { message: 'Gagal menambahkan stok barang' });
		}
	},

	// GA PR Generator: Diajukan langsung dari GA ke modul PMS
	createGaPr: async ({ request, locals }) => {
		const user = locals.user;
		const data = await request.formData();
		const requestedBy = data.get('requested_by')?.toString().trim() || user?.name || 'Staff GA';
		const department = data.get('department')?.toString().trim() || user?.department || 'GENERAL AFFAIRS';
		const createdBy = user?.payrollId || user?.name || 'SYSTEM';
		const orderType = data.get('order_type')?.toString().trim() || 'RO';
		const requiredDate = data.get('required_date')?.toString().trim() || null;
		const notes = data.get('notes')?.toString().trim() || 'Pengadaan Rutin Kebutuhan Kantor GA (COMS)';
		const itemsJson = data.get('items_json')?.toString();

		if (!itemsJson) {
			return fail(400, { message: 'Daftar item pengadaan wajib diisi!' });
		}

		let items: any[] = [];
		try {
			items = JSON.parse(itemsJson);
		} catch {
			return fail(400, { message: 'Format data item pengadaan tidak valid' });
		}

		if (items.length === 0) {
			return fail(400, { message: 'Pilih minimal 1 item barang untuk diajukan!' });
		}

		try {
			const now = new Date();
			const month = String(now.getMonth() + 1).padStart(2, '0');
			const year = String(now.getFullYear());

			// Generate sequential PR number for GA: [Seq]/[OrderType]/S-GA/[MM]/[YYYY]
			const [seqRow] = await sql`
				SELECT COUNT(*)::int as count 
				FROM procurement.purchase_request 
				WHERE EXTRACT(YEAR FROM date) = ${now.getFullYear()} 
				  AND EXTRACT(MONTH FROM date) = ${now.getMonth() + 1}
			`;
			const nextSeq = String(seqRow.count + 1).padStart(3, '0');
			const prNumber = `${nextSeq}/${orderType}/S-GA/${month}/${year}`;

			// Buat Header PR di procurement.purchase_request
			const [newPr] = await sql`
				INSERT INTO procurement.purchase_request (
					pr_number, date, department, requested_by, status, notes,
					required_date, order_type, category, created_by, created_at, updated_at
				) VALUES (
					${prNumber}, CURRENT_DATE, ${department}, ${requestedBy}, 'PENDING',
					${notes}, ${requiredDate ? requiredDate : null}, ${orderType}, 'SUPPORTING',
					${createdBy}, NOW(), NOW()
				)
				RETURNING id
			`;

			// Masukkan lines ke procurement.purchase_request_line
			for (const it of items) {
				let matId = it.material_id;
				// Jika belum terhubung ke material PMS, auto-create agar tidak error FK
				if (!matId) {
					const [newMat] = await sql`
						INSERT INTO master.m_materials (
							material_code, type_code, name, uom, standard_price, is_active, created_by
						) VALUES (
							${'M-GA-' + it.item_id}, 'T00009', ${it.item_name.toUpperCase()}, ${it.unit || 'PCS'}, ${it.unit_price || 0}, true, 'ga_sync'
						) RETURNING id
					`;
					matId = newMat.id;
					await sql`UPDATE ga.stationery_items SET material_id = ${matId} WHERE id = ${it.item_id}`;
				}

				await sql`
					INSERT INTO procurement.purchase_request_line (
						pr_id, item_id, qty_requested, remarks
					) VALUES (
						${newPr.id}, ${matId}, ${it.qty}, ${it.remarks || 'Kebutuhan GA COMS'}
					)
				`;
			}

			return {
				success: true,
				message: `Purchase Request GA ${prNumber} berhasil diterbitkan ke modul Procurement Management System (PMS)!`
			};
		} catch (e: any) {
			console.error('Error creating GA PR in PMS:', e);
			return fail(500, { message: e.message || 'Gagal menerbitkan Purchase Request ke PMS' });
		}
	},

	// 1-Click Stock-In: Konfirmasi penerimaan fisik barang dari PR PMS ke inventaris GA
	receiveGaPr: async ({ request }) => {
		const data = await request.formData();
		const prId = data.get('pr_id')?.toString();
		const receivedBy = data.get('received_by')?.toString().trim() || 'Tim GA Gudang';

		if (!prId) return fail(400, { message: 'ID PR tidak valid!' });

		try {
			// Ambil header PR
			const [pr] = await sql`
				SELECT id, pr_number, status 
				FROM procurement.purchase_request 
				WHERE id = ${prId}
			`;
			if (!pr) return fail(404, { message: 'Purchase Request tidak ditemukan!' });

			// Ambil baris detail PR
			const lines = await sql`
				SELECT 
					prl.id,
					prl.item_id,
					prl.qty_requested,
					m.name as item_name,
					m.uom,
					gsi.id as ga_item_id
				FROM procurement.purchase_request_line prl
				LEFT JOIN master.m_materials m ON m.id = prl.item_id
				LEFT JOIN ga.stationery_items gsi ON gsi.material_id = prl.item_id
				WHERE prl.pr_id = ${prId}
			`;

			let receivedItemsCount = 0;
			for (const line of lines) {
				const qty = parseFloat(line.qty_requested || '0');
				if (qty > 0 && line.ga_item_id) {
					// Tambah stok fisik di ga.stationery_items
					await sql`
						UPDATE ga.stationery_items 
						SET stock_quantity = stock_quantity + ${qty},
						    updated_at = NOW()
						WHERE id = ${line.ga_item_id}
					`;
					// Sinkronkan stok ke master.m_materials di PMS
					if (line.item_id) {
						await sql`
							UPDATE master.m_materials 
							SET stock = COALESCE(stock, 0) + ${qty},
							    updated_at = NOW()
							WHERE id = ${line.item_id}
						`;
					}
					// Catat log barang masuk di ga.stationery_stock_in
					await sql`
						INSERT INTO ga.stationery_stock_in (
							item_id, item_name, qty, created_by, created_at, pr_id, notes
						) VALUES (
							${line.ga_item_id}, ${line.item_name}, ${qty}, ${receivedBy}, NOW(), ${prId},
							${'Penerimaan Fisik dari PR ' + pr.pr_number}
						)
					`;
					receivedItemsCount++;
				}
			}

			// Update status PR menjadi DELIVERED
			await sql`
				UPDATE procurement.purchase_request 
				SET status = 'DELIVERED', updated_at = NOW() 
				WHERE id = ${prId}
			`;

			return {
				success: true,
				message: `Barang dari PR ${pr.pr_number} (${receivedItemsCount} item) telah diterima fisik dan stok gudang GA berhasil ditambah otomatis!`
			};
		} catch (e: any) {
			console.error('Error receiving GA PR goods:', e);
			return fail(500, { message: e.message || 'Gagal memproses penerimaan barang' });
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
			const items = await sql`
				SELECT 
					ri.item_id, 
					ri.quantity_approved,
					gsi.material_id 
				FROM ga.stationery_request_items ri
				LEFT JOIN ga.stationery_items gsi ON gsi.id = ri.item_id
				WHERE ri.request_id = ${id}
			`;

			for (const it of items) {
				if (it.item_id && it.quantity_approved > 0) {
					// Potong stok di GA
					await sql`
						UPDATE ga.stationery_items SET
							stock_quantity = GREATEST(0, stock_quantity - ${it.quantity_approved}),
							updated_at = NOW()
						WHERE id = ${it.item_id}
					`;
					// Potong stok di PMS
					if (it.material_id) {
						await sql`
							UPDATE master.m_materials SET
								stock = GREATEST(0, COALESCE(stock, 0) - ${it.quantity_approved}),
								updated_at = NOW()
							WHERE id = ${it.material_id}
						`;
					}
				}
			}

			await sql`
				UPDATE ga.stationery_requests SET
					status = 'DISTRIBUTED',
					updated_at = NOW()
				WHERE id = ${id}
			`;

			return { success: true, message: 'Barang ATK telah diserahkan & stok fisik gudang GA serta PMS otomatis terpotong' };
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
