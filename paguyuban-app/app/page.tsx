import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { profiles, rtGroups, pengumuman, iuranInvoices, inventaris, warga } from '@/lib/db/schema'
import { eq, and, desc, count } from 'drizzle-orm'
import Link from 'next/link'
import Shell from '@/components/layout/Shell'
import TopBar from '@/components/layout/TopBar'
import BottomNav from '@/components/layout/BottomNav'
import GuestPage from '@/components/home/GuestPage'
import { rupiah, timeAgo } from '@/lib/utils'

export default async function HomePage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value

  let profile = null
  let rt = null

  if (token) {
    const payload = await verifyJwt(token)
    if (payload) {
      const res = await db.select().from(profiles).where(eq(profiles.id, payload.sub)).limit(1)
      profile = res[0] ?? null
      if (profile?.rtGroupId) {
        const rtRes = await db.select().from(rtGroups).where(eq(rtGroups.id, profile.rtGroupId)).limit(1)
        rt = rtRes[0] ?? null
      }
    }
  }

  // Redirect pengurus ke dashboard mereka
  if (profile && ['ketua', 'sekretaris', 'bendahara', 'admin'].includes(profile.role)) {
    redirect('/pengurus')
  }

  // Guest view — fetch public data
  if (!profile) {
    const defaultRt = await db.select().from(rtGroups).limit(1).then(r => r[0] ?? null)
    let guestPengumuman: { id: string; judul: string; isi: string | null; kategori: string | null; prioritas: string | null; createdAt: string }[] = []
    let guestInventaris: { id: string; nama: string; hargaSewa: number | null; stok: number | null; fotoUrl: string | null; deskripsi: string | null }[] = []
    let rtStats = { jumlahWarga: 0, jumlahKk: 0 }

    if (defaultRt) {
      const [pengumumanRaw, inventarisRaw, wargaCount] = await Promise.all([
        db.select().from(pengumuman)
          .where(and(eq(pengumuman.rtGroupId, defaultRt.id), eq(pengumuman.isPublished, true)))
          .orderBy(desc(pengumuman.createdAt)).limit(3),
        db.select().from(inventaris).where(eq(inventaris.rtGroupId, defaultRt.id)),
        db.select({ c: count() }).from(warga).where(eq(warga.rtGroupId, defaultRt.id)),
      ])
      guestPengumuman = pengumumanRaw.map(p => ({
        id: p.id, judul: p.judul, isi: p.isi, kategori: p.kategori,
        prioritas: p.prioritas, createdAt: p.createdAt.toISOString(),
      }))
      guestInventaris = inventarisRaw.map(i => ({
        id: i.id, nama: i.nama, hargaSewa: i.hargaSewa,
        stok: i.stok, fotoUrl: i.fotoUrl, deskripsi: i.deskripsi,
      }))
      rtStats = {
        jumlahWarga: wargaCount[0]?.c ?? 0,
        jumlahKk: defaultRt.jumlahKk ?? 0,
      }
    }

    return (
      <Shell>
        <GuestPage
          rtName={defaultRt?.namaRt || 'Paguyuban PKR-Pepe'}
          rtId={defaultRt?.id}
          pengumuman={guestPengumuman}
          inventaris={guestInventaris}
          rtStats={rtStats}
        />
        <BottomNav />
      </Shell>
    )
  }

  // Authenticated warga — dashboard
  const [pengumumanList, invoiceList] = await Promise.all([
    db.select().from(pengumuman)
      .where(and(eq(pengumuman.rtGroupId, profile.rtGroupId!), eq(pengumuman.isPublished, true)))
      .orderBy(desc(pengumuman.createdAt)).limit(3),
    db.select().from(iuranInvoices)
      .where(and(eq(iuranInvoices.wargaId, profile.id), eq(iuranInvoices.status, 'belum_bayar')))
      .limit(10),
  ])

  const totalTagihan = invoiceList.reduce((s, i) => s + (i.nominal || 0), 0)

  return (
    <Shell>
      <TopBar
        name={profile.fullName || profile.phone}
        rtName={rt?.namaRt || 'Paguyuban PKR-Pepe'}
        noRumah={profile.noRumah}
        logoUrl={rt?.logoUrl}
      />
      <div className="body">
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
        <div>
          <div className="sec-h" style={{ marginBottom: 10 }}>
            <div className="t"><span className="em">💳</span> Iuran saya</div>
            <Link href="/iuran" className="more">Rincian ›</Link>
          </div>
          {invoiceList.length > 0 ? (
            <div className="iuran-card nunggak">
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
          ) : (
            <div className="iuran-card lunas">
              <div className="ic-top">
                <div className="l">💳 Status iuran</div>
                <span className="ic-badge">✓ LUNAS</span>
              </div>
              <div className="ic-amt">Rp 0</div>
              <div className="ic-sub">🎉 Semua iuran sudah lunas. Terima kasih! 🙏</div>
            </div>
          )}
        </div>

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
      </div>
      <BottomNav />
    </Shell>
  )
}
