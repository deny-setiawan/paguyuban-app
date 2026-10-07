import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { laporanWarga, profiles, rtGroups } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { sendWhatsAppMessage, phoneToJid, DEFAULT_NOTIF_CONFIG } from '@/lib/wa-client'
import type { WaNotifConfig } from '@/lib/wa-client'

const TANGGAP_ROLES = ['ketua', 'sekretaris', 'admin']

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyJwt(token)
  if (!payload || !TANGGAP_ROLES.includes(payload.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { tanggapan, status } = await req.json()

  const [laporan] = await db.select({ pelaporId: laporanWarga.pelaporId, judul: laporanWarga.judul })
    .from(laporanWarga)
    .where(and(eq(laporanWarga.id, id), eq(laporanWarga.rtGroupId, payload.rtGroupId!)))
    .limit(1)
  if (!laporan) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.update(laporanWarga).set({
    ...(tanggapan !== undefined && { tanggapan }),
    ...(status && { status }),
    tanggapiOleh: payload.sub,
  }).where(and(eq(laporanWarga.id, id), eq(laporanWarga.rtGroupId, payload.rtGroupId!)))

  // WA notification on status change
  if (status === 'diproses' || status === 'selesai') {
    try {
      const [profData] = await db.select({ phone: profiles.phone }).from(profiles)
        .where(eq(profiles.id, laporan.pelaporId)).limit(1)
      if (profData?.phone) {
        const [rtData] = await db.select({ waNotifConfig: rtGroups.waNotifConfig })
          .from(rtGroups).where(eq(rtGroups.id, payload.rtGroupId!)).limit(1)
        const cfg = { ...DEFAULT_NOTIF_CONFIG, ...(rtData?.waNotifConfig as WaNotifConfig | null ?? {}) }
        if (cfg.laporanUpdate !== false) {
          const statusText = status === 'diproses' ? 'sedang *diproses*' : 'telah *diselesaikan*'
          const msg = `Halo! 📋\n\nLaporan Anda:\n*${laporan.judul}*\n\n${statusText} oleh pengurus RT.\n\nTerima kasih telah melaporkan! 🙏`
          await sendWhatsAppMessage(phoneToJid(profData.phone), msg)
        }
      }
    } catch { /* jangan ganggu response utama */ }
  }

  return NextResponse.json({ ok: true })
}
