import sql from '$lib/server/db';
import type { ExpiryGateLevel, DMSStatus } from '$lib/types/dms';

/**
 * Menghitung sisa hari dan tingkat alert gate masa berlaku dokumen
 */
export function calculateExpiryGate(expiryDate: string | Date | null, manualStatus?: string): {
	daysRemaining: number | null;
	gateLevel: ExpiryGateLevel;
	computedStatus: DMSStatus;
} {
	if (!expiryDate) {
		return {
			daysRemaining: null,
			gateLevel: 'NO_EXPIRY',
			computedStatus: (manualStatus as DMSStatus) || 'ACTIVE'
		};
	}

	const exp = new Date(expiryDate);
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	exp.setHours(0, 0, 0, 0);

	const diffTime = exp.getTime() - today.getTime();
	const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

	if (manualStatus === 'RENEWAL_IN_PROGRESS') {
		return {
			daysRemaining,
			gateLevel: daysRemaining < 0 ? 'EXPIRED' : daysRemaining <= 7 ? 'URGENT_7' : daysRemaining <= 30 ? 'CRITICAL_30' : 'WARNING_60',
			computedStatus: 'RENEWAL_IN_PROGRESS'
		};
	}

	if (manualStatus === 'REVOKED') {
		return {
			daysRemaining,
			gateLevel: 'NO_EXPIRY',
			computedStatus: 'REVOKED'
		};
	}

	if (daysRemaining < 0) {
		return {
			daysRemaining,
			gateLevel: 'EXPIRED',
			computedStatus: 'EXPIRED'
		};
	}

	if (daysRemaining <= 7) {
		return {
			daysRemaining,
			gateLevel: 'URGENT_7',
			computedStatus: 'EXPIRING_SOON'
		};
	}

	if (daysRemaining <= 30) {
		return {
			daysRemaining,
			gateLevel: 'CRITICAL_30',
			computedStatus: 'EXPIRING_SOON'
		};
	}

	if (daysRemaining <= 60) {
		return {
			daysRemaining,
			gateLevel: 'WARNING_60',
			computedStatus: 'EXPIRING_SOON'
		};
	}

	return {
		daysRemaining,
		gateLevel: 'VALID',
		computedStatus: 'ACTIVE'
	};
}

/**
 * Mencatat audit trail dokumen (ISO 27001)
 */
export async function logDocumentAudit({
	documentId,
	action,
	userId = 'system',
	userName = 'Staff ERP',
	details = {},
	ipAddress = null
}: {
	documentId: string;
	action: 'CREATE' | 'VIEW' | 'DOWNLOAD' | 'UPDATE' | 'RENEW' | 'CUSTODY_CHECKOUT' | 'CUSTODY_CHECKIN' | 'DELETE';
	userId?: string;
	userName?: string;
	details?: Record<string, any>;
	ipAddress?: string | null;
}) {
	try {
		await sql`
			INSERT INTO dms.document_audit_logs (
				document_id,
				action,
				user_id,
				user_name,
				details,
				ip_address
			) VALUES (
				${documentId},
				${action},
				${userId},
				${userName},
				${sql.json(details)},
				${ipAddress}
			)
		`;
	} catch (err) {
		console.error('[DMS Audit Log Error]:', err);
	}
}
