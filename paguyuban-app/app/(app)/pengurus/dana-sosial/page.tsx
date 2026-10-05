import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { warga, rtGroups, danaSosialHistory } from '@/lib/db/schema'
import { canAccess, type MenuConfig } from '@/lib/menu-config'
import { Handshake } from 'lucide-react'
import { eq, and, count, desc } from 'drizzle-orm'
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

  const rtGroupId = payload.rtGroupId!
  const tahun = new Date().getFullYear()

  const [allWarga, sakitRaw, kelahiranRaw, historyRaw] = await Promise.all([
    db.select({
      id: warga.id, namaLengkap: warga.namaLengkap,
      noRumah: warga.noRumah, kkStatus: warga.kkStatus,
    }).from(warga).where(eq(warga.rtGroupId, rtGroupId)).orderBy(warga.noRumah),

    db.select({ wargaId: danaSosialHistory.wargaId, cnt: count() })
      .from(danaSosialHistory)
      .where(and(
        eq(danaSosialHistory.rtGroupId, rtGroupId),
        eq(danaSosialHistory.jenis, 'sakit'),
        eq(danaSosialHistory.tahun, tahun),
      ))
      .groupBy(danaSosialHistory.wargaId),

    db.select({ noRumah: danaSosialHistory.noRumah, cnt: count() })
      .from(danaSosialHistory)
      .where(and(
        eq(danaSosialHistory.rtGroupId, rtGroupId),
        eq(danaSosialHistory.jenis, 'kelahiran'),
      ))
      .groupBy(danaSosialHistory.noRumah),

    db.select().from(danaSosialHistory)
      .where(eq(danaSosialHistory.rtGroupId, rtGroupId))
      .orderBy(desc(danaSosialHistory.createdAt))
      .limit(60),
  ])

  const sakitMap = new Map(sakitRaw.map(r => [r.wargaId, Number(r.cnt)]))
  const kelahiranMap = new Map(kelahiranRaw.map(r => [r.noRumah, Number(r.cnt)]))

  // Build KK groups
  const groupMap = new Map<string, {
    noRumah: string
    kepalaId: string | null
    kepalaNama: string
    kelahiranTerpakai: number
    anggota: { id: string; nama: string; kkStatus: string | null; sakitTerpakai: number }[]
  }>()

  for (const w of allWarga) {
    const key = w.noRumah || 'Tanpa Nomor'
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        noRumah: key,
        kepalaId: null,
        kepalaNama: key,
        kelahiranTerpakai: kelahiranMap.get(key) ?? 0,
        anggota: [],
      })
    }
    const g = groupMap.get(key)!
    g.anggota.push({ id: w.id, nama: w.namaLengkap, kkStatus: w.kkStatus, sakitTerpakai: sakitMap.get(w.id) ?? 0 })
    if (w.kkStatus === 'kepala_kk') { g.kepalaId = w.id; g.kepalaNama = w.namaLengkap }
  }

  const kkGroups = Array.from(groupMap.values()).sort((a, b) => a.noRumah.localeCompare(b.noRumah, undefined, { numeric: true }))

  const history = historyRaw.map(h => ({
    id: h.id,
    namaWarga: h.namaWarga,
    noRumah: h.noRumah,
    jenis: h.jenis,
    tahun: h.tahun,
    catatan: h.catatan,
    createdAt: h.createdAt?.toISOString() ?? new Date().toISOString(),
    createdByName: h.createdByName,
  }))

  return (
    <>
      <div className="sec-h" style={{ marginBottom: 16 }}>
        <div className="t"><Handshake size={16} /> Dana Sosial</div>
        <Link href="/pengurus" style={{ fontSize: 13, color: 'var(--g600)', textDecoration: 'none', fontWeight: 700 }}>← Kembali</Link>
      </div>
      <DanaSosialClient kkGroups={kkGroups} history={history} tahun={tahun} />
    </>
  )
}
