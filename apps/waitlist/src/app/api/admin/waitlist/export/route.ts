import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const token = process.env.WAITLIST_ADMIN_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
  const auth = request.headers.get('authorization')
  const bearer = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  if (!bearer || bearer !== token) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    const pool = getPool()
    const { rows } = await pool.query<{ email: string; created_at: Date }>(
      `SELECT email, created_at FROM waitlist_signups ORDER BY created_at ASC`
    )
    const header = 'email,created_at'
    const lines = rows.map((r) => `${r.email},${r.created_at.toISOString()}`)
    const body = [header, ...lines].join('\n') + '\n'
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="waitlist-signups.csv"',
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
