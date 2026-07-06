import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';

const sql = postgres(env.DATABASE_URL || 'postgres://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db');

export const load: PageServerLoad = async () => {
    try {
        // Fetch contracts
        const contractsData = await sql`
            SELECT 
                c.id,
                c.customer_id,
                cust.nama_kustomer as customer,
                c.project_id,
                p.project_name as project,
                p.category as project_category,
                c.master_rute_id,
                COALESCE(c.origin_id, mru.origin_id) as origin_id,
                COALESCE(ori.nama_kustomer, mori.nama_kustomer) as origin,
                COALESCE(c.destination_id, mru.destination_id) as destination_id,
                COALESCE(dest.nama_kustomer, mdest.nama_kustomer) as destination,
                c.start_date as "startDate",
                c.end_date as "endDate",
                (c.target_tonnage = 0) as "isBorongan",
                CASE 
                    WHEN c.target_tonnage > 0 THEN c.target_tonnage
                    ELSE COALESCE((SELECT target_tonnage FROM operations.contract_monthly_targets WHERE contract_id = c.id AND target_month = date_trunc('month', CURRENT_DATE)::date), 0)
                END AS "targetTonnage",
                CASE 
                    WHEN c.target_tonnage > 0 THEN COALESCE(c.delivered_tonnage, 0)
                    ELSE COALESCE((SELECT SUM(COALESCE(t.actual_weight, o.berat_muatan)) FROM marketing.sales_order o LEFT JOIN fleet.trip t ON t.unit_id = o.assigned_unit_id AND t.tgl_trip::date = o.tgl_muat::date WHERE o.contract_id = c.id AND o.status = 'COMPLETED' AND date_trunc('month', o.tgl_muat) = date_trunc('month', CURRENT_DATE)), 0)
                END + 
                (SELECT COALESCE(SUM(o.berat_muatan), 0) FROM marketing.sales_order o JOIN fleet.trip t ON t.unit_id = o.assigned_unit_id AND t.tgl_trip::date = o.tgl_muat::date AND t.status NOT IN ('COMPLETED', 'CANCELED') WHERE o.contract_id = c.id AND t.status = 'RETURNING' AND (c.target_tonnage > 0 OR date_trunc('month', o.tgl_muat) = date_trunc('month', CURRENT_DATE))) as "deliveredTonnage",
                (SELECT COALESCE(SUM(o.berat_muatan), 0) FROM marketing.sales_order o LEFT JOIN fleet.trip t ON t.unit_id = o.assigned_unit_id AND t.tgl_trip::date = o.tgl_muat::date AND t.status NOT IN ('COMPLETED', 'CANCELED') WHERE o.contract_id = c.id AND o.status NOT IN ('COMPLETED', 'CANCELED') AND (t.id IS NULL OR t.status IN ('SCHEDULED', 'DISPATCHED')) AND (c.target_tonnage > 0 OR date_trunc('month', o.tgl_muat) = date_trunc('month', CURRENT_DATE))) as "dispatchedTonnage",
                (SELECT COALESCE(SUM(o.berat_muatan), 0) FROM marketing.sales_order o JOIN fleet.trip t ON t.unit_id = o.assigned_unit_id AND t.tgl_trip::date = o.tgl_muat::date AND t.status NOT IN ('COMPLETED', 'CANCELED') WHERE o.contract_id = c.id AND t.status = 'AT_ORIGIN' AND (c.target_tonnage > 0 OR date_trunc('month', o.tgl_muat) = date_trunc('month', CURRENT_DATE))) as "loadingTonnage",
                (SELECT COALESCE(SUM(o.berat_muatan), 0) FROM marketing.sales_order o JOIN fleet.trip t ON t.unit_id = o.assigned_unit_id AND t.tgl_trip::date = o.tgl_muat::date AND t.status NOT IN ('COMPLETED', 'CANCELED') WHERE o.contract_id = c.id AND t.status IN ('ON_ROUTE', 'AT_DESTINATION') AND (c.target_tonnage > 0 OR date_trunc('month', o.tgl_muat) = date_trunc('month', CURRENT_DATE))) as "onrouteTonnage",
                c.contract_value as "contractValue",
                c.max_ujo_percentage as "maxUjoPercentage",
                c.produk_id,
                prod.nama_produk as jenis_muatan,
                c.status,
                c.notes
            FROM marketing.contract c
            LEFT JOIN master.m_customer cust ON cust.id = c.customer_id
            LEFT JOIN master.m_project p ON p.id = c.project_id
            LEFT JOIN master.m_customer ori ON ori.id = c.origin_id
            LEFT JOIN master.m_customer dest ON dest.id = c.destination_id
            LEFT JOIN master.m_rute_ujo mru ON mru.id = c.master_rute_id
            LEFT JOIN master.m_customer mori ON mori.id = mru.origin_id
            LEFT JOIN master.m_customer mdest ON mdest.id = mru.destination_id
            LEFT JOIN master.m_produk prod ON prod.id = c.produk_id
            ORDER BY c.created_at DESC
        `;

        // Fetch customers for dropdown
        const customersData = await sql`
            SELECT id, nama_kustomer as name 
            FROM master.m_customer 
            WHERE is_active = true
            ORDER BY nama_kustomer ASC
        `;

        // Fetch projects for dropdown
        const projectsData = await sql`
            SELECT id, project_name as name, category 
            FROM master.m_project 
            WHERE is_active = true
            ORDER BY id ASC
        `;

        // Fetch master rute UJO for dropdown
        const masterRutes = await sql`
            SELECT 
                r.id,
                ori.nama_kustomer as origin_name,
                dest.nama_kustomer as destination_name,
                tu.nama_tipe as tipe_unit,
                r.total_ujo,
                r.tarif_customer
            FROM master.m_rute_ujo r
            JOIN master.m_customer ori ON ori.id = r.origin_id
            JOIN master.m_customer dest ON dest.id = r.destination_id
            JOIN master.m_tipe_unit tu ON tu.id = r.tipe_unit_id
            ORDER BY r.created_at DESC
        `;

        // Fetch available units count
        const availableUnitsQuery = await sql`
            SELECT COUNT(*) FROM fleet.unit 
            WHERE current_state = 'AT_POOL' AND is_active = true
        `;
        const availableUnits = parseInt(availableUnitsQuery[0].count) || 0;

        // Fetch products for dropdown
        const productsData = await sql`
            SELECT id, nama_produk as name, satuan 
            FROM master.m_produk 
            WHERE is_active = true
            ORDER BY nama_produk ASC
        `;

        // Formatting dates and converting numerics
        const formattedContracts = contractsData.map(c => {
            const target = Number(c.targetTonnage) || 0;
            const delivered = Number(c.deliveredTonnage) || 0;
            const loading = Number(c.loadingTonnage) || 0;
            const onroute = Number(c.onrouteTonnage) || 0;
            const dispatched = Number(c.dispatchedTonnage) || 0;
            const remaining = Math.max(0, target - (delivered + loading + onroute + dispatched));
            
            return {
                ...c,
                isBorongan: c.isBorongan,
                startDate: c.startDate ? new Date(c.startDate).toISOString().split('T')[0] : '',
                endDate: c.endDate ? new Date(c.endDate).toISOString().split('T')[0] : '',
                targetTonnage: target,
                deliveredTonnage: delivered,
                loadingTonnage: loading,
                onrouteTonnage: onroute,
                dispatchedTonnage: dispatched,
                remainingTonnage: remaining,
                contractValue: Number(c.contractValue),
                maxUjoPercentage: Number(c.maxUjoPercentage),
                history: [] // You can query history if needed
            };
        });

        return {
            contracts: formattedContracts,
            customers: customersData,
            projects: projectsData,
            masterRutes: masterRutes,
            availableUnits: availableUnits,
            products: productsData
        };
    } catch (error) {
        console.error("Error loading contracts:", error);
        return { contracts: [], customers: [], projects: [], products: [] };
    }
};

export const actions: Actions = {
    create: async ({ request }) => {
        const data = await request.formData();
        
        const customerId = data.get('customerId') as string;
        const projectId = data.get('projectId') as string;
        
        const tipeRute = data.get('tipe_rute') as string || 'kustom';
        let masterRuteId = null;
        let originId = null;
        let destinationId = null;

        if (tipeRute === 'master') {
            masterRuteId = data.get('master_rute_id') as string || null;
            if (!masterRuteId) return fail(400, { message: 'Master Rute wajib dipilih' });
        } else {
            originId = data.get('originId') as string || null;
            destinationId = data.get('destinationId') as string || null;
            if (!originId || !destinationId) return fail(400, { message: 'Origin dan Destination wajib dipilih' });
        }

        const startDate = data.get('startDate') as string;
        const endDate = data.get('endDate') as string;
        const targetTonnage = parseFloat(data.get('targetTonnage') as string) || 0;
        const contractValue = parseFloat(data.get('contractValue') as string) || 0;
        const maxUjoPercentage = parseFloat(data.get('maxUjoPercentage') as string) || 25;
        const produkId = data.get('produk_id') as string || null;
        const notes = data.get('notes') as string || '';

        if (!customerId || !projectId) {
            return fail(400, { message: 'Customer and Project are required' });
        }

        try {
            // Generate auto ID: PO-YYYY-MM-XXXX
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const randomSuffix = Math.floor(Math.random() * 9000) + 1000;
            const newId = `PO-${year}-${month}-${randomSuffix}`;

            await sql`
                INSERT INTO marketing.contract (
                    id, customer_id, project_id, master_rute_id, origin_id, destination_id, 
                    start_date, end_date, target_tonnage, contract_value, max_ujo_percentage, produk_id, notes
                ) VALUES (
                    ${newId}, ${customerId}, ${projectId}, ${masterRuteId ? parseInt(masterRuteId) : null}, ${originId}, ${destinationId},
                    ${startDate}, ${endDate}, ${targetTonnage}, ${contractValue}, ${maxUjoPercentage}, ${produkId ? parseInt(produkId) : null}, ${notes}
                )
            `;

            return { success: true, message: 'Contract created successfully' };
        } catch (error: any) {
            console.error("Error creating contract:", error);
            return fail(500, { error: error.message || 'Failed to create contract' });
        }
    },

    update: async ({ request }) => {
        const data = await request.formData();
        
        const id = data.get('id') as string;
        const customerId = data.get('customerId') as string;
        const projectId = data.get('projectId') as string;

        const tipeRute = data.get('tipe_rute') as string || 'kustom';
        let masterRuteId = null;
        let originId = null;
        let destinationId = null;

        if (tipeRute === 'master') {
            masterRuteId = data.get('master_rute_id') as string || null;
            if (!masterRuteId) return fail(400, { message: 'Master Rute wajib dipilih' });
        } else {
            originId = data.get('originId') as string || null;
            destinationId = data.get('destinationId') as string || null;
            if (!originId || !destinationId) return fail(400, { message: 'Origin dan Destination wajib dipilih' });
        }

        const startDate = data.get('startDate') as string;
        const endDate = data.get('endDate') as string;
        const targetTonnage = parseFloat(data.get('targetTonnage') as string) || 0;
        const contractValue = parseFloat(data.get('contractValue') as string) || 0;
        const maxUjoPercentage = parseFloat(data.get('maxUjoPercentage') as string) || 25;
        const produkId = data.get('produk_id') as string || null;
        const notes = data.get('notes') as string || '';

        if (!id || !customerId || !projectId) {
            return fail(400, { message: 'ID, Customer, and Project are required' });
        }

        try {
            await sql`
                UPDATE marketing.contract SET
                    customer_id = ${customerId},
                    project_id = ${projectId},
                    master_rute_id = ${masterRuteId ? parseInt(masterRuteId) : null},
                    origin_id = ${originId},
                    destination_id = ${destinationId},
                    start_date = ${startDate},
                    end_date = ${endDate},
                    target_tonnage = ${targetTonnage},
                    contract_value = ${contractValue},
                    max_ujo_percentage = ${maxUjoPercentage},
                    produk_id = ${produkId ? parseInt(produkId) : null},
                    status = CASE WHEN status = 'DRAFT' THEN 'Active' ELSE status END,
                    notes = ${notes}
                WHERE id = ${id}
            `;

            return { success: true, message: 'Contract updated successfully' };
        } catch (error: any) {
            console.error("Error updating contract:", error);
            return fail(500, { error: error.message || 'Failed to update contract' });
        }
    },

    extendTime: async ({ request }) => {
        const data = await request.formData();
        const id = data.get('id') as string;
        const newEndDate = data.get('newEndDate') as string;

        if (!id || !newEndDate) {
            return fail(400, { message: 'ID and New End Date are required' });
        }

        try {
            await sql`
                UPDATE marketing.contract 
                SET end_date = ${newEndDate}
                WHERE id = ${id}
            `;
            return { success: true, message: 'Waktu kontrak berhasil diperpanjang' };
        } catch (error: any) {
            console.error("Error extending contract time:", error);
            return fail(500, { error: error.message || 'Gagal memperpanjang kontrak' });
        }
    },

    renewContract: async ({ request }) => {
        const data = await request.formData();
        const id = data.get('id') as string;

        if (!id) {
            return fail(400, { message: 'Contract ID is required' });
        }

        try {
            // First, get the old contract
            const oldContractResult = await sql`SELECT * FROM marketing.contract WHERE id = ${id}`;
            if (oldContractResult.length === 0) return fail(404, { message: 'Contract not found' });
            
            const oldContract = oldContractResult[0];

            // Generate auto ID: PO-YYYY-MM-XXXX
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const randomSuffix = Math.floor(Math.random() * 9000) + 1000;
            const newId = `PO-${year}-${month}-${randomSuffix}`;

            // Insert new contract as DRAFT
            await sql`
                INSERT INTO marketing.contract (
                    id, customer_id, project_id, master_rute_id, origin_id, destination_id, 
                    target_tonnage, contract_value, max_ujo_percentage, produk_id, status, notes
                ) VALUES (
                    ${newId}, ${oldContract.customer_id}, ${oldContract.project_id}, ${oldContract.master_rute_id}, ${oldContract.origin_id}, ${oldContract.destination_id},
                    ${oldContract.target_tonnage}, ${oldContract.contract_value}, ${oldContract.max_ujo_percentage}, ${oldContract.produk_id}, 'DRAFT', ${'Renewal of ' + id}
                )
            `;

            // Mark old contract as CLOSED
            await sql`UPDATE marketing.contract SET status = 'CLOSED' WHERE id = ${id}`;

            return { success: true, message: 'Kontrak baru berhasil dibuat (DRAFT) dan kontrak lama telah ditutup' };
        } catch (error: any) {
            console.error("Error renewing contract:", error);
            return fail(500, { error: error.message || 'Gagal membuat kontrak baru' });
        }
    }
};
