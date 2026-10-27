<script lang="ts">
	let { data } = $props();

	let copied = $state(false);
	let isReportModalOpen = $state(false);
	let reportText = $state('');

	function copyLink() {
		if (typeof window !== 'undefined') {
			navigator.clipboard.writeText(window.location.href);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		}
	}

	function getCategoryLabel(cat: string) {
		switch (cat) {
			case 'ELEKTRONIK_IT': return 'Elektronik & IT';
			case 'FASILITAS_GEDUNG': return 'Fasilitas Gedung';
			case 'MESIN_GENSET': return 'Mesin & Genset';
			case 'KENDARAAN_OPERASIONAL': return 'Kendaraan Operasional';
			case 'FURNITUR_KANTOR': return 'Furnitur Kantor';
			default: return cat;
		}
	}

	function getCategoryIcon(cat: string) {
		switch (cat) {
			case 'ELEKTRONIK_IT': return 'devices';
			case 'FASILITAS_GEDUNG': return 'apartment';
			case 'MESIN_GENSET': return 'precision_manufacturing';
			case 'KENDARAAN_OPERASIONAL': return 'directions_car';
			case 'FURNITUR_KANTOR': return 'chair';
			default: return 'inventory_2';
		}
	}

	function getConditionBadge(cond: string) {
		switch (cond) {
			case 'GOOD':
				return { label: 'Kondisi Baik', cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800', icon: 'check_circle' };
			case 'MINOR_DAMAGE':
				return { label: 'Rusak Ringan', cls: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800', icon: 'warning' };
			case 'MAJOR_DAMAGE':
				return { label: 'Rusak Berat', cls: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-800', icon: 'error' };
			case 'SCRAP':
				return { label: 'Siap Scrap / Afkir', cls: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700', icon: 'delete_forever' };
			default:
				return { label: cond || 'Kondisi Standar', cls: 'bg-slate-100 text-slate-700 border-slate-300', icon: 'help' };
		}
	}

	function sendWhatsappReport(asset: any) {
		const message = encodeURIComponent(
			`*Laporan Kendala Aset Fisik*\n` +
			`Kode Aset: ${asset.asset_code}\n` +
			`Nama Aset: ${asset.name}\n` +
			`Lokasi: ${asset.location || '-'} (${asset.room || '-'})\n` +
			`PIC: ${asset.pic_name || '-'}\n\n` +
			`Catatan Kendala:\n${reportText || 'Mohon bantuan inspeksi aset ini.'}`
		);
		const url = `https://wa.me/${data.helpdeskPhone}?text=${message}`;
		if (typeof window !== 'undefined') {
			window.open(url, '_blank');
		}
		isReportModalOpen = false;
	}
</script>

<svelte:head>
	<title>{data.asset ? `${data.asset.asset_code} - ${data.asset.name}` : 'Aset Tidak Ditemukan'} | Portal Scan Aset BCS</title>
	<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
</svelte:head>

<div class="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased pb-16">
	<!-- Top App Bar -->
	<header class="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 py-3">
		<div class="max-w-xl mx-auto flex items-center justify-between">
			<div class="flex items-center gap-2.5">
				<div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#57344f] to-[#7f4a74] text-white flex items-center justify-center font-black text-sm shadow-xs tracking-wider">
					BCS
				</div>
				<div>
					<h1 class="text-xs font-black tracking-tight uppercase text-slate-900 dark:text-white leading-tight">
						PT Bangun Cakrawala Sari
					</h1>
					<p class="text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest">
						Sistem Verifikasi Aset Fisik
					</p>
				</div>
			</div>

			<div class="flex items-center gap-1.5">
				<button
					onclick={copyLink}
					type="button"
					class="p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
					title="Salin Tautan Halaman"
				>
					<span class="material-symbols-outlined text-lg">{copied ? 'done' : 'share'}</span>
				</button>
				<a
					href="/login"
					class="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
				>
					Login ERP
				</a>
			</div>
		</div>
	</header>

	<main class="max-w-xl mx-auto px-4 pt-5 space-y-4">
		{#if !data.asset}
			<!-- NOT FOUND STATE -->
			<div class="p-8 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm mt-8 space-y-4">
				<div class="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 mx-auto flex items-center justify-center">
					<span class="material-symbols-outlined text-3xl">qr_code_scanner</span>
				</div>
				<div>
					<h2 class="text-lg font-black text-slate-900 dark:text-white">Aset Tidak Ditemukan</h2>
					<p class="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
						Kode aset <span class="font-mono font-bold text-slate-800 dark:text-slate-200">"{data.code}"</span> belum terdaftar di database General Affair ERP BCS atau tautan stiker kedaluwarsa.
					</p>
				</div>
				<div class="pt-3">
					<a
						href="https://wa.me/{data.helpdeskPhone}?text={encodeURIComponent(`Halo GA Helpdesk, saya scan QR kode: ${data.code} namun aset belum terdaftar.`)}"
						target="_blank"
						class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors"
					>
						<span class="material-symbols-outlined text-sm">support_agent</span>
						<span>Hubungi GA Helpdesk</span>
					</a>
				</div>
			</div>
		{:else}
			{@const asset = data.asset}
			{@const condInfo = getConditionBadge(asset.condition)}

			<!-- ASSET HEADER CARD -->
			<div class="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs relative overflow-hidden">
				<div class="flex items-start justify-between gap-3">
					<div class="flex-1">
						<div class="flex flex-wrap items-center gap-2 mb-2">
							<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 text-[11px] font-bold border border-teal-200 dark:border-teal-800">
								<span class="material-symbols-outlined text-[13px]">{getCategoryIcon(asset.category)}</span>
								{getCategoryLabel(asset.category)}
							</span>
							<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[11px] border {condInfo.cls}">
								<span class="material-symbols-outlined text-[13px]">{condInfo.icon}</span>
								{condInfo.label}
							</span>
						</div>
						<h2 class="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
							{asset.name}
						</h2>
						{#if asset.brand_model}
							<p class="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-1">
								{asset.brand_model}
							</p>
						{/if}
					</div>

					<div class="flex-shrink-0 text-right">
						<span class="inline-block px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-mono text-xs font-black text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700">
							{asset.asset_code}
						</span>
					</div>
				</div>

				<!-- Serial / Police Number if applicable -->
				{#if asset.serial_number || asset.car_police_number}
					<div class="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
						<span class="text-slate-500 font-medium">
							{asset.category === 'KENDARAAN_OPERASIONAL' ? 'Plat Nomor Kendaraan' : 'Nomor Seri / IMEI'}
						</span>
						<span class="font-mono font-bold text-slate-900 dark:text-white">
							{asset.serial_number || asset.car_police_number || '-'}
						</span>
					</div>
				{/if}
			</div>

			<!-- LOCATION & PIC CARD -->
			<div class="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-3.5">
				<h3 class="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
					<span class="material-symbols-outlined text-[15px] text-teal-600">location_on</span>
					Lokasi & Penanggung Jawab
				</h3>

				<div class="grid grid-cols-2 gap-3 text-xs">
					<div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50">
						<span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Penempatan Fisik</span>
						<span class="font-bold text-slate-900 dark:text-white text-sm block">{asset.location || 'Kantor Pusat'}</span>
						<span class="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">{asset.room || 'Ruangan Utama'}</span>
					</div>

					<div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50">
						<span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Penanggung Jawab (PIC)</span>
						<span class="font-bold text-slate-900 dark:text-white text-sm block truncate">{asset.pic_name || 'General Affair'}</span>
						<span class="text-[11px] text-teal-600 dark:text-teal-400 font-semibold block mt-0.5">Pemegang Aktif</span>
					</div>
				</div>

				{#if asset.category === 'KENDARAAN_OPERASIONAL'}
					<div class="p-3 rounded-2xl bg-teal-50/50 dark:bg-teal-950/30 border border-teal-200/60 dark:border-teal-800/60 flex items-center justify-between text-xs">
						<div class="flex items-center gap-2">
							<span class="material-symbols-outlined text-teal-600 text-lg">local_gas_station</span>
							<div>
								<span class="font-bold text-slate-800 dark:text-slate-200">Bahan Bakar & Efisiensi</span>
								<p class="text-[11px] text-slate-500">{asset.fuel_name || 'BBM Standar'} • Rata-rata {asset.km_per_liter || '0'} KM/L</p>
							</div>
						</div>
						<span class="px-2 py-1 rounded bg-teal-600 text-white font-mono text-[11px] font-bold">
							{asset.vehicle_group || 'R4'}
						</span>
					</div>
				{/if}

				{#if asset.notes}
					<div class="text-xs p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 leading-relaxed">
						<span class="font-bold text-slate-800 dark:text-slate-200 block mb-0.5">Catatan Spesifikasi:</span>
						{asset.notes}
					</div>
				{/if}
			</div>

			<!-- MUTATION TIMELINE CARD -->
			<div class="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-3.5">
				<div class="flex items-center justify-between">
					<h3 class="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
						<span class="material-symbols-outlined text-[15px] text-indigo-600">history</span>
						Riwayat Mutasi & Perjalanan Aset
					</h3>
					<span class="text-[11px] font-bold text-slate-500">{data.mutations.length} Perubahan</span>
				</div>

				{#if data.mutations.length === 0}
					<p class="text-xs text-slate-400 italic py-2">
						Aset ini belum pernah dimutasi sejak terdaftar pada {asset.registered_at || asset.acquisition_date || '-'}.
					</p>
				{:else}
					<div class="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
						{#each data.mutations as m (m.id)}
							<div class="relative text-xs">
								<div class="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-indigo-600 ring-4 ring-white dark:ring-slate-900"></div>
								<div class="flex items-center justify-between">
									<span class="font-bold text-slate-800 dark:text-slate-200">{m.mutation_date}</span>
									<span class="text-[10px] text-slate-400 font-medium">Disetujui: {m.approved_by || 'GA Head'}</span>
								</div>
								<div class="mt-1 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50">
									<p class="font-bold text-slate-900 dark:text-white">
										{m.from_location || '-'} <span class="text-indigo-600 font-black mx-1">➔</span> {m.to_location}
									</p>
									<p class="text-[11px] text-slate-500 mt-0.5">
										PIC: {m.from_pic || '-'} ➔ <span class="font-semibold text-slate-700 dark:text-slate-300">{m.to_pic}</span>
									</p>
									{#if m.reason}
										<p class="text-[11px] text-slate-600 dark:text-slate-400 mt-1 italic">"{m.reason}"</p>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- ACTION BUTTONS -->
			<div class="grid grid-cols-2 gap-3 pt-2">
				<button
					onclick={() => (isReportModalOpen = true)}
					class="w-full py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
				>
					<span class="material-symbols-outlined text-base">report_problem</span>
					<span>Laporkan Kendala</span>
				</button>

				<a
					href="https://wa.me/{data.helpdeskPhone}?text={encodeURIComponent(`Halo GA Helpdesk, saya ingin menanyakan perihal aset: ${asset.asset_code} - ${asset.name}`)}"
					target="_blank"
					class="w-full py-3 px-4 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
				>
					<span class="material-symbols-outlined text-base">chat</span>
					<span>WhatsApp Helpdesk</span>
				</a>
			</div>
		{/if}
	</main>
</div>

<!-- MODAL: LAPOR KENDALA CEPAT -->
{#if isReportModalOpen && data.asset}
	<div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
		<div class="bg-white dark:bg-slate-900 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 space-y-4">
			<div class="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
				<div class="flex items-center gap-2 text-amber-600">
					<span class="material-symbols-outlined">report_problem</span>
					<h3 class="font-black text-sm text-slate-900 dark:text-white">Laporkan Kendala Aset</h3>
				</div>
				<button onclick={() => (isReportModalOpen = false)} class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<div class="text-xs text-slate-600 dark:text-slate-300">
				<p>Melaporkan kendala untuk:</p>
				<p class="font-bold text-slate-900 dark:text-white mt-0.5">{data.asset.asset_code} • {data.asset.name}</p>
			</div>

			<div>
				<label for="report-note-input" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
					Rincian Kerusakan / Kendala Lapangan:
				</label>
				<textarea
					id="report-note-input"
					bind:value={reportText}
					rows="4"
					placeholder="Contoh: AC tidak dingin, mesin mati mendadak, roda bocor, layar monitor bergaris..."
					class="w-full text-xs p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-amber-500/20 text-slate-900 dark:text-white resize-none"
				></textarea>
			</div>

			<div class="flex items-center justify-end gap-2 pt-2">
				<button
					type="button"
					onclick={() => (isReportModalOpen = false)}
					class="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
				>
					Batal
				</button>
				<button
					type="button"
					onclick={() => sendWhatsappReport(data.asset)}
					class="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs"
				>
					<span class="material-symbols-outlined text-sm">send</span>
					<span>Kirim ke Helpdesk GA</span>
				</button>
			</div>
		</div>
	</div>
{/if}
