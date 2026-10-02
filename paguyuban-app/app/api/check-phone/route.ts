import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { profiles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { normalizePhone } from '@/lib/utils'

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json()
    if (!phone) return NextResponse.json({ found: false })

    const normalized = normalizePhone(phone)
    const [existing] = await db.select({ id: profiles.id, fullName: profiles.fullName })
      .from(profiles).where(eq(profiles.phone, normalized)).limit(1)

    if (existing) {
      return NextResponse.json({ found: true, nama: existing.fullName || 'Pemilik nomor ini' })
    }
    return NextResponse.json({ found: false })
  } catch {
    return NextResponse.json({ found: false })
  }
}
