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
	{ id: 'dt_h10', category: 'KABIN', code: 'H.10', name: 'Kebersihan Kabin' },

	// SURAT-SURAT & PERIJINAN
	{ id: 'dt_i1', category: 'SURAT-SURAT & PERIJINAN', code: 'I.1', name: 'SIM & KTP' },
	{ id: 'dt_i2', category: 'SURAT-SURAT & PERIJINAN', code: 'I.2', name: 'ID Card' },
	{ id: 'dt_i3', category: 'SURAT-SURAT & PERIJINAN', code: 'I.3', name: 'STNK' },
	{ id: 'dt_i4', category: 'SURAT-SURAT & PERIJINAN', code: 'I.4', name: 'Buku KIR & Masa Berlaku' },
	{ id: 'dt_i5', category: 'SURAT-SURAT & PERIJINAN', code: 'I.5', name: 'Ijin Angkut Limbah' },
	{ id: 'dt_i6', category: 'SURAT-SURAT & PERIJINAN', code: 'I.6', name: 'Plat Nomor' },

	// KUNCI & PERALATAN LAIN
	{ id: 'dt_j1', category: 'KUNCI & PERALATAN LAIN', code: 'J.1', name: 'Dongkrak' },
	{ id: 'dt_j2', category: 'KUNCI & PERALATAN LAIN', code: 'J.2', name: 'Kunci Roda' },
	{ id: 'dt_j3', category: 'KUNCI & PERALATAN LAIN', code: 'J.3', name: 'Ganjal Ban 2ea' },
	{ id: 'dt_j4', category: 'KUNCI & PERALATAN LAIN', code: 'J.4', name: 'Kotak P3K' },
	{ id: 'dt_j5', category: 'KUNCI & PERALATAN LAIN', code: 'J.5', name: 'Terpal Bak & Tali' },
	{ id: 'dt_j6', category: 'KUNCI & PERALATAN LAIN', code: 'J.6', name: 'Dilakukan Pencucian' },

	// SAFETY / APD
	{ id: 'dt_k1', category: 'SAFETY / APD', code: 'K.1', name: 'Seragam' },
	{ id: 'dt_k2', category: 'SAFETY / APD', code: 'K.2', name: 'Helm' },
	{ id: 'dt_k3', category: 'SAFETY / APD', code: 'K.3', name: 'Sarung Tangan' },
	{ id: 'dt_k4', category: 'SAFETY / APD', code: 'K.4', name: 'Kacamata' },
	{ id: 'dt_k5', category: 'SAFETY / APD', code: 'K.5', name: 'Masker' },
	{ id: 'dt_k6', category: 'SAFETY / APD', code: 'K.6', name: 'Safety Cone' },
	{ id: 'dt_k7', category: 'SAFETY / APD', code: 'K.7', name: 'Safety Belt' },
	{ id: 'dt_k8', category: 'SAFETY / APD', code: 'K.8', name: 'APAR (Alat Pemadam Api Ringan)' },
	{ id: 'dt_k9', category: 'SAFETY / APD', code: 'K.9', name: 'Full Body Harness' },
	{ id: 'dt_k10', category: 'SAFETY / APD', code: 'K.10', name: 'Safety Shoes' }
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
	{ id: 'tr_lp8', category: 'PENGECEKAN LAMPU LAMPU', code: '8', name: 'Lampu Plat Nomor' },

	// PENGECEKAN PERALATAN UNIT
	{ id: 'tr_pu1', category: 'PENGECEKAN PERALATAN UNIT', code: '1', name: 'Rantai' },
	{ id: 'tr_pu2', category: 'PENGECEKAN PERALATAN UNIT', code: '2', name: 'Kancip' },
	{ id: 'tr_pu3', category: 'PENGECEKAN PERALATAN UNIT', code: '3', name: 'Tatakan' },
	{ id: 'tr_pu4', category: 'PENGECEKAN PERALATAN UNIT', code: '4', name: 'Balok' },
	{ id: 'tr_pu5', category: 'PENGECEKAN PERALATAN UNIT', code: '5', name: 'Terpal Standard' },
	{ id: 'tr_pu6', category: 'PENGECEKAN PERALATAN UNIT', code: '6', name: 'Terpal Plastik' },
	{ id: 'tr_pu7', category: 'PENGECEKAN PERALATAN UNIT', code: '7', name: 'Kunci Roda' },
	{ id: 'tr_pu8', category: 'PENGECEKAN PERALATAN UNIT', code: '8', name: 'Stopper ban' },
	{ id: 'tr_pu9', category: 'PENGECEKAN PERALATAN UNIT', code: '9', name: 'Lantai Bak Trailer' },
	{ id: 'tr_pu10', category: 'PENGECEKAN PERALATAN UNIT', code: '10', name: 'Dongkrak' },
	{ id: 'tr_pu11', category: 'PENGECEKAN PERALATAN UNIT', code: '11', name: 'APAR' },
	{ id: 'tr_pu12', category: 'PENGECEKAN PERALATAN UNIT', code: '12', name: 'Safety Cone/Segitiga Pengaman' },
	{ id: 'tr_pu13', category: 'PENGECEKAN PERALATAN UNIT', code: '13', name: 'Safety Belt' },
	{ id: 'tr_pu14', category: 'PENGECEKAN PERALATAN UNIT', code: '14', name: 'Tali Tambang' },

	// PENGECEKAN APD
	{ id: 'tr_apd1', category: 'PENGECEKAN APD', code: '1', name: 'Sepatu Safety' },
	{ id: 'tr_apd2', category: 'PENGECEKAN APD', code: '2', name: 'Baju Seragam' },
	{ id: 'tr_apd3', category: 'PENGECEKAN APD', code: '3', name: 'Helmet' },
	{ id: 'tr_apd4', category: 'PENGECEKAN APD', code: '4', name: 'Kotak P3K' },
	{ id: 'tr_apd5', category: 'PENGECEKAN APD', code: '5', name: 'Sarung tangan' },
	{ id: 'tr_apd6', category: 'PENGECEKAN APD', code: '6', name: 'Kacamata' },
	{ id: 'tr_apd7', category: 'PENGECEKAN APD', code: '7', name: 'Masker' },

	// PENGECEKAN DOKUMEN KENDARAAN
	{ id: 'tr_dok1', category: 'PENGECEKAN DOKUMEN KENDARAAN', code: '1', name: 'STNK' },
	{ id: 'tr_dok2', category: 'PENGECEKAN DOKUMEN KENDARAAN', code: '2', name: 'Buku Keur Head' },
	{ id: 'tr_dok3', category: 'PENGECEKAN DOKUMEN KENDARAAN', code: '3', name: 'Buku Keur Trailler' },
	{ id: 'tr_dok4', category: 'PENGECEKAN DOKUMEN KENDARAAN', code: '4', name: 'Surat Jalan' },
	{ id: 'tr_dok5', category: 'PENGECEKAN DOKUMEN KENDARAAN', code: '5', name: 'SIM Driver' },
	{ id: 'tr_dok6', category: 'PENGECEKAN DOKUMEN KENDARAAN', code: '6', name: 'Surat Ijin Angkut B3' },

	// PENGECEKAN CONTROL DASHBOARD
	{ id: 'tr_cd1', category: 'PENGECEKAN CONTROL DASHBOARD', code: '1', name: 'Oddometer' },
	{ id: 'tr_cd2', category: 'PENGECEKAN CONTROL DASHBOARD', code: '2', name: 'Rpm - Tachometer' },
	{ id: 'tr_cd3', category: 'PENGECEKAN CONTROL DASHBOARD', code: '3', name: 'Volt Meter' },
	{ id: 'tr_cd4', category: 'PENGECEKAN CONTROL DASHBOARD', code: '4', name: 'Tekanan Oli' },
	{ id: 'tr_cd5', category: 'PENGECEKAN CONTROL DASHBOARD', code: '5', name: 'Temperatur Air Pendingin' }
];

export const BULK_CHECKLIST_TEMPLATE: ChecklistItemTemplate[] = [
	// FUNCTION: CHECK FOR LEAKS
	{ id: 'bk_fl1', category: 'FUNCTION: CEK KEBOCORAN', code: 'FL.1', name: 'Radiator / Power steering' },
	{ id: 'bk_fl2', category: 'FUNCTION: CEK KEBOCORAN', code: 'FL.2', name: 'Tangki minyak' },
	{ id: 'bk_fl3', category: 'FUNCTION: CEK KEBOCORAN', code: 'FL.3', name: 'Mesin' },
	{ id: 'bk_fl4', category: 'FUNCTION: CEK KEBOCORAN', code: 'FL.4', name: 'Sistem hydrolic' },
	{ id: 'bk_fl5', category: 'FUNCTION: CEK KEBOCORAN', code: 'FL.5', name: 'Sistem Udara' },

	// FUNCTION: BODY & WINDSHIELD
	{ id: 'bk_bw1', category: 'FUNCTION: BODY & WINDSHIELD', code: 'BW.1', name: 'Kebersihan Body' },
	{ id: 'bk_bw2', category: 'FUNCTION: BODY & WINDSHIELD', code: 'BW.2', name: 'Kondisi Body (Tidak penyok)' },
	{ id: 'bk_bw3', category: 'FUNCTION: BODY & WINDSHIELD', code: 'BW.3', name: 'Mekanika jendela' },
	{ id: 'bk_bw4', category: 'FUNCTION: BODY & WINDSHIELD', code: 'BW.4', name: 'Kunci Pintu' },
	{ id: 'bk_bw5', category: 'FUNCTION: BODY & WINDSHIELD', code: 'BW.5', name: 'Wiper' },
	{ id: 'bk_bw6', category: 'FUNCTION: BODY & WINDSHIELD', code: 'BW.6', name: 'Rambang Kanan/Kiri' },

	// FUNCTION: CHECK UNDER THE HOOD
	{ id: 'bk_uh1', category: 'FUNCTION: CHECK UNDER THE HOOD', code: 'UH.1', name: 'Filter solar / bensin' },
	{ id: 'bk_uh2', category: 'FUNCTION: CHECK UNDER THE HOOD', code: 'UH.2', name: 'Level oli mesin' },
	{ id: 'bk_uh3', category: 'FUNCTION: CHECK UNDER THE HOOD', code: 'UH.3', name: 'Level air radiator' },
	{ id: 'bk_uh4', category: 'FUNCTION: CHECK UNDER THE HOOD', code: 'UH.4', name: 'Keregangan sabuk V' },
	{ id: 'bk_uh5', category: 'FUNCTION: CHECK UNDER THE HOOD', code: 'UH.5', name: 'Sistem oli hydrolic' },

	// FUNCTION: CHECK UNDER CARRIAGE
	{ id: 'bk_uc1', category: 'FUNCTION: CHECK UNDER CARRIAGE', code: 'UC.1', name: 'Tie Rod' },
	{ id: 'bk_uc2', category: 'FUNCTION: CHECK UNDER CARRIAGE', code: 'UC.2', name: 'Drag Link' },
	{ id: 'bk_uc3', category: 'FUNCTION: CHECK UNDER CARRIAGE', code: 'UC.3', name: 'Ball Joint' },
	{ id: 'bk_uc4', category: 'FUNCTION: CHECK UNDER CARRIAGE', code: 'UC.4', name: 'Cross Joint' },

	// FUNCTION: GAUGES
	{ id: 'bk_g1', category: 'FUNCTION: GAUGES', code: 'G.1', name: 'Level solar' },
	{ id: 'bk_g2', category: 'FUNCTION: GAUGES', code: 'G.2', name: 'Tekanan oli' },
	{ id: 'bk_g3', category: 'FUNCTION: GAUGES', code: 'G.3', name: 'Temperatur mesin' },
	{ id: 'bk_g4', category: 'FUNCTION: GAUGES', code: 'G.4', name: 'Volt meter' },
	{ id: 'bk_g5', category: 'FUNCTION: GAUGES', code: 'G.5', name: 'Speedometer' },
	{ id: 'bk_g6', category: 'FUNCTION: GAUGES', code: 'G.6', name: 'RPM / tachometer' },
	{ id: 'bk_g7', category: 'FUNCTION: GAUGES', code: 'G.7', name: 'Tekanan Udara' },
	{ id: 'bk_g8', category: 'FUNCTION: GAUGES', code: 'G.8', name: 'Safety Valve' },

	// FUNCTION: BULK TANK TOOLS
	{ id: 'bk_bt1', category: 'FUNCTION: BULK TANK TOOLS', code: 'BT.1', name: 'Tutup Manhole' },
	{ id: 'bk_bt2', category: 'FUNCTION: BULK TANK TOOLS', code: 'BT.2', name: 'Engsel Tutup Manhole' },
	{ id: 'bk_bt3', category: 'FUNCTION: BULK TANK TOOLS', code: 'BT.3', name: 'Karet Manhole' },
	{ id: 'bk_bt4', category: 'FUNCTION: BULK TANK TOOLS', code: 'BT.4', name: 'Pengait Manhole' },
	{ id: 'bk_bt5', category: 'FUNCTION: BULK TANK TOOLS', code: 'BT.5', name: 'Jalur Safety Belt' },
	{ id: 'bk_bt6', category: 'FUNCTION: BULK TANK TOOLS', code: 'BT.6', name: 'Tangga Naik' },
	{ id: 'bk_bt7', category: 'FUNCTION: BULK TANK TOOLS', code: 'BT.7', name: 'Kran Udara' },
	{ id: 'bk_bt8', category: 'FUNCTION: BULK TANK TOOLS', code: 'BT.8', name: 'Sambungan Selang' },
	{ id: 'bk_bt9', category: 'FUNCTION: BULK TANK TOOLS', code: 'BT.9', name: 'Whip Check / Tali baja' },

	// FUNCTION: TOOLS AND THE OTHER
	{ id: 'bk_to1', category: 'FUNCTION: TOOLS & PERALATAN', code: 'TO.1', name: 'Kunci Roda' },
	{ id: 'bk_to2', category: 'FUNCTION: TOOLS & PERALATAN', code: 'TO.2', name: 'Dongkrak' },
	{ id: 'bk_to3', category: 'FUNCTION: TOOLS & PERALATAN', code: 'TO.3', name: 'Pengungkit Dongkrak' },
	{ id: 'bk_to4', category: 'FUNCTION: TOOLS & PERALATAN', code: 'TO.4', name: 'Ganjal Roda' },
	{ id: 'bk_to5', category: 'FUNCTION: TOOLS & PERALATAN', code: 'TO.5', name: 'Kunci Pas' },
	{ id: 'bk_to6', category: 'FUNCTION: TOOLS & PERALATAN', code: 'TO.6', name: 'Lain-lain (Jika dibutuhkan)' },

	// FUNCTION: DOCUMENT & LICENSE
	{ id: 'bk_dl1', category: 'FUNCTION: DOKUMEN & LISENSI', code: 'DL.1', name: 'STNK' },
	{ id: 'bk_dl2', category: 'FUNCTION: DOKUMEN & LISENSI', code: 'DL.2', name: 'Buku KIR Kendaraan' },
	{ id: 'bk_dl3', category: 'FUNCTION: DOKUMEN & LISENSI', code: 'DL.3', name: 'Buku maintenance cek' },
	{ id: 'bk_dl4', category: 'FUNCTION: DOKUMEN & LISENSI', code: 'DL.4', name: 'Prosedur bulk operation' },

	// SAFETY: CHECK WHEELS
	{ id: 'bk_sw1', category: 'SAFETY: CHECK WHEELS', code: 'SW.1', name: 'Baut roda' },
	{ id: 'bk_sw2', category: 'SAFETY: CHECK WHEELS', code: 'SW.2', name: 'Fungsi Rem (Rem tangan, rem kaki, rem buntut)' },
	{ id: 'bk_sw3', category: 'SAFETY: CHECK WHEELS', code: 'SW.3', name: 'Kondisi ban penggerak utama' },
	{ id: 'bk_sw4', category: 'SAFETY: CHECK WHEELS', code: 'SW.4', name: 'Tekanan Ban' },
	{ id: 'bk_sw5', category: 'SAFETY: CHECK WHEELS', code: 'SW.5', name: 'Ketebalan Ban' },
	{ id: 'bk_sw6', category: 'SAFETY: CHECK WHEELS', code: 'SW.6', name: 'Ban Serep' },

	// SAFETY: OPERATION OF LAMP
	{ id: 'bk_sl1', category: 'SAFETY: OPERATION OF LAMP', code: 'SL.1', name: 'Lampu Utama depan' },
	{ id: 'bk_sl2', category: 'SAFETY: OPERATION OF LAMP', code: 'SL.2', name: 'Lampu kota / senja' },
	{ id: 'bk_sl3', category: 'SAFETY: OPERATION OF LAMP', code: 'SL.3', name: 'Lampu Jauh' },
	{ id: 'bk_sl4', category: 'SAFETY: OPERATION OF LAMP', code: 'SL.4', name: 'Lampu Sign kanan-Kiri' },
	{ id: 'bk_sl5', category: 'SAFETY: OPERATION OF LAMP', code: 'SL.5', name: 'Lampu Plat nomor' },
	{ id: 'bk_sl6', category: 'SAFETY: OPERATION OF LAMP', code: 'SL.6', name: 'Lampu Rotary' },
	{ id: 'bk_sl7', category: 'SAFETY: OPERATION OF LAMP', code: 'SL.7', name: 'Lampu kabin' },
	{ id: 'bk_sl8', category: 'SAFETY: OPERATION OF LAMP', code: 'SL.8', name: 'Lampu Rem' },

	// SAFETY: CABIN SAFETY CHECK
	{ id: 'bk_sc1', category: 'SAFETY: CABIN SAFETY CHECK', code: 'SC.1', name: 'Pedal rem' },
	{ id: 'bk_sc2', category: 'SAFETY: CABIN SAFETY CHECK', code: 'SC.2', name: 'Klakson / back alarm' },
	{ id: 'bk_sc3', category: 'SAFETY: CABIN SAFETY CHECK', code: 'SC.3', name: 'Kaca spion kiri-kanan' },
	{ id: 'bk_sc4', category: 'SAFETY: CABIN SAFETY CHECK', code: 'SC.4', name: 'Sabuk pengaman sopir' },
	{ id: 'bk_sc5', category: 'SAFETY: CABIN SAFETY CHECK', code: 'SC.5', name: 'Sabuk pengaman penumpang' },
	{ id: 'bk_sc6', category: 'SAFETY: CABIN SAFETY CHECK', code: 'SC.6', name: 'Safety cone' },
	{ id: 'bk_sc7', category: 'SAFETY: CABIN SAFETY CHECK', code: 'SC.7', name: 'APAR' },
	{ id: 'bk_sc8', category: 'SAFETY: CABIN SAFETY CHECK', code: 'SC.8', name: 'Kotak P3K' },

	// SAFETY: SAFETY TOOLS / APD
	{ id: 'bk_sa1', category: 'SAFETY: SAFETY TOOLS / APD', code: 'SA.1', name: 'Helm Keselamatan' },
	{ id: 'bk_sa2', category: 'SAFETY: SAFETY TOOLS / APD', code: 'SA.2', name: 'Sepatu Keselamatan' },
	{ id: 'bk_sa3', category: 'SAFETY: SAFETY TOOLS / APD', code: 'SA.3', name: 'Seragam / Rompi' },
	{ id: 'bk_sa4', category: 'SAFETY: SAFETY TOOLS / APD', code: 'SA.4', name: 'Kacamata' },
	{ id: 'bk_sa5', category: 'SAFETY: SAFETY TOOLS / APD', code: 'SA.5', name: 'Sarung tangan' },
	{ id: 'bk_sa6', category: 'SAFETY: SAFETY TOOLS / APD', code: 'SA.6', name: 'Masker' },
	{ id: 'bk_sa7', category: 'SAFETY: SAFETY TOOLS / APD', code: 'SA.7', name: 'Full Body Harness' }
];

export const BLOOD_PRESSURE_REFERENCE = [
	{ ageRange: '25-30 Tahun', systolic: '107 – 137', diastolic: '61 – 85' },
	{ ageRange: '31-35 Tahun', systolic: '109 – 139', diastolic: '63 – 87' },
	{ ageRange: '36-40 Tahun', systolic: '110 – 144', diastolic: '65 – 91' },
	{ ageRange: '41-45 Tahun', systolic: '112 – 152', diastolic: '67 – 93' },
	{ ageRange: '46-55 Tahun', systolic: '114 – 175', diastolic: '68 – 100' }
];

// Standar kedalaman ulir ban minimal 1mm (SK.523/AJ.402/DRJD/2015)
export const MIN_TIRE_DEPTH_MM = 1.0;

export interface TireDepthData {
	head: (number | null)[]; // 10 untuk DT, 12 untuk TR/BULK
	trailer?: (number | null)[]; // 12 untuk TR/BULK
	spare: number | null; // Ban Serep
}
