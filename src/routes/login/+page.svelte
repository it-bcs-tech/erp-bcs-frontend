<script lang="ts">
	import { enhance } from '$app/forms';
	
	let { form } = $props();

	// Login state
	let email = $state(form?.email ?? '');
	let password = $state('');
	let showPassword = $state(false);
	let isLoading = $state(false);
	let showSuccess = $state(false);
</script>

<svelte:head>
	<title>Login | ERP PT BCS Logistics</title>
</svelte:head>

<div class="min-h-screen flex flex-col md:flex-row bg-surface selection:bg-[#ffd7f1] selection:text-[#2f1029]">
	<!-- Left Side: Branding, Visual and Stats (Desktop Only) -->
	<section class="hidden md:flex md:w-1/2 lg:w-3/5 relative overflow-hidden flex-col justify-between p-12 text-white bg-[#2f1029]">
		<!-- Background Image with mix-blend-mode and gradient overlay -->
		<div class="absolute inset-0 z-0">
			<img 
				class="w-full h-full object-cover transform scale-105 filter brightness-90 animate-[pulse_10s_infinite_alternate]" 
				alt="PT BCS Logistics Operations" 
				src="/images/logistics_banner.png"
			/>
			<div class="absolute inset-0 bg-gradient-to-br from-[#2f1029]/95 via-[#57344f]/85 to-[#191c1e]/90 mix-blend-multiply"></div>
			<div class="absolute inset-0 bg-gradient-to-t from-[#191c1e] via-transparent to-transparent opacity-60"></div>
		</div>

		<!-- Branding Logo Header -->
		<div class="relative z-10 bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-white/20 self-start max-w-[220px] transition-all hover:scale-[1.02] hover:shadow-xl">
			<img 
				src="https://bcsgroup.co.id/assets/images/uploads/BCS%20Logistics%20HD.png" 
				alt="PT BCS Logistics Logo" 
				class="w-full h-auto object-contain"
			/>
		</div>

		<!-- Content / Taglines -->
		<div class="relative z-10 space-y-6 max-w-lg my-auto pt-8">
			<div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[10px] font-extrabold bg-[#ffd7f1]/15 text-[#ffd7f1] border border-[#ffd7f1]/25 uppercase tracking-widest backdrop-blur-sm">
				<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
				Enterprise Operations Portal
			</div>
			
			<h1 class="text-4xl lg:text-5xl font-manrope font-extrabold tracking-tight leading-tight text-white drop-shadow-sm">
				Reliable & Integrated <br/>
				<span class="text-[#ffd7f1] bg-gradient-to-r from-[#ffd7f1] to-white bg-clip-text text-transparent">Logistics Solutions</span>
			</h1>
			
			<p class="text-[#d1c3ca]/90 text-sm lg:text-base leading-relaxed font-light font-body">
				Synchronizing fleet tracking, intelligent warehouse management, and advanced supply chain analytics across Java and Bali operations.
			</p>
			
			<!-- Interactive Capability Stats -->
			<div class="grid grid-cols-2 gap-4 pt-6">
				<div class="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 group cursor-default">
					<div class="flex items-center gap-2.5 mb-1.5">
						<div class="w-8 h-8 rounded-lg bg-[#ffd7f1]/10 flex items-center justify-center text-[#ffd7f1] group-hover:scale-110 transition-transform">
							<span class="material-symbols-outlined text-lg">local_shipping</span>
						</div>
						<span class="text-xl font-bold font-manrope tracking-tight text-white">300+ Units</span>
					</div>
					<span class="text-[11px] text-[#d1c3ca] font-semibold tracking-wide uppercase">Active Fleet</span>
				</div>
				
				<div class="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 group cursor-default">
					<div class="flex items-center gap-2.5 mb-1.5">
						<div class="w-8 h-8 rounded-lg bg-[#ffd7f1]/10 flex items-center justify-center text-[#ffd7f1] group-hover:scale-110 transition-transform">
							<span class="material-symbols-outlined text-lg">warehouse</span>
						</div>
						<span class="text-xl font-bold font-manrope tracking-tight text-white">26+ Hubs</span>
					</div>
					<span class="text-[11px] text-[#d1c3ca] font-semibold tracking-wide uppercase">Strategic Warehouses</span>
				</div>
			</div>
		</div>

		<!-- Footer -->
		<div class="relative z-10 flex items-center justify-between text-xs text-[#d1c3ca]/70 border-t border-white/10 pt-6">
			<p>© 2026 PT Buana Centra Swakarsa. All rights reserved.</p>
			<a href="https://bcsgroup.co.id" target="_blank" rel="noopener noreferrer" class="hover:text-white transition-colors font-medium flex items-center gap-1">
				bcsgroup.co.id
				<span class="material-symbols-outlined text-xs">arrow_outward</span>
			</a>
		</div>
	</section>

	<!-- Right Side: Clean Login Form -->
	<section class="w-full md:w-1/2 lg:w-2/5 min-h-screen bg-surface-container-lowest flex flex-col justify-between p-8 md:p-12 lg:p-16 z-10 shadow-2xl relative">
		<!-- Top Identity & Mobile Logo -->
		<div class="w-full flex flex-col items-center md:items-start">
			<!-- Mobile-Only Logo -->
			<div class="md:hidden bg-white p-3.5 rounded-2xl shadow-md border border-slate-100 max-w-[180px] mb-6 transition-transform active:scale-95">
				<img 
					src="https://bcsgroup.co.id/assets/images/uploads/BCS%20Logistics%20HD.png" 
					alt="PT BCS Logistics Logo" 
					class="w-full h-auto object-contain"
				/>
			</div>
			
			<div class="text-center md:text-left space-y-2.5">
				<span class="inline-block text-[10px] font-extrabold text-primary uppercase tracking-[0.2em] font-manrope bg-primary-fixed/30 text-on-primary-fixed px-3 py-1 rounded-full">
					ERP Core Access
				</span>
				<h2 class="text-3xl font-manrope font-extrabold tracking-tight text-on-surface">Welcome Back</h2>
				<p class="text-on-surface-variant text-sm font-medium">Please authenticate to access your enterprise dashboard.</p>
			</div>
		</div>

		<!-- Main Login Form -->
		<div class="w-full max-w-md mx-auto my-8 md:my-0">
			<form 
				class="space-y-6" 
				method="POST" 
				use:enhance={() => {
					isLoading = true;
					return async ({ result, update }) => {
						isLoading = false;
						if (result.type === 'success') {
							showSuccess = true;
							setTimeout(() => {
								window.location.href = '/';
							}, 1500);
						} else {
							await update();
						}
					};
				}}
			>
				<!-- Error Notification -->
				{#if form?.error}
					<div class="p-4 bg-error-container text-on-error-container rounded-2xl text-xs font-bold flex items-center gap-3 border border-error/20 animate-shake">
						<span class="material-symbols-outlined text-lg">error</span>
						<p class="flex-1 leading-snug">{form.error}</p>
					</div>
				{/if}

				<!-- Email Input -->
				<div class="space-y-2">
					<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider pl-1" for="email">Work Email</label>
					<div class="relative group">
						<span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors text-lg">
							mail
						</span>
						<input 
							class="w-full pl-11 pr-4 py-3.5 bg-surface-container-low border border-transparent rounded-2xl focus:border-primary/30 focus:ring-2 focus:ring-primary/20 text-on-surface placeholder:text-outline/40 transition-all text-sm outline-none font-medium" 
							id="email" 
							name="email"
							placeholder="name@bcs-logistics.co.id" 
							type="email"
							bind:value={email}
							required
						/>
					</div>
				</div>

				<!-- Password Input -->
				<div class="space-y-2">
					<div class="flex justify-between items-center px-1">
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider" for="password">Password</label>
						<a class="text-xs font-bold text-primary hover:text-primary-container transition-colors hover:underline" href="#">Forgot Password?</a>
					</div>
					<div class="relative group">
						<span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors text-lg">
							lock
						</span>
						<input 
							class="w-full pl-11 pr-12 py-3.5 bg-surface-container-low border border-transparent rounded-2xl focus:border-primary/30 focus:ring-2 focus:ring-primary/20 text-on-surface placeholder:text-outline/40 transition-all text-sm outline-none font-medium" 
							id="password" 
							name="password"
							placeholder="••••••••" 
							type={showPassword ? "text" : "password"}
							bind:value={password}
							required
						/>
						<button 
							class="absolute right-3.5 top-1/2 -translate-y-1/2 text-outline hover:text-primary p-1.5 rounded-xl transition-colors" 
							type="button"
							onclick={() => showPassword = !showPassword}
						>
							<span class="material-symbols-outlined text-lg">{showPassword ? 'visibility_off' : 'visibility'}</span>
						</button>
					</div>
				</div>

				<!-- Remember Me Checkbox -->
				<div class="flex items-center px-1">
					<label class="flex items-center gap-2 cursor-pointer text-xs font-semibold text-on-surface-variant hover:text-on-surface transition-colors select-none">
						<input 
							type="checkbox" 
							class="w-4 h-4 rounded-md border-outline-variant bg-surface-container-low text-primary focus:ring-primary/20 transition-all cursor-pointer"
						/>
						Remember this device
					</label>
				</div>

				<!-- Action Button -->
				<button 
					class="w-full py-4 px-6 bg-gradient-to-r from-primary to-primary-container hover:from-primary-container hover:to-primary text-white font-manrope font-bold rounded-2xl shadow-md hover:shadow-lg active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed group cursor-pointer" 
					type="submit"
					disabled={isLoading}
				>
					{#if isLoading}
						<span class="material-symbols-outlined text-lg animate-spin">progress_activity</span>
						<span>Authenticating...</span>
					{:else}
						<span>Sign In to System</span>
						<span class="material-symbols-outlined text-lg group-hover:translate-x-1.5 transition-transform duration-300">arrow_forward</span>
					{/if}
				</button>
			</form>

			<!-- SSO logins removed as requested -->
		</div>

		<!-- Footer -->
		<footer class="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-outline-variant/20">
			<div class="flex items-center gap-6">
				<a class="text-xs font-semibold text-on-surface-variant hover:text-primary flex items-center gap-1.5 transition-colors" href="#">
					<span class="material-symbols-outlined text-sm">verified_user</span>
					Security Info
				</a>
				<div class="w-1 h-1 rounded-full bg-outline-variant"></div>
				<a class="text-xs font-semibold text-on-surface-variant hover:text-primary flex items-center gap-1.5 transition-colors" href="#">
					<span class="material-symbols-outlined text-sm">support_agent</span>
					Help Desk
				</a>
			</div>
			<p class="text-[10px] text-outline font-bold uppercase tracking-wide md:hidden">
				© 2026 PT BCS Logistics
			</p>
		</footer>
	</section>

	<!-- Success Feedback Overlay -->
	{#if showSuccess}
		<div class="fixed inset-0 z-50 bg-[#191c1e]/60 backdrop-blur-md flex items-center justify-center transition-all duration-300">
			<div class="bg-surface-container-lowest p-10 rounded-[32px] shadow-2xl border border-outline-variant/20 text-center max-w-sm transform scale-100 animate-in zoom-in duration-300">
				<div class="w-16 h-16 bg-secondary-container text-on-secondary-container rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm animate-bounce">
					<span class="material-symbols-outlined text-3xl font-extrabold">check_circle</span>
				</div>
				<h2 class="text-2xl font-manrope font-extrabold text-on-surface mb-2">Access Granted</h2>
				<p class="text-on-surface-variant font-medium text-sm">Synchronizing your logistics dashboard...</p>
			</div>
		</div>
	{/if}
</div>

<style>
	.font-manrope { font-family: 'Manrope', sans-serif; }
	.font-body { font-family: 'Inter', sans-serif; }

	@keyframes shake {
		0%, 100% { transform: translateX(0); }
		20%, 60% { transform: translateX(-4px); }
		40%, 80% { transform: translateX(4px); }
	}
	.animate-shake {
		animation: shake 0.4s ease-in-out;
	}
</style>

