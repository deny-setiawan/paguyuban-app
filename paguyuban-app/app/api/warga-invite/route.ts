import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { wargaInvites, warga, profiles, rtGroups } from '@/lib/db/schema'
import { eq, desc, and } from 'drizzle-orm'
import { sendWhatsAppMessage, phoneToJid, DEFAULT_NOTIF_CONFIG } from '@/lib/wa-client'
import type { WaNotifConfig } from '@/lib/wa-client'
import { canAccess, type MenuConfig } from '@/lib/menu-config'

export async function GET(req: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyJwt(token)
  if (!payload || !['ketua', 'sekretaris', 'bendahara', 'admin'].includes(payload.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!payload.rtGroupId) return NextResponse.json({ error: 'No RT' }, { status: 400 })

  // ?id=xxx → return single invite with full data (termasuk fotoFiles)
  const id = req.nextUrl.searchParams.get('id')
  if (id) {
    const [invite] = await db.select().from(wargaInvites)
      .where(and(eq(wargaInvites.id, id), eq(wargaInvites.rtGroupId, payload.rtGroupId)))
      .limit(1)
    if (!invite) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ invite })
  }

  const list = await db.select().from(wargaInvites)
    .where(eq(wargaInvites.rtGroupId, payload.rtGroupId))
    .orderBy(desc(wargaInvites.createdAt))
    .limit(50)

  return NextResponse.json({ list })
}

export async function PATCH(req: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyJwt(token)
  if (!payload || !payload.rtGroupId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [rtRow] = await db.select({ menuConfig: rtGroups.menuConfig }).from(rtGroups)
    .where(eq(rtGroups.id, payload.rtGroupId)).limit(1)
  const rtMenuConfig = (rtRow?.menuConfig as MenuConfig | null) ?? null
  if (!canAccess('wargaBaru', payload.role, rtMenuConfig)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id, action } = await req.json()
  if (!id || !action) return NextResponse.json({ error: 'id dan action wajib' }, { status: 400 })

  const [invite] = await db.select().from(wargaInvites).where(eq(wargaInvites.id, id)).limit(1)
  if (!invite) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (action === 'approve') {
    await db.update(wargaInvites).set({ status: 'disetujui' }).where(eq(wargaInvites.id, id))

    if (invite.profileId) {
      await db.update(profiles).set({ isActive: true }).where(eq(profiles.id, invite.profileId))
    }

    const dataKk = invite.dataKk as Record<string, string> | null
    const anggotaList = invite.anggota as Array<Record<string, string>> | null

    if (invite.jenis === 'pemutakhiran_warga') {
      // Update existing warga record with new data from form
      if (invite.profileId) {
        const [existingWarga] = await db.select().from(warga)
          .where(eq(warga.profileId, invite.profileId)).limit(1)
        if (existingWarga) {
          await db.update(warga).set({
            namaLengkap: invite.nama,
            noRumah: invite.noRumah || existingWarga.noRumah,
            statusHunian: dataKk?.hunian || existingWarga.statusHunian,
            statusPerkawinan: dataKk?.kawin || existingWarga.statusPerkawinan,
            jenisKelamin: dataKk?.jk || existingWarga.jenisKelamin,
            agama: dataKk?.agama || existingWarga.agama,
            tanggalMenempati: dataKk?.tgl || existingWarga.tanggalMenempati,
          }).where(eq(warga.id, existingWarga.id))
        }
      }
    } else {
      // warga_baru: create new warga record if not exists
      if (invite.profileId) {
        const existing = await db.select().from(warga).where(eq(warga.profileId, invite.profileId)).limit(1)
        if (existing.length === 0) {
          await db.insert(warga).values({
            rtGroupId: invite.rtGroupId,
            profileId: invite.profileId,
            namaLengkap: invite.nama,
            noRumah: invite.noRumah || null,
            kkStatus: 'kepala_kk',
            statusHunian: dataKk?.hunian || null,
            statusPerkawinan: dataKk?.kawin || null,
            jenisKelamin: dataKk?.jk || null,
            agama: dataKk?.agama || null,
            pekerjaan: dataKk?.pekerjaan || null,
            tanggalMenempati: dataKk?.tgl || null,
            alamatLengkap: dataKk?.alamat || null,
          })

          if (Array.isArray(anggotaList)) {
            for (const a of anggotaList) {
              if (!a.nama?.trim()) continue
              await db.insert(warga).values({
                rtGroupId: invite.rtGroupId,
                namaLengkap: a.nama || '',
                hubunganKeluarga: a.hub || a.hubungan || null,
                tanggalLahir: a.tgl || null,
                jenisKelamin: a.jk || null,
                agama: a.agama || null,
                pekerjaan: a.pekerjaan || null,
                kkStatus: 'anggota',
                noRumah: invite.noRumah || null,
              })
            }
          }
        }
      }
    }

    // WA notification to warga
    if (invite.profileId) {
      try {
        const [profData] = await db.select({ phone: profiles.phone }).from(profiles)
          .where(eq(profiles.id, invite.profileId)).limit(1)
        if (profData?.phone) {
          const [rtData] = await db.select({ namaRt: rtGroups.namaRt, waNotifConfig: rtGroups.waNotifConfig })
            .from(rtGroups).where(eq(rtGroups.id, invite.rtGroupId)).limit(1)
          const cfg = { ...DEFAULT_NOTIF_CONFIG, ...(rtData?.waNotifConfig as WaNotifConfig | null ?? {}) }
          if (cfg.wargaDiterima !== false) {
            const rtName = rtData?.namaRt || 'RT'
            const msg = `Halo *${invite.nama}*! 👋\n\nPendaftaran Data Warga Anda sudah *diterima* oleh pengurus *${rtName}*.\n\nAnda bisa login menggunakan nomor yang terdaftar di aplikasi:\nhttps://app.paguyubanpkrpepe.my.id/\n\n✅ Selamat bergabung!`
            await sendWhatsAppMessage(phoneToJid(profData.phone), msg)
          }
        }
      } catch { /* jangan ganggu response utama */ }
    }

    return NextResponse.json({ ok: true, action: 'approved' })
  }

  if (action === 'reject') {
    await db.update(wargaInvites).set({ status: 'ditolak' }).where(eq(wargaInvites.id, id))
    return NextResponse.json({ ok: true, action: 'rejected' })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
