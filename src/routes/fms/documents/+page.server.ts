import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const allDocs = [
		{ id: 'DOC-001', type: 'STNK', vehicle: 'B 1234 CD', docNumber: '1234567890', expiryDate: '2026-08-15', status: 'Valid', issuer: 'Samsat Jakarta' },
		{ id: 'DOC-002', type: 'KIR', vehicle: 'B 1234 CD', docNumber: 'KIR-09876', expiryDate: '2026-06-10', status: 'Expiring Soon', issuer: 'Dishub Jakarta' },
		{ id: 'DOC-003', type: 'Asuransi', vehicle: 'L 9012 GH', docNumber: 'POL-112233', expiryDate: '2026-12-01', status: 'Valid', issuer: 'Asuransi Tugu' },
		{ id: 'DOC-004', type: 'KIR', vehicle: 'B 3456 IJ', docNumber: 'KIR-55443', expiryDate: '2026-05-18', status: 'Expired', issuer: 'Dishub Bekasi' },
		{ id: 'DOC-005', type: 'Izin Trayek', vehicle: 'D 5678 EF', docNumber: 'TR-998877', expiryDate: '2027-01-20', status: 'Valid', issuer: 'Kemenhub' },
		{ id: 'DOC-006', type: 'STNK', vehicle: 'F 7890 KL', docNumber: '9876543210', expiryDate: '2026-06-05', status: 'Expiring Soon', issuer: 'Samsat Bogor' },
		{ id: 'DOC-007', type: 'KIR', vehicle: 'L 9012 GH', docNumber: 'KIR-11223', expiryDate: '2026-10-15', status: 'Valid', issuer: 'Dishub Semarang' },
	];

	// Determine status metrics
	const expired = allDocs.filter(d => d.status === 'Expired').length;
	const expiringSoon = allDocs.filter(d => d.status === 'Expiring Soon').length;
	const valid = allDocs.filter(d => d.status === 'Valid').length;

	const metrics = {
		totalDocs: allDocs.length,
		expired,
		expiringSoon,
		valid
	};

	const search = url.searchParams.get('search')?.toLowerCase() || '';
	const typeFilter = url.searchParams.get('type') || 'All';
	const statusFilter = url.searchParams.get('status') || 'All';

	let filtered = allDocs;
	if (search) {
		filtered = filtered.filter(d =>
			d.vehicle.toLowerCase().includes(search) ||
			d.docNumber.toLowerCase().includes(search) ||
			d.id.toLowerCase().includes(search)
		);
	}
	if (typeFilter !== 'All') {
		filtered = filtered.filter(d => d.type === typeFilter);
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
		documents: paginated,
		metrics,
		meta: { current_page: page, per_page: perPage, total }
	};
};
