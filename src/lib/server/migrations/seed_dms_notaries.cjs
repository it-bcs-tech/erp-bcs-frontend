const postgres = require('postgres');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db';
const sql = postgres(DATABASE_URL);

const notaries = [
	{ id: 1, name: 'Arry Supratno, S.H.', is_active: true },
	{ id: 2, name: 'Edwin, S.H., M.Kn', is_active: true },
	{ id: 3, name: 'Hapendi Harahap, S.H.', is_active: true },
	{ id: 4, name: 'Irma Bonita, S.H.', is_active: true },
	{ id: 5, name: 'Mohamad Toha, S.H.', is_active: true },
	{ id: 6, name: 'Nurdiah Nurdin Bachtiar Marzuki, S.H.', is_active: true },
	{ id: 7, name: 'Ny. Agustina Junaedi, S.H.', is_active: true },
	{ id: 8, name: 'Ny. Hj Julia Chairani Rachman, S.H., M.kn', is_active: true },
	{ id: 9, name: 'Ny. Izzat Chanun Sukowijono, S.H.', is_active: true },
	{ id: 10, name: 'Ny. Masneri, S.H.', is_active: true },
	{ id: 11, name: 'Ny. Ratna Komala Komar, S.H.', is_active: true },
	{ id: 12, name: 'Ny. Soemarlik, S.H.', is_active: true },
	{ id: 13, name: 'Rahayu Ningsih, S.H.', is_active: true },
	{ id: 14, name: 'Rini Fajarini Dewi, S.H., M.Kn', is_active: true },
	{ id: 15, name: 'Sofia Rachmawati, S.H.', is_active: true },
	{ id: 16, name: 'Subandiyah Ammar Asof, S.H.', is_active: true },
	{ id: 17, name: 'Subuh Priyambodo, S.H.', is_active: true },
	{ id: 18, name: 'Tabrani, S.H.', is_active: true },
	{ id: 19, name: 'Utiek R. Aburachman, S.H., M.LI., M.Kn', is_active: true },
	{ id: 20, name: 'Zulkarnaen, S.H.', is_active: true },
	{ id: 21, name: 'Rohani, S.H., M.Kn', is_active: true },
	{ id: 22, name: 'Musawamah, S.H.', is_active: true },
	{ id: 23, name: 'Jennifer Thomasyadi, S.H., M.Kn', is_active: true },
	{ id: 24, name: 'Ghibson Thomasyadi, S.H., M.Kn', is_active: true },
	{ id: 25, name: 'M.GHAILAN ADAMSIK,SH,M.Kn', is_active: true },
	{ id: 26, name: 'ALEXANDER WIJAYA,S.H.,Mkn', is_active: true },
	{ id: 27, name: 'Fitria Ayu Utami,S.H,M.Kn', is_active: true },
	{ id: 28, name: 'Stevanus Yolandi Aruan, S.H.,M.Kn', is_active: true },
	{ id: 29, name: 'Widijono, S.H.MM', is_active: true },
	{ id: 30, name: 'Nurlaelah,S.H.,M.Kn', is_active: true },
	{ id: 31, name: 'Nurlaelah,S.H.,M.Kn (Duplikat)', is_active: false }
];

async function run() {
	console.log('=== MEMULAI MIGRASI MASTER NOTARIS DARI db/notaris.sql KE dms.m_notary ===');

	// 1. Pastikan kolom legacy_id ada
	await sql`
		ALTER TABLE dms.m_notary 
		ADD COLUMN IF NOT EXISTS legacy_id INT UNIQUE;
	`;
	await sql`
		CREATE INDEX IF NOT EXISTS idx_m_notary_legacy_id ON dms.m_notary(legacy_id);
	`;
	await sql`
		CREATE INDEX IF NOT EXISTS idx_m_notary_name ON dms.m_notary(name);
	`;
	console.log('✓ Kolom legacy_id dan indeks siap.');

	// 2. Insert atau Update data notaris
	let inserted = 0;
	for (const n of notaries) {
		await sql`
			INSERT INTO dms.m_notary (legacy_id, name, is_active)
			VALUES (${n.id}, ${n.name}, ${n.is_active})
			ON CONFLICT (legacy_id) DO UPDATE 
			SET name = EXCLUDED.name,
			    is_active = EXCLUDED.is_active;
		`;
		inserted++;
	}
	console.log(`✓ Berhasil memigrasi ${inserted} data Notaris ke dms.m_notary.`);

	// 3. Verifikasi jumlah data
	const [{ count }] = await sql`SELECT COUNT(*)::int as count FROM dms.m_notary`;
	const activeList = await sql`
		SELECT id, legacy_id, name, is_active 
		FROM dms.m_notary 
		ORDER BY legacy_id ASC 
		LIMIT 5
	`;
	console.log(`✓ Total Notaris di database saat ini: ${count}`);
	console.log('Sample Data:', activeList);

	process.exit(0);
}

run().catch((err) => {
	console.error('Error migrasi notaris:', err);
	process.exit(1);
});
