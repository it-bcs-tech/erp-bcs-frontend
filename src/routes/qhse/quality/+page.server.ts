import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import sql from '$lib/server/db';

export const load: PageServerLoad = async () => {
	try {
		const [documents, complaints, customers] = await Promise.all([
			sql`
				SELECT 
					id, doc_number, title, category, revision, 
					effective_date, file_url, status, created_at
				FROM qhse.quality_documents
				ORDER BY doc_number ASC
			`,
			sql`
				SELECT 
					id, complaint_number, customer_name, sales_order_id, 
					date, issue_category, description, investigation_result, 
					car_action, status, created_at
				FROM qhse.customer_complaints
				ORDER BY date DESC
			`,
			sql`SELECT id, name FROM master.m_customer WHERE is_active = true ORDER BY name ASC LIMIT 100`
		]);

		const summary = {
			totalSops: documents.length,
			activeSops: documents.filter((d: any) => d.status === 'ACTIVE').length,
			totalComplaints: complaints.length,
			openComplaints: complaints.filter((c: any) => c.status === 'OPEN' || c.status === 'INVESTIGATION').length,
			resolvedComplaints: complaints.filter((c: any) => c.status === 'RESOLVED' || c.status === 'CLOSED').length
		};

		return {
			documents: documents as any[],
			complaints: complaints as any[],
			customers: customers as any[],
			summary
		};
	} catch (error) {
		console.error("Error loading quality management data:", error);
		return {
			documents: [],
			complaints: [],
			customers: [],
			summary: { totalSops: 0, activeSops: 0, totalComplaints: 0, openComplaints: 0, resolvedComplaints: 0 }
		};
	}
};

export const actions: Actions = {
	createSop: async ({ request }) => {
		const data = await request.formData();
		const docNumber = data.get('doc_number') as string;
		const title = data.get('title') as string;
		const category = data.get('category') as string;
		const revision = data.get('revision') as string || 'Rev 00';
		const effectiveDate = data.get('effective_date') as string || new Date().toISOString().split('T')[0];
		const fileUrl = data.get('file_url') as string || null;

		if (!docNumber || !title || !category) {
			return fail(400, { message: 'Harap lengkapi nomor dokumen, judul SOP, dan kategori!' });
		}

		try {
			await sql`
				INSERT INTO qhse.quality_documents (
					doc_number, title, category, revision, effective_date, file_url, status
				) VALUES (
					${docNumber}, ${title}, ${category}, ${revision}, ${new Date(effectiveDate)}, ${fileUrl}, 'ACTIVE'
				)
			`;

			return { success: true, message: `Dokumen Mutu ${docNumber} berhasil didaftarkan.` };
		} catch (e: any) {
			console.error("Create SOP error:", e);
			return fail(500, { error: e.message || 'Gagal mendaftarkan dokumen mutu.' });
		}
	},

	createComplaint: async ({ request }) => {
		const data = await request.formData();
		const customerName = data.get('customer_name') as string;
		const issueCategory = data.get('issue_category') as string;
		const salesOrderId = data.get('sales_order_id') as string || null;
		const description = data.get('description') as string;

		if (!customerName || !issueCategory || !description) {
			return fail(400, { message: 'Harap lengkapi nama kustomer, kategori keluhan, dan deskripsi!' });
		}

		try {
			const countRes = await sql`SELECT count(*) FROM qhse.customer_complaints`;
			const seq = (parseInt(countRes[0].count, 10) + 1).toString().padStart(4, '0');
			const complaintNumber = `CMP-${new Date().getFullYear()}-${seq}`;

			await sql`
				INSERT INTO qhse.customer_complaints (
					complaint_number, customer_name, sales_order_id, date,
					issue_category, description, status
				) VALUES (
					${complaintNumber}, ${customerName}, ${salesOrderId}, CURRENT_DATE,
					${issueCategory}, ${description}, 'OPEN'
				)
			`;

			return { success: true, message: `Customer Complaint ${complaintNumber} berhasil dicatat.` };
		} catch (e: any) {
			console.error("Create complaint error:", e);
			return fail(500, { error: e.message || 'Gagal menyimpan keluhan kustomer.' });
		}
	},

	resolveComplaint: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id') as string;
		const investigation = data.get('investigation_result') as string;
		const carAction = data.get('car_action') as string;

		if (!id || !investigation || !carAction) {
			return fail(400, { message: 'Harap lengkapi hasil investigasi dan tindakan perbaikan (CAR)!' });
		}

		try {
			await sql`
				UPDATE qhse.customer_complaints
				SET investigation_result = ${investigation},
					car_action = ${carAction},
					status = 'RESOLVED'
				WHERE id = ${id}
			`;

			return { success: true, message: 'Keluhan kustomer berhasil diselesaikan (Resolved).' };
		} catch (e: any) {
			console.error("Resolve complaint error:", e);
			return fail(500, { error: e.message || 'Gagal update status keluhan.' });
		}
	}
};
