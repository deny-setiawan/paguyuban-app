export async function sendWhatsAppOtp(phone: string, otp: string): Promise<boolean> {
  const url = process.env.WA_OTP_SERVICE_URL
  const secret = process.env.WA_OTP_INTERNAL_SECRET

  if (!url || !secret) {
    // Dev mode: log OTP to console instead
    console.log(`[DEV] OTP for ${phone}: ${otp}`)
    return true
  }

  try {
    const res = await fetch(`${url}/send-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': secret,
      },
      body: JSON.stringify({ phone, otp }),
    })
    const data = await res.json()
    return data.ok === true
  } catch (err) {
    console.error('[WA Client] Failed to send OTP:', err)
    return false
  }
}
