<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { browser } from '$app/environment';
	import { marked } from 'marked';
	import DOMPurify from 'isomorphic-dompurify';

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

	const CHAT_STORAGE_KEY = 'dms_chat_history';

	let messages = $state<Message[]>([
		{
			id: 'init-1',
			role: 'assistant',
			content: 'Halo! Saya **DIMAS** *(Document Intelligence & Management Archival System)*. Saya siap membantu Anda mencari dokumen legalitas armada (STNK, KIR, BPKB), SIM driver, sertifikat tanah, akta notaris, serta memonitor dokumen yang akan jatuh tempo. Ada yang bisa saya bantu?'
		}
	]);

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
					console.error('Gagal memuat riwayat chat DMS', e);
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
				content: 'Halo! Saya **DIMAS** *(Document Intelligence & Management Archival System)*. Saya siap membantu Anda mencari dokumen legalitas armada (STNK, KIR, BPKB), SIM driver, sertifikat tanah, akta notaris, serta memonitor dokumen yang akan jatuh tempo. Ada yang bisa saya bantu?'
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

	async function sendQuery(text: string) {
		inputValue = text;
		await sendMessage();
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
			const response = await fetch('/api/dms-chat', {
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
					? { ...m, content: `⚠️ Gagal terhubung ke DIMAS AI. Pastikan AI Bridge sedang aktif.` }
					: m
			);
			console.error('[DimasChat] Error:', err);
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

{#if browser}
	<!-- Floating Action Button -->
	{#if !isOpen}
		<button
			class="dimas-fab"
			onclick={toggleChat}
			aria-label="Buka DIMAS — Asisten DMS"
		>
			<span class="dimas-fab-ring"></span>
			<div class="w-12 h-12 rounded-full bg-emerald-600 flex items-center justify-center text-white shadow-lg relative z-10">
				<span class="material-symbols-outlined text-2xl">folder_managed</span>
			</div>
			<span class="dimas-online-dot"></span>
		</button>
	{/if}

	<!-- Chat Window -->
	{#if isOpen}
		{#if isExpanded}
			<div class="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-in fade-in duration-300" onclick={toggleExpand} aria-hidden="true"></div>
		{/if}

		<div class="fixed z-50 bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 transition-all duration-300 {isExpanded ? 'inset-4 md:inset-10 lg:inset-x-[15%] lg:inset-y-12 rounded-[32px]' : 'bottom-6 right-6 w-[calc(100%-3rem)] max-w-[390px] h-[620px] max-h-[82vh] rounded-[24px]'}">

			<!-- Header -->
			<div class="bg-gradient-to-r from-emerald-700 to-teal-800 p-4 flex items-center justify-between text-white shadow-sm">
				<div class="flex items-center gap-3">
					<div class="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center border border-white/30">
						<span class="material-symbols-outlined text-2xl">description</span>
					</div>
					<div>
						<div class="flex items-center gap-1.5">
							<h3 class="font-extrabold text-sm tracking-wide">DIMAS AI</h3>
							<span class="text-[10px] bg-emerald-500/30 border border-emerald-400/40 text-emerald-100 px-1.5 py-0.2 rounded font-semibold">DMS</span>
						</div>
						<div class="flex items-center gap-1.5 mt-0.5">
							<span class="w-2 h-2 rounded-full {isLoading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-300 animate-pulse'}"></span>
							<span class="text-[10px] font-medium text-emerald-100 uppercase tracking-wider">
								{isLoading ? 'Menganalisis Dokumen...' : 'Archival Intelligence ⚡'}
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

			<!-- Menu View (Jika riwayat obrolan ada) -->
			{#if currentView === 'menu'}
				<div class="flex-1 flex flex-col items-center justify-center p-8 gap-3 bg-slate-50 dark:bg-slate-900 animate-in fade-in duration-300">
					<div class="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-700 dark:text-emerald-400 mb-2 border border-emerald-200 dark:border-emerald-800 shadow-sm">
						<span class="material-symbols-outlined text-3xl">history_edu</span>
					</div>
					<h3 class="text-lg font-bold text-slate-800 dark:text-white">Riwayat Arsip Tersimpan</h3>
					<p class="text-sm text-center text-slate-600 dark:text-slate-400 mb-6">Anda memiliki percakapan pencarian dokumen sebelumnya. Ingin melanjutkannya?</p>
					
					<button class="w-full py-3 px-4 bg-emerald-600 text-white rounded-2xl font-semibold shadow-md hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 active:scale-95" onclick={() => currentView = 'chat'}>
						<span class="material-symbols-outlined text-sm">chat</span> Lanjutkan Obrolan
					</button>
					<button class="w-full py-3 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2 active:scale-95" onclick={startNewChat}>
						<span class="material-symbols-outlined text-sm">restart_alt</span> Percakapan Baru
					</button>
				</div>
			{:else}
				<!-- Chat Area -->
				<div bind:this={chatContainer} class="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/60 dark:bg-slate-900/60 text-slate-800 dark:text-slate-200">
					{#each messages as msg (msg.id)}
						<div class="flex gap-2.5 {msg.role === 'user' ? 'justify-end' : 'justify-start'}">
							{#if msg.role === 'assistant'}
								<div class="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white flex-shrink-0 text-xs font-bold shadow-sm">
									D
								</div>
							{/if}
							
							<div class="max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-sm {msg.role === 'user' ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-tl-none'}">
								{#if msg.role === 'assistant'}
									<div class="prose prose-xs max-w-none dark:prose-invert">
										{@html DOMPurify.sanitize(marked.parse(msg.content) as string)}
									</div>
								{:else}
									<p class="whitespace-pre-wrap">{msg.content}</p>
								{/if}
							</div>
						</div>
					{/each}

					{#if isLoading && messages[messages.length - 1]?.role !== 'assistant'}
						<div class="flex gap-2.5 justify-start items-center">
							<div class="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white flex-shrink-0 text-xs font-bold shadow-sm">
								D
							</div>
							<div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-none px-4 py-3 text-xs flex items-center gap-2 text-slate-500">
								<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce"></span>
								<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.2s]"></span>
								<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.4s]"></span>
								<span class="text-[11px] font-medium ml-1">Mencari di 5.800+ dokumen arsip...</span>
							</div>
						</div>
					{/if}
				</div>

				<!-- Quick Chips (Jika baru 1 pesan) -->
				{#if messages.length === 1}
					<div class="p-3 bg-white dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-1.5">
						<button 
							class="text-[11px] px-2.5 py-1 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900 rounded-full hover:bg-red-100 transition-colors flex items-center gap-1"
							onclick={() => sendQuery("Tolong tampilkan dokumen yang akan jatuh tempo dalam 30 hari ke depan")}
						>
							<span class="w-1.5 h-1.5 rounded-full bg-red-500"></span>
							Jatuh Tempo &lt; 30 Hari
						</button>
						<button 
							class="text-[11px] px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
							onclick={() => sendQuery("Berapa ringkasan statistik total berkas dokumen yang tersimpan saat ini?")}
						>
							📊 Statistik Arsip
						</button>
						<button 
							class="text-[11px] px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
							onclick={() => sendQuery("Cari dokumen legalitas truk KIR dan STNK yang berstatus aktif")}
						>
							🚚 Legalitas Armada
						</button>
						<button 
							class="text-[11px] px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
							onclick={() => sendQuery("Tampilkan daftar SIM pengemudi dan masa berlakunya")}
						>
							👤 SIM Driver
						</button>
					</div>
				{/if}

				<!-- Input Area -->
				<div class="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
					<button class="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onclick={startNewChat} title="Reset percakapan">
						<span class="material-symbols-outlined text-lg">delete_sweep</span>
					</button>
					<input
						type="text"
						bind:value={inputValue}
						onkeydown={handleKeydown}
						placeholder="Tanya DIMAS seputar berkas, STNK, KIR, SIM..."
						class="flex-1 bg-slate-100 dark:bg-slate-800 border-0 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
						disabled={isLoading}
					/>
					<button
						onclick={sendMessage}
						disabled={isLoading || !inputValue.trim()}
						class="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 shadow-sm"
						aria-label="Kirim pesan"
					>
						<span class="material-symbols-outlined text-base">send</span>
					</button>
				</div>
			{/if}
		</div>
	{/if}
{/if}

<style>
	.dimas-fab {
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
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
		border: none;
		cursor: pointer;
		background: transparent;
	}
	.dimas-fab:hover {
		transform: scale(1.08);
	}
	.dimas-fab-ring {
		position: absolute;
		inset: -4px;
		border-radius: 9999px;
		background: rgba(16, 185, 129, 0.35);
		animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}
	.dimas-online-dot {
		position: absolute;
		top: 4px;
		right: 4px;
		width: 11px;
		height: 11px;
		background-color: #10b981;
		border: 2px solid white;
		border-radius: 9999px;
		z-index: 20;
	}
	@keyframes pulse-ring {
		0%, 100% { transform: scale(1); opacity: 0.8; }
		50% { transform: scale(1.15); opacity: 0; }
	}
</style>
