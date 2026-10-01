import { db } from '@/lib/db'
import { otpSessions } from '@/lib/db/schema'
import { eq, and, gt } from 'drizzle-orm'

export function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export async function saveOtp(phone: string, otpCode: string): Promise<void> {
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000)
  await db.insert(otpSessions).values({ phone, otpCode, expiresAt })
}

export async function verifyOtp(phone: string, otpCode: string): Promise<boolean> {
  const rows = await db
    .select()
    .from(otpSessions)
    .where(
      and(
        eq(otpSessions.phone, phone),
        eq(otpSessions.otpCode, otpCode),
        eq(otpSessions.used, false),
        gt(otpSessions.expiresAt, new Date())
      )
    )
    .limit(1)

  if (!rows.length) return false

  await db.update(otpSessions).set({ used: true }).where(eq(otpSessions.id, rows[0].id))
  return true
}
