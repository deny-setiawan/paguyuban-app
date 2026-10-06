import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { verifyJwt } from '@/lib/auth/jwt'

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyJwt(token)
  if (!payload || payload.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let url = process.env.WA_OTP_SERVICE_URL
  const secret = process.env.WA_OTP_INTERNAL_SECRET
  if (!url || !secret) return NextResponse.json({ error: 'WA service not configured' }, { status: 503 })
  if (!url.startsWith('http://') && !url.startsWith('https://')) url = `https://${url}`
  url = url.replace(/\/$/, '')

  try {
    const res = await fetch(`${url}/groups`, {
      headers: { 'x-internal-secret': secret },
      signal: AbortSignal.timeout(10000),
      cache: 'no-store',
    })
    if (!res.ok) return NextResponse.json({ error: 'WA service error', groups: [] }, { status: 502 })
    const data = await res.json()
    return NextResponse.json({ groups: data.groups ?? [] })
  } catch {
    return NextResponse.json({ error: 'Tidak dapat menjangkau WA service', groups: [] }, { status: 503 })
  }
}
