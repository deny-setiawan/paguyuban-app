export interface WaNotifConfig {
  wargaDiterima?: boolean
  laporanUpdate?: boolean
  suratUpdate?: boolean
  inventarisSewa?: boolean
  groupLaporan?: string | null
}

export const DEFAULT_NOTIF_CONFIG: WaNotifConfig = {
  wargaDiterima: true,
  laporanUpdate: true,
  suratUpdate: true,
  inventarisSewa: true,
  groupLaporan: null,
}

function normalizeWaUrl(): string | null {
  let url = process.env.WA_OTP_SERVICE_URL
  if (!url) return null
  if (!url.startsWith('http://') && !url.startsWith('https://')) url = `https://${url}`
  return url.replace(/\/$/, '')
}

export function phoneToJid(phone: string): string {
  let normalized = String(phone).replace(/\D/g, '')
  if (normalized.startsWith('0')) normalized = '62' + normalized.slice(1)
  if (!normalized.startsWith('62')) normalized = '62' + normalized
  return normalized + '@s.whatsapp.net'
}

export async function sendWhatsAppOtp(phone: string, otp: string): Promise<boolean> {
  const url = normalizeWaUrl()
  const secret = process.env.WA_OTP_INTERNAL_SECRET

  if (!url || !secret) {
    console.log(`[DEV] OTP for ${phone}: ${otp}`)
    return true
  }

  try {
    const res = await fetch(`${url}/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-secret': secret },
      body: JSON.stringify({ phone, otp }),
    })
    const data = await res.json()
    return data.ok === true
  } catch (err) {
    console.error('[WA Client] Failed to send OTP:', err)
    return false
  }
}

export async function sendWhatsAppMessage(jid: string, message: string): Promise<boolean> {
  const url = normalizeWaUrl()
  const secret = process.env.WA_OTP_INTERNAL_SECRET
  if (!url || !secret) return false

  try {
    const res = await fetch(`${url}/send-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-secret': secret },
      body: JSON.stringify({ jid, message }),
      signal: AbortSignal.timeout(8000),
    })
    const data = await res.json()
    return data.ok === true
  } catch (err) {
    console.error('[WA Client] Failed to send message:', err)
    return false
  }
}
