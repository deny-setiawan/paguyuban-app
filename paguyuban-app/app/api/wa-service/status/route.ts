import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJwt } from '@/lib/auth/jwt'

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyJwt(token)
  if (!payload || payload.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let url = process.env.WA_OTP_SERVICE_URL
  if (!url) return NextResponse.json({ status: 'not_configured', phone: null })
  if (!url.startsWith('http://') && !url.startsWith('https://')) url = `https://${url}`
  url = url.replace(/\/$/, '')

  try {
    const res = await fetch(`${url}/health`, {
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
    })
    const data = await res.json()
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ status: 'error', phone: null })
  }
}
