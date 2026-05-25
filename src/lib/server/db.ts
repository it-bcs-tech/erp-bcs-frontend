/**
 * db.ts — Singleton PostgreSQL client untuk server-side SvelteKit
 * Koneksi ke mybcs_db (Docker) menggunakan package `postgres` (postgres.js)
 *
 * Digunakan HANYA di +page.server.ts / +server.ts (server-side only).
 * Jangan di-import di komponen Svelte atau file client-side.
 */
import postgres from 'postgres';

const DATABASE_URL =
	process.env.DATABASE_URL ??
	'postgresql://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db';

// Singleton — satu koneksi pool untuk seluruh app
const sql = postgres(DATABASE_URL, {
	max: 5,
	idle_timeout: 30,
	connect_timeout: 10,
	// Tidak pakai camelCase transform — field names tetap snake_case
});

export default sql;
