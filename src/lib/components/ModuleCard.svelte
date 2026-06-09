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
		class="group relative flex flex-col items-center p-6 bg-surface-container-lowest rounded-full opacity-45 cursor-not-allowed select-none shadow-sm"
		title={disabledReason}
	>
		<!-- Lock badge -->
		<div class="absolute top-3 right-3 w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
			<span class="material-symbols-outlined text-slate-400 dark:text-slate-500 text-xs">lock</span>
		</div>

		<div class="w-20 h-20 mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-600">
			<span class="material-symbols-outlined text-4xl">{icon}</span>
		</div>
		<span class="text-slate-400 dark:text-slate-600 font-semibold">{title}</span>
		<span class="text-[10px] text-slate-400 dark:text-slate-600 mt-1 uppercase tracking-widest font-bold">{subtitle}</span>
		
		<!-- Tooltip on hover -->
		<div class="absolute -bottom-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
			<div class="bg-slate-800 text-white text-[10px] font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
				{disabledReason || 'Akses Terbatas'}
				<div class="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45"></div>
			</div>
		</div>
	</div>
{:else if href}
	<a {href} class="group flex flex-col items-center p-6 bg-surface-container-lowest rounded-full hover:bg-surface-container transition-all duration-300 transform active:scale-95 shadow-sm hover:shadow-md cursor-pointer">
		<div class="w-20 h-20 mb-4 rounded-full {colorClass} flex items-center justify-center {textClass} group-hover:scale-110 transition-transform duration-300">
			<span class="material-symbols-outlined text-4xl">{icon}</span>
		</div>
		<span class="text-on-surface font-semibold group-hover:text-primary transition-colors">{title}</span>
		<span class="text-[10px] text-on-surface-variant mt-1 uppercase tracking-widest font-bold">{subtitle}</span>
	</a>
{:else}
	<button class="group flex flex-col items-center p-6 bg-surface-container-lowest rounded-full hover:bg-surface-container transition-all duration-300 transform active:scale-95 shadow-sm hover:shadow-md">
		<div class="w-20 h-20 mb-4 rounded-full {colorClass} flex items-center justify-center {textClass} group-hover:scale-110 transition-transform duration-300">
			<span class="material-symbols-outlined text-4xl">{icon}</span>
		</div>
		<span class="text-on-surface font-semibold group-hover:text-primary transition-colors">{title}</span>
		<span class="text-[10px] text-on-surface-variant mt-1 uppercase tracking-widest font-bold">{subtitle}</span>
	</button>
{/if}
