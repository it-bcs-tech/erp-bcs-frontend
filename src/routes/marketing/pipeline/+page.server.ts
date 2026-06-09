import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';

const sql = postgres(env.DATABASE_URL || 'postgres://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db');

export const load: PageServerLoad = async () => {
	try {
		const deals = await sql`
			SELECT id, company_name, contact_person, phone, project_category, 
			       estimated_tonnage, estimated_value, stage, expected_date, notes,
			       loss_reason, is_converted 
			FROM marketing.deals
			ORDER BY created_at DESC
		`;
		
		const readyCountQuery = await sql`
			SELECT COUNT(*) FROM fleet.unit 
			WHERE current_state = 'AT_POOL' AND is_active = true
		`;
		const availableUnits = parseInt(readyCountQuery[0].count) || 0;

		const projects = await sql`
			SELECT id, project_name, category 
			FROM master.m_project 
			WHERE is_active = true 
			ORDER BY project_name ASC
		`;

		const activities = await sql`
			SELECT * FROM marketing.deal_activities 
			ORDER BY activity_date DESC
		`;

		return { 
			deals: deals as any[],
			projects: projects as any[],
			availableUnits,
			activities: activities as any[]
		};
	} catch (error) {
		console.error("Error loading pipeline:", error);
		return { deals: [], projects: [] };
	}
};

export const actions: Actions = {
	createDeal: async ({ request }) => {
		const data = await request.formData();
		const company_name = data.get('company_name') as string;
		const contact_person = data.get('contact_person') as string;
		const phone = data.get('phone') as string;
		const project_category = data.get('project_category') as string;
		const expected_date = data.get('expected_date') as string;
		const notes = data.get('notes') as string;

		if (!company_name || !project_category) {
			return fail(400, { missing: true, message: 'Nama perusahaan dan kategori wajib diisi.' });
		}

		try {
			const today = new Date();
			const yyyymm = today.toISOString().substring(0,7).replace('-', '');
			const counterQuery = await sql`SELECT count(*) FROM marketing.deals WHERE id LIKE ${'DEAL-' + yyyymm + '-%'}`;
			const count = parseInt(counterQuery[0].count) + 1;
			const dealId = `DEAL-${yyyymm}-${count.toString().padStart(3, '0')}`;

			await sql`
				INSERT INTO marketing.deals (
					id, company_name, contact_person, phone, project_category,
					expected_date, notes
				) VALUES (
					${dealId}, ${company_name}, ${contact_person || null}, ${phone || null}, ${project_category},
					${expected_date || null}, ${notes || null}
				)
			`;
			return { success: true, message: 'Deal berhasil dibuat!' };
		} catch (e: any) {
			console.error("Create deal error:", e);
			return fail(500, { error: e.message || 'Gagal membuat deal.' });
		}
	},

	moveStage: async ({ request }) => {
		const data = await request.formData();
		const dealId = data.get('dealId') as string;
		const newStage = data.get('newStage') as string;
		
		const estimated_tonnage = data.has('estimated_tonnage') ? parseFloat(data.get('estimated_tonnage') as string) : null;
		const estimated_value = data.has('estimated_value') ? parseFloat(data.get('estimated_value') as string) : null;
		const notes = data.get('notes') as string | null;
		const loss_reason = data.get('loss_reason') as string | null;

		if (!dealId || !newStage) {
			return fail(400, { error: 'Invalid data' });
		}

		try {
			if (newStage === 'LOST' && loss_reason) {
				await sql`UPDATE marketing.deals SET stage = ${newStage}, loss_reason = ${loss_reason}, updated_at = CURRENT_TIMESTAMP WHERE id = ${dealId}`;
			} else if (estimated_tonnage !== null && estimated_value !== null) {
				await sql`UPDATE marketing.deals SET stage = ${newStage}, estimated_tonnage = ${estimated_tonnage}, estimated_value = ${estimated_value}, updated_at = CURRENT_TIMESTAMP WHERE id = ${dealId}`;
			} else if (estimated_value !== null && notes !== null) {
				// Negotiation stage update
				await sql`UPDATE marketing.deals SET stage = ${newStage}, estimated_value = ${estimated_value}, notes = ${notes}, updated_at = CURRENT_TIMESTAMP WHERE id = ${dealId}`;
			} else {
				await sql`UPDATE marketing.deals SET stage = ${newStage}, updated_at = CURRENT_TIMESTAMP WHERE id = ${dealId}`;
			}
			return { success: true, message: 'Stage diupdate.' };
		} catch (e: any) {
			return fail(500, { error: 'Gagal update stage.' });
		}
	},

	convertToContract: async ({ request }) => {
		const data = await request.formData();
		const dealId = data.get('dealId') as string;
		const finalContactPerson = data.get('contact_person') as string;

		if (!dealId) {
			return fail(400, { error: 'Invalid deal ID' });
		}

		try {
			const deals = await sql`SELECT * FROM marketing.deals WHERE id = ${dealId}`;
			if (deals.length === 0) return fail(404, { error: 'Deal not found' });
			const deal = deals[0];
			
			if (deal.is_converted) {
				return fail(400, { error: 'Deal ini sudah pernah dikonversi.' });
			}

			// 1. Create Master Customer
			const cxCounterQuery = await sql`SELECT count(*) FROM master.m_customer WHERE kode_kustomer LIKE 'CUST-%'`;
			const cxCount = parseInt(cxCounterQuery[0].count) + 1;
			const customerCode = `CUST-${cxCount.toString().padStart(4, '0')}`;

			const customerResult = await sql`
				INSERT INTO master.m_customer (kode_kustomer, nama_kustomer, contact_person, phone, is_active)
				VALUES (${customerCode}, ${deal.company_name}, ${finalContactPerson || deal.contact_person || ''}, ${deal.phone || ''}, true)
				RETURNING id
			`;
			const customerId = customerResult[0].id;

			// 2. Create Master Contract (Draft or Active)
			const now = new Date();
			const year = now.getFullYear();
			const month = String(now.getMonth() + 1).padStart(2, '0');
			const randomSuffix = Math.floor(Math.random() * 9000) + 1000;
			const contractId = `PO-${year}-${month}-${randomSuffix}`;

			// Map project_category (string) back to project_id if possible
			// For simplicity, we just look up the first active project with that category or name
			const projs = await sql`SELECT id FROM master.m_project WHERE category = ${deal.project_category} LIMIT 1`;
			const projectId = projs.length > 0 ? projs[0].id : null;

			await sql`
				INSERT INTO marketing.contract (
					id, customer_id, project_id, contract_value, target_tonnage, 
					start_date, status, notes
				) VALUES (
					${contractId}, ${customerId}, ${projectId}, ${deal.estimated_value}, ${deal.estimated_tonnage},
					${deal.expected_date || null}, 'DRAFT', ${'Auto-generated from Deal ' + deal.id}
				)
			`;

			// 3. Update Deal Stage to WON and set is_converted = true
			await sql`UPDATE marketing.deals SET stage = 'WON', is_converted = true, updated_at = CURRENT_TIMESTAMP WHERE id = ${dealId}`;

			return { success: true, message: 'Selamat! Deal berhasil dikonversi menjadi Customer dan Kontrak DRAFT.' };
		} catch (e: any) {
			console.error("Convert error:", e);
			return fail(500, { error: 'Gagal konversi ke Kontrak.' });
		}
	},

	addActivity: async ({ request }) => {
		const data = await request.formData();
		const dealId = data.get('dealId') as string;
		const activityType = data.get('activity_type') as string;
		const description = data.get('description') as string;

		if (!dealId || !activityType || !description) {
			return fail(400, { error: 'Data aktivitas tidak lengkap' });
		}

		try {
			await sql`
				INSERT INTO marketing.deal_activities (deal_id, activity_type, description, created_by)
				VALUES (${dealId}, ${activityType}, ${description}, 'Sales System')
			`;
			return { success: true, message: 'Aktivitas berhasil ditambahkan' };
		} catch (e: any) {
			console.error("Add activity error:", e);
			return fail(500, { error: 'Gagal menyimpan aktivitas' });
		}
	}
};
