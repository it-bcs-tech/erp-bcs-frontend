import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/utils/api';

export const load: PageServerLoad = async ({ cookies, url }) => {
	const authToken = cookies.get('auth_token');
	
	const page = Number(url.searchParams.get('page')) || 1;
	const perPage = 5;
	const searchQuery = url.searchParams.get('search') || '';
	const statusFilter = url.searchParams.get('status') || '';

	try {
		const apiParams = new URLSearchParams();
		apiParams.set('page', page.toString());
		apiParams.set('per_page', perPage.toString());
		if (searchQuery) apiParams.set('search', searchQuery);
		if (statusFilter && statusFilter !== 'All') apiParams.set('status', statusFilter);

		const response = await apiFetch<any>(
			`/api/v1/fms/drivers?${apiParams.toString()}`,
			{},
			authToken
		);

		let drivers = response.data?.drivers || response.data || [];
		let metrics = response.data?.metrics || {
			totalDrivers: 0,
			onDuty: 0,
			available: 0,
			onLeave: 0
		};
		let meta = response.meta;

		// Fallback manual pagination & filtering jika backend belum mendukung pagination atau search secara native
		if (!meta || typeof meta.total === 'undefined') {
			if (Array.isArray(drivers)) {
				// Apply manual search
				if (searchQuery) {
					const q = searchQuery.toLowerCase();
					drivers = drivers.filter((d: any) => 
						(d.name?.toLowerCase() || '').includes(q) || 
						(d.id?.toLowerCase() || '').includes(q) ||
						(d.phone || '').includes(q)
					);
				}
				
				// Apply manual status filter
				if (statusFilter && statusFilter !== 'All') {
					drivers = drivers.filter((d: any) => d.status === statusFilter);
				}

				metrics.totalDrivers = drivers.length; // Update metrics fallback
				const total = drivers.length;
				const start = (page - 1) * perPage;
				drivers = drivers.slice(start, start + perPage);
				meta = { current_page: page, total, per_page: perPage };
			} else {
				drivers = [];
				meta = { current_page: page, total: 0, per_page: perPage };
			}
		}

		return { drivers, metrics, meta };
	} catch (error: any) {
		console.error('Failed to fetch FMS drivers:', error);
		
		// ┌─────────────────────────────────────────────────────┐
		// │ MOCK DATA TELAH DIHAPUS                             │
		// │ Sekarang melempar (throw) error agar halaman crash  │
		// │ dan menampilkan pesan error API aslinya ke layar    │
		// └─────────────────────────────────────────────────────┘
		throw error;
	}
};
