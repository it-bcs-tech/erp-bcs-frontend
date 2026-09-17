const fs = require('fs');
const path = require('path');
const postgres = require('postgres');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db';
const sql = postgres(DATABASE_URL);

function parseCSV(text) {
	const lines = [];
	let row = [];
	let inQuotes = false;
	let val = '';
	for (let i = 0; i < text.length; i++) {
		const c = text[i];
		if (c === '"') {
			inQuotes = !inQuotes;
		} else if (c === ',' && !inQuotes) {
			row.push(val);
			val = '';
		} else if ((c === '\r' || c === '\n') && !inQuotes) {
			if (c === '\r' && text[i + 1] === '\n') i++;
			row.push(val);
			lines.push(row);
			row = [];
			val = '';
		} else {
			val += c;
		}
	}
	if (val || row.length) {
		row.push(val);
		lines.push(row);
	}
	return lines;
}

function mapCategory(cat) {
	const c = (cat || '').toUpperCase().trim();
	if (c === 'P') return 'PACKAGING';
	if (c === 'W' || c === 'NR') return 'WAREHOUSE';
	if (c === 'L' || c === 'S' || c === 'O') return 'OUTSOURCING';
	// T, H, FF, HE, D, dll
	return 'TRANSPORTATION';
}

async function migrate() {
	console.log('=== MEMULAI MIGRASI MASTER PROJECT ===');

	// 1. Lepas FK constraints sementara agar remapping & table replacement berjalan lancar
	console.log('1. Melepas foreign key constraints sementara...');
	await sql`ALTER TABLE marketing.contract DROP CONSTRAINT IF EXISTS contract_project_id_fkey`;
	await sql`ALTER TABLE marketing.sales_order DROP CONSTRAINT IF EXISTS sales_order_project_id_fkey`;
	await sql`ALTER TABLE finance.invoice_line DROP CONSTRAINT IF EXISTS invoice_line_project_id_fkey`;
	await sql`ALTER TABLE finance.dn_header DROP CONSTRAINT IF EXISTS dn_header_project_id_fkey`;

	// 2. Remap transaksi lama (PO, PR, Contract, Sales Order) ke ID project riil
	console.log('2. Melakukan remapping transaksi yang terhubung ke data dummy...');
	const remapRules = [
		{ oldId: 1, newId: 5, note: 'Dumptruck (1) -> Trans Dump Truck (5)' },
		{ oldId: 2, newId: 57, note: 'Transportation (2) -> Trans Cilegon (57)' },
		{ oldId: 6, newId: 92, note: 'Conch (6) -> WAREHOUSE CONCH (92)' }
	];

	for (const rule of remapRules) {
		console.log(`- Remapping ${rule.note}`);
		await sql`UPDATE procurement.purchase_order SET project_id = ${rule.newId} WHERE project_id = ${rule.oldId}`;
		await sql`UPDATE procurement.purchase_request SET project_id = ${rule.newId} WHERE project_id = ${rule.oldId}`;
		await sql`UPDATE marketing.contract SET project_id = ${rule.newId} WHERE project_id = ${rule.oldId}`;
		await sql`UPDATE marketing.sales_order SET project_id = ${rule.newId} WHERE project_id = ${rule.oldId}`;
	}

	// 3. Hapus data dummy lama di master.m_project
	console.log('3. Menghapus data dummy lama dari master.m_project...');
	await sql`DELETE FROM master.m_project`;

	// 4. Load sites dari master.m_lokasi untuk auto-matching site_id
	console.log('4. Membaca data lokasi untuk mencocokkan site_id...');
	const sites = await sql`SELECT id, loc_code, loc_name FROM master.m_lokasi`;
	const siteMap = new Map();
	for (const s of sites) {
		siteMap.set(s.loc_name.toUpperCase().trim(), s.id);
	}

	// 5. Baca dan parse db/project/project.csv
	console.log('5. Membaca db/project/project.csv...');
	const csvPath = path.resolve(__dirname, '../../../../db/project/project.csv');
	const csvText = fs.readFileSync(csvPath, 'utf8').trim();
	const parsed = parseCSV(csvText);
	const rows = parsed.slice(1); // skip header

	console.log(`Ditemukan ${rows.length} project dari CSV.`);

	// 6. Insert 81 record ke master.m_project
	console.log('6. Mengimpor 81 data project ke master.m_project...');
	let insertedCount = 0;

	for (const r of rows) {
		const id = parseInt(r[0]);
		const projectCode = (r[1] || '').trim();
		const p = (r[2] || '').trim();
		const siteAlias = (r[3] || '').trim();
		const catRaw = (r[4] || '').trim();
		const remarks = (r[5] || '').trim();
		const siteDesc = (r[7] || '').trim();
		const pn = (r[11] || '').trim();
		const status = (r[20] || 'Active').trim();

		const projectName = pn ? pn : (p ? p : `Project ${id}`);
		const category = mapCategory(catRaw);
		const isActive = status.toLowerCase() === 'active';

		// Matching site_id
		let siteId = null;
		const searchSite = (siteDesc + ' ' + (r[9] || '')).toUpperCase();
		for (const [name, sId] of siteMap.entries()) {
			if (searchSite.includes(name)) {
				siteId = sId;
				break;
			}
		}

		const description = siteDesc ? `Site: ${siteDesc}` : (siteAlias ? `Alias: ${siteAlias}` : null);

		await sql`
			INSERT INTO master.m_project (
				id,
				project_code,
				project_name,
				category,
				description,
				remarks,
				site_id,
				is_active,
				created_at
			) VALUES (
				${id},
				${projectCode},
				${projectName},
				${category},
				${description},
				${remarks || null},
				${siteId},
				${isActive},
				NOW()
			)
		`;
		insertedCount++;
	}

	console.log(`Berhasil mengimpor ${insertedCount} data project ke master.m_project.`);

	// 7. Reset sequence master.m_project_id_seq ke nilai max(id)
	console.log('7. Memperbarui sequence master.m_project_id_seq...');
	const [maxRow] = await sql`SELECT MAX(id) as max_id FROM master.m_project`;
	const nextVal = (maxRow.max_id || 94) + 1;
	await sql`SELECT setval('master.m_project_id_seq', ${maxRow.max_id || 94})`;
	console.log(`Sequence diatur ke ${maxRow.max_id} (insert berikutnya akan bernilai ${nextVal}).`);

	// 8. Pasang kembali FK constraints
	console.log('8. Memasang kembali foreign key constraints...');
	await sql`ALTER TABLE marketing.contract ADD CONSTRAINT contract_project_id_fkey FOREIGN KEY (project_id) REFERENCES master.m_project(id) ON DELETE SET NULL`;
	await sql`ALTER TABLE marketing.sales_order ADD CONSTRAINT sales_order_project_id_fkey FOREIGN KEY (project_id) REFERENCES master.m_project(id) ON DELETE SET NULL`;
	await sql`ALTER TABLE finance.invoice_line ADD CONSTRAINT invoice_line_project_id_fkey FOREIGN KEY (project_id) REFERENCES master.m_project(id) ON DELETE SET NULL`;
	await sql`ALTER TABLE finance.dn_header ADD CONSTRAINT dn_header_project_id_fkey FOREIGN KEY (project_id) REFERENCES master.m_project(id) ON DELETE SET NULL`;

	// 9. Verifikasi akhir
	console.log('9. Verifikasi transaksi aktif...');
	const verifiedPos = await sql`
		SELECT po.po_number, po.project_id, p.project_code, p.project_name
		FROM procurement.purchase_order po
		JOIN master.m_project p ON p.id = po.project_id
		LIMIT 5
	`;
	const verifiedPrs = await sql`
		SELECT pr.pr_number, pr.project_id, p.project_code, p.project_name
		FROM procurement.purchase_request pr
		JOIN master.m_project p ON p.id = pr.project_id
		LIMIT 5
	`;
	const verifiedContracts = await sql`
		SELECT c.id, c.project_id, p.project_code, p.project_name
		FROM marketing.contract c
		JOIN master.m_project p ON p.id = c.project_id
		LIMIT 5
	`;

	console.log('Sample PO Terhubung:', verifiedPos);
	console.log('Sample PR Terhubung:', verifiedPrs);
	console.log('Sample Contract Terhubung:', verifiedContracts);

	console.log('=== MIGRASI SELESAI DENGAN SUKSES ===');
	process.exit(0);
}

migrate().catch(err => {
	console.error('Error saat migrasi:', err);
	process.exit(1);
});
