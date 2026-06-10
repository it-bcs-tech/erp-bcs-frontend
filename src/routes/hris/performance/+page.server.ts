/**
 * Performance & Training — Server-Side Data Loader
 * ═══════════════════════════════════════════════════════════
 * Prioritas 1: Backend Laravel API (GET /api/v1/hris/performance)
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

        const apiUrl = `${API_BASE_URL}/api/v1/hris/performance`;
        console.log(`🔗 [Performance] Attempting Laravel API: ${apiUrl}`);

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
        console.log(`📡 [Performance] Laravel Response Status: ${response.status}`);

        if (response.ok) {
            let jsonStr = textResponse.trim();
            const realJsonStart = jsonStr.lastIndexOf('{"status"');
            if (realJsonStart > 0) {
                jsonStr = jsonStr.substring(realJsonStart);
            }

            try {
                const json = JSON.parse(jsonStr);
                if (json.status === 'success' && json.data) {
                    console.log(`✅ [Performance] Laravel data loaded: ${json.data.kpiRecords?.length || 0} KPIs, ${json.data.trainingPrograms?.length || 0} trainings`);
                    return {
                        kpiRecords: json.data.kpiRecords || [],
                        trainingPrograms: json.data.trainingPrograms || [],
                        metrics: json.data.metrics || { avgKpiScore: 0, totalEvaluated: 0, upcomingTrainings: 0 },
                        dataSource: 'laravel' as const
                    };
                }
            } catch (e: any) {
                logError('PERF_API_PARSE', 'Laravel returned OK but invalid JSON', `Raw: ${textResponse.substring(0, 300)} | Error: ${e?.message}`);
            }
        } else if (response.status >= 400 && response.status < 500) {
            console.warn(`⚠️ [Performance] Laravel rejected (${response.status}): ${textResponse.substring(0, 200)}`);
        } else {
            console.warn(`⚠️ [Performance] Laravel server error: ${response.status}`);
        }
    } catch (error: any) {
        logError('PERF_API_FAIL', 'Laravel API unreachable or timed out', error?.message);
    }

    // ==========================================
    // PRIORITAS 2: FALLBACK SVELTE NATIVE (DB)
    // ==========================================
    console.warn('⚠️ [Performance Fallback] Falling back to Svelte Native (Direct DB).');

    try {
        const kpiData = await sql`
            SELECT 
                p.id,
                p.kpi_type,
                p.score,
                p.active_period,
                p.created_by,
                COALESCE(k.nama_karyawan, k1.nama_karyawan) as employee_name,
                p.payroll_id as employee_id,
                d.dept_name as department_name,
                p.dept_id
            FROM hris.performance_kpi p
            LEFT JOIN master.m_karyawan k ON k.payroll_id = p.payroll_id
            LEFT JOIN master.m_karyawan_1 k1 ON k1.payroll_id = p.payroll_id
            LEFT JOIN master.m_dept d ON d.dept_code = p.dept_id
            ORDER BY p.created_at DESC
        `;

        const avgScoreQuery = await sql`SELECT AVG(score) as avg_score FROM hris.performance_kpi WHERE score > 0`;
        const avgKpiScore = Math.round(parseFloat(avgScoreQuery[0].avg_score) || 0);

        const totalEvaluated = kpiData.length;

        const getGrade = (score: number) => {
            if (score >= 90) return 'A';
            if (score >= 80) return 'B';
            if (score >= 70) return 'C';
            if (score >= 60) return 'D';
            return 'E';
        };

        const formattedKpis = kpiData.map(kpi => ({
            id: String(kpi.id),
            kpiType: kpi.kpi_type,
            employeeName: kpi.kpi_type === 'DEPARTMENT' ? kpi.department_name : (kpi.employee_name || 'Unknown'),
            employeeId: kpi.kpi_type === 'DEPARTMENT' ? kpi.dept_id : (kpi.employee_id || ''),
            department: kpi.kpi_type === 'DEPARTMENT' ? 'Department Level' : (kpi.department_name || 'General'),
            period: kpi.active_period || 'Unknown',
            score: parseFloat(kpi.score) || 0,
            grade: getGrade(parseFloat(kpi.score) || 0),
            evaluator: kpi.created_by || 'System'
        }));

        const trainingQuery = await sql`
            SELECT 
                p.id,
                p.title,
                p.start_date,
                p.end_date,
                COUNT(tp.id) as participants
            FROM hris.training_programs p
            LEFT JOIN hris.training_participants tp ON tp.program_id = p.id
            GROUP BY p.id, p.title, p.start_date, p.end_date
            ORDER BY p.start_date DESC NULLS LAST
            LIMIT 50
        `;

        const formattedTrainings = trainingQuery.map(t => {
            let status = 'Completed';
            if (t.end_date && new Date(t.end_date) > new Date()) {
                status = 'Upcoming';
            } else if (!t.end_date && t.start_date && new Date(t.start_date) > new Date()) {
                status = 'Upcoming';
            }

            const dateStr = t.start_date ? new Date(t.start_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Unknown Date';

            return {
                id: t.id,
                title: t.title || 'Untitled Program',
                date: dateStr,
                participants: parseInt(t.participants) || 0,
                status
            };
        });

        const upcomingTrainings = formattedTrainings.filter(t => t.status === 'Upcoming').length;

        console.log(`✅ [Performance Fallback] Svelte DB loaded ${formattedKpis.length} KPIs, ${formattedTrainings.length} trainings`);

        // Fetch Master Data
        const employees = await sql`SELECT payroll_id, nama_karyawan FROM master.m_karyawan WHERE active = 'Y' ORDER BY nama_karyawan ASC`;
        const departments = await sql`SELECT dept_code, dept_name FROM master.m_dept WHERE active = 'Y' ORDER BY dept_name ASC`;

        return { 
            kpiRecords: formattedKpis, 
            trainingPrograms: formattedTrainings,
            metrics: {
                avgKpiScore,
                totalEvaluated,
                upcomingTrainings
            },
            dataSource: 'svelte-db' as const,
            masterData: {
                employees: employees.map(e => ({ id: e.payroll_id, name: e.nama_karyawan })),
                departments: departments.map(d => ({ id: d.dept_code, name: d.dept_name }))
            }
        };
    } catch (error) {
        console.error('Failed to fetch performance & training data:', error);
        return {
            kpiRecords: [],
            trainingPrograms: [],
            metrics: {
                avgKpiScore: 0,
                totalEvaluated: 0,
                upcomingTrainings: 0
            },
            dataSource: 'svelte-db' as const,
            masterData: { employees: [], departments: [] }
        };
    }
};

export const actions = {
    addKpi: async ({ request }) => {
        const formData = await request.formData();
        const kpiType = formData.get('kpiType')?.toString() as 'DEPARTMENT' | 'PERSONAL';
        const targetId = formData.get('targetId')?.toString();
        const activePeriod = formData.get('activePeriod')?.toString();
        const scoreStr = formData.get('score')?.toString();
        const remarks = formData.get('remarks')?.toString();

        if (!kpiType || !targetId || !activePeriod || !scoreStr) {
            return { success: false, message: 'Missing required fields' };
        }

        const score = parseFloat(scoreStr);
        const documentNo = `KPI-${Date.now()}`;

        try {
            if (kpiType === 'PERSONAL') {
                await sql`
                    INSERT INTO hris.performance_kpi 
                    (document_no, kpi_type, payroll_id, active_period, score, remarks, created_at, created_by)
                    VALUES
                    (${documentNo}, ${kpiType}, ${targetId}, ${activePeriod}, ${score}, ${remarks}, NOW(), 'Admin')
                `;
            } else {
                await sql`
                    INSERT INTO hris.performance_kpi 
                    (document_no, kpi_type, dept_id, active_period, score, remarks, created_at, created_by)
                    VALUES
                    (${documentNo}, ${kpiType}, ${targetId}, ${activePeriod}, ${score}, ${remarks}, NOW(), 'Admin')
                `;
            }
            return { success: true };
        } catch (error) {
            console.error('Failed to insert KPI:', error);
            return { success: false, message: 'Database error' };
        }
    },

    addTraining: async ({ request }) => {
        const formData = await request.formData();
        const title = formData.get('title')?.toString();
        const category = formData.get('category')?.toString();
        const startDate = formData.get('startDate')?.toString();
        const endDate = formData.get('endDate')?.toString();
        const trainer = formData.get('trainer')?.toString();

        if (!title || !startDate) {
            return { success: false, message: 'Missing required fields' };
        }

        const id = `TRN-${Date.now()}`;

        try {
            await sql`
                INSERT INTO hris.training_programs 
                (id, title, category, start_date, end_date, trainer, created_at, created_by)
                VALUES
                (${id}, ${title}, ${category}, ${startDate || null}, ${endDate || null}, ${trainer}, NOW(), 'Admin')
            `;
            return { success: true };
        } catch (error) {
            console.error('Failed to insert training:', error);
            return { success: false, message: 'Database error' };
        }
    }
};
