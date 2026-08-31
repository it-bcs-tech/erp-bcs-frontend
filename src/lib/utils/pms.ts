import type { PMSCategory, PRStatus, POStatus, WRSStatus } from '$lib/types/pms';

export function formatRupiah(amount: number | string | null | undefined): string {
	if (amount === null || amount === undefined || isNaN(Number(amount))) return 'Rp 0';
	return new Intl.NumberFormat('id-ID', {
		style: 'currency',
		currency: 'IDR',
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	}).format(Number(amount));
}

export function formatNumber(num: number | string | null | undefined): string {
	if (num === null || num === undefined || isNaN(Number(num))) return '0';
	return new Intl.NumberFormat('id-ID').format(Number(num));
}

export function formatDateId(dateStr: string | null | undefined): string {
	if (!dateStr) return '-';
	try {
		const d = new Date(dateStr);
		if (isNaN(d.getTime())) return dateStr;
		return new Intl.DateTimeFormat('id-ID', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		}).format(d);
	} catch {
		return dateStr;
	}
}

export function getCategoryBadge(cat: string | null | undefined): { label: string; badgeClass: string; icon: string } {
	switch (cat?.toUpperCase()) {
		case 'PACKAGING':
			return { label: 'Packaging', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800', icon: 'inventory_2' };
		case 'TRANSPORT':
			return { label: 'Transport', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800', icon: 'local_shipping' };
		case 'WAREHOUSE':
			return { label: 'Warehouse', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800', icon: 'warehouse' };
		case 'SUPPORTING':
		default:
			return { label: 'Supporting', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800', icon: 'construction' };
	}
}

export function getPOStatusBadge(status: string | null | undefined): { label: string; badgeClass: string; icon: string } {
	switch (status?.toUpperCase()) {
		case 'CONFIRMED':
		case 'APPROVED':
			return { label: 'Confirmed / Approved', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: 'check_circle' };
		case 'PARTIAL_RECEIVED':
			return { label: 'Sebagian Diterima', badgeClass: 'bg-amber-100 text-amber-800 border-amber-300', icon: 'pending_actions' };
		case 'COMPLETED':
			return { label: 'Selesai (Completed)', badgeClass: 'bg-sky-100 text-sky-800 border-sky-300', icon: 'task_alt' };
		case 'CANCELLED':
			return { label: 'Dibatalkan', badgeClass: 'bg-rose-100 text-rose-800 border-rose-300', icon: 'cancel' };
		case 'DRAFT':
		default:
			return { label: 'Draft', badgeClass: 'bg-slate-100 text-slate-700 border-slate-300', icon: 'edit_note' };
	}
}

export function getPRStatusBadge(status: string | null | undefined): { label: string; badgeClass: string; icon: string } {
	switch (status?.toUpperCase()) {
		case 'APPROVED':
			return { label: 'Disetujui', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: 'check_circle' };
		case 'PROCESSED':
			return { label: 'Sudah Dibuat PO', badgeClass: 'bg-sky-100 text-sky-800 border-sky-300', icon: 'shopping_bag' };
		case 'REJECTED':
			return { label: 'Ditolak', badgeClass: 'bg-rose-100 text-rose-800 border-rose-300', icon: 'cancel' };
		case 'PENDING':
			return { label: 'Menunggu Approval', badgeClass: 'bg-amber-100 text-amber-800 border-amber-300', icon: 'hourglass_top' };
		case 'DRAFT':
		default:
			return { label: 'Draft', badgeClass: 'bg-slate-100 text-slate-700 border-slate-300', icon: 'edit_note' };
	}
}
