/**
 * Lifecycle & Disciplinary — Server-Side Data Loader
 * ═══════════════════════════════════════════════════════════
 * Prioritas 1: Backend Laravel API (GET /api/v1/hris/lifecycle)
 * Prioritas 2 (Fallback): Direct PostgreSQL query via Svelte
 * ═══════════════════════════════════════════════════════════
 */

import type { PageServerLoad } from './$types';
import { env } from '$env/dynamic/private';
import { logError } from '$lib/utils/logger';
import postgres from 'postgres';

const API_BASE_URL = env.API_URL || 'http://backend:9000';
const sql = postgres(env.DATABASE_URL || 'postgres://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db');

export const load: PageServerLoad = async ({ cookies }) => {
    const authToken = cookies.get('auth_token');

    // ==========================================
    // PRIORITAS 1: REQUEST KE API LARAVEL
    // ==========================================
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const apiUrl = `${API_BASE_URL}/api/v1/hris/lifecycle`;
        console.log(`🔗 [Lifecycle] Attempting Laravel API: ${apiUrl}`);

        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
            },
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        const textResponse = await response.text();
        console.log(`📡 [Lifecycle] Laravel Response Status: ${response.status}`);

        if (response.ok) {
            // Parse JSON dengan aman (handle karakter sampah di depan)
            let jsonStr = textResponse.trim();
            const realJsonStart = jsonStr.lastIndexOf('{"status"');
            if (realJsonStart > 0) {
                jsonStr = jsonStr.substring(realJsonStart);
            }

            try {
                const json = JSON.parse(jsonStr);
                if (json.status === 'success' && json.data) {
                    console.log(`✅ [Lifecycle] Laravel data loaded: ${json.data.actions?.length || 0} actions`);
                    return {
                        actions: json.data.actions || [],
                        metrics: json.data.metrics || { activeMutations: 0, activeWarnings: 0, pendingTerminations: 0 },
                        dataSource: 'laravel' as const
                    };
                }
            } catch (e: any) {
                logError('LIFECYCLE_API_PARSE', 'Laravel returned OK but invalid JSON', `Raw: ${textResponse.substring(0, 300)} | Error: ${e?.message}`);
            }
        } else if (response.status >= 400 && response.status < 500) {
            console.warn(`⚠️ [Lifecycle] Laravel rejected (${response.status}): ${textResponse.substring(0, 200)}`);
        } else {
            console.warn(`⚠️ [Lifecycle] Laravel server error: ${response.status}`);
        }
    } catch (error: any) {
        logError('LIFECYCLE_API_FAIL', 'Laravel API unreachable or timed out', error?.message);
    }

    // ==========================================
    // PRIORITAS 2: FALLBACK SVELTE NATIVE (DB)
    // ==========================================
    console.warn('⚠️ [Lifecycle Fallback] Falling back to Svelte Native (Direct DB).');

    try {
        const lifecycleData = await sql`
            SELECT 
                u.id, 
                u.document_no, 
                u.action_type, 
                u.action_description, 
                u.status, 
                u.created_at, 
                u.payroll_id as employee_id,
                COALESCE(k.nama_karyawan, k1.nama_karyawan) as employee_name
            FROM (
                SELECT id, document_no, 
                    CASE 
                        WHEN action_type = 'MUTASI' THEN 'Mutation' 
                        WHEN action_type = 'PROMOSI' THEN 'Promotion' 
                        ELSE action_type 
                    END as action_type, 
                    action_description, status, created_at, payroll_id
                FROM hris.employee_lifecycle
                
                UNION ALL
                
                SELECT id, document_no, 
                    'Warning - ' || action_type as action_type, 
                    remarks as action_description, status, created_at, payroll_id
                FROM hris.employee_warnings
                
                UNION ALL
                
                SELECT id, document_no, 
                    'Termination - ' || termination_type as action_type, 
                    reason_out as action_description, status, created_at, payroll_id
                FROM hris.employee_terminations
            ) as u
            LEFT JOIN master.m_karyawan k ON k.payroll_id = u.payroll_id
            LEFT JOIN master.m_karyawan_1 k1 ON k1.payroll_id = u.payroll_id
            ORDER BY u.created_at DESC
        `;

        const activeMutationsQuery = await sql`SELECT COUNT(*) FROM hris.employee_lifecycle WHERE status = 'A'`;
        const activeWarningsQuery = await sql`SELECT COUNT(*) FROM hris.employee_warnings WHERE status = 'A'`;
        const pendingTerminationsQuery = await sql`SELECT COUNT(*) FROM hris.employee_terminations WHERE status = 'P'`;
        
        const activeMutations = parseInt(activeMutationsQuery[0].count) || 0;
        const activeWarnings = parseInt(activeWarningsQuery[0].count) || 0;
        const pendingTerminations = parseInt(pendingTerminationsQuery[0].count) || 0;

        const formattedActions = lifecycleData.map(a => ({
            id: a.document_no || String(a.id),
            date: a.created_at ? new Date(a.created_at).toISOString().split('T')[0] : '',
            type: a.action_type,
            employeeName: a.employee_name || 'Unknown',
            employeeId: a.employee_id || '',
            description: a.action_description || a.action_type,
            status: a.status === 'A' ? 'Approved' : a.status === 'P' ? 'Pending' : 'Unknown'
        }));

        console.log(`✅ [Lifecycle Fallback] Svelte DB loaded ${formattedActions.length} actions`);
        
        // Fetch Master Data for the Modal
        const employees = await sql`SELECT payroll_id, nama_karyawan FROM master.m_karyawan WHERE active = 'Y' ORDER BY nama_karyawan ASC`;
        const departments = await sql`SELECT dept_code, dept_name FROM master.m_dept WHERE active = 'Y' ORDER BY dept_name ASC`;
        const titles = await sql`SELECT title_code, title_name FROM master.m_title WHERE active = 'Y' ORDER BY title_name ASC`;
        const locations = await sql`SELECT loc_code, loc_name FROM master.m_lokasi WHERE active = 'Y' ORDER BY loc_name ASC`;

        return { 
            actions: formattedActions, 
            metrics: {
                activeMutations,
                activeWarnings,
                pendingTerminations
            },
            dataSource: 'svelte-db' as const,
            masterData: {
                employees: employees.map(e => ({ id: e.payroll_id, name: e.nama_karyawan })),
                departments: departments.map(d => ({ id: d.dept_code, name: d.dept_name })),
                titles: titles.map(t => ({ id: t.title_code, name: t.title_name })),
                locations: locations.map(l => ({ id: l.loc_code, name: l.loc_name }))
            }
        };
    } catch (error) {
        console.error('Failed to fetch lifecycle actions:', error);
        return {
            actions: [],
            metrics: {
                activeMutations: 0,
                activeWarnings: 0,
                pendingTerminations: 0
            },
            dataSource: 'svelte-db' as const,
            masterData: { employees: [], departments: [], titles: [], locations: [] }
        };
    }
};

export const actions = {
    addAction: async ({ request }) => {
        const formData = await request.formData();
        const type = formData.get('actionType')?.toString();
        const employeeId = formData.get('employeeId')?.toString();
        const effectiveDate = formData.get('effectiveDate')?.toString();

        if (!type || !employeeId) {
            return { success: false, message: 'Missing required fields' };
        }

        try {
            if (['Mutation', 'Promotion', 'Demotion'].includes(type)) {
                const newDept = formData.get('newDept')?.toString();
                const newTitle = formData.get('newTitle')?.toString();
                const newLoc = formData.get('newLoc')?.toString();
                const reason = formData.get('reason')?.toString();

                await sql`
                    INSERT INTO hris.employee_lifecycle 
                    (payroll_id, action_type, dept_to, title_to, loc_to, start_date, action_description, status, created_at)
                    VALUES
                    (${employeeId}, ${type.toUpperCase()}, ${newDept}, ${newTitle}, ${newLoc}, ${effectiveDate}, ${reason}, 'P', NOW())
                `;
            } else if (type === 'Warning') {
                const warningLevel = formData.get('warningLevel')?.toString();
                const reason = formData.get('reason')?.toString();
                
                await sql`
                    INSERT INTO hris.employee_warnings
                    (payroll_id, action_type, remarks, status, created_at)
                    VALUES
                    (${employeeId}, ${warningLevel}, ${reason}, 'A', NOW())
                `;
            } else if (type === 'Termination') {
                const termType = formData.get('termType')?.toString();
                const reason = formData.get('reason')?.toString();
                
                await sql`
                    INSERT INTO hris.employee_terminations
                    (payroll_id, termination_type, reason_out, status, created_at)
                    VALUES
                    (${employeeId}, ${termType}, ${reason}, 'P', NOW())
                `;
            }

            return { success: true };
        } catch (error) {
            console.error('Failed to insert action:', error);
            return { success: false, message: 'Database error' };
        }
    }
};
