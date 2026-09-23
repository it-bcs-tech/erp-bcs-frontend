/**
 * Auth Types — Definisi tipe data untuk sistem RBAC ERP-BCS
 * ─────────────────────────────────────────────────────────
 */

/** ID modul ERP yang tersedia */
export type ModuleId = 'fms' | 'maintenance' | 'ocs' | 'hris' | 'marketing' | 'pms' | 'kasir' | 'finance' | 'dms' | 'qhse' | 'ga';

/** Data user yang disimpan setelah login (dikirim via cookie & store) */
export interface AuthUser {
	id: number;
	name: string;
	email: string;
	role: string;            // role dari erp_users (superadmin, operator_fms, dll)
	level: string;           // level name dari m_level (Operator, Staff, Officer, Spv, Mgr, GM)
	levelSequence: number;   // urutan hierarki (0=unclassified, 1=Operator, 2=Staff, 3=Officer, 4=Spv, 5=Mgr, 6=GM)
	division: string;        // nama divisi dari m_division
	divisionCode: string;    // kode divisi (DV_41, DV_37, dll)
	titleName: string;       // nama jabatan dari m_karyawan.title atau API
	payrollId?: string | null; // NIK / Payroll ID karyawan dari m_karyawan
	allowedModules: ModuleId[];  // daftar modul yang bisa diakses
	authSource?: 'laravel' | 'svelte-db'; // sumber otentikasi saat login
}

/** Semua modul yang tersedia di ERP */
export const ALL_MODULES: ModuleId[] = ['fms', 'maintenance', 'ocs', 'hris', 'marketing', 'pms', 'kasir', 'finance', 'dms', 'qhse', 'ga'];

/** Definisi Sub-menu per modul untuk keperluan Menu-Level RBAC */
export const MODULE_MENUS: Record<string, { id: string; name: string }[]> = {
	fms: [
		{ id: 'fms.overview', name: 'Overview' },
		{ id: 'fms.vehicles', name: 'Vehicles & Trucks' },
		{ id: 'fms.drivers', name: 'Drivers & SIM' },
		{ id: 'fms.trips', name: 'Trips & Routes' },
		{ id: 'fms.maintenance', name: 'Maintenance' },
		{ id: 'fms.tires', name: 'Tire Management' },
		{ id: 'fms.fuel', name: 'Fuel Management' },
		{ id: 'fms.documents', name: 'Fleet Documents' },
		{ id: 'fms.incidents', name: 'Incident Logs' },
		{ id: 'fms.reports', name: 'Fleet Reports' },
		{ id: 'fms.live-map', name: 'Live GPS Map' },
		{ id: 'fms.route-history', name: 'Route Playback' },
		{ id: 'fms.rest-area', name: 'Rest Area & Geofence' }
	],
	hris: [
		{ id: 'hris.overview', name: 'Overview' },
		{ id: 'hris.employees', name: 'Employees' },
		{ id: 'hris.recruitment', name: 'Recruitment & ATS' },
		{ id: 'hris.lifecycle', name: 'Lifecycle & Actions' },
		{ id: 'hris.attendance', name: 'Attendance' },
		{ id: 'hris.leave', name: 'Leave Requests' },
		{ id: 'hris.payroll', name: 'Payroll & Slips' },
		{ id: 'hris.loans', name: 'Employee Loans' },
		{ id: 'hris.performance', name: 'Performance & KPI' },
		{ id: 'hris.assessments', name: 'Team Competency Assessment' },
		{ id: 'hris.lms', name: 'LMS & Training' },
		{ id: 'hris.org-chart', name: 'Org Chart & Hierarchy' },
		{ id: 'hris.certifications', name: 'Document Expiry & Certs' }
	],
	finance: [
		{ id: 'finance.overview', name: 'Overview' },
		{ id: 'finance.create-transaction', name: 'Transaction Center' },
		{ id: 'finance.invoices', name: 'Customer Invoices' },
		{ id: 'finance.vendor-bills', name: 'Vendor Bills' },
		{ id: 'finance.payments', name: 'Payment History' }
	],
	kasir: [
		{ id: 'kasir.overview', name: 'Overview' },
		{ id: 'kasir.kas-operasional', name: 'Kas & Saldo Operasional' },
		{ id: 'kasir.ujo', name: 'Pencairan UJO' },
		{ id: 'kasir.surat-jalan', name: 'Surat Jalan Balik (DN)' },
		{ id: 'kasir.closing', name: 'Closing Kasbon UJO' }
	],
	marketing: [
		{ id: 'marketing.overview', name: 'Overview' },
		{ id: 'marketing.customers', name: 'Customers' },
		{ id: 'marketing.orders', name: 'Orders & Delivery' },
		{ id: 'marketing.contracts', name: 'Customer Contracts' },
		{ id: 'marketing.pipeline', name: 'Sales Pipeline' },
		{ id: 'marketing.reports', name: 'Performance Reports' }
	],
	pms: [
		{ id: 'pms.dashboard', name: 'Dashboard Resume' },
		{ id: 'pms.master-vendors', name: 'Master Vendor' },
		{ id: 'pms.master-sites', name: 'Master Site / Lokasi' },
		{ id: 'pms.master-projects', name: 'Master Project' },
		{ id: 'pms.master-materials', name: 'Master Material' },
		{ id: 'pms.transactions-pr', name: 'Purchase Request (PR)' },
		{ id: 'pms.transactions-po', name: 'Purchase Order (PO)' },
		{ id: 'pms.transactions-wrs', name: 'WRS / LPB Gudang' },
		{ id: 'pms.transactions-outstanding', name: 'Outstanding (OS) Hub' },
		{ id: 'pms.transactions-service-sheets', name: 'Supply Slip (SS / WO)' },
		{ id: 'pms.transactions-delivery-notes', name: 'Delivery Notes (DN)' },
		{ id: 'pms.history-materials', name: 'History by Material' },
		{ id: 'pms.history-vendors', name: 'History by Vendor' },
		{ id: 'pms.history-remarks', name: 'History by Remarks' },
		{ id: 'pms.reports-yearly-matrix', name: 'Yearly Matrix (Jan-Dec)' },
		{ id: 'pms.reports-lead-time', name: 'Lead Time Tracking' },
		{ id: 'pms.reports-transactions', name: 'Detail PO & Rekap SS/DN' },
		{ id: 'pms.inventory-on-hand', name: 'Stok On Hand' },
		{ id: 'pms.inventory-stock-history', name: 'Kartu Riwayat Stok' }
	],
	dms: [
		{ id: 'dms.dashboard', name: 'Overview & Horizon' },
		{ id: 'dms.documents', name: 'All Documents' },
		{ id: 'dms.register', name: 'Register Document' },
		{ id: 'dms.master-types', name: 'Document Types' },
		{ id: 'dms.master-locations', name: 'Storage Locations' },
		{ id: 'dms.master-issuers', name: 'Issuing Authorities' },
		{ id: 'dms.master-notaries', name: 'Notaries' }
	],
	qhse: [
		{ id: 'qhse.overview', name: 'Overview & KPI' },
		{ id: 'qhse.incidents', name: 'Insiden & CAR (Lagging)' },
		{ id: 'qhse.inspections', name: 'Inspeksi & Proaktif (Leading)' },
		{ id: 'qhse.safety-enablement', name: 'Safety Briefing & APD' },
		{ id: 'qhse.quality', name: 'SOP & Complain System' }
	],
	ga: [
		{ id: 'ga.dashboard', name: 'Dashboard GA' },
		{ id: 'ga.assets', name: 'Master Aset (KR 7.1)' },
		{ id: 'ga.permits', name: 'Legalitas Armada (KR 7.2)' },
		{ id: 'ga.facilities', name: 'Facility Maintenance (KR 7.3)' },
		{ id: 'ga.stationery', name: 'Request ATK & Perlengkapan (KR 7.4)' }
	],
	ocs: [
		{ id: 'ocs.dashboard', name: 'Overview' },
		{ id: 'ocs.dispatch', name: 'Dispatch Operations' },
		{ id: 'ocs.pod', name: 'e-POD (Surat Jalan Balik)' },
		{ id: 'ocs.ujo', name: 'Uang Jalan (UJO)' },
		{ id: 'ocs.assign-driver', name: 'Assign Driver' },
		{ id: 'ocs.daily-targets', name: 'Target Harian' },
		{ id: 'ocs.rute', name: 'Master Rute & UJO' },
		{ id: 'ocs.gerbang-tol', name: 'Master Gerbang Tol' }
	],
	maintenance: [
		{ id: 'maintenance.dashboard', name: 'Dashboard Utama' },
		{ id: 'maintenance.inspections', name: 'Daftar Inspeksi (Mobile)' },
		{ id: 'maintenance.work-orders', name: 'Work Orders (Mechanic)' }
	]
};

/** Level sequence minimum untuk akses OCS (Supervisor = 4) */
export const OCS_MIN_LEVEL_SEQUENCE = 4;

/** Role yang dianggap sebagai administrator (akses semua modul & pengaturan) */
export const ADMIN_ROLES = ['superadmin', 'administrator', 'superhyperadmin', 'super_admin'];

/**
 * Mapping Role Spesifik ERP → Modul
 * @deprecated Digantikan oleh `getDynamicRoleModuleMap()` yang mengambil dari DB PostgreSQL `master.roles`.
 * Ini hanya digunakan sebagai Fallback terakhir jika DB down.
 */
export const ROLE_MODULE_MAP: Record<string, ModuleId[]> = {
	'operator_fms': ['fms'],
	'admin_fms': ['fms', 'kasir'],
	'operator_ocs': ['ocs', 'fms', 'kasir'], // OCS check level tetap berlaku di service
	'kepala_mekanik': ['maintenance'],
	'admin_maintenance': ['maintenance'],
	'inspector': ['maintenance'],
	'kepala_gudang': ['pms'],
	'admin_warehouse': ['pms'],
	'manager_fms': ['fms', 'kasir', 'ocs'],
	'manager_maintenance': ['maintenance'],
	'manager_pms': ['pms'],
	'manager_finance': ['finance', 'kasir'],
	'manager_marketing': ['marketing', 'pms'],
	'manager_dms': ['dms'],
	'manager_qhse': ['qhse'],
	'staff_finance': ['finance'],
	'admin_finance': ['finance', 'kasir'],
	'staff_hr': ['hris'],
	'manager_hr': ['hris'],
	'staff_marketing': ['marketing'],
	'staff_procurement': ['pms'],
	'staff_dms': ['dms'],
	'staff_qhse': ['qhse']
};

/**
 * Mapping divisi → modul default yang bisa diakses
 * Fallback jika role user adalah 'user' biasa
 */
export const DIVISION_MODULE_MAP: Record<string, ModuleId[]> = {
	'DV_41': ['fms', 'kasir'],                       // OPERATION
	'DV_37': ['hris'],                                // HUMAN CAPITAL
	'DV_36': ['finance'],                             // FINANCE
	'DV_43': ['marketing', 'pms'],                    // BUSINESS DEV
	'DV_28': ALL_MODULES,                             // IT DEVELOPER
	'DV_44': ALL_MODULES,                             // DIREKTORAT UTAMA
	'DV_18': ['fms'],                                 // MAINTENANCE & ASSET
	'DV_35': ['fms', 'ocs', 'kasir', 'marketing'],   // COMMERCIAL
	'DV_06': ALL_MODULES,                             // INTERNAL AUDIT
	'DV_07': ALL_MODULES,                             // GENERAL MANAGEMENT
	'DV_25': ['fms', 'kasir'],                        // OTHER
};
