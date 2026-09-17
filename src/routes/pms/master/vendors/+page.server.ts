import type { PageServerLoad, Actions } from './$types';
import sql from '$lib/server/db';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url }) => {
	try {
		const search = (url.searchParams.get('q') || '').trim().toLowerCase();

		const vendors = await sql`
			SELECT 
				id,
				kode_vendor as "kodeVendor",
				nama_vendor as "namaVendor",
				alias,
				COALESCE(contact_person, '-') as "contactPerson",
				COALESCE(phone, '-') as phone,
				COALESCE(email, '-') as email,
				COALESCE(alamat, '-') as alamat,
				COALESCE(city, '-') as city,
				COALESCE(terms_of_payment, '-') as "termsOfPayment",
				bank_name as "bankName",
				bank_account_no as "bankAccountNo",
				bank_account_name as "bankAccountName",
				is_active
			FROM master.m_vendor
			ORDER BY nama_vendor ASC
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
		const alias = (formData.get('alias') as string || '').trim();
		const contact = (formData.get('contactPerson') as string || '').trim();
		const phone = (formData.get('phone') as string || '').trim();
		const email = (formData.get('email') as string || '').trim();
		const alamat = (formData.get('alamat') as string || '').trim();
		const city = (formData.get('city') as string || '').trim();
		const terms = (formData.get('termsOfPayment') as string || '').trim();
		const bankName = (formData.get('bankName') as string || '').trim();
		const bankAccountNo = (formData.get('bankAccountNo') as string || '').trim();
		const bankAccountName = (formData.get('bankAccountName') as string || '').trim();

		if (!nama) {
			return fail(400, { success: false, message: 'Nama Vendor wajib diisi!' });
		}

		try {
			await sql`
				INSERT INTO master.m_vendor (
					kode_vendor,
					nama_vendor,
					alias,
					contact_person,
					phone,
					email,
					alamat,
					city,
					terms_of_payment,
					bank_name,
					bank_account_no,
					bank_account_name,
					is_active
				) VALUES (
					${kode || `VND-${Date.now().toString().slice(-6)}`},
					${nama},
					${alias || null},
					${contact || null},
					${phone || null},
					${email || null},
					${alamat || null},
					${city || null},
					${terms || null},
					${bankName || null},
					${bankAccountNo || null},
					${bankAccountName || null},
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
