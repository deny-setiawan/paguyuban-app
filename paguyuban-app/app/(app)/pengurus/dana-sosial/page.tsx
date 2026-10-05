import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { warga, iuranSettings, rtGroups } from '@/lib/db/schema'
import { canAccess, type MenuConfig } from '@/lib/menu-config'
import { Handshake } from 'lucide-react'
import { eq } from 'drizzle-orm'
import DanaSosialClient from './DanaSosialClient'
import Link from 'next/link'

export default async function DanaSosialPage() {
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
  if (!canAccess('danaSosial', payload.role, menuConfig)) redirect('/pengurus')

  const [wargaList, settings] = await Promise.all([
    db.select().from(warga)
      .where(eq(warga.rtGroupId, payload.rtGroupId!))
      .orderBy(warga.noRumah),
    db.select().from(iuranSettings)
      .where(eq(iuranSettings.rtGroupId, payload.rtGroupId!))
      .limit(1),
  ])

  const kepalaKk = wargaList.filter(w => w.kkStatus === 'kepala_kk')
  const alokasiSosial = settings[0]?.alokasiSosial ?? 0

  return (
    <>
      <div className="sec-h" style={{ marginBottom: 16 }}>
        <div className="t"><Handshake size={16} /> Dana Sosial</div>
        <Link href="/pengurus" style={{ fontSize: 13, color: 'var(--g600)', textDecoration: 'none', fontWeight: 700 }}>← Kembali</Link>
      </div>
      <DanaSosialClient
        items={kepalaKk.map(w => ({
          id: w.id,
          nama: w.namaLengkap,
          noRumah: w.noRumah,
          statusSosial: w.statusSosial,
          dansosKelahiranTerpakai: w.dansosKelahiranTerpakai ?? 0,
          dansosSakitTerpakai: w.dansosSakitTerpakai ?? 0,
        }))}
        alokasiSosial={alokasiSosial}
      />
    </>
  )
}
