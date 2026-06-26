<script lang="ts">
    import { enhance } from '$app/forms';

    let { isOpen = $bindable(false), contract, initialMonthStr, onClose } = $props<{
        isOpen: boolean;
        contract: any;
        initialMonthStr?: string;
        onClose: () => void;
    }>();
    
    let targetMonth = $state('');
    let targetTonnage = $state('');

    // Ketika modal dibuka, reset nilai
    $effect(() => {
        if (isOpen) {
            if (initialMonthStr) {
                targetMonth = initialMonthStr;
            } else {
                // Set default month to current month
                const now = new Date();
                targetMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            }
            targetTonnage = '';
        }
    });

    function close() {
        isOpen = false;
        onClose();
    }
</script>

{#if isOpen && contract}
<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
    <div class="bg-surface rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-surface-container">
        <!-- Header -->
        <div class="px-6 py-5 border-b border-surface-container bg-surface-container-lowest">
            <h3 class="text-xl font-bold text-on-surface">Set Target Bulanan Baru</h3>
            <p class="text-sm text-on-surface-variant mt-1">Kontrak: {contract.project} ({contract.customer})</p>
        </div>

        <form method="POST" action="?/setMonthlyTarget" use:enhance={() => {
            return async ({ update }) => {
                await update({ reset: false });
                close();
            };
        }}>
            <input type="hidden" name="contractId" value={contract.id} />
            
            <div class="p-6 space-y-4">
                <div class="bg-indigo-50 text-indigo-700 p-3 rounded-xl text-xs font-medium border border-indigo-100 mb-4">
                    Target ini akan otomatis dibreakdown menjadi target harian untuk dashboard OCS pada bulan yang dipilih.
                </div>

                <div>
                    <label class="block text-sm font-bold text-on-surface mb-1">Pilih Bulan</label>
                    <input 
                        type="month" 
                        name="targetMonth" 
                        bind:value={targetMonth}
                        required
                        class="w-full bg-surface-container-lowest border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                    />
                </div>

                <div>
                    <label class="block text-sm font-bold text-on-surface mb-1">Target Tonase (Ton)</label>
                    <input 
                        type="number" 
                        step="0.01"
                        name="targetTonnage" 
                        bind:value={targetTonnage}
                        required
                        placeholder="Contoh: 25000"
                        class="w-full bg-surface-container-lowest border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                    />
                </div>
            </div>

            <!-- Footer / Actions -->
            <div class="px-6 py-4 bg-surface-container-lowest border-t border-surface-container flex items-center justify-end gap-3">
                <button type="button" class="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors" on:click={close}>
                    Batal
                </button>
                <button type="submit" class="px-5 py-2 text-sm font-bold text-white bg-primary hover:bg-primary/90 shadow-sm shadow-primary/30 rounded-xl transition-all">
                    Simpan Target
                </button>
            </div>
        </form>
    </div>
</div>
{/if}
