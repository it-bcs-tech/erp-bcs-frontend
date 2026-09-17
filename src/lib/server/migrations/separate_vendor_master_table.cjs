const fs = require('fs');
const postgres = require('postgres');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db';
const sql = postgres(DATABASE_URL);

function parseSqlTuples(sqlText) {
	let inString = false;
	let escape = false;
	let currentVal = '';
	let currentTuple = [];
	const tuples = [];
	let inValues = false;

	for (let i = 0; i < sqlText.length; i++) {
		const c = sqlText[i];
		if (!inValues) {
			if (sqlText.substring(i, i + 6) === 'VALUES') {
				inValues = true;
				i += 5;
			}
			continue;
		}
		if (escape) {
			currentVal += c;
			escape = false;
			continue;
		}
		if (c === '\\') {
			escape = true;
			continue;
		}
		if (c === "'") {
			inString = !inString;
			continue;
		}
		if (inString) {
			currentVal += c;
			continue;
		}
		if (c === '(') {
			currentTuple = [];
			currentVal = '';
			continue;
		}
		if (c === ',') {
			currentTuple.push(currentVal.trim() === 'NULL' ? null : currentVal.trim());
			currentVal = '';
			continue;
		}
		if (c === ')') {
			currentTuple.push(currentVal.trim() === 'NULL' ? null : currentVal.trim());
			tuples.push(currentTuple);
			currentVal = '';
			continue;
		}
		if (c === ';') {
			inValues = false;
			continue;
		}
		currentVal += c;
	}
	return tuples;
}

async function migrate() {
	console.log('--- Memulai Migrasi Pemisahan Data Vendor ---');

	// 1. Buat tabel master.m_vendor jika belum ada
	console.log('1. Membuat tabel master.m_vendor...');
	await sql`
		CREATE TABLE IF NOT EXISTS master.m_vendor (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			kode_vendor VARCHAR(50) UNIQUE NOT NULL,
			nama_vendor VARCHAR(255) NOT NULL,
			alias VARCHAR(50),
			alamat TEXT,
			city VARCHAR(100),
			country VARCHAR(100) DEFAULT 'INDONESIA',
			email VARCHAR(150),
			phone VARCHAR(100),
			fax VARCHAR(100),
			contact_person VARCHAR(100),
			terms_of_payment TEXT,
			description TEXT,
			npwp VARCHAR(50),
			bank_name VARCHAR(100),
			bank_account_no VARCHAR(100),
			bank_account_name VARCHAR(150),
			kategori_vendor VARCHAR(100),
			is_active BOOLEAN DEFAULT true,
			created_at TIMESTAMPTZ DEFAULT now(),
			updated_at TIMESTAMPTZ DEFAULT now()
		);
	`;

	// 2. Ambil vendor dari master.m_customer
	console.log('2. Mengambil data vendor dari master.m_customer...');
	const existingVendors = await sql`
		SELECT id, kode_kustomer, nama_kustomer, alamat, email, phone, contact_person, is_active
		FROM master.m_customer
		WHERE UPPER(kategori) = 'VENDOR' OR kode_kustomer LIKE 'V%'
	`;
	console.log(`Ditemukan ${existingVendors.length} data vendor di master.m_customer.`);

	// 3. Masukkan ke master.m_vendor mempertahankan UUID asli
	console.log('3. Menyalin vendor ke master.m_vendor (mempertahankan UUID)...');
	let copiedCount = 0;
	for (const v of existingVendors) {
		await sql`
			INSERT INTO master.m_vendor (
				id,
				kode_vendor,
				nama_vendor,
				alamat,
				email,
				phone,
				contact_person,
				is_active,
				created_at,
				updated_at
			) VALUES (
				${v.id},
				${v.kode_kustomer},
				${v.nama_kustomer},
				${v.alamat},
				${v.email},
				${v.phone},
				${v.contact_person},
				${v.is_active ?? true},
				now(),
				now()
			)
			ON CONFLICT (kode_vendor) DO UPDATE SET
				id = EXCLUDED.id,
				nama_vendor = EXCLUDED.nama_vendor,
				alamat = EXCLUDED.alamat,
				email = EXCLUDED.email,
				phone = EXCLUDED.phone,
				contact_person = EXCLUDED.contact_person,
				is_active = EXCLUDED.is_active,
				updated_at = now();
		`;
		copiedCount++;
	}
	console.log(`Berhasil menyalin ${copiedCount} vendor ke master.m_vendor.`);

	// 4. Perkaya dari file db/vendor_pms.sql jika ada
	const dumpPath = '/Users/syamban/Documents/erp-bcs/db/vendor_pms.sql';
	if (fs.existsSync(dumpPath)) {
		console.log('4. Membaca db/vendor_pms.sql untuk pengayaan data (alias, city, terms, deskripsi)...');
		const dumpContent = fs.readFileSync(dumpPath, 'utf8');
		const dumpRows = parseSqlTuples(dumpContent);
		console.log(`Berhasil parse ${dumpRows.length} baris dari vendor_pms.sql.`);

		let enrichedCount = 0;
		for (const row of dumpRows) {
			if (row.length < 16) continue;
			const vendorId = (row[1] || '').trim();
			const alias = (row[2] || '').trim() || null;
			const city = (row[7] || '').trim() || null;
			const country = (row[8] || '').trim() || 'INDONESIA';
			const fax = (row[10] || '').trim() || null;
			const cp = (row[11] || '').trim() || null;
			const remarks = (row[12] || '').trim() || null; // TOP (Terms of Payment)
			const description = (row[13] || '').trim() || null;

			if (!vendorId) continue;

			const updateRes = await sql`
				UPDATE master.m_vendor
				SET 
					alias = COALESCE(${alias}, alias),
					city = COALESCE(${city}, city),
					country = COALESCE(${country}, country),
					fax = COALESCE(${fax}, fax),
					contact_person = COALESCE(${cp}, contact_person),
					terms_of_payment = COALESCE(${remarks}, terms_of_payment),
					description = COALESCE(${description}, description),
					updated_at = now()
				WHERE kode_vendor = ${vendorId}
			`;
			if (updateRes.count > 0) enrichedCount++;
		}
		console.log(`Berhasil memperkaya data ${enrichedCount} vendor dengan field alias, kota, terms, dan deskripsi.`);
	}

	// 5. Lepaskan constraint Foreign Key lama yang merujuk master.m_customer
	console.log('5. Menyesuaikan constraint Foreign Key...');
	await sql`ALTER TABLE finance.invoice DROP CONSTRAINT IF EXISTS fk_partner_id;`;
	await sql`ALTER TABLE finance.payment DROP CONSTRAINT IF EXISTS payment_partner_id_fkey;`;
	await sql`ALTER TABLE master.m_material_prices DROP CONSTRAINT IF EXISTS m_material_prices_vendor_id_fkey;`;
	await sql`ALTER TABLE procurement.purchase_order DROP CONSTRAINT IF EXISTS purchase_order_vendor_id_fkey;`;

	// 6. Pasang Foreign Key baru yang mengarah ke master.m_vendor
	console.log('6. Memasang Foreign Key baru ke master.m_vendor...');
	await sql`
		ALTER TABLE procurement.purchase_order 
		ADD CONSTRAINT purchase_order_vendor_id_fkey 
		FOREIGN KEY (vendor_id) REFERENCES master.m_vendor(id) ON DELETE RESTRICT;
	`;

	await sql`
		ALTER TABLE master.m_material_prices 
		ADD CONSTRAINT m_material_prices_vendor_id_fkey 
		FOREIGN KEY (vendor_id) REFERENCES master.m_vendor(id) ON DELETE RESTRICT;
	`;

	// 7. Hapus record vendor dari master.m_customer
	console.log('7. Membersihkan data vendor dari master.m_customer...');
	const deleteRes = await sql`
		DELETE FROM master.m_customer
		WHERE UPPER(kategori) = 'VENDOR' OR kode_kustomer LIKE 'V%'
	`;
	console.log(`Berhasil menghapus ${deleteRes.count} baris vendor dari master.m_customer.`);

	// 8. Verifikasi hitungan akhir
	const vendorFinal = await sql`SELECT count(*) FROM master.m_vendor`;
	const customerFinal = await sql`SELECT count(*), kategori FROM master.m_customer GROUP BY kategori`;

	console.log('--- Migrasi Selesai! ---');
	console.log(`Total di master.m_vendor: ${vendorFinal[0].count} vendor.`);
	console.log('Sisa kategori di master.m_customer:', customerFinal);

	process.exit(0);
}

migrate().catch(err => {
	console.error('Migration Error:', err);
	process.exit(1);
});
