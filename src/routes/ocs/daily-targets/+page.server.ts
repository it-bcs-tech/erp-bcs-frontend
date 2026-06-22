import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';

const sql = postgres(env.DATABASE_URL || 'postgres://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db');

export const load: PageServerLoad = async ({ url }) => {
    const selectedContractId = url.searchParams.get('contract') || null;

    try {
        const contracts = await sql`
            SELECT 
                c.id,
                cust.nama_kustomer as customer,
                p.project_name as project,
                c.target_tonnage as "targetTonnage",
                COALESCE(c.delivered_tonnage, 0) as "deliveredTonnage",
                c.start_date as "startDate",
                c.end_date as "endDate",
                c.target_days,
                c.unit_capacity,
                c.trips_per_day,
                c.daily_target_tonnage,
                c.daily_target_ritase,
                c.units_needed_per_day,
                COALESCE(tu.kapasitas_tonase, 35) as master_capacity,
                tu.nama_tipe as unit_type
            FROM marketing.contract c
            LEFT JOIN master.m_customer cust ON cust.id = c.customer_id
            LEFT JOIN master.m_project p ON p.id = c.project_id
            LEFT JOIN master.m_rute_ujo ru ON ru.id = c.master_rute_id
            LEFT JOIN master.m_tipe_unit tu ON tu.id = ru.tipe_unit_id
            WHERE c.status = 'Active'
            ORDER BY c.created_at DESC
        `;

        let dailyPlans: any[] = [];
        if (selectedContractId) {
            dailyPlans = await sql`
                SELECT id, contract_id, plan_date, target_tonnage, target_ritase, target_units, notes
                FROM operations.contract_daily_plan
                WHERE contract_id = ${selectedContractId}
                ORDER BY plan_date ASC
            `;
        }

        // Ambil data dispatch (unit & driver) untuk kontrak yang dipilih
        let dispatches: any[] = [];
        if (selectedContractId) {
            dispatches = await sql`
                SELECT 
                    t.tgl_trip::date as trip_date,
                    u.nomor_unit as unit,
                    COALESCE(mk.nama_karyawan, 'No Driver') as driver,
                    t.status,
                    o.berat_muatan as tonnage
                FROM fleet.trip t
                JOIN fleet.unit u ON u.id = t.unit_id
                JOIN marketing.sales_order o ON o.assigned_unit_id = t.unit_id AND o.contract_id = ${selectedContractId}
                LEFT JOIN master.m_drivers md ON md.id = t.driver_id
                LEFT JOIN master.m_karyawan mk ON mk.id = md.karyawan_id
                WHERE o.contract_id = ${selectedContractId}
                  AND t.status NOT IN ('CANCELED')
                ORDER BY t.tgl_trip ASC
            `;
        }

        return { contracts, dailyPlans, dispatches, selectedContractId };
    } catch (e: any) {
        console.error('Error fetching contracts for daily targets:', e);
        return { contracts: [], dailyPlans: [], dispatches: [], selectedContractId: null };
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
    },

    generatePlan: async ({ request }) => {
        const formData = await request.formData();
        const contractId = formData.get('contractId')?.toString();

        if (!contractId) return fail(400, { error: 'Contract ID diperlukan.' });

        try {
            // Ambil data kontrak
            const [contract] = await sql`
                SELECT target_tonnage, start_date, end_date, unit_capacity, trips_per_day, units_needed_per_day
                FROM marketing.contract WHERE id = ${contractId}
            `;

            if (!contract) return fail(404, { error: 'Kontrak tidak ditemukan.' });

            const startDate = new Date(contract.start_date);
            const endDate = new Date(contract.end_date);
            const totalTonnage = Number(contract.target_tonnage);
            const unitCapacity = Number(contract.unit_capacity) || 35;
            const tripsPerDay = Number(contract.trips_per_day) || 2;
            const unitsNeeded = Number(contract.units_needed_per_day) || 1;

            // Hitung semua hari aktif dalam range kontrak (termasuk Minggu)
            const workDays: string[] = [];
            const current = new Date(startDate);
            while (current <= endDate) {
                // Konversi aman tanpa terpengaruh zona waktu
                const year = current.getFullYear();
                const month = String(current.getMonth() + 1).padStart(2, '0');
                const day = String(current.getDate()).padStart(2, '0');
                workDays.push(`${year}-${month}-${day}`);
                current.setDate(current.getDate() + 1);
            }

            if (workDays.length === 0) return fail(400, { error: 'Tidak ada hari kerja dalam rentang kontrak.' });

            // Rebalance / generate secara sekuensial (Isi penuh maju)
            let remainingTonnage = totalTonnage;
            const defDailyTonnage = Number(contract.daily_target_tonnage) || (unitsNeeded * tripsPerDay * unitCapacity) || 40;

            const plans = workDays.map(dateStr => {
                let assignTonnage = 0;
                let assignRitase = 0;
                let assignUnits = 0;

                if (remainingTonnage > 0) {
                    assignTonnage = Math.min(remainingTonnage, defDailyTonnage);
                    // Gunakan trips_per_day (Ritase) dari kontrak, atau hitung proporsional
                    assignRitase = assignTonnage >= defDailyTonnage ? tripsPerDay : Math.ceil(assignTonnage / unitCapacity);
                    assignUnits = assignTonnage > 0 ? unitsNeeded : 0;
                    remainingTonnage -= assignTonnage;
                }

                return {
                    contract_id: contractId,
                    plan_date: dateStr,
                    target_tonnage: assignTonnage,
                    target_ritase: assignRitase,
                    target_units: assignUnits
                };
            });

            // Hapus plan lama
            await sql`DELETE FROM operations.contract_daily_plan WHERE contract_id = ${contractId}`;

            // Batch insert
            for (let i = 0; i < plans.length; i += 50) {
                const batch = plans.slice(i, i + 50);
                await sql`
                    INSERT INTO operations.contract_daily_plan ${sql(batch, 'contract_id', 'plan_date', 'target_tonnage', 'target_ritase', 'target_units')}
                `;
            }

            return { generateSuccess: true, contractId };
        } catch (e: any) {
            console.error('Error generating daily plan:', e);
            return fail(500, { error: 'Gagal generate planning harian.' });
        }
    },

    updateDayPlan: async ({ request }) => {
        const formData = await request.formData();
        const contractId = formData.get('contractId')?.toString();
        const planDate = formData.get('planDate')?.toString();
        const targetTonnage = Number(formData.get('targetTonnage') || 0);
        const targetRitase = Number(formData.get('targetRitase') || 0);
        const targetUnits = Number(formData.get('targetUnits') || 0);
        const notes = formData.get('notes')?.toString() || '';

        if (!contractId || !planDate) return fail(400, { error: 'Contract ID dan tanggal diperlukan.' });

        try {
            // 1. Simpan perubahan ke tanggal yang diedit, set is_manual = true
            await sql`
                INSERT INTO operations.contract_daily_plan (contract_id, plan_date, target_tonnage, target_ritase, target_units, notes, is_manual)
                VALUES (${contractId}, ${planDate}, ${targetTonnage}, ${targetRitase}, ${targetUnits}, ${notes}, true)
                ON CONFLICT (contract_id, plan_date) 
                DO UPDATE SET 
                    target_tonnage = ${targetTonnage},
                    target_ritase = ${targetRitase},
                    target_units = ${targetUnits},
                    notes = ${notes},
                    is_manual = true
            `;

            // 2. Ambil total target kontrak dan target harian standar
            const [contract] = await sql`
                SELECT target_tonnage, unit_capacity, units_needed_per_day, daily_target_tonnage, trips_per_day
                FROM marketing.contract WHERE id = ${contractId}
            `;
            if (!contract) return { updateSuccess: true, contractId };

            const totalTarget = Number(contract.target_tonnage);
            const unitCapacity = Number(contract.unit_capacity) || 35;
            const defUnits = Number(contract.units_needed_per_day) || 1;

            // 3. Hitung tonase yang sudah "Terkunci" (Hari lalu, hari ini, dan masa depan yang manual)
            const [{ locked_tonnage }] = await sql`
                SELECT COALESCE(SUM(target_tonnage), 0) as locked_tonnage
                FROM operations.contract_daily_plan
                WHERE contract_id = ${contractId}
                AND (plan_date <= CURRENT_DATE OR is_manual = true)
            `;

            // 4. Hitung sisa target yang harus didistribusikan
            let remainingTonnage = Math.max(0, totalTarget - Number(locked_tonnage));

            // 5. Ambil kapasitas harian standar (dari kontrak atau fallback)
            const defDailyTonnage = Number(contract.daily_target_tonnage) || (defUnits * Number(contract.trips_per_day || 2) * unitCapacity) || 40;

            // 6. Ambil daftar hari yang bisa di-rebalance (Masa depan dan belum manual), urutkan dari yang terdekat
            // Mencegah error zona waktu JS dengan mem-format tanggal langsung di DB menjadi YYYY-MM-DD
            const futureDays = await sql`
                SELECT TO_CHAR(plan_date, 'YYYY-MM-DD') as date_str
                FROM operations.contract_daily_plan
                WHERE contract_id = ${contractId}
                AND plan_date > CURRENT_DATE
                AND is_manual = false
                ORDER BY plan_date ASC
            `;

            // 7. Rebalance secara sekuensial (Isi penuh maju)
            if (futureDays.length > 0) {
                const updates = futureDays.map(row => {
                    let assignTonnage = 0;
                    let assignRitase = 0;
                    let assignUnits = 0;

                    if (remainingTonnage > 0) {
                        assignTonnage = Math.min(remainingTonnage, defDailyTonnage);
                        assignRitase = Math.ceil(assignTonnage / unitCapacity);
                        assignUnits = assignTonnage > 0 ? defUnits : 0;
                        remainingTonnage -= assignTonnage;
                    }

                    return {
                        date_str: row.date_str,
                        target_tonnage: assignTonnage,
                        target_ritase: assignRitase,
                        target_units: assignUnits
                    };
                });

                // Update satu per satu secara berurutan
                for (const u of updates) {
                    await sql`
                        UPDATE operations.contract_daily_plan
                        SET 
                            target_tonnage = ${u.target_tonnage},
                            target_ritase = ${u.target_ritase},
                            target_units = ${u.target_units}
                        WHERE contract_id = ${contractId}
                        AND plan_date = ${u.date_str}
                    `;
                }
            }

            return { updateSuccess: true, contractId };
        } catch (e: any) {
            console.error('Error updating day plan:', e);
            return fail(500, { error: 'Gagal menyimpan target untuk tanggal ini.' });
        }
    }
};
