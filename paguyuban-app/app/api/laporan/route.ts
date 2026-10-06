import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { laporanWarga, profiles, rtGroups } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { sendWhatsAppMessage, DEFAULT_NOTIF_CONFIG } from '@/lib/wa-client'
import type { WaNotifConfig } from '@/lib/wa-client'

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyJwt(token)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const list = await db.select().from(laporanWarga)
    .where(eq(laporanWarga.pelaporId, payload.sub))
    .orderBy(desc(laporanWarga.createdAt))
    .limit(50)

  return NextResponse.json({ list })
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyJwt(token)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { kategori, judul, isi, fotoUrl } = body

  if (!kategori || !judul) {
    return NextResponse.json({ error: 'Kategori dan judul wajib diisi' }, { status: 400 })
  }

  const [profile] = await db.select().from(profiles).where(eq(profiles.id, payload.sub)).limit(1)
  if (!profile?.rtGroupId) {
    return NextResponse.json({ error: 'Akun belum terdaftar di RT' }, { status: 403 })
  }

  const [laporan] = await db.insert(laporanWarga).values({
    rtGroupId: profile.rtGroupId,
    pelaporId: payload.sub,
    kategori,
    judul,
    isi: isi || null,
    fotoUrl: fotoUrl || null,
    status: 'menunggu',
  }).returning()

  // Group WA notification for new laporan
  try {
    const [rtData] = await db.select({ waNotifConfig: rtGroups.waNotifConfig })
      .from(rtGroups).where(eq(rtGroups.id, profile.rtGroupId)).limit(1)
    const cfg = { ...DEFAULT_NOTIF_CONFIG, ...(rtData?.waNotifConfig as WaNotifConfig | null ?? {}) }
    if (cfg.groupLaporan) {
      const msg = `📋 *Laporan Baru*\n\nKategori: ${kategori}\nJudul: *${judul}*\nDari: ${profile.fullName || profile.phone}\n\nSilakan cek di aplikasi pengurus.`
      sendWhatsAppMessage(cfg.groupLaporan, msg).catch(() => {})
    }
  } catch { /* jangan ganggu response utama */ }

  return NextResponse.json({ ok: true, laporan })
}
