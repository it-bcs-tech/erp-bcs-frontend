import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {
		fleetSummary: {
			total: 124,
			available: 28,
			moving: 42,
			transit: 15,
			loading: 8,
			maintenance: 18,
			overhaul: 6,
			accident: 3,
			onDO: 4
		},
		activeAlerts: [
			{ id: 'ALR-001', unit: 'B 1234 CD', type: 'Geofence', message: 'Exited designated route corridor', severity: 'warning', time: '5 min ago' },
			{ id: 'ALR-002', unit: 'D 5678 EF', type: 'Speed', message: 'Exceeding 80 km/h limit on urban road', severity: 'critical', time: '12 min ago' },
			{ id: 'ALR-003', unit: 'L 9012 GH', type: 'Idle', message: 'Stationary for 45+ minutes at unknown location', severity: 'info', time: '20 min ago' },
			{ id: 'ALR-004', unit: 'F 7890 KL', type: 'SOS', message: 'Driver pressed emergency button', severity: 'critical', time: '2 min ago' },
		],
		liveUnits: [
			{ id: 'B 1234 CD', driver: 'Ahmad Subarkah', status: 'Moving', speed: 65, origin: 'Jakarta', destination: 'Surabaya', progress: 45, do: 'DO-260515001', lat: -6.6, lng: 110.4 },
			{ id: 'D 5678 EF', driver: 'Budi Santoso', status: 'Transit', speed: 0, origin: 'Jakarta', destination: 'Semarang', progress: 62, do: 'DO-260515002', lat: -6.98, lng: 110.42 },
			{ id: 'L 9012 GH', driver: 'Cahyo Wibowo', status: 'Loading', speed: 0, origin: 'Bandung', destination: 'Semarang', progress: 0, do: 'DO-260514008', lat: -6.92, lng: 107.61 },
			{ id: 'F 7890 KL', driver: 'Eko Firmansyah', status: 'Moving', speed: 72, origin: 'Jakarta', destination: 'Cirebon', progress: 35, do: 'DO-260515003', lat: -6.72, lng: 108.55 },
			{ id: 'H 3456 MN', driver: 'Fajar Nugroho', status: 'Available', speed: 0, origin: '-', destination: '-', progress: 0, do: '-', lat: -6.17, lng: 106.83 },
		]
	};
};
