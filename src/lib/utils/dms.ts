import type { DMSStatus, ExpiryGateLevel, DMSPhysicalStatus, DMSEntityType } from '$lib/types/dms';

export function formatDateId(d: string | Date | null | undefined): string {
	if (!d) return '-';
	try {
		const dt = new Date(d);
		if (isNaN(dt.getTime())) return '-';
		return dt.toLocaleDateString('id-ID', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
	} catch {
		return '-';
	}
}

export function formatDateTimeId(d: string | Date | null | undefined): string {
	if (!d) return '-';
	try {
		const dt = new Date(d);
		if (isNaN(dt.getTime())) return '-';
		return dt.toLocaleString('id-ID', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	} catch {
		return '-';
	}
}

export function getStatusInfo(status: DMSStatus, gateLevel?: ExpiryGateLevel, daysRemaining?: number | null) {
	if (status === 'RENEWAL_IN_PROGRESS') {
		return {
			label: 'Dalam Proses Perpanjangan',
			badgeClass: 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700/50',
			icon: 'hourglass_top'
		};
	}

	if (status === 'REVOKED') {
		return {
			label: 'Dicabut / Dibatalkan',
			badgeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700',
			icon: 'block'
		};
	}

	if (status === 'EXPIRED' || gateLevel === 'EXPIRED') {
		return {
			label: 'Kadaluarsa',
			badgeClass: 'bg-rose-100 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-700/50',
			icon: 'error'
		};
	}

	if (gateLevel === 'URGENT_7') {
		return {
			label: `H-${daysRemaining} (Urgent)`,
			badgeClass: 'bg-rose-100 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-700/50 animate-pulse',
			icon: 'warning'
		};
	}

	if (gateLevel === 'CRITICAL_30') {
		return {
			label: `H-${daysRemaining} (Kritis)`,
			badgeClass: 'bg-orange-100 dark:bg-orange-950/40 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-700/50',
			icon: 'notification_important'
		};
	}

	if (gateLevel === 'WARNING_60') {
		return {
			label: `H-${daysRemaining} (Warning)`,
			badgeClass: 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700/50',
			icon: 'schedule'
		};
	}

	return {
		label: 'Aktif / Valid',
		badgeClass: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/50',
		icon: 'check_circle'
	};
}

export function getPhysicalStatusInfo(status: DMSPhysicalStatus) {
	switch (status) {
		case 'BORROWED':
			return {
				label: 'Sedang Dipinjam',
				badgeClass: 'bg-orange-100 dark:bg-orange-950/40 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-700/50',
				icon: 'output'
			};
		case 'ARCHIVED_OFFSITE':
			return {
				label: 'Arsip Luar / Gudang',
				badgeClass: 'bg-purple-100 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-700/50',
				icon: 'warehouse'
			};
		case 'IN_STORAGE':
		default:
			return {
				label: 'Tersimpan di Rak/Lemari',
				badgeClass: 'bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700/50',
				icon: 'inventory_2'
			};
	}
}

export function getEntityTypeInfo(type: DMSEntityType) {
	switch (type) {
		case 'FLEET':
			return {
				label: 'Armada / Kendaraan',
				color: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800',
				icon: 'local_shipping'
			};
		case 'DRIVER':
			return {
				label: 'Driver Operasional',
				color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800',
				icon: 'airline_seat_recline_normal'
			};
		case 'CUSTOMER':
			return {
				label: 'Mitra / Customer',
				color: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-800',
				icon: 'handshake'
			};
		case 'CORPORATE':
		default:
			return {
				label: 'Korporat / Umum',
				color: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800',
				icon: 'corporate_fare'
			};
	}
}
