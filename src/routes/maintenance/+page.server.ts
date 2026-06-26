import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
	// Cek allowed_modules dari cookie user_data untuk menentukan redirect yang tepat
	let allowedModules: string[] = ['*'];
	const userCookie = cookies.get('user_data');
	if (userCookie) {
		try { 
			const userData = verifyUserData(userCookie); 
			if (userData.allowedModules) {
				allowedModules = userData.allowedModules;
			}
		} catch (e) {}
	}

	// Check for specific maintenance overrides
	const hasSpecificOverrides = allowedModules.some(m => m !== 'maintenance' && m.startsWith('maintenance.'));
	
	const isFullAccess = !hasSpecificOverrides && (allowedModules.includes('*') || allowedModules.includes('maintenance'));
	const hasInspections = allowedModules.includes('maintenance.inspections');
	const hasDashboard = allowedModules.includes('maintenance.dashboard');
	const hasWorkOrders = allowedModules.includes('maintenance.work-orders');

	// Jika punya akses dashboard (spesifik) atau akses penuh tanpa override → ke dashboard mekanik
	if (hasDashboard || isFullAccess) {
		throw redirect(303, '/maintenance/dashboard');
	}

	// Jika hanya punya akses inspections → ke halaman inspections
	if (hasInspections) {
		throw redirect(303, '/maintenance/inspections');
	}

	// Jika hanya punya akses work-orders → ke halaman work-orders
	if (hasWorkOrders) {
		throw redirect(303, '/maintenance/work-orders');
	}

	// Fallback: ke dashboard
	throw redirect(303, '/maintenance/dashboard');
};
