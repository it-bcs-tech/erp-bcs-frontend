<script lang="ts">
	import HrisAssessmentsPage from '../hris/assessments/+page.svelte';

	let { data } = $props();

	const currentUser = $derived((data as any).currentUser);
	const activeAssessors = $derived((data as any).activeAssessors || []);

	const isAdmin = $derived(
		currentUser && (
			['superadmin', 'administrator', 'superhyperadmin', 'super_admin'].includes(currentUser.role?.toLowerCase()) ||
			currentUser.role?.toLowerCase()?.includes('admin') ||
			currentUser.email === 'superhyperadmin@bcs-logistics.co.id'
		)
	);

	const isUserAssessor = $derived(
		activeAssessors.some((a: any) => a.payrollId === currentUser?.payrollId)
	);
</script>

<svelte:head>
	<title>Portal Penilaian Kompetensi Tim • ERP BCS</title>
</svelte:head>

<main class="min-h-[calc(100vh-64px)] bg-surface py-6 px-4 sm:px-6 lg:px-8">
	<div class="max-w-7xl mx-auto space-y-6">
		{#if !isAdmin && !isUserAssessor}
			<!-- Friendly Empty State jika bukan atasan & bukan admin -->
			<div class="p-12 text-center rounded-3xl bg-surface-container border border-slate-200/60 dark:border-slate-800/60 space-y-4 max-w-lg mx-auto my-12 shadow-sm">
				<div class="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-2">
					<span class="material-symbols-outlined text-4xl">supervisor_account</span>
				</div>
				<div class="space-y-1">
					<h3 class="font-black text-lg text-on-surface">Portal Penilaian Kompetensi Tim</h3>
					<p class="text-xs text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider">Khusus Atasan Langsung</p>
				</div>
				<p class="text-xs text-on-surface-variant leading-relaxed">
					Akun Anda <strong>{currentUser?.name || 'Pengguna'}</strong> ({currentUser?.titleName || 'Staff'}) saat ini belum terdaftar memiliki bawahan langsung dalam struktur hierarki organisasi PT Buana Centra Swakarsa.
				</p>
				<p class="text-[11px] text-slate-400 leading-relaxed">
					Jika Anda merupakan supervisor yang membawahi anggota tim kerja, silakan hubungi tim HRD atau Administrator Sistem untuk memperbarui struktur atasan-bawahan Anda.
				</p>
				<div class="pt-2">
					<a
						href="/"
						class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-xs hover:opacity-90 transition-all"
					>
						<span class="material-symbols-outlined text-sm">home</span>
						<span>Kembali ke Beranda</span>
					</a>
				</div>
			</div>
		{:else}
			<HrisAssessmentsPage {data} />
		{/if}
	</div>
</main>
