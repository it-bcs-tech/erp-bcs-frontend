<script lang="ts">
	interface DriverOption {
		id: number | string;
		name: string;
		payroll_id?: string;
		karyawan_id?: number | string;
		sim_type?: string;
		sim_expiry_date?: string;
	}

	interface Props {
		isOpen: boolean;
		selectedDriver?: DriverOption | null;
		driversList?: DriverOption[];
		onClose: () => void;
		onSuccess?: (result: any) => void;
	}

	let { isOpen, selectedDriver = null, driversList = [], onClose, onSuccess }: Props = $props();

	// State internal
	let step = $state<'upload' | 'scanning' | 'review'>('upload');
	let previewUrl = $state<string | null>(null);
	let selectedFile = $state<File | null>(null);
	let base64Image = $state<string | null>(null);
	let isScanning = $state(false);
	let isSaving = $state(false);
	let scanError = $state<string | null>(null);
	let detectedDocType = $state<'SIM' | 'KTP' | null>(null);
	let detectedNik = $state<string | null>(null);

	// Form review data (terisi oleh AI)
	let targetDriverId = $state<string | number>('');
	let targetKaryawanId = $state<string | number | null>(null);
	let targetDriverName = $state('');
	let formSimType = $state('SIM B2 UMUM');
	let formSimNumber = $state('');
	let formExpiryDate = $state('');
	let formBirthPlace = $state('');
	let formBirthDate = $state('');
	let formAddress = $state('');
	let aiConfidence = $state<number | null>(null);

	// Sinkronkan targetDriver saat prop berubah atau modal dibuka
	$effect(() => {
		if (isOpen) {
			if (selectedDriver) {
				targetDriverId = selectedDriver.id;
				targetDriverName = selectedDriver.name;
				targetKaryawanId = selectedDriver.karyawan_id || null;
				if (selectedDriver.sim_type) formSimType = selectedDriver.sim_type;
				if (selectedDriver.sim_expiry_date) formExpiryDate = selectedDriver.sim_expiry_date;
			}
		} else {
			// Reset form saat modal ditutup
			resetState();
		}
	});

	function resetState() {
		step = 'upload';
		previewUrl = null;
		selectedFile = null;
		base64Image = null;
		isScanning = false;
		isSaving = false;
		scanError = null;
		detectedDocType = null;
		detectedNik = null;
		formSimNumber = '';
		formExpiryDate = '';
		formBirthPlace = '';
		formBirthDate = '';
		formAddress = '';
		aiConfidence = null;
	}

	function handleDriverSelect(e: Event) {
		const target = e.target as HTMLSelectElement;
		const id = target.value;
		targetDriverId = id;
		const found = driversList.find((d) => String(d.id) === String(id));
		if (found) {
			targetDriverName = found.name;
			targetKaryawanId = found.karyawan_id || null;
			if (found.sim_type) formSimType = found.sim_type;
		}
	}

	function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		if (input.files && input.files[0]) {
			processChosenFile(input.files[0]);
		}
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
			processChosenFile(e.dataTransfer.files[0]);
		}
	}

	/**
	 * Kompresi gambar sisi klien menggunakan HTML5 Canvas
	 * Meresize gambar beresolusi tinggi (kamera ponsel 12MP-50MP) menjadi max 1280px & JPEG 0.82
	 * Mengurangi ukuran file dari 5-15MB menjadi ~150-280KB tanpa mengurangi ketajaman OCR AI
	 */
	async function compressImageFile(file: File, maxDimension = 1280, quality = 0.82): Promise<{ file: File; base64: string }> {
		if (!file.type.startsWith('image/')) {
			return new Promise((resolve, reject) => {
				const reader = new FileReader();
				reader.onload = (e) => resolve({ file, base64: (e.target?.result as string) || '' });
				reader.onerror = reject;
				reader.readAsDataURL(file);
			});
		}

		return new Promise((resolve) => {
			const img = new Image();
			const objectUrl = URL.createObjectURL(file);
			img.onload = () => {
				URL.revokeObjectURL(objectUrl);
				let { width, height } = img;
				if (width > maxDimension || height > maxDimension) {
					if (width > height) {
						height = Math.round((height * maxDimension) / width);
						width = maxDimension;
					} else {
						width = Math.round((width * maxDimension) / height);
						height = maxDimension;
					}
				}

				const canvas = document.createElement('canvas');
				canvas.width = width;
				canvas.height = height;
				const ctx = canvas.getContext('2d');
				if (ctx) {
					ctx.drawImage(img, 0, 0, width, height);
					const dataUrl = canvas.toDataURL('image/jpeg', quality);
					canvas.toBlob(
						(blob) => {
							if (blob) {
								const compressed = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
									type: 'image/jpeg',
									lastModified: Date.now()
								});
								resolve({ file: compressed, base64: dataUrl });
							} else {
								resolve({ file, base64: dataUrl });
							}
						},
						'image/jpeg',
						quality
					);
				} else {
					const reader = new FileReader();
					reader.onload = (e) => resolve({ file, base64: (e.target?.result as string) || '' });
					reader.readAsDataURL(file);
				}
			};
			img.onerror = () => {
				URL.revokeObjectURL(objectUrl);
				const reader = new FileReader();
				reader.onload = (e) => resolve({ file, base64: (e.target?.result as string) || '' });
				reader.readAsDataURL(file);
			};
			img.src = objectUrl;
		});
	}

	async function processChosenFile(file: File) {
		step = 'scanning';
		isScanning = true;
		scanError = null;

		try {
			const { file: compressedFile, base64 } = await compressImageFile(file);
			selectedFile = compressedFile;
			previewUrl = base64;
			base64Image = base64;
			await startAiScan(compressedFile, base64);
		} catch (err: any) {
			console.error('File compression error, fallback to raw file:', err);
			selectedFile = file;
			const reader = new FileReader();
			reader.onload = async (event) => {
				const res = (event.target?.result as string) || '';
				previewUrl = res;
				base64Image = res;
				await startAiScan(file, res);
			};
			reader.readAsDataURL(file);
		}
	}

	async function startAiScan(fileToScan?: File | null, base64ToScan?: string | null) {
		const targetFile = fileToScan ?? selectedFile;
		const targetBase64 = base64ToScan ?? base64Image;

		if (!targetBase64 && !targetFile) return;

		step = 'scanning';
		isScanning = true;
		scanError = null;

		try {
			const formData = new FormData();
			if (targetFile) {
				formData.append('file', targetFile);
			} else if (targetBase64) {
				formData.append('image_base64', targetBase64);
			}

			const res = await fetch('/api/ocs/scan-sim', {
				method: 'POST',
				body: formData
			});

			const contentType = res.headers.get('content-type') || '';

			if (!contentType.includes('application/json')) {
				if (res.status === 413) {
					scanError = 'Ukuran berkas terlalu besar untuk server (>1MB). Berkas telah dikompresi otomatis, silakan coba unggah ulang.';
				} else {
					scanError = `Layanan AI Vision sedang offline atau tidak dapat dijangkau (Status ${res.status}). Form isian manual terbuka otomatis untuk diisi.`;
				}
				step = 'review';
				return;
			}

			const data = await res.json();

			if (data && data.success && data.data) {
				const extracted = data.data;
				const docType = String(extracted.doc_type || '').toUpperCase();
				if (docType.includes('KTP')) {
					detectedDocType = 'KTP';
					detectedNik = extracted.nik || extracted.sim_number || null;
				} else {
					detectedDocType = 'SIM';
				}

				if (extracted.sim_type) formSimType = extracted.sim_type;
				if (extracted.sim_number) formSimNumber = extracted.sim_number;
				if (extracted.expiry_date) formExpiryDate = extracted.expiry_date;
				if (extracted.birth_place) formBirthPlace = extracted.birth_place;
				if (extracted.birth_date) formBirthDate = extracted.birth_date;
				if (extracted.address) formAddress = extracted.address;
				if (extracted.confidence_score) aiConfidence = Math.round(extracted.confidence_score * 100);

				// Jika nama driver pada SIM/KTP terbaca dan targetDriver belum dipilih, cocokkan otomatis
				if (extracted.driver_name && !targetDriverId && !targetKaryawanId && driversList.length > 0) {
					const cleanAiName = extracted.driver_name.toUpperCase();
					const match = driversList.find((d) => cleanAiName.includes(d.name.toUpperCase()) || d.name.toUpperCase().includes(cleanAiName));
					if (match) {
						targetDriverId = match.id;
						targetDriverName = match.name;
						targetKaryawanId = match.karyawan_id || null;
					}
				}

				step = 'review';
			} else if (data && data.fallback_manual) {
				// Fallback ke manual review
				scanError = data.message || 'AI Vision sedang offline atau foto buram. Form isian manual terbuka otomatis untuk diisi.';
				step = 'review';
			} else {
				throw new Error(data?.message || 'Gagal memindai SIM');
			}
		} catch (err: any) {
			console.error('Scan error:', err);
			scanError = err.message || 'Terjadi kesalahan jaringan saat memindai SIM. Form isian manual terbuka otomatis untuk diisi.';
			step = 'review'; // Tetap buka form review agar user bisa input manual
		} finally {
			isScanning = false;
		}
	}

	async function handleSaveAndSync() {
		if (!targetDriverId && !targetKaryawanId) {
			alert('Pilih karyawan / pengemudi yang akan diperbarui.');
			return;
		}
		if (!formSimNumber || !formExpiryDate) {
			alert('Nomor SIM dan Tanggal Kedaluwarsa wajib diisi.');
			return;
		}

		isSaving = true;

		try {
			const formData = new FormData();
			if (targetDriverId) formData.append('driver_id', String(targetDriverId));
			if (targetKaryawanId) formData.append('karyawan_id', String(targetKaryawanId));
			formData.append('driver_name', targetDriverName || 'Pengemudi');
			formData.append('sim_type', formSimType);
			formData.append('sim_number', formSimNumber);
			formData.append('expiry_date', formExpiryDate);
			if (selectedFile) {
				formData.append('file', selectedFile);
			} else if (base64Image) {
				formData.append('image_base64', base64Image);
			}

			const res = await fetch('/api/ocs/save-sim', {
				method: 'POST',
				body: formData
			});

			const result = await res.json();

			if (result && result.success) {
				if (onSuccess) onSuccess(result);
				onClose();
			} else {
				alert(result?.message || 'Gagal menyimpan dan menyinkronkan data SIM.');
			}
		} catch (err: any) {
			console.error('Save error:', err);
			alert('Terjadi kesalahan saat menyimpan data: ' + err.message);
		} finally {
			isSaving = false;
		}
	}
</script>

{#if isOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
		<div class="bg-surface-container-lowest rounded-3xl border border-slate-200/70 dark:border-slate-800/70 shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
			
			<!-- Modal Header -->
			<div class="px-6 py-4 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between bg-surface-container-low">
				<div class="flex items-center gap-2.5">
					<div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center shadow-xs">
						<span class="material-symbols-outlined text-[20px]">auto_awesome</span>
					</div>
					<div>
						<h3 class="text-sm font-bold text-on-surface">Scan & Perbarui SIM Pengemudi (AI Vision)</h3>
						<p class="text-[11px] text-on-surface-variant">Sinkronisasi instan 3 arah: Operasional OCS, Master HRIS, dan Arsip DMS</p>
					</div>
				</div>
				<button 
					onclick={onClose} 
					class="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
					disabled={isScanning || isSaving}>
					<span class="material-symbols-outlined text-lg">close</span>
				</button>
			</div>

			<!-- Modal Body -->
			<div class="p-6 overflow-y-auto flex-1 space-y-5">
				{#if step === 'upload'}
					<div class="space-y-4">
						<!-- Target Driver Selection if not preselected -->
						{#if !selectedDriver && driversList.length > 0}
							<div class="space-y-1.5">
								<label for="driver_select" class="block text-xs font-bold text-on-surface uppercase tracking-wider">
									Pilih Pengemudi Terkait <span class="text-rose-500">*</span>
								</label>
								<select 
									id="driver_select"
									bind:value={targetDriverId}
									onchange={handleDriverSelect}
									class="w-full bg-surface-container-low text-on-surface rounded-xl px-4 py-2.5 text-xs border-0 outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer font-medium">
									<option value="">-- Pilih Pengemudi dari Master OCS --</option>
									{#each driversList as drv}
										<option value={drv.id}>{drv.name} {drv.sim_type ? `(${drv.sim_type})` : ''}</option>
									{/each}
								</select>
							</div>
						{:else if selectedDriver}
							<div class="p-3.5 rounded-2xl bg-primary/5 border border-primary/20 flex items-center justify-between">
								<div class="flex items-center gap-3">
									<div class="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
										{selectedDriver.name.substring(0, 2).toUpperCase()}
									</div>
									<div>
										<p class="text-xs font-bold text-on-surface">{selectedDriver.name}</p>
										<p class="text-[10px] text-on-surface-variant">ID Driver: #{selectedDriver.id} {selectedDriver.sim_type ? `• SIM Saat Ini: ${selectedDriver.sim_type}` : ''}</p>
									</div>
								</div>
								<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">Target Aktif</span>
							</div>
						{/if}

						<!-- Dropzone Area -->
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div 
							ondrop={handleDrop}
							ondragover={(e) => e.preventDefault()}
							class="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-primary/50 transition-colors rounded-3xl p-8 text-center bg-surface-container-low/50 flex flex-col items-center justify-center gap-3">
							
							<div class="w-14 h-14 rounded-2xl bg-surface-container flex items-center justify-center text-primary shadow-xs">
								<span class="material-symbols-outlined text-3xl">add_photo_alternate</span>
							</div>

							<div>
								<h4 class="text-xs font-bold text-on-surface">Tarik & Lepas Foto Fisik SIM / KTP di sini</h4>
								<p class="text-[11px] text-on-surface-variant mt-0.5">Mendukung format JPG, PNG, WEBP (Kompresi otomatis dari kamera HP, Maks. 15MB)</p>
							</div>

							<div class="flex flex-wrap items-center justify-center gap-2.5 pt-2">
								<!-- File Browser Button -->
								<label class="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface border border-slate-200 dark:border-slate-800 text-xs font-bold text-on-surface hover:bg-surface-container transition-colors shadow-xs">
									<span class="material-symbols-outlined text-base text-primary">folder_open</span>
									<span>Pilih dari Galeri / Berkas</span>
									<input type="file" accept="image/*,.pdf" class="hidden" onchange={handleFileSelect} />
								</label>

								<!-- Direct Camera Trigger (Mobile / Tablet in Pool) -->
								<label class="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 transition-colors shadow-xs">
									<span class="material-symbols-outlined text-base">photo_camera</span>
									<span>Buka Kamera HP / Tablet</span>
									<input type="file" accept="image/*" capture="environment" class="hidden" onchange={handleFileSelect} />
								</label>
							</div>
						</div>

						<div class="p-3.5 rounded-2xl bg-surface-container border border-slate-200/50 dark:border-slate-800/50 text-[11px] text-on-surface-variant flex items-start gap-2.5">
							<span class="material-symbols-outlined text-base text-primary mt-0.5">lightbulb</span>
							<p>Pastikan teks pada nomor SIM dan tanggal kedaluwarsa tidak tertutup pantulan cahaya agar Vision AI dapat mengekstrak data dalam waktu ~1 detik.</p>
						</div>
					</div>

				{:else if step === 'scanning'}
					<div class="py-12 flex flex-col items-center justify-center text-center space-y-4">
						<div class="relative w-20 h-20 flex items-center justify-center">
							<div class="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
							<div class="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center animate-pulse">
								<span class="material-symbols-outlined text-2xl">auto_awesome</span>
							</div>
						</div>
						<div>
							<h4 class="text-sm font-bold text-on-surface">Menganalisis Fisik SIM via AI Vision...</h4>
							<p class="text-xs text-on-surface-variant mt-1">Membaca nomor SIM, masa berlaku, dan identitas pengemudi secara otomatis.</p>
						</div>
					</div>

				{:else if step === 'review'}
					<!-- Review & Verification Mode (Side-by-Side) -->
					{#if scanError}
						<div class="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs flex items-center gap-2">
							<span class="material-symbols-outlined text-base">info</span>
							<span>{scanError}</span>
						</div>
					{/if}

					{#if detectedDocType === 'KTP'}
						<div class="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-xs flex items-start gap-2.5">
							<span class="material-symbols-outlined text-base mt-0.5 text-indigo-600 dark:text-indigo-400">badge</span>
							<div>
								<p class="font-bold">Dokumen Terdeteksi: e-KTP (Kependudukan)</p>
								<p class="text-[11px] mt-0.5 text-indigo-700/80 dark:text-indigo-300/80">
									Nomor NIK <strong>{detectedNik || formSimNumber}</strong> dan data identitas berhasil diekstrak. Silakan sesuaikan jenis SIM dan tanggal kedaluwarsa pengemudi untuk disimpan ke OCS & HRIS.
								</p>
							</div>
						</div>
					{/if}

					<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
						<!-- Left: Image Preview -->
						<div class="space-y-2">
							<div class="flex items-center justify-between">
								<span class="text-xs font-bold text-on-surface uppercase tracking-wider">Foto Fisik SIM</span>
								<label class="text-[11px] font-bold text-primary hover:underline cursor-pointer inline-flex items-center gap-1">
									<span class="material-symbols-outlined text-xs">sync</span>
									<span>Ganti Foto</span>
									<input type="file" accept="image/*,.pdf" class="hidden" onchange={handleFileSelect} />
								</label>
							</div>
							
							<div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-black/5 dark:bg-black/30 overflow-hidden aspect-4/3 flex items-center justify-center relative shadow-inner group">
								{#if previewUrl}
									<img src={previewUrl} alt="Pratinjau SIM" class="w-full h-full object-contain" />
								{:else}
									<span class="text-xs text-slate-400">Tidak ada gambar</span>
								{/if}
							</div>

							{#if aiConfidence}
								<div class="flex items-center justify-between text-[11px] px-1">
									<span class="text-on-surface-variant">Tingkat Keyakinan AI</span>
									<span class="font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md">
										{aiConfidence}% Akurat
									</span>
								</div>
							{/if}
						</div>

						<!-- Right: Extracted Fields Review Form (Borderless Standard) -->
						<div class="space-y-3.5">
							<div class="flex items-center justify-between pb-1 border-b border-slate-200/60 dark:border-slate-800/60">
								<span class="text-xs font-bold text-on-surface uppercase tracking-wider">Konfirmasi Data Ekstraksi</span>
								<span class="text-[10px] text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-md">AI Auto-Filled</span>
							</div>

							<!-- Driver Selector -->
							<div class="space-y-1">
								<label for="driver_target" class="block text-[11px] font-bold text-on-surface uppercase tracking-wider">
									Pengemudi Terkait <span class="text-rose-500">*</span>
								</label>
								<select 
									id="driver_target"
									bind:value={targetDriverId}
									onchange={handleDriverSelect}
									class="w-full bg-surface-container-low text-on-surface rounded-xl px-3.5 py-2 text-xs border-0 outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer font-medium">
									<option value="">-- Pilih Pengemudi --</option>
									{#each driversList as drv}
										<option value={drv.id}>{drv.name} #{drv.id}</option>
									{/each}
								</select>
							</div>

							<!-- Jenis SIM & Nomor SIM Grid -->
							<div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
								<div class="space-y-1">
									<label for="sim_type" class="block text-[11px] font-bold text-on-surface uppercase tracking-wider">
										Jenis SIM <span class="text-rose-500">*</span>
									</label>
									<select 
										id="sim_type"
										bind:value={formSimType}
										class="w-full bg-surface-container-low text-on-surface rounded-xl px-3 py-2 text-xs border-0 outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer font-medium">
										<option value="SIM B2 UMUM">SIM B2 UMUM</option>
										<option value="SIM B2">SIM B2</option>
										<option value="SIM B1 UMUM">SIM B1 UMUM</option>
										<option value="SIM B1">SIM B1</option>
										<option value="SIM A">SIM A</option>
										<option value="SIM C">SIM C</option>
									</select>
								</div>

								<div class="space-y-1">
									<label for="sim_number" class="block text-[11px] font-bold text-on-surface uppercase tracking-wider">
										Nomor SIM <span class="text-rose-500">*</span>
									</label>
									<input 
										id="sim_number"
										type="text"
										bind:value={formSimNumber}
										placeholder="1234-5678-9012"
										class="w-full bg-surface-container-low text-on-surface rounded-xl px-3 py-2 text-xs border-0 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
										required 
									/>
								</div>
							</div>

							<!-- Tanggal Kedaluwarsa & Tanggal Lahir -->
							<div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
								<div class="space-y-1">
									<label for="expiry_date" class="block text-[11px] font-bold text-on-surface uppercase tracking-wider">
										Masa Berlaku (Exp) <span class="text-rose-500">*</span>
									</label>
									<input 
										id="expiry_date"
										type="date"
										bind:value={formExpiryDate}
										class="w-full bg-surface-container-low text-on-surface rounded-xl px-3 py-2 text-xs border-0 outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer font-medium"
										required 
									/>
								</div>

								<div class="space-y-1">
									<label for="birth_date" class="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
										Tgl Lahir (Opsional)
									</label>
									<input 
										id="birth_date"
										type="date"
										bind:value={formBirthDate}
										class="w-full bg-surface-container-low text-on-surface rounded-xl px-3 py-2 text-xs border-0 outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
									/>
								</div>
							</div>

							<!-- Tempat Lahir & Alamat -->
							<div class="space-y-1">
								<label for="address" class="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
									Alamat pada SIM (Opsional)
								</label>
								<input 
									id="address"
									type="text"
									bind:value={formAddress}
									placeholder="Kota / Alamat pengemudi..."
									class="w-full bg-surface-container-low text-on-surface rounded-xl px-3 py-2 text-xs border-0 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
								/>
							</div>

							<div class="p-2.5 rounded-xl bg-surface-container text-[11px] text-on-surface-variant">
								<p>💡 Dengan menekan simpan, dokumen fisik akan diarsipkan di <strong>DMS</strong> dan masa berlaku pengemudi langsung aktif di <strong>OCS & HRIS</strong>.</p>
							</div>
						</div>
					</div>
				{/if}
			</div>

			<!-- Modal Footer -->
			<div class="px-6 py-4 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between bg-surface-container-low">
				<div>
					{#if step === 'review'}
						<button 
							onclick={() => { step = 'upload'; }}
							class="text-xs font-bold text-on-surface-variant hover:text-on-surface inline-flex items-center gap-1 cursor-pointer"
							disabled={isSaving}>
							<span class="material-symbols-outlined text-sm">arrow_back</span>
							<span>Pindai Ulang</span>
						</button>
					{/if}
				</div>

				<div class="flex items-center gap-2">
					<button 
						onclick={onClose}
						class="px-4 py-2 rounded-xl text-xs font-bold text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
						disabled={isSaving}>
						Batal
					</button>

					{#if step === 'review'}
						<button 
							onclick={handleSaveAndSync}
							class="px-5 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
							disabled={isSaving || !targetDriverId || !formSimNumber || !formExpiryDate}>
							{#if isSaving}
								<span class="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
								<span>Menyinkronkan...</span>
							{:else}
								<span class="material-symbols-outlined text-sm">check_circle</span>
								<span>Simpan & Sinkronkan 3 Arah</span>
							{/if}
						</button>
					{/if}
				</div>
			</div>

		</div>
	</div>
{/if}
