<script lang="ts">
	import { enhance } from '$app/forms';
	import { spawnToast } from '$lib/stores/notifications';
	import { ALL_MODULES } from '$lib/types/auth';

	let { data, form } = $props();

	// Modals State
	let showAddModal = $state(false);
	let showEditModal = $state(false);
	
	// Live Search State
	let searchQuery = $state('');
	let searchResults = $state<any[]>([]);
	let isSearching = $state(false);
	
	// Selected User for Add
	let selectedKaryawan = $state<any>(null);
	
	// Edit Modal State
	let editUser = $state<any>(null);
	let editSelectedModules = $state<string[]>([]);

	// New User Form State
	let newSelectedModules = $state<string[]>([]);

	// Define role list
	const availableRoles = [
		'superadmin', 'administrator', 'operator_fms', 'admin_fms', 'operator_ocs', 
		'staff_finance', 'admin_finance', 'staff_hr', 'manager_hr', 
		'staff_marketing', 'staff_procurement', 'staff_dms', 'staff_qhse', 'user'
	];

	$effect(() => {
		if (form) {
			if (form.success) {
				spawnToast({
					id: Date.now().toString(),
					title: 'Success',
					message: form.message,
					type: 'INFO',
					timestamp: new Date().toISOString()
				});
				closeModals();
			} else if (form.message) {
				spawnToast({
					id: Date.now().toString(),
					title: 'Error',
					message: form.message,
					type: 'CRITICAL',
					timestamp: new Date().toISOString()
				});
			}
		}
	});

	function closeModals() {
		showAddModal = false;
		showEditModal = false;
		selectedKaryawan = null;
		searchQuery = '';
		searchResults = [];
		newSelectedModules = [];
	}

	function openEditModal(user: any) {
		editUser = { ...user };
		try {
			// Parse JSON modules
			if (typeof user.allowed_modules === 'string') {
				editSelectedModules = JSON.parse(user.allowed_modules);
			} else {
				editSelectedModules = user.allowed_modules || [];
			}
		} catch {
			editSelectedModules = [];
		}
		showEditModal = true;
	}

	let searchTimeout: any;
	function handleSearchInput() {
		clearTimeout(searchTimeout);
		if (searchQuery.length < 3) {
			searchResults = [];
			return;
		}

		isSearching = true;
		searchTimeout = setTimeout(async () => {
			try {
				const res = await fetch(`/api/karyawan/search?q=${encodeURIComponent(searchQuery)}`);
				if (res.ok) {
					searchResults = await res.json();
				}
			} catch (e) {
				console.error(e);
			} finally {
				isSearching = false;
			}
		}, 400);
	}

	function selectKaryawan(emp: any) {
		selectedKaryawan = emp;
		searchQuery = emp.nama_karyawan;
		searchResults = [];
	}

	function toggleNewModule(mod: string) {
		if (newSelectedModules.includes(mod)) {
			newSelectedModules = newSelectedModules.filter(m => m !== mod);
		} else {
			newSelectedModules = [...newSelectedModules, mod];
		}
	}

	function toggleEditModule(mod: string) {
		if (editSelectedModules.includes(mod)) {
			editSelectedModules = editSelectedModules.filter(m => m !== mod);
		} else {
			editSelectedModules = [...editSelectedModules, mod];
		}
	}
</script>

<div class="px-6 py-8 max-w-7xl mx-auto min-h-screen">
	<div class="flex justify-between items-end mb-8">
		<div>
			<h1 class="text-3xl font-extrabold text-on-surface tracking-tight">User Management</h1>
			<p class="text-sm text-on-surface-variant font-medium mt-1">Manage ERP access, roles, and modular permissions.</p>
		</div>
		<div class="flex items-center gap-3">
			<span class="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full {data.dataSource === 'laravel' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}">
				<span class="w-1.5 h-1.5 rounded-full {data.dataSource === 'laravel' ? 'bg-emerald-500' : 'bg-amber-500'}"></span>
				{data.dataSource === 'laravel' ? 'Laravel API' : 'Svelte Fallback'}
			</span>
			<button 
				onclick={() => showAddModal = true}
				class="bg-primary text-on-primary px-5 py-2.5 rounded-full font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 transform active:scale-95"
			>
				<span class="material-symbols-outlined text-sm">person_add</span>
				Add New User
			</button>
		</div>
	</div>

	<!-- Users Table -->
	<div class="bg-surface-container-lowest rounded-3xl shadow-sm border border-surface-container overflow-hidden">
		<div class="overflow-x-auto">
			<table class="w-full text-left border-collapse">
				<thead>
					<tr class="bg-surface-container-low text-on-surface border-b border-surface-container">
						<th class="py-4 px-6 font-bold text-xs uppercase tracking-wider">User Info</th>
						<th class="py-4 px-6 font-bold text-xs uppercase tracking-wider">Role & Access</th>
						<th class="py-4 px-6 font-bold text-xs uppercase tracking-wider">Status</th>
						<th class="py-4 px-6 font-bold text-xs uppercase tracking-wider text-right">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-surface-container">
					{#each data.usersList as user}
						<tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
							<td class="py-4 px-6">
								<div class="flex items-center gap-3">
									<div class="w-10 h-10 rounded-full bg-primary-container text-on-primary-container font-bold flex items-center justify-center flex-shrink-0 text-sm">
										{user.nama_karyawan ? user.nama_karyawan[0] : user.email[0].toUpperCase()}
									</div>
									<div>
										<p class="font-bold text-sm text-on-surface">{user.nama_karyawan || 'External User'}</p>
										<p class="text-xs text-on-surface-variant">{user.email}</p>
										{#if user.div_name}
											<p class="text-[10px] text-primary font-bold uppercase tracking-wider mt-0.5">{user.div_name}</p>
										{/if}
									</div>
								</div>
							</td>
							<td class="py-4 px-6">
								<span class="inline-block px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold rounded-md mb-1 uppercase tracking-wider">
									{user.erp_role}
								</span>
								<p class="text-xs text-on-surface-variant line-clamp-1 max-w-[200px]">
									Custom: 
									{#if Array.isArray(user.allowed_modules)}
										{user.allowed_modules.includes('*') ? 'ALL MODULES' : (user.allowed_modules.join(', ') || 'None')}
									{:else if typeof user.allowed_modules === 'string'}
										{(() => {
											try {
												const parsed = JSON.parse(user.allowed_modules);
												return parsed.includes('*') ? 'ALL MODULES' : (parsed.join(', ') || 'None');
											} catch {
												return 'None';
											}
										})()}
									{:else}
										None
									{/if}
								</p>
							</td>
							<td class="py-4 px-6">
								<div class="flex items-center gap-1.5">
									<div class="w-2 h-2 rounded-full {user.is_active ? 'bg-emerald-500' : 'bg-red-500'}"></div>
									<span class="text-xs font-bold {user.is_active ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}">
										{user.is_active ? 'Active' : 'Inactive'}
									</span>
								</div>
								{#if user.last_login_at}
									<p class="text-[10px] text-on-surface-variant mt-1">
										Last: {new Date(user.last_login_at).toLocaleDateString()}
									</p>
								{/if}
							</td>
							<td class="py-4 px-6 text-right">
								<div class="flex items-center justify-end gap-2">
									<button 
										onclick={() => openEditModal(user)}
										class="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
										title="Edit User"
									>
										<span class="material-symbols-outlined text-sm">edit</span>
									</button>
									<form method="POST" action="?/toggleStatus" use:enhance>
										<input type="hidden" name="id" value={user.id} />
										<input type="hidden" name="current_status" value={user.is_active} />
										<button 
											type="submit"
											class="p-2 {user.is_active ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'} rounded-lg transition-colors"
											title={user.is_active ? 'Deactivate' : 'Activate'}
										>
											<span class="material-symbols-outlined text-sm">{user.is_active ? 'block' : 'check_circle'}</span>
										</button>
									</form>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
			{#if data.usersList.length === 0}
				<div class="p-8 text-center text-on-surface-variant">
					<span class="material-symbols-outlined text-4xl mb-2 opacity-50">group_off</span>
					<p class="font-medium">No users found.</p>
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- ======================= -->
<!-- ADD USER MODAL -->
<!-- ======================= -->
{#if showAddModal}
	<div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
		<div class="bg-surface-container-lowest rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
			<div class="p-6 border-b border-surface-container flex justify-between items-center bg-surface-container-low/50">
				<div>
					<h2 class="text-xl font-bold text-on-surface">Add New User</h2>
					<p class="text-xs text-on-surface-variant mt-0.5">Register a new employee to the ERP system.</p>
				</div>
				<button onclick={closeModals} class="p-2 hover:bg-surface-container rounded-full transition-colors">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<div class="p-6 overflow-y-auto flex-1">
				<form method="POST" action="?/create" use:enhance class="space-y-5">
					<!-- Hidden inputs for array data -->
					<input type="hidden" name="allowed_modules" value={JSON.stringify(newSelectedModules)} />
					<input type="hidden" name="karyawan_id" value={selectedKaryawan?.id || ''} />

					<!-- Live Search -->
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Search Employee</label>
						<div class="relative">
							<input 
								type="text" 
								bind:value={searchQuery}
								oninput={handleSearchInput}
								placeholder="Type name or NIK to search..." 
								class="w-full bg-surface-container border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50"
							/>
							{#if isSearching}
								<span class="absolute right-3 top-2.5 material-symbols-outlined text-on-surface-variant animate-spin text-sm">progress_activity</span>
							{/if}

							<!-- Dropdown -->
							{#if searchResults.length > 0}
								<div class="absolute w-full mt-1 bg-surface-container-lowest border border-surface-container rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
									{#each searchResults as emp}
										<button 
											type="button"
											onclick={() => selectKaryawan(emp)}
											class="w-full text-left px-4 py-3 hover:bg-surface-container-low border-b border-surface-container last:border-0"
										>
											<p class="font-bold text-sm text-on-surface">{emp.nama_karyawan} <span class="text-xs font-normal text-on-surface-variant ml-2">{emp.nik}</span></p>
											<p class="text-[10px] text-primary font-bold uppercase mt-1">{emp.div_name} — {emp.level_name}</p>
										</button>
									{/each}
								</div>
							{/if}
						</div>
						{#if selectedKaryawan}
							<p class="text-xs text-emerald-600 font-bold mt-2 flex items-center gap-1">
								<span class="material-symbols-outlined text-[14px]">check_circle</span>
								Employee Linked
							</p>
						{/if}
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Email (Login)</label>
							<input type="email" name="email" required value={selectedKaryawan?.email || ''} class="w-full bg-surface-container border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm" />
						</div>
						<div>
							<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Initial Password</label>
							<input type="password" name="password" required class="w-full bg-surface-container border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm" />
						</div>
					</div>

					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">ERP Role</label>
						<select name="role" required class="w-full bg-surface-container border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm">
							<option value="">-- Select Role --</option>
							{#each availableRoles as r}
								<option value={r}>{r}</option>
							{/each}
						</select>
					</div>

					<!-- Custom Modules -->
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Module Exceptions (Optional)</label>
						<p class="text-[10px] text-on-surface-variant mb-3 leading-tight">By default, access is determined by Role. Check modules below ONLY if you want to grant specific extra access.</p>
						
						<div class="grid grid-cols-3 gap-2">
							<button 
								type="button" 
								onclick={() => toggleNewModule('*')}
								class="px-3 py-2 border rounded-lg text-xs font-bold transition-all text-center {newSelectedModules.includes('*') ? 'bg-primary text-on-primary border-primary' : 'border-slate-300 dark:border-slate-700 text-on-surface-variant hover:bg-surface-container'}"
							>
								* (All Modules)
							</button>
							{#each ALL_MODULES as mod}
								<button 
									type="button" 
									onclick={() => toggleNewModule(mod)}
									class="px-3 py-2 border rounded-lg text-xs font-bold transition-all uppercase {newSelectedModules.includes(mod) ? 'bg-primary-container text-on-primary-container border-primary' : 'border-slate-300 dark:border-slate-700 text-on-surface hover:bg-surface-container'}"
								>
									{mod}
								</button>
							{/each}
						</div>
					</div>

					<div class="pt-4 border-t border-surface-container flex justify-end gap-3">
						<button type="button" onclick={closeModals} class="px-5 py-2.5 rounded-full font-bold text-on-surface-variant hover:bg-surface-container transition-colors text-sm">
							Cancel
						</button>
						<button type="submit" class="bg-primary text-on-primary px-6 py-2.5 rounded-full font-bold shadow-md hover:shadow-lg transition-all text-sm">
							Save User
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}


<!-- ======================= -->
<!-- EDIT USER MODAL -->
<!-- ======================= -->
{#if showEditModal && editUser}
	<div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
		<div class="bg-surface-container-lowest rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
			<div class="p-6 border-b border-surface-container flex justify-between items-center bg-surface-container-low/50">
				<div>
					<h2 class="text-xl font-bold text-on-surface">Edit User</h2>
					<p class="text-xs text-on-surface-variant mt-0.5">{editUser.email}</p>
				</div>
				<button onclick={closeModals} class="p-2 hover:bg-surface-container rounded-full transition-colors">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<div class="p-6 overflow-y-auto flex-1">
				<form method="POST" action="?/update" use:enhance class="space-y-5">
					<input type="hidden" name="id" value={editUser.id} />
					<input type="hidden" name="allowed_modules" value={JSON.stringify(editSelectedModules)} />

					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">ERP Role</label>
						<select name="role" required class="w-full bg-surface-container border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm" bind:value={editUser.erp_role}>
							{#each availableRoles as r}
								<option value={r}>{r}</option>
							{/each}
						</select>
					</div>

					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Reset Password (Optional)</label>
						<input type="password" name="reset_password" placeholder="Leave blank to keep current password" class="w-full bg-surface-container border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm" />
					</div>

					<!-- Custom Modules -->
					<div>
						<label class="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Module Exceptions (Optional)</label>
						<p class="text-[10px] text-on-surface-variant mb-3 leading-tight">Check modules below ONLY if you want to grant specific extra access outside their role.</p>
						
						<div class="grid grid-cols-3 gap-2">
							<button 
								type="button" 
								onclick={() => toggleEditModule('*')}
								class="px-3 py-2 border rounded-lg text-xs font-bold transition-all text-center {editSelectedModules.includes('*') ? 'bg-primary text-on-primary border-primary' : 'border-slate-300 dark:border-slate-700 text-on-surface-variant hover:bg-surface-container'}"
							>
								* (All Modules)
							</button>
							{#each ALL_MODULES as mod}
								<button 
									type="button" 
									onclick={() => toggleEditModule(mod)}
									class="px-3 py-2 border rounded-lg text-xs font-bold transition-all uppercase {editSelectedModules.includes(mod) ? 'bg-primary-container text-on-primary-container border-primary' : 'border-slate-300 dark:border-slate-700 text-on-surface hover:bg-surface-container'}"
								>
									{mod}
								</button>
							{/each}
						</div>
					</div>

					<div class="pt-4 border-t border-surface-container flex justify-end gap-3">
						<button type="button" onclick={closeModals} class="px-5 py-2.5 rounded-full font-bold text-on-surface-variant hover:bg-surface-container transition-colors text-sm">
							Cancel
						</button>
						<button type="submit" class="bg-blue-600 text-white px-6 py-2.5 rounded-full font-bold shadow-md hover:shadow-lg transition-all text-sm">
							Update User
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}
