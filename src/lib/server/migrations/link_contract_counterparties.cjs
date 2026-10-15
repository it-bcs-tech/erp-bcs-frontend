const fs = require('fs');
const path = require('path');
const postgres = require('postgres');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db';
const sql = postgres(DATABASE_URL);

async function run() {
	console.log('=== MEMULAI PENAUTAN LENGKAP REKANAN KONTRAK DMS ===');

	// 1. Baca dan parse db/customer.sql
	const custPath = path.join(process.cwd(), 'db/customer.sql');
	const custSql = fs.readFileSync(custPath, 'utf-8');

	const custMatches = [...custSql.matchAll(/\(([0-9]+),\s*'([^']*)',\s*([0-9]+),\s*'([^']*)',\s*(NULL|'[^']*'),\s*(NULL|'[^']*'),\s*(NULL|'[^']*'),\s*(NULL|'[^']*'),\s*(NULL|'[^']*'),\s*(NULL|'[^']*')/g)];
	const custMap = {};
	custMatches.forEach(m => {
		custMap[m[1]] = {
			id: parseInt(m[1]),
			name: m[2].trim(),
			entityId: parseInt(m[3]),
			address: m[4] !== 'NULL' ? m[4].replace(/'/g, '').trim() : '',
			code: m[10] !== 'NULL' ? m[10].replace(/'/g, '').trim() : ''
		};
	});
	console.log(`Parsed ${Object.keys(custMap).length} entitas rekanan dari db/customer.sql.`);

	// 2. Baca master.m_customer dan master.m_vendor dari PostgreSQL
	const pgCustomers = await sql`SELECT id, kode_kustomer, nama_kustomer FROM master.m_customer`;
	const pgVendors = await sql`SELECT id, kode_vendor, nama_vendor, alias FROM master.m_vendor`;

	function norm(s) {
		if (!s) return '';
		return s.toUpperCase().replace(/[^A-Z0-9]/g, '').replace('PT', '').replace('CV', '').replace('TBK', '').trim();
	}

	const custByName = new Map();
	const custByCode = new Map();
	pgCustomers.forEach(c => {
		if (c.nama_kustomer) custByName.set(norm(c.nama_kustomer), c.id);
		if (c.kode_kustomer) custByCode.set(c.kode_kustomer.toUpperCase(), c.id);
	});

	const vendByName = new Map();
	pgVendors.forEach(v => {
		if (v.nama_vendor) vendByName.set(norm(v.nama_vendor), v.id);
		if (v.alias) vendByName.set(norm(v.alias), v.id);
	});

	// Ambil seluruh dokumen kontrak dari dms.documents
	const allDocs = await sql`
		SELECT id, doc_number, metadata
		FROM dms.documents
		WHERE metadata IS NOT NULL
	`;
	console.log(`Memeriksa ${allDocs.length} total dokumen di dms.documents...`);

	function getBaseMeta(meta) {
		if (Array.isArray(meta)) {
			let base = {};
			for (const item of meta) {
				if (typeof item === 'object' && item !== null) {
					base = { ...base, ...item };
				} else if (typeof item === 'string') {
					try {
						base = { ...base, ...JSON.parse(item) };
					} catch (e) {}
				}
			}
			return base;
		}
		return typeof meta === 'object' && meta !== null ? { ...meta } : {};
	}

	// Klasifikasikan header vs detail
	const headerDocs = [];
	const detailDocs = [];

	for (const doc of allDocs) {
		const meta = getBaseMeta(doc.metadata);
		if (meta.legacy_table === 'contract_header' || (meta.legacy_customer_id && !meta.is_addendum)) {
			headerDocs.push({ id: doc.id, doc_number: doc.doc_number, meta });
		} else if (meta.legacy_table === 'contract_detail' || meta.is_addendum || meta.parent_legacy_id) {
			detailDocs.push({ id: doc.id, doc_number: doc.doc_number, meta });
		}
	}

	console.log(`Ditemukan:`);
	console.log(`- Kontrak Header: ${headerDocs.length}`);
	console.log(`- Kontrak Detail (Adendum): ${detailDocs.length}`);

	// 3. Proses Header
	console.log('\n--- Memproses Header ---');
	let headerUpdated = 0;
	let headerCustFk = 0;
	let headerVendFk = 0;
	const parentMap = {};

	for (const h of headerDocs) {
		const custId = h.meta.legacy_customer_id;
		const cust = custMap[custId];

		let partnerId = null;
		let vendorId = null;
		let partnerName = cust ? cust.name : (h.meta.partner_name || null);
		let partnerCode = cust ? cust.code : (h.meta.partner_code || null);
		let partnerAddress = cust ? cust.address : (h.meta.partner_address || null);
		let partnerType = 'COUNTERPARTY';

		if (cust) {
			if (cust.code && custByCode.has(cust.code.toUpperCase())) {
				partnerId = custByCode.get(cust.code.toUpperCase());
				partnerType = 'CUSTOMER';
			} else if (custByName.has(norm(cust.name))) {
				partnerId = custByName.get(norm(cust.name));
				partnerType = 'CUSTOMER';
			} else if (vendByName.has(norm(cust.name))) {
				vendorId = vendByName.get(norm(cust.name));
				partnerType = 'VENDOR';
			}
		}

		const mergedMeta = {
			...h.meta,
			partner_name: partnerName,
			partner_code: partnerCode,
			partner_address: partnerAddress,
			partner_type: partnerType
		};
		if (vendorId) mergedMeta.vendor_id = vendorId;

		const legId = String(h.meta.legacy_id);
		parentMap[legId] = {
			partnerId,
			vendorId,
			partnerName,
			partnerCode,
			partnerAddress,
			partnerType
		};

		await sql`
			UPDATE dms.documents
			SET 
				partner_id = ${partnerId},
				metadata = ${sql.json(mergedMeta)},
				updated_at = NOW()
			WHERE id = ${h.id}
		`;

		headerUpdated++;
		if (partnerId) headerCustFk++;
		if (vendorId) headerVendFk++;
	}

	console.log(`Selesai Header: ${headerUpdated} terupdate (${headerCustFk} FK m_customer, ${headerVendFk} vendor_id).`);

	// 4. Proses Detail (Adendum)
	console.log('\n--- Memproses Detail (Adendum) ---');
	let detailUpdated = 0;
	let detailCustFk = 0;
	let detailVendFk = 0;

	for (const d of detailDocs) {
		const parentLegId = String(d.meta.parent_legacy_id);
		const parent = parentMap[parentLegId];

		let partnerId = parent ? parent.partnerId : null;
		let vendorId = parent ? parent.vendorId : null;
		let partnerName = parent ? parent.partnerName : (d.meta.partner_name || null);
		let partnerCode = parent ? parent.partnerCode : (d.meta.partner_code || null);
		let partnerAddress = parent ? parent.partnerAddress : (d.meta.partner_address || null);
		let partnerType = parent ? parent.partnerType : 'COUNTERPARTY';

		const mergedMeta = {
			...d.meta,
			partner_name: partnerName,
			partner_code: partnerCode,
			partner_address: partnerAddress,
			partner_type: partnerType
		};
		if (vendorId) mergedMeta.vendor_id = vendorId;

		await sql`
			UPDATE dms.documents
			SET 
				partner_id = ${partnerId},
				metadata = ${sql.json(mergedMeta)},
				updated_at = NOW()
			WHERE id = ${d.id}
		`;

		detailUpdated++;
		if (partnerId) detailCustFk++;
		if (vendorId) detailVendFk++;
	}

	console.log(`Selesai Detail: ${detailUpdated} terupdate (${detailCustFk} FK m_customer, ${detailVendFk} vendor_id).`);

	// 5. Validasi Integritas JSONB
	const typeCheck = await sql`
		SELECT jsonb_typeof(metadata) as tp, count(*)::int as cnt
		FROM dms.documents
		GROUP BY jsonb_typeof(metadata)
	`;
	console.log('\nValidasi Tipe Data JSONB metadata:');
	console.table(typeCheck);

	const sampleUpdated = await sql`
		SELECT id, doc_number, partner_id, metadata->>'partner_name' as partner_name, metadata->>'partner_type' as ptype
		FROM dms.documents
		WHERE metadata->>'partner_name' IS NOT NULL
		LIMIT 5
	`;
	console.log('\nSample Dokumen Hasil Update:');
	console.table(sampleUpdated);

	await sql.end();
}

run().catch(err => {
	console.error('Fatal error:', err);
	process.exit(1);
});
