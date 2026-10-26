<script lang="ts">
	import { addToast } from '$lib/stores/notifications';

	let { isOpen = $bindable(false), onClose, user } = $props<{
		isOpen: boolean;
		onClose?: () => void;
		user?: any;
	}>();

	let facilityType = $state('AC_HVAC');
	let location = $state('');
	let description = $state('');
	let urgency = $state<'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY'>('MEDIUM');
	let isSubmitting = $state(false);
	let errorMessage = $state('');

	function resetForm() {
		facilityType = 'AC_HVAC';
		location = '';
		description = '';
		urgency = 'MEDIUM';
		errorMessage = '';
	}

	function handleClose() {
		if (isSubmitting) return;
		resetForm();
		if (onClose) {
			onClose();
		} else {
			isOpen = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && isOpen && !isSubmitting) {
			handleClose();
		}
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (!facilityType || !location.trim() || !description.trim()) {
			errorMessage = 'Kategori sarana, lokasi detail, dan deskripsi kerusakan wajib diisi!';
			return;
		}

		isSubmitting = true;
		errorMessage = '';

		try {
			const res = await fetch('/api/ga/work-orders', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					facility_type: facilityType,
					location: location.trim(),
					description: description.trim(),
					urgency,
					requester_name: user?.name,
					department: user?.division || user?.department,
					requester_nik: user?.payrollId
				})
			});

			const result = await res.json();

			if (res.ok && result.success) {
				addToast({
					title: `Tiket ${result.woNumber} Dibuat`,
					message: result.message || 'Laporan kerusakan telah diteruskan ke tim General Affair.',
					type: 'SUCCESS'
				});
				handleClose();
			} else {
				errorMessage = result.message || 'Gagal mengirim laporan perbaikan.';
			}
		} catch (err: any) {
			console.error('Error submitting Quick WO:', err);
			errorMessage = err.message || 'Terjadi gangguan jaringan saat mengirim tiket.';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
		role="dialog"
		aria-modal="true"
	>
		<!-- Backdrop click to dismiss -->
		<button
			type="button"
			class="absolute inset-0 w-full h-full cursor-default bg-transparent border-0 outline-none"
			aria-label="Tutup Modal"
			onclick={handleClose}
			tabindex="-1"
		></button>

		<div
			class="relative w-full max-w-lg bg-surface-container-lowest rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-200"
		>
			<!-- Modal Header -->
			<div class="px-6 py-5 border-b border-slate-200/70 dark:border-slate-800/70 flex items-center justify-between bg-surface-container-low/60">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 flex items-center justify-center">
						<span class="material-symbols-outlined text-[22px]">home_repair_service</span>
					</div>
					<div>
						<h3 class="text-base font-black text-on-surface">Lapor Kerusakan & Fasilitas</h3>
						<p class="text-xs text-on-surface-variant font-medium">Buat Work Order (WO) cepat untuk General Affair</p>
					</div>
				</div>
				<button
					type="button"
					onclick={handleClose}
					disabled={isSubmitting}
					class="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-all cursor-pointer disabled:opacity-50"
					title="Tutup (Esc)"
				>
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>

			<!-- Form Content -->
			<form onsubmit={handleSubmit} class="p-6 space-y-4">
				{#if errorMessage}
					<div class="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-bold flex items-center gap-2">
						<span class="material-symbols-outlined text-sm">error</span>
						<span>{errorMessage}</span>
					</div>
				{/if}

				<!-- Info Pelapor (Auto-filled & Read-only) -->
				<div class="p-3.5 rounded-2xl bg-surface-container-low border border-slate-200/50 dark:border-slate-800/50 flex flex-wrap items-center justify-between gap-2 text-xs">
					<div class="flex items-center gap-2">
						<div class="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
							<span class="material-symbols-outlined text-[15px]">person</span>
						</div>
						<div>
							<div class="text-[10px] uppercase font-bold text-on-surface-variant">Pelapor</div>
							<div class="font-bold text-on-surface">{user?.name || 'Karyawan BCS'}</div>
						</div>
					</div>
					<div class="text-right">
						<div class="text-[10px] uppercase font-bold text-on-surface-variant">Divisi / NIK</div>
						<div class="font-mono text-on-surface text-[11px] font-semibold">
							{user?.division || user?.department || 'Umum'} {user?.payrollId ? `• ${user?.payrollId}` : ''}
						</div>
					</div>
				</div>

				<!-- Kategori Sarana & Urgensi -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
					<div>
						<label for="fac_type" class="block text-xs font-bold text-on-surface mb-1.5">
							Kategori Sarana <span class="text-rose-500">*</span>
						</label>
						<select
							id="fac_type"
							bind:value={facilityType}
							required
							class="w-full px-3.5 py-2.5 text-xs rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-primary/30 text-on-surface cursor-pointer font-medium transition-all"
						>
							<option value="AC_HVAC">AC & Pendingin Ruangan</option>
							<option value="KELISTRIKAN">Kelistrikan, Panel & Lampu</option>
							<option value="PLUMBING_AIR">Plumbing, Keran & Air</option>
							<option value="GENSET">Genset & Power Backup</option>
							<option value="PINTU_PAGAR_POOL">Pintu, Gerbang & Pagar Pool</option>
							<option value="PENGECATAN_GEDUNG">Pengecatan & Bangunan Fisik</option>
							<option value="PERABOT_KANTOR">Meja, Kursi & Perabot Kantor</option>
							<option value="LAINNYA">Kerusakan Fasilitas Lainnya</option>
						</select>
					</div>

					<div>
						<label for="urgency_select" class="block text-xs font-bold text-on-surface mb-1.5">
							Tingkat Urgensi <span class="text-rose-500">*</span>
						</label>
						<div class="grid grid-cols-3 gap-1.5" id="urgency_select">
							<button
								type="button"
								onclick={() => (urgency = 'LOW')}
								class="py-2 text-[11px] font-bold rounded-xl transition-all cursor-pointer text-center {urgency === 'LOW' ? 'bg-slate-700 text-white shadow-xs' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}"
							>
								Rendah
							</button>
							<button
								type="button"
								onclick={() => (urgency = 'MEDIUM')}
								class="py-2 text-[11px] font-bold rounded-xl transition-all cursor-pointer text-center {urgency === 'MEDIUM' ? 'bg-amber-600 text-white shadow-xs' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}"
							>
								Sedang
							</button>
							<button
								type="button"
								onclick={() => (urgency = 'EMERGENCY')}
								class="py-2 text-[11px] font-bold rounded-xl transition-all cursor-pointer text-center {urgency === 'EMERGENCY' ? 'bg-rose-600 text-white shadow-xs' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}"
							>
								Darurat
							</button>
						</div>
					</div>
				</div>

				<!-- Lokasi Detail -->
				<div>
					<label for="fac_location" class="block text-xs font-bold text-on-surface mb-1.5">
						Lokasi Detail / Ruangan <span class="text-rose-500">*</span>
					</label>
					<input
						id="fac_location"
						type="text"
						bind:value={location}
						required
						placeholder="Misal: Gedung A Lt. 2 - Ruang Finance / Pool Cilegon - Pos Satpam"
						class="w-full px-3.5 py-2.5 text-xs rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-primary/30 text-on-surface transition-all placeholder:text-on-surface-variant/40"
					/>
				</div>

				<!-- Deskripsi Kerusakan -->
				<div>
					<label for="fac_desc" class="block text-xs font-bold text-on-surface mb-1.5">
						Deskripsi Kerusakan / Kendala <span class="text-rose-500">*</span>
					</label>
					<textarea
						id="fac_desc"
						bind:value={description}
						required
						rows="3"
						placeholder="Jelaskan kondisi kerusakan secara detail, misal: AC bocor menetes ke meja, lampu neon kedap-kedip mati, atau handle pintu rusak..."
						class="w-full px-3.5 py-2.5 text-xs rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-primary/30 text-on-surface transition-all placeholder:text-on-surface-variant/40 resize-none"
					></textarea>
				</div>

				<!-- Footer Actions -->
				<div class="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-200/50 dark:border-slate-800/50">
					<button
						type="button"
						onclick={handleClose}
						disabled={isSubmitting}
						class="px-4 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
					>
						Batal
					</button>
					<button
						type="submit"
						disabled={isSubmitting}
						class="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-on-primary text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-2 disabled:opacity-50"
					>
						{#if isSubmitting}
							<span class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
							<span>Mengirim Laporan...</span>
						{:else}
							<span class="material-symbols-outlined text-[16px]">send</span>
							<span>Kirim Laporan WO</span>
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
