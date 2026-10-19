export type DMSEntityType = 'FLEET' | 'DRIVER' | 'CUSTOMER' | 'CORPORATE' | 'VENDOR';

export type DMSStatus = 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'RENEWAL_IN_PROGRESS' | 'REVOKED';

export type DMSPhysicalStatus = 'IN_STORAGE' | 'BORROWED' | 'ARCHIVED_OFFSITE' | 'LOANED_OUT';

export type ExpiryGateLevel = 'VALID' | 'WARNING_60' | 'CRITICAL_30' | 'URGENT_7' | 'EXPIRED' | 'NO_EXPIRY';

export interface DocumentItem {
	id: string;
	doc_number: string | null;
	doc_type_id: string | null;
	type_code?: string;
	type_name?: string;
	category_id?: string | null;
	category_code?: string;
	category_name?: string;
	title: string;
	entity_type: DMSEntityType;
	partner_id?: string | null;
	partner_name?: string | null;
	asset_id?: string | number | null;
	unit_number?: string | null;
	unit_nomor?: string | null;
	unit_old_plate?: string | null;
	unit_lambung?: string | null;
	unit_type?: string | null;
	unit_plate?: string | null;
	employee_id?: string | number | null;
	driver_name?: string | null;
	driver_payroll_id?: string | null;
	driver_payroll?: string | null;
	customer_name?: string | null;
	doc_type_name?: string | null;
	notary_id?: string | null;
	notary_name?: string | null;
	issuer_id?: string | null;
	issuer_name?: string | null;
	filing_location_id?: string | null;
	filing_location_name?: string | null;
	filing_location_code?: string | null;
	issue_date: string | null;
	issue_date_str?: string | null;
	expiry_date: string | null;
	expiry_date_str?: string | null;
	status: DMSStatus;
	current_version: number;
	physical_status: DMSPhysicalStatus;
	qr_code_id: string | null;
	file_path?: string | null;
	notes?: string | null;
	metadata?: Record<string, any> | null;
	created_at: string;
	updated_at: string;
	company_id?: string | null;
	company_name?: string | null;
	company_code?: string | null;
	days_remaining?: number | null;
	gate_level?: ExpiryGateLevel;
}

export interface DocumentVersion {
	id: string;
	document_id: string;
	version_number: number;
	doc_number: string | null;
	title: string;
	issue_date: string | null;
	expiry_date: string | null;
	file_path: string | null;
	change_summary: string | null;
	metadata?: Record<string, any> | null;
	created_at: string;
	created_by: string | null;
}

export interface DocumentCustodyLog {
	id: string;
	document_id: string;
	action: 'CHECK_OUT' | 'CHECK_IN';
	borrower_name: string;
	borrower_role: string | null;
	borrow_date: string;
	expected_return_date: string | null;
	actual_return_date: string | null;
	purpose: string | null;
	notes: string | null;
	created_at: string;
	created_by: string | null;
}

export interface DocumentAuditLog {
	id: string;
	document_id: string;
	action: string;
	user_id: string | null;
	user_name: string | null;
	details: Record<string, any> | null;
	ip_address: string | null;
	created_at: string;
}

export interface DocumentCategory {
	id: string;
	code: string;
	name: string;
	description?: string | null;
	legacy_id?: number | null;
	is_active: boolean;
	created_at?: string;
	updated_at?: string;
	document_count?: number;
}

export interface CompanyItem {
	id: string;
	code: string;
	name: string;
	address?: string | null;
	phone?: string | null;
	remarks?: string | null;
	legacy_id?: number | null;
	is_active: boolean;
	created_at?: string;
	updated_at?: string;
	doc_count?: number;
}

export interface ScopeCluster {
	id: string;
	name: string;
	icon: string;
	scopes: string[];
}

export const SCOPE_CLUSTERS: ScopeCluster[] = [
	{
		id: 'INSURANCE_LEASING',
		name: 'Asuransi & Leasing',
		icon: 'verified_user',
		scopes: ['INSURANCE', 'LEASING']
	},
	{
		id: 'WAREHOUSE_PACKAGING',
		name: 'Gudang & Packaging',
		icon: 'warehouse',
		scopes: ['WAREHOUSE', 'PACKAGING', 'OPEN YARD LEASE', 'WAREHOUSE & PACKAGING', 'OFFICE LEASE', 'COIL & PALLETS']
	},
	{
		id: 'TRANSPORT_LOGISTICS',
		name: 'Transportasi & Angkutan',
		icon: 'local_shipping',
		scopes: [
			'HANDLING & TRANSPORT',
			'TRANSPORTATION CILEGON',
			'TRANSPORTATION DUMPTRUCK',
			'FORWARDING',
			'TRANSPORTATION NAROGONG',
			'HANDLING',
			'RAILWAY',
			'CUSTOMS',
			'FORKLIFT LEASE'
		]
	},
	{
		id: 'AUDITOR_CONSULTANT',
		name: 'Auditor & Konsultan',
		icon: 'account_balance',
		scopes: ['AUDITOR', 'CONSULTANT']
	},
	{
		id: 'LABOUR_SUPPLY',
		name: 'Tenaga Kerja / Labour',
		icon: 'badge',
		scopes: ['LABOUR', 'LABOUR - PLATE ROLLING PLANT', 'LABOUR - MRO CENTRA WAREHOUSE AREA', 'LABOUR - PLATE MILL']
	},
	{
		id: 'BANKING',
		name: 'Perbankan & Fasilitas',
		icon: 'account_balance_wallet',
		scopes: ['BANK']
	},
	{
		id: 'VENDOR_SECURITY_PURCHASE',
		name: 'Vendor, Satpam & Unit',
		icon: 'store',
		scopes: ['VENDOR', 'PURCHASE', 'CONSTRUCTION', 'SECURITY', 'IT']
	},
	{
		id: 'LEGAL_MOU',
		name: 'MOU & Kerja Sama',
		icon: 'handshake',
		scopes: ['MOU', 'COOPERATION', 'NDA', 'DISPOSAL ASSET']
	},
	{
		id: 'EMPTY_SCOPE',
		name: 'Historis (Tanpa Scope)',
		icon: 'history',
		scopes: []
	}
];
