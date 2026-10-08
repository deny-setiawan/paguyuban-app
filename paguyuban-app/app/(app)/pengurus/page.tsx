import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { profiles, rtGroups, wargaInvites, iuranPayments, surat, laporanWarga, transaksi, warga, inventarisSewa } from '@/lib/db/schema'
import { eq, and, count, desc } from 'drizzle-orm'
import { canAccess, type MenuConfig } from '@/lib/menu-config'
import { rupiah } from '@/lib/utils'
import Link from 'next/link'
import {
  Crown, ClipboardList, Wallet, Shield, Users, Mail, CreditCard,
  FileText, Package, Settings, User, Megaphone, BarChart2,
  Clock, CheckCircle, Handshake, UserCheck, Globe, Lock, Wrench,
  Home, Bell, Car, Zap, Wifi,
} from 'lucide-react'

const ALL_PENGURUS = ['ketua', 'wakil_ketua', 'sekretaris', 'bendahara', 'humas', 'lingkungan', 'keamanan', 'peralatan', 'admin']

const ROLE_INFO: Record<string, { label: string; Icon: React.ElementType }> = {
  ketua:       { label: 'Ketua RT',          Icon: Crown },
  wakil_ketua: { label: 'Wakil Ketua RT',    Icon: Crown },
  sekretaris:  { label: 'Sekretaris',        Icon: ClipboardList },
  bendahara:   { label: 'Bendahara',         Icon: Wallet },
  humas:       { label: 'Humas',             Icon: Globe },
  lingkungan:  { label: 'Seksi Lingkungan',  Icon: Zap },
  keamanan:    { label: 'Seksi Keamanan',    Icon: Lock },
  peralatan:   { label: 'Seksi Peralatan',   Icon: Wrench },
  admin:       { label: 'Admin Sistem',      Icon: Shield },
}

export default async function PengurusPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) redirect('/')
  const payload = await verifyJwt(token)
  if (!payload) redirect('/')

  const [profile] = await db.select().from(profiles).where(eq(profiles.id, payload.sub)).limit(1)
  if (!profile) redirect('/')
  // Guard sudah ada di pengurus/layout.tsx (cek DB role) — tidak perlu cek JWT role di sini

  let rt = null
  let menuConfig: MenuConfig | null = null
  if (profile.rtGroupId) {
    const [rtData] = await db.select().from(rtGroups).where(eq(rtGroups.id, profile.rtGroupId)).limit(1)
    rt = rtData ?? null
    menuConfig = (rt?.menuConfig as MenuConfig) ?? null
  }

  const rtId = profile.rtGroupId
  if (!rtId) {
    return (
      <div className="ib blue">
        <Shield size={14} style={{ flexShrink: 0, marginTop: 1 }} />
        <div>Akun Anda belum dikaitkan ke RT manapun. Hubungi administrator sistem.</div>
      </div>
    )
  }

  const [
    jumlahWargaRes, pendingInviteRes, pendingPaymentRes,
    pendingSuratRes, pendingLaporanRes, lastTransRes, activeSewaRes,
  ] = await Promise.all([
    db.select({ c: count() }).from(warga).where(eq(warga.rtGroupId, rtId)),
    db.select({ c: count() }).from(wargaInvites).where(and(eq(wargaInvites.rtGroupId, rtId), eq(wargaInvites.status, 'pending'))),
    db.select({ c: count() }).from(iuranPayments).where(and(eq(iuranPayments.rtGroupId, rtId), eq(iuranPayments.statusVerif, 'pending'))),
    db.select({ c: count() }).from(surat).where(and(eq(surat.rtGroupId, rtId), eq(surat.status, 'diajukan'))),
    db.select({ c: count() }).from(laporanWarga).where(and(eq(laporanWarga.rtGroupId, rtId), eq(laporanWarga.status, 'menunggu'))),
    db.select().from(transaksi).where(eq(transaksi.rtGroupId, rtId)).orderBy(desc(transaksi.createdAt)).limit(1),
    db.select({ c: count() }).from(inventarisSewa).where(eq(inventarisSewa.status, 'disewa')),
  ])

  const stats = {
    jumlahWarga: jumlahWargaRes[0]?.c ?? 0,
    pendingInvite: pendingInviteRes[0]?.c ?? 0,
    pendingPayment: pendingPaymentRes[0]?.c ?? 0,
    pendingSurat: pendingSuratRes[0]?.c ?? 0,
    pendingLaporan: pendingLaporanRes[0]?.c ?? 0,
    saldoKas: lastTransRes[0]?.saldoSetelah ?? 0,
    activeSewa: activeSewaRes[0]?.c ?? 0,
  }

  const role = profile.role
  const roleInfo = ROLE_INFO[role] || { label: role, Icon: UserCheck }
  const { label: roleLabel, Icon: RoleIcon } = roleInfo

  const isAdmin = role === 'admin'

  const totalPending =
    (canAccess('wargaBaru', role, menuConfig) ? stats.pendingInvite : 0) +
    (canAccess('verifBayar', role, menuConfig) ? stats.pendingPayment : 0) +
    (canAccess('prosesSurat', role, menuConfig) ? stats.pendingSurat : 0) +
    (canAccess('laporan', role, menuConfig) ? stats.pendingLaporan : 0) +
    (canAccess('inventaris', role, menuConfig) ? stats.activeSewa : 0)

  return (
    <>
      <div className="status-banner aktif" style={{ marginBottom: 4 }}>
        <div className="sb-ico"><RoleIcon size={24} /></div>
        <div className="sb-txt">
          <div className="sb-l1">Halo, {roleLabel}!</div>
          <div className="sb-l2">
            {rt?.namaRt || 'Paguyuban PKR-Pepe'} · {totalPending > 0 ? `${totalPending} item perlu perhatian` : 'Semua tertangani'}
            {totalPending === 0 && <CheckCircle size={12} style={{ display: 'inline', marginLeft: 4 }} />}
          </div>
        </div>
      </div>

      <div className="sec-h" style={{ marginBottom: 12, marginTop: 8 }}>
        <div className="t"><BarChart2 size={16} /> Statistik RT</div>
      </div>
      <div className="rl-st" style={{ marginBottom: 4 }}>
        <div>
          <b style={{ display: 'block', fontSize: 18, fontWeight: 800, color: 'var(--gray900)' }}>{stats.jumlahWarga}</b>
          <span>Warga</span>
        </div>
        <div>
          <b style={{ display: 'block', fontSize: 16, fontWeight: 800, color: stats.saldoKas > 0 ? 'var(--g700)' : 'var(--gray900)' }}>
            {rupiah(stats.saldoKas)}
          </b>
          <span>Saldo Kas</span>
        </div>
        <div>
          <b style={{ display: 'block', fontSize: 18, fontWeight: 800, color: totalPending > 0 ? 'var(--gold)' : 'var(--gray900)' }}>
            {totalPending}
          </b>
          <span>Pending</span>
        </div>
      </div>

      {totalPending > 0 && (
        <>
          <div className="sec-h" style={{ marginBottom: 12, marginTop: 20 }}>
            <div className="t"><Clock size={16} /> Perlu Ditindaklanjuti</div>
          </div>
          <div className="peng-card">
            {canAccess('wargaBaru', role, menuConfig) && stats.pendingInvite > 0 && (
              <Link href="/pengurus/verifikasi">
                <div className="peng-item">
                  <div className="pi-ico" style={{ background: 'var(--gold-l)' }}><Users size={18} color="var(--gold)" /></div>
                  <div className="pi-body">
                    <div className="pi-t">Pendaftaran Warga Baru <span className="pill menunggu">{stats.pendingInvite}</span></div>
                    <div className="pi-d">Warga baru menunggu verifikasi pengurus</div>
                  </div>
                </div>
              </Link>
            )}
            {canAccess('verifBayar', role, menuConfig) && stats.pendingPayment > 0 && (
              <Link href="/pengurus/verifikasi-bayar">
                <div className="peng-item">
                  <div className="pi-ico" style={{ background: 'var(--g50)' }}><CreditCard size={18} color="var(--g600)" /></div>
                  <div className="pi-body">
                    <div className="pi-t">Verifikasi Pembayaran Iuran <span className="pill menunggu">{stats.pendingPayment}</span></div>
                    <div className="pi-d">Pembayaran transfer menunggu konfirmasi</div>
                  </div>
                </div>
              </Link>
            )}
            {canAccess('prosesSurat', role, menuConfig) && stats.pendingSurat > 0 && (
              <Link href="/pengurus/surat-antrean">
                <div className="peng-item">
                  <div className="pi-ico" style={{ background: 'var(--blue-l)' }}><Mail size={18} color="var(--blue)" /></div>
                  <div className="pi-body">
                    <div className="pi-t">Permohonan Surat <span className="pill menunggu">{stats.pendingSurat}</span></div>
                    <div className="pi-d">Surat keterangan RT menunggu proses</div>
                  </div>
                </div>
              </Link>
            )}
            {canAccess('laporan', role, menuConfig) && stats.pendingLaporan > 0 && (
              <Link href="/pengurus/laporan-masuk">
                <div className="peng-item">
                  <div className="pi-ico" style={{ background: 'var(--purple-l)' }}><FileText size={18} color="var(--purple)" /></div>
                  <div className="pi-body">
                    <div className="pi-t">Laporan Warga <span className="pill menunggu">{stats.pendingLaporan}</span></div>
                    <div className="pi-d">Laporan warga menunggu tanggapan</div>
                  </div>
                </div>
              </Link>
            )}
            {canAccess('inventaris', role, menuConfig) && stats.activeSewa > 0 && (
              <Link href="/pengurus/inventaris-kelola?tab=sewa">
                <div className="peng-item">
                  <div className="pi-ico" style={{ background: 'var(--gold-l)' }}><Package size={18} color="var(--gold)" /></div>
                  <div className="pi-body">
                    <div className="pi-t">Inventaris Sedang Disewa <span className="pill menunggu">{stats.activeSewa}</span></div>
                    <div className="pi-d">Inventaris yang sedang disewa warga</div>
                  </div>
                </div>
              </Link>
            )}
          </div>
        </>
      )}

      {/* ── Menu Pengurus ── */}
      <div className="sec-h" style={{ marginBottom: 12, marginTop: 20 }}>
        <div className="t"><Shield size={16} /> Menu Pengurus</div>
      </div>
      <div className="menu-grid">
        {canAccess('wargaBaru', role, menuConfig) && (
          <Link href="/pengurus/verifikasi">
            <div className="menu-item">
              <div className="mi-ico" style={{ background: 'var(--gold-l)', position: 'relative' }}>
                <Users size={22} color="var(--gold)" />
                {stats.pendingInvite > 0 && <span style={{ position: 'absolute', top: -4, right: -4, background: 'var(--red)', color: 'white', fontSize: 10, fontWeight: 800, borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{stats.pendingInvite}</span>}
              </div>
              <div className="mi-lbl">Warga Baru</div>
            </div>
          </Link>
        )}
        {canAccess('prosesSurat', role, menuConfig) && (
          <Link href="/pengurus/surat-antrean">
            <div className="menu-item">
              <div className="mi-ico" style={{ background: 'var(--blue-l)', position: 'relative' }}>
                <Mail size={22} color="var(--blue)" />
                {stats.pendingSurat > 0 && <span style={{ position: 'absolute', top: -4, right: -4, background: 'var(--red)', color: 'white', fontSize: 10, fontWeight: 800, borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{stats.pendingSurat}</span>}
              </div>
              <div className="mi-lbl">Proses Surat</div>
            </div>
          </Link>
        )}
        {canAccess('kasRt', role, menuConfig) && (
          <Link href="/pengurus/kas">
            <div className="menu-item">
              <div className="mi-ico" style={{ background: 'var(--g50)' }}><Wallet size={22} color="var(--g600)" /></div>
              <div className="mi-lbl">Kas RT</div>
            </div>
          </Link>
        )}
        {canAccess('verifBayar', role, menuConfig) && (
          <Link href="/pengurus/verifikasi-bayar">
            <div className="menu-item">
              <div className="mi-ico" style={{ background: 'var(--teal-l)', position: 'relative' }}>
                <CreditCard size={22} color="var(--teal)" />
                {stats.pendingPayment > 0 && <span style={{ position: 'absolute', top: -4, right: -4, background: 'var(--red)', color: 'white', fontSize: 10, fontWeight: 800, borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{stats.pendingPayment}</span>}
              </div>
              <div className="mi-lbl">Verif. Bayar</div>
            </div>
          </Link>
        )}
        {canAccess('tagihan', role, menuConfig) && (
          <Link href="/pengurus/tagihan">
            <div className="menu-item">
              <div className="mi-ico" style={{ background: 'var(--g50)' }}><CreditCard size={22} color="var(--g600)" /></div>
              <div className="mi-lbl">Tagihan</div>
            </div>
          </Link>
        )}
        {canAccess('laporan', role, menuConfig) && (
          <Link href="/pengurus/laporan-masuk">
            <div className="menu-item">
              <div className="mi-ico" style={{ background: 'var(--purple-l)', position: 'relative' }}>
                <FileText size={22} color="var(--purple)" />
                {stats.pendingLaporan > 0 && <span style={{ position: 'absolute', top: -4, right: -4, background: 'var(--red)', color: 'white', fontSize: 10, fontWeight: 800, borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{stats.pendingLaporan}</span>}
              </div>
              <div className="mi-lbl">Laporan</div>
            </div>
          </Link>
        )}
        {canAccess('dataWarga', role, menuConfig) && (
          <Link href="/pengurus/data-warga">
            <div className="menu-item">
              <div className="mi-ico" style={{ background: 'var(--gray100)' }}><ClipboardList size={22} color="var(--gray500)" /></div>
              <div className="mi-lbl">Data Warga</div>
            </div>
          </Link>
        )}
        {canAccess('pengumuman', role, menuConfig) && (
          <Link href="/pengurus/pengumuman-kelola">
            <div className="menu-item">
              <div className="mi-ico" style={{ background: 'var(--orange-l)' }}><Megaphone size={22} color="var(--orange)" /></div>
              <div className="mi-lbl">Pengumuman</div>
            </div>
          </Link>
        )}
        {canAccess('inventaris', role, menuConfig) && (
          <Link href="/pengurus/inventaris-kelola">
            <div className="menu-item" style={{ position: 'relative' }}>
              <div className="mi-ico" style={{ background: 'var(--gold-l)' }}><Package size={22} color="var(--gold)" /></div>
              <div className="mi-lbl">Inventaris</div>
              {stats.activeSewa > 0 && (
                <div style={{ position: 'absolute', top: 4, right: 10, background: 'var(--gold)', color: 'white', borderRadius: 20, fontSize: 10, fontWeight: 800, minWidth: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                  {stats.activeSewa}
                </div>
              )}
            </div>
          </Link>
        )}
        {canAccess('danaSosial', role, menuConfig) && (
          <Link href="/pengurus/dana-sosial">
            <div className="menu-item">
              <div className="mi-ico" style={{ background: 'var(--teal-l)' }}><Handshake size={22} color="var(--teal)" /></div>
              <div className="mi-lbl">Dana Sosial</div>
            </div>
          </Link>
        )}
        {isAdmin && (
          <Link href="/pengurus/admin/settings">
            <div className="menu-item">
              <div className="mi-ico" style={{ background: 'var(--orange-l)' }}><Settings size={22} color="var(--orange)" /></div>
              <div className="mi-lbl">Pengaturan RT</div>
            </div>
          </Link>
        )}
        {isAdmin && (
          <Link href="/pengurus/admin/akun">
            <div className="menu-item">
              <div className="mi-ico" style={{ background: 'var(--purple-l)' }}><User size={22} color="var(--purple)" /></div>
              <div className="mi-lbl">Kelola Akun</div>
            </div>
          </Link>
        )}
        {isAdmin && (
          <Link href="/pengurus/admin/notifikasi-service">
            <div className="menu-item">
              <div className="mi-ico" style={{ background: 'var(--teal-l)' }}><Wifi size={22} color="var(--teal)" /></div>
              <div className="mi-lbl">Notifikasi Service</div>
            </div>
          </Link>
        )}
      </div>

      {/* ── Menu sebagai Warga ── */}
      <div className="sec-h" style={{ marginBottom: 12, marginTop: 20 }}>
        <div className="t"><Home size={16} /> Menu Warga</div>
      </div>
      <div className="menu-grid">
        <Link href="/iuran">
          <div className="menu-item">
            <div className="mi-ico" style={{ background: 'var(--g50)' }}><CreditCard size={22} color="var(--g600)" /></div>
            <div className="mi-lbl">Iuran Saya</div>
          </div>
        </Link>
        <Link href="/pengumuman">
          <div className="menu-item">
            <div className="mi-ico" style={{ background: 'var(--orange-l)' }}><Bell size={22} color="var(--orange)" /></div>
            <div className="mi-lbl">Pengumuman</div>
          </div>
        </Link>
        <Link href="/keluarga">
          <div className="menu-item">
            <div className="mi-ico" style={{ background: 'var(--blue-l)' }}><Users size={22} color="var(--blue)" /></div>
            <div className="mi-lbl">Keluarga</div>
          </div>
        </Link>
        <Link href="/inventaris">
          <div className="menu-item">
            <div className="mi-ico" style={{ background: 'var(--gold-l)' }}><Package size={22} color="var(--gold)" /></div>
            <div className="mi-lbl">Inventaris</div>
          </div>
        </Link>
        <Link href="/kendaraan">
          <div className="menu-item">
            <div className="mi-ico" style={{ background: 'var(--gray100)' }}><Car size={22} color="var(--gray500)" /></div>
            <div className="mi-lbl">Kendaraan</div>
          </div>
        </Link>
        <Link href="/laporan">
          <div className="menu-item">
            <div className="mi-ico" style={{ background: 'var(--purple-l)' }}><FileText size={22} color="var(--purple)" /></div>
            <div className="mi-lbl">Laporan</div>
          </div>
        </Link>
        <Link href="/surat">
          <div className="menu-item">
            <div className="mi-ico" style={{ background: 'var(--teal-l)' }}><Mail size={22} color="var(--teal)" /></div>
            <div className="mi-lbl">Surat</div>
          </div>
        </Link>
        <Link href="/profil">
          <div className="menu-item">
            <div className="mi-ico" style={{ background: 'var(--gray100)' }}><User size={22} color="var(--gray500)" /></div>
            <div className="mi-lbl">Profil</div>
          </div>
        </Link>
      </div>
    </>
  )
}
