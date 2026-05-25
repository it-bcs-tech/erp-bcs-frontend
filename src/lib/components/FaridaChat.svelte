<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { browser } from '$app/environment';
	import { marked } from 'marked';

	// ── State ──────────────────────────────────────────────────────────
	let isOpen = $state(false);
	let isExpanded = $state(false);
	let currentView = $state<'menu' | 'chat'>('chat');
	let chatContainer: HTMLElement;
	let inputValue = $state('');
	let isLoading = $state(false);

	interface Message {
		id: string;
		role: 'user' | 'assistant';
		content: string;
	}

	const STORAGE_KEY = 'farida_fms_chat_history';

	const WELCOME_MSG = 'Halo! Saya **FARIDA**, asisten monitoring armada FMS. Saya dapat membantu Anda memantau kondisi armada, mendeteksi kemacetan, dan memberikan laporan real-time. Ada yang bisa saya bantu? 🚛';

	let messages = $state<Message[]>([
		{ id: 'init-1', role: 'assistant', content: WELCOME_MSG }
	]);

	// Quick-action suggestions
	const suggestions = [
		'📊 Laporan armada saat ini',
		'🔴 Ada unit yang macet?',
		'🚛 Berapa unit yang moving?',
		'⚠️ Ada anomali perjalanan?',
	];

	let showSuggestions = $derived(
		messages.length === 1 && currentView === 'chat'
	);

	// ── Persistence ────────────────────────────────────────────────────
	onMount(() => {
		if (browser) {
			const saved = localStorage.getItem(STORAGE_KEY);
			if (saved) {
				try {
					const parsed = JSON.parse(saved);
					if (parsed.length > 1) {
						messages = parsed;
						currentView = 'menu';
					}
				} catch {}
			}
		}
	});

	$effect(() => {
		if (browser && messages.length > 1) {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
		}
	});

	$effect(() => {
		if (messages.length && chatContainer) {
			tick().then(() => {
				chatContainer.scrollTop = chatContainer.scrollHeight;
			});
		}
	});

	// ── Actions ────────────────────────────────────────────────────────
	function toggleChat() {
		isOpen = !isOpen;
		if (!isOpen) isExpanded = false;
	}

	function toggleExpand() {
		isExpanded = !isExpanded;
	}

	function startNewChat() {
		localStorage.removeItem(STORAGE_KEY);
		messages = [{ id: 'init-1', role: 'assistant', content: WELCOME_MSG }];
		currentView = 'chat';
	}

	function useSuggestion(text: string) {
		inputValue = text.replace(/^[^\s]+\s/, ''); // strip emoji prefix
		sendMessage();
	}

	async function sendMessage() {
		const text = inputValue.trim();
		if (!text || isLoading) return;

		messages = [...messages, { id: `user-${Date.now()}`, role: 'user', content: text }];
		inputValue = '';
		isLoading = true;

		const assistantId = `farida-${Date.now()}`;
		messages = [...messages, { id: assistantId, role: 'assistant', content: '' }];

		try {
			const response = await fetch('/api/fms-chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					messages: messages
						.filter(m => m.id !== assistantId)
						.map(m => ({ role: m.role, content: m.content }))
				})
			});

			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			if (!response.body) throw new Error('No response body');

			const reader = response.body.getReader();
			const decoder = new TextDecoder();

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				const chunk = decoder.decode(value, { stream: true });
				messages = messages.map(m =>
					m.id === assistantId ? { ...m, content: m.content + chunk } : m
				);
			}
		} catch (err) {
			messages = messages.map(m =>
				m.id === assistantId
					? { ...m, content: '⚠️ Gagal terhubung ke FARIDA. Pastikan AI Bridge dan go-map backend berjalan.' }
					: m
			);
			console.error('[FARIDA Chat]', err);
		} finally {
			isLoading = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			sendMessage();
		}
	}
</script>

{#if browser}
	<!-- ── FAB Button ─────────────────────────────────────────────── -->
	{#if !isOpen}
		<button
			class="farida-fab"
			onclick={toggleChat}
			aria-label="Buka FARIDA — Asisten Armada FMS"
		>
			<!-- Pulse ring animation -->
			<span class="farida-fab-ring"></span>
			<!-- Female assistant with mic SVG avatar -->
			<svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-11 h-11 relative z-10">
				<!-- Head -->
				<circle cx="28" cy="17" r="9" fill="#fcd34d" />
				<!-- Hair -->
				<path d="M19 17 Q19 8 28 8 Q37 8 37 17 Q37 13 34 12 Q30 10 28 11 Q23 10 22 13 Z" fill="#92400e"/>
				<!-- Hair strands flowing -->
				<path d="M19 17 Q17 22 19 27" stroke="#92400e" stroke-width="2.5" stroke-linecap="round" fill="none"/>
				<path d="M37 17 Q39 22 37 27" stroke="#92400e" stroke-width="2.5" stroke-linecap="round" fill="none"/>
				<!-- Neck -->
				<rect x="25" y="25" width="6" height="4" rx="2" fill="#fcd34d"/>
				<!-- Body / Blazer -->
				<path d="M16 44 Q16 32 22 30 L28 34 L34 30 Q40 32 40 44 Z" fill="#1d4ed8"/>
				<!-- Shirt collar -->
				<path d="M24 30 L28 34 L32 30 L30 28 L28 30 L26 28 Z" fill="white"/>
				<!-- Microphone -->
				<rect x="31" y="20" width="6" height="10" rx="3" fill="#374151"/>
				<path d="M31 28 Q31 34 37 34" stroke="#374151" stroke-width="1.5" stroke-linecap="round" fill="none"/>
				<line x1="34" y1="34" x2="34" y2="37" stroke="#374151" stroke-width="1.5" stroke-linecap="round"/>
				<line x1="32" y1="37" x2="36" y2="37" stroke="#374151" stroke-width="1.5" stroke-linecap="round"/>
				<!-- Mic glow -->
				<circle cx="34" cy="25" r="2" fill="#3b82f6" opacity="0.5"/>
				<!-- Earring -->
				<circle cx="19.5" cy="21" r="1.5" fill="#fbbf24"/>
				<circle cx="36.5" cy="21" r="1.5" fill="#fbbf24"/>
			</svg>
			<!-- Online indicator -->
			<span class="farida-online-dot"></span>
		</button>
	{/if}

	<!-- ── Chat Window ─────────────────────────────────────────────── -->
	{#if isOpen}
		{#if isExpanded}
			<div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-in fade-in duration-200"
				onclick={toggleExpand} aria-hidden="true"></div>
		{/if}

		<div class="farida-window {isExpanded ? 'farida-window-expanded' : 'farida-window-default'}">

			<!-- Header -->
			<div class="farida-header">
				<div class="flex items-center gap-3">
					<!-- Mini avatar in header -->
					<div class="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0 border border-white/20 overflow-hidden">
						<svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-10 h-10">
							<circle cx="28" cy="17" r="9" fill="#fcd34d"/>
							<path d="M19 17 Q19 8 28 8 Q37 8 37 17 Q37 13 34 12 Q30 10 28 11 Q23 10 22 13 Z" fill="#92400e"/>
							<path d="M19 17 Q17 22 19 27" stroke="#92400e" stroke-width="2.5" stroke-linecap="round" fill="none"/>
							<path d="M37 17 Q39 22 37 27" stroke="#92400e" stroke-width="2.5" stroke-linecap="round" fill="none"/>
							<rect x="25" y="25" width="6" height="4" rx="2" fill="#fcd34d"/>
							<path d="M16 44 Q16 32 22 30 L28 34 L34 30 Q40 32 40 44 Z" fill="#93c5fd"/>
							<path d="M24 30 L28 34 L32 30 L30 28 L28 30 L26 28 Z" fill="white"/>
							<rect x="31" y="20" width="6" height="10" rx="3" fill="#374151"/>
							<circle cx="19.5" cy="21" r="1.5" fill="#fbbf24"/>
							<circle cx="36.5" cy="21" r="1.5" fill="#fbbf24"/>
						</svg>
					</div>
					<div>
						<h3 class="font-extrabold text-sm tracking-wide text-white">FARIDA</h3>
						<div class="flex items-center gap-1.5 mt-0.5">
							<span class="w-1.5 h-1.5 rounded-full {isLoading ? 'bg-yellow-300 animate-pulse' : 'bg-emerald-400 animate-pulse'}"></span>
							<span class="text-[10px] font-medium text-white/75 uppercase tracking-wider">
								{isLoading ? 'Menganalisis armada...' : 'Fleet AI • Update 30s'}
							</span>
						</div>
					</div>
				</div>
				<div class="flex items-center gap-1">
					<button class="farida-header-btn" onclick={toggleExpand}
						aria-label={isExpanded ? 'Perkecil' : 'Perbesar'}>
						<span class="material-symbols-outlined text-base">{isExpanded ? 'close_fullscreen' : 'open_in_full'}</span>
					</button>
					<button class="farida-header-btn" onclick={toggleChat} aria-label="Tutup">
						<span class="material-symbols-outlined text-base">close</span>
					</button>
				</div>
			</div>

			<!-- Body: Menu / Chat -->
			{#if currentView === 'menu'}
				<!-- Resume/New chat screen -->
				<div class="flex-1 flex flex-col items-center justify-center p-8 gap-3 bg-surface-container-lowest">
					<div class="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-1 border border-blue-200 dark:border-blue-800">
						<span class="material-symbols-outlined text-3xl text-blue-600 dark:text-blue-400">history</span>
					</div>
					<h3 class="text-base font-bold text-on-surface">Riwayat Armada Tersimpan</h3>
					<p class="text-xs text-center text-on-surface-variant mb-4">Anda memiliki percakapan monitoring yang belum selesai. Lanjutkan?</p>
					<button class="w-full py-2.5 px-4 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
						onclick={() => currentView = 'chat'}>
						<span class="material-symbols-outlined text-base">chat</span> Lanjutkan Chat
					</button>
					<button class="w-full py-2.5 px-4 bg-surface-container text-on-surface-variant rounded-xl font-semibold text-sm hover:bg-surface-container-high transition-colors flex items-center justify-center gap-2 mt-1"
						onclick={startNewChat}>
						<span class="material-symbols-outlined text-base">refresh</span> Mulai Sesi Baru
					</button>
				</div>

			{:else}
				<!-- Chat Area -->
				<div bind:this={chatContainer}
					class="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-surface-container-lowest scroll-smooth">

					{#each messages as msg (msg.id)}
						{#if msg.role === 'assistant'}
							<div class="flex gap-2.5 max-w-[88%]">
								<!-- Mini avatar bubble -->
								<div class="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex-shrink-0 flex items-center justify-center mt-0.5 border border-blue-200 dark:border-blue-800 overflow-hidden">
									<svg viewBox="0 0 56 56" fill="none" class="w-7 h-7">
										<circle cx="28" cy="17" r="9" fill="#fcd34d"/>
										<path d="M19 17 Q19 8 28 8 Q37 8 37 17" fill="#92400e"/>
										<rect x="25" y="25" width="6" height="4" rx="2" fill="#fcd34d"/>
										<path d="M16 44 Q16 32 22 30 L28 34 L34 30 Q40 32 40 44 Z" fill="#1d4ed8"/>
									</svg>
								</div>
								<div class="bg-surface-container p-3 rounded-2xl rounded-tl-sm text-sm text-on-surface shadow-sm border border-outline-variant/20 leading-relaxed markdown-body">
									{#if msg.content === '' && isLoading}
										<div class="flex items-center gap-1.5 py-1">
											<span class="w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:0ms]"></span>
											<span class="w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:120ms]"></span>
											<span class="w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:240ms]"></span>
										</div>
									{:else}
										{@html marked.parse(msg.content)}
									{/if}
								</div>
							</div>
						{:else}
							<div class="flex gap-2.5 max-w-[88%] self-end flex-row-reverse">
								<div class="w-9 h-9 rounded-full bg-blue-600 flex-shrink-0 flex items-center justify-center mt-0.5">
									<span class="material-symbols-outlined text-xs text-white">person</span>
								</div>
								<div class="bg-blue-600 text-white p-3 rounded-2xl rounded-tr-sm text-sm shadow-sm leading-relaxed whitespace-pre-wrap">
									{msg.content}
								</div>
							</div>
						{/if}
					{/each}

					<!-- Quick suggestions (only at start) -->
					{#if showSuggestions}
						<div class="flex flex-wrap gap-1.5 pt-1">
							{#each suggestions as sug}
								<button
									class="text-[11px] px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-800/50 transition-colors font-medium"
									onclick={() => useSuggestion(sug)}
								>
									{sug}
								</button>
							{/each}
						</div>
					{/if}
				</div>

				<!-- Input Area -->
				<div class="p-3 border-t border-surface-container bg-surface-container-lowest">
					<div class="flex items-center gap-2 bg-surface-container-high rounded-full px-4 py-2 border border-outline-variant/20 shadow-inner">
						<input
							type="text"
							bind:value={inputValue}
							onkeydown={handleKeydown}
							placeholder="Tanya FARIDA tentang armada..."
							class="flex-1 bg-transparent text-sm text-on-surface focus:outline-none placeholder:text-on-surface-variant/60"
							disabled={isLoading}
						/>
						<button
							class="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
							onclick={sendMessage}
							disabled={!inputValue.trim() || isLoading}
						>
							{#if isLoading}
								<span class="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
							{:else}
								<span class="material-symbols-outlined text-[18px] ml-0.5">send</span>
							{/if}
						</button>
					</div>
					<p class="text-[10px] text-center text-on-surface-variant/50 mt-1.5 font-medium">
						FARIDA · GPS update setiap 30 detik · Data real-time
					</p>
				</div>
			{/if}
		</div>
	{/if}
{/if}

<style>
	/* ── FAB ──────────────────────────────────────────── */
	.farida-fab {
		position: fixed;
		bottom: 24px;
		right: 24px;
		width: 64px;
		height: 64px;
		border-radius: 50%;
		background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #3b82f6 100%);
		box-shadow: 0 4px 20px rgba(37, 99, 235, 0.45), 0 2px 8px rgba(0,0,0,0.2);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		border: none;
		z-index: 50;
		position: fixed; /* explicit: never override with relative */
		transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s ease;
	}
	.farida-fab:hover {
		transform: translateY(-4px) scale(1.08);
		box-shadow: 0 8px 28px rgba(37, 99, 235, 0.55), 0 4px 12px rgba(0,0,0,0.25);
	}
	.farida-fab-ring {
		position: absolute;
		inset: -4px;
		border-radius: 50%;
		border: 2px solid rgba(59, 130, 246, 0.4);
		animation: farida-pulse 2.5s ease-in-out infinite;
	}
	.farida-online-dot {
		position: absolute;
		top: 4px;
		right: 4px;
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: #10b981;
		border: 2px solid white;
		box-shadow: 0 0 6px rgba(16, 185, 129, 0.6);
	}
	@keyframes farida-pulse {
		0%, 100% { transform: scale(1); opacity: 0.6; }
		50%       { transform: scale(1.12); opacity: 0.2; }
	}

	/* ── Chat Window ──────────────────────────────────── */
	.farida-window {
		position: fixed;
		z-index: 50;
		background: var(--color-surface-container-lowest, #fff);
		box-shadow: 0 25px 60px rgba(0,0,0,0.2), 0 8px 24px rgba(0,0,0,0.12);
		display: flex;
		flex-direction: column;
		overflow: hidden;
		border: 1px solid rgba(100, 116, 139, 0.15);
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}
	.farida-window-default {
		bottom: 24px;
		right: 24px;
		width: min(calc(100vw - 3rem), 380px);
		height: min(620px, 82vh);
		border-radius: 24px;
	}
	.farida-window-expanded {
		inset: 16px;
		border-radius: 28px;
	}
	@media (min-width: 768px) {
		.farida-window-expanded {
			inset: 40px 15%;
		}
	}

	/* ── Header ───────────────────────────────────────── */
	.farida-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 14px 16px;
		background: linear-gradient(135deg, #1e40af 0%, #2563eb 60%, #3b82f6 100%);
		border-bottom: 1px solid rgba(255,255,255,0.1);
		flex-shrink: 0;
	}
	.farida-header-btn {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		background: transparent;
		border: none;
		cursor: pointer;
		transition: background 0.15s;
	}
	.farida-header-btn:hover {
		background: rgba(255,255,255,0.18);
	}

	/* ── Markdown ─────────────────────────────────────── */
	:global(.markdown-body p) { margin-bottom: 0.4rem; }
	:global(.markdown-body p:last-child) { margin-bottom: 0; }
	:global(.markdown-body strong) { font-weight: 700; }
	:global(.markdown-body ul) { list-style: disc; padding-left: 1.25rem; margin-bottom: 0.4rem; }
	:global(.markdown-body ol) { list-style: decimal; padding-left: 1.25rem; margin-bottom: 0.4rem; }
	:global(.markdown-body table) {
		width: 100%; border-collapse: collapse;
		margin: 0.6rem 0; font-size: 0.8rem;
	}
	:global(.markdown-body th),
	:global(.markdown-body td) {
		border: 1px solid rgba(150,150,150,0.25);
		padding: 0.35rem 0.5rem; text-align: left;
	}
	:global(.markdown-body th) {
		background: rgba(37, 99, 235, 0.08);
		font-weight: 700;
	}
</style>
