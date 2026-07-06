<script lang="ts">
	// Dashboard data
</script>

<svelte:head>
	<title>Finance Dashboard | Architectural ERP</title>
</svelte:head>

<div class="max-w-7xl mx-auto p-8">
			<!-- Header Section -->
			<header class="mb-10 flex justify-between items-end">
				<div>
					<h1 class="text-3xl font-extrabold text-on-surface tracking-tight mb-1">Financial Performance</h1>
					<p class="text-on-surface-variant font-medium text-sm">Q3 Fiscal Year Overview • Updated 12 mins ago</p>
				</div>
				<div class="flex gap-3">
					<button class="bg-secondary-container text-on-secondary-container px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity">
						<span class="material-symbols-outlined text-lg">download</span>
						Export Report
					</button>
					<button class="bg-primary text-on-primary px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm flex items-center gap-2 hover:opacity-90 transition-opacity">
						<span class="material-symbols-outlined text-lg">add</span>
						New Entry
					</button>
				</div>
			</header>

			<!-- Bento Grid for Quick Cards -->
			<div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
				<!-- Net Profit Card (Emphasis) -->
				<div class="col-span-1 md:col-span-2 bg-surface-container-lowest rounded-[24px] p-6 flex flex-col justify-between min-h-[160px] shadow-sm relative overflow-hidden group hover:bg-surface-container-lowest/90 transition-colors">
					<!-- Soft radial gradient for depth -->
					<div class="absolute -right-20 -top-20 w-64 h-64 bg-primary-fixed/30 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-500 pointer-events-none"></div>
					
					<div class="flex justify-between items-start relative z-10">
						<div>
							<p class="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Net Profit (YTD)</p>
							<h2 class="text-4xl font-black text-primary">$4,281,090.00</h2>
						</div>
						<div class="bg-tertiary-container text-on-tertiary-container px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
							<span class="material-symbols-outlined text-xs">trending_up</span>
							+14.2%
						</div>
					</div>
					<div class="w-full bg-surface-container h-1.5 rounded-full overflow-hidden mt-6 relative z-10">
						<div class="bg-primary h-full w-3/4 rounded-full"></div>
					</div>
				</div>

				<!-- Pending Approvals Card -->
				<div class="bg-surface-container-lowest rounded-[24px] p-6 flex flex-col justify-between shadow-sm hover:scale-[1.02] transition-transform duration-300">
					<div class="flex items-center gap-3 text-secondary">
						<span class="material-symbols-outlined">clock_loader_40</span>
						<p class="text-xs font-bold uppercase tracking-widest">Pending Approvals</p>
					</div>
					<div class="mt-4">
						<h2 class="text-3xl font-extrabold text-on-surface">24</h2>
						<p class="text-xs text-on-surface-variant font-medium mt-1">Totaling $142,500</p>
					</div>
				</div>

				<!-- Unpaid Invoices Card -->
				<div class="bg-surface-container-lowest rounded-[24px] p-6 flex flex-col justify-between shadow-sm relative overflow-hidden">
					<div class="absolute bottom-0 left-0 w-full h-1.5 bg-primary"></div>
					<div class="flex items-center gap-3 text-primary">
						<span class="material-symbols-outlined">receipt_long</span>
						<p class="text-xs font-bold uppercase tracking-widest">Unpaid Invoices</p>
					</div>
					<div class="mt-4">
						<h2 class="text-3xl font-extrabold text-on-surface">12</h2>
						<p class="text-xs text-error font-bold mt-1">$45,200 Overdue</p>
					</div>
				</div>
			</div>

			<!-- Charts and Main Visuals Section -->
			<div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
				<!-- Cash Flow Chart Container -->
				<div class="lg:col-span-2 bg-surface-container-lowest rounded-[24px] p-8 shadow-sm relative overflow-hidden group">
					<!-- Ambient background glow -->
					<div class="absolute inset-0 bg-gradient-to-br from-surface-container-lowest to-surface-container-low opacity-50 z-0 pointer-events-none"></div>

					<div class="flex justify-between items-center mb-8 relative z-10">
						<h3 class="text-xl font-bold tracking-tight text-on-surface">Cash Flow Analysis</h3>
						<div class="flex gap-4">
							<span class="inline-flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant">
								<span class="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_8px_var(--color-primary)]"></span> Revenue
							</span>
							<span class="inline-flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant">
								<span class="w-2.5 h-2.5 rounded-full bg-secondary-fixed-dim"></span> Expenses
							</span>
						</div>
					</div>
					<div class="h-64 flex items-end justify-between gap-4 relative z-10">
						<!-- Fake Chart Bars -->
						{#each [
							{ month: 'Jan', rev: '60%', exp: '40%' },
							{ month: 'Feb', rev: '75%', exp: '45%' },
							{ month: 'Mar', rev: '65%', exp: '55%' },
							{ month: 'Apr', rev: '90%', exp: '30%' },
							{ month: 'May', rev: '80%', exp: '50%' },
							{ month: 'Jun', rev: '85%', exp: '40%' }
						] as data}
							<div class="flex-1 flex flex-col items-center gap-3 h-full group/bar cursor-pointer">
								<div class="w-full flex items-end justify-center gap-1.5 h-full relative">
									<!-- Revenue Bar -->
									<div class="w-5 bg-primary rounded-t-md transition-all duration-300 group-hover/bar:w-6 group-hover/bar:brightness-110" style="height: {data.rev}"></div>
									<!-- Expense Bar -->
									<div class="w-5 bg-secondary-fixed-dim rounded-t-md transition-all duration-300 group-hover/bar:w-6" style="height: {data.exp}"></div>
									
									<!-- Tooltip on hover -->
									<div class="absolute -top-10 bg-surface-container-highest text-on-surface px-2 py-1 rounded text-[10px] font-bold opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap shadow-sm">
										Rev: {data.rev} / Exp: {data.exp}
									</div>
								</div>
								<span class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider group-hover/bar:text-primary transition-colors">{data.month}</span>
							</div>
						{/each}
					</div>
				</div>

				<!-- Expense Breakdown Card -->
				<div class="bg-surface-container-lowest rounded-[24px] p-8 flex flex-col shadow-sm">
					<h3 class="text-xl font-bold tracking-tight text-on-surface mb-8">Expense Allocation</h3>
					<div class="flex-1 flex items-center justify-center relative my-4">
						<!-- Circular Donut Chart Simulation with CSS mask -->
						<div class="w-40 h-40 rounded-full flex items-center justify-center relative bg-surface-container">
							<div class="absolute inset-0 rounded-full" style="background: conic-gradient(var(--color-primary) 0% 54%, var(--color-secondary-container) 54% 75%, var(--color-tertiary) 75% 100%); mask-image: radial-gradient(transparent 55%, black 56%); -webkit-mask-image: radial-gradient(transparent 55%, black 56%);"></div>
							<div class="text-center z-10">
								<p class="text-3xl font-black text-on-surface">54%</p>
								<p class="text-[10px] uppercase font-bold text-on-surface-variant tracking-widest mt-1">Payroll</p>
							</div>
						</div>
					</div>
					<div class="mt-8 space-y-4">
						<div class="flex justify-between items-center text-sm group cursor-pointer p-2 -mx-2 rounded-lg hover:bg-surface-container-low transition-colors">
							<span class="flex items-center gap-3 font-medium text-on-surface-variant">
								<span class="w-3 h-3 rounded-full bg-primary shadow-[0_0_8px_var(--color-primary)]"></span> Operations
							</span>
							<span class="font-bold text-on-surface">$12,400</span>
						</div>
						<div class="flex justify-between items-center text-sm group cursor-pointer p-2 -mx-2 rounded-lg hover:bg-surface-container-low transition-colors">
							<span class="flex items-center gap-3 font-medium text-on-surface-variant">
								<span class="w-3 h-3 rounded-full bg-secondary-container"></span> Marketing
							</span>
							<span class="font-bold text-on-surface">$8,120</span>
						</div>
						<div class="flex justify-between items-center text-sm group cursor-pointer p-2 -mx-2 rounded-lg hover:bg-surface-container-low transition-colors">
							<span class="flex items-center gap-3 font-medium text-on-surface-variant">
								<span class="w-3 h-3 rounded-full bg-tertiary"></span> Research
							</span>
							<span class="font-bold text-on-surface">$4,500</span>
						</div>
					</div>
				</div>
			</div>

			<!-- Recent Transactions Table -->
			<div class="bg-surface-container-lowest rounded-[24px] overflow-hidden shadow-sm">
				<div class="px-8 py-6 flex justify-between items-center bg-surface-container-lowest border-b border-surface-container-high/50">
					<h3 class="text-xl font-bold tracking-tight text-on-surface">Recent Financial Activity</h3>
					<button class="text-primary font-bold text-sm hover:underline px-3 py-1.5 rounded-lg hover:bg-primary-container/20 transition-colors">View All Ledger</button>
				</div>
				<div class="px-8 pb-8 overflow-x-auto pt-4">
					<table class="w-full text-left border-collapse">
						<thead>
							<tr>
								<th class="pb-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant border-b border-surface-container">Entity / Description</th>
								<th class="pb-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant border-b border-surface-container">Date</th>
								<th class="pb-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant border-b border-surface-container">Category</th>
								<th class="pb-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant border-b border-surface-container">Status</th>
								<th class="pb-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-right border-b border-surface-container">Amount</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-surface-container">
							<tr class="group hover:bg-surface-container-low transition-colors cursor-pointer">
								<td class="py-5">
									<div class="flex items-center gap-4">
										<div class="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-primary font-bold group-hover:bg-primary group-hover:text-on-primary transition-colors">AZ</div>
										<div>
											<p class="font-bold text-on-surface group-hover:text-primary transition-colors">Amazon Web Services</p>
											<p class="text-xs text-on-surface-variant">Cloud Infrastructure Subscription</p>
										</div>
									</div>
								</td>
								<td class="py-5 text-sm font-medium text-on-surface">Oct 12, 2023</td>
								<td class="py-5">
									<span class="bg-surface-container-highest text-on-surface-variant text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wide">Tech Stack</span>
								</td>
								<td class="py-5">
									<span class="flex items-center gap-2 text-tertiary font-bold text-sm bg-tertiary-container/30 px-3 py-1 rounded-full w-fit">
										<span class="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span> Paid
									</span>
								</td>
								<td class="py-5 text-right font-black text-on-surface">-$1,240.00</td>
							</tr>
							<tr class="group hover:bg-surface-container-low transition-colors cursor-pointer">
								<td class="py-5">
									<div class="flex items-center gap-4">
										<div class="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-secondary font-bold group-hover:bg-secondary group-hover:text-on-secondary transition-colors">GT</div>
										<div>
											<p class="font-bold text-on-surface group-hover:text-primary transition-colors">Global Tech Solutions</p>
											<p class="text-xs text-on-surface-variant">Hardware Procurement PO #882</p>
										</div>
									</div>
								</td>
								<td class="py-5 text-sm font-medium text-on-surface">Oct 11, 2023</td>
								<td class="py-5">
									<span class="bg-surface-container-highest text-on-surface-variant text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wide">Assets</span>
								</td>
								<td class="py-5">
									<span class="flex items-center gap-2 text-error font-bold text-sm bg-error-container/30 px-3 py-1 rounded-full w-fit">
										<span class="w-1.5 h-1.5 rounded-full bg-error"></span> Pending
									</span>
								</td>
								<td class="py-5 text-right font-black text-on-surface">-$8,450.00</td>
							</tr>
							<tr class="group hover:bg-surface-container-low transition-colors cursor-pointer">
								<td class="py-5">
									<div class="flex items-center gap-4">
										<div class="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center text-on-primary-container font-bold group-hover:brightness-110 transition-all">NK</div>
										<div>
											<p class="font-bold text-on-surface group-hover:text-primary transition-colors">Nakamoto K.K.</p>
											<p class="text-xs text-on-surface-variant">Consultancy Fees - International</p>
										</div>
									</div>
								</td>
								<td class="py-5 text-sm font-medium text-on-surface">Oct 10, 2023</td>
								<td class="py-5">
									<span class="bg-surface-container-highest text-on-surface-variant text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wide">Revenue</span>
								</td>
								<td class="py-5">
									<span class="flex items-center gap-2 text-tertiary font-bold text-sm bg-tertiary-container/30 px-3 py-1 rounded-full w-fit">
										<span class="w-1.5 h-1.5 rounded-full bg-tertiary"></span> Cleared
									</span>
								</td>
								<td class="py-5 text-right font-black text-tertiary text-base">+$12,000.00</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</div>
