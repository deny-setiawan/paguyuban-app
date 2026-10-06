import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { surat, profiles, rtGroups } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { sendWhatsAppMessage, phoneToJid, DEFAULT_NOTIF_CONFIG } from '@/lib/wa-client'
import type { WaNotifConfig } from '@/lib/wa-client'

const PROSES_ROLES = ['ketua', 'sekretaris', 'admin']

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyJwt(token)
  if (!payload || !PROSES_ROLES.includes(payload.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { status, nomorSurat } = await req.json()

  const [suratData] = await db.select({ pemohonId: surat.pemohonId, namaPemohon: surat.namaPemohon, jenis: surat.jenis })
    .from(surat)
    .where(and(eq(surat.id, id), eq(surat.rtGroupId, payload.rtGroupId!)))
    .limit(1)
  if (!suratData) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updates: Record<string, unknown> = { dibuatOleh: payload.sub }
  if (status) updates.status = status
  if (nomorSurat !== undefined) updates.nomorSurat = nomorSurat

  await db.update(surat).set(updates).where(
    and(eq(surat.id, id), eq(surat.rtGroupId, payload.rtGroupId!))
  )

  // WA notification on status change
  if (status === 'diproses' || status === 'selesai') {
    try {
      const [profData] = await db.select({ phone: profiles.phone }).from(profiles)
        .where(eq(profiles.id, suratData.pemohonId)).limit(1)
      if (profData?.phone) {
        const [rtData] = await db.select({ waNotifConfig: rtGroups.waNotifConfig })
          .from(rtGroups).where(eq(rtGroups.id, payload.rtGroupId!)).limit(1)
        const cfg = { ...DEFAULT_NOTIF_CONFIG, ...(rtData?.waNotifConfig as WaNotifConfig | null ?? {}) }
        if (cfg.suratUpdate !== false) {
          const nama = suratData.namaPemohon ? ` *${suratData.namaPemohon}*` : ''
          const statusText = status === 'diproses' ? 'sedang *diproses*' : 'sudah *selesai*'
          const extra = status === 'selesai' ? '\n\nSilakan hubungi pengurus RT untuk pengambilan surat.' : ''
          const msg = `Halo${nama}! 📄\n\nPengajuan surat *${suratData.jenis}* Anda ${statusText} oleh pengurus RT.${extra}`
          sendWhatsAppMessage(phoneToJid(profData.phone), msg).catch(() => {})
        }
      }
    } catch { /* jangan ganggu response utama */ }
  }

  return NextResponse.json({ ok: true })
}
