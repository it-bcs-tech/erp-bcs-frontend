<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	let course = $derived(data.course);
	let sessions = $derived(data.sessions || []);
	let lockInfo = $derived(data.lockInfo || { isLocked: false, isManualLocked: false, isCompleted: false, isExamStarted: false });

	interface QuizQuestionItem {
		id: string;
		questionType: 'MCQ' | 'ESSAY';
		questionText: string;
		options: Array<{ key: string; text: string }>;
		correctKey: string;
		explanation: string;
	}

	let activeQuizTab = $state<'PRE_TEST' | 'POST_TEST'>('PRE_TEST');
	let materialsUrl = $state(course?.trainerMaterialsUrl || '');
	let isSubmitting = $state(false);
	let showFinalizeModal = $state(false);

	// Inisialisasi daftar soal dari server
	const initialPreQuestions: QuizQuestionItem[] = (data.quizQuestions || [])
		.filter((q: any) => q.quizType === 'PRE_TEST')
		.map((q: any, idx: number) => ({
			id: `pre-${q.id || idx + 1}`,
			questionType: q.questionType || 'MCQ',
			questionText: q.questionText || '',
			options: Array.isArray(q.options) && q.options.length > 0 ? q.options : [
				{ key: 'A', text: '' },
				{ key: 'B', text: '' },
				{ key: 'C', text: '' },
				{ key: 'D', text: '' }
			],
			correctKey: q.correctKey || 'A',
			explanation: q.explanation || ''
		}));

	const initialPostQuestions: QuizQuestionItem[] = (data.quizQuestions || [])
		.filter((q: any) => q.quizType === 'POST_TEST')
		.map((q: any, idx: number) => ({
			id: `post-${q.id || idx + 1}`,
			questionType: q.questionType || 'MCQ',
			questionText: q.questionText || '',
			options: Array.isArray(q.options) && q.options.length > 0 ? q.options : [
				{ key: 'A', text: '' },
				{ key: 'B', text: '' },
				{ key: 'C', text: '' },
				{ key: 'D', text: '' }
			],
			correctKey: q.correctKey || 'A',
			explanation: q.explanation || ''
		}));

	let preTestList = $state<QuizQuestionItem[]>(
		initialPreQuestions.length > 0
			? initialPreQuestions
			: [
					{
						id: 'pre-1',
						questionType: 'MCQ',
						questionText: '',
						options: [
							{ key: 'A', text: '' },
							{ key: 'B', text: '' },
							{ key: 'C', text: '' },
							{ key: 'D', text: '' }
						],
						correctKey: 'A',
						explanation: ''
					}
				]
	);

	let postTestList = $state<QuizQuestionItem[]>(
		initialPostQuestions.length > 0
			? initialPostQuestions
			: [
					{
						id: 'post-1',
						questionType: 'MCQ',
						questionText: '',
						options: [
							{ key: 'A', text: '' },
							{ key: 'B', text: '' },
							{ key: 'C', text: '' },
							{ key: 'D', text: '' }
						],
						correctKey: 'A',
						explanation: ''
					}
				]
	);

	let currentList = $derived(activeQuizTab === 'PRE_TEST' ? preTestList : postTestList);

	function addQuestion(type: 'PRE_TEST' | 'POST_TEST') {
		if (lockInfo.isLocked) return;
		const newItem: QuizQuestionItem = {
			id: `${type.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
			questionType: 'MCQ',
			questionText: '',
			options: [
				{ key: 'A', text: '' },
				{ key: 'B', text: '' },
				{ key: 'C', text: '' },
				{ key: 'D', text: '' }
			],
			correctKey: 'A',
			explanation: ''
		};
		if (type === 'PRE_TEST') {
			preTestList = [...preTestList, newItem];
		} else {
			postTestList = [...postTestList, newItem];
		}
	}

	function removeQuestion(type: 'PRE_TEST' | 'POST_TEST', index: number) {
		if (lockInfo.isLocked) return;
		if (type === 'PRE_TEST') {
			if (preTestList.length <= 1) {
				alert('Minimal 1 butir soal Pre-Test harus ada.');
				return;
			}
			preTestList = preTestList.filter((_, i) => i !== index);
		} else {
			if (postTestList.length <= 1) {
				alert('Minimal 1 butir soal Post-Test harus ada.');
				return;
			}
			postTestList = postTestList.filter((_, i) => i !== index);
		}
	}

	function copyPreToPost() {
		if (lockInfo.isLocked) return;
		if (preTestList.length === 0 || !preTestList.some((q) => q.questionText.trim())) {
			alert('Isi minimal 1 butir pertanyaan di Pre-Test terlebih dahulu sebelum menyalin.');
			return;
		}
		if (postTestList.some((q) => q.questionText.trim())) {
			const confirmReplace = confirm(
				'Soal Post-Test yang sudah Anda isi saat ini akan ditimpa dengan salinan dari Pre-Test. Lanjutkan?'
			);
			if (!confirmReplace) return;
		}

		postTestList = preTestList.map((q, idx) => ({
			id: `post-copy-${idx + 1}-${Date.now()}`,
			questionType: q.questionType,
			questionText: q.questionText,
			options: q.options.map((o) => ({ ...o })),
			correctKey: q.correctKey,
			explanation: q.explanation
		}));

		activeQuizTab = 'POST_TEST';
	}
</script>

<svelte:head>
	<title>Portal Instruktur | {course?.title || 'LMS BCS'}</title>
</svelte:head>

<div class="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans">
	<!-- Navbar Branding -->
	<header class="bg-surface border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 shadow-xs">
		<div class="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
			<div class="flex items-center gap-3">
				<div class="w-9 h-9 rounded-xl bg-primary text-on-primary flex items-center justify-center font-black tracking-tight text-sm shadow-xs">
					BCS
				</div>
				<div>
					<span class="text-xs font-black tracking-wide uppercase text-primary">PT Buana Centra Swakarsa</span>
					<h1 class="text-sm font-bold text-on-surface">Portal Instruktur Pelatihan (Trainer Entry)</h1>
				</div>
			</div>

			<div class="flex items-center gap-2">
				{#if lockInfo.isLocked}
					<span class="px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 {lockInfo.isCompleted ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'}">
						<span class="material-symbols-outlined text-sm">{lockInfo.isCompleted ? 'verified' : 'lock'}</span>
						<span>{lockInfo.isCompleted ? 'Soal Selesai / Terfinalisasi' : 'Tautan Terkunci'}</span>
					</span>
				{:else}
					<span class="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20 inline-flex items-center gap-1.5">
						<span class="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
						<span>Sesi Input Aktif</span>
					</span>
				{/if}
			</div>
		</div>
	</header>

	<main class="max-w-6xl mx-auto px-4 sm:px-6 py-6 w-full flex-1 space-y-6">
		<!-- Alert Feedback -->
		{#if form?.message}
			<div class="p-4 rounded-2xl text-xs font-bold flex items-center justify-between gap-3 shadow-xs animate-in fade-in duration-200 {form.success ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300' : 'bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300'}">
				<div class="flex items-center gap-2.5">
					<span class="material-symbols-outlined text-lg">{form.success ? 'check_circle' : 'error'}</span>
					<span>{form.message}</span>
				</div>
			</div>
		{/if}

		<!-- Banner Informasi Pelatihan -->
		<div class="p-6 rounded-3xl bg-surface border border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden">
			<div class="flex flex-col md:flex-row md:items-start justify-between gap-4">
				<div class="space-y-2">
					<div class="flex flex-wrap items-center gap-2">
						<span class="px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
							In-House Training
						</span>
						<span class="px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-600 border border-blue-500/20">
							{course?.category}
						</span>
						<span class="px-2.5 py-0.5 rounded-lg text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800">
							Passing Grade: {course?.passingGrade}%
						</span>
					</div>

					<h2 class="text-xl sm:text-2xl font-black text-on-surface tracking-tight">
						{course?.title}
					</h2>

					<p class="text-xs text-on-surface-variant max-w-3xl leading-relaxed">
						{course?.description || 'Pelatihan peningkatan kompetensi dan standar operasional kerja PT Buana Centra Swakarsa.'}
					</p>

					<div class="flex flex-wrap items-center gap-y-1 gap-x-4 pt-2 text-xs text-on-surface-variant font-medium">
						<div class="flex items-center gap-1.5">
							<span class="material-symbols-outlined text-sm text-primary">person</span>
							<span>Instruktur: <strong class="text-on-surface">{course?.instructor}</strong> ({course?.trainerType})</span>
						</div>
						<div class="flex items-center gap-1.5">
							<span class="material-symbols-outlined text-sm text-indigo-500">corporate_fare</span>
							<span>Divisi Sasaran: <strong class="text-on-surface">{course?.department}</strong></span>
						</div>
					</div>
				</div>

				<!-- Jadwal Sesi Box -->
				{#if sessions.length > 0}
					<div class="p-4 rounded-2xl bg-surface-container border border-slate-200/80 dark:border-slate-800/80 min-w-[260px] space-y-2 text-xs">
						<p class="font-bold text-[11px] uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
							<span class="material-symbols-outlined text-sm text-amber-500">event</span>
							Jadwal Pelatihan
						</p>
						<div>
							<p class="text-sm font-black text-on-surface">{sessions[0].sessionDate || 'Jadwal Ditentukan'}</p>
							<p class="text-slate-500 font-mono text-[11px]">{sessions[0].startTime} - {sessions[0].endTime} WIB</p>
						</div>
						<div class="pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
							<p class="text-slate-500 text-[11px] truncate max-w-[240px]">
								📍 {sessions[0].locationOrLink}
							</p>
						</div>
					</div>
				{/if}
			</div>

			<!-- Notice jika terkunci -->
			{#if lockInfo.isLocked}
				<div class="mt-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
					<span class="material-symbols-outlined text-lg text-amber-600">lock</span>
					<span>
						{#if lockInfo.isExamStarted}
							Halaman dalam mode <strong>Hanya Baca (Read-Only)</strong> karena peserta pelatihan telah mulai mengerjakan kuis ujian.
						{:else if lockInfo.isCompleted}
							Soal telah <strong>Difinalisasi & Dikunci</strong> oleh Instruktur. Jika ada perubahan darurat, silakan hubungi tim HRD BCS.
						{:else}
							Akses pengeditan soal ini sedang <strong>Dikunci oleh Tim HR</strong>.
						{/if}
					</span>
				</div>
			{/if}
		</div>

		<!-- Formulir Utama Input Materi & Soal -->
		<form
			method="POST"
			action="?/saveQuestions"
			use:enhance={() => {
				isSubmitting = true;
				return async ({ update }) => {
					await update();
					isSubmitting = false;
					showFinalizeModal = false;
				};
			}}
			class="space-y-6"
		>
			<input type="hidden" name="preTestQuestions" value={JSON.stringify(preTestList)} />
			<input type="hidden" name="postTestQuestions" value={JSON.stringify(postTestList)} />
			<input type="hidden" name="finalize" value="false" id="finalizeFlag" />

			<!-- Card 1: Bahan Materi & Slide Pembelajaran -->
			<div class="p-6 rounded-3xl bg-surface border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<div class="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
							<span class="material-symbols-outlined text-lg">menu_book</span>
						</div>
						<div>
							<h3 class="text-sm font-bold text-on-surface">Tautan Materi / Slide Pembelajaran (Opsional)</h3>
							<p class="text-[11px] text-on-surface-variant">Lampirkan link Google Drive, Slide PDF, atau Tautan Video Pembelajaran untuk peserta.</p>
						</div>
					</div>
				</div>

				<div>
					<input
						type="url"
						name="materialsUrl"
						bind:value={materialsUrl}
						disabled={lockInfo.isLocked}
						placeholder="Contoh: https://drive.google.com/file/d/... atau https://youtu.be/..."
						class="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-700 text-xs font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
					/>
				</div>
			</div>

			<!-- Card 2: Editor Soal Pre-Test & Post-Test -->
			<div class="p-6 rounded-3xl bg-surface border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
				<!-- Header Kuis & Tab Switcher -->
				<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
					<div>
						<h3 class="text-base font-black text-on-surface tracking-tight">Penyusunan Butir Soal Evaluasi</h3>
						<p class="text-xs text-on-surface-variant">Susun pertanyaan Pre-Test (pengukuran awal) dan Post-Test (evaluasi pemahaman materi).</p>
					</div>

					<div class="flex items-center gap-2">
						<!-- Tab Switcher -->
						<div class="inline-flex items-center p-1 rounded-2xl bg-surface-container border border-slate-200 dark:border-slate-700">
							<button
								type="button"
								onclick={() => (activeQuizTab = 'PRE_TEST')}
								class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer {activeQuizTab === 'PRE_TEST'
									? 'bg-primary text-on-primary shadow-xs'
									: 'text-on-surface-variant hover:text-on-surface'}"
							>
								<span>Pre-Test</span>
								<span class="ml-1 px-1.5 py-0.2 rounded-md bg-white/20 text-[10px] font-mono">{preTestList.length}</span>
							</button>

							<button
								type="button"
								onclick={() => (activeQuizTab = 'POST_TEST')}
								class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer {activeQuizTab === 'POST_TEST'
									? 'bg-primary text-on-primary shadow-xs'
									: 'text-on-surface-variant hover:text-on-surface'}"
							>
								<span>Post-Test</span>
								<span class="ml-1 px-1.5 py-0.2 rounded-md bg-white/20 text-[10px] font-mono">{postTestList.length}</span>
							</button>
						</div>

						<!-- Tombol Salin Pre-Test ke Post-Test -->
						{#if !lockInfo.isLocked}
							<button
								type="button"
								onclick={copyPreToPost}
								title="Salin butir pertanyaan dari Pre-Test ke Post-Test agar tidak perlu ketik ulang"
								class="px-3 py-1.5 rounded-xl bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20 border border-indigo-500/30 text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer"
							>
								<span class="material-symbols-outlined text-sm">content_copy</span>
								<span class="hidden sm:inline">Salin ke Post-Test</span>
							</button>
						{/if}
					</div>
				</div>

				<!-- Info Context Banner -->
				<div class="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/60 text-xs text-blue-900 dark:text-blue-200 flex items-center justify-between gap-3">
					<div class="flex items-center gap-2">
						<span class="material-symbols-outlined text-base text-blue-600">info</span>
						<span>
							Menampilkan: <strong>{activeQuizTab === 'PRE_TEST' ? 'Pre-Test (Dikerjakan sebelum pelatihan dimulai)' : 'Post-Test (Dikerjakan setelah pemaparan materi)'}</strong>.
						</span>
					</div>
					<span class="text-[11px] font-mono font-bold text-blue-700 dark:text-blue-300">
						Total: {currentList.length} Butir Soal
					</span>
				</div>

				<!-- List Pertanyaan -->
				<div class="space-y-4">
					{#each currentList as question, qIndex}
						<div class="p-5 rounded-2xl bg-surface-container-low border border-slate-200/70 dark:border-slate-800/70 space-y-4 relative group">
							<!-- Header Nomor Soal & Controls -->
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-2.5">
									<span class="w-7 h-7 rounded-lg bg-primary/10 text-primary font-black text-xs flex items-center justify-center font-mono">
										#{qIndex + 1}
									</span>
									<span class="text-xs font-bold text-on-surface uppercase tracking-wider">
										Pertanyaan {qIndex + 1}
									</span>
								</div>

								<div class="flex items-center gap-2">
									<!-- Tipe Soal (Pilihan Ganda vs Essay) -->
									<select
										bind:value={question.questionType}
										disabled={lockInfo.isLocked}
										class="px-2.5 py-1 rounded-lg bg-surface border border-slate-200 dark:border-slate-700 text-xs font-semibold text-on-surface cursor-pointer disabled:opacity-60"
									>
										<option value="MCQ">Pilihan Ganda (MCQ)</option>
										<option value="ESSAY">Essay / Uraian</option>
									</select>

									<!-- Hapus Soal Button -->
									{#if !lockInfo.isLocked && currentList.length > 1}
										<button
											type="button"
											onclick={() => removeQuestion(activeQuizTab, qIndex)}
											class="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer"
											title="Hapus soal ini"
										>
											<span class="material-symbols-outlined text-base">delete</span>
										</button>
									{/if}
								</div>
							</div>

							<!-- Teks Pertanyaan -->
							<div>
								<textarea
									bind:value={question.questionText}
									disabled={lockInfo.isLocked}
									rows="2"
									placeholder="Tuliskan butir pertanyaan di sini..."
									class="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none disabled:opacity-60 font-medium leading-relaxed"
								></textarea>
							</div>

							<!-- Opsi Pilihan Ganda -->
							{#if question.questionType === 'MCQ'}
								<div class="space-y-2 pt-1">
									<label class="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
										Pilihan Jawaban & Tentukan Kunci Jawaban Benar (Pilih Radio)
									</label>

									<div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
										{#each question.options as opt}
											<div class="flex items-center gap-2 p-2 rounded-xl bg-surface border {question.correctKey === opt.key ? 'border-emerald-500/60 ring-2 ring-emerald-500/10' : 'border-slate-200 dark:border-slate-700'}">
												<label class="flex items-center gap-1.5 cursor-pointer">
													<input
														type="radio"
														name={`correct-${question.id}`}
														value={opt.key}
														checked={question.correctKey === opt.key}
														disabled={lockInfo.isLocked}
														onchange={() => (question.correctKey = opt.key)}
														class="text-emerald-600 focus:ring-emerald-500 cursor-pointer"
													/>
													<span class="font-mono font-bold text-xs {question.correctKey === opt.key ? 'text-emerald-600' : 'text-slate-400'}">
														{opt.key}.
													</span>
												</label>

												<input
													type="text"
													bind:value={opt.text}
													disabled={lockInfo.isLocked}
													placeholder={`Teks pilihan ${opt.key}...`}
													class="flex-1 bg-transparent border-none text-xs text-on-surface focus:outline-none p-0 disabled:opacity-60 font-medium"
												/>
											</div>
										{/each}
									</div>
								</div>
							{:else}
								<div class="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
									💡 <strong>Soal Essay:</strong> Jawaban peserta akan dinilai secara manual oleh instruktur atau sistem penilaian uraian.
								</div>
							{/if}

							<!-- Pembahasan / Catatan Penjelasan (Opsional) -->
							<div class="pt-1">
								<input
									type="text"
									bind:value={question.explanation}
									disabled={lockInfo.isLocked}
									placeholder="Catatan / Pembahasan jawaban (opsional)..."
									class="w-full px-3 py-1.5 rounded-lg bg-surface border border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 focus:outline-none focus:ring-1 focus:ring-primary/20 disabled:opacity-60 italic"
								/>
							</div>
						</div>
					{/each}
				</div>

				<!-- Tombol Tambah Soal -->
				{#if !lockInfo.isLocked}
					<div class="pt-2">
						<button
							type="button"
							onclick={() => addQuestion(activeQuizTab)}
							class="w-full py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-primary text-primary text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer hover:bg-primary/5"
						>
							<span class="material-symbols-outlined text-sm">add</span>
							<span>Tambah Butir Soal {activeQuizTab === 'PRE_TEST' ? 'Pre-Test' : 'Post-Test'}</span>
						</button>
					</div>
				{/if}
			</div>

			<!-- Bottom Sticky Action Bar -->
			<div class="p-4 rounded-3xl bg-surface border border-slate-200 dark:border-slate-800 shadow-md flex flex-col sm:flex-row items-center justify-between gap-3 sticky bottom-4 z-30">
				<div class="text-xs text-on-surface-variant text-center sm:text-left">
					<span class="font-bold text-on-surface">Status Penyusunan:</span>
					<span>Pre-Test: {preTestList.filter((q) => q.questionText.trim()).length} Soal | Post-Test: {postTestList.filter((q) => q.questionText.trim()).length} Soal</span>
				</div>

				<div class="flex items-center gap-2.5 w-full sm:w-auto">
					{#if !lockInfo.isLocked}
						<button
							type="submit"
							disabled={isSubmitting}
							onclick={() => {
								const flag = document.getElementById('finalizeFlag') as HTMLInputElement;
								if (flag) flag.value = 'false';
							}}
							class="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-surface-container text-on-surface transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 shadow-2xs disabled:opacity-50"
						>
							<span class="material-symbols-outlined text-sm">save</span>
							<span>Simpan Draf</span>
						</button>

						<button
							type="button"
							disabled={isSubmitting}
							onclick={() => (showFinalizeModal = true)}
							class="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
						>
							<span class="material-symbols-outlined text-sm">check_circle</span>
							<span>Finalisasi & Kunci Soal</span>
						</button>
					{:else}
						<div class="text-xs text-slate-400 font-bold italic py-1">
							🔒 Soal telah terkunci untuk kepatuhan asesmen pelatihan.
						</div>
					{/if}
				</div>
			</div>

			<!-- Modal Konfirmasi Finalisasi -->
			{#if showFinalizeModal}
				<div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
					<div class="bg-surface rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md p-6 space-y-4 animate-in zoom-in-95 duration-150">
						<div class="flex items-center gap-3">
							<div class="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
								<span class="material-symbols-outlined text-2xl">verified</span>
							</div>
							<div>
								<h4 class="font-black text-sm text-on-surface">Konfirmasi Finalisasi Soal</h4>
								<p class="text-[11px] text-on-surface-variant">Pastikan seluruh butir soal sudah sesuai</p>
							</div>
						</div>

						<p class="text-xs text-on-surface-variant leading-relaxed">
							Setelah difinalisasi, kuis akan langsung berstatus <strong>SIAP</strong> untuk dikerjakan peserta saat pelatihan dimulai dan tautan akan dikunci otomatis.
						</p>

						<div class="p-3 rounded-xl bg-surface-container text-xs font-mono space-y-1">
							<p>• Pre-Test: <strong>{preTestList.filter((q) => q.questionText.trim()).length} Butir Soal</strong></p>
							<p>• Post-Test: <strong>{postTestList.filter((q) => q.questionText.trim()).length} Butir Soal</strong></p>
						</div>

						<div class="flex items-center justify-end gap-2.5 pt-2">
							<button
								type="button"
								onclick={() => (showFinalizeModal = false)}
								class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-on-surface hover:bg-surface-container cursor-pointer"
							>
								Periksa Lagi
							</button>

							<button
								type="submit"
								onclick={() => {
									const flag = document.getElementById('finalizeFlag') as HTMLInputElement;
									if (flag) flag.value = 'true';
								}}
								class="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer shadow-xs inline-flex items-center gap-1.5"
							>
								<span class="material-symbols-outlined text-sm">lock</span>
								<span>Ya, Finalisasi & Kunci</span>
							</button>
						</div>
					</div>
				</div>
			{/if}
		</form>
	</main>

	<!-- Footer -->
	<footer class="py-4 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
		<p>© 2026 PT Buana Centra Swakarsa • HR Learning & Development Division</p>
	</footer>
</div>
