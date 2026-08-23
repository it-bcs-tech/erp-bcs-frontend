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

<div class="flex flex-col h-full space-y-6">
	<!-- Header Section -->
	<header class="flex flex-col md:flex-row md:items-end justify-between gap-4 flex-shrink-0">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="material-symbols-outlined text-amber-600 dark:text-amber-400 text-2xl">account_balance</span>
				<h1 class="text-2xl font-black text-on-surface tracking-tight">Pusat Transaksi Keuangan</h1>
			</div>
			<p class="text-on-surface-variant font-medium text-sm mt-0.5">
				Akses cepat entri transaksi Piutang, Hutang Vendor, Jurnal Umum Buku Besar, dan Manajemen Kas/Bank
			</p>
		</div>
	</header>

	<!-- Bento Grid Layout -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		{#each modules as mod}
			<div class="group relative overflow-hidden rounded-2xl bg-surface-container-low border border-slate-200/60 dark:border-slate-800/60 p-6 shadow-xs hover:border-amber-500/30 transition-all flex flex-col justify-between">
				<!-- Header section -->
				<div class="flex items-center gap-4 mb-4">
					<div class="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold flex-shrink-0">
						<span class="material-symbols-outlined text-2xl">{mod.icon}</span>
					</div>
					<div>
						<h2 class="text-base font-bold text-on-surface">{mod.title}</h2>
						<p class="text-xs text-on-surface-variant mt-0.5">{mod.description}</p>
					</div>
				</div>

				<!-- Action Links -->
				<div class="space-y-2 pt-2">
					{#each mod.links as link}
						<a href={link.path} class="flex items-center justify-between p-3 rounded-xl bg-surface hover:bg-surface-container-high border border-slate-200/60 dark:border-slate-800/60 text-on-surface transition-colors group/link">
							<span class="font-bold text-xs">{link.label}</span>
							<span class="material-symbols-outlined text-sm text-amber-600 group-hover/link:translate-x-1 transition-transform">arrow_forward</span>
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
