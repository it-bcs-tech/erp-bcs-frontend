/**
 * db.ts — Singleton PostgreSQL client untuk server-side SvelteKit
 * Koneksi ke mybcs_db menggunakan package `postgres` (postgres.js)
 *
 * Digunakan HANYA di +page.server.ts / +server.ts (server-side only).
 * Jangan di-import di komponen Svelte atau file client-side.
 */
import postgres from 'postgres';
import { env } from '$env/dynamic/private';

const DATABASE_URL = env.DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
	throw new Error(
		'DATABASE_URL environment variable is missing! Please configure it in your .env file or environment variables.'
	);
}

// Singleton — satu koneksi pool untuk seluruh app
export const sql = postgres(DATABASE_URL, {
	max: 10,
	idle_timeout: 30,
	connect_timeout: 10,
	// Tidak pakai camelCase transform — field names tetap snake_case
});

export default sql;
