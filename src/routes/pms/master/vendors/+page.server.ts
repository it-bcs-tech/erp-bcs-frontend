import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url }) => {
	try {
		const search = (url.searchParams.get('q') || '').trim().toLowerCase();

		const vendors = await sql`
			SELECT 
				id,
				kode_kustomer as "kodeVendor",
				nama_kustomer as "namaVendor",
				COALESCE(contact_person, '-') as "contactPerson",
				COALESCE(phone, tlp, '-') as phone,
				COALESCE(email, '-') as email,
				COALESCE(alamat, '-') as alamat,
				is_active
			FROM master.m_customer
			WHERE kategori = 'VENDOR' OR kode_kustomer LIKE 'VND-%'
			ORDER BY created_at DESC NULLS LAST, nama_kustomer ASC
		`;

		let filtered = vendors;
		if (search) {
			filtered = filtered.filter(v =>
				(v.namaVendor && v.namaVendor.toLowerCase().includes(search)) ||
				(v.kodeVendor && v.kodeVendor.toLowerCase().includes(search)) ||
				(v.contactPerson && v.contactPerson.toLowerCase().includes(search)) ||
				(v.alamat && v.alamat.toLowerCase().includes(search))
			);
		}

		return {
			vendors: filtered
		};
	} catch (err: any) {
		console.error('Error loading PMS vendors:', err);
		return { vendors: [] };
	}
};

export const actions: Actions = {
	save: async ({ request }) => {
		const formData = await request.formData();
		const kode = (formData.get('kodeVendor') as string || '').trim().toUpperCase();
		const nama = (formData.get('namaVendor') as string || '').trim();
		const contact = (formData.get('contactPerson') as string || '').trim();
		const phone = (formData.get('phone') as string || '').trim();
		const email = (formData.get('email') as string || '').trim();
		const alamat = (formData.get('alamat') as string || '').trim();

		if (!nama) {
			return fail(400, { success: false, message: 'Nama Vendor wajib diisi!' });
		}

		try {
			await sql`
				INSERT INTO master.m_customer (
					kode_kustomer,
					nama_kustomer,
					contact_person,
					phone,
					tlp,
					email,
					alamat,
					kategori,
					is_active
				) VALUES (
					${kode || `VND-${Date.now().toString().slice(-6)}`},
					${nama},
					${contact},
					${phone},
					${phone},
					${email},
					${alamat},
					'VENDOR',
					true
				)
			`;
			return { success: true, message: 'Vendor berhasil ditambahkan!' };
		} catch (err: any) {
			console.error('Error creating vendor:', err);
			return fail(500, { success: false, message: err.message || 'Gagal menyimpan vendor' });
		}
	}
};
