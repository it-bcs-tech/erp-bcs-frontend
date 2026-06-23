<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';
	
	let { data }: { data: PageData } = $props();
	
	let trips = $derived(data.trips || []);
	let metrics = $derived(data.metrics);
	let meta = $derived(data.meta);

	let searchQuery = $state($page.url.searchParams.get('search') || '');
	let statusFilter = $state($page.url.searchParams.get('status') || 'All');
	let expandedTripId = $state<string | null>(null);
	let generatingSummaryFor = $state<string | null>(null);
	let aiSummaries = $state<Record<string, any>>({});
	
	let activeNotePopover = $state<{ tripId: string, dbId: number, point: string, note: string } | null>(null);
	
	let searchTimer: ReturnType<typeof setTimeout>;

	async function generateAISummary(trip: any) {
		generatingSummaryFor = trip.id;
		try {
			const res = await fetch('http://localhost:8000/fms/trip-summary', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					trip_id: trip.id,
					unit: trip.vehicle,
					driver: trip.driver,
					origin: trip.origin,
					destination: trip.destination,
					start_time: trip.history?.[1]?.time || '08:00',
					end_time: trip.history?.[4]?.time || '20:00',
					distance: 120 // mock distance
				})
			});
			if (!res.ok) throw new Error('API Error');
			const data = await res.json();
			
			// Handle dict/nested dict depending on Groq JSON output
			let parsed = data;
			if (typeof data.narrative === 'undefined') {
			    // fallback if nested
			    const keys = Object.keys(data);
			    if (keys.length > 0 && typeof data[keys[0]].narrative !== 'undefined') {
			        parsed = data[keys[0]];
			    }
			}
			aiSummaries[trip.id] = parsed;
		} catch (error) {
			console.error(error);
			alert('Gagal membuat AI Summary');
		} finally {
			generatingSummaryFor = null;
		}
	}

	function updateQueryParams() {
		const url = new URL(window.location.href);
		if (searchQuery) url.searchParams.set('search', searchQuery);
		else url.searchParams.delete('search');
		
		if (statusFilter && statusFilter !== 'All') url.searchParams.set('status', statusFilter);
		else url.searchParams.delete('status');
		
		url.searchParams.set('page', '1');
		goto(url.toString(), { keepFocus: true, noScroll: true });
	}

	function handleSearchInput() {
		clearTimeout(searchTimer);
		searchTimer = setTimeout(updateQueryParams, 400);
	}

	function handleStatusChange() {
		updateQueryParams();
	}

	let totalPages = $derived(Math.max(1, Math.ceil((meta?.total || 0) / (meta?.per_page || 5))));
	let currentPage = $derived(meta?.current_page || 1);
	let startItem = $derived(meta?.total === 0 ? 0 : ((currentPage - 1) * (meta?.per_page || 5)) + 1);
	let endItem = $derived(Math.min(currentPage * (meta?.per_page || 5), meta?.total || 0));

	function goToPage(p: number) {
		if (p < 1 || p > totalPages) return;
		const url = new URL(window.location.href);
		url.searchParams.set('page', p.toString());
		goto(url.toString(), { invalidateAll: true, noScroll: true });
	}
</script>

<svelte:head>
	<title>Trips & Routes | FMS Dashboard</title>
</svelte:head>

<div class="flex flex-col h-full">
	<!-- Header & Actions -->
	<header class="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
		<div>
			<h1 class="text-3xl font-extrabold text-on-surface tracking-tight mb-2">Trips & Routes</h1>
			<p class="text-on-surface-variant font-medium text-sm">Monitor trip progress, dispatches, and delivery routes in real-time</p>
		</div>
		<div class="flex gap-3">
			<button class="bg-surface-container-lowest border border-outline-variant/30 text-on-surface px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-surface-container-low transition-colors">
				<span class="material-symbols-outlined text-lg">download</span>
				Export
			</button>
		</div>
	</header>

	<!-- Metrics Cards -->
	<div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
		<div class="bg-surface-container-lowest p-5 rounded-2xl border border-blue-500/20 shadow-sm relative overflow-hidden group">
			<div class="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
			<p class="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2 relative z-10">Active Trips</p>
			<div class="flex items-end justify-between relative z-10">
				<h3 class="text-3xl font-black text-blue-600">{metrics.activeTrips}</h3>
				<span class="material-symbols-outlined text-3xl text-blue-500/50">near_me</span>
			</div>
		</div>
		<div class="bg-surface-container-lowest p-5 rounded-2xl border border-emerald-500/20 shadow-sm">
			<p class="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">Completed</p>
			<div class="flex items-end justify-between">
				<h3 class="text-3xl font-black text-emerald-600">{metrics.completedToday}</h3>
				<span class="material-symbols-outlined text-3xl text-emerald-500/50">check_circle</span>
			</div>
		</div>
		<div class="bg-surface-container-lowest p-5 rounded-2xl border border-amber-500/20 shadow-sm">
			<p class="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2">Scheduled</p>
			<div class="flex items-end justify-between">
				<h3 class="text-3xl font-black text-amber-600">{metrics.scheduled}</h3>
				<span class="material-symbols-outlined text-3xl text-amber-500/50">schedule</span>
			</div>
		</div>
		<div class="bg-surface-container-lowest p-5 rounded-2xl border border-rose-500/20 shadow-sm">
			<p class="text-xs font-bold text-rose-600 uppercase tracking-wider mb-2">Delayed</p>
			<div class="flex items-end justify-between">
				<h3 class="text-3xl font-black text-rose-600">{metrics.delayed}</h3>
				<span class="material-symbols-outlined text-3xl text-rose-500/50">warning</span>
			</div>
		</div>
	</div>

	<!-- Filters & Search -->
	<div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
		<div class="flex gap-3">
			<select 
				bind:value={statusFilter} 
				onchange={handleStatusChange}
				class="bg-surface-container-lowest border border-outline-variant/30 text-on-surface rounded-xl py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm font-medium shadow-sm appearance-none cursor-pointer"
			>
				<option value="All">All Status</option>
				<option value="In Transit">In Transit</option>
				<option value="Completed">Completed</option>
				<option value="Scheduled">Scheduled</option>
				<option value="Delayed">Delayed</option>
			</select>
		</div>

		<div class="relative w-full lg:w-72 flex-shrink-0">
			<span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">search</span>
			<input 
				type="text" 
				bind:value={searchQuery}
				oninput={handleSearchInput}
				placeholder="Search trip, vehicle, driver..." 
				class="w-full bg-surface-container-lowest border border-outline-variant/30 text-on-surface rounded-full py-2.5 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm font-medium shadow-sm"
			/>
		</div>
	</div>

	<!-- Data Table -->
	<div class="bg-surface-container-lowest rounded-[24px] shadow-sm flex-1 overflow-hidden flex flex-col">
		<div class="overflow-x-auto flex-1">
			<table class="w-full text-left border-collapse min-w-[1000px]">
				<thead>
					<tr class="border-b border-surface-container sticky top-0 bg-surface-container-lowest z-10">
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Trip & Vehicle</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Route</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Progress</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Status</th>
						<th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-right">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-surface-container">
					{#each trips as trip}
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
						<tr class="group hover:bg-surface-container-low transition-colors cursor-pointer {expandedTripId === trip.id ? 'bg-surface-container-low/50' : ''}" onclick={() => expandedTripId = expandedTripId === trip.id ? null : trip.id}>
							<td class="py-4 px-6">
								<div class="flex flex-col gap-2">
									<span class="text-[10px] font-black tracking-widest uppercase text-on-surface-variant/70">{trip.id}</span>
									<div class="flex items-center gap-3">
										<div class="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
											<span class="material-symbols-outlined text-[18px]">local_shipping</span>
										</div>
										<div>
											<p class="text-sm font-bold text-on-surface">{trip.vehicle}</p>
											<p class="text-[11px] font-medium text-on-surface-variant">{trip.driver}</p>
										</div>
									</div>
								</div>
							</td>
							<td class="py-4 px-6">
								<div class="flex flex-col gap-1.5">
									<div class="flex items-center gap-2">
										<span class="material-symbols-outlined text-[14px] text-emerald-500">trip_origin</span>
										<span class="text-xs font-medium text-on-surface truncate max-w-[180px]" title={trip.origin}>{trip.origin}</span>
									</div>
									<div class="flex items-center gap-2">
										<span class="material-symbols-outlined text-[14px] text-rose-500">location_on</span>
										<span class="text-xs font-medium text-on-surface truncate max-w-[180px]" title={trip.destination}>{trip.destination}</span>
									</div>
									<span class="text-[10px] font-medium text-on-surface-variant">{trip.distance} • {trip.cargo}</span>
								</div>
							</td>
							<td class="py-4 px-6">
								<div class="flex flex-col gap-2 w-32">
									<div class="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
										{#if trip.status === 'Delayed'}
											<div class="bg-rose-500 h-full rounded-full transition-all duration-500" style="width: {trip.progress}%"></div>
										{:else if trip.status === 'Completed'}
											<div class="bg-emerald-500 h-full rounded-full transition-all duration-500" style="width: {trip.progress}%"></div>
										{:else}
											<div class="bg-blue-500 h-full rounded-full transition-all duration-500" style="width: {trip.progress}%"></div>
										{/if}
									</div>
									<div class="flex items-center justify-between">
										<span class="text-[10px] font-bold text-on-surface-variant">{trip.progress}%</span>
										<span class="text-[10px] font-medium text-on-surface-variant">ETA: {trip.eta.split(' ')[1]}</span>
									</div>
								</div>
							</td>
							<td class="py-4 px-6">
								{#if trip.status === 'In Transit'}
									<span class="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold text-[11px] bg-blue-500/10 px-2.5 py-1 rounded-md uppercase tracking-wider border border-blue-500/20">
										<span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span> In Transit
									</span>
								{:else if trip.status === 'Completed'}
									<span class="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] bg-emerald-500/10 px-2.5 py-1 rounded-md uppercase tracking-wider border border-emerald-500/20">
										<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Completed
									</span>
								{:else if trip.status === 'Delayed'}
									<span class="inline-flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold text-[11px] bg-rose-500/10 px-2.5 py-1 rounded-md uppercase tracking-wider border border-rose-500/20">
										<span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Delayed
									</span>
								{:else}
									<span class="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold text-[11px] bg-amber-500/10 px-2.5 py-1 rounded-md uppercase tracking-wider border border-amber-500/20">
										<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Scheduled
									</span>
								{/if}
							</td>
							<td class="py-4 px-6 text-right">
								<div class="flex items-center justify-end gap-2">
									<!-- svelte-ignore a11y_click_events_have_key_events -->
									<!-- svelte-ignore a11y_no_static_element_interactions -->
									<div 
										class="p-2 rounded-lg text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold"
										title="Track Live di Peta"
										onclick={(e) => { e.stopPropagation(); goto(`/fms/live-map?unit=${encodeURIComponent(trip.vehicle)}`); }}
									>
										<span class="material-symbols-outlined text-[20px]">my_location</span>
										<span class="hidden lg:inline">Track Live</span>
									</div>
									<button class="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors" title="More Options">
										<span class="material-symbols-outlined text-[20px]">more_vert</span>
									</button>
								</div>
							</td>
						</tr>
						{#if expandedTripId === trip.id}
							<tr class="bg-surface-container-lowest border-b border-surface-container">
								<td colspan="5" class="p-8">
									<div class="w-full bg-surface-container-lowest rounded-xl">
										<p class="text-xs font-black text-on-surface-variant tracking-widest uppercase mb-8 flex items-center gap-2">
											<span class="material-symbols-outlined text-[16px]">history</span> Trip Journey Timeline
										</p>
										<div class="flex justify-between relative mt-4">
											<!-- Base line connecting all nodes -->
											<div class="absolute left-8 right-8 top-2 -translate-y-1/2 h-1 bg-surface-container-high rounded-full z-0"></div>
											
											{#if trip.history && trip.history.length > 0}
												{#each trip.history as event, index}
													<div class="relative z-10 flex flex-col items-center flex-1">
														<!-- Timeline Dot -->
														<div class="w-5 h-5 rounded-full border-4 border-surface-container-lowest 
															{event.active ? 'bg-blue-500 shadow-[0_0_16px_rgba(59,130,246,0.8)] animate-pulse' : (event.completed ? 'bg-emerald-500' : 'bg-surface-container-high')}">
														</div>
														
														<!-- Connection line fill for completed steps -->
														{#if event.completed && index < trip.history.length - 1}
															<div class="absolute left-1/2 right-[-50%] top-2 -translate-y-1/2 h-1 bg-emerald-500 z-[-1]"></div>
														{/if}
														
														<!-- Event Details -->
														<div class="mt-4 text-center px-2">
															<button 
																type="button"
																onclick={() => activeNotePopover = { tripId: trip.id, dbId: trip.db_id, point: event.step, note: event.note?.note || '' }}
																class="text-xs font-bold hover:underline hover:underline-offset-4 decoration-on-surface-variant/30 transition-all {event.active ? 'text-blue-600 dark:text-blue-400' : (event.completed ? 'text-on-surface' : 'text-on-surface-variant/50')}"
																title="Klik untuk tambah/edit catatan"
															>
																{event.label}
															</button>
															{#if event.time}
																<p class="text-[10px] {event.active ? 'text-blue-500/80 font-medium' : 'text-on-surface-variant font-medium'} mt-1">
																	{event.time}
																</p>
															{/if}
															{#if event.duration}
																<div 
																	class="mt-2 inline-flex items-center gap-1 bg-surface-container-low px-2 py-0.5 rounded text-[9px] font-bold text-on-surface-variant border border-outline-variant/30 cursor-help"
																	title={event.duration.tooltip}
																>
																	<span class="material-symbols-outlined text-[10px]">timer</span> {event.duration.value}
																</div>
															{/if}
															{#if event.notes}
																<p class="text-[10px] mt-2 px-2 py-1 bg-surface-container border border-surface-container-highest rounded text-on-surface-variant italic inline-block">
																	{event.notes}
																</p>
															{/if}

															{#if event.note}
																<div class="mt-2 text-center w-full max-w-[140px] mx-auto">
																	<p class="text-[10px] px-2 py-1.5 bg-amber-50/50 border border-amber-200/50 rounded-md text-amber-700 italic truncate" title={event.note.note}>
																		{event.note.note}
																	</p>
																</div>
															{/if}

															<div class="relative">
																<!-- Mac-style Popover (Modern) -->
																{#if activeNotePopover?.tripId === trip.id && activeNotePopover?.point === event.step}
																	<div class="absolute left-1/2 -translate-x-1/2 top-6 z-50 animate-in fade-in zoom-in-95 duration-200">
																		<!-- Pointer Caret -->
																		<div class="absolute left-1/2 -translate-x-1/2 -top-2 w-4 h-4 bg-white/85 dark:bg-slate-900/85 border-t border-l border-white/60 dark:border-white/10 transform rotate-45 z-0" style="backdrop-filter: blur(24px);"></div>
																		
																		<!-- Glassmorphism Floating Card -->
																		<div class="relative w-[300px] bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/60 dark:border-white/10 flex flex-col z-10 text-left">
																			<div class="relative w-full h-full rounded-2xl overflow-hidden flex flex-col bg-white/40 dark:bg-slate-900/40">
																				
																				<!-- Popup Header -->
																				<div class="px-4 py-3 border-b border-black/5 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
																					<div class="flex flex-col">
																						<span class="text-[9px] font-bold text-sky-500 uppercase tracking-widest leading-none mb-1.5">Catatan Trip</span>
																						<h4 class="text-[13px] font-bold text-slate-800 dark:text-slate-100 tracking-tight leading-none">
																							{event.label}
																						</h4>
																					</div>
																					<button type="button" onclick={(e) => { e.stopPropagation(); activeNotePopover = null; }} class="w-6 h-6 rounded-full bg-slate-200/50 hover:bg-slate-300/50 dark:bg-slate-700/50 dark:hover:bg-slate-600/50 flex items-center justify-center text-slate-500 dark:text-slate-400 transition-colors">
																						<span class="material-symbols-outlined text-[14px]">close</span>
																					</button>
																				</div>

																				<!-- Popup Body -->
																				<div class="p-4">
																					<form method="POST" action="?/saveNote" use:enhance={() => {
																						return async ({ result, update }) => {
																							if (result.type === 'success') {
																								activeNotePopover = null;
																								await update();
																							}
																						};
																					}}>
																						<input type="hidden" name="trip_id" value={activeNotePopover.dbId} />
																						<input type="hidden" name="point" value={activeNotePopover.point} />
																						
																						<div class="mb-4">
																							<textarea 
																								name="note" 
																								class="w-full bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-shadow resize-none min-h-[80px]"
																								placeholder="Tuliskan catatan di titik ini..."
																								bind:value={activeNotePopover.note}
																								autofocus
																								onkeydown={(e) => {
																									if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
																										e.currentTarget.form?.requestSubmit();
																									}
																								}}
																							></textarea>
																						</div>

																						<div class="flex items-center justify-between">
																							<span class="text-[9px] font-medium text-slate-400 dark:text-slate-500">Cmd+Enter to save</span>
																							<button type="submit" class="bg-sky-500 text-white px-4 py-1.5 rounded-xl text-[11px] font-semibold hover:bg-sky-600 active:scale-[0.98] transition-all shadow-sm">
																								Simpan Catatan
																							</button>
																						</div>
																					</form>
																				</div>
																			</div>
																		</div>
																	</div>
																{/if}
															</div>
														</div>
													</div>
												{/each}
											{:else}
												<div class="w-full text-center py-4">
													<p class="text-sm font-medium text-on-surface-variant">No history available for this trip.</p>
												</div>
											{/if}
										</div>

										<!-- AI Summary Section -->
										<div class="mt-10 border-t border-surface-container-high pt-8">
											<div class="flex items-center justify-between mb-6">
												<p class="text-xs font-black text-on-surface-variant tracking-widest uppercase flex items-center gap-2">
													<span class="material-symbols-outlined text-[16px] text-blue-500">robot_2</span> AI Journey Summary
												</p>
												{#if !aiSummaries[trip.id]}
													<button 
														onclick={(e) => { e.stopPropagation(); generateAISummary(trip); }}
														disabled={generatingSummaryFor === trip.id}
														class="bg-blue-600/10 text-blue-600 border border-blue-500/20 px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-600/20 transition-colors disabled:opacity-50 flex items-center gap-2">
														{#if generatingSummaryFor === trip.id}
															<span class="material-symbols-outlined text-[16px] animate-spin">refresh</span> Generating...
														{:else}
															<span class="material-symbols-outlined text-[16px]">auto_awesome</span> Generate AI Summary
														{/if}
													</button>
												{/if}
											</div>

											{#if aiSummaries[trip.id]}
												{@const summary = aiSummaries[trip.id]}
												<div class="bg-blue-50 dark:bg-blue-900/10 p-5 rounded-2xl border border-blue-500/20">
													<p class="text-sm font-medium text-on-surface leading-relaxed mb-6">
														{summary.narrative || "Rangkuman tersedia."}
													</p>
													
													<div class="grid grid-cols-1 md:grid-cols-5 gap-3">
														{#each summary.timeline || [] as phase}
															<div class="bg-surface-container-lowest p-3 rounded-xl border border-surface-container-highest shadow-sm">
																<p class="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">{phase.phase}</p>
																<p class="text-xl font-black text-on-surface mb-2">{phase.duration}</p>
																<p class="text-[11px] text-on-surface-variant leading-tight">{phase.description}</p>
															</div>
														{/each}
													</div>
												</div>
											{/if}
										</div>

									</div>
								</td>
							</tr>
						{/if}
					{/each}
				</tbody>
			</table>
		</div>
		
		<!-- Pagination Footer -->
		<div class="px-6 py-4 border-t border-surface-container flex items-center justify-between bg-surface-container-lowest">
			<p class="text-xs text-on-surface-variant font-medium">Showing {startItem} to {endItem} of {meta?.total || 0} entries</p>
			<div class="flex gap-1">
				<button 
					class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high disabled:opacity-50 transition-colors" 
					disabled={currentPage <= 1}
					onclick={() => goToPage(currentPage - 1)}>
					<span class="material-symbols-outlined text-lg">chevron_left</span>
				</button>
				
				{#each Array(totalPages) as _, i}
					<button 
						class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shadow-sm transition-colors {currentPage === i + 1 ? 'bg-blue-600 text-white' : 'text-on-surface hover:bg-surface-container-high'}"
						onclick={() => goToPage(i + 1)}>
						{i + 1}
					</button>
				{/each}

				<button 
					class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high disabled:opacity-50 transition-colors"
					disabled={currentPage >= totalPages}
					onclick={() => goToPage(currentPage + 1)}>
					<span class="material-symbols-outlined text-lg">chevron_right</span>
				</button>
			</div>
		</div>
	</div>
</div>
