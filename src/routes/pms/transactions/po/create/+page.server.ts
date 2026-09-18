import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';
import { fail, redirect } from '@sveltejs/kit';
import { formatAuditUser } from '$lib/server/auth';
import { generatePoNumber, getCategoryCode } from '$lib/utils/pmsNumbering';

export const load: PageServerLoad = async ({ url }) => {
	const prIdsParam = url.searchParams.get('pr_ids') || url.searchParams.get('pr_id');

	const parsedIds = prIdsParam
		? prIdsParam
			.split(',')
			.map(s => parseInt(s.trim()))
			.filter(n => !isNaN(n) && n > 0)
		: [];

	try {
		let initialPR: any = null;
		let initialPRs: any[] = [];
		let initialItems: any[] = [];

		if (parsedIds.length > 0) {
			const prList = await sql`
				SELECT id, pr_number, project_id, site_id, category, notes, department, requested_by
				FROM procurement.purchase_request 
				WHERE id IN ${sql(parsedIds)}
				ORDER BY id ASC
			`;
			if (prList.length > 0) {
				initialPR = prList[0];
				initialPRs = prList;

				initialItems = await sql`
					SELECT 
						prl.id as pr_line_id,
						prl.pr_id,
						pr.pr_number,
						prl.item_id,
						m.material_code,
						m.name,
						m.spec,
						m.brand,
						m.uom,
						m.stock,
						m.standard_price as unit_price,
						prl.qty_requested as qty_ordered,
						prl.remarks as remarks
					FROM procurement.purchase_request_line prl
					JOIN procurement.purchase_request pr ON pr.id = prl.pr_id
					JOIN master.m_materials m ON m.id = prl.item_id
					WHERE prl.pr_id IN ${sql(parsedIds)}
					ORDER BY prl.pr_id ASC, prl.id ASC
				`;
			}
		}

		const vendors = await sql`
			SELECT id, kode_vendor as kode_kustomer, nama_vendor as nama_kustomer, alias, COALESCE(alamat, '') as alamat 
			FROM master.m_vendor 
			WHERE is_active = true
			ORDER BY nama_vendor
		`;
		const projects = await sql`
			SELECT id, project_code, project_name, alias, cat_code, category 
			FROM master.m_project 
			WHERE is_active = true 
			ORDER BY project_name
		`;
		const sites = await sql`
			SELECT id, loc_code, loc_name, alias, contact_person, phone, address_1, city 
			FROM master.m_lokasi 
			ORDER BY loc_name
		`;

		// Hitung counter urut untuk bulan berjalan
		const now = new Date();
		const [seqRow] = await sql`
			SELECT COUNT(*) as count 
			FROM procurement.purchase_order 
			WHERE EXTRACT(YEAR FROM date) = ${now.getFullYear()} 
			  AND EXTRACT(MONTH FROM date) = ${now.getMonth() + 1}
		`;
		const nextCounter = parseInt(seqRow?.count || '0') + 1;
		const materials = await sql`
			SELECT DISTINCT 
				m.id, 
				m.material_code, 
				m.name, 
				m.spec, 
				m.brand, 
				m.part_no, 
				m.uom, 
				m.standard_price, 
				m.stock,
				pr.pr_number as ref_pr_number,
				prl.id as ref_pr_line_id,
				pr.id as ref_pr_id,
				prl.qty_requested as ref_qty_requested,
				prl.remarks as ref_remarks
			FROM master.m_materials m
			JOIN procurement.purchase_request_line prl ON prl.item_id = m.id
			JOIN procurement.purchase_request pr ON pr.id = prl.pr_id
			WHERE m.is_active = true 
			  AND (
				pr.status = 'OPEN' 
				OR pr.status = 'PENDING' 
				OR pr.status = 'DRAFT' 
				OR pr.status = 'APPROVED'
				${parsedIds.length > 0 ? sql`OR pr.id IN ${sql(parsedIds)}` : sql``}
			  )
			ORDER BY m.name
		`;

		const vendorPrices = await sql`
			SELECT material_id, vendor_id, price 
			FROM master.m_material_prices
		`;

		return {
			vendors,
			projects,
			sites,
			materials,
			nextCounter,
			initialPR,
			initialPRs,
			initialItems,
			vendorPrices
		};
	} catch (err: any) {
		if (err?.status === 302 || err?.status === 303 || err?.location) throw err;
		console.error('Error loading PO create dependencies:', err);
		return { vendors: [], projects: [], sites: [], materials: [], nextCounter: 1, initialPR: null, initialPRs: [], initialItems: [], vendorPrices: [] };
	}
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const formData = await request.formData();
		const rawDate = ((formData.get('date') as string) || '').trim();
		const date = rawDate && !isNaN(new Date(rawDate).getTime()) ? rawDate : new Date().toISOString().split('T')[0];
		const vendorId = ((formData.get('vendorId') as string) || '').trim();
		const createdBy = locals.user?.payrollId || locals.user?.name || 'SYSTEM';

		const rawProj = formData.get('projectId');
		const projectId = rawProj && !isNaN(parseInt(rawProj as string, 10)) && parseInt(rawProj as string, 10) > 0 
			? parseInt(rawProj as string, 10) 
			: null;

		const rawSite = formData.get('siteId');
		const siteId = rawSite && !isNaN(parseInt(rawSite as string, 10)) && parseInt(rawSite as string, 10) > 0 
			? parseInt(rawSite as string, 10) 
			: null;

		const paymentTerm = ((formData.get('paymentTerm') as string) || '30 Hari').trim();
		let poNumber = ((formData.get('poNumber') as string) || '').trim();

		const rawShipmentDate = ((formData.get('shipmentDate') as string) || '').trim();
		const shipmentDate = rawShipmentDate && !isNaN(new Date(rawShipmentDate).getTime()) ? rawShipmentDate : null;

		let shipmentLocation = ((formData.get('shipmentLocation') as string) || '').trim();
		const refNo = ((formData.get('refNo') as string) || '').trim();

		const rawDueDate = ((formData.get('dueDate') as string) || '').trim();
		const dueDate = rawDueDate && !isNaN(new Date(rawDueDate).getTime()) ? rawDueDate : null;

		const currency = ((formData.get('currency') as string) || 'IDR').trim();
		const discountPercent = Math.max(0, parseFloat((formData.get('discountPercent') as string) || '0') || 0);
		const vatPercent = Math.max(0, parseFloat((formData.get('vatPercent') as string) || '11') || 0);
		const notes = ((formData.get('notes') as string) || '').trim();
		const wrsNotes = ((formData.get('wrsNotes') as string) || '').trim();
		const prIdsRaw = ((formData.get('prIds') as string) || (formData.get('prId') as string) || '').trim();
		const submittedPrIds = prIdsRaw
			.split(',')
			.map(s => parseInt(s.trim(), 10))
			.filter(n => !isNaN(n) && n > 0);
		const itemsRaw = (formData.get('items') as string) || '[]';

		let items: any[] = [];
		try {
			items = JSON.parse(itemsRaw);
		} catch {
			items = [];
		}

		// Validasi Vendor UUID
		const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(vendorId);
		if (!vendorId || !isUuid) {
			return fail(400, { success: false, message: 'Vendor / Supplier wajib dipilih dengan benar dari daftar!' });
		}

		if (!Array.isArray(items) || items.length === 0) {
			return fail(400, { success: false, message: 'Minimal 1 item material harus dimasukkan!' });
		}

		// Kalkulasi total
		let subtotal = 0;
		for (const itm of items) {
			const itemSubtotal = (parseFloat(itm.qty) || 0) * (parseFloat(itm.unit_price) || 0);
			subtotal += itemSubtotal;
		}

		const discountAmount = subtotal * (discountPercent / 100);
		const netSubtotal = subtotal - discountAmount;
		const taxAmount = netSubtotal * (vatPercent / 100);
		const totalAmount = netSubtotal + taxAmount;

		try {
			let resolvedCategory = 'GENERAL';
			if (projectId) {
				const [proj] = await sql`SELECT category FROM master.m_project WHERE id = ${projectId}`;
				if (proj?.category) resolvedCategory = proj.category;
			}

			if (siteId && !shipmentLocation) {
				const [st] = await sql`SELECT loc_name, address_1, city FROM master.m_lokasi WHERE id = ${siteId}`;
				if (st) {
					shipmentLocation = st.address_1 ? `${st.loc_name} - ${st.address_1}, ${st.city || ''}` : st.loc_name;
				}
			}

			// Auto Generate PO Number jika kosong: [Counter]-[Kategori]/BCS-[Vendor Alias]/[Site/Project Alias]/[Romawi]/[YYYY]
			if (!poNumber) {
				const poDate = new Date(date);
				const [seqRow] = await sql`
					SELECT COUNT(*) as count 
					FROM procurement.purchase_order 
					WHERE EXTRACT(YEAR FROM date) = ${poDate.getFullYear()} 
					  AND EXTRACT(MONTH FROM date) = ${poDate.getMonth() + 1}
				`;
				let seq = parseInt(seqRow?.count || '0', 10) + 1;

				let catCode = 'GEN';
				let projectAlias: string | null = null;
				if (projectId) {
					const [proj] = await sql`SELECT alias, cat_code, category FROM master.m_project WHERE id = ${projectId}`;
					if (proj) {
						catCode = proj.cat_code || (proj.category ? getCategoryCode(proj.category) : 'GEN');
						projectAlias = proj.alias;
					}
				}

				let siteAlias: string | null = null;
				if (siteId) {
					const [st] = await sql`SELECT alias FROM master.m_lokasi WHERE id = ${siteId}`;
					if (st?.alias) siteAlias = st.alias;
				}
				const chosenAlias = siteAlias || projectAlias || 'GEN';

				let vendorAlias = 'VND';
				if (vendorId) {
					const [vnd] = await sql`SELECT alias, kode_vendor FROM master.m_vendor WHERE id = ${vendorId}`;
					if (vnd) {
						vendorAlias = vnd.alias || (vnd.kode_vendor ? vnd.kode_vendor.replace(/[^A-Za-z0-9]/g, '').slice(0, 3) : 'VND');
					}
				}

				poNumber = generatePoNumber({
					counter: seq,
					categoryCode: catCode,
					vendorAlias,
					siteAlias: chosenAlias,
					date: poDate
				});
			}

			// Proteksi keunikan po_number agar tidak pernah error duplicate key constraint
			let uniquePoNumber = poNumber;
			let dupCounter = 1;
			while (true) {
				const [existing] = await sql`SELECT id FROM procurement.purchase_order WHERE po_number = ${uniquePoNumber}`;
				if (!existing) break;
				uniquePoNumber = `${poNumber}-${dupCounter}`;
				dupCounter++;
			}

			const [po] = await sql`
				INSERT INTO procurement.purchase_order (
					po_number,
					payment_term,
					date,
					vendor_id,
					created_by,
					project_id,
					site_id,
					category,
					shipment_date,
					shipment_location,
					ref_no,
					due_date,
					currency,
					discount_percent,
					vat_percent,
					subtotal,
					tax_amount,
					total_amount,
					status,
					notes,
					wrs_notes
				) VALUES (
					${uniquePoNumber},
					${paymentTerm},
					${date},
					${vendorId},
					${createdBy},
					${projectId},
					${siteId},
					${resolvedCategory},
					${shipmentDate},
					${shipmentLocation},
					${refNo},
					${dueDate},
					${currency},
					${discountPercent},
					${vatPercent},
					${subtotal},
					${taxAmount},
					${totalAmount},
					'DRAFT',
					${notes},
					${wrsNotes}
				) RETURNING id
			`;

			for (const itm of items) {
				const matId = parseInt(itm.material_id, 10);
				if (isNaN(matId) || matId <= 0) continue;

				const qty = parseFloat(itm.qty) || 1;
				const unitPrice = parseFloat(itm.unit_price) || 0;
				const itemTotal = qty * unitPrice;

				let prLineId: number | null = itm.pr_line_id && !isNaN(parseInt(itm.pr_line_id, 10)) ? parseInt(itm.pr_line_id, 10) : null;
				if (prLineId) {
					const [validLine] = await sql`SELECT id FROM procurement.purchase_request_line WHERE id = ${prLineId}`;
					if (!validLine) prLineId = null;
				}

				await sql`
					INSERT INTO procurement.purchase_order_line (
						po_id,
						pr_line_id,
						item_id,
						qty_ordered,
						unit_price,
						tax_amount,
						total,
						remarks
					) VALUES (
						${po.id},
						${prLineId},
						${matId},
						${qty},
						${unitPrice},
						${itemTotal * (vatPercent / 100)},
						${itemTotal},
						${itm.remarks || null}
					)
				`;
			}

			// Update PR status for PRs that have materials in the final PO
			const activePrIds = new Set<number>();
			for (const itm of items) {
				if (itm.pr_id) {
					const pid = parseInt(itm.pr_id, 10);
					if (!isNaN(pid) && pid > 0) activePrIds.add(pid);
				}
			}
			// If items didn't have pr_id explicitly attached, fallback to submittedPrIds
			if (activePrIds.size === 0 && submittedPrIds.length > 0) {
				submittedPrIds.forEach(id => activePrIds.add(id));
			}

			if (activePrIds.size > 0) {
				const idsToUpdate = Array.from(activePrIds);
				await sql`UPDATE procurement.purchase_request SET status = 'PROCESSED', updated_at = NOW() WHERE id IN ${sql(idsToUpdate)}`;
			}
		} catch (err: any) {
			console.error('Error creating PO:', err);
			return fail(500, { success: false, message: err?.message || 'Gagal membuat Purchase Order di database' });
		}

		throw redirect(303, '/pms/transactions/po');
	}
};
