import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { profiles, rtGroups, pengumuman, iuranInvoices, transaksi, surat, laporanWarga, inventaris, warga } from '@/lib/db/schema'
import { eq, and, desc, count, inArray } from 'drizzle-orm'
import Link from 'next/link'
import { rupiah, timeAgo } from '@/lib/utils'
import {
  CreditCard, Wallet, Zap, Megaphone, AlertTriangle, Calendar,
  Clock, Users, Mail, Car, Package, FileText, Inbox, Banknote, BarChart2,
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
  let jumlahInventaris = 0
  let suratCount = 0
  let laporanCount = 0
  let jumlahKk = 0
  try {
    const [pList, iList, lastTransRes, invCount, suratRes, laporanRes, kkRes] = await Promise.all([
      db.select().from(pengumuman)
        .where(and(eq(pengumuman.rtGroupId, profile.rtGroupId!), eq(pengumuman.isPublished, true)))
        .orderBy(desc(pengumuman.createdAt)).limit(3),
      db.select().from(iuranInvoices)
        .where(and(eq(iuranInvoices.wargaId, profile.id), eq(iuranInvoices.status, 'belum_bayar')))
        .limit(10),
      db.select().from(transaksi)
        .where(eq(transaksi.rtGroupId, profile.rtGroupId!))
        .orderBy(desc(transaksi.createdAt)).limit(1),
      db.select({ c: count() }).from(inventaris)
        .where(eq(inventaris.rtGroupId, profile.rtGroupId!)),
      db.select({ c: count() }).from(surat)
        .where(and(eq(surat.pemohonId, profile.id), inArray(surat.status, ['diajukan', 'diproses']))),
      db.select({ c: count() }).from(laporanWarga)
        .where(and(eq(laporanWarga.pelaporId, profile.id), inArray(laporanWarga.status, ['menunggu', 'diproses']))),
      db.select({ c: count() }).from(warga)
        .where(and(eq(warga.rtGroupId, profile.rtGroupId!), eq(warga.kkStatus, 'kepala_kk'))),
    ])
    pengumumanList = pList
    invoiceList = iList
    saldoKas = lastTransRes[0]?.saldoSetelah ?? null
    jumlahInventaris = Number(invCount[0]?.c ?? 0)
    suratCount = Number(suratRes[0]?.c ?? 0)
    laporanCount = Number(laporanRes[0]?.c ?? 0)
    jumlahKk = Number(kkRes[0]?.c ?? 0)
  } catch {
    // Tables not yet migrated — degrade gracefully
  }

  const totalTagihan = invoiceList.reduce((s, i) => s + (i.nominal || 0), 0)

  const menuItems = [
    { href: '/iuran', icon: <CreditCard size={22} color="var(--g600)" />, bg: 'var(--g50)', lbl: 'Iuran', count: 0 },
    { href: '/pengumuman', icon: <Megaphone size={22} color="var(--orange)" />, bg: 'var(--orange-l)', lbl: 'Pengumuman', count: 0 },
    { href: '/keluarga', icon: <Users size={22} color="var(--blue)" />, bg: 'var(--blue-l)', lbl: 'Keluarga', count: 0 },
    { href: '/laporan', icon: <FileText size={22} color="var(--purple)" />, bg: 'var(--purple-l)', lbl: 'Layanan', count: laporanCount },
    { href: '/surat', icon: <Mail size={22} color="var(--teal)" />, bg: 'var(--teal-l)', lbl: 'Surat', count: suratCount },
    { href: '/kendaraan', icon: <Car size={22} color="var(--gray500)" />, bg: 'var(--gray100)', lbl: 'Kendaraan', count: 0 },
    { href: '/inventaris', icon: <Package size={22} color="var(--gold)" />, bg: 'var(--gold-l)', lbl: 'Inventaris', count: 0 },
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

      <div>
        <div className="sec-h" style={{ marginBottom: 10 }}>
          <div className="t"><BarChart2 size={16} /> Ringkasan RT</div>
        </div>
        <div className="rl-st">
          <div>
            <b style={{ display: 'block', fontSize: 16, fontWeight: 800, color: 'var(--g700)' }}>
              {saldoKas !== null ? rupiah(saldoKas) : '—'}
            </b>
            <span>Saldo kas</span>
          </div>
          <div>
            <b style={{ display: 'block', fontSize: 16, fontWeight: 800, color: 'var(--gray700)' }}>{jumlahInventaris}</b>
            <span>Inventaris</span>
          </div>
          <div>
            <b style={{ display: 'block', fontSize: 16, fontWeight: 800, color: 'var(--gray700)' }}>{jumlahKk || '—'}</b>
            <span>Jumlah KK</span>
          </div>
        </div>
      </div>

      <div>
        <div className="sec-h" style={{ marginBottom: 12 }}>
          <div className="t"><Zap size={16} /> Menu warga</div>
        </div>
        <div className="menu-grid">
          {menuItems.map(m => (
            <Link key={m.href} href={m.href}>
              <div className="menu-item" style={{ position: 'relative' }}>
                <div className="mi-ico" style={{ background: m.bg }}>{m.icon}</div>
                <div className="mi-lbl">{m.lbl}</div>
                {m.count > 0 && (
                  <div style={{ position: 'absolute', top: 4, right: 10, background: 'var(--red)', color: 'white', borderRadius: 20, fontSize: 10, fontWeight: 800, minWidth: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                    {m.count}
                  </div>
                )}
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
