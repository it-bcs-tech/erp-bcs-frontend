/**
 * pmsNumbering.ts
 * Utilitas dan formula penomoran otomatis untuk modul pengadaan (PMS):
 * - Purchase Request (PR): [Counter]/[Tipe Order (BO/RO/ES/IO)]/[Kategori Project - Dept Code]/[MM]/[YYYY]
 *   Contoh: 123/BO/T-MTC/09/2026
 * - Purchase Order (PO): [Counter]-[Tipe/Kategori (P=Purchasing, dll)]/BCS-[Payment Term/DP/dll]/[Site Alias / Project Alias]/[Bulan Romawi (IX)]/[Tahun]
 *   Contoh: 321-P/BCS-DP/LTN/IX/2026
 */

export const ORDER_TYPES = [
	{ value: 'RO', code: 'RO', label: 'RO - Reguler Order', desc: 'Pesanan reguler / rutin operasional' },
	{ value: 'BO', code: 'BO', label: 'BO - By Order', desc: 'Pesanan khusus berdasarkan order/permintaan proyek' },
	{ value: 'ES', code: 'ES', label: 'ES - Emergency Stock', desc: 'Kebutuhan darurat / stok mendesak' },
	{ value: 'IO', code: 'IO', label: 'IO - Internal Order', desc: 'Kebutuhan internal antar departemen/unit' }
] as const;

export type OrderTypeValue = (typeof ORDER_TYPES)[number]['value'];

export const PO_PAYMENT_TERMS = [
	{ value: 'DP', code: 'DP', label: 'DP / Uang Muka (Down Payment)', days: 0 },
	{ value: 'Cash', code: 'CASH', label: 'Cash / Tunai', days: 0 },
	{ value: '7 Hari', code: 'TOP7', label: 'TOP 7 Hari', days: 7 },
	{ value: '14 Hari', code: 'TOP14', label: 'TOP 14 Hari', days: 14 },
	{ value: '30 Hari', code: 'TOP30', label: 'TOP 30 Hari', days: 30 },
	{ value: '45 Hari', code: 'TOP45', label: 'TOP 45 Hari', days: 45 },
	{ value: '60 Hari', code: 'TOP60', label: 'TOP 60 Hari', days: 60 },
	{ value: '90 Hari', code: 'TOP90', label: 'TOP 90 Hari', days: 90 },
	{ value: 'CBD', code: 'CBD', label: 'Cash Before Delivery (CBD)', days: 0 },
	{ value: 'COD', code: 'COD', label: 'Cash On Delivery (COD)', days: 0 }
];

export function toRomanMonth(month: number | string): string {
	const romans = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
	const num = typeof month === 'number' ? month : parseInt(month, 10);
	return num >= 1 && num <= 12 ? romans[num - 1] : 'I';
}

export function getCategoryCode(category?: string | null, projectCatCode?: string | null): string {
	if (projectCatCode && projectCatCode.trim()) {
		return projectCatCode.trim().toUpperCase();
	}
	const c = (category || '').toUpperCase().trim();
	if (c.includes('TRANS')) return 'T';
	if (c.includes('PACK')) return 'P';
	if (c.includes('WARE')) return 'W';
	if (c.includes('OUTS')) return 'O';
	if (c.includes('SUPP')) return 'S';
	return c ? c.charAt(0) : 'GEN';
}

export function getPaymentTermCode(term?: string | null): string {
	const t = (term || '').toUpperCase().trim();
	if (!t) return 'TOP30';
	if (t.includes('DP') || t.includes('DOWN')) return 'DP';
	if (t.includes('CASH') || t.includes('TUNAI')) return 'CASH';
	if (t.includes('CBD')) return 'CBD';
	if (t.includes('COD')) return 'COD';
	const m = t.match(/(\d+)/);
	if (m) return `TOP${m[1]}`;
	return t.replace(/[^A-Z0-9]/g, '') || 'TOP30';
}

export function generatePrNumber(params: {
	counter: number | string;
	orderType?: string | null;
	categoryCode?: string | null;
	deptCode?: string | null;
	date?: string | Date | null;
}): string {
	const d = params.date ? (typeof params.date === 'string' ? new Date(params.date) : params.date) : new Date();
	const monthNum = !isNaN(d.getTime()) ? d.getMonth() + 1 : new Date().getMonth() + 1;
	const yearNum = !isNaN(d.getTime()) ? d.getFullYear() : new Date().getFullYear();

	const mm = String(monthNum).padStart(2, '0');
	const yyyy = String(yearNum);

	const cnt =
		typeof params.counter === 'number'
			? String(params.counter).padStart(3, '0')
			: String(params.counter || '001');

	const ot = (params.orderType || 'RO').trim().toUpperCase();
	const cat = (params.categoryCode || 'GEN').trim().toUpperCase();
	const dept = (params.deptCode || 'MTC').trim().toUpperCase();

	return `${cnt}/${ot}/${cat}-${dept}/${mm}/${yyyy}`;
}

export function generatePoNumber(params: {
	counter: number | string;
	poType?: string | null;
	termCode?: string | null;
	alias?: string | null;
	date?: string | Date | null;
}): string {
	const d = params.date ? (typeof params.date === 'string' ? new Date(params.date) : params.date) : new Date();
	const monthNum = !isNaN(d.getTime()) ? d.getMonth() + 1 : new Date().getMonth() + 1;
	const yearNum = !isNaN(d.getTime()) ? d.getFullYear() : new Date().getFullYear();

	const romanMonth = toRomanMonth(monthNum);
	const yyyy = String(yearNum);

	const cnt =
		typeof params.counter === 'number'
			? String(params.counter).padStart(3, '0')
			: String(params.counter || '001');

	const pt = (params.poType || 'P').trim().toUpperCase();
	const term = (params.termCode || 'DP').trim().toUpperCase();
	const al = (params.alias || 'GEN').trim().toUpperCase();

	return `${cnt}-${pt}/BCS-${term}/${al}/${romanMonth}/${yyyy}`;
}
