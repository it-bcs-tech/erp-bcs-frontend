require('dotenv').config();
const postgres = require('postgres');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL environment variable is missing! Please configure it in .env');
const sql = postgres(DATABASE_URL);

async function migrate() {
	try {
		console.log('🔄 Menjalankan migrasi skema LMS: kategori training dan trainer magic link token...');

		// 1. Tambah kolom ke tabel hris.lms_courses
		await sql`
			ALTER TABLE hris.lms_courses 
			ADD COLUMN IF NOT EXISTS training_category VARCHAR(20) DEFAULT 'IN_HOUSE',
			ADD COLUMN IF NOT EXISTS trainer_token VARCHAR(64),
			ADD COLUMN IF NOT EXISTS trainer_token_status VARCHAR(20) DEFAULT 'ACTIVE',
			ADD COLUMN IF NOT EXISTS trainer_token_expires_at TIMESTAMPTZ,
			ADD COLUMN IF NOT EXISTS trainer_materials_url TEXT;
		`;
		console.log('✅ Kolom pada hris.lms_courses berhasil diperiksa / ditambahkan.');

		// 2. Tambah kolom ke tabel hris.lms_sessions
		await sql`
			ALTER TABLE hris.lms_sessions 
			ADD COLUMN IF NOT EXISTS training_category VARCHAR(20) DEFAULT 'IN_HOUSE',
			ADD COLUMN IF NOT EXISTS trainer_token VARCHAR(64);
		`;
		console.log('✅ Kolom pada hris.lms_sessions berhasil diperiksa / ditambahkan.');

		// 3. Pastikan data kursus yang ada memiliki default IN_HOUSE dan buat token acak jika belum ada
		const coursesWithoutToken = await sql`
			SELECT id FROM hris.lms_courses WHERE trainer_token IS NULL;
		`;

		const crypto = require('crypto');
		for (const c of coursesWithoutToken) {
			const token = crypto.randomBytes(16).toString('hex');
			await sql`
				UPDATE hris.lms_courses 
				SET 
					training_category = COALESCE(training_category, 'IN_HOUSE'),
					trainer_token = ${token},
					trainer_token_status = 'ACTIVE'
				WHERE id = ${c.id};
			`;
			await sql`
				UPDATE hris.lms_sessions 
				SET 
					training_category = COALESCE(training_category, 'IN_HOUSE'),
					trainer_token = ${token}
				WHERE course_id = ${c.id};
			`;
		}
		console.log(`✅ Berhasil mengupdate ${coursesWithoutToken.length} kursus eksisting dengan default token.`);

		// 4. Tambah index unik pada trainer_token
		await sql`
			CREATE UNIQUE INDEX IF NOT EXISTS idx_lms_courses_trainer_token 
			ON hris.lms_courses(trainer_token) 
			WHERE trainer_token IS NOT NULL;
		`;
		console.log('✅ Index unik idx_lms_courses_trainer_token aktif.');

		console.log('🎉 Migrasi LMS sukses!');
	} catch (err) {
		console.error('❌ Gagal menjalankan migrasi:', err);
		process.exit(1);
	} finally {
		await sql.end();
	}
}

migrate();
