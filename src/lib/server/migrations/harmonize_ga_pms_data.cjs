/**
 * harmonize_ga_pms_data.cjs
 * Penyelarasan Menyeluruh Data Master GA dan PMS:
 * 1. Deduplikasi item ganda di ga.stationery_items
 * 2. Koreksi typo / ejaan warisan lama & standarisasi nama menjadi UPPERCASE rapi
 * 3. Hubungkan 100% item GA ke master.m_materials
 * 4. Update master.m_materials.name mengikuti nama sederhana GA, dan simpan nama lama ke master.m_materials.spec
 * 5. Kalibrasi harga satuan wajar standar pasar & spreadsheet COMS di kedua tabel
 * 6. Sinkronisasi stok kuantitas dan minimum stock dari GA ke PMS (master.m_materials.stock)
 */

const postgres = require('postgres');
const DB_URL = process.env.DATABASE_URL || 'postgresql://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db';
const sql = postgres(DB_URL, { max: 5, connect_timeout: 20, idle_timeout: 30 });

async function run() {
	console.log('=== MEMULAI HARMONISASI DATA MASTER GA & PMS ===\n');

	// -------------------------------------------------------------------------
	// LANGKAH 1: DEDUPLIKASI ITEM GANDA DI ga.stationery_items
	// -------------------------------------------------------------------------
	console.log('Langkah 1: Deduplikasi item ganda di ga.stationery_items...');

	// Helper untuk re-point relasi sebelum menghapus item duplikat
	async function mergeItems(keepId, removeId) {
		await sql`UPDATE ga.stationery_request_items SET item_id = ${keepId} WHERE item_id = ${removeId}`;
		await sql`UPDATE ga.stationery_stock_in SET item_id = ${keepId} WHERE item_id = ${removeId}`;
		await sql`UPDATE ga.stationery_stock_out SET item_id = ${keepId} WHERE item_id = ${removeId}`;
		await sql`DELETE FROM ga.stationery_items WHERE id = ${removeId}`;
	}

	// 1. Checklist Dump Truck: gabungkan 181 ke 134
	const r181 = await sql`SELECT id FROM ga.stationery_items WHERE id = 181`;
	if (r181.length > 0) {
		await sql`UPDATE ga.stationery_items SET material_id = 16299, name = 'CHECKLIST DUMP TRUCK (DT)', category = 'FORM', category_id = 7, unit = 'BUKU' WHERE id = 134`;
		await mergeItems(134, 181);
		console.log('   ✓ Checklist Dump Truck: 181 digabung ke 134');
	}

	// 2. Checklist Trailer: gabungkan 182 ke 141
	const r182 = await sql`SELECT id FROM ga.stationery_items WHERE id = 182`;
	if (r182.length > 0) {
		await sql`UPDATE ga.stationery_items SET material_id = 13322, name = 'CHECKLIST TRAILER CILEGON', category = 'FORM', category_id = 7, unit = 'BUKU' WHERE id = 141`;
		await mergeItems(141, 182);
		console.log('   ✓ Checklist Trailer: 182 digabung ke 141');
	}

	// 3. Materai: gabungkan 189 ke 159
	const r189 = await sql`SELECT id FROM ga.stationery_items WHERE id = 189`;
	if (r189.length > 0) {
		await sql`UPDATE ga.stationery_items SET material_id = 23112, name = 'MATERAI 10000', category = 'MATERAI', category_id = 9, unit = 'LEMBAR', unit_price_estimate = 10000 WHERE id = 159`;
		await mergeItems(159, 189);
		console.log('   ✓ Materai: 189 digabung ke 159');
	}

	// 4. Post-it Sedang: gabungkan 45 ke 132
	const r45 = await sql`SELECT id FROM ga.stationery_items WHERE id = 45`;
	if (r45.length > 0) {
		await mergeItems(132, 45);
		console.log('   ✓ Post It Sedang: 45 digabung ke 132');
	}

	// 5. Post-it Kecil: gabungkan 46 ke 133
	const r46 = await sql`SELECT id FROM ga.stationery_items WHERE id = 46`;
	if (r46.length > 0) {
		await mergeItems(133, 46);
		console.log('   ✓ Post It Kecil: 46 digabung ke 133');
	}

	// 6. Post-it Besar: gabungkan 47 ke 131
	const r47 = await sql`SELECT id FROM ga.stationery_items WHERE id = 47`;
	if (r47.length > 0) {
		await mergeItems(131, 47);
		console.log('   ✓ Post It Besar: 47 digabung ke 131');
	}

	// 7. Clear Holder: gabungkan 150 ke 80
	const r150 = await sql`SELECT id FROM ga.stationery_items WHERE id = 150`;
	if (r150.length > 0) {
		await mergeItems(80, 150);
		console.log('   ✓ Clear Holder: 150 digabung ke 80');
	}

	// 8. Kertas A4 duplikat: gabungkan 162 ke 1
	const r162 = await sql`SELECT id FROM ga.stationery_items WHERE id = 162`;
	if (r162.length > 0) {
		await mergeItems(1, 162);
		console.log('   ✓ Kertas A4: 162 digabung ke 1');
	}

	// -------------------------------------------------------------------------
	// LANGKAH 2: KOREKSI TYPO & STANDARISASI UPPERCASE PADA ga.stationery_items
	// -------------------------------------------------------------------------
	console.log('\nLangkah 2: Mengoreksi typo dan menstandarisasi nama UPPERCASE...');

	const typoCorrections = [
		{ pattern: 'AMPOP COKLAT', corrected: 'AMPLOP COKLAT POLOS NO. 104' },
		{ pattern: 'AMPLOP COKLAT GJI', corrected: 'AMPLOP COKLAT GAJI' },
		{ pattern: 'KERTAS FAK', corrected: 'KERTAS FAX' },
		{ pattern: 'Buku Agenda Folio stngh', corrected: 'BUKU AGENDA FOLIO 1/2' },
		{ pattern: 'ISI CUTER KECIL', corrected: 'ISI CUTTER KECIL' },
		{ pattern: 'Isi Cuter Besar', corrected: 'ISI CUTTER BESAR' },
		{ pattern: 'Solasi sedang', corrected: 'ISOLASI BENING SEDANG' },
		{ pattern: 'Solasi Kecil', corrected: 'ISOLASI BENING KECIL' },
		{ pattern: 'Solasi Besar', corrected: 'ISOLASI BENING BESAR' },
		{ pattern: 'FORM CUTY', corrected: 'FORM CUTI KARYAWAN' },
		{ pattern: 'Batrai Alkaline Kotak', corrected: 'BATERAI ALKALINE KOTAK 9V' },
		{ pattern: 'BA2', codeCol: true, correctedName: 'BATERAI ALKALINE AA' },
		{ pattern: 'Klar Transparent', corrected: 'CLEAR HOLDER TRANSPARAN' },
		{ pattern: 'Pencabut hekter', corrected: 'PENCABUT STAPLES / HEKTER' },
		{ pattern: 'Spidol  MARKER BIRU', corrected: 'SPIDOL MARKER BIRU' },
		{ pattern: 'Double Tip ¼', corrected: 'DOUBLE TAPE 1/4 INCH' },
		{ pattern: 'Double Tip ½', corrected: 'DOUBLE TAPE 1/2 INCH' },
		{ pattern: 'Double Tip 1', corrected: 'DOUBLE TAPE 1 INCH' },
		{ pattern: 'Lakban kecil', corrected: 'LAKBAN BENING KECIL' },
		{ pattern: 'Lakban sedang', corrected: 'LAKBAN BENING SEDANG' },
		{ pattern: 'lakban besar', corrected: 'LAKBAN COKLAT BESAR' },
		{ pattern: 'BUSSINES FILE', corrected: 'BUSINESS FILE' },
		{ pattern: 'Stample', corrected: 'STEMPEL PERUSAHAAN' }
	];

	for (const tc of typoCorrections) {
		if (tc.codeCol) {
			await sql`UPDATE ga.stationery_items SET name = ${tc.correctedName} WHERE item_code = ${tc.pattern}`;
		} else {
			await sql`UPDATE ga.stationery_items SET name = ${tc.corrected} WHERE name ILIKE ${tc.pattern}`;
		}
	}

	// Format SEMUA nama barang di ga.stationery_items menjadi UPPERCASE bersih
	await sql`
		UPDATE ga.stationery_items
		SET name = UPPER(TRIM(REGEXP_REPLACE(name, '\\s+', ' ', 'g')))
	`;
	console.log('   ✓ Seluruh nama item di ga.stationery_items kini bersih dan UPPERCASE.');

	// -------------------------------------------------------------------------
	// LANGKAH 3: LENGKAPI RELASI 100% KE master.m_materials
	// -------------------------------------------------------------------------
	console.log('\nLangkah 3: Menghubungkan 100% item GA ke master.m_materials...');

	// Ambil semua item GA yang belum punya material_id
	const unlinkedItems = await sql`
		SELECT id, item_code, name, category, unit, unit_price_estimate 
		FROM ga.stationery_items 
		WHERE material_id IS NULL 
		ORDER BY id ASC
	`;
	console.log(`   Ditemukan ${unlinkedItems.length} item GA yang belum terhubung.`);

	// Ambil katalog PMS aktif
	const allPms = await sql`SELECT id, material_code, name FROM master.m_materials WHERE is_active = true`;
	const pmsNormMap = new Map();
	for (const p of allPms) {
		pmsNormMap.set(p.name.toUpperCase().replace(/[^A-Z0-9]/g, ''), p);
	}

	for (const it of unlinkedItems) {
		const normName = it.name.toUpperCase().replace(/[^A-Z0-9]/g, '');
		let matchedMat = pmsNormMap.get(normName);

		// Jika belum cocok, cari kecocokan substring/token
		if (!matchedMat) {
			const tokens = it.name.toUpperCase().split(/[^A-Z0-9]+/).filter((w) => w.length >= 3 && !['FORM', 'KERTAS', 'AMPLOP', 'BUKU'].includes(w));
			for (const p of allPms) {
				const pName = p.name.toUpperCase();
				if (tokens.length > 0 && tokens.every((t) => pName.includes(t))) {
					matchedMat = p;
					break;
				}
			}
		}

		let finalMatId;
		if (matchedMat) {
			finalMatId = matchedMat.id;
			console.log(`   ✓ [${it.item_code}] ${it.name} dipetakan ke PMS [${matchedMat.material_code}] ${matchedMat.name}`);
		} else {
			// Auto create di master.m_materials tipe T00009
			const matCode = 'M-GA-' + String(it.id).padStart(4, '0');
			const [created] = await sql`
				INSERT INTO master.m_materials (
					material_code, type_code, name, uom, standard_price, is_active, created_by
				) VALUES (
					${matCode}, 'T00009', ${it.name}, ${it.unit || 'PCS'}, ${it.unit_price_estimate || 0}, true, 'ga_harmonize'
				) RETURNING id
			`;
			finalMatId = created.id;
			console.log(`   + [${it.item_code}] ${it.name} dibuatkan material PMS baru: [${matCode}]`);
		}

		await sql`UPDATE ga.stationery_items SET material_id = ${finalMatId} WHERE id = ${it.id}`;
	}

	// -------------------------------------------------------------------------
	// LANGKAH 4: KALIBRASI HARGA SATUAN WAJAR (MARKET & COMS STANDARD)
	// -------------------------------------------------------------------------
	console.log('\nLangkah 4: Kalibrasi harga satuan wajar (menghapus anomali warisan portal lama)...');

	const priceRules = [
		// Amplop
		{ regex: 'AMPLOP.*KOP|AMPLOP.*A3', price: 50000 },
		{ regex: 'AMPLOP.*A4|AMPLOP.*F4', price: 35000 },
		{ regex: 'AMPLOP.*GAJI', price: 30000 },
		{ regex: 'AMPLOP.*(90|104|110|POLOS|PUTIH)', price: 25000 },
		// Kertas
		{ regex: 'KERTAS.*A4', price: 45000 },
		{ regex: 'KERTAS.*F4', price: 50000 },
		{ regex: 'KERTAS.*A3', price: 95000 },
		{ regex: 'KERTAS.*FAX', price: 25000 },
		{ regex: 'CONTINUOUS FORM', price: 280000 },
		{ regex: 'KERTAS KOP', price: 55000 },
		{ regex: 'KERTAS SERTIFIKAT', price: 65000 },
		// Bindex / Odner
		{ regex: 'BINDEX.*717|ODNER.*717', price: 32000 },
		{ regex: 'BINDEX.*777|ODNER.*777', price: 25000 },
		{ regex: 'BOX FILE', price: 28000 },
		{ regex: 'CLEAR HOLDER', price: 35000 },
		{ regex: 'BUSINESS FILE|MAP.*', price: 5000 },
		// Klip & Stapler
		{ regex: 'BINDER CLIP.*105', price: 6000 },
		{ regex: 'BINDER CLIP.*155', price: 12000 },
		{ regex: 'BINDER CLIP.*(206|260)', price: 24000 },
		{ regex: 'TRIGONAL|PAPER CLIP', price: 7500 },
		{ regex: 'ISI HEKTER KECIL|ISI CUTTER KECIL', price: 4000 },
		{ regex: 'ISI HEKTER BESAR|ISI CUTTER BESAR', price: 8000 },
		{ regex: 'CUTTER', price: 15000 },
		{ regex: 'PENCABUT HEKTER|PENCABUT STAPLES', price: 12000 },
		{ regex: 'PEMBOLONG KERTAS', price: 35000 },
		{ regex: 'STAPLER|HEKTER', price: 25000 },
		// Alat tulis & Lakban
		{ regex: 'POST IT', price: 12000 },
		{ regex: 'PULPEN|PENSIL', price: 5000 },
		{ regex: 'SPIDOL', price: 10000 },
		{ regex: 'PENGHAPUS WHITEBOARD', price: 15000 },
		{ regex: 'BAK STEMPEL', price: 18000 },
		{ regex: 'TINTA STEMPEL', price: 15000 },
		{ regex: 'LEM STICK|LEM KERTAS', price: 8000 },
		{ regex: 'ISOLASI BENING', price: 6000 },
		{ regex: 'LAKBAN', price: 15000 },
		{ regex: 'DOUBLE TAPE', price: 10000 },
		// Buku & Form Cetakan
		{ regex: 'BUKU KWITANSI', price: 8000 },
		{ regex: 'BUKU AGENDA', price: 25000 },
		{ regex: 'BUKU EKSPEDISI', price: 20000 },
		{ regex: 'CHECKLIST|INSPEKSI|FORM|SLIP GAJI|TIME CARD', price: 45000 },
		// Baterai
		{ regex: 'BATERAI.*(AA|AAA)', price: 22000 },
		{ regex: 'BATERAI.*9V|BATERAI.*KOTAK', price: 30000 },
		// Toner & Printer
		{ regex: 'TONER HP CF21[0-3]', price: 980000 },
		{ regex: 'TONER HP (CF)?226', price: 1200000 },
		{ regex: 'TONER.*W204[0-3]', price: 1200000 },
		{ regex: 'REFIL TONER|REFILL TONER', price: 250000 },
		{ regex: 'TINTA TONER EPSON', price: 110000 },
		{ regex: 'TONER.*(MLT|104|2010|Q2612)', price: 350000 },
		{ regex: 'PITA MESIN KETIK|EPSON L[XQ]', price: 45000 },
		// Materai & Sanitasi
		{ regex: 'MATERAI', price: 10000 },
		{ regex: 'WIPOL', price: 20000 },
		{ regex: 'PROCLYN', price: 12000 },
		{ regex: 'HAND SANITIZER', price: 150000 },
		{ regex: 'SABUN LIFEBUOY|SABUN DETTOL', price: 28000 },
		{ regex: 'CITRA', price: 22000 },
		{ regex: 'SPANDUK', price: 75000 },
		{ regex: 'STIKER JAGA JARAK', price: 15000 },
		{ regex: 'BENDERA', price: 35000 },
		{ regex: 'PISAU.*RUMPUT', price: 75000 }
	];

	// Terapkan harga wajar ke ga.stationery_items
	const allGa = await sql`SELECT id, name, unit_price_estimate FROM ga.stationery_items`;
	let priceAdjusted = 0;

	for (const item of allGa) {
		const currentPrice = parseFloat(item.unit_price_estimate || '0');
		// Cari rule harga yang cocok
		let calibratedPrice = null;
		for (const r of priceRules) {
			if (new RegExp(r.regex, 'i').test(item.name)) {
				calibratedPrice = r.price;
				break;
			}
		}

		// Jika harga saat ini 0 atau > 200.000 (anomali jutaan untuk barang non-toner)
		const isTonerOrSanitizer = /TONER|SANITIZER|CONTINUOUS/i.test(item.name);
		const needsAdjustment =
			calibratedPrice &&
			(currentPrice === 0 || (currentPrice > 200000 && !isTonerOrSanitizer) || currentPrice > 2000000);

		if (needsAdjustment) {
			await sql`
				UPDATE ga.stationery_items 
				SET unit_price_estimate = ${calibratedPrice} 
				WHERE id = ${item.id}
			`;
			priceAdjusted++;
		}
	}
	console.log(`   ✓ ${priceAdjusted} item GA berhasil dikalibrasi ke harga satuan wajar.`);

	// -------------------------------------------------------------------------
	// LANGKAH 5: UPDATE master.m_materials DARI ga.stationery_items
	// (Nama UPPERCASE, Spesifikasi Lama disimpan ke spec, Stok & Harga Sinkron)
	// -------------------------------------------------------------------------
	console.log('\nLangkah 5: Menyinkronkan Nama, Spesifikasi Lama, Stok, dan Harga ke PMS...');

	const linkedPairs = await sql`
		SELECT 
			g.id as ga_id,
			g.name as ga_name,
			g.stock_quantity as ga_stock,
			g.minimum_stock as ga_min,
			g.unit_price_estimate as ga_price,
			m.id as mat_id,
			m.material_code,
			m.name as old_pms_name,
			m.spec as current_spec
		FROM ga.stationery_items g
		JOIN master.m_materials m ON m.id = g.material_id
	`;

	let syncedPmsCount = 0;
	for (const p of linkedPairs) {
		// Simpan deskripsi lama ke spec jika spec masih kosong dan nama berbeda
		let newSpec = p.current_spec;
		if (!newSpec && p.old_pms_name !== p.ga_name) {
			newSpec = p.old_pms_name;
		}

		await sql`
			UPDATE master.m_materials SET
				name = ${p.ga_name},
				spec = ${newSpec || null},
				stock = ${p.ga_stock},
				min_stock = ${p.ga_min},
				standard_price = ${p.ga_price},
				updated_at = NOW()
			WHERE id = ${p.mat_id}
		`;
		syncedPmsCount++;
	}
	console.log(`   ✓ ${syncedPmsCount} item material di master.m_materials berhasil disinkronkan 100% dengan GA.`);

	// -------------------------------------------------------------------------
	// REKAP HASIL AKHIR
	// -------------------------------------------------------------------------
	const [finalGaTotal] = await sql`SELECT COUNT(*)::int as c FROM ga.stationery_items`;
	const [finalLinkedTotal] = await sql`SELECT COUNT(*)::int as c FROM ga.stationery_items WHERE material_id IS NOT NULL`;
	const [totalValuation] = await sql`SELECT SUM(stock_quantity * unit_price_estimate)::numeric as val FROM ga.stationery_items`;

	console.log('\n======================================================');
	console.log('REKAP HASIL HARMONISASI & SINKRONISASI:');
	console.log(`- Total Katalog Item GA        : ${finalGaTotal.c} item`);
	console.log(`- Terhubung Resmi ke PMS       : ${finalLinkedTotal.c} item (100%)`);
	console.log(`- Valuasi Stok Gudang Aktual   : Rp ${Number(totalValuation.val || 0).toLocaleString('id-ID')}`);
	console.log('======================================================\n');

	process.exit(0);
}

run().catch((err) => {
	console.error('Fatal Error during harmonization:', err);
	process.exit(1);
});
