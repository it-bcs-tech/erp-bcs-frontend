<script lang="ts">
	import { 
		mailStore, 
		unreadCount, 
		folderCounts, 
		filteredEmails, 
		selectedEmail 
	} from '$lib/stores/mail';
	import { authUser, displayName } from '$lib/stores/auth';
	import type { EmailCategory, EmailMessage } from '$lib/types/mail';

	const user = $derived($authUser);
	const activeFolder = mailStore.activeFolder;
	const selectedEmailId = mailStore.selectedEmailId;
	const searchQuery = mailStore.searchQuery;
	const filterUnreadOnly = mailStore.filterUnreadOnly;
	const isComposeOpen = mailStore.isComposeOpen;

	// Mobile view switch: 'list' | 'detail'
	let mobileView = $state<'list' | 'detail'>('list');

	// Compose Form State
	let composeTo = $state('');
	let composeSubject = $state('');
	let composeBody = $state('');
	let composeSuccessToast = $state(false);

	function setFolder(folder: EmailCategory) {
		activeFolder.set(folder);
		mobileView = 'list';
	}

	function handleSelectEmail(email: EmailMessage) {
		selectedEmailId.set(email.id);
		mailStore.emails.markAsRead(email.id);
		mobileView = 'detail';
	}

	function handleOpenCompose(replyTo?: EmailMessage | null) {
		if (replyTo) {
			composeTo = replyTo.fromEmail;
			composeSubject = replyTo.subject.startsWith('Re:') ? replyTo.subject : `Re: ${replyTo.subject}`;
			composeBody = `\n\n--- Pesan Asli dari ${replyTo.fromName} (${replyTo.date}) ---\n${replyTo.preview}`;
		} else {
			composeTo = '';
			composeSubject = '';
			composeBody = '';
		}
		isComposeOpen.set(true);
	}

	function handleSendCompose() {
		if (!composeTo.trim() || !composeSubject.trim()) return;

		mailStore.emails.sendEmail({
			folder: 'sent',
			fromName: displayName(user) || 'Pengguna ERP',
			fromEmail: user?.email || 'karyawan@bcs-logistics.co.id',
			toName: composeTo.split('@')[0],
			toEmail: composeTo.trim(),
			subject: composeSubject.trim(),
			preview: composeBody.slice(0, 80),
			bodyText: composeBody,
			priority: 'normal'
		});

		isComposeOpen.set(false);
		composeTo = '';
		composeSubject = '';
		composeBody = '';
		composeSuccessToast = true;
		setTimeout(() => (composeSuccessToast = false), 3500);
	}
</script>

<svelte:head>
	<title>Kotak Masuk Email — BCS Logistics ERP</title>
</svelte:head>

<div class="h-[calc(100vh-64px)] flex overflow-hidden bg-surface">
	<!-- ========================================================================= -->
	<!-- KOLOM 1: SIDEBAR FOLDERS -->
	<!-- ========================================================================= -->
	<aside class="w-64 flex-shrink-0 bg-surface-container-low border-r border-slate-200/70 dark:border-slate-800/70 flex flex-col p-4 gap-4 hidden lg:flex select-none">
		<!-- Compose Button -->
		<button
			type="button"
			onclick={() => handleOpenCompose(null)}
			class="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer transform hover:-translate-y-0.5"
		>
			<span class="material-symbols-outlined text-[20px]">edit</span>
			<span>Tulis Email Baru</span>
		</button>

		<!-- Navigation Folders -->
		<nav class="flex-1 space-y-1">
			<div class="px-3 pb-1 text-[10px] font-black uppercase tracking-wider text-on-surface-variant/60">
				Kotak Surat
			</div>

			<!-- Inbox -->
			<button
				type="button"
				onclick={() => setFolder('inbox')}
				class="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer {$activeFolder === 'inbox' ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}"
			>
				<div class="flex items-center gap-3">
					<span class="material-symbols-outlined text-[20px]">inbox</span>
					<span>Kotak Masuk</span>
				</div>
				{#if $folderCounts.inboxUnread > 0}
					<span class="px-2 py-0.5 rounded-full text-xs font-black bg-orange-600 text-white">
						{$folderCounts.inboxUnread}
					</span>
				{:else if $folderCounts.inbox > 0}
					<span class="text-xs text-on-surface-variant">{$folderCounts.inbox}</span>
				{/if}
			</button>

			<!-- Approvals / System Alerts -->
			<button
				type="button"
				onclick={() => setFolder('approvals')}
				class="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer {$activeFolder === 'approvals' ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}"
			>
				<div class="flex items-center gap-3">
					<span class="material-symbols-outlined text-[20px] text-amber-500">verified</span>
					<span>Notifikasi Approval</span>
				</div>
				{#if $folderCounts.approvals > 0}
					<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300">
						{$folderCounts.approvals}
					</span>
				{/if}
			</button>

			<!-- Sent -->
			<button
				type="button"
				onclick={() => setFolder('sent')}
				class="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer {$activeFolder === 'sent' ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}"
			>
				<div class="flex items-center gap-3">
					<span class="material-symbols-outlined text-[20px]">send</span>
					<span>Terkirim</span>
				</div>
				{#if $folderCounts.sent > 0}
					<span class="text-xs text-on-surface-variant">{$folderCounts.sent}</span>
				{/if}
			</button>

			<!-- Drafts -->
			<button
				type="button"
				onclick={() => setFolder('drafts')}
				class="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer {$activeFolder === 'drafts' ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}"
			>
				<div class="flex items-center gap-3">
					<span class="material-symbols-outlined text-[20px]">draft</span>
					<span>Draf</span>
				</div>
				{#if $folderCounts.drafts > 0}
					<span class="text-xs text-on-surface-variant">{$folderCounts.drafts}</span>
				{/if}
			</button>

			<!-- Trash -->
			<button
				type="button"
				onclick={() => setFolder('trash')}
				class="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer {$activeFolder === 'trash' ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}"
			>
				<div class="flex items-center gap-3">
					<span class="material-symbols-outlined text-[20px]">delete</span>
					<span>Sampah</span>
				</div>
				{#if $folderCounts.trash > 0}
					<span class="text-xs text-on-surface-variant">{$folderCounts.trash}</span>
				{/if}
			</button>
		</nav>

		<!-- Corporate Mail Status Box -->
		<div class="p-3.5 rounded-2xl bg-surface-container border border-slate-200/80 dark:border-slate-800/80 text-xs space-y-2">
			<div class="flex items-center justify-between">
				<span class="font-bold text-on-surface text-[11px] uppercase tracking-wider">Mail Service</span>
				<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Connected"></span>
			</div>
			<p class="text-[11px] text-on-surface-variant leading-relaxed">
				Terhubung ke server korporat <strong>BCS Logistics Mailer</strong>. Mendukung integrasi notifikasi sistem ERP.
			</p>
			<a
				href="/settings"
				class="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 dark:text-orange-400 hover:underline pt-1"
			>
				<span>Pengaturan Server</span>
				<span class="material-symbols-outlined text-[13px]">arrow_forward</span>
			</a>
		</div>
	</aside>

	<!-- ========================================================================= -->
	<!-- KOLOM 2: DAFTAR PESAN (EMAIL LIST) -->
	<!-- ========================================================================= -->
	<section class="w-full lg:w-96 flex-shrink-0 bg-surface border-r border-slate-200/70 dark:border-slate-800/70 flex flex-col {mobileView === 'detail' ? 'hidden lg:flex' : 'flex'}">
		<!-- Search & Header Bar -->
		<div class="p-3.5 border-b border-slate-200/70 dark:border-slate-800/70 space-y-3 bg-surface-container-low/50">
			<!-- Folder Title & Stats -->
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2">
					<h1 class="text-base font-black text-on-surface capitalize">
						{$activeFolder === 'inbox' ? 'Kotak Masuk' : $activeFolder === 'approvals' ? 'Notifikasi Approval' : $activeFolder}
					</h1>
					{#if $activeFolder === 'inbox' && $unreadCount > 0}
						<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300">
							{$unreadCount} Belum Dibaca
						</span>
					{/if}
				</div>

				<!-- Mobile Compose & Actions -->
				<button
					type="button"
					onclick={() => handleOpenCompose(null)}
					class="lg:hidden p-2 rounded-xl bg-orange-600 text-white font-bold"
					aria-label="Tulis Pesan"
				>
					<span class="material-symbols-outlined text-[18px]">edit</span>
				</button>
			</div>

			<!-- Search Bar -->
			<div class="relative">
				<span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
				<input
					type="text"
					bind:value={$searchQuery}
					placeholder="Cari subjek, pengirim, atau dokumen..."
					class="w-full bg-surface-container border border-slate-200/80 dark:border-slate-700 rounded-xl py-2 pl-9 pr-8 text-xs text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-orange-500/30"
				/>
				{#if $searchQuery}
					<button
						type="button"
						onclick={() => searchQuery.set('')}
						class="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
					>
						<span class="material-symbols-outlined text-[16px]">close</span>
					</button>
				{/if}
			</div>

			<!-- Filter Toggles -->
			<div class="flex items-center gap-2 text-xs">
				<button
					type="button"
					onclick={() => filterUnreadOnly.set(false)}
					class="px-2.5 py-1 rounded-lg font-semibold transition-colors {!$filterUnreadOnly ? 'bg-surface-container-highest text-on-surface font-bold' : 'text-on-surface-variant hover:text-on-surface'}"
				>
					Semua ({$folderCounts[$activeFolder as keyof typeof $folderCounts] || 0})
				</button>
				<button
					type="button"
					onclick={() => filterUnreadOnly.set(true)}
					class="px-2.5 py-1 rounded-lg font-semibold transition-colors {$filterUnreadOnly ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400 font-bold' : 'text-on-surface-variant hover:text-on-surface'}"
				>
					Belum Dibaca
				</button>
			</div>
		</div>

		<!-- Email Item List -->
		<div class="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
			{#if $filteredEmails.length === 0}
				<div class="p-8 text-center text-on-surface-variant space-y-2">
					<span class="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600">mail</span>
					<p class="text-xs font-semibold">Tidak ada email yang cocok.</p>
				</div>
			{:else}
				{#each $filteredEmails as email (email.id)}
					<div
						role="button"
						tabindex="0"
						onclick={() => handleSelectEmail(email)}
						onkeydown={(e) => { if (e.key === 'Enter') handleSelectEmail(email); }}
						class="p-3.5 transition-all text-left cursor-pointer border-l-4 {email.id === $selectedEmailId ? 'bg-orange-500/10 border-orange-600 dark:border-orange-500' : email.isRead ? 'border-transparent hover:bg-surface-container-low/70' : 'bg-surface-container-low/40 border-amber-500 hover:bg-surface-container-low font-semibold'}"
					>
						<!-- Sender & Date -->
						<div class="flex items-center justify-between gap-2 mb-1">
							<div class="flex items-center gap-1.5 min-w-0">
								{#if !email.isRead}
									<span class="w-2 h-2 rounded-full bg-orange-600 flex-shrink-0" title="Belum Dibaca"></span>
								{/if}
								<span class="text-xs truncate font-bold text-on-surface">
									{email.fromName}
								</span>
							</div>
							<span class="text-[10px] text-on-surface-variant font-medium flex-shrink-0">
								{email.date}
							</span>
						</div>

						<!-- Subject -->
						<p class="text-xs font-bold text-on-surface truncate mb-1 leading-snug">
							{email.subject}
						</p>

						<!-- Preview Snippet -->
						<p class="text-[11px] text-on-surface-variant line-clamp-2 leading-relaxed mb-2 font-normal">
							{email.preview}
						</p>

						<!-- Badges & Indicators -->
						<div class="flex items-center justify-between text-[10px] pt-1">
							<div class="flex items-center gap-1.5 flex-wrap">
								{#if email.badge}
									<span class="px-2 py-0.5 rounded-full font-bold {email.badge.variant === 'amber' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' : email.badge.variant === 'emerald' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300'}">
										{email.badge.text}
									</span>
								{/if}
								{#if email.hasAttachments}
									<span class="inline-flex items-center gap-0.5 text-on-surface-variant" title="Lampiran Terlampir">
										<span class="material-symbols-outlined text-[14px]">attach_file</span>
									</span>
								{/if}
							</div>

							<!-- Star toggle button -->
							<button
								type="button"
								onclick={(e) => { e.stopPropagation(); mailStore.emails.toggleStar(email.id); }}
								class="p-1 text-slate-400 hover:text-amber-500 transition-colors"
								title="Bintang"
							>
								<span class="material-symbols-outlined text-[16px] {email.isStarred ? 'text-amber-500 fill-1 font-bold' : ''}">
									star
								</span>
							</button>
						</div>
					</div>
				{/each}
			{/if}
		</div>
	</section>

	<!-- ========================================================================= -->
	<!-- KOLOM 3: EMAIL VIEWER (PEMBACA PESAN) -->
	<!-- ========================================================================= -->
	<main class="flex-1 bg-surface-container-lowest flex flex-col overflow-y-auto {mobileView === 'list' ? 'hidden lg:flex' : 'flex'}">
		{#if $selectedEmail}
			<!-- Top Action Toolbar -->
			<div class="p-3.5 px-6 border-b border-slate-200/70 dark:border-slate-800/70 bg-surface-container-low flex items-center justify-between gap-3 sticky top-0 z-10 backdrop-blur-md">
				<div class="flex items-center gap-2">
					<!-- Back button on mobile -->
					<button
						type="button"
						onclick={() => (mobileView = 'list')}
						class="lg:hidden p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container"
						title="Kembali ke Daftar"
					>
						<span class="material-symbols-outlined text-[20px]">arrow_back</span>
					</button>

					<button
						type="button"
						onclick={() => handleOpenCompose($selectedEmail)}
						class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs"
					>
						<span class="material-symbols-outlined text-[16px]">reply</span>
						<span>Balas</span>
					</button>

					<button
						type="button"
						onclick={() => mailStore.emails.markAsUnread($selectedEmail!.id)}
						class="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
						title="Tandai Belum Dibaca"
					>
						<span class="material-symbols-outlined text-[18px]">mark_email_unread</span>
					</button>

					<button
						type="button"
						onclick={() => mailStore.emails.deleteEmail($selectedEmail!.id)}
						class="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
						title="Hapus Pesan"
					>
						<span class="material-symbols-outlined text-[18px]">delete</span>
					</button>
				</div>

				<div class="flex items-center gap-2 text-xs text-on-surface-variant">
					<span>ID: <code class="font-mono text-[11px]">{$selectedEmail.id}</code></span>
				</div>
			</div>

			<!-- Message Header & Metadata -->
			<div class="p-6 md:p-8 space-y-6 max-w-4xl mx-auto w-full">
				<!-- Subject Title -->
				<div class="space-y-2">
					<div class="flex items-center gap-2 flex-wrap">
						{#if $selectedEmail.badge}
							<span class="px-2.5 py-0.5 rounded-full text-xs font-bold {$selectedEmail.badge.variant === 'amber' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'}">
								{$selectedEmail.badge.text}
							</span>
						{/if}
						<span class="text-xs text-on-surface-variant font-mono">{$selectedEmail.date}</span>
					</div>
					<h2 class="text-xl md:text-2xl font-black text-on-surface leading-tight">
						{$selectedEmail.subject}
					</h2>
				</div>

				<!-- Sender Card -->
				<div class="flex items-center justify-between p-4 rounded-2xl bg-surface-container-low border border-slate-200/70 dark:border-slate-800/70">
					<div class="flex items-center gap-3.5">
						<div class="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 text-white font-black text-sm flex items-center justify-center">
							{$selectedEmail.fromName.slice(0, 2).toUpperCase()}
						</div>
						<div>
							<p class="font-bold text-sm text-on-surface">{$selectedEmail.fromName}</p>
							<p class="text-xs text-on-surface-variant">{$selectedEmail.fromEmail}</p>
						</div>
					</div>

					<div class="text-right text-xs text-on-surface-variant hidden sm:block">
						<p>Kepada: <strong>{$selectedEmail.toEmail}</strong></p>
					</div>
				</div>

				<!-- Message Body Container -->
				<div class="bg-surface rounded-2xl p-6 md:p-8 border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
					{#if $selectedEmail.bodyHtml}
						<!-- Render Responsive Corporate HTML Template -->
						{@html $selectedEmail.bodyHtml}
					{:else}
						<div class="text-sm text-on-surface leading-relaxed whitespace-pre-line font-sans">
							{$selectedEmail.bodyText || $selectedEmail.preview}
						</div>
					{/if}
				</div>

				<!-- Attachments (If any) -->
				{#if $selectedEmail.attachments && $selectedEmail.attachments.length > 0}
					<div class="space-y-3 pt-2">
						<p class="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Lampiran Dokumen ({$selectedEmail.attachments.length})</p>
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
							{#each $selectedEmail.attachments as att}
								<div class="p-3 rounded-xl bg-surface-container border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs">
									<div class="flex items-center gap-2.5 truncate">
										<span class="material-symbols-outlined text-rose-500 text-[22px]">picture_as_pdf</span>
										<div class="truncate">
											<p class="font-bold text-on-surface truncate">{att.filename}</p>
											<p class="text-[10px] text-on-surface-variant">{att.size}</p>
										</div>
									</div>
									<button
										type="button"
										class="p-1.5 rounded-lg text-orange-600 hover:bg-orange-500/10 cursor-pointer"
										title="Unduh Dokumen"
									>
										<span class="material-symbols-outlined text-[18px]">download</span>
									</button>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Quick Reply Action -->
				<div class="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3">
					<button
						type="button"
						onclick={() => handleOpenCompose($selectedEmail)}
						class="px-5 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-bold text-on-surface border border-slate-200/70 dark:border-slate-800 flex items-center gap-2 transition-all cursor-pointer"
					>
						<span class="material-symbols-outlined text-[16px]">reply</span>
						<span>Ketik Balasan...</span>
					</button>
				</div>
			</div>
		{:else}
			<!-- Empty State -->
			<div class="flex-1 flex flex-col items-center justify-center p-8 text-center text-on-surface-variant space-y-3">
				<div class="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-slate-400">
					<span class="material-symbols-outlined text-3xl">mark_email_read</span>
				</div>
				<h3 class="text-base font-bold text-on-surface">Pilih Email untuk Dibaca</h3>
				<p class="text-xs max-w-sm text-on-surface-variant">
					Pilih salah satu pesan di kolom daftar untuk melihat rincian isi email, status persetujuan, atau lampiran dokumen.
				</p>
			</div>
		{/if}
	</main>
</div>

<!-- ========================================================================= -->
<!-- MODAL: TULIS EMAIL / BALAS PESAN -->
<!-- ========================================================================= -->
{#if $isComposeOpen}
	<div class="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
		<div class="w-full max-w-2xl bg-surface-container-lowest rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
			<!-- Modal Header -->
			<div class="p-4 px-6 bg-gradient-to-r from-[#0F172A] to-[#1E3A8A] text-white flex items-center justify-between">
				<div class="flex items-center gap-2.5">
					<span class="material-symbols-outlined text-orange-400 text-[20px]">forward_to_inbox</span>
					<h3 class="font-bold text-sm">Tulis Pesan Email Baru</h3>
				</div>
				<button
					type="button"
					onclick={() => isComposeOpen.set(false)}
					class="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
				>
					<span class="material-symbols-outlined text-[18px]">close</span>
				</button>
			</div>

			<!-- Modal Form Body -->
			<div class="p-6 space-y-4">
				<div>
					<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">
						Kepada (Email Penerima)
					</label>
					<input
						type="email"
						bind:value={composeTo}
						placeholder="Contoh: bambang@bcs-logistics.co.id"
						class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container border border-slate-200/80 dark:border-slate-700 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-orange-500/40"
					/>
				</div>

				<div>
					<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">
						Subjek Email
					</label>
					<input
						type="text"
						bind:value={composeSubject}
						placeholder="Judul atau topik pesan..."
						class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container border border-slate-200/80 dark:border-slate-700 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-orange-500/40 font-semibold"
					/>
				</div>

				<div>
					<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">
						Isi Pesan
					</label>
					<textarea
						rows="7"
						bind:value={composeBody}
						placeholder="Tuliskan isi pesan atau keterangan di sini..."
						class="w-full p-3.5 rounded-xl bg-surface-container border border-slate-200/80 dark:border-slate-700 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-orange-500/40 leading-relaxed resize-none"
					></textarea>
				</div>
			</div>

			<!-- Modal Footer Actions -->
			<div class="p-4 px-6 bg-surface-container-low border-t border-slate-200/70 dark:border-slate-800/70 flex items-center justify-between">
				<p class="text-[11px] text-on-surface-variant">
					Pengirim: <strong>{user?.email || 'karyawan@bcs-logistics.co.id'}</strong>
				</p>
				<div class="flex items-center gap-2.5">
					<button
						type="button"
						onclick={() => isComposeOpen.set(false)}
						class="px-4 py-2 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-container"
					>
						Batal
					</button>
					<button
						type="button"
						onclick={handleSendCompose}
						class="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer"
					>
						<span class="material-symbols-outlined text-[16px]">send</span>
						<span>Kirim Sekarang</span>
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Toast Notification -->
{#if composeSuccessToast}
	<div class="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-bold border border-slate-700 animate-in slide-in-from-bottom duration-200">
		<span class="material-symbols-outlined text-emerald-400 text-[18px]">check_circle</span>
		<span>Email berhasil dikirim dan tersimpan di folder Terkirim!</span>
	</div>
{/if}
