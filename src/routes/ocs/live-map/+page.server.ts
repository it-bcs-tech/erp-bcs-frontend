import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {
		units: [
			{ id: 'B 1234 CD', driver: 'Ahmad Subarkah', status: 'Moving', speed: 65, lat: -6.60, lng: 110.40, origin: 'Jakarta', destination: 'Surabaya', do: 'DO-260515001', cargo: 'FMCG / Dry Food', customer: 'PT Indofood', progress: 45, eta: '18:30' },
			{ id: 'D 5678 EF', driver: 'Budi Santoso', status: 'Transit', speed: 0, lat: -6.98, lng: 110.42, origin: 'Jakarta', destination: 'Semarang', do: 'DO-260515002', cargo: 'Auto Parts', customer: 'PT Astra', progress: 62, eta: '14:00' },
			{ id: 'L 9012 GH', driver: 'Cahyo Wibowo', status: 'Loading', speed: 0, lat: -6.92, lng: 107.61, origin: 'Bandung', destination: 'Semarang', do: 'DO-260514008', cargo: 'Consumer Goods', customer: 'PT Unilever', progress: 5, eta: '20:00' },
			{ id: 'F 7890 KL', driver: 'Eko Firmansyah', status: 'Moving', speed: 72, lat: -6.72, lng: 108.55, origin: 'Jakarta', destination: 'Cirebon', do: 'DO-260515003', cargo: 'Biscuits', customer: 'PT Mayora', progress: 35, eta: '16:00' },
			{ id: 'H 3456 MN', driver: 'Fajar Nugroho', status: 'Available', speed: 0, lat: -6.17, lng: 106.83, origin: '-', destination: '-', do: '-', cargo: '-', customer: '-', progress: 0, eta: '-' },
			{ id: 'AB 1122 OP', driver: 'Gunawan Wicaksono', status: 'Moving', speed: 58, lat: -7.25, lng: 112.73, origin: 'Semarang', destination: 'Surabaya', do: 'DO-260513006', cargo: 'Electronics', customer: 'PT Hartono', progress: 78, eta: '12:30' },
			{ id: 'AG 3344 QR', driver: 'Hendra Saputra', status: 'Maintenance', speed: 0, lat: -6.22, lng: 106.85, origin: '-', destination: '-', do: '-', cargo: '-', customer: '-', progress: 0, eta: '-' },
			{ id: 'W 5566 ST', driver: 'Irfan Maulana', status: 'Transit', speed: 0, lat: -7.58, lng: 110.82, origin: 'Yogyakarta', destination: 'Surabaya', do: 'DO-260514012', cargo: 'Textile', customer: 'PT Sri Rejeki', progress: 55, eta: '15:45' },
		]
	};
};
