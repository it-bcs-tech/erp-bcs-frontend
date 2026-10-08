import { load as hrisLoad, actions as hrisActions } from '../hris/assessments/+page.server';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = (async (event) => {
	return await hrisLoad(event as any);
}) as PageServerLoad;

export const actions: Actions = hrisActions as Actions;
