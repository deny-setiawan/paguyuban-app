import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { wargaInvites, rtGroups } from '@/lib/db/schema'
import { canAccess, type MenuConfig } from '@/lib/menu-config'
import { Users } from 'lucide-react'
import { eq, desc } from 'drizzle-orm'
import VerifikasiClient from './VerifikasiClient'
import Link from 'next/link'

export default async function VerifikasiPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) redirect('/')
  const payload = await verifyJwt(token)
  if (!payload) redirect('/')
  const menuConfig = payload.rtGroupId
    ? await db.select({ menuConfig: rtGroups.menuConfig }).from(rtGroups)
        .where(eq(rtGroups.id, payload.rtGroupId)).limit(1)
        .then(r => (r[0]?.menuConfig as MenuConfig) ?? null)
    : null
  if (!canAccess('wargaBaru', payload.role, menuConfig)) redirect('/pengurus')

  // Exclude fotoFiles (bisa berupa base64 besar) — dimuat lazy saat detail dibuka
  const list = await db.select({
    id: wargaInvites.id,
    nama: wargaInvites.nama,
    noRumah: wargaInvites.noRumah,
    status: wargaInvites.status,
    jenis: wargaInvites.jenis,
    profileId: wargaInvites.profileId,
    dataKk: wargaInvites.dataKk,
    anggota: wargaInvites.anggota,
    createdAt: wargaInvites.createdAt,
  }).from(wargaInvites)
    .where(eq(wargaInvites.rtGroupId, payload.rtGroupId!))
    .orderBy(desc(wargaInvites.createdAt))
    .limit(100)

  const canApprove = canAccess('wargaBaru', payload.role, menuConfig)

  return (
    <>
      <div className="sec-h" style={{ marginBottom: 16 }}>
        <div className="t"><Users size={16} /> Verifikasi Warga Baru</div>
        <Link href="/pengurus" style={{ fontSize: 13, color: 'var(--g600)', textDecoration: 'none', fontWeight: 700 }}>← Kembali</Link>
      </div>
      <VerifikasiClient items={list.map(i => ({
        id: i.id,
        nama: i.nama,
        noRumah: i.noRumah,
        status: i.status || 'pending',
        jenis: i.jenis || 'warga_baru',
        dataKk: i.dataKk as Record<string, string> | null,
        anggota: i.anggota as Array<Record<string, string>> | null,
        createdAt: i.createdAt.toISOString(),
      }))} canApprove={canApprove} />
    </>
  )
}
