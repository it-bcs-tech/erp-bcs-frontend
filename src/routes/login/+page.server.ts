import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { apiFetch } from '$lib/utils/api';
import { logError } from '$lib/utils/logger';

export const actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const email = data.get('email')?.toString();
		const password = data.get('password')?.toString();

		if (!email || !password) {
			return fail(400, { email, error: 'Email and password are required' });
		}

		try {
			const response = await apiFetch<{ access_token: string; user: { id: number; name: string } }>(
				'/api/v1/auth/login',
				{
					method: 'POST',
					body: JSON.stringify({ email, password })
				}
			);

			cookies.set('auth_token', response.data.access_token, {
				path: '/',
				httpOnly: true,   // Tidak bisa diakses JavaScript browser (aman dari XSS)
				secure: false,    // Set true jika sudah menggunakan HTTPS
				maxAge: 60 * 60 * 24 // 1 hari
			});

			return { success: true, userName: response.data.user.name };
		} catch (error: any) {
			logError('LOGIN_ACTION', 'Failed to login', { email, error: error?.message || error });
			return fail(500, { email, error: 'Internal server error or connection failed' });
		}
	}
} satisfies Actions;
