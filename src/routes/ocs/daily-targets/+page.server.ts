import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';

const sql = postgres(env.DATABASE_URL || 'postgres://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db');

export const load: PageServerLoad = async () => {
    try {
        // Ambil kontrak aktif dan kapasitas master
        const contracts = await sql`
            SELECT 
                c.id,
                cust.nama_kustomer as customer,
                p.project_name as project,
                c.target_tonnage as "targetTonnage",
                COALESCE(c.delivered_tonnage, 0) as "deliveredTonnage",
                c.target_days,
                c.unit_capacity,
                c.trips_per_day,
                c.daily_target_tonnage,
                c.daily_target_ritase,
                c.units_needed_per_day,
                COALESCE(tu.kapasitas_tonase, 25) as master_capacity,
                tu.nama_tipe as unit_type
            FROM marketing.contract c
            LEFT JOIN master.m_customer cust ON cust.id = c.customer_id
            LEFT JOIN master.m_project p ON p.id = c.project_id
            LEFT JOIN master.m_rute_ujo ru ON ru.id = c.master_rute_id
            LEFT JOIN master.m_tipe_unit tu ON tu.id = ru.tipe_unit_id
            WHERE c.status = 'Active'
            ORDER BY c.created_at DESC
        `;

        return { contracts };
    } catch (e: any) {
        console.error('Error fetching contracts for daily targets:', e);
        return { contracts: [] };
    }
};

export const actions: Actions = {
    setTarget: async ({ request }) => {
        const formData = await request.formData();
        const contractId = formData.get('contractId')?.toString();
        const targetDays = Number(formData.get('targetDays'));
        const unitCapacity = Number(formData.get('unitCapacity'));
        const tripsPerDay = Number(formData.get('tripsPerDay'));
        const dailyTargetTonnage = Number(formData.get('dailyTargetTonnage'));
        const dailyTargetRitase = Number(formData.get('dailyTargetRitase'));
        const unitsNeededPerDay = Number(formData.get('unitsNeededPerDay'));

        if (!contractId || !targetDays || !unitCapacity || !tripsPerDay) {
            return fail(400, { error: 'Semua field parameter wajib diisi.' });
        }

        try {
            await sql`
                UPDATE marketing.contract
                SET 
                    target_days = ${targetDays},
                    unit_capacity = ${unitCapacity},
                    trips_per_day = ${tripsPerDay},
                    daily_target_tonnage = ${dailyTargetTonnage},
                    daily_target_ritase = ${dailyTargetRitase},
                    units_needed_per_day = ${unitsNeededPerDay}
                WHERE id = ${contractId}
            `;
            return { success: true };
        } catch (e: any) {
            console.error('Error setting daily target:', e);
            return fail(500, { error: 'Gagal menyimpan target harian. Silakan coba lagi.' });
        }
    }
};
