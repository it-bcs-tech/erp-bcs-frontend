<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { browser } from '$app/environment';
	import { marked } from 'marked';
	import DOMPurify from 'isomorphic-dompurify';

	let isOpen = $state(false);
	let isExpanded = $state(false);
	let currentView = $state<'menu' | 'chat'>('chat');
	let chatContainer = $state<HTMLElement | null>(null);
	let inputValue = $state('');
	let isLoading = $state(false);

	interface Message {
		id: string;
		role: 'user' | 'assistant';
		content: string;
	}

	const CHAT_STORAGE_KEY = 'maris_maintenance_chat_history';

	const WELCOME_MESSAGE = 
		'Halo! Saya **MARIS** (*Maintenance & Auto Repair Intelligence System*), asisten AI teknis & analitis bengkel armada PT BCS Logistics.\n\n' +
		'Saya dapat membantu Anda memantau **SPK (Work Orders)** aktif, **riwayat servis truk**, **kondisi ketebalan ban**, pengeluaran **spareparts**, hingga analisis data bengkel mendalam. Ada yang perlu saya bantu? 🛠️';

	let messages = $state<Message[]>([
		{
			id: 'init-1',
			role: 'assistant',
			content: WELCOME_MESSAGE
		}
	]);

	const suggestions = [
		'🛠️ Ringkasan bengkel & SPK aktif',
		'🛞 Analisis ban kritis (≤ 3mm)',
		'🚛 Truk paling sering masuk bengkel',
		'📦 Pengeluaran suku cadang / spareparts',
	];

	let showSuggestions = $derived(
		messages.length === 1 && currentView === 'chat'
	);

	onMount(() => {
		if (browser) {
			const saved = localStorage.getItem(CHAT_STORAGE_KEY);
			if (saved) {
				try {
					const parsed = JSON.parse(saved);
					if (parsed.length > 1) {
						messages = parsed;
						currentView = 'menu';
					}
				} catch (e) {
					console.error('Gagal memuat riwayat MARIS chat', e);
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
				content: WELCOME_MESSAGE
			}
		];
		currentView = 'chat';
	}

	$effect(() => {
		if (browser && messages.length > 1) {
			localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
		}
	});

	$effect(() => {
		if (messages.length && chatContainer) {
			tick().then(() => {
				chatContainer.scrollTop = chatContainer.scrollHeight;
			});
		}
	});

	function toggleChat() {
		isOpen = !isOpen;
		if (!isOpen) isExpanded = false;
	}

	function toggleExpand() {
		isExpanded = !isExpanded;
	}

	function applySuggestion(text: string) {
		inputValue = text.replace(/^[^\w\s]+/, '').trim();
		sendMessage();
	}

	async function sendMessage() {
		const text = inputValue.trim();
		if (!text || isLoading) return;

		messages = [...messages, { id: `user-${Date.now()}`, role: 'user', content: text }];
		inputValue = '';
		isLoading = true;

		const assistantId = `ai-${Date.now()}`;
		messages = [...messages, { id: assistantId, role: 'assistant', content: '' }];

		try {
			const response = await fetch('/api/maintenance-chat', {
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

			const reader = response.body.getReader();
			const decoder = new TextDecoder();

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				const chunk = decoder.decode(value, { stream: true });
				messages = messages.map(m =>
					m.id === assistantId
						? { ...m, content: m.content + chunk }
						: m
				);
			}
		} catch (err) {
			messages = messages.map(m =>
				m.id === assistantId
					? { ...m, content: '⚠️ Gagal terhubung ke MARIS AI Assistant. Pastikan service AI Bridge berjalan.' }
					: m
			);
			console.error('[MarisChat] Error:', err);
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

	function copyToClipboard(content: string) {
		if (browser && navigator.clipboard) {
			navigator.clipboard.writeText(content);
		}
	}
</script>

{#if browser}
	<!-- Floating Action Button -->
	{#if !isOpen}
		<button
			class="maris-fab"
			onclick={toggleChat}
			aria-label="Buka MARIS — Asisten Bengkel"
		>
			<span class="maris-fab-ring"></span>
			<!-- Wrench & Workshop Assistant SVG Avatar -->
			<div class="relative z-10 w-11 h-11 flex items-center justify-center rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 text-white shadow-lg">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6">
					<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
				</svg>
			</div>
			<!-- Online dot -->
			<span class="maris-online-dot"></span>
		</button>
	{/if}

	<!-- Chat Window -->
	{#if isOpen}
		{#if isExpanded}
			<div class="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-in fade-in duration-300" onclick={toggleExpand} aria-hidden="true"></div>
		{/if}

		<div class="fixed z-50 bg-surface-container-lowest shadow-2xl flex flex-col overflow-hidden border border-outline-variant/30 transition-all duration-300 {isExpanded ? 'inset-4 md:inset-10 lg:inset-x-[15%] lg:inset-y-12 rounded-[32px]' : 'bottom-6 right-6 w-[calc(100%-3rem)] max-w-[400px] h-[620px] max-h-[82vh] rounded-[24px]'}">

			<!-- Header -->
			<div class="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 p-4 flex items-center justify-between text-white shadow-sm">
				<div class="flex items-center gap-3">
					<div class="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 border border-white/30 overflow-hidden shadow-inner">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6">
							<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
						</svg>
					</div>
					<div>
						<h3 class="font-extrabold text-sm tracking-wide flex items-center gap-1.5">
							MARIS Assistant
							<span class="text-[9px] bg-black/20 px-1.5 py-0.5 rounded font-mono font-semibold">BENGKEL</span>
						</h3>
						<div class="flex items-center gap-1.5 mt-0.5">
							<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
							<p class="text-[11px] text-amber-100 font-medium">PostgreSQL Live & Analytical AI</p>
						</div>
					</div>
				</div>

				<div class="flex items-center gap-1">
					<button
						onclick={toggleExpand}
						class="p-1.5 hover:bg-white/15 rounded-lg transition-colors text-white"
						title={isExpanded ? 'Kecilkan' : 'Perbesar'}
						aria-label={isExpanded ? 'Kecilkan' : 'Perbesar'}
					>
						<span class="material-symbols-outlined text-[20px]">
							{isExpanded ? 'close_fullscreen' : 'open_in_full'}
						</span>
					</button>

					<button
						onclick={toggleChat}
						class="p-1.5 hover:bg-white/15 rounded-lg transition-colors text-white"
						title="Tutup Obrolan"
						aria-label="Tutup Obrolan"
					>
						<span class="material-symbols-outlined text-[20px]">expand_more</span>
					</button>
				</div>
			</div>

			<!-- Main View Area -->
			{#if currentView === 'menu'}
				<div class="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center text-center bg-surface-container-lowest">
					<div class="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-4 border border-amber-500/20 shadow-sm">
						<span class="material-symbols-outlined text-[32px]">build_circle</span>
					</div>
					<h4 class="text-base font-bold text-on-surface mb-1">MARIS Workshop AI</h4>
					<p class="text-xs text-on-surface-variant max-w-[280px] mb-6">
						Asisten cerdas perawatan armada, analisis ketebalan ban, suku cadang, dan SPK bengkel.
					</p>

					<div class="w-full space-y-2.5 max-w-[280px]">
						<button
							onclick={() => currentView = 'chat'}
							class="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
						>
							<span class="material-symbols-outlined text-[18px]">forum</span>
							Lanjutkan Obrolan
						</button>

						<button
							onclick={startNewChat}
							class="w-full py-2.5 px-4 bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-xs rounded-xl border border-outline-variant/30 transition-all flex items-center justify-center gap-2"
						>
							<span class="material-symbols-outlined text-[18px]">refresh</span>
							Mulai Obrolan Baru
						</button>
					</div>
				</div>
			{:else}
				<!-- Messages Container -->
				<div
					bind:this={chatContainer}
					class="flex-1 overflow-y-auto p-4 space-y-4 bg-surface-container-lowest/50"
				>
					{#each messages as msg (msg.id)}
						<div class="flex flex-col {msg.role === 'user' ? 'items-end' : 'items-start'}">
							<div class="flex items-start gap-2 max-w-[92%] {msg.role === 'user' ? 'flex-row-reverse' : ''}">
								{#if msg.role === 'assistant'}
									<div class="w-7 h-7 rounded-full bg-amber-500/20 text-amber-700 flex items-center justify-center flex-shrink-0 mt-0.5 border border-amber-500/30">
										<span class="material-symbols-outlined text-[16px]">build</span>
									</div>
								{/if}

								<div class="group relative rounded-2xl p-3.5 text-xs leading-relaxed {msg.role === 'user' ? 'bg-amber-600 text-white rounded-br-xs shadow-sm' : 'bg-surface-container-high text-on-surface rounded-bl-xs border border-outline-variant/20 shadow-xs'}">
									{#if msg.role === 'assistant'}
										{#if msg.content}
											<div class="prose prose-xs dark:prose-invert max-w-none break-words overflow-x-auto text-[12px] leading-relaxed">
												{@html DOMPurify.sanitize(marked.parse(msg.content) as string)}
											</div>
											<button
												onclick={() => copyToClipboard(msg.content)}
												class="opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-3 right-2 bg-surface-container border border-outline-variant/40 rounded px-1.5 py-0.5 text-[10px] text-on-surface-variant hover:text-on-surface flex items-center gap-1 shadow-sm"
												title="Salin jawaban"
											>
												<span class="material-symbols-outlined text-[12px]">content_copy</span>
												Salin
											</button>
										{:else}
											<div class="flex items-center gap-2 py-1 text-on-surface-variant">
												<span class="w-2 h-2 rounded-full bg-amber-500 animate-bounce"></span>
												<span class="w-2 h-2 rounded-full bg-amber-500 animate-bounce [animation-delay:0.2s]"></span>
												<span class="w-2 h-2 rounded-full bg-amber-500 animate-bounce [animation-delay:0.4s]"></span>
												<span class="text-[11px] text-amber-700 font-medium ml-1">MARIS sedang menganalisis data...</span>
											</div>
										{/if}
									{:else}
										<p class="whitespace-pre-wrap">{msg.content}</p>
									{/if}
								</div>
							</div>
						</div>
					{/each}

					<!-- Quick action suggestion chips -->
					{#if showSuggestions}
						<div class="pt-2 pb-1 space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
							<p class="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/70 px-1">Pertanyaan Cepat:</p>
							<div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
								{#each suggestions as s}
									<button
										type="button"
										onclick={() => applySuggestion(s)}
										class="text-left text-[11px] p-2 rounded-xl bg-surface-container hover:bg-amber-500/10 hover:border-amber-500/30 border border-outline-variant/20 text-on-surface transition-all flex items-center gap-1.5"
									>
										<span>{s}</span>
									</button>
								{/each}
							</div>
						</div>
					{/if}
				</div>

				<!-- Chat Input -->
				<div class="p-3 bg-surface-container-lowest border-t border-outline-variant/20">
					<div class="flex items-end gap-2 bg-surface-container-low rounded-2xl border border-outline-variant/30 p-1.5 focus-within:border-amber-500/60 focus-within:ring-2 focus-within:ring-amber-500/20 transition-all">
						<textarea
							bind:value={inputValue}
							onkeydown={handleKeydown}
							placeholder="Tanyakan SPK, ban, kerusakan armada, atau analisa sparepart..."
							rows="1"
							class="flex-1 bg-transparent border-0 text-xs text-on-surface placeholder:text-on-surface-variant/60 focus:ring-0 resize-none py-1.5 px-2 max-h-24"
							disabled={isLoading}
						></textarea>

						<button
							onclick={sendMessage}
							disabled={!inputValue.trim() || isLoading}
							class="w-8 h-8 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center flex-shrink-0 transition-all shadow-xs"
							aria-label="Kirim Pesan"
						>
							<span class="material-symbols-outlined text-[18px]">
								{isLoading ? 'hourglass_top' : 'arrow_upward'}
							</span>
						</button>
					</div>

					<div class="flex items-center justify-between px-1 mt-1.5 text-[10px] text-on-surface-variant/60">
						<button
							onclick={() => currentView = 'menu'}
							class="hover:text-on-surface transition-colors flex items-center gap-0.5"
						>
							<span class="material-symbols-outlined text-[12px]">history</span>
							Riwayat Obrolan
						</button>
						<span>Didukung Live Analytical AI PT BCS</span>
					</div>
				</div>
			{/if}
		</div>
	{/if}
{/if}

<style>
	.maris-fab {
		position: fixed;
		bottom: 1.5rem;
		right: 1.5rem;
		z-index: 40;
		width: 3.5rem;
		height: 3.5rem;
		border-radius: 9999px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		border: none;
		background: transparent;
		transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.maris-fab:hover {
		transform: scale(1.08);
	}

	.maris-fab-ring {
		position: absolute;
		inset: -3px;
		border-radius: 9999px;
		background: linear-gradient(135deg, #d97706, #f59e0b);
		opacity: 0.75;
		animation: pulse-ring 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}

	.maris-online-dot {
		position: absolute;
		top: 3px;
		right: 3px;
		z-index: 20;
		width: 0.75rem;
		height: 0.75rem;
		border-radius: 9999px;
		background-color: #10b981;
		border: 2px solid white;
	}

	@keyframes pulse-ring {
		0%, 100% {
			transform: scale(1);
			opacity: 0.7;
		}
		50% {
			transform: scale(1.1);
			opacity: 0.25;
		}
	}
</style>
