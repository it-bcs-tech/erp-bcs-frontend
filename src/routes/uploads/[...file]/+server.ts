import type { RequestHandler } from './$types';
import { GET as apiGet, HEAD as apiHead } from '../../api/uploads/[...file]/+server';

export const GET: RequestHandler = async (event) => {
	return apiGet(event as any);
};

export const HEAD: RequestHandler = async (event) => {
	return apiHead(event as any);
};
