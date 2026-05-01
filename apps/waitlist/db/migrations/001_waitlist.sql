-- Waitlist signups (Neon). Apply with: psql "$DATABASE_URL" -f db/migrations/001_waitlist.sql

CREATE TABLE IF NOT EXISTS waitlist_signups (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
