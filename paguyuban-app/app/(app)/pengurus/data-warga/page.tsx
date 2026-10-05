import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { warga, profiles, wargaInvites, rtGroups } from '@/lib/db/schema'
import { canAccess, type MenuConfig } from '@/lib/menu-config'
import { Users } from 'lucide-react'
import { eq, and, ne } from 'drizzle-orm'
import DataWargaClient from './DataWargaClient'
import Link from 'next/link'

const KK_ROLES = ['ketua', 'wakil_ketua', 'sekretaris', 'bendahara', 'humas', 'lingkungan', 'keamanan', 'peralatan']

export default async function DataWargaPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) redirect('/')
  const payload = await verifyJwt(token)
  if (!payload) redirect('/')

  const rtId = payload.rtGroupId!

  const menuConfig = rtId
    ? await db.select({ menuConfig: rtGroups.menuConfig }).from(rtGroups)
        .where(eq(rtGroups.id, rtId)).limit(1)
        .then(r => (r[0]?.menuConfig as MenuConfig) ?? null)
    : null
  if (!canAccess('dataWarga', payload.role, menuConfig)) redirect('/pengurus')

  // All warga records with linked profile info
  const wargaList = await db.select({
    warga,
    phone: profiles.phone,
    isActive: profiles.isActive,
    role: profiles.role,
  }).from(warga)
    .leftJoin(profiles, eq(warga.profileId, profiles.id))
    .where(eq(warga.rtGroupId, rtId))
    .orderBy(warga.noRumah)

  // fotoFiles from approved/pending wargaInvites, keyed by profileId
  const invites = await db.select({
    profileId: wargaInvites.profileId,
    fotoFiles: wargaInvites.fotoFiles,
    noRumah: wargaInvites.noRumah,
  }).from(wargaInvites)
    .where(eq(wargaInvites.rtGroupId, rtId))

  const fotoByProfileId: Record<string, string[]> = {}
  const fotoByNoRumah: Record<string, string[]> = {}
  for (const inv of invites) {
    const urls = Array.isArray(inv.fotoFiles) ? (inv.fotoFiles as string[]) : []
    if (inv.profileId && urls.length > 0) fotoByProfileId[inv.profileId] = urls
    if (inv.noRumah && urls.length > 0) fotoByNoRumah[inv.noRumah] = urls
  }

  // Pengurus profiles (non-admin) that count as KK but may not have a warga record
  const pengurusProfiles = await db.select().from(profiles)
    .where(and(eq(profiles.rtGroupId, rtId), ne(profiles.role, 'admin' as 'admin')))

  const wargaProfileIds = new Set(wargaList.map(r => r.warga.profileId).filter(Boolean))
  const pengurusOnly = pengurusProfiles.filter(p =>
    KK_ROLES.includes(p.role) && !wargaProfileIds.has(p.id)
  )

  const items = [
    ...wargaList.map(r => ({
      id: r.warga.id,
      source: 'warga' as const,
      namaLengkap: r.warga.namaLengkap,
      nik: r.warga.nik,
      noRumah: r.warga.noRumah,
      noKk: r.warga.noKk,
      kkStatus: r.warga.kkStatus,
      hubunganKeluarga: r.warga.hubunganKeluarga,
      jenisKelamin: r.warga.jenisKelamin,
      tanggalLahir: r.warga.tanggalLahir,
      agama: r.warga.agama,
      statusPerkawinan: r.warga.statusPerkawinan,
      statusHunian: r.warga.statusHunian,
      tanggalMenempati: r.warga.tanggalMenempati,
      statusSosial: r.warga.statusSosial,
      status: r.warga.status,
      phone: r.phone,
      isActive: r.isActive,
      role: r.role,
      fotoFiles: r.warga.profileId
        ? (fotoByProfileId[r.warga.profileId] ?? (r.warga.noRumah ? (fotoByNoRumah[r.warga.noRumah] ?? null) : null))
        : (r.warga.noRumah ? (fotoByNoRumah[r.warga.noRumah] ?? null) : null),
    })),
    ...pengurusOnly.map(p => ({
      id: p.id,
      source: 'pengurus' as const,
      namaLengkap: p.fullName || p.phone,
      nik: null,
      noRumah: p.noRumah,
      noKk: null,
      kkStatus: 'kepala_kk' as const,
      hubunganKeluarga: null,
      jenisKelamin: null,
      tanggalLahir: null,
      agama: null,
      statusPerkawinan: null,
      statusHunian: null,
      tanggalMenempati: null,
      statusSosial: p.statusSosial,
      status: 'aktif' as const,
      phone: p.phone,
      isActive: p.isActive,
      role: p.role,
      fotoFiles: p.noRumah ? (fotoByNoRumah[p.noRumah] ?? null) : null,
    })),
  ]

  return (
    <>
      <div className="sec-h" style={{ marginBottom: 16 }}>
        <div className="t"><Users size={16} /> Data Warga ({items.length})</div>
        <Link href="/pengurus" style={{ fontSize: 13, color: 'var(--g600)', fontWeight: 700 }}>← Kembali</Link>
      </div>
      <DataWargaClient items={items} />
    </>
  )
}
