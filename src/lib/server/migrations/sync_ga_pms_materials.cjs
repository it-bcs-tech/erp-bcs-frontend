/**
 * sync_ga_pms_materials.cjs
 * Sinkronisasi Master Barang GA (ga.stationery_items) dengan PMS Materials Catalog (master.m_materials)
 * dan Standarisasi 5 Kategori GA COMS: ATK, FORM, TONNER, MATERAI, SANITASI_COVID.
 */

const postgres = require('postgres');
const DB_URL = process.env.DATABASE_URL || 'postgresql://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db';
const sql = postgres(DB_URL, { max: 5, connect_timeout: 15, idle_timeout: 30 });

async function run() {
	console.log('=== Memulai Sinkronisasi GA Stationery & PMS Materials ===\n');

	// 1. Pastikan kolom material_id ada di ga.stationery_items
	console.log('1. Memastikan kolom material_id di ga.stationery_items...');
	await sql`
		ALTER TABLE ga.stationery_items 
		ADD COLUMN IF NOT EXISTS material_id INTEGER REFERENCES master.m_materials(id) ON DELETE SET NULL
	`;
	console.log('   [OK] Kolom material_id siap.\n');

	// 2. Sinkronisasi Kategori COMS di ga.stationery_categories
	console.log('2. Memperbarui Kategori COMS di ga.stationery_categories...');
	const standardCategories = [
		{ id: 6, description: 'ATK' },
		{ id: 7, description: 'FORM' },
		{ id: 8, description: 'TONNER' },
		{ id: 9, description: 'MATERAI' },
		{ id: 10, description: 'SANITASI_COVID' }
	];
	for (const cat of standardCategories) {
		await sql`
			INSERT INTO ga.stationery_categories (id, description, created_by)
			VALUES (${cat.id}, ${cat.description}, 'system')
			ON CONFLICT (id) DO UPDATE SET description = EXCLUDED.description
		`;
	}
	console.log('   [OK] 5 Kategori COMS terdaftar.\n');

	// 3. Ambil data master.m_materials untuk referensi
	console.log('3. Memuat katalog master.m_materials...');
	const pmsMaterials = await sql`
		SELECT id, material_code, name, uom, standard_price, min_stock, max_stock 
		FROM master.m_materials 
		WHERE is_active = true
	`;
	console.log(`   Ditemukan ${pmsMaterials.length} material PMS aktif.`);

	// Helper untuk normalisasi teks
	const norm = (str) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');

	// Index pencarian PMS
	const pmsByExactName = new Map();
	for (const m of pmsMaterials) {
		pmsByExactName.set(norm(m.name), m);
	}

	// 4. Daftarkan item baru dari PDF yang belum ada di PMS (Materai & Sanitasi K3)
	console.log('\n4. Mendaftarkan item baru (Materai & Sanitasi) ke master.m_materials jika belum ada...');
	const newPmsItems = [
		{ code: 'M-MAT-10K', name: 'MATERAI 10000', uom: 'LEMBAR', price: 10000, catId: 9 },
		{ code: 'M-SAN-WIPOL', name: 'WIPOL CEMARA 780ML', uom: 'POUCH', price: 20000, catId: 10 },
		{ code: 'M-SAN-PROCLYN', name: 'PROCLYN PEMUTIH 500ML', uom: 'BOTOL', price: 12000, catId: 10 },
		{ code: 'M-SAN-HS5L', name: 'HAND SANITIZER 5 LITER', uom: 'JERIGEN', price: 150000, catId: 10 },
		{ code: 'M-SAN-LB', name: 'SABUN LIFEBUOY CAIR 450ML', uom: 'POUCH', price: 25000, catId: 10 },
		{ code: 'M-SAN-DETTOL', name: 'SABUN DETTOL ANTISEPTIK CAIR', uom: 'BOTOL', price: 35000, catId: 10 },
		{ code: 'M-SAN-CITRA', name: 'CITRA HAND BODY LOTION FRESH', uom: 'BOTOL', price: 22000, catId: 10 },
		{ code: 'M-SAN-SPANDUK', name: 'SPANDUK K3 PROTOKOL KESEHATAN', uom: 'PCS', price: 75000, catId: 10 },
		{ code: 'M-SAN-STIKER', name: 'STIKER JAGA JARAK LANTAI', uom: 'PCS', price: 15000, catId: 10 }
	];

	for (const item of newPmsItems) {
		const existing = await sql`
			SELECT id FROM master.m_materials 
			WHERE material_code = ${item.code} OR UPPER(name) = ${item.name} 
			LIMIT 1
		`;
		let matId;
		if (existing.length === 0) {
			const [inserted] = await sql`
				INSERT INTO master.m_materials (
					material_code, type_code, name, uom, standard_price, is_active, created_by
				) VALUES (
					${item.code}, 'T00009', ${item.name}, ${item.uom}, ${item.price}, true, 'ga_sync'
				) RETURNING id
			`;
			matId = inserted.id;
			console.log(`   + Ditambahkan ke master.m_materials: [${item.code}] ${item.name} (ID: ${matId})`);
		} else {
			matId = existing[0].id;
		}
		pmsByExactName.set(norm(item.name), { id: matId, material_code: item.code, name: item.name, uom: item.uom, standard_price: item.price });
	}

	// 5. Update relasi material_id untuk 141 item di ga.stationery_items
	console.log('\n5. Memetakan 141 item GA eksisting ke PMS material_id...');
	const gaItems = await sql`SELECT id, item_code, name, category, unit, material_id FROM ga.stationery_items ORDER BY id`;

	let mappedCount = 0;
	for (const gi of gaItems) {
		let matchedMat = null;

		// 1. Cek kecocokan nama langsung
		const n = norm(gi.name);
		if (pmsByExactName.has(n)) {
			matchedMat = pmsByExactName.get(n);
		}

		// 2. Kamus pencocokan khusus ejaan / nama khas
		if (!matchedMat) {
			const specialMappings = {
				'kertas hvs a4': 'M01684', // KERTAS A4, COPY PAPER
				'kertas hvs f4': 'M02732', // KERTAS F4
				'kertas fak': 'M01067', // KERTAS FAX
				'bindex 717 (besar)': 'M01057', // ODNER BINDEX 717
				'bindex 777 (kecil)': 'M03220', // ODNER BINDEX 777
				'amplop kop no 90': 'M01062', // CETAK AMPLOP JAYA NO. 90
				'amplop polos no 90': 'M01054', // AMPLOP PUTIH POLOS PANJANG
				'amplop polos no 110': 'M02879', // AMPLOP POLOS NO.110
				'amplop coklat gji': 'M02880', // AMPLOP COKLAT, AMPLOP GAJI
				'amplop coklat kop f4': 'M01064', // CETAK AMPLOP COKLAT F4
				'amplop coklat kop besar': 'M05460', // CETAK AMPLOP COKLAT A3
				'amplop coklat f4 polos': 'M03688', // AMPLOP COKLAT F4
				'amplop coklat polos sedang f4': 'M02934', // AMPLOP COKLAT POLOS, A4
				'amplop putih kop f4': 'M01061', // CETAK AMPLOP PUTIH F 4
				'amplop putih kop a4': 'M01063', // CETAK AMPLOP COKLAT A4
				'isi hekter kecil': 'M01059', // HEKTER KECIL
				'isi hekter besar': 'M09730', // ISI HEKTER BESAR
				'binder clip no 105': 'M01907', // BINDER CLIPS 105
				'binder clip no 155': 'M076400', // BINDER CLIPS 155
				'binder clip no 260': 'M01687', // BINDER CLIPS 260
				'paper clips no. 3': 'M01056', // TRIGONAL CLIPS, NO. 3
				'box file': 'M04000', // BOX FILE BINDEX
				'klar transparent': 'M01910', // CLEAR HOLDER
				'pita mesin ketik': 'M01060', // TINTA MESIN TIK
				'buku agenda besar': 'M09398', // BUKU KWITANSI, BESAR
				'buku agenda kecil': 'M09399', // BUKU KWITANSI SEDANG
				'spidol marker hitam': 'M04888', // SPIDOL MARKER, PERMANEN
				'spidol marker biru': 'M04888'
			};

			const cleanKey = gi.name.toLowerCase().replace(/\s+/g, ' ').trim();
			for (const [pattern, pmsCode] of Object.entries(specialMappings)) {
				if (cleanKey.includes(pattern) || pattern.includes(cleanKey)) {
					matchedMat = pmsMaterials.find((m) => m.material_code === pmsCode);
					if (matchedMat) break;
				}
			}
		}

		// 3. Fallback token-overlap
		if (!matchedMat) {
			const tokens = gi.name.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !['dan', 'kop', 'pt', 'bcs', 'polos', 'sedang', 'besar', 'kecil'].includes(w));
			let bestScore = 0;
			for (const m of pmsMaterials) {
				const mTokens = m.name.toLowerCase().split(/[^a-z0-9]+/);
				const overlap = tokens.filter((t) => mTokens.includes(t)).length;
				if (overlap >= 2 && overlap > bestScore && overlap >= Math.min(tokens.length, 2)) {
					bestScore = overlap;
					matchedMat = m;
				}
			}
		}

		if (matchedMat) {
			await sql`
				UPDATE ga.stationery_items 
				SET material_id = ${matchedMat.id}
				WHERE id = ${gi.id}
			`;
			mappedCount++;
		}
	}
	console.log(`   [OK] ${mappedCount} dari ${gaItems.length} item GA eksisting berhasil dipetakan ke PMS.`);

	// 6. Masukkan item monitoring dari PDF yang belum ada di ga.stationery_items
	console.log('\n6. Menambahkan item pengadaan operasional dari PDF ke ga.stationery_items...');
	const additionalPdfItems = [
		// TONNER
		{ name: 'TONER HP CF210 A (HITAM)', catId: 8, pmsCode: 'M09689', unit: 'PCS', minStock: 2, price: 950000 },
		{ name: 'TONER HP CF211 A (BIRU)', catId: 8, pmsCode: 'M09690', unit: 'PCS', minStock: 1, price: 980000 },
		{ name: 'TONER HP CF212 A (KUNING)', catId: 8, pmsCode: 'M09692', unit: 'PCS', minStock: 1, price: 980000 },
		{ name: 'TONER HP CF213 A (MERAH)', catId: 8, pmsCode: 'M09691', unit: 'PCS', minStock: 1, price: 980000 },
		{ name: 'TONER HP CF226 A', catId: 8, pmsCode: 'M09693', unit: 'PCS', minStock: 2, price: 1200000 },
		{ name: 'TONER PRINTER W2040A BLACK', catId: 8, pmsCode: 'M076499', unit: 'PCS', minStock: 2, price: 1150000 },
		{ name: 'TONER PRINTER W2041A CYAN', catId: 8, pmsCode: 'M076500', unit: 'PCS', minStock: 1, price: 1250000 },
		{ name: 'TINTA TONER EPSON L310', catId: 8, pmsCode: 'M08710', unit: 'BOTOL', minStock: 3, price: 110000 },
		{ name: 'REFIL TONER 26A', catId: 8, pmsCode: 'M08617', unit: 'PCS', minStock: 2, price: 350000 },
		// FORM
		{ name: 'CHECKLIST DUMP TRUCK (DT)', catId: 7, pmsCode: 'M06211', unit: 'BUKU', minStock: 5, price: 45000 },
		{ name: 'CHECKLIST TRAILER CILEGON', catId: 7, pmsCode: 'M03233', unit: 'BUKU', minStock: 5, price: 45000 },
		{ name: 'INSPEKSI KENDARAAN WINGBOX', catId: 7, pmsCode: 'M09615', unit: 'BUKU', minStock: 5, price: 45000 },
		{ name: 'FORM BTTD PUTIH MERAH', catId: 7, pmsCode: 'M01613', unit: 'BUKU', minStock: 5, price: 40000 },
		{ name: 'FORM BDV FOL 2 PLY', catId: 7, pmsCode: 'M01809', unit: 'BUKU', minStock: 5, price: 40000 },
		{ name: 'CONTINUOUS FORM 9.5 X 11', catId: 7, pmsCode: 'M01222', unit: 'BOX', minStock: 3, price: 280000 },
		// ATK
		{ name: 'ACCO FASTER / KAWAT FILE', catId: 6, pmsCode: 'M01616', unit: 'BOX', minStock: 5, price: 25000 },
		{ name: 'CETAK KARTU NAMA STANDAR BCS', catId: 6, pmsCode: 'M01675', unit: 'BOX', minStock: 3, price: 65000 },
		{ name: 'KERTAS A3 70 GR', catId: 6, pmsCode: 'M07732', unit: 'RIM', minStock: 2, price: 95000 },
		{ name: 'PENGHAPUS WHITEBOARD', catId: 6, pmsCode: 'M02905', unit: 'PCS', minStock: 3, price: 15000 },
		{ name: 'BATERAI ALKALINE AAA', catId: 6, pmsCode: 'M04889', unit: 'PAK', minStock: 5, price: 22000 },
		{ name: 'BATERAI BESAR KOTAK 9V', catId: 6, pmsCode: 'M05067', unit: 'PCS', minStock: 3, price: 30000 },
		{ name: 'TRIGONAL CLIPS NO. 3', catId: 6, pmsCode: 'M01056', unit: 'BOX', minStock: 10, price: 7500 },
		// MATERAI & SANITASI
		{ name: 'MATERAI 10000', catId: 9, pmsCode: 'M-MAT-10K', unit: 'LEMBAR', minStock: 50, price: 10000 },
		{ name: 'WIPOL CEMARA 780ML', catId: 10, pmsCode: 'M-SAN-WIPOL', unit: 'POUCH', minStock: 10, price: 20000 },
		{ name: 'PROCLYN PEMUTIH 500ML', catId: 10, pmsCode: 'M-SAN-PROCLYN', unit: 'BOTOL', minStock: 5, price: 12000 },
		{ name: 'HAND SANITIZER 5 LITER', catId: 10, pmsCode: 'M-SAN-HS5L', unit: 'JERIGEN', minStock: 2, price: 150000 },
		{ name: 'SABUN LIFEBUOY CAIR 450ML', catId: 10, pmsCode: 'M-SAN-LB', unit: 'POUCH', minStock: 5, price: 25000 },
		{ name: 'SABUN DETTOL ANTISEPTIK CAIR', catId: 10, pmsCode: 'M-SAN-DETTOL', unit: 'BOTOL', minStock: 5, price: 35000 }
	];

	let addedCount = 0;
	const [maxIdRow] = await sql`SELECT COALESCE(MAX(id), 0)::int as max_id FROM ga.stationery_items`;
	let nextGaId = maxIdRow.max_id + 1;

	for (const it of additionalPdfItems) {
		const existing = await sql`
			SELECT id FROM ga.stationery_items 
			WHERE UPPER(TRIM(name)) = UPPER(TRIM(${it.name}))
			LIMIT 1
		`;
		if (existing.length === 0) {
			// Temukan material_id
			const pmsMat = pmsMaterials.find((m) => m.material_code === it.pmsCode) || (await sql`SELECT id FROM master.m_materials WHERE material_code = ${it.pmsCode} LIMIT 1`)[0];
			const matId = pmsMat ? pmsMat.id : null;
			const catName = standardCategories.find((c) => c.id === it.catId)?.description || 'ATK';
			const itemCode = `ATK-${String(nextGaId).padStart(3, '0')}`;

			await sql`
				INSERT INTO ga.stationery_items (
					id, item_code, name, category, category_id, unit, unit_id,
					stock_quantity, minimum_stock, unit_price_estimate, material_id,
					created_by, created_at
				) VALUES (
					${nextGaId}, ${itemCode}, ${it.name}, ${catName}, ${it.catId}, ${it.unit}, 2,
					0, ${it.minStock}, ${it.price}, ${matId},
					'sync_coms', NOW()
				)
			`;
			console.log(`   + Ditambahkan ke ga.stationery_items: [${itemCode}] ${it.name} (Material ID: ${matId})`);
			nextGaId++;
			addedCount++;
		}
	}
	await sql`SELECT setval('ga.stationery_items_id_seq', COALESCE((SELECT MAX(id) FROM ga.stationery_items), 1))`;
	console.log(`   [OK] ${addedCount} item baru dari monitoring PDF berhasil ditambahkan ke katalog GA.`);

	// 6b. Standarisasi nama kategori di ga.stationery_items
	console.log('\n6b. Menyelaraskan nama kategori COMS di ga.stationery_items...');
	await sql`UPDATE ga.stationery_items SET category = 'TONNER', category_id = 8 WHERE category = 'TINTA' OR name ILIKE '%toner%'`;
	await sql`UPDATE ga.stationery_items SET category = 'MATERAI', category_id = 9 WHERE name ILIKE '%materai%'`;
	await sql`UPDATE ga.stationery_items SET category = 'SANITASI_COVID', category_id = 10 WHERE category ILIKE '%sanitasi%' OR category ILIKE '%covid%'`;


	// 7. Evaluasi Akhir
	const [totalGa] = await sql`SELECT COUNT(*)::int as c FROM ga.stationery_items`;
	const [mappedGa] = await sql`SELECT COUNT(*)::int as c FROM ga.stationery_items WHERE material_id IS NOT NULL`;
	const catCounts = await sql`
		SELECT category, COUNT(*)::int as count 
		FROM ga.stationery_items 
		GROUP BY category 
		ORDER BY count DESC
	`;

	console.log('\n=== REKAP HASIL SINKRONISASI ===');
	console.log(`Total Master Barang GA Saat Ini : ${totalGa.c}`);
	console.log(`Total Berhasil Terhubung ke PMS : ${mappedGa.c} (${Math.round((mappedGa.c / totalGa.c) * 100)}%)`);
	console.log('Distribusi Kategori COMS:');
	for (const cc of catCounts) {
		console.log(`  - ${cc.category}: ${cc.count} item`);
	}
	console.log('\n=== Sinkronisasi Sukses Selesai ===');
	process.exit(0);
}

run().catch((err) => {
	console.error('Fatal Error during sync:', err);
	process.exit(1);
});
