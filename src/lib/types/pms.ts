export type PMSCategory = 'PACKAGING' | 'TRANSPORT' | 'WAREHOUSE' | 'SUPPORTING';

export type PRStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSED' | 'CLOSED';
export type POStatus = 'DRAFT' | 'CONFIRMED' | 'APPROVED' | 'PARTIAL_RECEIVED' | 'COMPLETED' | 'CANCELLED';
export type WRSStatus = 'DRAFT' | 'RECEIVED' | 'VERIFIED' | 'CANCELLED';

export interface PMSVendor {
	id: string;
	kode_kustomer: string;
	nama_kustomer: string;
	alias?: string;
	city?: string;
	alamat?: string;
	email?: string;
	phone?: string;
	contact_person?: string;
	is_active: boolean;
}

export interface PMSSite {
	id: number;
	loc_code: string;
	loc_name: string;
	alias?: string;
	contact_person?: string;
	phone?: string;
	address_1?: string;
	address_2?: string;
	city?: string;
	state?: string;
}

export interface PMSProject {
	id: number;
	project_code?: string;
	project_name: string;
	site_id?: number;
	site_name?: string;
	site_alias?: string;
	category?: string;
	remarks?: string;
	is_active: boolean;
}

export interface PMSMaterial {
	id: number;
	material_code: string;
	name: string;
	type_code?: string;
	type_name?: string;
	category_code?: string;
	category_name?: string;
	model?: string;
	brand?: string;
	part_no?: string;
	spec?: string;
	uom: string;
	stock: number;
	min_stock: number;
	max_stock: number;
	standard_price: number;
	location_id?: number;
	location_name?: string;
	is_active: boolean;
}

export interface PurchaseRequestItem {
	id?: number;
	item_id: number;
	material_code?: string;
	name?: string;
	spec?: string;
	uom?: string;
	qty_requested: number;
	remarks?: string;
}

export interface PurchaseRequest {
	id: number;
	pr_number: string;
	date: string;
	department: string;
	requested_by: string;
	project_id?: number;
	project_name?: string;
	site_id?: number;
	site_name?: string;
	category: PMSCategory;
	required_date?: string;
	status: PRStatus;
	notes?: string;
	created_at: string;
	created_by?: string;
	items?: PurchaseRequestItem[];
}

export interface PurchaseOrderItem {
	id?: number;
	item_id: number;
	pr_line_id?: number;
	material_code?: string;
	name?: string;
	spec?: string;
	brand?: string;
	uom?: string;
	qty_ordered: number;
	unit_price: number;
	tax_amount: number;
	total: number;
	qty_received?: number;
	qty_outstanding?: number;
}

export interface PurchaseOrder {
	id: number;
	po_number: string;
	date: string;
	vendor_id: string;
	vendor_name?: string;
	vendor_code?: string;
	project_id?: number;
	project_name?: string;
	site_id?: number;
	site_name?: string;
	category: PMSCategory;
	shipment_date?: string;
	shipment_location?: string;
	ref_no?: string;
	due_date?: string;
	currency: string;
	discount_percent: number;
	vat_percent: number;
	subtotal: number;
	tax_amount: number;
	total_amount: number;
	status: POStatus;
	notes?: string;
	wrs_notes?: string;
	items?: PurchaseOrderItem[];
}

export interface GoodsReceiptItem {
	id?: number;
	item_id: number;
	po_line_id?: number;
	material_code?: string;
	name?: string;
	uom?: string;
	qty_received: number;
}

export interface GoodsReceipt {
	id: number;
	gr_number: string;
	date: string;
	po_id: number;
	po_number?: string;
	supplier_id?: string;
	supplier_name?: string;
	site_id?: number;
	site_name?: string;
	vendor_delivery_number?: string;
	status: WRSStatus;
	notes?: string;
	created_by?: string;
	created_at: string;
	items?: GoodsReceiptItem[];
}
