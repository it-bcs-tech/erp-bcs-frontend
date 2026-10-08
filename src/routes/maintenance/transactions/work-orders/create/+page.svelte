<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';

	let { data, form }: { data: PageData; form: any } = $props();

	const units = $derived(data.units || []);
	const mechanics = $derived(data.mechanics || []);
	const drivers = $derived(data.drivers || []);

	let selectedUnitId = $state(data.initialUnit || '');
	let maintCategory = $state(data.initialCategory || 'Regular Repair');
	let driverId = $state(data.initialDriver || '');
	let mechanicId = $state('');
	let helperMechanicId = $state('');
	let complaint = $state(data.initialComplaint || '');
	let kilometer = $state<number | null>(data.initialOdometer || null);
	let hourmeter = $state<number | null>(null);
	let jobLocation = $state('Workshop Pool Utama');

	// Dynamic repair tasks (diinisialisasi dari temuan inspeksi jika ada)
	interface RepairTaskItem {
		item: string;
		category: string;
		remark: string;
		isFromInspection?: boolean;
	}

	let repairTasks = $state<RepairTaskItem[]>(
		data.importedTasks && data.importedTasks.length > 0
			? data.importedTasks.map(t => ({
				item: t.item,
				category: t.category,
				remark: t.remark,
				isFromInspection: true
			}))
			: [{ item: '', category: 'Perbaikan Umum', remark: '', isFromInspection: false }]
	);

	let isSubmitting = $state(false);

	function addTask() {
		repairTasks = [
			...repairTasks, 
			{ 
				item: '', 
				category: maintCategory || 'Pekerjaan Tambahan', 
				remark: '', 
				isFromInspection: false 
			}
		];
	}

	function removeTask(index: number) {
		if (repairTasks.length > 1) {
			repairTasks = repairTasks.filter((_, i) => i !== index);
		}
	}

	function handleUnitChange() {
		const found = units.find(u => u.noUnit === selectedUnitId);
		if (found && found.odometer && !kilometer) {
			kilometer = found.odometer;
		}
	}

	// Auto-trigger on initial mount if initialUnit is passed
	if (selectedUnitId && !kilometer) {
		handleUnitChange();
	}
</script>

<svelte:head>
	<title>Buat SPK Bengkel Baru | ERP BCS</title>
</svelte:head>

<div class="max-w-4xl mx-auto space-y-5 pb-16 px-1 sm:px-2">
	<!-- Header -->
	<header>
		<nav class="flex items-center gap-1.5 text-xs text-on-surface-variant font-medium mb-1">
			<a href="/maintenance" class="hover:text-primary transition-colors">Maintenance</a>
			<span class="material-symbols-outlined text-[14px]">chevron_right</span>
			<a href="/maintenance/transactions/work-orders" class="hover:text-primary transition-colors">Work Orders</a>
			<span class="material-symbols-outlined text-[14px]">chevron_right</span>
			<span class="text-on-surface font-bold">Buat SPK Baru</span>
		</nav>
		<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
			<div>
				<h1 class="text-xl sm:text-2xl font-black text-on-surface tracking-tight flex items-center gap-2">
					<span class="material-symbols-outlined text-primary text-2xl sm:text-3xl">note_add</span>
					Penerbitan Surat Perintah Kerja (SPK)
				</h1>
				<p class="text-xs text-on-surface-variant mt-0.5">
					Form resmi perintah kerja perbaikan armada oleh tim mekanik bengkel workshop.
				</p>
			</div>
			{#if data.inspectionRef}
				<span class="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[11px] font-mono font-bold self-start sm:self-auto">
					Ref: {data.inspectionRef.inspectionNo}
				</span>
			{/if}
		</div>
	</header>

	<!-- Alert Banner jika diimpor dari hasil Inspeksi P2H -->
	{#if data.inspectionRef}
		<div class="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-800/80 space-y-2">
			<div class="flex items-center gap-2 font-black text-xs text-amber-900 dark:text-amber-200 uppercase tracking-wide">
				<span class="material-symbols-outlined text-[18px] text-amber-600">assignment_late</span>
				<span>Formulir Terisi Otomatis dari Lembar Inspeksi P2H</span>
			</div>
			<p class="text-xs text-amber-800 dark:text-amber-300">
				Nomor Unit <b>{data.inspectionRef.unitId}</b> ({data.inspectionRef.unitType}), driver, odometer, dan <b>{data.importedTasks.length} item temuan cacat</b> telah otomatis dimuat ke daftar pekerjaan di bawah.
				Anda dapat mengedit, menghapus, atau <b>menambahkan item perbaikan baru</b> sebelum menerbitkan SPK.
			</p>
		</div>
	{/if}

	{#if form?.message}
		<div class="p-3.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs sm:text-sm font-semibold flex items-center gap-2">
			<span class="material-symbols-outlined text-[18px]">error</span>
			<span>{form.message}</span>
		</div>
	{/if}

	<form method="POST" use:enhance={() => {
		isSubmitting = true;
		return async ({ update }) => {
			isSubmitting = false;
			await update();
		};
	}} class="space-y-4">

		<!-- Hidden Inputs -->
		<input type="hidden" name="items" value={JSON.stringify(repairTasks.filter(t => t.item.trim().length > 0))} />
		{#if data.inspectionRef}
			<input type="hidden" name="inspection_no" value={data.inspectionRef.inspectionNo} />
		{/if}

		<!-- Card 1: Unit & Kategori Perbaikan -->
		<div class="p-4 sm:p-6 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 space-y-4">
			<h2 class="text-xs sm:text-sm font-black text-on-surface uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2.5">
				<span class="material-symbols-outlined text-primary text-[18px]">directions_car</span>
				Informasi Unit & Kategori Kerusakan
			</h2>

			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
				<!-- No. Unit -->
				<div>
					<label for="unit_id" class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Nomor Unit Armada *</label>
					<input 
						id="unit_id"
						name="unit_id" 
						list="units-list"
						bind:value={selectedUnitId}
						onchange={handleUnitChange}
						placeholder="Pilih No. Unit..." 
						required
						class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-mono font-bold text-on-surface outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
					/>
					<datalist id="units-list">
						{#each units as u}
							<option value={u.noUnit}>{u.noUnit} ({u.type || 'Truck'})</option>
						{/each}
					</datalist>
				</div>

				<!-- Kategori Servis -->
				<div>
					<label for="maint_category" class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Kategori Perawatan *</label>
					<select 
						id="maint_category"
						name="maint_category" 
						bind:value={maintCategory}
						class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-medium text-on-surface outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
					>
						<option value="Corrective Repair (P2H)">Corrective Repair (Temuan P2H)</option>
						<option value="Regular Repair">Regular Repair / Servis Ringan</option>
						<option value="Breakdown Repair">Breakdown / Mogok Darurat</option>
						<option value="Preventive Maintenance">Preventive Maintenance (Servis Berkala)</option>
						<option value="Overhaul Engine">Overhaul Mesin / Transmisi</option>
						<option value="Tire & Wheel Service">Ban & Kaki-kaki (Wheel Alignment)</option>
						<option value="Electrical Repair">Kelistrikan & Wiring</option>
						<option value="Body & Chassis Repair">Bodi, Bak & Chassis</option>
					</select>
				</div>

				<!-- Odometer (KM) -->
				<div>
					<label for="kilometer" class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Kilometer (Odometer)</label>
					<input 
						id="kilometer"
						type="number" 
						name="kilometer" 
						bind:value={kilometer}
						placeholder="125000" 
						class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-mono text-on-surface outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
					/>
				</div>

				<!-- Pengemudi -->
				<div>
					<label for="driver_id" class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Pengemudi (Driver)</label>
					<select 
						id="driver_id"
						name="driver_id" 
						bind:value={driverId}
						class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-xs font-medium text-on-surface outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
					>
						<option value="">-- Pilih Pengemudi --</option>
						{#each drivers as d}
							<option value={d.id}>{d.name} ({d.id})</option>
						{/each}
					</select>
				</div>

				<!-- Lokasi Pekerjaan -->
				<div class="sm:col-span-2">
					<label for="job_location" class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Lokasi Perbaikan</label>
					<input 
						id="job_location"
						type="text" 
						name="job_location" 
						bind:value={jobLocation}
						placeholder="Pool Utama / Site Luar..." 
						class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-xs text-on-surface outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
					/>
				</div>
			</div>
		</div>

		<!-- Card 2: Penugasan Mekanik & Tim Bengkel -->
		<div class="p-4 sm:p-6 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 space-y-4">
			<h2 class="text-xs sm:text-sm font-black text-on-surface uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2.5">
				<span class="material-symbols-outlined text-primary text-[18px]">engineering</span>
				Penugasan Mekanik Bengkel
			</h2>

			<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
				<div>
					<label for="mechanic_id" class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Mekanik Utama</label>
					<select 
						id="mechanic_id"
						name="mechanic_id" 
						bind:value={mechanicId}
						class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-medium text-on-surface outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
					>
						<option value="">-- Tugaskan Nanti (Status: Antre / Open) --</option>
						{#each mechanics as m}
							<option value={m.id}>{m.name} ({m.id})</option>
						{/each}
					</select>
				</div>

				<div>
					<label for="helper_mechanic_id" class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Helper / Asisten Mekanik (Opsional)</label>
					<select 
						id="helper_mechanic_id"
						name="helper_mechanic_id" 
						bind:value={helperMechanicId}
						class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-medium text-on-surface outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
					>
						<option value="">-- Tanpa Helper --</option>
						{#each mechanics as m}
							<option value={m.id}>{m.name} ({m.id})</option>
						{/each}
					</select>
				</div>
			</div>
		</div>

		<!-- Card 3: Keluhan & Daftar Item Pekerjaan Perbaikan -->
		<div class="p-4 sm:p-6 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 space-y-4">
			<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/70 dark:border-slate-800/70 pb-3">
				<div>
					<h2 class="text-xs sm:text-sm font-black text-on-surface uppercase tracking-wider flex items-center gap-2">
						<span class="material-symbols-outlined text-primary text-[18px]">checklist</span>
						Keluhan & Rincian Item Pekerjaan ({repairTasks.length} Item)
					</h2>
					<p class="text-[11px] text-on-surface-variant mt-0.5">
						Mekanik akan menutup item ini satu per satu sebagai progres pengerjaan di bengkel.
					</p>
				</div>
				<button 
					type="button" 
					onclick={addTask}
					class="px-3 py-1.5 rounded-lg text-xs font-bold bg-primary/10 text-primary hover:bg-primary/20 transition-all flex items-center gap-1 self-start sm:self-auto shrink-0"
				>
					<span class="material-symbols-outlined text-[16px]">add</span>
					<span>Tambah Item Baru</span>
				</button>
			</div>

			<!-- Keluhan Utama -->
			<div>
				<label for="keluhan_driver" class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">
					Ringkasan Keluhan / Instruksi Perbaikan *
				</label>
				<input 
					id="keluhan_driver"
					type="text" 
					name="keluhan_driver" 
					bind:value={complaint}
					placeholder="Contoh: Temuan perbaikan rem angin dan kelistrikan lampu..." 
					required
					class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-semibold"
				/>
			</div>

			<!-- Dynamic Task List -->
			<div class="space-y-3 pt-1">
				<div class="flex items-center justify-between">
					<span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
						Rincian Item Pengerjaan (Per-Item Tracking):
					</span>
					<span class="text-[10px] text-on-surface-variant">
						Bisa diedit, dihapus, atau ditambah item baru
					</span>
				</div>

				<div class="space-y-2">
					{#each repairTasks as task, idx}
						<div class="p-2.5 sm:p-3 rounded-xl border transition-all {task.isFromInspection ? 'bg-amber-50/30 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50' : 'bg-surface-container-low border-slate-200 dark:border-slate-800'} space-y-2">
							<div class="flex items-start justify-between gap-2">
								<div class="flex items-center gap-2 flex-1 flex-wrap">
									<span class="font-mono text-xs font-black text-on-surface-variant w-5">#{idx + 1}</span>
									<span class="px-2 py-0.5 rounded-md bg-surface-container font-mono text-[10px] font-bold text-on-surface uppercase border border-slate-200 dark:border-slate-700">
										{task.category || 'PERBAIKAN'}
									</span>
									{#if task.isFromInspection}
										<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
											Temuan P2H
										</span>
									{:else}
										<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200">
											Item Baru
										</span>
									{/if}
								</div>

								<button 
									type="button" 
									onclick={() => removeTask(idx)} 
									disabled={repairTasks.length <= 1}
									class="p-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-20 disabled:cursor-not-allowed"
									title="Hapus baris pekerjaan ini"
								>
									<span class="material-symbols-outlined text-[18px]">delete</span>
								</button>
							</div>

							<!-- Inputs: Nama Item & Catatan -->
							<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
								<div>
									<input 
										type="text" 
										bind:value={repairTasks[idx].item}
										placeholder="Nama komponen / pekerjaan..." 
										class="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-lowest border border-slate-200 dark:border-slate-800 text-xs font-bold text-on-surface outline-none focus:ring-1 focus:ring-primary"
									/>
								</div>
								<div>
									<input 
										type="text" 
										bind:value={repairTasks[idx].remark}
										placeholder="Catatan pengerjaan / instruksi khusus..." 
										class="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-lowest border border-slate-200 dark:border-slate-800 text-xs text-on-surface outline-none focus:ring-1 focus:ring-primary"
									/>
								</div>
							</div>
						</div>
					{/each}
				</div>

				<button 
					type="button" 
					onclick={addTask}
					class="w-full py-2.5 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-primary text-on-surface-variant hover:text-primary text-xs font-bold transition-all flex items-center justify-center gap-1.5"
				>
					<span class="material-symbols-outlined text-[16px]">add_circle</span>
					<span>Tambah Item Pekerjaan Lainnya</span>
				</button>
			</div>
		</div>

		<!-- Action Footer -->
		<div class="p-4 sm:p-5 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 flex items-center justify-between gap-3">
			<a 
				href={data.inspectionRef ? `/maintenance/transactions/inspections/${encodeURIComponent(data.inspectionRef.inspectionNo)}` : '/maintenance/transactions/work-orders'} 
				class="px-4 py-2 sm:py-2.5 rounded-xl bg-surface-container text-on-surface hover:bg-surface-container-high font-bold text-xs transition-all"
			>
				Batal
			</a>
			<button 
				type="submit" 
				disabled={isSubmitting || !selectedUnitId || !complaint}
				class="px-5 sm:px-6 py-2 sm:py-2.5 rounded-xl bg-primary hover:opacity-95 text-on-primary font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{#if isSubmitting}
					<span class="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
					<span>Menerbitkan SPK...</span>
				{:else}
					<span class="material-symbols-outlined text-[18px]">send</span>
					<span>Terbitkan Surat Perintah Kerja (SPK)</span>
				{/if}
			</button>
		</div>

	</form>
</div>
