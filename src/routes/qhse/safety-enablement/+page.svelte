<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let summary = $derived(data.summary);
	let apds = $derived(data.apds || []);
	let briefings = $derived(data.briefings || []);
	let drivers = $derived(data.drivers || []);
	let employees = $derived(data.employees || []);

	let showApdModal = $state(false);
	let showBriefingModal = $state(false);
</script>

<svelte:head>
	<title>Safety Briefing & APD | QHSE ERP BCS</title>
</svelte:head>

<div class="space-y-6">
	<!-- Page Header -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-blue-600 dark:text-blue-400 text-2xl">health_and_safety</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Safety Briefing & Manajemen APD</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-sm mt-0.5">
				Log Toolbox Meeting harian, Forum Group Discussion (FGD K3), dan pencatatan distribusi Alat Pelindung Diri
			</p>
		</div>

		<div class="flex items-center gap-3">
			<button
				onclick={() => showBriefingModal = true}
				class="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-bold transition-colors cursor-pointer"
			>
				<span class="material-symbols-outlined text-lg">groups</span>
				<span>Log Toolbox / FGD</span>
			</button>
			<button
				onclick={() => showApdModal = true}
				class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
			>
				<span class="material-symbols-outlined text-lg">hard_drive</span>
				<span>Distribusi APD Baru</span>
			</button>
		</div>
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
	<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Item APD Terdistribusi</p>
					<h3 class="text-2xl font-black text-blue-600 mt-1">{summary.totalApdItems} Item</h3>
				</div>
				<div class="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">safety_check</span>
				</div>
			</div>
			<p class="text-xs text-on-surface-variant mt-2 font-medium">Helm, rompi, sepatu safety, sarung tangan</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Sesi Briefing / FGD K3</p>
					<h3 class="text-2xl font-black text-on-surface mt-1">{summary.totalBriefings} Sesi</h3>
				</div>
				<div class="w-11 h-11 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">forum</span>
				</div>
			</div>
			<p class="text-xs text-on-surface-variant mt-2 font-medium">Toolbox meeting & sosialisasi keselamatan</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Kehadiran Karyawan</p>
					<h3 class="text-2xl font-black text-emerald-600 mt-1">{summary.totalParticipants} Orang</h3>
				</div>
				<div class="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">co_present</span>
				</div>
			</div>
			<p class="text-xs text-emerald-600 mt-2 font-bold">Terdaftar dalam logbook edukasi K3</p>
		</div>
	</div>

	<!-- Split Grids: Briefings & APD Distribution -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- Left: Safety Briefings & FGDs -->
		<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs overflow-hidden flex flex-col max-h-[500px]">
			<div class="px-5 py-4 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-purple-600 text-lg">forum</span>
					<h3 class="text-sm font-bold text-on-surface">Log Toolbox Meeting & FGD K3</h3>
				</div>
				<span class="text-xs font-bold text-on-surface-variant">{briefings.length} Sesi</span>
			</div>

			<div class="overflow-y-auto flex-1 p-4 divide-y divide-slate-100 dark:divide-slate-800/80">
				{#if briefings.length === 0}
					<div class="py-12 text-center text-xs text-on-surface-variant">Belum ada log briefing K3.</div>
				{:else}
					{#each briefings as b}
						<div class="py-3.5 first:pt-0 last:pb-0 space-y-1.5">
							<div class="flex items-center justify-between">
								<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
									{b.briefing_type}
								</span>
								<span class="text-xs font-bold text-emerald-600 flex items-center gap-1">
									<span class="material-symbols-outlined text-sm">groups</span>
									<span>{b.participant_count} Peserta</span>
								</span>
							</div>
							<p class="text-xs font-bold text-on-surface">{b.topic}</p>
							<p class="text-[11px] text-on-surface-variant line-clamp-2">{b.notes || '-'}</p>
							<div class="flex items-center justify-between text-[10px] text-on-surface-variant pt-1">
								<span>Instruktur: <strong>{b.leader_name}</strong> ({b.location})</span>
								<span>{new Date(b.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
							</div>
						</div>
					{/each}
				{/if}
			</div>
		</div>

		<!-- Right: APD Distributions -->
		<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs overflow-hidden flex flex-col max-h-[500px]">
			<div class="px-5 py-4 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-blue-600 text-lg">hard_drive</span>
					<h3 class="text-sm font-bold text-on-surface">Riwayat Distribusi APD Karyawan & Supir</h3>
				</div>
				<span class="text-xs font-bold text-on-surface-variant">{apds.length} Log</span>
			</div>

			<div class="overflow-y-auto flex-1">
				<table class="w-full text-left text-xs">
					<thead class="sticky top-0 bg-slate-100/70 dark:bg-slate-800/50 font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
						<tr>
							<th class="py-3 px-4">Penerima & Peran</th>
							<th class="py-3 px-4">Item APD</th>
							<th class="py-3 px-4">Tgl Serah & Expired</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
						{#if apds.length === 0}
							<tr><td colspan="3" class="py-8 text-center text-xs text-on-surface-variant">Belum ada distribusi APD tercatat.</td></tr>
						{/if}
						{#each apds as a}
							<tr class="hover:bg-surface-container transition-colors">
								<td class="py-3 px-4">
									<p class="font-bold text-on-surface">{a.recipient_name}</p>
									<span class="text-[10px] text-on-surface-variant">{a.role}</span>
								</td>
								<td class="py-3 px-4">
									<p class="font-bold text-blue-600 dark:text-blue-400">{a.item_name}</p>
									<span class="text-[10px] text-on-surface-variant">Qty: {a.quantity} Unit ({a.condition})</span>
								</td>
								<td class="py-3 px-4">
									<p class="text-on-surface">{new Date(a.distribution_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
									{#if a.expiry_date}
										<span class="text-[10px] text-on-surface-variant">Exp: {new Date(a.expiry_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	</div>
</div>

<!-- Modal: Distribusi APD Baru -->
{#if showApdModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
		<div class="bg-surface-container-lowest rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden">
			<div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
				<h3 class="text-base font-bold text-on-surface flex items-center gap-2">
					<span class="material-symbols-outlined text-blue-600 text-xl">hard_drive</span>
					<span>Catat Penyerahan APD</span>
				</h3>
				<button onclick={() => showApdModal = false} class="text-on-surface-variant hover:text-on-surface cursor-pointer">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<form action="?/distributeApd" method="POST" use:enhance={() => {
				return async ({ result, update }) => {
					await update();
					if (result.type === 'success') showApdModal = false;
				};
			}} class="p-6 space-y-4">
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5" for="apd_rec">
							Nama Penerima
						</label>
						<input id="apd_rec" type="text" name="recipient_name" placeholder="Nama Karyawan / Supir" required class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface text-sm font-medium" />
					</div>
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5" for="apd_role">
							Peran / Jabatan
						</label>
						<select id="apd_role" name="role" required class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface text-sm font-medium">
							<option value="Driver">Driver / Pengemudi</option>
							<option value="Mechanic">Mekanik / Bengkel</option>
							<option value="Operator">Operator Alat Berat / Forklift</option>
							<option value="Staff">Staff Lapangan / Pool</option>
						</select>
					</div>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5" for="apd_item">
							Jenis APD
						</label>
						<select id="apd_item" name="item_name" required class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface text-sm font-medium">
							<option value="Helm Proyek (Safety Helmet)">Helm Proyek (Safety Helmet)</option>
							<option value="Rompi Reflektor K3">Rompi Reflektor K3</option>
							<option value="Sepatu Safety Boots (Steel Toe)">Sepatu Safety Boots (Steel Toe)</option>
							<option value="Sarung Tangan Safety">Sarung Tangan Safety</option>
							<option value="Kacamata Pelindung (Goggles)">Kacamata Pelindung (Goggles)</option>
							<option value="Earplug / Earmuff">Earplug / Earmuff</option>
						</select>
					</div>
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5" for="apd_qty">
							Jumlah (Qty)
						</label>
						<input id="apd_qty" type="number" name="quantity" min="1" value="1" required class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface text-sm font-medium" />
					</div>
				</div>

				<div>
					<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5" for="apd_notes">
						Catatan / Ukuran
					</label>
					<input id="apd_notes" type="text" name="notes" placeholder="Cth: Ukuran 42, Standar Pengelasan, dll." class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface text-sm font-medium" />
				</div>

				<div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
					<button type="button" onclick={() => showApdModal = false} class="px-4 py-2.5 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-container">
						Batal
					</button>
					<button type="submit" class="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs">
						Simpan Penyerahan APD
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Modal: Log Briefing / FGD K3 Baru -->
{#if showBriefingModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
		<div class="bg-surface-container-lowest rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden">
			<div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
				<h3 class="text-base font-bold text-on-surface flex items-center gap-2">
					<span class="material-symbols-outlined text-purple-600 text-xl">forum</span>
					<span>Log Sesi Briefing / FGD K3</span>
				</h3>
				<button onclick={() => showBriefingModal = false} class="text-on-surface-variant hover:text-on-surface cursor-pointer">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<form action="?/createBriefing" method="POST" use:enhance={() => {
				return async ({ result, update }) => {
					await update();
					if (result.type === 'success') showBriefingModal = false;
				};
			}} class="p-6 space-y-4">
				<div>
					<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5" for="brf_topic">
						Topik Pembahasan K3
					</label>
					<input id="brf_topic" type="text" name="topic" placeholder="Cth: Toolbox Meeting: Defensive Driving & Blind Spot" required class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface text-sm font-medium" />
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5" for="brf_type">
							Jenis Sesi
						</label>
						<select id="brf_type" name="briefing_type" required class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface text-sm font-medium">
							<option value="TOOLBOX_MEETING">Toolbox Meeting (Harian)</option>
							<option value="FGD">Forum Group Discussion (FGD)</option>
							<option value="SAFETY_INDUCTION">Safety Induction (Karyawan Baru)</option>
							<option value="TRAINING">Pelatihan Khusus K3</option>
						</select>
					</div>
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5" for="brf_count">
							Jumlah Peserta Hadir
						</label>
						<input id="brf_count" type="number" name="participant_count" min="1" value="15" required class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface text-sm font-medium" />
					</div>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5" for="brf_leader">
							Instruktur / Pemimpin Sesi
						</label>
						<input id="brf_leader" type="text" name="leader_name" placeholder="Nama Instruktur" required class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface text-sm font-medium" />
					</div>
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5" for="brf_loc">
							Lokasi Sesi
						</label>
						<input id="brf_loc" type="text" name="location" placeholder="Pool Cilegon / R. Training" required class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface text-sm font-medium" />
					</div>
				</div>

				<div>
					<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5" for="brf_notes">
						Poin Kesepakatan / Catatan Sesi
					</label>
					<textarea id="brf_notes" name="notes" rows="2" placeholder="Rangkuman poin keselamatan yang ditekankan..." class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface text-sm font-medium"></textarea>
				</div>

				<div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
					<button type="button" onclick={() => showBriefingModal = false} class="px-4 py-2.5 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-container">
						Batal
					</button>
					<button type="submit" class="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs">
						Simpan Log Sesi K3
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
