import type { PageServerLoad } from './$types';
import sql from '$lib/server/db';

// ─────────────────────────────────────────────────────────────
// vehicles/+page.server.ts
//
// MODE: DIRECT DB (sementara, sambil menunggu backend API)
// Query langsung ke PostgreSQL mybcs_db → fleet.unit
//
// Ketika backend sudah siap, ganti dengan apiFetch ke:
//   GET /api/v1/fms/vehicles
// ─────────────────────────────────────────────────────────────

export const load: PageServerLoad = async ({ url }) => {
	const page        = Number(url.searchParams.get('page')) || 1;
	const perPage     = 10;
	const offset      = (page - 1) * perPage;
	const searchQuery = url.searchParams.get('search') || '';
	const statusFilter = url.searchParams.get('status') || '';
	const buFilter    = url.searchParams.get('business_unit') || '';
	const assetGroup  = url.searchParams.get('asset_group') || 'LOGISTICS_FLEET';

	try {
		// ── Bangun kondisi WHERE dinamis ──────────────────────────
		const conditions: string[] = ['u.deleted_at IS NULL'];
		const params: unknown[]    = [];
		let   p = 1;

		if (searchQuery) {
			conditions.push(
				`(u.nomor_unit ILIKE $${p} OR u.no_lambung ILIKE $${p} OR mu.nama_model ILIKE $${p})`
			);
			params.push(`%${searchQuery}%`);
			p++;
		}

		if (statusFilter === 'ACTIVE') {
			conditions.push(`u.is_active = true`);
		} else if (statusFilter === 'INACTIVE') {
			conditions.push(`u.is_active = false`);
		}

		if (buFilter && buFilter !== 'All') {
			conditions.push(`u.business_unit = $${p}`);
			params.push(buFilter);
			p++;
		}

		if (assetGroup && assetGroup !== 'All') {
			conditions.push(`tu.asset_group = $${p}`);
			params.push(assetGroup);
			p++;
		}

		const where = conditions.join(' AND ');

		// ── Query utama: data unit dengan JOIN ────────────────────
		const vehicles = await sql.unsafe(
			`SELECT
				u.id,
				u.nomor_unit,
				u.nomor_unit_lama,
				u.nomor_unit_tempel,
				u.no_lambung,
				u.no_rangka,
				u.no_mesin,
				u.no_bpkb,
				u.no_kir,
				u.tahun,
				mu.nama_produk,
				mu.nama_model,
				mu.axle_config,
				tu.nama_tipe,
				tu.asset_group,
				u.business_unit,
				u.no_proyek,
				u.project_area,
				u.grade,
				u.flag,
				u.is_active,
				u.tgl_maintenance_prevent,
				u.expire_date_asuransi,
				u.created_at,
				u.updated_at,
				-- Driver utama (SUPIR_UTAMA aktif) — NULL jika tidak ada
				CASE
					WHEN d.id IS NOT NULL THEN
						json_build_object(
							'id',    d.id,
							'nama',  k.nama_karyawan,
							'no_hp', uda.no_hp
						)
					ELSE NULL
				END AS driver_utama
			FROM fleet.unit u
			JOIN master.m_model_unit mu  ON mu.id = u.model_unit_id
			JOIN master.m_tipe_unit  tu  ON tu.id = mu.tipe_unit_id
			LEFT JOIN fleet.unit_driver_assignment uda
				ON uda.unit_id = u.id
				AND uda.posisi = 'SUPIR_UTAMA'
				AND uda.is_aktif = true
			LEFT JOIN master.m_drivers d      ON d.id  = uda.driver_id
			LEFT JOIN master.m_karyawan_1 k   ON k.id  = d.karyawan_id
			WHERE ${where}
			ORDER BY u.nomor_unit
			LIMIT $${p} OFFSET $${p + 1}`,
			[...params, perPage, offset]
		);

		// ── Query count total untuk pagination ────────────────────
		const [{ total }] = await sql.unsafe<[{ total: string }]>(
			`SELECT COUNT(*) AS total
			 FROM fleet.unit u
			 JOIN master.m_model_unit mu ON mu.id = u.model_unit_id
			 JOIN master.m_tipe_unit tu ON tu.id = mu.tipe_unit_id
			 WHERE ${where}`,
			params
		);

		// ── Query metrics (selalu tanpa filter halaman) ───────────
		const [metrics] = await sql.unsafe<
			[{ totalAll: string; active: string; inactive: string; maintenance: string }]
		>(`SELECT
			COUNT(*)                                    AS "totalAll",
			SUM(CASE WHEN u.is_active = true  THEN 1 ELSE 0 END) AS "active",
			SUM(CASE WHEN u.is_active = false THEN 1 ELSE 0 END) AS "inactive",
			SUM(CASE WHEN u.tgl_maintenance_prevent IS NOT NULL AND u.tgl_maintenance_prevent < CURRENT_DATE THEN 1 ELSE 0 END) AS "maintenance"
		  FROM fleet.unit u
		  JOIN master.m_model_unit mu ON mu.id = u.model_unit_id
		  JOIN master.m_tipe_unit tu ON tu.id = mu.tipe_unit_id
		  WHERE u.deleted_at IS NULL
		  AND (${assetGroup !== 'All' ? `tu.asset_group = '${assetGroup}'` : '1=1'})`);

		return {
			vehicles: vehicles as unknown[],
			metrics: {
				total:       Number(metrics.totalAll),
				active:      Number(metrics.active),
				inactive:    Number(metrics.inactive),
				maintenance: Number(metrics.maintenance)
			},
			meta: {
				current_page: page,
				per_page:     perPage,
				total:        Number(total)
			}
		};

	} catch (error) {
		console.error('[vehicles] DB query error:', error);

		// Fallback kosong — jangan crash halaman
		return {
			vehicles: [],
			metrics:  { total: 0, active: 0, inactive: 0, maintenance: 0 },
			meta:     { current_page: 1, per_page: perPage, total: 0 },
			error:    'Gagal memuat data. Silakan coba lagi.'
		};
	}
};
