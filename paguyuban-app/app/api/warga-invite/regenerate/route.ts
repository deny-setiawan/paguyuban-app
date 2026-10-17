import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { wargaInvites, warga, profiles } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyJwt(token)
  if (!payload || payload.role !== 'admin') {
    return NextResponse.json({ error: 'Hanya admin yang bisa regenerate data warga' }, { status: 403 })
  }
  if (!payload.rtGroupId) return NextResponse.json({ error: 'No RT' }, { status: 400 })

  const { inviteId } = await req.json()
  if (!inviteId) return NextResponse.json({ error: 'inviteId wajib' }, { status: 400 })

  const log: string[] = []
  let created = 0
  let updated = 0

  try {
    const [invite] = await db.select().from(wargaInvites)
      .where(and(eq(wargaInvites.id, inviteId), eq(wargaInvites.rtGroupId, payload.rtGroupId)))
      .limit(1)

    if (!invite) {
      log.push('❌ Invite tidak ditemukan')
      return NextResponse.json({ ok: false, log, created: 0, updated: 0 }, { status: 404 })
    }

    const jenisLabel = invite.jenis === 'pemutakhiran_warga' ? 'Pemutakhiran Data' : 'Warga Baru'
    log.push(`📋 Invite: ${invite.nama} | Jenis: ${jenisLabel} | Status: ${invite.status}`)
    log.push(`📍 No. Rumah: ${invite.noRumah || '(tidak ada)'}`)

    if (!invite.profileId) {
      log.push('❌ profileId tidak ada di invite — tidak bisa buat data warga')
      log.push('ℹ️ Kemungkinan pendaftar tidak menyertakan nomor HP yang valid')
      console.warn(`[regenerate] inviteId=${inviteId} profileId null`)
      return NextResponse.json({ ok: false, log, created: 0, updated: 0 })
    }

    const [profile] = await db.select({ phone: profiles.phone, isActive: profiles.isActive, fullName: profiles.fullName })
      .from(profiles).where(eq(profiles.id, invite.profileId)).limit(1)

    if (!profile) {
      log.push('❌ Profile tidak ditemukan di database')
      return NextResponse.json({ ok: false, log, created: 0, updated: 0 })
    }
    log.push(`👤 Profile: ${profile.fullName || '-'} | HP: ${profile.phone} | Aktif: ${profile.isActive ? 'Ya' : 'Belum'}`)

    // Aktifkan profile jika belum
    if (!profile.isActive) {
      await db.update(profiles).set({ isActive: true }).where(eq(profiles.id, invite.profileId))
      log.push('✅ Profile diaktifkan')
    }

    const dataKk = invite.dataKk as Record<string, string> | null
    const anggotaList = invite.anggota as Array<Record<string, string>> | null

    // Cek warga yang sudah ada
    const existingList = await db.select().from(warga).where(eq(warga.profileId, invite.profileId))
    log.push(`🔍 Data warga yang sudah ada: ${existingList.length} record`)

    const existingKepala = existingList.find(w => w.kkStatus === 'kepala_kk')

    if (existingKepala) {
      // Update kepala yang sudah ada
      await db.update(warga).set({
        namaLengkap: invite.nama,
        noRumah: invite.noRumah || existingKepala.noRumah,
        statusHunian: dataKk?.hunian || existingKepala.statusHunian,
        statusPerkawinan: dataKk?.kawin || existingKepala.statusPerkawinan,
        jenisKelamin: dataKk?.jk || existingKepala.jenisKelamin,
        agama: dataKk?.agama || existingKepala.agama,
        pekerjaan: dataKk?.pekerjaan || existingKepala.pekerjaan,
        tanggalMenempati: dataKk?.tgl || existingKepala.tanggalMenempati,
        alamatLengkap: dataKk?.alamat || existingKepala.alamatLengkap,
      }).where(eq(warga.id, existingKepala.id))
      updated++
      log.push(`✅ Kepala KK diperbarui: ${existingKepala.id}`)
    } else {
      // Buat kepala baru
      const [newKepala] = await db.insert(warga).values({
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
      }).returning()
      created++
      log.push(`✅ Kepala KK dibuat baru: ${newKepala.id}`)
    }

    // Anggota keluarga
    if (Array.isArray(anggotaList) && anggotaList.length > 0) {
      log.push(`👨‍👩‍👧‍👦 Anggota dalam data invite: ${anggotaList.length} orang`)
      for (const a of anggotaList) {
        if (!a.nama?.trim()) {
          log.push('  ⏭️ Skip: anggota tanpa nama')
          continue
        }
        // Cek apakah anggota sudah ada (by nama + noRumah + kkStatus)
        const alreadyExists = existingList.some(
          w => w.namaLengkap === a.nama.trim() && w.kkStatus === 'anggota'
        )
        if (alreadyExists) {
          log.push(`  ⏭️ Skip: ${a.nama} sudah ada`)
          continue
        }
        await db.insert(warga).values({
          rtGroupId: invite.rtGroupId,
          namaLengkap: a.nama.trim(),
          hubunganKeluarga: a.hub || a.hubungan || null,
          tanggalLahir: a.tgl || null,
          jenisKelamin: a.jk || null,
          agama: a.agama || null,
          pekerjaan: a.pekerjaan || null,
          kkStatus: 'anggota',
          noRumah: invite.noRumah || null,
        })
        created++
        log.push(`  ✅ Anggota dibuat: ${a.nama} (${a.hub || a.hubungan || '-'})`)
      }
    } else {
      log.push('ℹ️ Tidak ada data anggota dalam invite')
    }

    const summary = `Selesai: ${created} data dibuat, ${updated} data diperbarui`
    log.push(`\n${summary}`)
    console.log(`[regenerate] inviteId=${inviteId} ${summary}`)

    return NextResponse.json({ ok: true, log, created, updated })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    log.push(`❌ Error tidak terduga: ${msg}`)
    console.error(`[regenerate] GAGAL inviteId=${inviteId}:`, msg)
    return NextResponse.json({ ok: false, log, created, updated, error: msg }, { status: 500 })
  }
}
