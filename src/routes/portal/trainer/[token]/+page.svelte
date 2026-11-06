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

	// Tab Utama Portal Trainer & State Penilaian Essay
	let activeMainTab = $state<'content' | 'essay_review'>('content');
	let enrollments = $derived(data.enrollments || []);
	let pendingEssayCount = $derived(enrollments.filter((e: any) => e.hasEssayPending).length);

	let selectedEnrollment = $state<any>(null);
	let essayScoresInput = $state<Record<string, number>>({});
	let feedbackInput = $state('');
	let showGradingModal = $state(false);

	let postTestQuestions = $derived((data.quizQuestions || []).filter((q: any) => q.quizType === 'POST_TEST'));
	let postTestEssayQuestions = $derived(
		postTestQuestions.filter((q: any) => q.questionType === 'ESSAY' || !q.options || q.options.length === 0)
	);
	let totalPostQ = $derived(postTestQuestions.length || 1);
	let maxPtsPerEssay = $derived(Math.max(1, Math.round(100 / totalPostQ)));
	let hasEssayInCourse = $derived(
		postTestEssayQuestions.length > 0 || enrollments.some((e: any) => e.hasEssayPending)
	);

	function openGradingModal(enrollment: any) {
		selectedEnrollment = enrollment;
		essayScoresInput = { ...(enrollment.essayScores || {}) };
		for (const eq of postTestEssayQuestions) {
			if (essayScoresInput[eq.id] === undefined) {
				essayScoresInput[eq.id] = 0;
			}
		}
		feedbackInput = enrollment.essayFeedback || '';
		showGradingModal = true;
	}

	let currentMcqScore = $derived.by(() => {
		if (!selectedEnrollment) return 0;
		const mcqQuestions = postTestQuestions.filter((q: any) => q.questionType !== 'ESSAY' && q.options && q.options.length > 0);
		let correct = 0;
		const answers = (selectedEnrollment.postTestAnswers || {}) as Record<string, string>;
		for (const mq of mcqQuestions) {
			if ((answers[mq.id] || '').toUpperCase() === (mq.correctKey || '').toUpperCase()) {
				correct++;
			}
		}
		return Math.round((correct / totalPostQ) * 100);
	});

	let currentTotalEssayPts = $derived(
		Object.values(essayScoresInput).reduce((sum, val) => sum + (Number(val) || 0), 0)
	);

	let predictedFinalScore = $derived(Math.min(100, currentMcqScore + currentTotalEssayPts));

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

		<!-- Tab Switcher Trainer Portal -->
		<div class="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
			<button
				type="button"
				onclick={() => (activeMainTab = 'content')}
				class="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer {activeMainTab === 'content' ? 'bg-primary text-on-primary shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}"
			>
				<span class="material-symbols-outlined text-base">quiz</span>
				<span>Materi & Soal Kuis</span>
			</button>

			{#if hasEssayInCourse}
				<button
					type="button"
					onclick={() => (activeMainTab = 'essay_review')}
					class="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer {activeMainTab === 'essay_review' ? 'bg-primary text-on-primary shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}"
				>
					<span class="material-symbols-outlined text-base">rate_review</span>
					<span>Penilaian Essay Peserta</span>
					{#if pendingEssayCount > 0}
						<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white animate-pulse">
							{pendingEssayCount}
						</span>
					{/if}
				</button>
			{/if}
		</div>

		{#if activeMainTab === 'content'}
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
		{:else if activeMainTab === 'essay_review'}
			<!-- Tab Penilaian Essay Peserta -->
			<div class="space-y-6">
				<!-- Stat Cards -->
				<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
					<div class="p-4 rounded-2xl bg-surface border border-slate-200 dark:border-slate-800 space-y-1">
						<span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Terdaftar</span>
						<p class="text-2xl font-black text-on-surface">{enrollments.length}</p>
					</div>
					<div class="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1">
						<span class="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Menunggu Koreksi</span>
						<p class="text-2xl font-black text-amber-600 dark:text-amber-400">{pendingEssayCount}</p>
					</div>
					<div class="p-4 rounded-2xl bg-surface border border-slate-200 dark:border-slate-800 space-y-1">
						<span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Telah Mengumpulkan</span>
						<p class="text-2xl font-black text-on-surface">
							{enrollments.filter((e) => e.postTestScore !== null).length}
						</p>
					</div>
					<div class="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
						<span class="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Lulus / Sertifikat</span>
						<p class="text-2xl font-black text-emerald-600 dark:text-emerald-400">
							{enrollments.filter((e) => e.hasCertificate || (e.postTestScore !== null && e.postTestScore >= (course.passingGrade || 75))).length}
						</p>
					</div>
				</div>

				<!-- Tabel Peserta -->
				<div class="p-6 rounded-3xl bg-surface border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
					<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
						<div>
							<h3 class="text-sm font-black text-on-surface">Daftar Hasil & Uraian Post-Test Peserta</h3>
							<p class="text-[11px] text-on-surface-variant">
								Periksa butir essay peserta untuk mengunggah nilai akhir dan menerbitkan e-sertifikat resmi.
							</p>
						</div>
					</div>

					{#if enrollments.length === 0}
						<div class="p-8 text-center text-xs text-slate-400 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
							Belum ada peserta yang terdaftar pada pelatihan ini.
						</div>
					{:else}
						<div class="overflow-x-auto">
							<table class="w-full text-left text-xs">
								<thead>
									<tr class="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] font-bold">
										<th class="py-3 px-3">Peserta</th>
										<th class="py-3 px-3 text-center">Pre-Test</th>
										<th class="py-3 px-3 text-center">Post-Test</th>
										<th class="py-3 px-3 text-center">Status Essay</th>
										<th class="py-3 px-3 text-center">Evaluasi L1</th>
										<th class="py-3 px-3 text-center">Sertifikat</th>
										<th class="py-3 px-3 text-right">Aksi</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
									{#each enrollments as e}
										<tr class="hover:bg-surface-container transition-colors">
											<td class="py-3 px-3">
												<div class="font-bold text-on-surface">{e.employeeName}</div>
												<div class="text-[10px] font-mono text-slate-400">{e.payrollId}</div>
											</td>
											<td class="py-3 px-3 text-center font-mono">
												{e.preTestScore !== null ? `${e.preTestScore}` : '-'}
											</td>
											<td class="py-3 px-3 text-center font-mono font-bold {e.postTestScore !== null && e.postTestScore >= (course.passingGrade || 75) ? 'text-emerald-600' : 'text-slate-600 dark:text-slate-300'}">
												{e.postTestScore !== null ? `${e.postTestScore}/100` : '-'}
											</td>
											<td class="py-3 px-3 text-center">
												{#if e.hasEssayPending}
													<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
														Menunggu Koreksi
													</span>
												{:else if e.essayReviewedAt}
													<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
														Sudah Dinilai
													</span>
												{:else if postTestEssayQuestions.length === 0}
													<span class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
														Otomatis (MCQ)
													</span>
												{:else}
													<span class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
														Belum Submit
													</span>
												{/if}
											</td>
											<td class="py-3 px-3 text-center">
												{#if e.hasEvaluationL1}
													<span class="text-emerald-600 font-bold flex items-center justify-center gap-1">
														<span class="material-symbols-outlined text-sm">verified</span>
														<span>Terisi</span>
													</span>
												{:else}
													<span class="text-slate-400 text-[11px]">-</span>
												{/if}
											</td>
											<td class="py-3 px-3 text-center">
												{#if e.hasCertificate}
													<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
														#{e.certificateNumber || 'AKTIF'}
													</span>
												{:else}
													<span class="text-slate-400 text-[11px]">Belum</span>
												{/if}
											</td>
											<td class="py-3 px-3 text-right">
												{#if postTestEssayQuestions.length > 0 && (e.postTestAnswers && Object.keys(e.postTestAnswers).length > 0)}
													<button
														type="button"
														onclick={() => openGradingModal(e)}
														class="px-3 py-1.5 rounded-xl {e.hasEssayPending ? 'bg-amber-600 hover:bg-amber-500 text-white font-bold' : 'border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'} text-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
													>
														<span class="material-symbols-outlined text-sm">edit_note</span>
														<span>{e.hasEssayPending ? 'Koreksi Essay' : 'Tinjau / Edit Nilai'}</span>
													</button>
												{:else}
													<span class="text-slate-400 text-[11px]">-</span>
												{/if}
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}
				</div>
			</div>

			<!-- Modal Koreksi Essay Trainer -->
			{#if showGradingModal && selectedEnrollment}
				<div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
					<div class="bg-surface rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl p-6 md:p-8 space-y-6 my-8 animate-in zoom-in-95 duration-150">
						<!-- Header Modal -->
						<div class="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
							<div class="flex items-center gap-3">
								<div class="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold shrink-0">
									<span class="material-symbols-outlined text-2xl">rate_review</span>
								</div>
								<div>
									<h4 class="font-black text-base text-on-surface">Koreksi Jawaban Essay Peserta</h4>
									<p class="text-xs text-on-surface-variant font-medium">
										{selectedEnrollment.employeeName} ({selectedEnrollment.payrollId}) • Passing Grade: {course.passingGrade}%
									</p>
								</div>
							</div>
							<button
								type="button"
								onclick={() => (showGradingModal = false)}
								class="p-2 rounded-xl text-slate-400 hover:text-on-surface hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
							>
								<span class="material-symbols-outlined text-lg">close</span>
							</button>
						</div>

						<form
							method="POST"
							action="?/gradeEssay"
							use:enhance={() => {
								isSubmitting = true;
								return async ({ update }) => {
									await update();
									isSubmitting = false;
									showGradingModal = false;
								};
							}}
							class="space-y-6"
						>
							<input type="hidden" name="enrollmentId" value={selectedEnrollment.id} />
							<input type="hidden" name="reviewerName" value={course.instructor} />

							<!-- Ringkasan Nilai Pilihan Ganda -->
							<div class="p-4 rounded-2xl bg-surface-container border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
								<span class="text-on-surface-variant font-medium">Nilai Pilihan Ganda (MCQ):</span>
								<span class="font-bold text-on-surface font-mono">{currentMcqScore} Poin</span>
							</div>

							<!-- Daftar Butir Soal Essay -->
							<div class="space-y-4 max-h-96 overflow-y-auto pr-1">
								{#each postTestEssayQuestions as eq, idx}
									{@const userAns = selectedEnrollment.postTestAnswers?.[eq.id] || '(Peserta tidak mengisi jawaban)'}
									<div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
										<div class="flex items-start justify-between gap-3">
											<div class="flex items-start gap-2.5">
												<span class="w-6 h-6 rounded-lg bg-amber-600 text-white text-xs font-black flex items-center justify-center shrink-0">
													{idx + 1}
												</span>
												<p class="text-xs font-bold text-on-surface leading-relaxed">
													{eq.questionText}
												</p>
											</div>
											<span class="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800 shrink-0">
												Maks: {maxPtsPerEssay} Poin
											</span>
										</div>

										<!-- Jawaban Peserta -->
										<div class="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-on-surface leading-relaxed whitespace-pre-wrap">
											<p class="text-[10px] uppercase font-bold text-slate-400 mb-1">Jawaban Peserta:</p>
											"{userAns}"
										</div>

										{#if eq.explanation}
											<div class="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
												<span class="material-symbols-outlined text-xs text-amber-500">info</span>
												<span>Panduan / Rubrik: {eq.explanation}</span>
											</div>
										{/if}

										<!-- Input Nilai Essay -->
										<div class="flex items-center justify-between pt-1">
											<label for="score_{eq.id}" class="text-xs font-bold text-on-surface">
												Nilai yang Diberikan (0 - {maxPtsPerEssay}):
											</label>
											<div class="flex items-center gap-1.5">
												<input
													type="number"
													id="score_{eq.id}"
													name="score_{eq.id}"
													min="0"
													max={maxPtsPerEssay}
													bind:value={essayScoresInput[eq.id]}
													required
													class="w-20 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm font-black text-center text-on-surface outline-hidden focus:ring-2 focus:ring-amber-500"
												/>
												<span class="text-xs text-slate-400 font-mono">/ {maxPtsPerEssay}</span>
											</div>
										</div>
									</div>
								{/each}
							</div>

							<!-- Feedback Instruktur -->
							<div class="space-y-1.5">
								<label for="feedbackTrainer" class="block text-xs font-bold text-on-surface">
									Catatan & Masukan Instruktur (Opsional):
								</label>
								<textarea
									id="feedbackTrainer"
									name="feedback"
									bind:value={feedbackInput}
									rows="2"
									placeholder="Tuliskan masukan atau catatan perbaikan pemahaman untuk peserta ini..."
									class="w-full p-3 rounded-xl bg-surface-container border border-slate-300 dark:border-slate-700 text-xs outline-hidden focus:ring-2 focus:ring-primary"
								></textarea>
							</div>

							<!-- Preview Total Nilai Akhir -->
							<div class="p-4 rounded-2xl {predictedFinalScore >= (course.passingGrade || 75) ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800'} border flex items-center justify-between text-xs">
								<div>
									<div class="font-black {predictedFinalScore >= (course.passingGrade || 75) ? 'text-emerald-900 dark:text-emerald-200' : 'text-rose-900 dark:text-rose-200'}">
										TOTAL PREDIKSI SKOR AKHIR: {predictedFinalScore} / 100
									</div>
									<p class="text-[11px] {predictedFinalScore >= (course.passingGrade || 75) ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}">
										{predictedFinalScore >= (course.passingGrade || 75) ? `Memenuhi Passing Grade (${course.passingGrade}%). E-Sertifikat otomatis terbit jika Evaluasi L1 sudah terisi.` : `Belum mencapai Passing Grade (${course.passingGrade}%).`}
									</p>
								</div>
								<span class="px-3 py-1 rounded-full text-xs font-black {predictedFinalScore >= (course.passingGrade || 75) ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}">
									{predictedFinalScore >= (course.passingGrade || 75) ? 'LULUS' : 'TIDAK LULUS'}
								</span>
							</div>

							<!-- Tombol Modal Action -->
							<div class="flex items-center justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
								<button
									type="button"
									onclick={() => (showGradingModal = false)}
									class="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-on-surface hover:bg-surface-container cursor-pointer"
								>
									Batal
								</button>
								<button
									type="submit"
									disabled={isSubmitting}
									class="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-black shadow-lg shadow-amber-600/30 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
								>
									<span class="material-symbols-outlined text-sm">verified</span>
									<span>{isSubmitting ? 'Menyimpan...' : 'Simpan Nilai & Sinkronkan Kelulusan'}</span>
								</button>
							</div>
						</form>
					</div>
				</div>
			{/if}
		{/if}
	</main>

	<!-- Footer -->
	<footer class="py-4 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
		<p>© 2026 PT Buana Centra Swakarsa • HR Learning & Development Division</p>
	</footer>
</div>
