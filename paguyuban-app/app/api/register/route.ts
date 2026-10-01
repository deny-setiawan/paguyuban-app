import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { profiles, rtGroups, wargaInvites } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { normalizePhone } from '@/lib/utils'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { jenis = 'warga_baru', nama, noRumah, phone, dataKk, anggota } = body

    if (!nama || typeof nama !== 'string' || !nama.trim()) {
      return NextResponse.json({ error: 'Nama wajib diisi' }, { status: 400 })
    }

    // Get default RT group (first available)
    const [rt] = await db.select().from(rtGroups).limit(1)
    if (!rt) {
      return NextResponse.json({ error: 'Data RT belum dikonfigurasi' }, { status: 400 })
    }

    let profileId: string | null = null

    if (jenis === 'warga_baru' && phone) {
      const normalPhone = normalizePhone(phone)
      // Check if phone already exists
      const existing = await db.select().from(profiles).where(eq(profiles.phone, normalPhone)).limit(1)
      if (existing.length > 0) {
        return NextResponse.json({ error: 'Nomor HP sudah terdaftar. Silakan login.' }, { status: 409 })
      }
      // Create profile (inactive, pending verification)
      const [newProfile] = await db.insert(profiles).values({
        phone: normalPhone,
        fullName: nama.trim(),
        role: 'warga',
        rtGroupId: rt.id,
        isActive: false,
        isVerified: false,
        noRumah: noRumah || null,
      }).returning()
      profileId = newProfile.id
    }

    // Create warga invite
    const [invite] = await db.insert(wargaInvites).values({
      rtGroupId: rt.id,
      nama: nama.trim(),
      noRumah: noRumah || null,
      status: 'pending',
      jenis,
      profileId,
      dataKk: dataKk || null,
      anggota: anggota || null,
    }).returning()

    return NextResponse.json({ ok: true, inviteId: invite.id, profileId })
  } catch (e) {
    console.error('register error', e)
    return NextResponse.json({ error: 'Gagal mendaftarkan data' }, { status: 500 })
  }
}
