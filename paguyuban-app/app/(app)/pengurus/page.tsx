import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { profiles, rtGroups, wargaInvites, iuranPayments, surat, laporanWarga, transaksi, warga } from '@/lib/db/schema'
import { eq, and, count, desc } from 'drizzle-orm'
import { rupiah } from '@/lib/utils'
import Link from 'next/link'

const ROLE_LABELS: Record<string, { label: string; ico: string }> = {
  ketua: { label: 'Ketua RT', ico: '👑' },
  sekretaris: { label: 'Sekretaris', ico: '📋' },
  bendahara: { label: 'Bendahara', ico: '💰' },
  admin: { label: 'Admin', ico: '⚙️' },
}

export default async function PengurusPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) redirect('/')
  const payload = await verifyJwt(token)
  if (!payload) redirect('/')

  const pengurusRoles = ['ketua', 'sekretaris', 'bendahara', 'admin']
  if (!pengurusRoles.includes(payload.role)) redirect('/')

  const [profile] = await db.select().from(profiles).where(eq(profiles.id, payload.sub)).limit(1)
  if (!profile) redirect('/')

  let rt = null
  if (profile.rtGroupId) {
    const [rtData] = await db.select().from(rtGroups).where(eq(rtGroups.id, profile.rtGroupId)).limit(1)
    rt = rtData ?? null
  }

  const rtId = profile.rtGroupId
  if (!rtId) {
    return (
      <div className="ib gold">
        <span>⚠️</span>
        <div>Akun Anda belum dikaitkan ke RT manapun. Hubungi administrator sistem.</div>
      </div>
    )
  }

  const [
    jumlahWargaRes, pendingInviteRes, pendingPaymentRes,
    pendingSuratRes, pendingLaporanRes, lastTransRes,
  ] = await Promise.all([
    db.select({ c: count() }).from(warga).where(eq(warga.rtGroupId, rtId)),
    db.select({ c: count() }).from(wargaInvites).where(and(eq(wargaInvites.rtGroupId, rtId), eq(wargaInvites.status, 'pending'))),
    db.select({ c: count() }).from(iuranPayments).where(and(eq(iuranPayments.rtGroupId, rtId), eq(iuranPayments.statusVerif, 'pending'))),
    db.select({ c: count() }).from(surat).where(and(eq(surat.rtGroupId, rtId), eq(surat.status, 'diajukan'))),
    db.select({ c: count() }).from(laporanWarga).where(and(eq(laporanWarga.rtGroupId, rtId), eq(laporanWarga.status, 'menunggu'))),
    db.select().from(transaksi).where(eq(transaksi.rtGroupId, rtId)).orderBy(desc(transaksi.createdAt)).limit(1),
  ])

  const stats = {
    jumlahWarga: jumlahWargaRes[0]?.c ?? 0,
    pendingInvite: pendingInviteRes[0]?.c ?? 0,
    pendingPayment: pendingPaymentRes[0]?.c ?? 0,
    pendingSurat: pendingSuratRes[0]?.c ?? 0,
    pendingLaporan: pendingLaporanRes[0]?.c ?? 0,
    saldoKas: lastTransRes[0]?.saldoSetelah ?? 0,
  }

  const role = payload.role
  const roleInfo = ROLE_LABELS[role] || { label: role, ico: '🛡️' }
  const totalPending = stats.pendingInvite + stats.pendingPayment + stats.pendingSurat + stats.pendingLaporan

  return (
    <>
      <div className="status-banner aktif" style={{ marginBottom: 4 }}>
        <div className="sb-ico">{roleInfo.ico}</div>
        <div className="sb-txt">
          <div className="sb-l1">Halo, {roleInfo.label}!</div>
          <div className="sb-l2">{rt?.namaRt || 'Paguyuban PKR-Pepe'} · {totalPending > 0 ? `${totalPending} item perlu perhatian` : 'Semua tertangani ✅'}</div>
        </div>
      </div>

      <div className="sec-h" style={{ marginBottom: 12, marginTop: 8 }}>
        <div className="t"><span className="em">📊</span> Statistik RT</div>
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
            <div className="t"><span className="em">⏳</span> Perlu Ditindaklanjuti</div>
          </div>
          <div className="peng-card">
            {stats.pendingInvite > 0 && (
              <div className="peng-item" style={{ cursor: 'default' }}>
                <div className="pi-ico" style={{ background: 'var(--gold-l)' }}>👥</div>
                <div className="pi-body">
                  <div className="pi-t">Pendaftaran Warga Baru <span className="pill menunggu">{stats.pendingInvite}</span></div>
                  <div className="pi-d">Warga baru menunggu verifikasi pengurus</div>
                </div>
              </div>
            )}
            {stats.pendingPayment > 0 && (
              <div className="peng-item" style={{ cursor: 'default' }}>
                <div className="pi-ico" style={{ background: 'var(--g50)' }}>💳</div>
                <div className="pi-body">
                  <div className="pi-t">Verifikasi Pembayaran Iuran <span className="pill menunggu">{stats.pendingPayment}</span></div>
                  <div className="pi-d">Pembayaran transfer menunggu konfirmasi</div>
                </div>
              </div>
            )}
            {stats.pendingSurat > 0 && (
              <div className="peng-item" style={{ cursor: 'default' }}>
                <div className="pi-ico" style={{ background: 'var(--blue-l)' }}>✉️</div>
                <div className="pi-body">
                  <div className="pi-t">Permohonan Surat <span className="pill menunggu">{stats.pendingSurat}</span></div>
                  <div className="pi-d">Surat keterangan RT menunggu proses</div>
                </div>
              </div>
            )}
            {stats.pendingLaporan > 0 && (
              <div className="peng-item" style={{ cursor: 'default' }}>
                <div className="pi-ico" style={{ background: 'var(--purple-l)' }}>📝</div>
                <div className="pi-body">
                  <div className="pi-t">Laporan Warga <span className="pill menunggu">{stats.pendingLaporan}</span></div>
                  <div className="pi-d">Laporan warga menunggu tanggapan</div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <div className="sec-h" style={{ marginBottom: 12, marginTop: 20 }}>
        <div className="t"><span className="em">⚡</span> Menu Pengurus</div>
      </div>
      <div className="menu-grid">
        {(role !== 'bendahara') && (
          <div className="menu-item" style={{ opacity: 0.55 }}>
            <div className="mi-ico" style={{ background: 'var(--gold-l)' }}>👥</div>
            <div className="mi-lbl">Data Warga</div>
          </div>
        )}
        {(role !== 'bendahara') && (
          <div className="menu-item" style={{ opacity: 0.55 }}>
            <div className="mi-ico" style={{ background: 'var(--blue-l)' }}>✉️</div>
            <div className="mi-lbl">Proses Surat</div>
          </div>
        )}
        {(role === 'bendahara' || role === 'admin' || role === 'ketua') && (
          <div className="menu-item" style={{ opacity: 0.55 }}>
            <div className="mi-ico" style={{ background: 'var(--g50)' }}>💰</div>
            <div className="mi-lbl">Kas RT</div>
          </div>
        )}
        {(role === 'bendahara' || role === 'admin') && (
          <div className="menu-item" style={{ opacity: 0.55 }}>
            <div className="mi-ico" style={{ background: 'var(--teal-l)' }}>💳</div>
            <div className="mi-lbl">Verif. Bayar</div>
          </div>
        )}
        {(role === 'ketua' || role === 'admin') && (
          <div className="menu-item" style={{ opacity: 0.55 }}>
            <div className="mi-ico" style={{ background: 'var(--purple-l)' }}>📝</div>
            <div className="mi-lbl">Laporan</div>
          </div>
        )}
        {role === 'admin' && (
          <div className="menu-item" style={{ opacity: 0.55 }}>
            <div className="mi-ico" style={{ background: 'var(--orange-l)' }}>⚙️</div>
            <div className="mi-lbl">Pengaturan</div>
          </div>
        )}
      </div>

      <div className="ib blue" style={{ marginTop: 16 }}>
        <span>🚧</span>
        <div>Fitur detail pengurus (proses surat, verifikasi pembayaran, kelola kas, dll.) sedang dikembangkan dan akan segera tersedia.</div>
      </div>

      <div style={{ marginTop: 20, textAlign: 'center' }}>
        <Link href="/" style={{ fontSize: 13, fontWeight: 700, color: 'var(--g600)', textDecoration: 'none' }}>
          ← Kembali ke beranda
        </Link>
      </div>
    </>
  )
}
