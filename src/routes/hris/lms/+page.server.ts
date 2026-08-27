/**
 * HRIS LMS (Learning Management System) — Page Server Loader & Actions
 * ════════════════════════════════════════════════════════════════════
 */

import type { PageServerLoad, Actions } from './$types';
import { apiFetch } from '$lib/utils/api';
import { logError } from '$lib/utils/logger';

// Mock Data Standar Industri Logistik & Transportasi PT BCS Logistics
const DEFAULT_METRICS = {
	totalCourses: 14,
	activeLearners: 128,
	complianceRate: 94.2,
	avgQuizScore: 88.5
};

const DEFAULT_COURSES = [
	{
		id: 'CRS-LOG-001',
		title: 'Defensive Driving & Road Safety Certification',
		category: 'Operations',
		level: 'Mandatory',
		durationMinutes: 180,
		modulesCount: 6,
		enrolledCount: 64,
		completionRate: 96,
		rating: 4.9,
		instructor: 'Capt. Rahmat Hidayat (Safety Head)',
		description: 'Standar keselamatan berkendara jarak jauh, manajemen kelelahan pengemudi, teknik pengereman beban berat di tanjakan/turunan, dan tanggap darurat kecelakaan.',
		tags: ['Driver', 'K3', 'Mandatory'],
		modules: [
			{ id: 'M1', title: 'Prinsip Dasar Defensive Driving & Titik Buta (Blind Spot)', duration: '25 Menit', type: 'VIDEO' },
			{ id: 'M2', title: 'Pemeriksaan Pra-Jalan (P2H) Kendaraan Berat', duration: '30 Menit', type: 'INTERACTIVE' },
			{ id: 'M3', title: 'Prosedur Kecepatan Maksimum & Jarak Aman di Jalan Tol', duration: '25 Menit', type: 'DOCUMENT' },
			{ id: 'M4', title: 'Penanganan Kondisi Darurat (Rem Blong & Pecah Ban)', duration: '40 Menit', type: 'VIDEO' },
			{ id: 'M5', title: 'Etika Berkendara & Komunikasi Radio HT', duration: '20 Menit', type: 'DOCUMENT' },
			{ id: 'M6', title: 'Evaluasi Akhir & Post-Test Kelulusan', duration: '40 Menit', type: 'QUIZ' }
		]
	},
	{
		id: 'CRS-K3-002',
		title: 'K3 Pergudangan & Penanganan Material B3',
		category: 'QHSE & Safety',
		level: 'Mandatory',
		durationMinutes: 120,
		modulesCount: 4,
		enrolledCount: 42,
		completionRate: 92,
		rating: 4.8,
		instructor: 'Ir. Dewi Lestari, ST (QHSE Manager)',
		description: 'Pedoman keselamatan di gudang penyimpanan, penggunaan APD wajib, identifikasi simbol B3, MSDS, serta penanganan tumpahan bahan kimia berbahaya.',
		tags: ['Warehouse', 'B3', 'QHSE'],
		modules: [
			{ id: 'M1', title: 'Pengenalan Regulasi K3 & Simbol Bahaya B3', duration: '20 Menit', type: 'VIDEO' },
			{ id: 'M2', title: 'SOP Pengoperasian Forklift & Pallet Stacker', duration: '35 Menit', type: 'VIDEO' },
			{ id: 'M3', title: 'Simulasi Spill Kit & Kebocoran Bahan Kimia', duration: '35 Menit', type: 'INTERACTIVE' },
			{ id: 'M4', title: 'Kuis Kepatuhan K3 & B3', duration: '30 Menit', type: 'QUIZ' }
		]
	},
	{
		id: 'CRS-MTC-003',
		title: 'SOP Preventive Maintenance & Troubleshooting Mesin Truk Diesel Euro 4',
		category: 'Technical',
		level: 'Intermediate',
		durationMinutes: 240,
		modulesCount: 5,
		enrolledCount: 18,
		completionRate: 88,
		rating: 4.7,
		instructor: 'Miswanto (Head of Workshop)',
		description: 'Prosedur diagnosa sistem injeksi common rail, sistem emisi SCR/DPF, kelistrikan armada tronton, dan tata cara pengisian form work order digital di ERP.',
		tags: ['Mechanic', 'Maintenance'],
		modules: [
			{ id: 'M1', title: 'Arsitektur Engine Euro 4 & Sensor Elektronik', duration: '45 Menit', type: 'VIDEO' },
			{ id: 'M2', title: 'Diagnostik Kerusakan OBD-II & Scantool', duration: '60 Menit', type: 'INTERACTIVE' },
			{ id: 'M3', title: 'Maintenance Sistem Rem Angin & Suspensi Udara', duration: '50 Menit', type: 'VIDEO' },
			{ id: 'M4', title: 'SOP Digital Work Order & Spare Part Requisition', duration: '35 Menit', type: 'DOCUMENT' },
			{ id: 'M5', title: 'Uji Kompetensi Mekanik Tahap 1', duration: '50 Menit', type: 'QUIZ' }
		]
	},
	{
		id: 'CRS-ERP-004',
		title: 'Panduan Operasional ERP Core & Mobile Apps Driver BCS',
		category: 'Digital Systems',
		level: 'Beginner',
		durationMinutes: 90,
		modulesCount: 3,
		enrolledCount: 95,
		completionRate: 98,
		rating: 4.9,
		instructor: 'Tim IT & Transformasi Digital',
		description: 'Tata cara login, pembaruan status surat jalan, input Surat Jalan Elektronik (e-DO), pelaporan insiden darurat, dan absensi mobile terintegrasi GPS.',
		tags: ['All Staff', 'ERP', 'Driver'],
		modules: [
			{ id: 'M1', title: 'Navigasi Antarmuka Mobile Driver & Fitur Peta', duration: '30 Menit', type: 'VIDEO' },
			{ id: 'M2', title: 'Upload Bukti POD (Proof of Delivery) & Kasbon UJO', duration: '30 Menit', type: 'INTERACTIVE' },
			{ id: 'M3', title: 'Post-Test Pemahaman Fitur Aplikasi', duration: '30 Menit', type: 'QUIZ' }
		]
	},
	{
		id: 'CRS-LDR-005',
		title: 'Effective Field Leadership & Incident Resolution for Supervisors',
		category: 'Leadership',
		level: 'Advanced',
		durationMinutes: 150,
		modulesCount: 4,
		enrolledCount: 16,
		completionRate: 85,
		rating: 4.6,
		instructor: 'Agus Subroto (Head of Operations)',
		description: 'Keterampilan kepemimpinan lapangan, manajemen konflik rute pengemudi, teknik negosiasi bongkar muat pelanggan, dan pelaporan SLA pengiriman.',
		tags: ['Supervisor', 'Management'],
		modules: [
			{ id: 'M1', title: 'Komunikasi Efektif & Empati Lapangan', duration: '35 Menit', type: 'VIDEO' },
			{ id: 'M2', title: 'Decision Making saat Cuaca Buruk / Macet Jalur Pantura', duration: '40 Menit', type: 'DOCUMENT' },
			{ id: 'M3', title: 'Evaluasi SLA Pengiriman & Root Cause Analysis', duration: '45 Menit', type: 'INTERACTIVE' },
			{ id: 'M4', title: 'Studi Kasus & Assessment Kepemimpinan', duration: '30 Menit', type: 'QUIZ' }
		]
	}
];

const DEFAULT_LEARNING_PATHS = [
	{
		id: 'LP-DRV-01',
		title: 'Mandatory Driver Induction & Road Readiness',
		targetRole: 'Pengemudi / Driver',
		requiredCourses: 3,
		totalDurationHours: 8.5,
		enrolledLearners: 74,
		progressPercent: 92,
		coursesIncluded: ['CRS-LOG-001', 'CRS-ERP-004', 'CRS-K3-002']
	},
	{
		id: 'LP-MTC-01',
		title: 'Certified Heavy Truck Fleet Mechanic Pathway',
		targetRole: 'Mekanik & Teknisi Workshop',
		requiredCourses: 3,
		totalDurationHours: 11,
		enrolledLearners: 21,
		progressPercent: 78,
		coursesIncluded: ['CRS-MTC-003', 'CRS-K3-002', 'CRS-ERP-004']
	},
	{
		id: 'LP-SPV-01',
		title: 'Operational Excellence for Field Dispatchers & Supervisors',
		targetRole: 'Supervisor & Dispatcher OCS',
		requiredCourses: 3,
		totalDurationHours: 7.5,
		enrolledLearners: 15,
		progressPercent: 85,
		coursesIncluded: ['CRS-LDR-005', 'CRS-ERP-004', 'CRS-LOG-001']
	}
];

const DEFAULT_TRAINING_MATRIX = [
	{ role: 'Pengemudi Truk (Driver)', k3: 'Wajib (100%)', defensive: 'Wajib (100%)', maintenance: 'Opsional', erp: 'Wajib (100%)', leadership: 'N/A', compliance: 96 },
	{ role: 'Mekanik Workshop', k3: 'Wajib (100%)', defensive: 'Opsional', maintenance: 'Wajib (100%)', erp: 'Wajib (100%)', leadership: 'N/A', compliance: 91 },
	{ role: 'Staff Pergudangan (Warehouse)', k3: 'Wajib (100%)', defensive: 'N/A', maintenance: 'N/A', erp: 'Wajib (100%)', leadership: 'N/A', compliance: 94 },
	{ role: 'Supervisor & Dispatcher', k3: 'Wajib (100%)', defensive: 'Wajib (100%)', maintenance: 'Dasar', erp: 'Wajib (100%)', leadership: 'Wajib (100%)', compliance: 89 },
	{ role: 'Staff Finance & Admin', k3: 'Umum', defensive: 'N/A', maintenance: 'N/A', erp: 'Wajib (100%)', leadership: 'Opsional', compliance: 98 }
];

const DEFAULT_MY_LEARNING = [
	{
		courseId: 'CRS-LOG-001',
		title: 'Defensive Driving & Road Safety Certification',
		category: 'Operations',
		progress: 80,
		status: 'In Progress',
		completedModules: 4,
		totalModules: 5,
		deadline: '15 Sep 2026',
		lastAccessed: 'Kemarin, 14:20 WIB',
		hasCertificate: false
	},
	{
		courseId: 'CRS-ERP-004',
		title: 'Panduan Operasional ERP Core & Mobile Apps Driver BCS',
		category: 'Digital Systems',
		progress: 100,
		status: 'Completed',
		completedModules: 3,
		totalModules: 3,
		deadline: 'Selesai',
		lastAccessed: '22 Agt 2026',
		score: 95,
		hasCertificate: true,
		certificateNumber: 'CERT-BCS-2026-0889'
	},
	{
		courseId: 'CRS-K3-002',
		title: 'K3 Pergudangan & Penanganan Material B3',
		category: 'QHSE & Safety',
		progress: 25,
		status: 'In Progress',
		completedModules: 1,
		totalModules: 4,
		deadline: '30 Sep 2026',
		lastAccessed: '3 hari yang lalu',
		hasCertificate: false
	}
];

export const load: PageServerLoad = async ({ cookies }) => {
	const authToken = cookies.get('auth_token');

	// Coba ambil dari Laravel API jika endpoint sudah siap di masa depan
	if (authToken) {
		try {
			const res = await apiFetch<any>('/api/v1/hris/lms/courses', {}, authToken);
			if (res && res.data) {
				return {
					metrics: res.data.metrics || DEFAULT_METRICS,
					courses: res.data.courses || DEFAULT_COURSES,
					learningPaths: res.data.learningPaths || DEFAULT_LEARNING_PATHS,
					trainingMatrix: res.data.trainingMatrix || DEFAULT_TRAINING_MATRIX,
					myLearning: res.data.myLearning || DEFAULT_MY_LEARNING,
					dataSource: 'laravel' as const
				};
			}
		} catch (err: any) {
			logError('LMS_API_LOAD_FAIL', 'Laravel LMS endpoint not yet implemented, using standard fallback', err?.message);
		}
	}

	return {
		metrics: DEFAULT_METRICS,
		courses: DEFAULT_COURSES,
		learningPaths: DEFAULT_LEARNING_PATHS,
		trainingMatrix: DEFAULT_TRAINING_MATRIX,
		myLearning: DEFAULT_MY_LEARNING,
		dataSource: 'svelte-native' as const
	};
};

export const actions = {
	createCourse: async ({ request }) => {
		const formData = await request.formData();
		const title = formData.get('title')?.toString().trim();
		const category = formData.get('category')?.toString().trim();
		const level = formData.get('level')?.toString().trim() || 'Beginner';
		const duration = Number(formData.get('durationMinutes')) || 60;
		const instructor = formData.get('instructor')?.toString().trim();
		const description = formData.get('description')?.toString().trim();

		if (!title || !category) {
			return { success: false, message: 'Judul kursus dan kategori wajib diisi.' };
		}

		console.log(`📚 [LMS Course Created]: ${title} (${category}) - ${instructor}`);
		return { success: true, message: `Kursus "${title}" berhasil ditambahkan ke katalog LMS.` };
	},

	enroll: async ({ request }) => {
		const formData = await request.formData();
		const courseId = formData.get('courseId')?.toString();
		return { success: true, message: `Berhasil mendaftar pada kursus ${courseId}. Selamat belajar!` };
	},

	submitQuiz: async ({ request }) => {
		const formData = await request.formData();
		const courseId = formData.get('courseId')?.toString();
		const score = Number(formData.get('score')) || 90;
		return { 
			success: true, 
			message: `Selamat! Kuis ${courseId} selesai dengan nilai ${score}/100. Sertifikat berhasil diterbitkan.`,
			score
		};
	}
} satisfies Actions;
