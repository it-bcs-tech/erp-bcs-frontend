import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import sql from '$lib/server/db';

export const load: PageServerLoad = async ({ url }) => {
	try {
		const statusFilter = url.searchParams.get('status') || 'All';
		const search = url.searchParams.get('search')?.toLowerCase() || '';

		const pods = await sql`
			SELECT 
				p.id,
				p.pod_number,
				p.sales_order_id,
				p.dispatched_weight,
				p.received_weight,
				p.shrinkage_weight,
				p.receiver_name,
				p.receiver_phone,
				p.received_at,
				p.pod_document_url,
				p.pod_photo_url,
				p.notes,
				p.status,
				p.verified_by,
				p.verified_at,
				p.is_invoiced,
				p.invoice_id,
				u.nomor_unit as unit_number,
				k.nama_karyawan as driver_name,
				c.nama_kustomer as customer_name,
				ori.nama_kustomer as origin_name,
				dest.nama_kustomer as destination_name,
				so.jenis_muatan,
				so.tariff
			FROM operations.proof_of_delivery p
			JOIN marketing.sales_order so ON so.id = p.sales_order_id
			LEFT JOIN fleet.unit u ON u.id = p.unit_id
			LEFT JOIN master.m_drivers d ON d.id = p.driver_id
			LEFT JOIN master.m_karyawan k ON k.id = d.karyawan_id
			LEFT JOIN master.m_customer c ON c.id = p.customer_id
			LEFT JOIN master.m_customer ori ON ori.id = so.origin_id
			LEFT JOIN master.m_customer dest ON dest.id = so.destination_id
			ORDER BY p.created_at DESC
		`;

		// Orders that are ready for e-POD submission (status IN ('ON_ROUTE', 'AT_DESTINATION', 'RETURNING', 'COMPLETED'))
		const pendingOrdersForPod = await sql`
			SELECT 
				so.id,
				so.assigned_unit_id as unit_id,
				so.assigned_driver_id as driver_id,
				so.customer_id,
				so.berat_muatan as dispatched_weight,
				so.jenis_muatan,
				u.nomor_unit as unit_number,
				k.nama_karyawan as driver_name,
				c.nama_kustomer as customer_name,
				ori.nama_kustomer as origin_name,
				dest.nama_kustomer as destination_name
			FROM marketing.sales_order so
			LEFT JOIN fleet.unit u ON u.id = so.assigned_unit_id
			LEFT JOIN master.m_drivers d ON d.id = so.assigned_driver_id
			LEFT JOIN master.m_karyawan k ON k.id = d.karyawan_id
			LEFT JOIN master.m_customer c ON c.id = so.customer_id
			LEFT JOIN master.m_customer ori ON ori.id = so.origin_id
			LEFT JOIN master.m_customer dest ON dest.id = so.destination_id
			WHERE so.status NOT IN ('CANCELED', 'WAITING_UJO', 'WAITING_TARIFF')
			  AND NOT EXISTS (
				SELECT 1 FROM operations.proof_of_delivery pod WHERE pod.sales_order_id = so.id
			  )
			ORDER BY so.created_at DESC
			LIMIT 20
		`;

		const allPods = pods.map((p: any) => ({
			...p,
			shrinkage_pct: p.dispatched_weight > 0 ? ((p.shrinkage_weight / p.dispatched_weight) * 100).toFixed(2) : '0.00'
		}));

		let filtered = allPods;
		if (search) {
			filtered = filtered.filter((p: any) =>
				p.pod_number?.toLowerCase().includes(search) ||
				p.sales_order_id?.toLowerCase().includes(search) ||
				p.customer_name?.toLowerCase().includes(search) ||
				p.driver_name?.toLowerCase().includes(search) ||
				p.unit_number?.toLowerCase().includes(search)
			);
		}
		if (statusFilter !== 'All') {
			filtered = filtered.filter((p: any) => p.status === statusFilter);
		}

		const summary = {
			total: allPods.length,
			pendingVerification: allPods.filter((p: any) => p.status === 'PENDING_VERIFICATION').length,
			verified: allPods.filter((p: any) => p.status === 'VERIFIED').length,
			disputed: allPods.filter((p: any) => p.status === 'DISPUTED' || Math.abs(parseFloat(p.shrinkage_weight || '0')) > 0.1).length,
			totalShrinkageTons: allPods.reduce((acc: number, p: any) => acc + Math.max(0, parseFloat(p.shrinkage_weight || '0')), 0)
		};

		return {
			pods: filtered,
			pendingOrdersForPod,
			summary,
			filters: { status: statusFilter, search }
		};
	} catch (error) {
		console.error("Error loading OCS e-POD list:", error);
		return {
			pods: [],
			pendingOrdersForPod: [],
			summary: { total: 0, pendingVerification: 0, verified: 0, disputed: 0, totalShrinkageTons: 0 },
			filters: { status: 'All', search: '' }
		};
	}
};

export const actions: Actions = {
	submitPod: async ({ request, locals }) => {
		const formData = await request.formData();
		const sales_order_id = formData.get('sales_order_id') as string;
		const received_weight = parseFloat(formData.get('received_weight') as string) || 0;
		const receiver_name = formData.get('receiver_name') as string;
		const receiver_phone = (formData.get('receiver_phone') as string) || '';
		const pod_document_url = (formData.get('pod_document_url') as string) || '';
		const notes = (formData.get('notes') as string) || '';

		if (!sales_order_id || !receiver_name || received_weight <= 0) {
			return fail(400, { error: 'Nomor Order, Nama Penerima, dan Berat Diterima wajib diisi dengan benar.' });
		}

		try {
			// Ambil detail Sales Order
			const orderRes = await sql`
				SELECT id, assigned_unit_id, assigned_driver_id, customer_id, berat_muatan
				FROM marketing.sales_order
				WHERE id = ${sales_order_id}
			`;

			if (orderRes.length === 0) {
				return fail(404, { error: 'Sales Order tidak ditemukan.' });
			}

			const order = orderRes[0];
			const dispatched_weight = parseFloat(order.berat_muatan) || received_weight;
			const shrinkage = dispatched_weight - received_weight;
			
			// Jika susut > 0.1 ton (100 kg), otomatis status DISPUTED, selain itu PENDING_VERIFICATION
			const autoStatus = Math.abs(shrinkage) > 0.1 ? 'DISPUTED' : 'PENDING_VERIFICATION';

			// Generate Nomor POD
			const countRes = await sql`SELECT count(*)::int as count FROM operations.proof_of_delivery`;
			const pod_number = 'POD-' + new Date().getFullYear() + '-' + String(countRes[0].count + 1).padStart(4, '0');

			await sql`
				INSERT INTO operations.proof_of_delivery (
					pod_number, sales_order_id, unit_id, driver_id, customer_id,
					dispatched_weight, received_weight, receiver_name, receiver_phone,
					status, notes, pod_document_url
				) VALUES (
					${pod_number}, ${order.id}, ${order.assigned_unit_id}, ${order.assigned_driver_id}, ${order.customer_id},
					${dispatched_weight}, ${received_weight}, ${receiver_name}, ${receiver_phone},
					${autoStatus}, ${notes}, ${pod_document_url || 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop&q=60'}
				)
			`;

			// Update status order jika diperlukan
			await sql`
				UPDATE marketing.sales_order 
				SET real_weight = ${received_weight}
				WHERE id = ${order.id}
			`;

			return { success: true, message: `e-POD ${pod_number} berhasil diregistrasi.` };
		} catch (err: any) {
			console.error("Error submitting e-POD:", err);
			return fail(500, { error: 'Gagal menyimpan e-POD: ' + err.message });
		}
	},

	verifyPod: async ({ request, locals }) => {
		const formData = await request.formData();
		const pod_id = parseInt(formData.get('pod_id') as string);
		const user = locals?.user || { name: 'Superadmin OCS' };

		if (!pod_id) {
			return fail(400, { error: 'ID POD tidak valid.' });
		}

		try {
			await sql`
				UPDATE operations.proof_of_delivery
				SET 
					status = 'VERIFIED',
					verified_by = ${user.name || 'Admin OCS'},
					verified_at = CURRENT_TIMESTAMP,
					updated_at = CURRENT_TIMESTAMP
				WHERE id = ${pod_id}
			`;

			return { success: true, message: 'e-POD berhasil diverifikasi. Siap diterbitkan invoice oleh Finance.' };
		} catch (err: any) {
			console.error("Error verifying e-POD:", err);
			return fail(500, { error: 'Gagal memverifikasi e-POD: ' + err.message });
		}
	}
};
