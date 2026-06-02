import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
    // Mock data untuk Master Kontrak (PO)
    const contracts = [
        {
            id: 'PO-2026-05-001',
            customer: 'PT Indofood CBP',
            origin: 'Jakarta (Sunter)',
            destination: 'Surabaya (Rungkut)',
            startDate: '2026-05-01',
            endDate: '2026-05-31',
            targetTonnage: 500, // in tons
            deliveredTonnage: 320, // in tons
            tariffPerTon: 450000, // Rp
            fixedUjo: 2500000, // Rp (UJO Tetap)
            status: 'Active',
            notes: 'Prioritas unit Wingbox'
        },
        {
            id: 'PO-2026-05-002',
            customer: 'PT Mayora Indah',
            origin: 'Tangerang (Cikupa)',
            destination: 'Semarang (Krapyak)',
            startDate: '2026-05-10',
            endDate: '2026-06-10',
            targetTonnage: 1000,
            deliveredTonnage: 1000,
            tariffPerTon: 350000,
            fixedUjo: 1800000,
            status: 'Completed',
            notes: 'Rutin setiap pagi'
        },
        {
            id: 'PO-2026-05-003',
            customer: 'PT Unilever Indonesia',
            origin: 'Bekasi (Cikarang)',
            destination: 'Bandung (Cimareme)',
            startDate: '2026-05-20',
            endDate: '2026-06-20',
            targetTonnage: 300,
            deliveredTonnage: 50,
            tariffPerTon: 150000,
            fixedUjo: 800000,
            status: 'Active',
            notes: 'Sopir wajib safety induction'
        }
    ];

    return {
        contracts
    };
};
