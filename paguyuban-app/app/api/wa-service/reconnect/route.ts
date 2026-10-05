import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJwt } from '@/lib/auth/jwt'

export async function POST() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyJwt(token)
  if (!payload || payload.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let url = process.env.WA_OTP_SERVICE_URL
  if (!url) return NextResponse.json({ error: 'not_configured' }, { status: 404 })
  if (!url.startsWith('http://') && !url.startsWith('https://')) url = `https://${url}`
  url = url.replace(/\/$/, '')

  try {
    await fetch(`${url}/reconnect`, {
      method: 'POST',
      redirect: 'manual',
      signal: AbortSignal.timeout(10000),
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to reconnect' }, { status: 502 })
  }
}
