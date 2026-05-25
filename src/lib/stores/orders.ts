import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type OrderStatus = 'WAITING_UJO' | 'WAITING_TARIFF' | 'WAITING_CUSTOMER' | 'READY_TO_DISPATCH' | 'DISPATCHED' | 'CLOSING' | 'COMPLETED';

export interface Order {
	id: string;
	customer: string;
	origin: string;
	destination: string;
	cargoType: string;
	weight: string;
	vehicleType: string;
	loadingDate: string;
	eta?: string;
	
	// OCS Assigned
	assignedUnit?: string;
	assignedDriver?: string;
	estimatedUjo?: number;
	ujoMakan?: number;
	ujoTol?: number;
	
	// Marketing Assigned
	tariff?: number;
	
	// Closing details (OCS)
	realWeight?: string;
	extraCost?: number;
	extraCostDesc?: string;

	// Kasir flags
	ujoReleased?: boolean;
	dnSettled?: boolean;

	status: OrderStatus;
	createdAt: string;
}

const initialOrders: Order[] = [];

const STORE_KEY = 'erp_bcs_orders';

function createOrdersStore() {
	// Initialize from localStorage if available, otherwise use initial data
	let storedData = null;
	if (browser) {
		const storedString = localStorage.getItem(STORE_KEY);
		if (storedString) {
			try {
				storedData = JSON.parse(storedString);
			} catch (e) {
				console.error("Error parsing stored orders", e);
			}
		}
	}

	const { subscribe, set, update } = writable<Order[]>(storedData || initialOrders);

	return {
		subscribe,
		// Override set and update to automatically persist to localStorage
		set: (value: Order[]) => {
			if (browser) localStorage.setItem(STORE_KEY, JSON.stringify(value));
			set(value);
		},
		update: (updater: (value: Order[]) => Order[]) => {
			update((current) => {
				const newValue = updater(current);
				if (browser) localStorage.setItem(STORE_KEY, JSON.stringify(newValue));
				return newValue;
			});
		},
		addOrder: (order: Omit<Order, 'id' | 'createdAt' | 'status'>) => {
			update(orders => {
				const newId = `DO-${new Date().toISOString().slice(2,10).replace(/-/g, '')}${String(orders.length + 1).padStart(3, '0')}`;
				const newOrder: Order = {
					...order,
					id: newId,
					status: 'WAITING_UJO',
					createdAt: new Date().toISOString().split('T')[0]
				};
				return [newOrder, ...orders];
			});
		},
		updateOrder: (id: string, updates: Partial<Order>) => {
			update(orders => orders.map(o => o.id === id ? { ...o, ...updates } : o));
		}
	};
}

export const ordersStore = createOrdersStore();
