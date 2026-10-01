import { cookies } from 'next/headers'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { profiles, inventaris, rtGroups } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import Shell from '@/components/layout/Shell'
import TopBar from '@/components/layout/TopBar'
import BottomNav from '@/components/layout/BottomNav'
import InventarisClient from '../(app)/inventaris/InventarisClient'
import Link from 'next/link'

export default async function InventarisPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  let profileName: string | null = null
  let profilePhone: string | null = null
  let profileData = null
  let rt = null

  if (token) {
    const payload = await verifyJwt(token)
    if (payload) {
      const [p] = await db.select().from(profiles).where(eq(profiles.id, payload.sub)).limit(1)
      if (p) {
        profileData = p
        profileName = p.fullName
        profilePhone = p.phone
        if (p.rtGroupId) {
          const [rtData] = await db.select().from(rtGroups).where(eq(rtGroups.id, p.rtGroupId)).limit(1)
          rt = rtData ?? null
        }
      }
    }
  }

  if (!rt) {
    const [defaultRt] = await db.select().from(rtGroups).limit(1)
    rt = defaultRt ?? null
  }

  const items = rt ? await db.select().from(inventaris).where(eq(inventaris.rtGroupId, rt.id)) : []

  const serialized = items.map(i => ({
    id: i.id, nama: i.nama, hargaSewa: i.hargaSewa,
    stokTotal: i.stokTotal, stok: i.stok, fotoUrl: i.fotoUrl, deskripsi: i.deskripsi,
  }))

  return (
    <Shell>
      <div className="topbar">
        <div className="tb-top">
          <Link href="/" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: 12, background: 'rgba(255,255,255,.18)', color: 'white', textDecoration: 'none', fontSize: 16 }}>←</Link>
          <div className="tb-hi">
            <div className="g">📦 Inventaris RT</div>
            <div className="n">{rt?.namaRt || 'Paguyuban PKR-Pepe'}</div>
          </div>
          {profileData && (
            <div className="tb-av" style={{ fontSize: 13, fontWeight: 800 }}>
              {(profileData.fullName || profileData.phone || 'W').slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>
      </div>
      <div className="body">
        <InventarisClient
          items={serialized}
          profileName={profileName}
          profilePhone={profilePhone}
        />
      </div>
      <BottomNav />
    </Shell>
  )
}
