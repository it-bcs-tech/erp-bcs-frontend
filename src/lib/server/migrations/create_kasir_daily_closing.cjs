const postgres = require('postgres');

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://bcs_admin:sangatrahasia@103.31.205.199:5433/mybcs_db';
const sql = postgres(DATABASE_URL);

async function migrate() {
  console.log('--- Migrating: finance.kasir_daily_closing ---');

  await sql`
    CREATE TABLE IF NOT EXISTS finance.kasir_daily_closing (
      id SERIAL PRIMARY KEY,
      closing_number VARCHAR(50) UNIQUE NOT NULL,
      closing_date DATE NOT NULL,
      period_start TIMESTAMP WITH TIME ZONE,
      period_end TIMESTAMP WITH TIME ZONE,
      opening_cash NUMERIC(15,2) DEFAULT 0,
      total_fund_dropped NUMERIC(15,2) DEFAULT 0,
      total_cash_available NUMERIC(15,2) DEFAULT 0,
      total_ujo_paid NUMERIC(15,2) DEFAULT 0,
      total_dn_claim_paid NUMERIC(15,2) DEFAULT 0,
      total_other_expenses NUMERIC(15,2) DEFAULT 0,
      total_refund_received NUMERIC(15,2) DEFAULT 0,
      total_cash_out NUMERIC(15,2) DEFAULT 0,
      expected_closing_cash NUMERIC(15,2) DEFAULT 0,
      actual_closing_cash NUMERIC(15,2) DEFAULT 0,
      cash_difference NUMERIC(15,2) DEFAULT 0,
      difference_reason TEXT,
      status VARCHAR(30) DEFAULT 'BALANCED',
      shift_session_ids INTEGER[] DEFAULT '{}',
      closed_by VARCHAR(100),
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await sql`
    ALTER TABLE finance.kasir_shift_sessions 
    ADD COLUMN IF NOT EXISTS daily_closing_id INTEGER REFERENCES finance.kasir_daily_closing(id) ON DELETE SET NULL;
  `;

  console.log('--- Migration completed successfully! ---');
  await sql.end();
}

migrate().catch(e => {
  console.error('Migration failed:', e);
  process.exit(1);
});
