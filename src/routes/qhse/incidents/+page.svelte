<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const fallbackUnits = [
		{ id: '801', nomor_unit: 'A9176R' },
		{ id: '7', nomor_unit: 'A9045VL' },
		{ id: '13', nomor_unit: 'B9025JN' },
		{ id: '16', nomor_unit: 'B9042JN' },
		{ id: '17', nomor_unit: 'B9049JN' },
		{ id: '126', nomor_unit: 'A9512TX' },
		{ id: '32', nomor_unit: 'F8623AX' },
		{ id: '38', nomor_unit: 'A9089TY' },
		{ id: '781', nomor_unit: 'A9142R' },
		{ id: '920', nomor_unit: 'A1289SB' },
		{ id: '700', nomor_unit: 'A9046R' },
		{ id: '701', nomor_unit: 'A9047R' }
	];

	const fallbackDrivers = [
		{ id: '83', name: 'RIKMAN' },
		{ id: '18', name: 'AMMA' },
		{ id: '95', name: 'SATIM' },
		{ id: '67', name: 'KUSTORO' },
		{ id: '116', name: 'WAGIMAN' },
		{ id: '73', name: 'MUHAMAD AMIRUDIN' },
		{ id: '62', name: 'JAJA' },
		{ id: '100', name: 'SUDRAJAT' },
		{ id: '122', name: 'MUFRODI' },
		{ id: '4', name: 'ADE FIRDAUS' },
		{ id: '110', name: 'TONI RAHMAN' },
		{ id: '56', name: 'HERMAN' }
	];

	const fallbackAssignments = [
		{ unit_id: '801', driver_id: '83', nomor_unit: 'A9176R', driver_name: 'RIKMAN' },
		{ unit_id: '7', driver_id: '18', nomor_unit: 'A9045VL', driver_name: 'AMMA' },
		{ unit_id: '13', driver_id: '95', nomor_unit: 'B9025JN', driver_name: 'SATIM' },
		{ unit_id: '16', driver_id: '67', nomor_unit: 'B9042JN', driver_name: 'KUSTORO' },
		{ unit_id: '17', driver_id: '116', nomor_unit: 'B9049JN', driver_name: 'WAGIMAN' },
		{ unit_id: '126', driver_id: '73', nomor_unit: 'A9512TX', driver_name: 'MUHAMAD AMIRUDIN' },
		{ unit_id: '32', driver_id: '62', nomor_unit: 'F8623AX', driver_name: 'JAJA' },
		{ unit_id: '38', driver_id: '100', nomor_unit: 'A9089TY', driver_name: 'SUDRAJAT' },
		{ unit_id: '781', driver_id: '122', nomor_unit: 'A9142R', driver_name: 'MUFRODI' },
		{ unit_id: '920', driver_id: '4', nomor_unit: 'A1289SB', driver_name: 'ADE FIRDAUS' },
		{ unit_id: '700', driver_id: '110', nomor_unit: 'A9046R', driver_name: 'TONI RAHMAN' },
		{ unit_id: '701', driver_id: '56', nomor_unit: 'A9047R', driver_name: 'HERMAN' }
	];

	let units = $derived(data.units && data.units.length > 0 ? data.units : fallbackUnits);
	let drivers = $derived(data.drivers && data.drivers.length > 0 ? data.drivers : fallbackDrivers);
	let assignments = $derived(data.assignments && data.assignments.length > 0 ? data.assignments : fallbackAssignments);

	let showCreateModal = $state(false);
	let showCarModal = $state(false);
	let showDetailModal = $state(false);
	let selectedIncident = $state<any>(null);

	let createUnitId = $state('');
	let createDriverId = $state('');
	let syncStatus = $state<{ type: 'linked' | 'unlinked' | 'none'; text: string }>({ type: 'none', text: '' });

	function onUnitSelect(e: Event) {
		const unitId = (e.target as HTMLSelectElement).value;
		createUnitId = unitId;

		if (!unitId) {
			syncStatus = { type: 'none', text: '' };
			return;
		}

		// Cari supir yang ter-assign aktif di unit ini
		const match = assignments.find((a: any) => a.unit_id?.toString() === unitId.toString());
		if (match && match.driver_id) {
			createDriverId = match.driver_id.toString();
			syncStatus = {
				type: 'linked',
				text: `Driver otomatis terhubung: ${match.driver_name} (Supir Aktif Unit ${match.nomor_unit})`
			};
		} else {
			syncStatus = {
				type: 'unlinked',
				text: `Unit ini saat ini tidak memiliki supir aktif ter-assign. Driver dapat dipilih manual jika diperlukan.`
			};
		}
	}

	function onDriverSelect(e: Event) {
		const driverId = (e.target as HTMLSelectElement).value;
		createDriverId = driverId;

		if (!driverId) {
			syncStatus = { type: 'none', text: '' };
			return;
		}

		// Cari unit yang ter-assign aktif ke driver ini
		const match = assignments.find((a: any) => a.driver_id?.toString() === driverId.toString());
		if (match && match.unit_id) {
			createUnitId = match.unit_id.toString();
			syncStatus = {
				type: 'linked',
				text: `Unit otomatis terhubung: ${match.nomor_unit} (Unit Aktif Driver ${match.driver_name})`
			};
		} else {
			syncStatus = {
				type: 'unlinked',
				text: `Driver ini saat ini belum ter-assign ke unit manapun. Unit dapat dipilih manual jika diperlukan.`
			};
		}
	}

	function openCreateModal() {
		createUnitId = '';
		createDriverId = '';
		syncStatus = { type: 'none', text: '' };
		showCreateModal = true;
	}

	// 5 Data Dummy Insiden & CAR Realistis (In-Memory di Frontend - Tidak Menyimpan ke DB)
	const fiveDummyIncidents = [
		{
			id: 101,
			incident_number: 'INC-2026-0001',
			incident_date: '2026-02-28T09:30:00Z',
			incident_type: 'Accident',
			severity: 'Medium',
			unit_id: 1,
			unit_number: 'BCS-TRK-084',
			driver_id: 1,
			driver_name: 'Ahmad Supriyadi',
			location: 'Tol Cipularang KM 92B (Arah Jakarta)',
			description: 'Truk menyenggol pembatas beton jalan tol (guardrail) saat berpindah lajur di tikungan menurun dalam kondisi hujan deras.',
			consequence: 'Spakbor depan kiri retak, lampu sein pecah, bumper lecet, kargo palet aman.',
			financial_loss: 4500000,
			lost_work_days: 0,
			is_human_factor: true,
			is_equipment_factor: true,
			is_method_factor: false,
			is_environment_factor: true,
			car_number: 'CAR-2026-001',
			pic_followup: 'Agus Hendra (HSE Officer)',
			due_date: '2026-03-05',
			status: 'CLOSED',
			corrective_action: 'Penggantian spakbor dan unit lampu sein di Workshop BCS Cilegon; teguran lisan tertulis kepada pengemudi.',
			preventive_action: 'Pemeriksaan ketebalan karet wiper wajib lolos di pos gate-in sebelum surat jalan diterbitkan & sosialisasi Defensive Driving saat hujan.',
			root_cause_analysis: 'Pengemudi mengabaikan SOP batas kecepatan hujan (Defensive Driving) dan inspeksi P2H wiper diabaikan sebelum dispatch.',
			analysis_data: {
				why1: 'Truk menyenggol pembatas jalan tol saat berpindah lajur di KM 92B.',
				why2: 'Pengemudi terlambat mengerem ketika kendaraan di depan melambat mendadak.',
				why3: 'Jarak aman pengereman antar-kendaraan kurang dari batas standar 50 meter.',
				why4: 'Pandangan pengemudi terganggu akibat curah hujan lebat dan sapuan karet wiper aus.',
				why5: 'Pengemudi tidak mematuhi batas kecepatan jalan basah (Defensive Driving) dan inspeksi P2H wiper diabaikan sebelum berangkat.'
			}
		},
		{
			id: 102,
			incident_number: 'INC-2026-0002',
			incident_date: '2026-03-01T14:15:00Z',
			incident_type: 'Pelanggaran Prosedur',
			severity: 'Low',
			unit_id: 2,
			unit_number: 'BCS-TRK-102',
			driver_id: 2,
			driver_name: 'Bambang Haryanto',
			location: 'Loading Dock Gudang Semen Conch Cilegon',
			description: 'Sopir terpantau berada di atas bak trailer saat proses bongkar semen sak tanpa mengenakan safety helmet & body harness.',
			consequence: 'Potensi bahaya jatuh dari ketinggian 1.8 meter (Zero harm achieved berkat intervensi pengawas).',
			financial_loss: 0,
			lost_work_days: 0,
			is_human_factor: true,
			is_equipment_factor: false,
			is_method_factor: true,
			is_environment_factor: false,
			car_number: 'CAR-2026-002',
			pic_followup: 'Danang Prasetyo (Safety Supervisor)',
			due_date: '2026-03-07',
			status: 'CAR_ISSUED',
			corrective_action: 'Pemberian Surat Peringatan (SP 1) K3 kepada driver dan penundaan muat selama 2 jam untuk re-induction K3.',
			preventive_action: 'Pemasangan rambu intervensi keselamatan "Stop Work Authority" dan audit berkala checklist APD di loading dock.',
			root_cause_analysis: 'Kurangnya pengawasan ketat Golden Safety Rules di area transit dan ketiadaan sistem penalti "No APD No Loading".',
			analysis_data: {
				why1: 'Sopir naik ke bak trailer tanpa memakai helm keselamatan dan tali pengaman.',
				why2: 'Sopir ingin segera merapikan terpal yang tersangkut sebelum forklift pabrik masuk.',
				why3: 'Sopir merasa waktu pemasangan harness terlalu lama dan memakan waktu antrean.',
				why4: 'Jalur tangga inspeksi khusus dan safety line di dock tersebut sedang dipakai armada lain.',
				why5: 'Kurangnya pengawasan ketat Golden Safety Rules di area transit dan ketiadaan sistem penalti "No APD No Loading".'
			}
		},
		{
			id: 103,
			incident_number: 'INC-2026-0003',
			incident_date: '2026-03-02T10:45:00Z',
			incident_type: 'Kerusakan Properti/Muatan',
			severity: 'Medium',
			unit_id: 3,
			unit_number: 'BCS-TRK-055',
			driver_id: 3,
			driver_name: 'Rudi Hartono',
			location: 'Area Stockpile Batubara Jetty Bojonegara',
			description: 'Truk amblas saat proses dumping di tepi tebing stockpile karena tanah timbunan belum dipadatkan setelah hujan deras.',
			consequence: 'Roda belakang amblas sedalam 40 cm, proses dumping terhenti sementara, memerlukan bantuan wheel loader untuk evakuasi.',
			financial_loss: 2200000,
			lost_work_days: 0,
			is_human_factor: false,
			is_equipment_factor: false,
			is_method_factor: true,
			is_environment_factor: true,
			car_number: 'CAR-2026-003',
			pic_followup: 'Fajar Nugroho (Kepala Operasional Jetty)',
			due_date: '2026-03-10',
			status: 'CAR_ISSUED',
			corrective_action: 'Evakuasi aman truk menggunakan sling baja wheel loader, perataan kembali kontur tanah stockpile.',
			preventive_action: 'Pembuatan tanggul penahan roda (safety berm) setinggi 1/2 diameter roda truk dan briefing wajib spotter tanah labil.',
			root_cause_analysis: 'SOP dumping batubara pada area basah belum diperbarui dan tidak ada patok batas aman penahan roda di bibir tebing.',
			analysis_data: {
				why1: 'Roda belakang sisi kanan dump truck amblas ke dalam tanah saat bak terangkat 45 derajat.',
				why2: 'Struktur tanggul bibir stockpile tidak mampu menahan beban tumpuan roda 30 ton.',
				why3: 'Timbunan tanah di pinggir jetty masih gembur setelah tersiram hujan lebat semalaman.',
				why4: 'Spotter (pemandu manuver) mengarahkan truk terlalu dekat dengan bibir tebing (< 3 meter).',
				why5: 'SOP dumping batubara pada area basah belum diperbarui dan tidak ada patok batas aman (bund wall marker).'
			}
		},
		{
			id: 104,
			incident_number: 'INC-2026-0004',
			incident_date: '2026-03-02T16:20:00Z',
			incident_type: 'Kecelakaan Kerja',
			severity: 'Medium',
			unit_id: 4,
			unit_number: 'BCS-TRK-029',
			driver_id: null,
			driver_name: 'No Driver (Mekanik: Hendra Wijaya)',
			location: 'Pit Stop Bay 3 Workshop BCS Cilegon',
			description: 'Tangan mekanik terjepit kunci torsi saat membuka baut roda yang macet karena selip kunci impact pneumatik.',
			consequence: 'Memar dan luka lecet pada jari telunjuk dan ibu jari tangan kanan, mendapat pertolongan pertama (P3K) di klinik pool.',
			financial_loss: 450000,
			lost_work_days: 1,
			is_human_factor: true,
			is_equipment_factor: true,
			is_method_factor: false,
			is_environment_factor: false,
			car_number: 'CAR-2026-004',
			pic_followup: 'Supriyadi (Chief Mechanic / Workshop Lead)',
			due_date: '2026-03-08',
			status: 'OPEN',
			corrective_action: 'Pertolongan medis klinik & istirahat dokter 1 hari; afkir (scrap) soket kunci yang sudah aus sudutnya.',
			preventive_action: 'Pengadaan sarung tangan mekanik khusus Heavy-Duty Impact Resistant & audit tool kit mekanik tiap awal bulan.',
			root_cause_analysis: 'Ketiadaan standarisasi inspeksi rutin tool kit mekanik dan sarung tangan anti-impact tidak dipakai saat pengerjaan berat.',
			analysis_data: {
				why1: 'Tangan mekanik terhantam gagang kunci torsi saat melepas mur roda ban ganda.',
				why2: 'Kunci soket mengalami selip dari kepala mur baut yang sudah aus (gundul).',
				why3: 'Mekanik memberikan tekanan tenaga berlebih tanpa posisi tumpuan kuda-kuda yang stabil.',
				why4: 'Kunci impact pneumatik bertenaga sedang dalam perbaikan sehingga mekanik beralih ke kunci manual tanpa pipa pelindung.',
				why5: 'Ketiadaan standarisasi inspeksi rutin tool kit mekanik dan sarung tangan anti-impact tidak dipakai saat pengerjaan berat.'
			}
		},
		{
			id: 105,
			incident_number: 'INC-2026-0005',
			incident_date: '2026-03-03T08:10:00Z',
			incident_type: 'Accident',
			severity: 'High',
			unit_id: 5,
			unit_number: 'BCS-TRK-019',
			driver_id: 4,
			driver_name: 'Dedi Kurniawan',
			location: 'Jalan Raya Serang - Cilegon KM 14',
			description: 'Ban kiri belakang trailer meledak (tire burst) di lajur lambat yang mengakibatkan serpihan kawat ban mengenai bodi mobil pick-up di samping.',
			consequence: 'Kerusakan fender tangki, kaca lampu pick-up pecah, tidak ada korban cedera fisik (property damage only).',
			financial_loss: 8750000,
			lost_work_days: 0,
			is_human_factor: false,
			is_equipment_factor: true,
			is_method_factor: true,
			is_environment_factor: true,
			car_number: 'CAR-2026-005',
			pic_followup: 'Heri Santoso (Fleet Safety Officer)',
			due_date: '2026-03-12',
			status: 'CAR_ISSUED',
			corrective_action: 'Ganti ban serep baru di lokasi kejadian; penyelesaian klaim ganti rugi perbaikan bodi mobil pick-up pihak ketiga.',
			preventive_action: 'Penerapan sistem cek tire pressure digital otomatis di gerbang keluar pool & kalibrasi berkala alat pengukur tekanan angin.',
			root_cause_analysis: 'Alat ukur tekanan ban digital (tire pressure gauge) di pool transit rusak dan pengemudi mengabaikan pemeriksaan fisik ketukan ban.',
			analysis_data: {
				why1: 'Ban luar nomor 7 (posisi kiri gandeng belakang) meledak tiba-tiba saat melaju 55 km/jam.',
				why2: 'Suhu dan tekanan dalam ban meningkat drastis melebihi batas aman (heat build-up overpressure).',
				why3: 'Ban mengalami kondisi under-inflation (tekanan angin kurang dari 110 PSI) yang menyebabkan dinding ban melipat saat menahan muatan 35 ton.',
				why4: 'Pengemudi tidak melakukan pengetukan ban (tire knocking check) saat beristirahat di pool transit.',
				why5: 'Alat ukur tekanan ban digital (tire pressure gauge) di pool transit rusak dan belum diganti selama 2 minggu.'
			}
		}
	];

	// Filter & Reactive State
	let statusFilter = $derived($page.url.searchParams.get('status') || 'All');

	let displayedIncidents = $derived.by(() => {
		let list = [...fiveDummyIncidents];
		if (statusFilter !== 'All') {
			list = list.filter(i => i.status === statusFilter);
		}
		return list;
	});

	let computedSummary = $derived({
		total: fiveDummyIncidents.length,
		accidents: fiveDummyIncidents.filter(i => i.incident_type === 'Accident').length,
		violations: fiveDummyIncidents.filter(i => i.incident_type === 'Pelanggaran Prosedur').length,
		openCar: fiveDummyIncidents.filter(i => i.status === 'CAR_ISSUED').length,
		openCases: fiveDummyIncidents.filter(i => i.status === 'OPEN').length,
		closed: fiveDummyIncidents.filter(i => i.status === 'CLOSED').length,
		totalLoss: fiveDummyIncidents.reduce((acc, cur) => acc + cur.financial_loss, 0),
		totalLtiDays: fiveDummyIncidents.reduce((acc, cur) => acc + cur.lost_work_days, 0)
	});

	function get5Why(inc: any) {
		return inc?.analysis_data || {};
	}

	function openDetailModal(inc: any) {
		selectedIncident = inc;
		showDetailModal = true;
	}

	function openCarModal(inc: any) {
		selectedIncident = { ...inc };
		showCarModal = true;
	}

	function formatCurrency(val: number) {
		return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
	}
</script>

<svelte:head>
	<title>Insiden & CAR (Lagging) | QHSE ERP BCS</title>
</svelte:head>

<div class="space-y-6">
	<!-- Page Header -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-rose-600 dark:text-rose-400 text-2xl">emergency</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Insiden, Pelanggaran & CAR (Lagging)</h1>
				<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
					5 Dummy Dataset (In-Memory)
				</span>
			</div>
			<p class="text-on-surface-variant font-medium text-sm mt-0.5">
				Pencatatan kecelakaan, estimasi kerugian finansial, investigasi 5-Why & 4M+1E, serta penerbitan CAR
			</p>
		</div>

		<button
			onclick={openCreateModal}
			class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
		>
			<span class="material-symbols-outlined text-lg">add_alert</span>
			<span>Lapor Insiden Baru</span>
		</button>
	</div>

	{#if form?.error}
		<div class="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2.5">
			<span class="material-symbols-outlined text-rose-500 text-lg">error</span>
			<span>{form.error}</span>
		</div>
	{/if}
	{#if form?.message}
		<div class="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2.5">
			<span class="material-symbols-outlined text-emerald-500 text-lg">check_circle</span>
			<span>{form.message}</span>
		</div>
	{/if}

	<!-- Metric Cards (Bento Style) -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Kasus Tercatat</p>
					<h3 class="text-2xl font-black text-on-surface mt-1">{computedSummary.total}</h3>
				</div>
				<div class="w-11 h-11 rounded-xl bg-slate-500/10 text-slate-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">report</span>
				</div>
			</div>
			<div class="flex justify-between text-xs text-on-surface-variant mt-2 font-medium">
				<span>{computedSummary.accidents} Kecelakaan</span>
				<span>•</span>
				<span>{computedSummary.violations} Pelanggaran</span>
			</div>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Kerugian Finansial</p>
					<h3 class="text-xl font-black text-rose-600 mt-1">{formatCurrency(computedSummary.totalLoss)}</h3>
				</div>
				<div class="w-11 h-11 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">payments</span>
				</div>
			</div>
			<p class="text-xs text-rose-600 mt-2 font-bold">Biaya perbaikan unit & klaim kargo</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Hari Kerja Hilang (LTI)</p>
					<h3 class="text-2xl font-black text-amber-600 mt-1">{computedSummary.totalLtiDays} <span class="text-sm font-normal text-on-surface-variant">Hari</span></h3>
				</div>
				<div class="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">event_busy</span>
				</div>
			</div>
			<p class="text-xs text-amber-600 mt-2 font-bold">Lost Time Injury Days akumulatif</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Open CAR (Tindak Lanjut)</p>
					<h3 class="text-2xl font-black text-orange-600 mt-1">{computedSummary.openCar}</h3>
				</div>
				<div class="w-11 h-11 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">assignment_late</span>
				</div>
			</div>
			<p class="text-xs text-orange-600 mt-2 font-bold">{computedSummary.closed} Kasus Telah Ditutup (Closed)</p>
		</div>
	</div>

	<!-- Main Filter & Data Table -->
	<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs overflow-hidden">
		<!-- Table Filter Toolbar -->
		<div class="p-4 border-b border-slate-200/60 dark:border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/30">
			<div class="flex items-center gap-2 w-full sm:w-auto flex-wrap">
				<a
					href="?status=All"
					class="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors {statusFilter === 'All' ? 'bg-rose-600 text-white' : 'bg-surface text-on-surface-variant hover:bg-surface-container'}"
				>
					Semua ({computedSummary.total})
				</a>
				<a
					href="?status=OPEN"
					class="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors {statusFilter === 'OPEN' ? 'bg-rose-600 text-white' : 'bg-surface text-on-surface-variant hover:bg-surface-container'}"
				>
					Perlu Investigasi ({computedSummary.openCases})
				</a>
				<a
					href="?status=CAR_ISSUED"
					class="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors {statusFilter === 'CAR_ISSUED' ? 'bg-orange-600 text-white' : 'bg-surface text-on-surface-variant hover:bg-surface-container'}"
				>
					CAR Aktif ({computedSummary.openCar})
				</a>
				<a
					href="?status=CLOSED"
					class="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors {statusFilter === 'CLOSED' ? 'bg-emerald-600 text-white' : 'bg-surface text-on-surface-variant hover:bg-surface-container'}"
				>
					Closed ({computedSummary.closed})
				</a>
			</div>
		</div>

		<!-- Table View -->
		<div class="overflow-x-auto">
			<table class="w-full text-left text-sm min-w-[950px]">
				<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
					<tr>
						<th class="py-3.5 px-5">No. Insiden & Tanggal</th>
						<th class="py-3.5 px-5">Tipe & Keparahan</th>
						<th class="py-3.5 px-5">Unit / Driver</th>
						<th class="py-3.5 px-5">Lokasi & Kronologi</th>
						<th class="py-3.5 px-5">Kerugian & Faktor (4M)</th>
						<th class="py-3.5 px-5">Status CAR</th>
						<th class="py-3.5 px-5 text-right">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
					{#if displayedIncidents.length === 0}
						<tr>
							<td colspan="7" class="py-12 text-center text-on-surface-variant">
								<span class="material-symbols-outlined text-4xl text-slate-300 block mb-2">verified</span>
								<p class="font-bold text-sm">Tidak ada insiden pada kategori filter ini.</p>
							</td>
						</tr>
					{:else}
						{#each displayedIncidents as inc}
							<tr class="hover:bg-surface-container transition-colors">
								<td class="py-4 px-5">
									<button type="button" onclick={() => openDetailModal(inc)} class="text-left group cursor-pointer">
										<p class="text-xs font-mono font-bold text-rose-600 dark:text-rose-400 group-hover:underline flex items-center gap-1">
											<span>{inc.incident_number}</span>
											<span class="material-symbols-outlined text-[13px] opacity-0 group-hover:opacity-100 transition-opacity">visibility</span>
										</p>
										<p class="text-[10px] text-on-surface-variant mt-0.5">{new Date(inc.incident_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
									</button>
								</td>
								<td class="py-4 px-5">
									<p class="text-xs font-bold text-on-surface">{inc.incident_type}</p>
									<span class="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold {inc.severity === 'High' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' : inc.severity === 'Medium' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'}">
										{inc.severity}
									</span>
								</td>
								<td class="py-4 px-5">
									<p class="text-xs font-bold text-on-surface">{inc.unit_number || 'Tanpa Unit'}</p>
									<p class="text-[11px] text-on-surface-variant mt-0.5">{inc.driver_name || '-'}</p>
								</td>
								<td class="py-4 px-5 max-w-xs">
									<p class="text-xs font-semibold text-on-surface truncate">{inc.description}</p>
									<p class="text-[10px] text-on-surface-variant mt-0.5 flex items-center gap-1">
										<span class="material-symbols-outlined text-xs">location_on</span>
										<span class="truncate">{inc.location}</span>
									</p>
								</td>
								<td class="py-4 px-5">
									<p class="text-xs font-bold text-rose-600">{formatCurrency(Number(inc.financial_loss || 0))}</p>
									{#if inc.lost_work_days > 0}
										<p class="text-[10px] font-bold text-amber-600">LTI: {inc.lost_work_days} Hari</p>
									{/if}
									<div class="flex items-center gap-1 mt-1 flex-wrap">
										{#if inc.is_human_factor}
											<span class="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 text-[9px] font-bold" title="Faktor Manusia">Man</span>
										{/if}
										{#if inc.is_equipment_factor}
											<span class="px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 text-[9px] font-bold" title="Faktor Alat/Mesin">Machine</span>
										{/if}
										{#if inc.is_method_factor}
											<span class="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[9px] font-bold" title="Faktor Prosedur/Metode">Method</span>
										{/if}
										{#if inc.is_environment_factor}
											<span class="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[9px] font-bold" title="Faktor Lingkungan/Cuaca">Env</span>
										{/if}
									</div>
								</td>
								<td class="py-4 px-5">
									{#if inc.car_number}
										<div class="space-y-0.5">
											<span class="text-xs font-mono font-bold text-orange-600">{inc.car_number}</span>
											<p class="text-[10px] text-on-surface-variant">PIC: {inc.pic_followup || '-'}</p>
											{#if inc.status === 'CLOSED'}
												<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
													<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Closed
												</span>
											{:else}
												<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
													<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> In Progress
												</span>
											{/if}
										</div>
									{:else}
										<span class="text-xs text-rose-600 font-medium italic">Belum Ada CAR</span>
									{/if}
								</td>
								<td class="py-4 px-5 text-right">
									<div class="flex items-center justify-end gap-2 flex-wrap">
										<button
											type="button"
											onclick={() => openDetailModal(inc)}
											class="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer border border-blue-200 dark:border-blue-800"
											title="Lihat Detail Investigasi 5-Why & Faktor 4M"
										>
											<span class="material-symbols-outlined text-sm">visibility</span>
											<span>Lihat 5-Why</span>
										</button>

										<button
											type="button"
											onclick={() => openCarModal(inc)}
											class="px-2.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
										>
											<span class="material-symbols-outlined text-sm">psychology</span>
											<span>{inc.car_number ? 'Edit CAR' : 'Analisis 5-Why'}</span>
										</button>
									</div>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>

<!-- Modal: Lapor Insiden Baru -->
{#if showCreateModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
		<div class="bg-surface-container-lowest rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden max-h-[90vh] flex flex-col">
			<div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
				<h3 class="text-base font-bold text-on-surface flex items-center gap-2">
					<span class="material-symbols-outlined text-rose-600 text-xl">report_problem</span>
					<span>Lapor Insiden K3 / Pelanggaran Baru</span>
				</h3>
				<button onclick={() => showCreateModal = false} class="text-on-surface-variant hover:text-on-surface cursor-pointer">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<form action="?/createIncident" method="POST" use:enhance={() => {
				return async ({ result, update }) => {
					await update();
					if (result.type === 'success') showCreateModal = false;
				};
			}} class="p-6 space-y-4 overflow-y-auto flex-1">
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5" for="inc_type">
							Jenis Kejadian
						</label>
						<select id="inc_type" name="incident_type" required class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface text-sm font-medium">
							<option value="Accident">Accident (Kecelakaan Jalan)</option>
							<option value="Pelanggaran Prosedur">Pelanggaran Prosedur / APD</option>
							<option value="Kerusakan Properti/Muatan">Kerusakan Properti / Muatan</option>
							<option value="Kecelakaan Kerja">Kecelakaan Kerja Bengkel/Pool</option>
						</select>
					</div>
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5" for="inc_sev">
							Tingkat Keparahan
						</label>
						<select id="inc_sev" name="severity" required class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface text-sm font-medium">
							<option value="Low">Low (Ringan / Tanpa Kerugian)</option>
							<option value="Medium">Medium (Kerusakan Ringan/Sedang)</option>
							<option value="High">High (Kerusakan Parah / Rawat Inap)</option>
							<option value="Critical / Fatal">Critical / Fatal</option>
						</select>
					</div>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5" for="inc_loss">
							Estimasi Kerugian (Rp)
						</label>
						<input id="inc_loss" type="number" name="financial_loss" placeholder="0" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface text-sm font-medium" />
					</div>
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5" for="inc_lti">
							Hari Kerja Hilang (LTI)
						</label>
						<input id="inc_lti" type="number" name="lost_work_days" min="0" placeholder="0" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface text-sm font-medium" />
					</div>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<div class="flex items-center justify-between mb-1.5">
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider" for="inc_unit">
								Unit Terlibat
							</label>
							{#if createUnitId}
								<span class="text-[10px] font-bold text-blue-600 dark:text-blue-400">Terpilih</span>
							{/if}
						</div>
						<select
							id="inc_unit"
							name="unit_id"
							bind:value={createUnitId}
							onchange={onUnitSelect}
							class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface text-sm font-medium focus:ring-2 focus:ring-rose-500 transition-all"
						>
							<option value="">-- Tanpa Unit --</option>
							{#each units as u}
								{@const match = assignments.find((a: any) => a.unit_id?.toString() === u.id?.toString())}
								<option value={u.id}>
									{u.nomor_unit} {match ? `[Supir: ${match.driver_name}]` : ''}
								</option>
							{/each}
						</select>
					</div>
					<div>
						<div class="flex items-center justify-between mb-1.5">
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider" for="inc_driver">
								Driver Terlibat
							</label>
							{#if createDriverId}
								<span class="text-[10px] font-bold text-blue-600 dark:text-blue-400">Terpilih</span>
							{/if}
						</div>
						<select
							id="inc_driver"
							name="driver_id"
							bind:value={createDriverId}
							onchange={onDriverSelect}
							class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface text-sm font-medium focus:ring-2 focus:ring-rose-500 transition-all"
						>
							<option value="">-- Tanpa Driver --</option>
							{#each drivers as d}
								{@const match = assignments.find((a: any) => a.driver_id?.toString() === d.id?.toString())}
								<option value={d.id}>
									{d.name} {match ? `[Unit: ${match.nomor_unit}]` : ''}
								</option>
							{/each}
						</select>
					</div>

					<!-- Visual Synchronized Assignment Status -->
					{#if syncStatus.text}
						<div class="col-span-2 p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 {syncStatus.type === 'linked' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-slate-100 dark:bg-slate-800 text-on-surface-variant border border-slate-200 dark:border-slate-700'} animate-in fade-in duration-150">
							<span class="material-symbols-outlined text-base">{syncStatus.type === 'linked' ? 'sync' : 'info'}</span>
							<span>{syncStatus.text}</span>
						</div>
					{/if}
				</div>

				<div>
					<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5" for="inc_loc">
						Lokasi Kejadian
					</label>
					<input id="inc_loc" type="text" name="location" placeholder="Cth: Tol Cipularang KM 90 / Pool Cilegon" required class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface text-sm font-medium" />
				</div>

				<div>
					<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5" for="inc_desc">
						Uraian Kronologis Kejadian
					</label>
					<textarea id="inc_desc" name="description" rows="2" placeholder="Jelaskan secara ringkas urutan peristiwa insiden..." required class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface text-sm font-medium"></textarea>
				</div>

				<div>
					<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5" for="inc_csq">
						Dampak / Konsekuensi Kejadian
					</label>
					<input id="inc_csq" type="text" name="consequence" placeholder="Cth: Spakbor penyok, muatan semen 2 sak pecah" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface text-sm font-medium" />
				</div>

				<div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
					<button type="button" onclick={() => showCreateModal = false} class="px-4 py-2.5 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-container">
						Batal
					</button>
					<button type="submit" class="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs">
						Kirim Laporan Insiden
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Modal: Analisis Akar Masalah (Root Cause 5-Why) & CAR -->
{#if showCarModal && selectedIncident}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
		<div class="bg-surface-container-lowest rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xl max-w-xl w-full overflow-hidden max-h-[90vh] flex flex-col">
			<div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
				<div>
					<h3 class="text-base font-bold text-on-surface flex items-center gap-2">
						<span class="material-symbols-outlined text-orange-600 text-xl">psychology</span>
						<span>Investigasi 5-Why & Penerbitan CAR</span>
					</h3>
					<p class="text-xs text-on-surface-variant font-mono mt-0.5">{selectedIncident.incident_number} — {selectedIncident.incident_type}</p>
				</div>
				<button onclick={() => showCarModal = false} class="text-on-surface-variant hover:text-on-surface cursor-pointer">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<form action="?/updateCar" method="POST" use:enhance={() => {
				return async ({ result, update }) => {
					await update();
					if (result.type === 'success') showCarModal = false;
				};
			}} class="p-6 space-y-4 overflow-y-auto flex-1">
				<input type="hidden" name="id" value={selectedIncident.id} />

				<!-- Uraian Kasus Singkat -->
				<div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-xs">
					<p class="font-bold text-on-surface">Kronologi:</p>
					<p class="text-on-surface-variant mt-0.5">{selectedIncident.description}</p>
					{#if selectedIncident.consequence}
						<p class="text-rose-600 font-medium mt-1">Dampak: {selectedIncident.consequence}</p>
					{/if}
				</div>

				<!-- 4M + 1E Factor Checkboxes (dari Herd qhse-app) -->
				<div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-2">
					<p class="text-xs font-bold text-on-surface uppercase tracking-wider">Faktor Penyebab Utama (4M + 1E)</p>
					<div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
						<label class="flex items-center gap-2 text-xs font-semibold text-on-surface cursor-pointer">
							<input type="checkbox" name="is_human_factor" checked={selectedIncident.is_human_factor} class="rounded text-blue-600 focus:ring-blue-500" />
							<span>Man (Manusia)</span>
						</label>
						<label class="flex items-center gap-2 text-xs font-semibold text-on-surface cursor-pointer">
							<input type="checkbox" name="is_equipment_factor" checked={selectedIncident.is_equipment_factor} class="rounded text-purple-600 focus:ring-purple-500" />
							<span>Machine (Alat)</span>
						</label>
						<label class="flex items-center gap-2 text-xs font-semibold text-on-surface cursor-pointer">
							<input type="checkbox" name="is_method_factor" checked={selectedIncident.is_method_factor} class="rounded text-amber-600 focus:ring-amber-500" />
							<span>Method (Metode)</span>
						</label>
						<label class="flex items-center gap-2 text-xs font-semibold text-on-surface cursor-pointer">
							<input type="checkbox" name="is_environment_factor" checked={selectedIncident.is_environment_factor} class="rounded text-emerald-600 focus:ring-emerald-500" />
							<span>Environment</span>
						</label>
					</div>
				</div>

				<!-- 5-Why Analysis Breakdown (dari Herd qhse-app) -->
				<div class="space-y-2.5">
					<p class="text-xs font-bold text-on-surface uppercase tracking-wider">Metode Analisis 5-Why</p>
					
					<div>
						<label class="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1" for="why1">
							1. Mengapa kejadian terjadi?
						</label>
						<input id="why1" type="text" name="why1" value={selectedIncident.analysis_data?.why1 || ''} placeholder="Gejala langsung..." class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-surface text-xs font-medium" />
					</div>
					<div>
						<label class="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1" for="why2">
							2. Mengapa kondisi tersebut muncul?
						</label>
						<input id="why2" type="text" name="why2" value={selectedIncident.analysis_data?.why2 || ''} placeholder="Alasan kondisi..." class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-surface text-xs font-medium" />
					</div>
					<div>
						<label class="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1" for="why3">
							3. Mengapa hal itu tidak dicegah?
						</label>
						<input id="why3" type="text" name="why3" value={selectedIncident.analysis_data?.why3 || ''} placeholder="Alasan pengawasan / kontrol..." class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-surface text-xs font-medium" />
					</div>
					<div>
						<label class="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1" for="why4">
							4. Mengapa sistem tidak mendeteksi?
						</label>
						<input id="why4" type="text" name="why4" value={selectedIncident.analysis_data?.why4 || ''} placeholder="Kelemahan prosedur..." class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-surface text-xs font-medium" />
					</div>
					<div>
						<label class="block text-[11px] font-bold text-rose-600 uppercase tracking-wider mb-1" for="why5">
							5. Akar Masalah Pokok (Root Cause)?
						</label>
						<input id="why5" type="text" name="why5" value={selectedIncident.analysis_data?.why5 || ''} placeholder="Akar masalah fundamental..." class="w-full px-3 py-1.5 rounded-lg border border-rose-300 dark:border-rose-700 bg-surface text-xs font-bold" />
					</div>
				</div>

				<!-- Kesimpulan Akar Masalah -->
				<div>
					<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5" for="car_rc">
						Ringkasan Akar Masalah (Root Cause Summary)
					</label>
					<textarea id="car_rc" name="root_cause_analysis" rows="2" placeholder="Uraikan rangkuman penyebab dasar..." required class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface text-sm font-medium">{selectedIncident.root_cause_analysis || ''}</textarea>
				</div>

				<!-- Corrective Action (Tindakan Korektif Langsung) -->
				<div>
					<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5" for="car_ca">
						Tindakan Korektif Langsung (Corrective Action)
					</label>
					<textarea id="car_ca" name="corrective_action" rows="2" placeholder="Tindakan langsung perbaikan kerusakan / sanksi disiplin..." required class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface text-sm font-medium">{selectedIncident.corrective_action || ''}</textarea>
				</div>

				<!-- Preventive Action (Tindakan Pencegahan Masa Depan) -->
				<div>
					<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5" for="car_pa">
						Tindakan Pencegahan Sistemik (Preventive Action)
					</label>
					<textarea id="car_pa" name="preventive_action" rows="2" placeholder="Pelatihan defensive driving berkala, checklist P2H lebih ketat..." class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface text-sm font-medium">{selectedIncident.preventive_action || ''}</textarea>
				</div>

				<!-- PIC & Due Date -->
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5" for="car_pic">
							PIC Penanggung Jawab
						</label>
						<input id="car_pic" type="text" name="pic_followup" value={selectedIncident.pic_followup || ''} placeholder="Nama HSE Officer / Kepala Pool" required class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface text-sm font-medium" />
					</div>
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5" for="car_due">
							Target Penyelesaian (Due Date)
						</label>
						<input id="car_due" type="date" name="due_date" value={selectedIncident.due_date ? new Date(selectedIncident.due_date).toISOString().split('T')[0] : ''} class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface text-sm font-medium" />
					</div>
				</div>

				<div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
					<button type="button" onclick={() => showCarModal = false} class="px-4 py-2.5 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-container">
						Batal
					</button>
					<button type="submit" class="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-xs">
						Terbitkan / Simpan CAR
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Modal: Detail Investigasi 5-Why & CAR (Read-Only Preview) -->
{#if showDetailModal && selectedIncident}
	{@const whyData = get5Why(selectedIncident)}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
		<div class="bg-surface-container-lowest rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xl max-w-2xl w-full overflow-hidden max-h-[90vh] flex flex-col">
			<!-- Header -->
			<div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
				<div>
					<div class="flex items-center gap-2">
						<span class="material-symbols-outlined text-blue-600 text-xl">account_tree</span>
						<h3 class="text-base font-bold text-on-surface">Detail Investigasi Akar Masalah 5-Why</h3>
					</div>
					<p class="text-xs text-on-surface-variant font-mono mt-0.5">
						{selectedIncident.incident_number} • {selectedIncident.incident_type} • {new Date(selectedIncident.incident_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
					</p>
				</div>
				<button onclick={() => showDetailModal = false} class="text-on-surface-variant hover:text-on-surface cursor-pointer">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<!-- Body -->
			<div class="p-6 space-y-5 overflow-y-auto flex-1">
				<!-- Ringkasan Kasus & Kerugian -->
				<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
					<div class="p-3 rounded-xl bg-surface border border-slate-200 dark:border-slate-800">
						<span class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Unit & Driver</span>
						<p class="text-xs font-bold text-on-surface mt-0.5">{selectedIncident.unit_number || 'Tanpa Unit'}</p>
						<p class="text-[11px] text-on-surface-variant">{selectedIncident.driver_name || '-'}</p>
					</div>
					<div class="p-3 rounded-xl bg-surface border border-slate-200 dark:border-slate-800">
						<span class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Kerugian Finansial</span>
						<p class="text-xs font-bold text-rose-600 mt-0.5">{formatCurrency(Number(selectedIncident.financial_loss || 0))}</p>
						<p class="text-[11px] text-on-surface-variant">LTI: {selectedIncident.lost_work_days || 0} Hari</p>
					</div>
					<div class="p-3 rounded-xl bg-surface border border-slate-200 dark:border-slate-800">
						<span class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Status CAR</span>
						<p class="text-xs font-bold text-orange-600 mt-0.5">{selectedIncident.car_number || 'Belum Ada CAR'}</p>
						<p class="text-[11px] text-on-surface-variant">PIC: {selectedIncident.pic_followup || '-'}</p>
					</div>
				</div>

				<!-- Deskripsi & Lokasi Kejadian -->
				<div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-xs">
					<div class="flex items-center gap-1.5 text-on-surface font-bold mb-1">
						<span class="material-symbols-outlined text-sm text-slate-500">location_on</span>
						<span>Lokasi: {selectedIncident.location}</span>
					</div>
					<p class="text-on-surface-variant leading-relaxed">{selectedIncident.description}</p>
				</div>

				<!-- Faktor Penyebab 4M + 1E -->
				<div>
					<p class="text-xs font-bold text-on-surface uppercase tracking-wider mb-2 flex items-center gap-1.5">
						<span class="material-symbols-outlined text-sm text-orange-600">tune</span>
						<span>Faktor Penyebab yang Teridentifikasi (4M + 1E)</span>
					</p>
					<div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
						<div class="p-2.5 rounded-xl border flex items-center gap-2 {selectedIncident.is_human_factor ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 text-blue-700 dark:text-blue-300 font-bold' : 'bg-surface border-slate-200/60 text-slate-400 opacity-60'}">
							<span class="material-symbols-outlined text-base">person</span>
							<span>Man (Manusia)</span>
						</div>
						<div class="p-2.5 rounded-xl border flex items-center gap-2 {selectedIncident.is_equipment_factor ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 text-purple-700 dark:text-purple-300 font-bold' : 'bg-surface border-slate-200/60 text-slate-400 opacity-60'}">
							<span class="material-symbols-outlined text-base">precision_manufacturing</span>
							<span>Machine (Alat)</span>
						</div>
						<div class="p-2.5 rounded-xl border flex items-center gap-2 {selectedIncident.is_method_factor ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 text-amber-700 dark:text-amber-300 font-bold' : 'bg-surface border-slate-200/60 text-slate-400 opacity-60'}">
							<span class="material-symbols-outlined text-base">assignment</span>
							<span>Method (Metode)</span>
						</div>
						<div class="p-2.5 rounded-xl border flex items-center gap-2 {selectedIncident.is_environment_factor ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-emerald-700 dark:text-emerald-300 font-bold' : 'bg-surface border-slate-200/60 text-slate-400 opacity-60'}">
							<span class="material-symbols-outlined text-base">rainy</span>
							<span>Environment</span>
						</div>
					</div>
				</div>

				<!-- Diagram Alur Analisis 5-Why (Root Cause Investigation) -->
				<div>
					<p class="text-xs font-bold text-on-surface uppercase tracking-wider mb-3 flex items-center gap-1.5">
						<span class="material-symbols-outlined text-sm text-rose-600">schema</span>
						<span>Alur Investigasi Mendalam 5-Why (Root Cause Tree)</span>
					</p>

					<div class="space-y-2 relative before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
						<!-- Why 1 -->
						<div class="relative flex items-start gap-3 pl-8">
							<span class="absolute left-1 top-1 w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">1</span>
							<div class="p-3 rounded-xl bg-surface border border-slate-200 dark:border-slate-800 flex-1">
								<p class="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Why 1: Mengapa kejadian terjadi?</p>
								<p class="text-xs font-medium text-on-surface mt-0.5">{whyData.why1 || '-'}</p>
							</div>
						</div>

						<!-- Why 2 -->
						<div class="relative flex items-start gap-3 pl-8">
							<span class="absolute left-1 top-1 w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">2</span>
							<div class="p-3 rounded-xl bg-surface border border-slate-200 dark:border-slate-800 flex-1">
								<p class="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Why 2: Mengapa kondisi tersebut muncul?</p>
								<p class="text-xs font-medium text-on-surface mt-0.5">{whyData.why2 || '-'}</p>
							</div>
						</div>

						<!-- Why 3 -->
						<div class="relative flex items-start gap-3 pl-8">
							<span class="absolute left-1 top-1 w-5 h-5 rounded-full bg-amber-600 text-white text-[10px] font-bold flex items-center justify-center">3</span>
							<div class="p-3 rounded-xl bg-surface border border-slate-200 dark:border-slate-800 flex-1">
								<p class="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Why 3: Mengapa hal itu tidak dicegah?</p>
								<p class="text-xs font-medium text-on-surface mt-0.5">{whyData.why3 || '-'}</p>
							</div>
						</div>

						<!-- Why 4 -->
						<div class="relative flex items-start gap-3 pl-8">
							<span class="absolute left-1 top-1 w-5 h-5 rounded-full bg-amber-600 text-white text-[10px] font-bold flex items-center justify-center">4</span>
							<div class="p-3 rounded-xl bg-surface border border-slate-200 dark:border-slate-800 flex-1">
								<p class="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Why 4: Mengapa sistem / SOP tidak mendeteksi?</p>
								<p class="text-xs font-medium text-on-surface mt-0.5">{whyData.why4 || '-'}</p>
							</div>
						</div>

						<!-- Why 5 (Root Cause) -->
						<div class="relative flex items-start gap-3 pl-8">
							<span class="absolute left-1 top-1 w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">5</span>
							<div class="p-3.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-800 flex-1">
								<div class="flex items-center gap-1.5 text-rose-700 dark:text-rose-400 font-bold text-xs">
									<span class="material-symbols-outlined text-sm">flag</span>
									<span class="uppercase tracking-wider">Why 5: Akar Masalah Pokok (Root Cause)</span>
								</div>
								<p class="text-xs font-black text-rose-900 dark:text-rose-200 mt-1 leading-relaxed">{whyData.why5 || '-'}</p>
							</div>
						</div>
					</div>
				</div>

				<!-- Tindakan Korektif & Preventif (CAR) -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
					<div class="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs">
						<p class="font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider mb-1 flex items-center gap-1">
							<span class="material-symbols-outlined text-sm">build</span>
							<span>Tindakan Korektif Langsung</span>
						</p>
						<p class="text-on-surface leading-relaxed">{selectedIncident.corrective_action || 'Belum dirumuskan.'}</p>
					</div>
					<div class="p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-xs">
						<p class="font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider mb-1 flex items-center gap-1">
							<span class="material-symbols-outlined text-sm">shield</span>
							<span>Tindakan Pencegahan Sistemik</span>
						</p>
						<p class="text-on-surface leading-relaxed">{selectedIncident.preventive_action || 'Belum dirumuskan.'}</p>
					</div>
				</div>
			</div>

			<!-- Footer Modal -->
			<div class="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
				<button
					type="button"
					onclick={() => { showDetailModal = false; openCarModal(selectedIncident); }}
					class="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
				>
					<span class="material-symbols-outlined text-sm">edit</span>
					<span>Buka Form Edit CAR</span>
				</button>
				<button
					type="button"
					onclick={() => showDetailModal = false}
					class="px-4 py-2 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-container cursor-pointer"
				>
					Tutup
				</button>
			</div>
		</div>
	</div>
{/if}
