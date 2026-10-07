export interface ChecklistItemTemplate {
	id: string;
	category: string;
	code?: string;
	name: string;
}

export const DT_CHECKLIST_TEMPLATE: ChecklistItemTemplate[] = [
	// MESIN
	{ id: 'dt_a1', category: 'MESIN', code: 'A.1', name: 'Radiator Air / Cadangan / Tutup' },
	{ id: 'dt_a2', category: 'MESIN', code: 'A.2', name: 'Start Mesin' },
	{ id: 'dt_a3', category: 'MESIN', code: 'A.3', name: 'Oli Mesin' },
	{ id: 'dt_a4', category: 'MESIN', code: 'A.4', name: 'Accu' },
	
	// KOPLING & TRANSMISI
	{ id: 'dt_b1', category: 'KOPLING & TRANSMISI', code: 'B.1', name: 'Kopling' },
	{ id: 'dt_b2', category: 'KOPLING & TRANSMISI', code: 'B.2', name: 'Persneling Maju' },
	{ id: 'dt_b3', category: 'KOPLING & TRANSMISI', code: 'B.3', name: 'Persneling Mundur' },
	{ id: 'dt_b4', category: 'KOPLING & TRANSMISI', code: 'B.4', name: 'Kopel' },
	{ id: 'dt_b5', category: 'KOPLING & TRANSMISI', code: 'B.5', name: 'Gardan' },

	// REM
	{ id: 'dt_c1', category: 'REM', code: 'C.1', name: 'Fungsi Rem Depan' },
	{ id: 'dt_c2', category: 'REM', code: 'C.2', name: 'Fungsi Rem Belakang' },
	{ id: 'dt_c3', category: 'REM', code: 'C.3', name: 'Fungsi Rem Tangan' },
	{ id: 'dt_c4', category: 'REM', code: 'C.4', name: 'Minyak Rem' },

	// LAMPU & ELECTRICAL
	{ id: 'dt_d1', category: 'LAMPU & ELECTRICAL', code: 'D.1', name: 'Lampu Depan' },
	{ id: 'dt_d2', category: 'LAMPU & ELECTRICAL', code: 'D.2', name: 'Lampu Belakang' },
	{ id: 'dt_d3', category: 'LAMPU & ELECTRICAL', code: 'D.3', name: 'Lampu Kecil' },
	{ id: 'dt_d4', category: 'LAMPU & ELECTRICAL', code: 'D.4', name: 'Hazard' },
	{ id: 'dt_d5', category: 'LAMPU & ELECTRICAL', code: 'D.5', name: 'Lampu Bak' },
	{ id: 'dt_d6', category: 'LAMPU & ELECTRICAL', code: 'D.6', name: 'Lampu Sen' },
	{ id: 'dt_d7', category: 'LAMPU & ELECTRICAL', code: 'D.7', name: 'Lampu Rem' },
	{ id: 'dt_d8', category: 'LAMPU & ELECTRICAL', code: 'D.8', name: 'Lampu Mundur' },
	{ id: 'dt_d9', category: 'LAMPU & ELECTRICAL', code: 'D.9', name: 'Lampu Panel Deskboard' },
	{ id: 'dt_d10', category: 'LAMPU & ELECTRICAL', code: 'D.10', name: 'Lampu Kabin' },
	{ id: 'dt_d11', category: 'LAMPU & ELECTRICAL', code: 'D.11', name: 'Alarm Mundur' },
	{ id: 'dt_d12', category: 'LAMPU & ELECTRICAL', code: 'D.12', name: 'Alarm Dump' },

	// BAK & HYDROLIC
	{ id: 'dt_e1', category: 'BAK & HYDROLIC', code: 'E.1', name: 'Kondisi Bak' },
	{ id: 'dt_e2', category: 'BAK & HYDROLIC', code: 'E.2', name: 'Hydrolik Bak' },
	{ id: 'dt_e3', category: 'BAK & HYDROLIC', code: 'E.3', name: 'Oli Hydrolik' },
	{ id: 'dt_e4', category: 'BAK & HYDROLIC', code: 'E.4', name: 'Engsel Kunci Bak' },
	{ id: 'dt_e5', category: 'BAK & HYDROLIC', code: 'E.5', name: 'Minyak Hydrolic (termasuk Tutup)' },

	// SPION
	{ id: 'dt_f1', category: 'SPION', code: 'F.1', name: 'Kaca spion kanan & kiri' },

	// BAN & KAKI-KAKI
	{ id: 'dt_g1', category: 'BAN & KAKI-KAKI', code: 'G.1', name: 'Baut Roda' },
	{ id: 'dt_g2', category: 'BAN & KAKI-KAKI', code: 'G.2', name: 'Tekanan Angin Ban' },
	{ id: 'dt_g3', category: 'BAN & KAKI-KAKI', code: 'G.3', name: 'Power Steering' },
	{ id: 'dt_g4', category: 'BAN & KAKI-KAKI', code: 'G.4', name: 'Minyak Power Steering' },
	{ id: 'dt_g5', category: 'BAN & KAKI-KAKI', code: 'G.5', name: 'Kondisi Velg' },
	{ id: 'dt_g6', category: 'BAN & KAKI-KAKI', code: 'G.6', name: 'Per Depan' },
	{ id: 'dt_g7', category: 'BAN & KAKI-KAKI', code: 'G.7', name: 'Per Belakang' },

	// KABIN
	{ id: 'dt_h1', category: 'KABIN', code: 'H.1', name: 'Pintu' },
	{ id: 'dt_h2', category: 'KABIN', code: 'H.2', name: 'Jendela Pintu' },
	{ id: 'dt_h3', category: 'KABIN', code: 'H.3', name: 'Seat Belt' },
	{ id: 'dt_h4', category: 'KABIN', code: 'H.4', name: 'Pedal (gas, Rem & Kopling)' },
	{ id: 'dt_h5', category: 'KABIN', code: 'H.5', name: 'Panel2 Deskboard' },
	{ id: 'dt_h6', category: 'KABIN', code: 'H.6', name: 'Tuas Dump' },
	{ id: 'dt_h7', category: 'KABIN', code: 'H.7', name: 'Kaca Depan & Belakang' },
	{ id: 'dt_h8', category: 'KABIN', code: 'H.8', name: 'Wiper (termasuk Air)' },
	{ id: 'dt_h9', category: 'KABIN', code: 'H.9', name: 'Klakson' },
	{ id: 'dt_h10', category: 'KABIN', code: 'H.10', name: 'Kebersihan Kabin' }
];

export const TR_CHECKLIST_TEMPLATE: ChecklistItemTemplate[] = [
	// PENGECEKAN LEVEL
	{ id: 'tr_l1', category: 'PENGECEKAN LEVEL', code: '1', name: 'Oli Mesin' },
	{ id: 'tr_l2', category: 'PENGECEKAN LEVEL', code: '2', name: 'Oli Power Stering' },
	{ id: 'tr_l3', category: 'PENGECEKAN LEVEL', code: '3', name: 'Air Radiator' },
	{ id: 'tr_l4', category: 'PENGECEKAN LEVEL', code: '4', name: 'Air Accu' },
	{ id: 'tr_l5', category: 'PENGECEKAN LEVEL', code: '5', name: 'Tangki Bahan Bakar' },

	// PENGECEKAN KEBOCORAN
	{ id: 'tr_k1', category: 'PENGECEKAN KEBOCORAN', code: '1', name: 'Oli Mesin' },
	{ id: 'tr_k2', category: 'PENGECEKAN KEBOCORAN', code: '2', name: 'Oli Power Stering' },
	{ id: 'tr_k3', category: 'PENGECEKAN KEBOCORAN', code: '3', name: 'Air Radiator' },
	{ id: 'tr_k4', category: 'PENGECEKAN KEBOCORAN', code: '4', name: 'Air Accu' },
	{ id: 'tr_k5', category: 'PENGECEKAN KEBOCORAN', code: '5', name: 'Tangki Bahan Bakar' },
	{ id: 'tr_k6', category: 'PENGECEKAN KEBOCORAN', code: '6', name: 'Selang Angin' },

	// PENGECEKAN KAKI-KAKI
	{ id: 'tr_kk1', category: 'PENGECEKAN KAKI-KAKI', code: '1', name: 'Baut Roda' },
	{ id: 'tr_kk2', category: 'PENGECEKAN KAKI-KAKI', code: '2', name: 'Long Tie Rod' },
	{ id: 'tr_kk3', category: 'PENGECEKAN KAKI-KAKI', code: '3', name: 'Draglink' },
	{ id: 'tr_kk4', category: 'PENGECEKAN KAKI-KAKI', code: '4', name: 'Fungsi Rem' },
	{ id: 'tr_kk5', category: 'PENGECEKAN KAKI-KAKI', code: '5', name: 'Kerangka Chasis' },
	{ id: 'tr_kk6', category: 'PENGECEKAN KAKI-KAKI', code: '6', name: 'Warna Chasis (Cat bila pudar)' },
	{ id: 'tr_kk7', category: 'PENGECEKAN KAKI-KAKI', code: '7', name: 'Lantai Chasis' },
	{ id: 'tr_kk8', category: 'PENGECEKAN KAKI-KAKI', code: '8', name: 'Twist Lock / Lock container' },
	{ id: 'tr_kk9', category: 'PENGECEKAN KAKI-KAKI', code: '9', name: 'Safety Guard / Rambang Samping' },
	{ id: 'tr_kk10', category: 'PENGECEKAN KAKI-KAKI', code: '10', name: 'King Pen Fifth Wheel' },
	{ id: 'tr_kk11', category: 'PENGECEKAN KAKI-KAKI', code: '11', name: 'Landing Lag / Jack Stand' },

	// PENGECEKAN KABIN
	{ id: 'tr_kb1', category: 'PENGECEKAN KABIN', code: '1', name: 'Kebersihan Kabin Dalam' },
	{ id: 'tr_kb2', category: 'PENGECEKAN KABIN', code: '2', name: 'Kebersihan Luar Kabin' },
	{ id: 'tr_kb3', category: 'PENGECEKAN KABIN', code: '3', name: 'Spion Kiri dan Kanan' },
	{ id: 'tr_kb4', category: 'PENGECEKAN KABIN', code: '4', name: 'Kondisi Kaca Depan' },
	{ id: 'tr_kb5', category: 'PENGECEKAN KABIN', code: '5', name: 'Kondisi Kaca Belakang' },
	{ id: 'tr_kb6', category: 'PENGECEKAN KABIN', code: '6', name: 'Kondisi Kaca Pintu Kiri/Kanan' },
	{ id: 'tr_kb7', category: 'PENGECEKAN KABIN', code: '7', name: 'Fungsi Klakson' },

	// PENGECEKAN LAMPU LAMPU
	{ id: 'tr_lp1', category: 'PENGECEKAN LAMPU LAMPU', code: '1', name: 'Lampu Rotary' },
	{ id: 'tr_lp2', category: 'PENGECEKAN LAMPU LAMPU', code: '2', name: 'Lampu Depan Pendek' },
	{ id: 'tr_lp3', category: 'PENGECEKAN LAMPU LAMPU', code: '3', name: 'Lampu Depan Jauh' },
	{ id: 'tr_lp4', category: 'PENGECEKAN LAMPU LAMPU', code: '4', name: 'Lampu Kota / Malam' },
	{ id: 'tr_lp5', category: 'PENGECEKAN LAMPU LAMPU', code: '5', name: 'Lampu Sein Kiri/Kanan' },
	{ id: 'tr_lp6', category: 'PENGECEKAN LAMPU LAMPU', code: '6', name: 'Lampu Hazard/Bahaya' },
	{ id: 'tr_lp7', category: 'PENGECEKAN LAMPU LAMPU', code: '7', name: 'Lampu Rem' },
	{ id: 'tr_lp8', category: 'PENGECEKAN LAMPU LAMPU', code: '8', name: 'Lampu Plat Nomor' }
];

export const BLOOD_PRESSURE_REFERENCE = [
	{ ageRange: '25-30 Tahun', systolic: '107 – 137', diastolic: '61 – 85' },
	{ ageRange: '31-35 Tahun', systolic: '109 – 139', diastolic: '63 – 87' },
	{ ageRange: '36-40 Tahun', systolic: '110 – 144', diastolic: '65 – 91' },
	{ ageRange: '41-45 Tahun', systolic: '112 – 152', diastolic: '67 – 93' },
	{ ageRange: '46-55 Tahun', systolic: '114 – 175', diastolic: '68 – 100' }
];
