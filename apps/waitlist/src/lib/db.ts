import { Pool } from 'pg'

let pool: Pool | undefined

export function getPool(): Pool {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL is not set')
  }
  if (!pool) {
    pool = new Pool({ connectionString: url })
  }
  return pool
}
