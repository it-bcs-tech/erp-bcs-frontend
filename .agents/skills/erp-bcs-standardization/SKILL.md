---
name: ErpBcsStandardization
description: Digunakan sebagai panduan wajib untuk standarisasi desain UI/UX, arsitektur Svelte 5 runes, integrasi backend Laravel, koneksi database PostgreSQL, dan alur pembuatan modul baru pada ERP BCS.
---

# Panduan Standarisasi Modul ERP BCS

Gunakan panduan ini setiap kali membuat, memodifikasi, atau merestrukturisasi modul pada aplikasi **ERP BCS (Frontend & Backend)** agar seluruh halaman memiliki arsitektur, pola kode, dan tampilan visual yang seragam (*consistent standard*).

---

## 1. Arsitektur Struktur Modul (`src/routes/<module>/`)

Setiap modul ERP (misal: `hris`, `pms`, `dms`, `finance`, `fms`, `ocs`, `marketing`, `maintenance`) harus memiliki struktur direktori terstandarisasi:

```
src/routes/<module>/
├── +layout.svelte             # Sidebar navigasi flat, grouping menu, chatbot, dan admin status badge
├── +page.server.ts            # Server load untuk dashboard overview (metrics & data awal)
├── +page.svelte               # Dashboard visual modul (KPI metric cards, charts, recent activities)
├── master/                    # Sub-rute data master (kategori, vendor, COA, akun, dll.)
│   └── <entity>/+page.svelte
├── transactions/              # Sub-rute transaksi utama (PR, PO, Invoices, Payment, SPKL, dll.)
│   ├── <entity>/+page.svelte
│   └── <entity>/create/+page.svelte
└── reports/ / analytics/      # Sub-rute analitik, riwayat & laporan
```

---

## 2. Standar Sidebar & Layout (`+layout.svelte`)

Layout modul wajib mematuhi aturan visual berikut:
1. **Gaya Flat (Tanpa Shadow Kotak Berlebihan):**
   * Item navigasi aktif menggunakan `bg-surface-container-highest text-primary font-bold`.
   * Item non-aktif menggunakan `text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium text-sm`.
   * **Hindari `shadow-sm` / `shadow-md`** pada tombol item navigasi sidebar.
2. **Kategorisasi Menu yang Jelas:**
   * Kelompokkan menu dengan header kategori kecil:
     ```svelte
     <div class="pt-3 pb-1 px-4">
         <p class="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">Kategori Menu</p>
     </div>
     ```
3. **Canvas Wrapper Standar:**
   ```svelte
   <main class="flex-1 h-full overflow-y-auto p-8 bg-surface">
       <div class="max-w-7xl mx-auto space-y-6">
           {@render children?.()}
       </div>
   </main>
   ```
4. **Indikator Sumber Data Khusus Admin:**
   * Jika pengguna ber-role Admin (`superadmin`, `administrator`, dll.), tampilkan bar status sumber data di bagian atas kanvas:
     * `🟢 Backend: Laravel API v1 (Live Connection)` (untuk fitur terhubung Laravel).
     * `🟠 Data Source: Direct Database / Standalone` (untuk fitur direct DB/mock).
   * Sembunyikan sepenuhnya untuk pengguna non-admin.

---

## 3. Standar Svelte 5 Runes & State Management

Seluruh komponen baru wajib ditulis menggunakan **Svelte 5 Runes** (bukan sintaks Svelte 3/4 `$:` atau `export let`):

* **Props:** `let { data, children } = $props();`
* **Reactive State:** `let searchQuery = $state('');`, `let isModalOpen = $state(false);`
* **Derived State:** `let filteredItems = $derived(items.filter(...));`
* **Side Effects / Listeners:** `$effect(() => { ... });`

---

## 4. Standar UI Elements & Design Tokens

### A. Kartu Metrik / Statistik (KPI Cards)
```svelte
<div class="p-6 rounded-2xl bg-surface-container-lowest border border-slate-200/70 dark:border-slate-800/70 transition-all hover:border-primary/30">
    <div class="flex items-center justify-between mb-3">
        <span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Judul Metrik</span>
        <div class="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <span class="material-symbols-outlined text-[20px]">analytics</span>
        </div>
    </div>
    <div class="text-2xl font-black text-on-surface">Rp 125.000.000</div>
    <p class="text-xs text-emerald-600 font-bold mt-1 flex items-center gap-1">
        <span class="material-symbols-outlined text-[14px]">trending_up</span> +12% dari bulan lalu
    </p>
</div>
```

### B. Status Badges
* **Success / Approved / Active:** `bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800`
* **Pending / In Review / Transit:** `bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800`
* **Danger / Rejected / Critical:** `bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800`
* **Draft / Neutral / Standby:** `bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700`

### C. Input Field & Filter Bar
```svelte
<div class="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-surface-container-low border border-slate-200 dark:border-slate-800 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary">
    <span class="material-symbols-outlined text-on-surface-variant text-[20px]">search</span>
    <input type="text" bind:value={searchQuery} placeholder="Cari data..." class="bg-transparent text-sm text-on-surface outline-none w-full placeholder:text-on-surface-variant/50" />
</div>
```

---

## 5. Standar Integrasi Backend & Database

1. **Endpoint Laravel API (`apiFetch`):**
   * Gunakan `apiFetch<T>` dari `$lib/utils/api` untuk setiap panggilan ke Laravel backend.
   * Selalu sertakan `authToken` dari cookie session pengguna (`cookies.get('auth_token')`).
2. **Kueri Direct PostgreSQL (`sql`):**
   * Gunakan tagged template literal `sql` dari `$lib/server/db` untuk modul internal/direct DB.
   * Selalu gunakan parameterized query untuk mencegah SQL Injection (`sql`WHERE id = ${id}``).
3. **Pemberitahuan Error & Logging:**
   * Gunakan `logError` dari `$lib/utils/logger` saat terjadi kegagalan API/database.
   * Hindari silent fallback yang menutupi error pada rute yang sudah memiliki kontrak API resmi di Laravel.

---

## 6. Alur Verifikasi & Deploy (GitDeployWorkflow)

Sebelum perubahan kode diserahkan atau dideploy ke server produksi:
1. **Lakukan Build Test:** Jalankan `npm run build` dan pastikan hasil kompilasi **0 error**.
2. **Conventional Commit:** Gunakan prefix standar (`feat(modul): ...`, `fix(modul): ...`, `style(modul): ...`).
3. **Push & Monitor Actions:** Lakukan `git push origin master` dan pantau deployment GitHub Actions menggunakan `gh run watch`.
