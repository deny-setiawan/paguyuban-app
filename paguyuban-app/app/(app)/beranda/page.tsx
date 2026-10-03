import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { profiles, rtGroups, pengumuman, iuranInvoices, transaksi } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import Link from 'next/link'
import { rupiah, timeAgo } from '@/lib/utils'
import {
  CreditCard, Wallet, Zap, Megaphone, AlertTriangle, Calendar,
  Clock, Users, Mail, Car, Package, FileText, Inbox, Banknote,
} from 'lucide-react'

const PENGURUS_ROLES = ['ketua', 'wakil_ketua', 'sekretaris', 'bendahara', 'humas', 'lingkungan', 'keamanan', 'peralatan', 'admin']

export default async function BerandaPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) redirect('/')
  const payload = await verifyJwt(token)
  if (!payload) redirect('/')

  const [profile] = await db.select().from(profiles).where(eq(profiles.id, payload.sub)).limit(1)
  if (!profile) redirect('/')

  if (PENGURUS_ROLES.includes(profile.role)) redirect('/pengurus')

  let rt = null
  if (profile.rtGroupId) {
    const [rtData] = await db.select().from(rtGroups).where(eq(rtGroups.id, profile.rtGroupId)).limit(1)
    rt = rtData ?? null
  }

  let pengumumanList: (typeof pengumuman.$inferSelect)[] = []
  let invoiceList: (typeof iuranInvoices.$inferSelect)[] = []
  let saldoKas: number | null = null
  try {
    const [pList, iList, lastTransRes] = await Promise.all([
      db.select().from(pengumuman)
        .where(and(eq(pengumuman.rtGroupId, profile.rtGroupId!), eq(pengumuman.isPublished, true)))
        .orderBy(desc(pengumuman.createdAt)).limit(3),
      db.select().from(iuranInvoices)
        .where(and(eq(iuranInvoices.wargaId, profile.id), eq(iuranInvoices.status, 'belum_bayar')))
        .limit(10),
      db.select().from(transaksi)
        .where(eq(transaksi.rtGroupId, profile.rtGroupId!))
        .orderBy(desc(transaksi.createdAt)).limit(1),
    ])
    pengumumanList = pList
    invoiceList = iList
    saldoKas = lastTransRes[0]?.saldoSetelah ?? null
  } catch {
    // Tables not yet migrated — degrade gracefully
  }

  const totalTagihan = invoiceList.reduce((s, i) => s + (i.nominal || 0), 0)

  const menuItems = [
    { href: '/iuran', icon: <CreditCard size={22} color="var(--g600)" />, bg: 'var(--g50)', lbl: 'Iuran' },
    { href: '/pengumuman', icon: <Megaphone size={22} color="var(--orange)" />, bg: 'var(--orange-l)', lbl: 'Pengumuman' },
    { href: '/keluarga', icon: <Users size={22} color="var(--blue)" />, bg: 'var(--blue-l)', lbl: 'Keluarga' },
    { href: '/laporan', icon: <FileText size={22} color="var(--purple)" />, bg: 'var(--purple-l)', lbl: 'Layanan' },
    { href: '/surat', icon: <Mail size={22} color="var(--teal)" />, bg: 'var(--teal-l)', lbl: 'Surat' },
    { href: '/kendaraan', icon: <Car size={22} color="var(--gray500)" />, bg: 'var(--gray100)', lbl: 'Kendaraan' },
    { href: '/inventaris', icon: <Package size={22} color="var(--gold)" />, bg: 'var(--gold-l)', lbl: 'Inventaris' },
  ]

  return (
    <>
      {!profile.isActive && (
        <div className="status-banner pending">
          <div className="sb-ico"><Clock size={24} /></div>
          <div className="sb-txt">
            <div className="sb-l1">Menunggu persetujuan Ketua RT</div>
            <div className="sb-l2">Akun Anda sedang ditinjau. Beberapa fitur aktif setelah disetujui.</div>
          </div>
        </div>
      )}

      <div>
        <div className="sec-h" style={{ marginBottom: 10 }}>
          <div className="t"><CreditCard size={16} /> Iuran saya</div>
          <Link href="/iuran" className="more">Rincian ›</Link>
        </div>
        {invoiceList.length > 0 ? (
          <div className="iuran-card nunggak">
            <div className="ic-top">
              <div className="l"><CreditCard size={14} /> Iuran belum dibayar</div>
              <span className="ic-badge">{invoiceList.length} bulan</span>
            </div>
            <div className="ic-amt">{rupiah(totalTagihan)}</div>
            <div className="ic-sub">Segera lunasi agar fitur tetap aktif</div>
            <Link href="/iuran">
              <button className="ic-btn"><Banknote size={16} /> Lihat &amp; bayar</button>
            </Link>
          </div>
        ) : (
          <div className="iuran-card lunas">
            <div className="ic-top">
              <div className="l"><CreditCard size={14} /> Status iuran</div>
              <span className="ic-badge">✓ LUNAS</span>
            </div>
            <div className="ic-amt">Rp 0</div>
            <div className="ic-sub">Semua iuran sudah lunas. Terima kasih!</div>
          </div>
        )}
      </div>

      {saldoKas !== null && (
        <div>
          <div className="sec-h" style={{ marginBottom: 10 }}>
            <div className="t"><Wallet size={16} /> Kas RT</div>
          </div>
          <div className="rl-st">
            <div>
              <b style={{ display: 'block', fontSize: 16, fontWeight: 800, color: 'var(--g700)' }}>{rupiah(saldoKas)}</b>
              <span>Saldo kas</span>
            </div>
            <div>
              <b style={{ display: 'block', fontSize: 16, fontWeight: 800, color: 'var(--gray700)' }}>{rt?.jumlahKk ?? '—'}</b>
              <span>Jumlah KK</span>
            </div>
          </div>
        </div>
      )}

      <div>
        <div className="sec-h" style={{ marginBottom: 12 }}>
          <div className="t"><Zap size={16} /> Menu warga</div>
        </div>
        <div className="menu-grid">
          {menuItems.map(m => (
            <Link key={m.href} href={m.href}>
              <div className="menu-item">
                <div className="mi-ico" style={{ background: m.bg }}>{m.icon}</div>
                <div className="mi-lbl">{m.lbl}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div>
        <div className="sec-h" style={{ marginBottom: 12 }}>
          <div className="t"><Megaphone size={16} /> Pengumuman RT</div>
          <Link href="/pengumuman" className="more">Semua ›</Link>
        </div>
        {pengumumanList.length === 0 ? (
          <div className="peng-card">
            <div className="empty">
              <div className="e-i"><Inbox size={38} color="var(--gray400)" /></div>
              <div className="e-t">Belum ada pengumuman</div>
              <div className="e-d">Info dari Ketua RT akan muncul di sini</div>
            </div>
          </div>
        ) : (
          <div className="peng-card">
            {pengumumanList.map(p => {
              const pri = p.prioritas === 'penting' || p.prioritas === 'tinggi'
              const IcoEl = pri
                ? <AlertTriangle size={18} color="var(--red)" />
                : p.kategori === 'acara'
                  ? <Calendar size={18} color="var(--blue)" />
                  : <Megaphone size={18} color="var(--orange)" />
              const bg = pri ? 'var(--red-l)' : p.kategori === 'acara' ? 'var(--blue-l)' : 'var(--orange-l)'
              return (
                <Link key={p.id} href={`/pengumuman/${p.id}`}>
                  <div className="peng-item">
                    <div className="pi-ico" style={{ background: bg }}>{IcoEl}</div>
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
    </>
  )
}
