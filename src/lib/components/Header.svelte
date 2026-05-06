<script lang="ts">
	async function handleLogout() {
		// Mengirim request ke server-side endpoint untuk menghapus httpOnly cookie
		const response = await fetch('/logout', { method: 'POST' });
		if (response.redirected) {
			window.location.href = response.url;
		} else {
			window.location.href = '/login';
		}
	}
</script>

<header class="bg-slate-50/70 dark:bg-slate-900/70 backdrop-blur-xl docked full-width top-0 sticky z-50 flex justify-between items-center w-full px-6 py-3">
	<div class="flex items-center gap-8">
		<div class="text-xl font-bold text-[#57344f] dark:text-[#d1c3ca]">
		<img src="https://bcsgroup.co.id/assets/images/uploads/BCS%20Logistics%20HD.png" width="200" alt="" srcset="">
		</div>
		<nav class="hidden md:flex items-center gap-6">
			<a class="text-[#57344f] font-bold border-b-2 border-[#57344f] pb-1 text-sm" href="/">Main Dashboard</a>
			<a class="text-slate-500 dark:text-slate-400 hover:text-[#57344f] transition-colors text-sm" href="#">System Admin</a>
			<a class="text-slate-500 dark:text-slate-400 hover:text-[#57344f] transition-colors text-sm" href="#">Reports</a>
		</nav>
	</div>
	<div class="flex items-center gap-2">
		<div class="relative mr-4 hidden md:block">
			<span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">search</span>
			<input class="bg-surface-container-low border-none rounded-full py-1.5 pl-10 pr-4 text-sm w-64 focus:ring-2 focus:ring-primary/20 placeholder:text-on-surface-variant" placeholder="Search modules..." type="text"/>
		</div>
		<button class="p-2 text-slate-500 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-lg transition-all">
			<span class="material-symbols-outlined">notifications</span>
		</button>
		<button class="p-2 text-slate-500 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-lg transition-all">
			<span class="material-symbols-outlined">apps</span>
		</button>
		<button onclick={handleLogout} title="Logout" class="p-2 text-red-500 hover:bg-red-100/50 dark:hover:bg-red-900/50 rounded-lg transition-all">
			<span class="material-symbols-outlined">logout</span>
		</button>
		<div class="ml-2 w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center border-2 border-surface-container-highest overflow-hidden">
			<span class="material-symbols-outlined text-on-primary-fixed text-[18px]">person</span>
		</div>
	</div>
</header>
