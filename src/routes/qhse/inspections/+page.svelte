<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let summary = $derived(data.summary);
	let reports = $derived(data.reports || []);

	let showCreateModal = $state(false);
	let selectedReport = $state<any>(null);
</script>

<svelte:head>
	<title>Inspeksi & Proaktif (Leading) | QHSE ERP BCS</title>
</svelte:head>

<div class="space-y-6">
	<!-- Page Header -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-2xl">fact_check</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Inspeksi & Proaktif (Leading Indicator)</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-sm mt-0.5">
				Safety Patrol, Safety Observation Tour (SOT), Laporan Near-Miss, Inspeksi P2H, dan CAPA Register
			</p>
		</div>

		<button
			onclick={() => showCreateModal = true}
			class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
		>
			<span class="material-symbols-outlined text-lg">add_task</span>
			<span>Input Temuan Proaktif</span>
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
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Laporan Proaktif</p>
					<h3 class="text-2xl font-black text-on-surface mt-1">{summary.total}</h3>
				</div>
				<div class="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">visibility</span>
				</div>
			</div>
			<p class="text-xs text-on-surface-variant mt-2 font-medium">Aktivitas pencegahan & inspeksi K3</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Laporan Near-Miss</p>
					<h3 class="text-2xl font-black text-amber-600 mt-1">{summary.nearmiss}</h3>
				</div>
				<div class="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">near_me_disabled</span>
				</div>
			</div>
			<p class="text-xs text-amber-600 mt-2 font-bold">Kejadian hampir celaka di lapangan</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Patrol & SOT Tour</p>
					<h3 class="text-2xl font-black text-blue-600 mt-1">{summary.patrolAndSot}</h3>
				</div>
				<div class="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">policy</span>
				</div>
			</div>
			<p class="text-xs text-blue-600 mt-2 font-bold">Patroli keselamatan workshop & pool</p>
		</div>

		<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Open CAPA Register</p>
					<h3 class="text-2xl font-black text-orange-600 mt-1">{summary.openCapa}</h3>
				</div>
				<div class="w-11 h-11 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center">
					<span class="material-symbols-outlined text-2xl">construction</span>
				</div>
			</div>
			<p class="text-xs text-orange-600 mt-2 font-bold">{summary.closedCapa} Temuan Selesai Diperbaiki</p>
		</div>
	</div>

	<!-- Main Filter & Data Table -->
	<div class="rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 shadow-xs overflow-hidden">
		<!-- Table Filter Toolbar -->
		<div class="p-4 border-b border-slate-200/60 dark:border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/30">
			<div class="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
				<a
					href="?type=All"
					class="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors {$page.url.searchParams.get('type') === 'All' || !$page.url.searchParams.get('type') ? 'bg-emerald-600 text-white' : 'bg-surface text-on-surface-variant hover:bg-surface-container'}"
				>
					Semua ({summary.total})
				</a>
				<a
					href="?type=NEARMISS"
					class="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors {$page.url.searchParams.get('type') === 'NEARMISS' ? 'bg-amber-600 text-white' : 'bg-surface text-on-surface-variant hover:bg-surface-container'}"
				>
					Near-Miss ({summary.nearmiss})
				</a>
				<a
					href="?type=SAFETY_PATROL"
					class="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors {$page.url.searchParams.get('type') === 'SAFETY_PATROL' ? 'bg-blue-600 text-white' : 'bg-surface text-on-surface-variant hover:bg-surface-container'}"
				>
					Safety Patrol
				</a>
				<a
					href="?type=SAFETY_OBSERVATION_TOUR"
					class="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors {$page.url.searchParams.get('type') === 'SAFETY_OBSERVATION_TOUR' ? 'bg-indigo-600 text-white' : 'bg-surface text-on-surface-variant hover:bg-surface-container'}"
				>
					SOT Tour
				</a>
				<a
					href="?type=INSPECTION_P2H"
					class="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors {$page.url.searchParams.get('type') === 'INSPECTION_P2H' ? 'bg-purple-600 text-white' : 'bg-surface text-on-surface-variant hover:bg-surface-container'}"
				>
					P2H & Audit
				</a>
			</div>
		</div>

		<!-- Table View -->
		<div class="overflow-x-auto">
			<table class="w-full text-left text-sm min-w-[850px]">
				<thead class="bg-slate-100/70 dark:bg-slate-800/50 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
					<tr>
						<th class="py-3.5 px-5">No. Laporan & Tanggal</th>
						<th class="py-3.5 px-5">Tipe & Risiko</th>
						<th class="py-3.5 px-5">Lokasi & Observer</th>
						<th class="py-3.5 px-5">Deskripsi Temuan K3</th>
						<th class="py-3.5 px-5">Tindakan Langsung & CAPA</th>
						<th class="py-3.5 px-5 text-right">Status CAPA</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
					{#if reports.length === 0}
						<tr>
							<td colspan="6" class="py-12 text-center text-on-surface-variant">
								<span class="material-symbols-outlined text-4xl text-slate-300 block mb-2">fact_check</span>
								<p class="font-bold text-sm">Tidak ada data observasi pada kategori filter ini.</p>
							</td>
						</tr>
					{:else}
						{#each reports as rep}
							<tr class="hover:bg-surface-container transition-colors">
								<td class="py-4 px-5">
									<p class="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">{rep.report_number}</p>
									<p class="text-[10px] text-on-surface-variant mt-0.5">{new Date(rep.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
								</td>
								<td class="py-4 px-5">
									<span class="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
										{rep.report_type.replace(/_/g, ' ')}
									</span>
									<span class="inline-block ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold {rep.risk_level === 'High' ? 'bg-rose-100 text-rose-800' : rep.risk_level === 'Medium' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'}">
										{rep.risk_level}
									</span>
								</td>
								<td class="py-4 px-5">
									<p class="text-xs font-bold text-on-surface">{rep.location}</p>
									<p class="text-[10px] text-on-surface-variant mt-0.5">Oleh: {rep.observer_name}</p>
								</td>
								<td class="py-4 px-5 max-w-xs">
									<p class="text-xs font-semibold text-on-surface truncate">{rep.finding_description}</p>
									{#if rep.immediate_action}
										<p class="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
											<span class="material-symbols-outlined text-xs">flash_on</span>
											<span class="truncate">Aksi: {rep.immediate_action}</span>
										</p>
									{/if}
								</td>
								<td class="py-4 px-5">
									{#if rep.capa_action}
										<div class="space-y-0.5">
											<p class="text-xs font-bold text-on-surface truncate">{rep.capa_action}</p>
											<p class="text-[10px] text-on-surface-variant">PIC: {rep.capa_pic || '-'} • Due: {rep.capa_due_date ? new Date(rep.capa_due_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) : '-'}</p>
										</div>
									{:else}
										<span class="text-xs text-on-surface-variant/60 italic">Tanpa CAPA Lanjutan</span>
									{/if}
								</td>
								<td class="py-4 px-5 text-right">
									<div class="flex items-center justify-end gap-2">
										{#if rep.status === 'VERIFIED_CLOSED'}
											<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200">
												<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Closed
											</span>
										{:else}
											<form action="?/updateCapa" method="POST" use:enhance>
												<input type="hidden" name="id" value={rep.id} />
												<input type="hidden" name="status" value="VERIFIED_CLOSED" />
												<button
													type="submit"
													class="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer"
													title="Tandai CAPA telah selesai diperbaiki"
												>
													Selesaikan
												</button>
											</form>
										{/if}
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

<!-- Modal: Input Temuan Proaktif Baru -->
{#if showCreateModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
		<div class="bg-surface-container-lowest rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden">
			<div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
				<h3 class="text-base font-bold text-on-surface flex items-center gap-2">
					<span class="material-symbols-outlined text-emerald-600 text-xl">add_task</span>
					<span>Input Temuan Proaktif / Near-Miss (Leading)</span>
				</h3>
				<button onclick={() => showCreateModal = false} class="text-on-surface-variant hover:text-on-surface cursor-pointer">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<form action="?/createReport" method="POST" use:enhance={() => {
				return async ({ result, update }) => {
					await update();
					if (result.type === 'success') showCreateModal = false;
				};
			}} class="p-6 space-y-4">
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5" for="rep_type">
							Jenis Observasi
						</label>
						<select id="rep_type" name="report_type" required class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface text-sm font-medium">
							<option value="SAFETY_PATROL">Safety Patrol</option>
							<option value="SAFETY_OBSERVATION_TOUR">Safety Observation Tour (SOT)</option>
							<option value="NEARMISS">Near-Miss (Hampir Celaka)</option>
							<option value="INSPECTION_P2H">Inspeksi Lapangan / P2H</option>
							<option value="AUDIT_REPORT">Laporan Audit K3</option>
						</select>
					</div>
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5" for="rep_risk">
							Tingkat Risiko
						</label>
						<select id="rep_risk" name="risk_level" required class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface text-sm font-medium">
							<option value="Low">Low (Rendah)</option>
							<option value="Medium">Medium (Sedang)</option>
							<option value="High">High (Tinggi - Segera Tindak)</option>
						</select>
					</div>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5" for="rep_obs">
							Nama Observer / Pelapor
						</label>
						<input id="rep_obs" type="text" name="observer_name" placeholder="Nama Anda" required class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface text-sm font-medium" />
					</div>
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5" for="rep_loc">
							Lokasi Observasi
						</label>
						<input id="rep_loc" type="text" name="location" placeholder="Area Pool / Bengkel / Rute" required class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface text-sm font-medium" />
					</div>
				</div>

				<div>
					<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5" for="rep_find">
						Deskripsi Kondisi Tidak Aman (Unsafe Condition / Act)
					</label>
					<textarea id="rep_find" name="finding_description" rows="2" placeholder="Uraikan temuan bahaya yang diobservasi..." required class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface text-sm font-medium"></textarea>
				</div>

				<div>
					<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5" for="rep_imm">
						Tindakan Langsung di Tempat (Immediate Action)
					</label>
					<input id="rep_imm" type="text" name="immediate_action" placeholder="Cth: Langsung ditegur / dibersihkan seketika" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface text-sm font-medium" />
				</div>

				<div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-3">
					<p class="text-xs font-bold text-on-surface uppercase tracking-wider">Rencana CAPA (Corrective & Preventive Action)</p>
					<div>
						<label class="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1" for="rep_capa_act">
							Rencana Perbaikan Permanen
						</label>
						<input id="rep_capa_act" type="text" name="capa_action" placeholder="Tindakan koreksi sistemik..." class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-surface text-xs font-medium" />
					</div>
					<div class="grid grid-cols-2 gap-2">
						<div>
							<label class="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1" for="rep_capa_pic">
								PIC Perbaikan
							</label>
							<input id="rep_capa_pic" type="text" name="capa_pic" placeholder="Nama PIC" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-surface text-xs font-medium" />
						</div>
						<div>
							<label class="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1" for="rep_capa_due">
								Target Selesai
							</label>
							<input id="rep_capa_due" type="date" name="capa_due_date" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-surface text-xs font-medium" />
						</div>
					</div>
				</div>

				<div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
					<button type="button" onclick={() => showCreateModal = false} class="px-4 py-2.5 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-container">
						Batal
					</button>
					<button type="submit" class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs">
						Simpan Observasi Proaktif
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
