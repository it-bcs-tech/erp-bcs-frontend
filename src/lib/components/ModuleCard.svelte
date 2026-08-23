<script lang="ts">
	let { icon, title, subtitle, colorClass, textClass, href, disabled = false, disabledReason = '' } = $props<{
		icon: string;
		title: string;
		subtitle: string;
		colorClass: string;
		textClass: string;
		href?: string;
		disabled?: boolean;
		disabledReason?: string;
	}>();
</script>

{#if disabled}
	<!-- Disabled Module Card (greyed out) -->
	<div 
		class="group relative flex flex-col items-center p-6 bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 rounded-3xl opacity-45 cursor-not-allowed select-none shadow-xs"
		title={disabledReason}
	>
		<!-- Lock badge -->
		<div class="absolute top-3.5 right-3.5 w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
			<span class="material-symbols-outlined text-slate-400 dark:text-slate-500 text-xs">lock</span>
		</div>

		<div class="w-16 h-16 mb-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-600">
			<span class="material-symbols-outlined text-3xl">{icon}</span>
		</div>
		<span class="text-slate-500 font-bold text-sm">{title}</span>
		<span class="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider font-bold text-center">{subtitle}</span>
		
		<!-- Tooltip on hover -->
		<div class="absolute -bottom-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
			<div class="bg-slate-800 text-white text-[10px] font-bold px-3 py-1.5 rounded-xl whitespace-nowrap shadow-lg">
				{disabledReason || 'Akses Terbatas'}
			</div>
		</div>
	</div>
{:else if href}
	<a {href} class="group flex flex-col items-center p-6 bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 rounded-3xl hover:border-slate-400 dark:hover:border-slate-600 hover:shadow-sm transition-all duration-200 transform active:scale-98 cursor-pointer">
		<div class="w-16 h-16 mb-3.5 rounded-2xl {colorClass} flex items-center justify-center {textClass} group-hover:scale-105 transition-transform duration-200 shadow-xs">
			<span class="material-symbols-outlined text-3xl">{icon}</span>
		</div>
		<span class="text-on-surface font-bold text-sm group-hover:text-primary transition-colors">{title}</span>
		<span class="text-[10px] text-on-surface-variant mt-0.5 uppercase tracking-wider font-bold text-center">{subtitle}</span>
	</a>
{:else}
	<button class="group flex flex-col items-center p-6 bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 rounded-3xl hover:border-slate-400 dark:hover:border-slate-600 hover:shadow-sm transition-all duration-200 transform active:scale-98 cursor-pointer">
		<div class="w-16 h-16 mb-3.5 rounded-2xl {colorClass} flex items-center justify-center {textClass} group-hover:scale-105 transition-transform duration-200 shadow-xs">
			<span class="material-symbols-outlined text-3xl">{icon}</span>
		</div>
		<span class="text-on-surface font-bold text-sm group-hover:text-primary transition-colors">{title}</span>
		<span class="text-[10px] text-on-surface-variant mt-0.5 uppercase tracking-wider font-bold text-center">{subtitle}</span>
	</button>
{/if}
