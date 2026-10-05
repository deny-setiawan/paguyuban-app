import { cookies } from 'next/headers'
import { verifyJwt } from '@/lib/auth/jwt'

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return new Response('Unauthorized', { status: 401 })
  const payload = await verifyJwt(token)
  if (!payload || payload.role !== 'admin') return new Response('Forbidden', { status: 403 })

  const url = process.env.WA_OTP_SERVICE_URL
  if (!url) return new Response('Not configured', { status: 404 })

  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/qr.png`, {
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
    })
    if (!res.ok) return new Response('QR not available', { status: 404 })
    const buffer = await res.arrayBuffer()
    return new Response(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store',
      },
    })
  } catch {
    return new Response('Failed to fetch QR', { status: 502 })
  }
}
