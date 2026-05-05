import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { apiFetch } from '$lib/utils/api';

export const actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const email = data.get('email')?.toString();
		const password = data.get('password')?.toString();

		if (!email || !password) {
			return fail(400, { email, error: 'Email and password are required' });
		}

		try {
			// ┌─────────────────────────────────────────────────────┐
			// │ KETIKA BACKEND SUDAH AKTIF, uncomment blok ini:     │
			// └─────────────────────────────────────────────────────┘
			// const response = await apiFetch<{ token: string; user: { id: number; name: string } }>(
			// 	'/api/v1/auth/login',
			// 	{
			// 		method: 'POST',
			// 		body: JSON.stringify({ email, password })
			// 	}
			// );
			//
			// cookies.set('auth_token', response.data.token, {
			// 	path: '/',
			// 	httpOnly: true,   // Tidak bisa diakses JavaScript browser (aman dari XSS)
			// 	secure: false,    // Set true jika sudah menggunakan HTTPS
			// 	maxAge: 60 * 60 * 24 // 1 hari
			// });
			//
			// return { success: true, userName: response.data.user.name };

			// ┌─────────────────────────────────────────────────────┐
			// │ MOCK LOGIN — Hapus blok ini setelah backend aktif   │
			// │ Akun demo: admin@mybcs.com / password               │
			// └─────────────────────────────────────────────────────┘
			const mockUsers = [
				{ id: 1, email: 'admin@mybcs.com', password: 'password', name: 'Admin BCS' },
				{ id: 2, email: 'hris@mybcs.com', password: 'password', name: 'HRIS Manager' },
			];

			const user = mockUsers.find(u => u.email === email && u.password === password);

			if (!user) {
				return fail(400, { email, error: 'Invalid email or password' });
			}

			cookies.set('auth_token', `user_token_${user.id}`, {
				path: '/',
				httpOnly: true,
				secure: false,
				maxAge: 60 * 60 * 24
			});

			return { success: true, userName: user.name };
		} catch (error) {
			console.error('Login error:', error);
			return fail(500, { email, error: 'Internal server error' });
		}
	}
} satisfies Actions;
