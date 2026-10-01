import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { profiles, pengumuman } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import Link from 'next/link'
import { timeAgo } from '@/lib/utils'

export default async function PengumumanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) redirect('/')

  const payload = await verifyJwt(token)
  if (!payload) redirect('/')

  const [profile] = await db.select().from(profiles).where(eq(profiles.id, payload.sub)).limit(1)
  if (!profile) redirect('/')

  const [p] = await db.select().from(pengumuman).where(eq(pengumuman.id, id)).limit(1)
  if (!p || p.rtGroupId !== profile.rtGroupId) notFound()

  const pri = p.prioritas === 'penting' || p.prioritas === 'tinggi'
  const ico = pri ? '⚠️' : p.kategori === 'acara' ? '📅' : '📢'
  const bg = pri ? 'var(--red-l)' : p.kategori === 'acara' ? 'var(--blue-l)' : 'var(--orange-l)'

  return (
    <>
      <Link href="/pengumuman" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--g600)', textDecoration: 'none', marginBottom: 16 }}>
        ← Semua pengumuman
      </Link>

      <div className="peng-card">
        <div style={{ padding: '4px 0' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 16 }}>
            <div className="pi-ico" style={{ background: bg, flexShrink: 0 }}>{ico}</div>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: 17, fontWeight: 800, color: 'var(--gray900)', lineHeight: 1.4, margin: '0 0 6px' }}>
                {p.judul}
              </h1>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {pri && <span className="pill penting">Penting</span>}
                {p.kategori && <span className="pill selesai" style={{ textTransform: 'capitalize' }}>{p.kategori}</span>}
              </div>
            </div>
          </div>

          <div style={{ fontSize: 11.5, color: 'var(--gray400)', marginBottom: 16 }}>
            🕐 {timeAgo(p.createdAt.toISOString())} · {new Date(p.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>

          {p.isi ? (
            <div style={{ fontSize: 14, color: 'var(--gray700)', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
              {p.isi}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--gray400)', fontStyle: 'italic' }}>
              Tidak ada isi pengumuman.
            </div>
          )}
        </div>
      </div>
    </>
  )
}
