<script lang="ts">
	// Modules Configuration
	const modules = [
		{
			id: 'sales',
			title: 'Sales & Receivables',
			description: 'Customer invoices, payments, and credit notes',
			icon: 'request_quote',
			bgGlow: 'bg-primary/10 group-hover:bg-primary/20',
			borderHover: 'hover:border-primary/50',
			iconBg: 'bg-primary-container text-on-primary-container',
			linkHover: 'hover:bg-primary hover:text-on-primary',
			links: [
				{ label: 'Customer Invoices', path: '/finance/create-transaction/customer-invoices' },
				{ label: 'Receive Payments', path: '/finance/create-transaction/receive-payments' },
				{ label: 'Credit Notes', path: '/finance/create-transaction/credit-notes' },
				{ label: 'Customer Deposits', path: '/finance/create-transaction/customer-deposits' }
			]
		},
		{
			id: 'purchases',
			title: 'Purchases & Payables',
			description: 'Vendor bills, payments, and debit notes',
			icon: 'shopping_cart_checkout',
			bgGlow: 'bg-secondary/10 group-hover:bg-secondary/20',
			borderHover: 'hover:border-secondary/50',
			iconBg: 'bg-secondary-container text-on-secondary-container',
			linkHover: 'hover:bg-secondary hover:text-on-secondary',
			links: [
				{ label: 'Vendor Bills', path: '/finance/create-transaction/vendor-bills' },
				{ label: 'Pay Bills', path: '/finance/create-transaction/pay-bills' },
				{ label: 'Vendor Deposits', path: '/finance/create-transaction/vendor-deposits' }
			]
		},
		{
			id: 'accounting',
			title: 'Accounting & GL',
			description: 'Journal entries, COA, and period closing',
			icon: 'account_balance',
			bgGlow: 'bg-tertiary/10 group-hover:bg-tertiary/20',
			borderHover: 'hover:border-tertiary/50',
			iconBg: 'bg-tertiary-container text-on-tertiary-container',
			linkHover: 'hover:bg-tertiary hover:text-on-tertiary',
			links: [
				{ label: 'Manual Journal Entries', path: '/finance/create-transaction/manual-journals' },
				{ label: 'Chart of Accounts', path: '/finance/create-transaction/chart-of-accounts' },
				{ label: 'Period End Closing', path: '/finance/create-transaction/period-close' }
			]
		},
		{
			id: 'cash',
			title: 'Cash & Bank',
			description: 'Cash movements and internal transfers',
			icon: 'payments',
			bgGlow: 'bg-emerald-500/10 group-hover:bg-emerald-500/20',
			borderHover: 'hover:border-emerald-500/50',
			iconBg: 'bg-emerald-100 text-emerald-800',
			linkHover: 'hover:bg-emerald-500 hover:text-white',
			links: [
				{ label: 'Cash Receipts', path: '/finance/create-transaction/cash-receipts' },
				{ label: 'Cash Disbursements', path: '/finance/create-transaction/cash-disbursements' },
				{ label: 'Internal Transfers', path: '/finance/create-transaction/internal-transfers' }
			]
		}
	];
</script>

<svelte:head>
	<title>Create Transaction | Finance ERP</title>
</svelte:head>

<div class="max-w-7xl mx-auto p-8">
	<header class="mb-10 border-b border-surface-variant/30 pb-6 flex items-end justify-between">
		<div>
			<div class="flex items-center gap-3 text-primary mb-2">
				<span class="material-symbols-outlined text-3xl">account_balance</span>
				<h1 class="text-3xl font-extrabold tracking-tight">Finance Operations</h1>
			</div>
			<p class="text-on-surface-variant font-medium">Standardized financial flows: Sales, Purchases, Accounting, and Cash.</p>
		</div>
	</header>

	<!-- Bento Grid Layout -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		{#each modules as mod}
			<div class="group relative overflow-hidden bg-surface-container-lowest rounded-3xl p-6 shadow-sm hover:shadow-md transition-all duration-300 border border-surface-variant/20 {mod.borderHover} flex flex-col h-full">
				<!-- Background Glow -->
				<div class="absolute -right-16 -top-16 w-48 h-48 rounded-full blur-3xl transition-colors duration-500 pointer-events-none {mod.bgGlow}"></div>
				
				<!-- Header section -->
				<div class="flex items-center gap-4 mb-4 relative z-10">
					<div class="w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-sm {mod.iconBg}">
						<span class="material-symbols-outlined text-2xl">{mod.icon}</span>
					</div>
					<div>
						<h2 class="text-xl font-bold text-on-surface">{mod.title}</h2>
						<p class="text-xs text-on-surface-variant mt-0.5">{mod.description}</p>
					</div>
				</div>

				<!-- Action Links -->
				<div class="mt-auto space-y-2 relative z-10 pt-4">
					{#each mod.links as link}
						<a href={link.path} class="flex items-center justify-between p-3 rounded-xl bg-surface-container text-on-surface transition-colors duration-200 group/link {mod.linkHover}">
							<span class="font-semibold text-sm">{link.label}</span>
							<span class="material-symbols-outlined text-sm opacity-0 -translate-x-2 group-hover/link:opacity-100 group-hover/link:translate-x-0 transition-all duration-200">arrow_forward</span>
						</a>
					{/each}
				</div>
			</div>
		{/each}
	</div>
</div>

<style>
	/* Custom Tailwind dynamic classes fallback (if purge doesn't catch them) */
	/* Note: In a real project, we should define these in safelist or avoid dynamic color classes. For this prototype, if colors like bg-emerald-container fail to load, ensure standard tokens are mapped. */
</style>
