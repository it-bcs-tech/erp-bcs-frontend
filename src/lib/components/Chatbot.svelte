<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { browser } from '$app/environment';
	import { marked } from 'marked';

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

	const CHAT_STORAGE_KEY = 'bcs_chat_history';

	let messages = $state<Message[]>([
		{
			id: 'init-1',
			role: 'assistant',
			content: 'Halo! Saya AI Assistant BCS Logistics Anda. Apa yang dapat saya bantu hari ini?'
		}
	]);

	onMount(() => {
		if (browser) {
			const saved = localStorage.getItem(CHAT_STORAGE_KEY);
			if (saved) {
				try {
					const parsed = JSON.parse(saved);
					if (parsed.length > 1) { // Hanya munculkan menu jika ada riwayat obrolan user
						messages = parsed;
						currentView = 'menu';
					}
				} catch (e) {
					console.error('Gagal memuat riwayat chat', e);
				}
			}
		}
	});

	function startNewChat() {
		localStorage.removeItem(CHAT_STORAGE_KEY);
		messages = [
			{
				id: 'init-1',
				role: 'assistant',
				content: 'Halo! Saya AI Assistant BCS Logistics Anda. Apa yang dapat saya bantu hari ini?'
			}
		];
		currentView = 'chat';
	}

	// Simpan secara otomatis ke browser setiap kali messages berubah
	$effect(() => {
		if (browser && messages.length > 1) { 
			localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
		}
	});

	// Auto-scroll ke bawah saat percakapan bertambah
	$effect(() => {
		if (messages.length && chatContainer) {
			tick().then(() => {
				chatContainer.scrollTop = chatContainer.scrollHeight;
			});
		}
	});

	function toggleChat() {
		isOpen = !isOpen;
		if (!isOpen) isExpanded = false; // reset expand when closed
	}

	function toggleExpand() {
		isExpanded = !isExpanded;
	}

	async function sendMessage() {
		const text = inputValue.trim();
		if (!text || isLoading) return;

		// Tambahkan pesan user ke UI
		messages = [...messages, { id: `user-${Date.now()}`, role: 'user', content: text }];
		inputValue = '';
		isLoading = true;

		// Tambahkan placeholder untuk respons AI (streaming effect)
		const assistantId = `ai-${Date.now()}`;
		messages = [...messages, { id: assistantId, role: 'assistant', content: '' }];

		try {
			// Kirim ke endpoint SvelteKit yang meneruskan ke Openclaw
			const response = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					messages: messages
						.filter(m => m.id !== assistantId)
						.map(m => ({ role: m.role, content: m.content }))
				})
			});

			if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
			if (!response.body) throw new Error('No response body');

			// Baca streaming response sebagai plain text
			const reader = response.body.getReader();
			const decoder = new TextDecoder();

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				// Setiap chunk langsung berisi teks dari AI (plain text stream)
				const chunk = decoder.decode(value, { stream: true });

				// Tambahkan chunk ke pesan AI yang sedang aktif
				messages = messages.map(m =>
					m.id === assistantId
						? { ...m, content: m.content + chunk }
						: m
				);
			}
		} catch (err) {
			// Tampilkan pesan error yang informatif
			messages = messages.map(m =>
				m.id === assistantId
					? { ...m, content: `⚠️ Gagal terhubung ke server AI. Pastikan konfigurasi Openclaw sudah diatur dengan benar di file .env.` }
					: m
			);
			console.error('[Chatbot] Error:', err);
		} finally {
			isLoading = false;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			sendMessage();
		}
	}
</script>

<!-- Hanya render di browser, bukan di server -->
{#if browser}
	<!-- Floating Action Button -->
	{#if !isOpen}
		<button
			class="fixed bottom-6 right-6 w-16 h-16 bg-primary text-on-primary rounded-full shadow-lg flex items-center justify-center hover:scale-105 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 z-50"
			onclick={toggleChat}
			aria-label="Buka HARIS — Asisten HRIS"
		>
			<!-- Inner wrapper for relative positioning -->
			<div class="relative w-full h-full flex items-center justify-center">
				<!-- Pulse ring -->
				<span class="haris-fab-ring"></span>
				<!-- Female assistant SVG avatar (HARIS) -->
				<svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-11 h-11">
					<!-- Head -->
					<circle cx="28" cy="17" r="9" fill="#fde68a" />
					<!-- Hair -->
					<path d="M19 17 Q19 8 28 8 Q37 8 37 17 Q37 13 34 12 Q30 10 28 11 Q23 10 22 13 Z" fill="#1f2937"/>
					<path d="M19 17 Q17 22 19 27" stroke="#1f2937" stroke-width="2.5" stroke-linecap="round" fill="none"/>
					<path d="M37 17 Q39 22 37 27" stroke="#1f2937" stroke-width="2.5" stroke-linecap="round" fill="none"/>
					<!-- Neck -->
					<rect x="25" y="25" width="6" height="4" rx="2" fill="#fde68a"/>
					<!-- Body / Blazer -->
					<path d="M16 44 Q16 32 22 30 L28 34 L34 30 Q40 32 40 44 Z" fill="#7c3aed"/>
					<!-- Shirt -->
					<path d="M24 30 L28 34 L32 30 L30 28 L28 30 L26 28 Z" fill="white"/>
					<!-- Microphone -->
					<rect x="31" y="20" width="6" height="10" rx="3" fill="#374151"/>
					<path d="M31 28 Q31 34 37 34" stroke="#374151" stroke-width="1.5" stroke-linecap="round" fill="none"/>
					<line x1="34" y1="34" x2="34" y2="37" stroke="#374151" stroke-width="1.5" stroke-linecap="round"/>
					<line x1="32" y1="37" x2="36" y2="37" stroke="#374151" stroke-width="1.5" stroke-linecap="round"/>
					<circle cx="34" cy="25" r="2" fill="#7c3aed" opacity="0.6"/>
					<!-- Earrings -->
					<circle cx="19.5" cy="21" r="1.5" fill="#a78bfa"/>
					<circle cx="36.5" cy="21" r="1.5" fill="#a78bfa"/>
				</svg>
				<!-- Online dot -->
				<span class="haris-online-dot"></span>
			</div>
		</button>
	{/if}

	<!-- Chat Window -->
	{#if isOpen}
		<!-- Overlay for expanded mode -->
		{#if isExpanded}
			<div class="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-in fade-in duration-300" onclick={toggleExpand} aria-hidden="true"></div>
		{/if}

		<div class="fixed z-50 bg-surface-container-lowest shadow-2xl flex flex-col overflow-hidden border border-outline-variant/30 transition-all duration-300 {isExpanded ? 'inset-4 md:inset-10 lg:inset-x-[15%] lg:inset-y-12 rounded-[32px]' : 'bottom-6 right-6 w-[calc(100%-3rem)] max-w-[380px] h-[600px] max-h-[80vh] rounded-[24px]'}">

			<!-- Header -->
			<div class="bg-primary p-4 flex items-center justify-between text-on-primary shadow-sm">
				<div class="flex items-center gap-3">
					<!-- Mini avatar in header -->
					<div class="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0 border border-white/20 overflow-hidden">
						<svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-10 h-10">
							<circle cx="28" cy="17" r="9" fill="#fde68a"/>
							<path d="M19 17 Q19 8 28 8 Q37 8 37 17" fill="#1f2937"/>
							<path d="M19 17 Q17 22 19 27" stroke="#1f2937" stroke-width="2.5" stroke-linecap="round" fill="none"/>
							<path d="M37 17 Q39 22 37 27" stroke="#1f2937" stroke-width="2.5" stroke-linecap="round" fill="none"/>
							<rect x="25" y="25" width="6" height="4" rx="2" fill="#fde68a"/>
							<path d="M16 44 Q16 32 22 30 L28 34 L34 30 Q40 32 40 44 Z" fill="#c4b5fd"/>
							<path d="M24 30 L28 34 L32 30 L30 28 L28 30 L26 28 Z" fill="white"/>
							<rect x="31" y="20" width="6" height="10" rx="3" fill="#374151"/>
							<circle cx="19.5" cy="21" r="1.5" fill="#a78bfa"/>
							<circle cx="36.5" cy="21" r="1.5" fill="#a78bfa"/>
						</svg>
					</div>
					<div>
						<h3 class="font-extrabold text-sm tracking-wide">HRIS AI Assistant</h3>
						<div class="flex items-center gap-1.5 mt-0.5">
							<span class="w-2 h-2 rounded-full {isLoading ? 'bg-yellow-400 animate-pulse' : 'bg-green-400 animate-pulse'}"></span>
							<span class="text-[10px] font-medium text-white/80 uppercase tracking-wider">
								{isLoading ? 'Berpikir...' : 'Powered by Groq ⚡'}
							</span>
						</div>
					</div>
				</div>
				<div class="flex items-center gap-1">
					<button class="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors" onclick={toggleExpand} aria-label={isExpanded ? "Perkecil chat" : "Perbesar chat"}>
						<span class="material-symbols-outlined text-lg">{isExpanded ? 'close_fullscreen' : 'open_in_full'}</span>
					</button>
					<button class="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors" onclick={toggleChat} aria-label="Tutup chat">
						<span class="material-symbols-outlined text-lg">close</span>
					</button>
				</div>
			</div>

			<!-- Conditional Area: Menu atau Chat -->
			{#if currentView === 'menu'}
				<div class="flex-1 flex flex-col items-center justify-center p-8 gap-3 bg-surface-container-lowest animate-in fade-in duration-300">
					<div class="w-16 h-16 rounded-full bg-primary-container flex items-center justify-center text-primary mb-2 border border-primary/20 shadow-sm">
						<span class="material-symbols-outlined text-3xl">history</span>
					</div>
					<h3 class="text-lg font-bold text-on-surface">Riwayat Tersimpan</h3>
					<p class="text-sm text-center text-on-surface-variant mb-6">Anda memiliki obrolan yang belum selesai. Ingin melanjutkannya?</p>
					
					<button class="w-full py-3 px-4 bg-primary text-on-primary rounded-2xl font-semibold shadow-md hover:bg-primary/90 hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95" onclick={() => currentView = 'chat'}>
						<span class="material-symbols-outlined text-sm">chat</span> Lanjutkan Chat
					</button>
					
					<button class="w-full py-3 px-4 bg-error-container text-on-error-container rounded-2xl font-semibold shadow-sm hover:bg-error-container/80 transition-all flex items-center justify-center gap-2 mt-2 active:scale-95" onclick={startNewChat}>
						<span class="material-symbols-outlined text-sm">delete</span> Hapus & Mulai Baru
					</button>
				</div>
			{:else}
				<!-- Chat Area -->
				<div bind:this={chatContainer} class="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-surface-container-lowest scroll-smooth">
					{#each messages as msg (msg.id)}
						{#if msg.role === 'assistant'}
							<div class="flex gap-3 max-w-[85%]">
								<div class="w-9 h-9 rounded-full bg-primary-container flex-shrink-0 flex items-center justify-center mt-1 border border-primary/10 overflow-hidden">
									<svg viewBox="0 0 56 56" fill="none" class="w-7 h-7">
										<circle cx="28" cy="17" r="9" fill="#fde68a"/>
										<path d="M19 17 Q19 8 28 8 Q37 8 37 17" fill="#1f2937"/>
										<rect x="25" y="25" width="6" height="4" rx="2" fill="#fde68a"/>
										<path d="M16 44 Q16 32 22 30 L28 34 L34 30 Q40 32 40 44 Z" fill="#7c3aed"/>
									</svg>
								</div>
								<div class="bg-surface-container-low p-3 rounded-2xl rounded-tl-sm text-sm text-on-surface shadow-sm border border-outline-variant/20 leading-relaxed markdown-body">
									{#if msg.content === '' && isLoading}
										<!-- Typing indicator -->
										<div class="flex items-center gap-1.5 py-1">
											<span class="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:0ms]"></span>
											<span class="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:150ms]"></span>
											<span class="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:300ms]"></span>
										</div>
									{:else}
										{@html marked.parse(msg.content)}
									{/if}
								</div>
							</div>
						{:else}
							<div class="flex gap-3 max-w-[85%] self-end flex-row-reverse">
								<div class="w-8 h-8 rounded-full bg-tertiary-container flex-shrink-0 flex items-center justify-center text-tertiary mt-1 border border-tertiary/10">
									<span class="material-symbols-outlined text-sm">person</span>
								</div>
								<div class="bg-primary text-on-primary p-3 rounded-2xl rounded-tr-sm text-sm shadow-sm leading-relaxed whitespace-pre-wrap">
									{msg.content}
								</div>
							</div>
						{/if}
					{/each}
				</div>

				<!-- Input Area -->
				<div class="p-4 bg-surface-container-lowest border-t border-surface-container">
					<div class="flex items-center gap-2 bg-surface-container-high rounded-full p-1.5 shadow-inner border border-outline-variant/20">
						<input
							type="text"
							bind:value={inputValue}
							onkeydown={handleKeydown}
							placeholder="Tanyakan tentang karyawan, kehadiran..."
							class="flex-1 bg-transparent px-4 py-2 text-sm text-on-surface focus:outline-none placeholder:text-on-surface-variant/60"
							disabled={isLoading}
						/>
						<button
							class="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center flex-shrink-0 hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
							onclick={sendMessage}
							disabled={!inputValue.trim() || isLoading}
						>
							{#if isLoading}
								<span class="w-4 h-4 rounded-full border-2 border-on-primary border-t-transparent animate-spin"></span>
							{:else}
								<span class="material-symbols-outlined text-[20px] ml-0.5">send</span>
							{/if}
						</button>
					</div>
					<p class="text-[10px] text-center text-on-surface-variant/50 mt-2 font-medium">AI dapat membuat kesalahan. Verifikasi data penting.</p>
				</div>
			{/if}
		</div>
	{/if}
{/if}

<style>
	/* Custom Markdown Styling untuk Elemen AI */
	:global(.markdown-body table) {
		width: 100%;
		border-collapse: collapse;
		margin-top: 0.75rem;
		margin-bottom: 0.75rem;
		font-size: 0.85rem;
	}
	:global(.markdown-body th), :global(.markdown-body td) {
		border: 1px solid rgba(150, 150, 150, 0.3);
		padding: 0.5rem;
		text-align: left;
	}
	:global(.markdown-body th) {
		background-color: rgba(150, 150, 150, 0.1);
		font-weight: 600;
	}
	:global(.markdown-body p) {
		margin-bottom: 0.5rem;
	}
	:global(.markdown-body p:last-child) {
		margin-bottom: 0;
	}
	:global(.markdown-body ul) {
		list-style-type: disc;
		padding-left: 1.5rem;
		margin-bottom: 0.5rem;
	}
	:global(.markdown-body ol) {
		list-style-type: decimal;
		padding-left: 1.5rem;
		margin-bottom: 0.5rem;
	}
	:global(.markdown-body strong) {
		font-weight: 600;
	}

	/* ── HARIS FAB avatar decorations ────────────────────── */
	:global(.haris-fab-ring) {
		position: absolute;
		inset: -4px;
		border-radius: 50%;
		border: 2px solid rgba(var(--color-primary-rgb, 103, 80, 164), 0.35);
		animation: haris-pulse 2.5s ease-in-out infinite;
		pointer-events: none;
	}
	:global(.haris-online-dot) {
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
	@keyframes haris-pulse {
		0%, 100% { transform: scale(1); opacity: 0.5; }
		50%       { transform: scale(1.1); opacity: 0.15; }
	}
</style>

