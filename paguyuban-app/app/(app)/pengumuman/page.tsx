import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { profiles, pengumuman } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import Link from 'next/link'
import { timeAgo } from '@/lib/utils'

export default async function PengumumanPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) redirect('/')

  const payload = await verifyJwt(token)
  if (!payload) redirect('/')

  const [profile] = await db.select().from(profiles).where(eq(profiles.id, payload.sub)).limit(1)
  if (!profile) redirect('/')

  const list = await db.select().from(pengumuman)
    .where(and(eq(pengumuman.rtGroupId, profile.rtGroupId!), eq(pengumuman.isPublished, true)))
    .orderBy(desc(pengumuman.createdAt))
    .limit(50)

  return (
    <>
      {list.length === 0 ? (
        <div className="empty">
          <div className="e-i">📭</div>
          <div className="e-t">Belum ada pengumuman</div>
          <div className="e-d">Info terbaru dari Ketua RT akan muncul di sini.</div>
        </div>
      ) : (
        <div className="peng-card">
          {list.map(p => {
            const pri = p.prioritas === 'penting' || p.prioritas === 'tinggi'
            const ico = pri ? '⚠️' : p.kategori === 'acara' ? '📅' : p.kategori === 'keuangan' ? '💰' : '📢'
            const bg = pri ? 'var(--red-l)' : p.kategori === 'acara' ? 'var(--blue-l)' : p.kategori === 'keuangan' ? 'var(--g50)' : 'var(--orange-l)'
            return (
              <Link key={p.id} href={`/pengumuman/${p.id}`}>
                <div className="peng-item">
                  <div className="pi-ico" style={{ background: bg }}>{ico}</div>
                  <div className="pi-body">
                    <div className="pi-t">
                      {p.judul}
                      {pri && <span className="pill penting">Penting</span>}
                      {p.kategori && !pri && <span className="pill selesai" style={{ textTransform: 'capitalize' }}>{p.kategori}</span>}
                    </div>
                    {p.isi && (
                      <div className="pi-d" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {p.isi}
                      </div>
                    )}
                    <div className="pi-time">{timeAgo(p.createdAt.toISOString())}</div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </>
  )
}
