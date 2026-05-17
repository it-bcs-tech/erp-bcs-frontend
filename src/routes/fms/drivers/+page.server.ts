import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const allDrivers = [
		{ id: 'DRV-001', name: 'Ahmad Subarkah', phone: '+62 812-3456-7890', licenseType: 'SIM B2', licenseExpiry: '2027-08-15', status: 'On Duty', assignedVehicle: 'B 1234 CD', totalTrips: 245, rating: 4.8, avatar: 'https://ui-avatars.com/api/?name=Ahmad+Subarkah&background=dbeafe&color=1e40af' },
		{ id: 'DRV-002', name: 'Budi Santoso', phone: '+62 813-2345-6789', licenseType: 'SIM B2', licenseExpiry: '2026-12-01', status: 'Available', assignedVehicle: '-', totalTrips: 198, rating: 4.6, avatar: 'https://ui-avatars.com/api/?name=Budi+Santoso&background=dbeafe&color=1e40af' },
		{ id: 'DRV-003', name: 'Cahyo Wibowo', phone: '+62 857-4567-8901', licenseType: 'SIM B1', licenseExpiry: '2026-06-20', status: 'On Duty', assignedVehicle: 'B 3456 IJ', totalTrips: 312, rating: 4.9, avatar: 'https://ui-avatars.com/api/?name=Cahyo+Wibowo&background=dbeafe&color=1e40af' },
		{ id: 'DRV-004', name: 'Dian Prasetyo', phone: '+62 821-5678-9012', licenseType: 'SIM B2', licenseExpiry: '2028-03-10', status: 'Off Duty', assignedVehicle: '-', totalTrips: 156, rating: 4.3, avatar: 'https://ui-avatars.com/api/?name=Dian+Prasetyo&background=dbeafe&color=1e40af' },
		{ id: 'DRV-005', name: 'Eko Firmansyah', phone: '+62 878-6789-0123', licenseType: 'SIM B1', licenseExpiry: '2026-05-30', status: 'On Duty', assignedVehicle: 'F 7890 KL', totalTrips: 89, rating: 4.5, avatar: 'https://ui-avatars.com/api/?name=Eko+Firmansyah&background=dbeafe&color=1e40af' },
		{ id: 'DRV-006', name: 'Fajar Nugroho', phone: '+62 856-7890-1234', licenseType: 'SIM B2', licenseExpiry: '2027-11-25', status: 'Available', assignedVehicle: '-', totalTrips: 201, rating: 4.7, avatar: 'https://ui-avatars.com/api/?name=Fajar+Nugroho&background=dbeafe&color=1e40af' },
		{ id: 'DRV-007', name: 'Gunawan Hidayat', phone: '+62 819-8901-2345', licenseType: 'SIM B2', licenseExpiry: '2026-09-05', status: 'On Leave', assignedVehicle: '-', totalTrips: 178, rating: 4.4, avatar: 'https://ui-avatars.com/api/?name=Gunawan+Hidayat&background=dbeafe&color=1e40af' },
	];

	const metrics = {
		totalDrivers: allDrivers.length,
		onDuty: allDrivers.filter(d => d.status === 'On Duty').length,
		available: allDrivers.filter(d => d.status === 'Available').length,
		onLeave: allDrivers.filter(d => d.status === 'On Leave').length
	};

	const search = url.searchParams.get('search')?.toLowerCase() || '';
	const statusFilter = url.searchParams.get('status') || 'All';

	let filtered = allDrivers;
	if (search) {
		filtered = filtered.filter(d =>
			d.name.toLowerCase().includes(search) ||
			d.id.toLowerCase().includes(search) ||
			d.phone.includes(search)
		);
	}
	if (statusFilter !== 'All') {
		filtered = filtered.filter(d => d.status === statusFilter);
	}

	const perPage = 5;
	const page = parseInt(url.searchParams.get('page') || '1');
	const total = filtered.length;
	const start = (page - 1) * perPage;
	const paginated = filtered.slice(start, start + perPage);

	return {
		drivers: paginated,
		metrics,
		meta: { current_page: page, per_page: perPage, total }
	};
};
