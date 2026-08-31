export type DMSEntityType = 'FLEET' | 'DRIVER' | 'CUSTOMER' | 'CORPORATE';

export type DMSStatus = 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'RENEWAL_IN_PROGRESS' | 'REVOKED';

export type DMSPhysicalStatus = 'IN_STORAGE' | 'BORROWED' | 'ARCHIVED_OFFSITE';

export type ExpiryGateLevel = 'VALID' | 'WARNING_60' | 'CRITICAL_30' | 'URGENT_7' | 'EXPIRED' | 'NO_EXPIRY';

export interface DocumentItem {
	id: string;
	doc_number: string | null;
	doc_type_id: string | null;
	type_code?: string;
	type_name?: string;
	title: string;
	entity_type: DMSEntityType;
	partner_id?: string | null;
	partner_name?: string | null;
	asset_id?: string | number | null;
	unit_number?: string | null;
	unit_plate?: string | null;
	employee_id?: string | number | null;
	driver_name?: string | null;
	driver_payroll_id?: string | null;
	notary_id?: string | null;
	notary_name?: string | null;
	issuer_id?: string | null;
	issuer_name?: string | null;
	filing_location_id?: string | null;
	filing_location_name?: string | null;
	filing_location_code?: string | null;
	issue_date: string | null;
	expiry_date: string | null;
	status: DMSStatus;
	current_version: number;
	physical_status: DMSPhysicalStatus;
	qr_code_id: string | null;
	file_path?: string | null;
	notes?: string | null;
	metadata?: Record<string, any> | null;
	created_at: string;
	updated_at: string;
	created_by?: string | null;
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
