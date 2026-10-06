import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { rtGroups } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import NotifikasiServiceClient from './NotifikasiServiceClient'
import { DEFAULT_NOTIF_CONFIG } from '@/lib/wa-client'
import type { WaNotifConfig } from '@/lib/wa-client'

export default async function NotifikasiServicePage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) redirect('/')
  const payload = await verifyJwt(token)
  if (!payload || payload.role !== 'admin') redirect('/pengurus')

  let waServiceUrl = process.env.WA_OTP_SERVICE_URL || null
  if (waServiceUrl) {
    if (!waServiceUrl.startsWith('http://') && !waServiceUrl.startsWith('https://')) waServiceUrl = `https://${waServiceUrl}`
    waServiceUrl = waServiceUrl.replace(/\/$/, '')
  }

  let initialStatus: 'connected' | 'connecting' | 'disconnected' | 'not_configured' | 'error' = 'not_configured'
  let initialPhone: string | null = null

  if (waServiceUrl) {
    try {
      const res = await fetch(`${waServiceUrl}/health`, { signal: AbortSignal.timeout(5000), cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        initialStatus = data.status ?? 'error'
        initialPhone = data.phone ?? null
      } else { initialStatus = 'error' }
    } catch { initialStatus = 'error' }
  }

  // Fetch notification config for this RT
  let initialNotifConfig: WaNotifConfig = { ...DEFAULT_NOTIF_CONFIG }
  if (payload.rtGroupId) {
    try {
      const [rt] = await db.select({ waNotifConfig: rtGroups.waNotifConfig })
        .from(rtGroups).where(eq(rtGroups.id, payload.rtGroupId)).limit(1)
      if (rt?.waNotifConfig) {
        initialNotifConfig = { ...DEFAULT_NOTIF_CONFIG, ...(rt.waNotifConfig as WaNotifConfig) }
      }
    } catch { /* table column not yet migrated */ }
  }

  return (
    <NotifikasiServiceClient
      initialStatus={initialStatus}
      initialPhone={initialPhone}
      configured={!!waServiceUrl}
      initialNotifConfig={initialNotifConfig}
    />
  )
}
