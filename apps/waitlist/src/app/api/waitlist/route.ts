import { ipAddress } from '@vercel/functions'
import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { isValidEmail, normalizeEmail } from '@/lib/email'
import { getWaitlistPostRatelimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const pool = getPool()
    const { rows } = await pool.query<{ c: string }>(
      'SELECT COUNT(*)::text AS c FROM waitlist_signups'
    )
    const count = Number.parseInt(rows[0]?.c ?? '0', 10)
    if (Number.isNaN(count)) {
      return NextResponse.json({ error: 'server_error' }, { status: 500 })
    }
    return NextResponse.json({ count })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const rl = getWaitlistPostRatelimit()
  if (process.env.NODE_ENV === 'production' && !rl) {
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
  if (rl) {
    const ip = ipAddress(request) ?? '127.0.0.1'
    const { success, reset } = await rl.limit(ip)
    if (!success) {
      const retryAfter = Math.max(
        1,
        Math.ceil((reset - Date.now()) / 1000)
      )
      return NextResponse.json(
        { error: 'rate_limited' },
        {
          status: 429,
          headers: { 'Retry-After': String(retryAfter) },
        }
      )
    }
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  const emailRaw =
    body && typeof body === 'object' && 'email' in body
      ? (body as { email: unknown }).email
      : undefined
  if (typeof emailRaw !== 'string') {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 })
  }
  const email = normalizeEmail(emailRaw)
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 })
  }

  try {
    const pool = getPool()
    const insert = await pool.query<{ id: string }>(
      `INSERT INTO waitlist_signups (email) VALUES ($1)
       ON CONFLICT (email) DO NOTHING
       RETURNING id::text`,
      [email]
    )
    const inserted = insert.rows.length > 0
    const { rows: countRows } = await pool.query<{ c: string }>(
      'SELECT COUNT(*)::text AS c FROM waitlist_signups'
    )
    const count = Number.parseInt(countRows[0]?.c ?? '0', 10)
    if (Number.isNaN(count)) {
      return NextResponse.json({ error: 'server_error' }, { status: 500 })
    }
    return NextResponse.json({
      ok: true,
      alreadyRegistered: !inserted,
      count,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
