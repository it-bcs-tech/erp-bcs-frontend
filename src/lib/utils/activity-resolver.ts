/**
 * activity-resolver.ts
 * Helper cerdas untuk menerjemahkan pathname URL menjadi nama modul dan deskripsi aktivitas yang mudah dibaca manusia.
 */

export interface ResolvedActivity {
	moduleCode: string;
	moduleName: string;
	activityLabel: string;
	icon: string;
	color: string;
}

export function resolveActivity(pathname: string): ResolvedActivity {
	const path = pathname.toLowerCase().replace(/\/$/, '') || '/';

	// Root / Beranda
	if (path === '/' || path === '') {
		return {
			moduleCode: 'portal',
			moduleName: 'Portal Utama',
			activityLabel: 'Melihat Beranda ERP',
			icon: 'home',
			color: 'text-indigo-600 dark:text-indigo-400'
		};
	}

	// Login / Logout
	if (path.startsWith('/login')) {
		return {
			moduleCode: 'auth',
			moduleName: 'Autentikasi',
			activityLabel: 'Halaman Login',
			icon: 'login',
			color: 'text-slate-600'
		};
	}

	// Admin / Pengaturan
	if (path.startsWith('/admin/users')) {
		return {
			moduleCode: 'admin',
			moduleName: 'User Management',
			activityLabel: 'Mengelola Pengguna & Hak Akses',
			icon: 'manage_accounts',
			color: 'text-purple-600 dark:text-purple-400'
		};
	}
	if (path.startsWith('/admin/active-users')) {
		return {
			moduleCode: 'admin',
			moduleName: 'Live Monitor',
			activityLabel: 'Memantau Pengguna Aktif',
			icon: 'monitor_heart',
			color: 'text-emerald-600 dark:text-emerald-400'
		};
	}
	if (path.startsWith('/admin') || path.startsWith('/settings')) {
		return {
			moduleCode: 'admin',
			moduleName: 'Pengaturan Sistem',
			activityLabel: 'Mengatur Konfigurasi Sistem',
			icon: 'settings',
			color: 'text-slate-600 dark:text-slate-400'
		};
	}

	// 1. FMS (Fleet Management System)
	if (path.startsWith('/fms')) {
		const base = { moduleCode: 'fms', moduleName: 'Fleet Management', color: 'text-blue-600 dark:text-blue-400' };
		if (path === '/fms') return { ...base, activityLabel: 'Melihat Dashboard FMS', icon: 'dashboard' };
		if (path.includes('/vehicles')) return { ...base, activityLabel: 'Mengelola Master Kendaraan & Armada', icon: 'local_shipping' };
		if (path.includes('/drivers')) return { ...base, activityLabel: 'Mengelola Data Pengemudi (Driver)', icon: 'badge' };
		if (path.includes('/trips')) return { ...base, activityLabel: 'Monitoring Perjalanan & Surat Jalan', icon: 'alt_route' };
		if (path.includes('/live-map')) return { ...base, activityLabel: 'Memantau Peta GPS Armada Real-Time', icon: 'map' };
		if (path.includes('/fuel')) return { ...base, activityLabel: 'Mencatat & Memeriksa Konsumsi BBM', icon: 'local_gas_station' };
		if (path.includes('/tires')) return { ...base, activityLabel: 'Manajemen & Mutasi Ban Armada', icon: 'tire_repair' };
		if (path.includes('/maintenance')) return { ...base, activityLabel: 'Melihat Jadwal Service Armada', icon: 'build' };
		return { ...base, activityLabel: 'Membuka Modul FMS', icon: 'directions_car' };
	}

	// 2. HRIS & LMS
	if (path.startsWith('/hris')) {
		const base = { moduleCode: 'hris', moduleName: 'Human Capital (HRIS)', color: 'text-violet-600 dark:text-violet-400' };
		if (path === '/hris') return { ...base, activityLabel: 'Melihat Overview HRIS & Kepegawaian', icon: 'dashboard' };
		if (path.includes('/employees')) return { ...base, activityLabel: 'Melihat Master Karyawan & Profil', icon: 'groups' };
		if (path.includes('/attendance')) return { ...base, activityLabel: 'Rekapitulasi Kehadiran (Presensi)', icon: 'fingerprint' };
		if (path.includes('/leave')) return { ...base, activityLabel: 'Mengelola Pengajuan Cuti & Izin', icon: 'event_busy' };
		if (path.includes('/payroll')) return { ...base, activityLabel: 'Memproses Penggajian & Slip Gaji', icon: 'payments' };
		if (path.includes('/loans')) return { ...base, activityLabel: 'Mengelola Kasbon & Pinjaman Karyawan', icon: 'account_balance_wallet' };
		if (path.includes('/performance')) return { ...base, activityLabel: 'Evaluasi Kinerja & KPI Tim', icon: 'monitoring' };
		if (path.includes('/assessments')) return { ...base, activityLabel: 'Menilai Asesmen Kompetensi Tim', icon: 'rate_review' };
		if (path.includes('/lms')) return { ...base, activityLabel: 'Membuka Pelatihan & Akademi BCS (LMS)', icon: 'school' };
		if (path.includes('/org-chart')) return { ...base, activityLabel: 'Melihat Struktur Organisasi & Hierarki', icon: 'account_tree' };
		if (path.includes('/certifications')) return { ...base, activityLabel: 'Memeriksa Masa Berlaku Sertifikat/SIM', icon: 'card_membership' };
		return { ...base, activityLabel: 'Membuka Modul HRIS', icon: 'badge' };
	}

	// 3. Finance & Accounting
	if (path.startsWith('/finance')) {
		const base = { moduleCode: 'finance', moduleName: 'Finance & Accounting', color: 'text-teal-600 dark:text-teal-400' };
		if (path === '/finance') return { ...base, activityLabel: 'Melihat Overview Keuangan', icon: 'dashboard' };
		if (path.includes('/create-transaction')) return { ...base, activityLabel: 'Pusat Transaksi & Input Kas', icon: 'add_box' };
		if (path.includes('/invoices')) return { ...base, activityLabel: 'Mengelola Customer Invoices', icon: 'receipt_long' };
		if (path.includes('/vendor-bills')) return { ...base, activityLabel: 'Memeriksa Tagihan Vendor (Bills)', icon: 'shopping_cart_checkout' };
		if (path.includes('/payments')) return { ...base, activityLabel: 'Melihat Riwayat Pembayaran & Kas', icon: 'payments' };
		return { ...base, activityLabel: 'Membuka Modul Finance', icon: 'account_balance' };
	}

	// 4. Kasir & UJO
	if (path.startsWith('/kasir')) {
		const base = { moduleCode: 'kasir', moduleName: 'Kasir & Settlement', color: 'text-emerald-600 dark:text-emerald-400' };
		if (path === '/kasir') return { ...base, activityLabel: 'Melihat Overview Kasir & Settlement', icon: 'dashboard' };
		if (path.includes('/kas-operasional')) return { ...base, activityLabel: 'Mengelola Kas & Saldo Operasional', icon: 'account_balance_wallet' };
		if (path.includes('/ujo')) return { ...base, activityLabel: 'Memproses Pencairan UJO Pengemudi', icon: 'payments' };
		if (path.includes('/surat-jalan')) return { ...base, activityLabel: 'Memeriksa Surat Jalan Balik (DN)', icon: 'edit_document' };
		if (path.includes('/closing')) return { ...base, activityLabel: 'Melakukan Closing Kasbon UJO', icon: 'assignment_turned_in' };
		return { ...base, activityLabel: 'Membuka Modul Kasir', icon: 'point_of_sale' };
	}

	// 5. Marketing & CRM
	if (path.startsWith('/marketing')) {
		const base = { moduleCode: 'marketing', moduleName: 'Marketing & CRM', color: 'text-rose-600 dark:text-rose-400' };
		if (path === '/marketing') return { ...base, activityLabel: 'Melihat Dashboard Marketing', icon: 'dashboard' };
		if (path.includes('/customers')) return { ...base, activityLabel: 'Mengelola Data Pelanggan (Customer)', icon: 'group' };
		if (path.includes('/orders')) return { ...base, activityLabel: 'Mengelola Order & Delivery Order (DO)', icon: 'receipt_long' };
		if (path.includes('/contracts')) return { ...base, activityLabel: 'Mengelola Kontrak Pelanggan', icon: 'handshake' };
		if (path.includes('/pipeline')) return { ...base, activityLabel: 'Memantau Sales Pipeline CRM', icon: 'view_kanban' };
		if (path.includes('/reports')) return { ...base, activityLabel: 'Melihat Laporan Performa Penjualan', icon: 'bar_chart' };
		return { ...base, activityLabel: 'Membuka Modul Marketing', icon: 'campaign' };
	}

	// 6. PMS (Procurement Management System)
	if (path.startsWith('/pms')) {
		const base = { moduleCode: 'pms', moduleName: 'Procurement (PMS)', color: 'text-amber-600 dark:text-amber-400' };
		if (path === '/pms') return { ...base, activityLabel: 'Melihat Dashboard Pengadaan PMS', icon: 'dashboard' };
		if (path.includes('/master/vendors')) return { ...base, activityLabel: 'Mengelola Master Vendor & Rekanan', icon: 'storefront' };
		if (path.includes('/master/sites')) return { ...base, activityLabel: 'Mengelola Master Lokasi / Site', icon: 'location_city' };
		if (path.includes('/master/projects')) return { ...base, activityLabel: 'Mengelola Master Proyek', icon: 'folder_special' };
		if (path.includes('/master/materials')) return { ...base, activityLabel: 'Mengelola Master Barang & Material', icon: 'category' };
		if (path.includes('/transactions/pr')) return { ...base, activityLabel: 'Memproses Purchase Request (PR)', icon: 'assignment' };
		if (path.includes('/transactions/po/create')) return { ...base, activityLabel: 'Membuat Purchase Order (PO) Baru', icon: 'add_shopping_cart' };
		if (path.includes('/transactions/po')) return { ...base, activityLabel: 'Mengelola Purchase Order (PO)', icon: 'shopping_cart' };
		if (path.includes('/transactions/wrs')) return { ...base, activityLabel: 'Penerimaan Gudang (WRS / LPB)', icon: 'receipt_long' };
		if (path.includes('/transactions/outstanding')) return { ...base, activityLabel: 'Memantau Outstanding Pengadaan', icon: 'pending_actions' };
		if (path.includes('/transactions/service-sheets')) return { ...base, activityLabel: 'Mengelola Supply Slip (SS / WO)', icon: 'build' };
		if (path.includes('/transactions/delivery-notes')) return { ...base, activityLabel: 'Mengelola Delivery Notes (DN)', icon: 'local_shipping' };
		if (path.includes('/history')) return { ...base, activityLabel: 'Melihat Riwayat Transaksi Pengadaan', icon: 'history' };
		if (path.includes('/reports')) return { ...base, activityLabel: 'Menganalisis Laporan & Matrix PMS', icon: 'calendar_month' };
		if (path.includes('/inventory/on-hand')) return { ...base, activityLabel: 'Memeriksa Stok Gudang On-Hand', icon: 'warehouse' };
		if (path.includes('/inventory/stock-history')) return { ...base, activityLabel: 'Melihat Kartu Riwayat Mutasi Stok', icon: 'swap_horiz' };
		return { ...base, activityLabel: 'Membuka Modul Procurement', icon: 'inventory' };
	}

	// 7. DMS (Document Management System)
	if (path.startsWith('/dms')) {
		const base = { moduleCode: 'dms', moduleName: 'Digital Vault (DMS)', color: 'text-indigo-600 dark:text-indigo-400' };
		if (path === '/dms' || path === '/dms/dashboard') return { ...base, activityLabel: 'Melihat Overview & Horizon Dokumen', icon: 'dashboard' };
		if (path.includes('/transactions/documents/create')) return { ...base, activityLabel: 'Mendaftarkan Dokumen Baru ke Vault', icon: 'upload_file' };
		if (path.includes('/transactions/documents')) return { ...base, activityLabel: 'Mencari & Mengelola Arsip Dokumen', icon: 'folder_shared' };
		if (path.includes('/master/types')) return { ...base, activityLabel: 'Mengelola Master Jenis Dokumen', icon: 'category' };
		if (path.includes('/master/locations')) return { ...base, activityLabel: 'Mengelola Master Lokasi Penyimpanan', icon: 'inventory_2' };
		if (path.includes('/master/issuers')) return { ...base, activityLabel: 'Mengelola Master Lembaga Penerbit', icon: 'account_balance' };
		if (path.includes('/master/notaries')) return { ...base, activityLabel: 'Mengelola Master Notaris Legal', icon: 'gavel' };
		return { ...base, activityLabel: 'Membuka Modul Dokumen (DMS)', icon: 'folder_special' };
	}

	// 8. QHSE
	if (path.startsWith('/qhse')) {
		const base = { moduleCode: 'qhse', moduleName: 'QHSE & Safety', color: 'text-orange-600 dark:text-orange-400' };
		if (path === '/qhse') return { ...base, activityLabel: 'Melihat Dashboard K3 & Mutu QHSE', icon: 'dashboard' };
		if (path.includes('/incidents')) return { ...base, activityLabel: 'Laporan Insiden & Tindakan CAR', icon: 'emergency' };
		if (path.includes('/inspections')) return { ...base, activityLabel: 'Inspeksi & Observasi K3 Lapangan', icon: 'fact_check' };
		if (path.includes('/safety-enablement')) return { ...base, activityLabel: 'Safety Briefing & Distribusi APD', icon: 'health_and_safety' };
		if (path.includes('/quality')) return { ...base, activityLabel: 'Mengelola SOP & Penanganan Komplain', icon: 'policy' };
		return { ...base, activityLabel: 'Membuka Modul QHSE', icon: 'verified_user' };
	}

	// 9. GA (General Affair)
	if (path.startsWith('/ga')) {
		const base = { moduleCode: 'ga', moduleName: 'General Affair (GA)', color: 'text-cyan-600 dark:text-cyan-400' };
		if (path === '/ga') return { ...base, activityLabel: 'Melihat Overview Operasional GA', icon: 'dashboard' };
		if (path.includes('/assets')) return { ...base, activityLabel: 'Mengelola Master Aset & Inventaris', icon: 'inventory_2' };
		if (path.includes('/permits')) return { ...base, activityLabel: 'Memeriksa Legalitas & Pajak Armada', icon: 'badge' };
		if (path.includes('/facilities')) return { ...base, activityLabel: 'Pemeliharaan Fasilitas & Kantor (KR 7.3)', icon: 'home_repair_service' };
		if (path.includes('/stationery')) return { ...base, activityLabel: 'Pengadaan & Stok ATK Kantor (KR 7.4)', icon: 'edit_document' };
		return { ...base, activityLabel: 'Membuka Modul General Affair', icon: 'domain' };
	}

	// 10. OCS (Operations Control System)
	if (path.startsWith('/ocs')) {
		const base = { moduleCode: 'ocs', moduleName: 'Operations Control (OCS)', color: 'text-sky-600 dark:text-sky-400' };
		if (path === '/ocs') return { ...base, activityLabel: 'Melihat Overview OCS', icon: 'dashboard' };
		if (path.includes('/dispatch')) return { ...base, activityLabel: 'Mengontrol Operasi Dispatch Armada', icon: 'assignment' };
		if (path.includes('/pod')) return { ...base, activityLabel: 'Verifikasi e-POD (Surat Jalan Balik)', icon: 'verified' };
		if (path.includes('/ujo')) return { ...base, activityLabel: 'Memeriksa Pengajuan Uang Jalan (UJO)', icon: 'payments' };
		if (path.includes('/assign-driver')) return { ...base, activityLabel: 'Menugaskan Pengemudi (Driver Assignment)', icon: 'person_pin' };
		if (path.includes('/daily-targets')) return { ...base, activityLabel: 'Memantau Target Ritase Harian', icon: 'track_changes' };
		if (path.includes('/rute')) return { ...base, activityLabel: 'Mengatur Master Rute & Tarif Tol', icon: 'route' };
		return { ...base, activityLabel: 'Membuka Modul OCS', icon: 'hub' };
	}

	// 11. Maintenance (Workshop)
	if (path.startsWith('/maintenance')) {
		const base = { moduleCode: 'maintenance', moduleName: 'Workshop & Maintenance', color: 'text-slate-700 dark:text-slate-300' };
		if (path.includes('/dashboard')) return { ...base, activityLabel: 'Melihat Dashboard Bengkel & Reparasi', icon: 'dashboard' };
		if (path.includes('/inspections')) return { ...base, activityLabel: 'Inspeksi Kondisi Truk & Trailer', icon: 'assignment_turned_in' };
		if (path.includes('/work-orders')) return { ...base, activityLabel: 'Mengelola SPK Perbaikan (Work Orders)', icon: 'plumbing' };
		return { ...base, activityLabel: 'Membuka Modul Maintenance', icon: 'build_circle' };
	}

	// Fallback Default
	return {
		moduleCode: 'general',
		moduleName: 'ERP BCS',
		activityLabel: `Mengakses halaman ${path}`,
		icon: 'tab',
		color: 'text-slate-600 dark:text-slate-400'
	};
}
