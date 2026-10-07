import type { PageServerLoad } from './$types';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';

const sql = postgres(env.DATABASE_URL || 'postgres://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db');

export const load: PageServerLoad = async () => {
	try {
		// Group WO count by category
		const counts = await sql`
			SELECT 
				COALESCE(maint_category, 'General Service') as category,
				COUNT(*) as total_count,
				COUNT(*) FILTER (WHERE status NOT IN ('Closed', 'CLOSED', 'Cancelled')) as active_count
			FROM fleet.work_orders
			GROUP BY maint_category
			ORDER BY total_count DESC
		`;

		const standardCategories = [
			{ code: 'CAT-BRK', name: 'Breakdown / Mogok Darurat', desc: 'Perbaikan darurat unit berhenti beroperasi di jalan atau pool' },
			{ code: 'CAT-REG', name: 'Regular Repair / Servis Ringan', desc: 'Perbaikan keluhan rutin non-kritis dan penggantian part kecil' },
			{ code: 'CAT-PM', name: 'Preventive Maintenance (PM)', desc: 'Servis terjadwal 5.000, 10.000, 20.000 KM atau bulanan' },
			{ code: 'CAT-TIR', name: 'Tire & Wheel Service', desc: 'Rotasi ban, spooring/balancing, ganti velg, dan tekanan angin' },
			{ code: 'CAT-ELC', name: 'Electrical & Wiring Repair', desc: 'Lampu, dynamo starter, alternator, aki, dan kelistrikan body' },
			{ code: 'CAT-OVH', name: 'Overhaul Engine & Transmission', desc: 'Turun mesin besar, kalibrasi bospom, kuras transmisi/gardan' },
			{ code: 'CAT-BDY', name: 'Body & Chassis Repair', desc: 'Pengelasan chasis, hidrolik dump, bak, cabin, dan engsel' }
		];

		const countMap: Record<string, { total: number; active: number }> = {};
		for (const row of counts) {
			countMap[row.category] = {
				total: parseInt(row.total_count || '0'),
				active: parseInt(row.active_count || '0')
			};
		}

		return {
			categories: standardCategories.map(c => ({
				...c,
				totalWo: countMap[c.name]?.total || 0,
				activeWo: countMap[c.name]?.active || 0
			}))
		};
	} catch (error) {
		console.error("Database error loading service categories:", error);
		return { categories: [] };
	}
};
