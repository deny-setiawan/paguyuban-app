import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyJwt } from '@/lib/auth/jwt'
import NotifikasiServiceClient from './NotifikasiServiceClient'

export default async function NotifikasiServicePage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) redirect('/')
  const payload = await verifyJwt(token)
  if (!payload || payload.role !== 'admin') redirect('/pengurus')

  const waServiceUrl = process.env.WA_OTP_SERVICE_URL || null

  let initialStatus: 'connected' | 'connecting' | 'disconnected' | 'not_configured' | 'error' = 'not_configured'
  let initialPhone: string | null = null

  if (waServiceUrl) {
    try {
      const res = await fetch(`${waServiceUrl.replace(/\/$/, '')}/health`, {
        signal: AbortSignal.timeout(5000),
        cache: 'no-store',
      })
      if (res.ok) {
        const data = await res.json()
        initialStatus = data.status ?? 'error'
        initialPhone = data.phone ?? null
      } else {
        initialStatus = 'error'
      }
    } catch {
      initialStatus = 'error'
    }
  }

  return (
    <NotifikasiServiceClient
      initialStatus={initialStatus}
      initialPhone={initialPhone}
      configured={!!waServiceUrl}
    />
  )
}
