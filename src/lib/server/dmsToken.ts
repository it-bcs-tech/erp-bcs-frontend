import crypto from 'crypto';
import { env } from '$env/dynamic/private';

const DOC_TOKEN_SECRET = env.AUTH_SECRET || 'bcs-secure-doc-viewer-secret-key-2026';

export interface ScopedDocPayload {
	type: 'single' | 'fleet';
	docId?: string | number;
	unitId?: string | number;
	nomorUnit?: string;
	exp?: number;
	iat?: number;
}

/**
 * Membuat signed scoped token untuk pratinjau dokumen tanpa membuka hak modul DMS
 * Default berlaku 24 jam (86400 detik)
 */
export function createScopedDocToken(payload: ScopedDocPayload, expiresInSeconds = 86400): string {
	const now = Math.floor(Date.now() / 1000);
	const data: ScopedDocPayload = {
		...payload,
		iat: now,
		exp: now + expiresInSeconds
	};

	const jsonStr = JSON.stringify(data);
	const encodedPayload = Buffer.from(jsonStr).toString('base64url');

	const hmac = crypto.createHmac('sha256', DOC_TOKEN_SECRET);
	hmac.update(encodedPayload);
	const signature = hmac.digest('base64url');

	return `${encodedPayload}.${signature}`;
}

/**
 * Memvalidasi signed token dokumen
 */
export function verifyScopedDocToken(token: string): ScopedDocPayload | null {
	if (!token || typeof token !== 'string') return null;

	const parts = token.split('.');
	if (parts.length !== 2) return null;

	const [encodedPayload, signature] = parts;

	const hmac = crypto.createHmac('sha256', DOC_TOKEN_SECRET);
	hmac.update(encodedPayload);
	const expectedSignature = hmac.digest('base64url');

	if (signature !== expectedSignature) {
		return null; // Signature invalid/tampered
	}

	try {
		const jsonStr = Buffer.from(encodedPayload, 'base64url').toString('utf8');
		const data: ScopedDocPayload = JSON.parse(jsonStr);

		const now = Math.floor(Date.now() / 1000);
		if (data.exp && data.exp < now) {
			return null; // Token expired
		}

		return data;
	} catch {
		return null;
	}
}

/**
 * Helper pembentuk URL viewer tunggal
 */
export function getSingleDocViewUrl(docId: string | number): string {
	const token = createScopedDocToken({ type: 'single', docId });
	return `/view-doc?token=${token}`;
}

/**
 * Helper pembentuk URL viewer armada terpadu
 */
export function getFleetDocsViewUrl(unitId: string | number, nomorUnit?: string): string {
	const token = createScopedDocToken({ type: 'fleet', unitId, nomorUnit });
	return `/view-doc/fleet?token=${token}`;
}
