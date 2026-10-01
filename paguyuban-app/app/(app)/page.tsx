import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { profiles, pengumuman, iuranInvoices, rtGroups } from '@/lib/db/schema'
import { eq, and, desc, count } from 'drizzle-orm'
import Link from 'next/link'
import { rupiah, timeAgo } from '@/lib/utils'

export default async function HomePage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) redirect('/login')

  const payload = await verifyJwt(token)
  if (!payload) redirect('/login')

  const [profile] = await db.select().from(profiles).where(eq(profiles.id, payload.sub)).limit(1)
  if (!profile?.rtGroupId) {
    return (
      <div className="status-banner pending">
        <div className="sb-ico">⏳</div>
        <div className="sb-txt">
          <div className="sb-l1">Akun belum terhubung ke RT</div>
          <div className="sb-l2">Selesaikan pendaftaran atau minta undangan dari Ketua RT.</div>
        </div>
      </div>
    )
  }

  // Redirect pengurus ke dashboard mereka
  const pengurusRoles = ['ketua', 'sekretaris', 'bendahara', 'admin']
  if (pengurusRoles.includes(profile.role)) {
    redirect('/pengurus')
  }

  // Load data
  const [pengumumanList, invoiceList, [rt]] = await Promise.all([
    db.select().from(pengumuman)
      .where(and(eq(pengumuman.rtGroupId, profile.rtGroupId), eq(pengumuman.isPublished, true)))
      .orderBy(desc(pengumuman.createdAt)).limit(3),
    db.select().from(iuranInvoices)
      .where(and(eq(iuranInvoices.wargaId, profile.id), eq(iuranInvoices.status, 'belum_bayar')))
      .limit(10),
    db.select().from(rtGroups).where(eq(rtGroups.id, profile.rtGroupId!)).limit(1),
  ])

  const totalTagihan = invoiceList.reduce((s, i) => s + (i.nominal || 0), 0)

  return (
    <>
      {!profile.isActive && (
        <div className="status-banner pending">
          <div className="sb-ico">⏳</div>
          <div className="sb-txt">
            <div className="sb-l1">Menunggu persetujuan Ketua RT</div>
            <div className="sb-l2">Akun Anda sedang ditinjau. Beberapa fitur aktif setelah disetujui.</div>
          </div>
        </div>
      )}

      {/* Iuran card */}
      {invoiceList.length > 0 ? (
        <div>
          <div className="sec-h" style={{ marginBottom: 10 }}>
            <div className="t"><span className="em">💳</span> Iuran saya</div>
            <Link href="/iuran" className="more">Rincian ›</Link>
          </div>
          <div className={`iuran-card${invoiceList.length > 0 ? ' nunggak' : ' lunas'}`}>
            <div className="ic-top">
              <div className="l">💳 Iuran belum dibayar</div>
              <span className="ic-badge">{invoiceList.length} bulan</span>
            </div>
            <div className="ic-amt">{rupiah(totalTagihan)}</div>
            <div className="ic-sub">Segera lunasi agar fitur tetap aktif</div>
            <Link href="/iuran">
              <button className="ic-btn">💵 Lihat &amp; bayar</button>
            </Link>
          </div>
        </div>
      ) : (
        <div>
          <div className="sec-h" style={{ marginBottom: 10 }}>
            <div className="t"><span className="em">💳</span> Iuran saya</div>
            <Link href="/iuran" className="more">Rincian ›</Link>
          </div>
          <div className="iuran-card lunas">
            <div className="ic-top">
              <div className="l">💳 Status iuran</div>
              <span className="ic-badge">✓ LUNAS</span>
            </div>
            <div className="ic-amt">Rp 0</div>
            <div className="ic-sub">🎉 Semua iuran sudah lunas. Terima kasih! 🙏</div>
          </div>
        </div>
      )}

      {/* Menu warga */}
      <div>
        <div className="sec-h" style={{ marginBottom: 12 }}>
          <div className="t"><span className="em">⚡</span> Menu warga</div>
        </div>
        <div className="menu-grid">
          {[
            { href: '/iuran', ico: '💳', bg: 'var(--g50)', lbl: 'Iuran' },
            { href: '/pengumuman', ico: '📢', bg: 'var(--orange-l)', lbl: 'Pengumuman' },
            { href: '/keluarga', ico: '👨‍👩‍👧', bg: 'var(--blue-l)', lbl: 'Keluarga' },
            { href: '/laporan', ico: '📝', bg: 'var(--purple-l)', lbl: 'Layanan' },
            { href: '/surat', ico: '✉️', bg: 'var(--teal-l)', lbl: 'Surat' },
            { href: '/kendaraan', ico: '🚗', bg: 'var(--gray100)', lbl: 'Kendaraan' },
            { href: '/inventaris', ico: '📦', bg: 'var(--gold-l)', lbl: 'Inventaris' },
          ].map(m => (
            <Link key={m.href} href={m.href}>
              <div className="menu-item">
                <div className="mi-ico" style={{ background: m.bg }}>{m.ico}</div>
                <div className="mi-lbl">{m.lbl}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Pengumuman */}
      <div>
        <div className="sec-h" style={{ marginBottom: 12 }}>
          <div className="t"><span className="em">📢</span> Pengumuman RT</div>
          <Link href="/pengumuman" className="more">Semua ›</Link>
        </div>
        {pengumumanList.length === 0 ? (
          <div className="peng-card">
            <div className="empty">
              <div className="e-i">📭</div>
              <div className="e-t">Belum ada pengumuman</div>
              <div className="e-d">Info dari Ketua RT akan muncul di sini</div>
            </div>
          </div>
        ) : (
          <div className="peng-card">
            {pengumumanList.map(p => {
              const pri = p.prioritas === 'penting' || p.prioritas === 'tinggi'
              const ico = pri ? '⚠️' : p.kategori === 'acara' ? '📅' : '📢'
              const bg = pri ? 'var(--red-l)' : p.kategori === 'acara' ? 'var(--blue-l)' : 'var(--orange-l)'
              return (
                <Link key={p.id} href={`/pengumuman/${p.id}`}>
                  <div className="peng-item">
                    <div className="pi-ico" style={{ background: bg }}>{ico}</div>
                    <div className="pi-body">
                      <div className="pi-t">
                        {p.judul}
                        {pri && <span className="pill penting">Penting</span>}
                      </div>
                      <div className="pi-d">{p.isi}</div>
                      <div className="pi-time">{timeAgo(p.createdAt.toISOString())}</div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Info lingkungan */}
      <div>
        <div className="sec-h" style={{ marginBottom: 12 }}>
          <div className="t"><span className="em">🌱</span> Lingkungan kita</div>
          <span style={{ fontSize: 10, color: 'var(--gray400)', fontWeight: 700, background: 'var(--gray100)', padding: '2px 8px', borderRadius: 'var(--r999)' }}>Segera</span>
        </div>
        <div className="ib green">
          <span>♻️</span>
          <div>Sebentar lagi Anda bisa ikut program bank sampah, lapor lingkungan, dan pantau kondisi RT.</div>
        </div>
      </div>
    </>
  )
}
