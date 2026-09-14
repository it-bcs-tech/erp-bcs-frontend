const postgres = require('postgres');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db';
const sql = postgres(DATABASE_URL, { connect_timeout: 10 });

async function migrate() {
	console.log('🚀 Memulai migrasi skema tabel LMS di schema hris...');

	// 1. Courses Table
	await sql`
		CREATE TABLE IF NOT EXISTS hris.lms_courses (
			id VARCHAR(50) PRIMARY KEY,
			title VARCHAR(255) NOT NULL,
			category VARCHAR(100) NOT NULL,
			level VARCHAR(50) DEFAULT 'Beginner',
			status VARCHAR(50) DEFAULT 'Published',
			duration_hours NUMERIC(5, 2) DEFAULT 1.0,
			modules_count INT DEFAULT 0,
			enrolled_count INT DEFAULT 0,
			completion_rate NUMERIC(5, 2) DEFAULT 0,
			rating NUMERIC(3, 2) DEFAULT 5.0,
			instructor VARCHAR(255),
			description TEXT,
			tags TEXT[] DEFAULT '{}',
			passing_grade INT DEFAULT 75,
			thumbnail_url TEXT,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);
	`;
	console.log('✓ Table hris.lms_courses ready');

	// 2. Modules Table
	await sql`
		CREATE TABLE IF NOT EXISTS hris.lms_modules (
			id VARCHAR(50) PRIMARY KEY,
			course_id VARCHAR(50) REFERENCES hris.lms_courses(id) ON DELETE CASCADE,
			sequence INT NOT NULL,
			title VARCHAR(255) NOT NULL,
			type VARCHAR(50) NOT NULL,
			duration_text VARCHAR(50),
			content_url TEXT,
			content_body TEXT,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);
	`;
	console.log('✓ Table hris.lms_modules ready');

	// 3. Quiz Questions Table (Pre-Test, Post-Test, Safety-Test)
	await sql`
		CREATE TABLE IF NOT EXISTS hris.lms_quiz_questions (
			id SERIAL PRIMARY KEY,
			course_id VARCHAR(50) REFERENCES hris.lms_courses(id) ON DELETE CASCADE,
			module_id VARCHAR(50),
			quiz_type VARCHAR(50) DEFAULT 'POST_TEST',
			question_text TEXT NOT NULL,
			options JSONB NOT NULL,
			correct_key VARCHAR(10) NOT NULL,
			explanation TEXT
		);
	`;
	console.log('✓ Table hris.lms_quiz_questions ready');

	// 4. Enrollments Table
	await sql`
		CREATE TABLE IF NOT EXISTS hris.lms_enrollments (
			id SERIAL PRIMARY KEY,
			course_id VARCHAR(50) REFERENCES hris.lms_courses(id) ON DELETE CASCADE,
			payroll_id VARCHAR(50) NOT NULL,
			employee_name VARCHAR(255),
			status VARCHAR(50) DEFAULT 'NOT_STARTED',
			progress_percent NUMERIC(5, 2) DEFAULT 0,
			completed_modules_count INT DEFAULT 0,
			total_modules_count INT DEFAULT 0,
			pre_test_score NUMERIC(5, 2),
			post_test_score NUMERIC(5, 2),
			enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			completed_at TIMESTAMP,
			deadline TIMESTAMP,
			has_certificate BOOLEAN DEFAULT FALSE,
			certificate_number VARCHAR(100)
		);
	`;
	console.log('✓ Table hris.lms_enrollments ready');

	// 5. Certificates Table
	await sql`
		CREATE TABLE IF NOT EXISTS hris.lms_certificates (
			certificate_number VARCHAR(100) PRIMARY KEY,
			payroll_id VARCHAR(50) NOT NULL,
			employee_name VARCHAR(255) NOT NULL,
			course_id VARCHAR(50) REFERENCES hris.lms_courses(id) ON DELETE CASCADE,
			course_title VARCHAR(255) NOT NULL,
			category VARCHAR(100),
			score NUMERIC(5, 2) NOT NULL,
			issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			valid_until TIMESTAMP,
			qr_verify_url TEXT
		);
	`;
	console.log('✓ Table hris.lms_certificates ready');

	// 6. Training Sessions Table
	await sql`
		CREATE TABLE IF NOT EXISTS hris.lms_sessions (
			id VARCHAR(50) PRIMARY KEY,
			course_id VARCHAR(50),
			title VARCHAR(255) NOT NULL,
			trainer VARCHAR(255) NOT NULL,
			session_type VARCHAR(50) NOT NULL,
			location_or_link TEXT NOT NULL,
			session_date DATE NOT NULL,
			start_time VARCHAR(10),
			end_time VARCHAR(10),
			target_role VARCHAR(100),
			quota INT DEFAULT 30,
			enrolled_count INT DEFAULT 0,
			status VARCHAR(50) DEFAULT 'SCHEDULED',
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);
	`;
	console.log('✓ Table hris.lms_sessions ready');

	// 7. Session Attendances Table
	await sql`
		CREATE TABLE IF NOT EXISTS hris.lms_session_attendances (
			id SERIAL PRIMARY KEY,
			session_id VARCHAR(50) REFERENCES hris.lms_sessions(id) ON DELETE CASCADE,
			payroll_id VARCHAR(50) NOT NULL,
			employee_name VARCHAR(255) NOT NULL,
			department VARCHAR(100),
			status VARCHAR(50) DEFAULT 'HADIR',
			attended_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			notes TEXT
		);
	`;
	console.log('✓ Table hris.lms_session_attendances ready');

	// 8. Kirkpatrick Level 1 (Reaction) Table
	await sql`
		CREATE TABLE IF NOT EXISTS hris.lms_evaluations_l1 (
			id SERIAL PRIMARY KEY,
			course_id VARCHAR(50) REFERENCES hris.lms_courses(id) ON DELETE CASCADE,
			payroll_id VARCHAR(50) NOT NULL,
			employee_name VARCHAR(255),
			content_rating INT CHECK (content_rating BETWEEN 1 AND 5),
			instructor_rating INT CHECK (instructor_rating BETWEEN 1 AND 5),
			facility_rating INT CHECK (facility_rating BETWEEN 1 AND 5),
			recommendation_rating INT CHECK (recommendation_rating BETWEEN 1 AND 5),
			feedback_notes TEXT,
			submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);
	`;
	console.log('✓ Table hris.lms_evaluations_l1 ready');

	// 9. Kirkpatrick Level 3 & 4 (Behavior & Business Impact) Table
	await sql`
		CREATE TABLE IF NOT EXISTS hris.lms_evaluations_l3_l4 (
			id SERIAL PRIMARY KEY,
			course_id VARCHAR(50) REFERENCES hris.lms_courses(id) ON DELETE CASCADE,
			payroll_id VARCHAR(50) NOT NULL,
			employee_name VARCHAR(255) NOT NULL,
			supervisor_name VARCHAR(255) NOT NULL,
			due_date DATE,
			status VARCHAR(50) DEFAULT 'PENDING',
			behavior_score INT CHECK (behavior_score BETWEEN 1 AND 5),
			sop_compliance_score INT CHECK (sop_compliance_score BETWEEN 1 AND 5),
			business_impact_score INT CHECK (business_impact_score BETWEEN 1 AND 5),
			incident_reduction_notes TEXT,
			supervisor_notes TEXT,
			reviewed_at TIMESTAMP
		);
	`;
	console.log('✓ Table hris.lms_evaluations_l3_l4 ready');

	// 10. Training by Request Table
	await sql`
		CREATE TABLE IF NOT EXISTS hris.lms_training_requests (
			id VARCHAR(50) PRIMARY KEY,
			dept_name VARCHAR(100) NOT NULL,
			requested_by VARCHAR(255) NOT NULL,
			training_title VARCHAR(255) NOT NULL,
			category VARCHAR(100) NOT NULL,
			urgency VARCHAR(50) DEFAULT 'NORMAL',
			estimated_participants INT DEFAULT 1,
			target_completion_date DATE,
			justification TEXT,
			status VARCHAR(50) DEFAULT 'PENDING_HRD',
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);
	`;
	console.log('✓ Table hris.lms_training_requests ready');

	console.log('🎉 Semua tabel hris.lms_* berhasil dibuat!');
	process.exit(0);
}

migrate().catch((err) => {
	console.error('❌ Error migrasi LMS:', err);
	process.exit(1);
});
