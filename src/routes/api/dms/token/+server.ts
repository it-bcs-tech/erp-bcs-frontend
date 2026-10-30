import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createScopedDocToken, getSingleDocViewUrl, getFleetDocsViewUrl } from '$lib/server/dmsToken';

export const GET: RequestHandler = async ({ url, locals }) => {
	const user = locals.user;
	if (!user) {
		throw error(401, 'Unauthorized');
	}

	const docId = url.searchParams.get('docId');
	const unitId = url.searchParams.get('unitId');
	const nomorUnit = url.searchParams.get('nomorUnit') || undefined;

	if (docId) {
		const token = createScopedDocToken({ type: 'single', docId });
		return json({
			success: true,
			token,
			url: `/view-doc?token=${token}`
		});
	}

	if (unitId) {
		const token = createScopedDocToken({ type: 'fleet', unitId, nomorUnit });
		return json({
			success: true,
			token,
			url: `/view-doc/fleet?token=${token}`
		});
	}

	throw error(400, 'Parameter docId atau unitId wajib disertakan');
};
