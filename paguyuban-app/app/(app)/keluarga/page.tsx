import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { profiles, warga } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { ClipboardList, Info, Users, Crown, User } from 'lucide-react'

export default async function KeluargaPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) redirect('/')
  const payload = await verifyJwt(token)
  if (!payload) redirect('/')

  const [profile] = await db.select().from(profiles).where(eq(profiles.id, payload.sub)).limit(1)
  if (!profile) redirect('/')

  const [kepalaKk] = await db.select().from(warga)
    .where(eq(warga.profileId, profile.id)).limit(1)

  const allAnggota = kepalaKk?.noKk
    ? await db.select().from(warga).where(eq(warga.noKk, kepalaKk.noKk))
    : kepalaKk ? [kepalaKk] : []

  return (
    <>
      {!kepalaKk ? (
        <>
          <div className="status-banner pending">
            <div className="sb-ico"><ClipboardList size={24} /></div>
            <div className="sb-txt">
              <div className="sb-l1">Data KK belum tersedia</div>
              <div className="sb-l2">Pengurus RT belum menginput data KK Anda. Hubungi pengurus untuk proses pendaftaran.</div>
            </div>
          </div>
          <div className="ib blue" style={{ marginTop: 16 }}>
            <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>Jika sudah mendaftar, tunggu konfirmasi dari Ketua RT via WhatsApp.</div>
          </div>
        </>
      ) : (
        <>
          <div className="sec-h" style={{ marginBottom: 12 }}>
            <div className="t"><Users size={16} /> Data Kepala KK</div>
          </div>
          <div className="peng-card" style={{ padding: '4px 0', marginBottom: 20 }}>
            <div className="kv"><span className="k">Nama KK</span><span className="v">{kepalaKk.namaLengkap}</span></div>
            {kepalaKk.noKk && <div className="kv"><span className="k">No. KK</span><span className="v">{kepalaKk.noKk}</span></div>}
            {kepalaKk.nik && <div className="kv"><span className="k">NIK</span><span className="v">{kepalaKk.nik}</span></div>}
            {kepalaKk.noRumah && <div className="kv"><span className="k">No. Rumah</span><span className="v">{kepalaKk.noRumah}</span></div>}
            {kepalaKk.jenisKelamin && <div className="kv"><span className="k">Jenis Kelamin</span><span className="v">{kepalaKk.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</span></div>}
            {kepalaKk.agama && <div className="kv"><span className="k">Agama</span><span className="v">{kepalaKk.agama}</span></div>}
            {kepalaKk.statusPerkawinan && <div className="kv"><span className="k">Status Kawin</span><span className="v">{kepalaKk.statusPerkawinan}</span></div>}
            {kepalaKk.pekerjaan && <div className="kv"><span className="k">Pekerjaan</span><span className="v">{kepalaKk.pekerjaan}</span></div>}
            {kepalaKk.statusHunian && <div className="kv"><span className="k">Status Hunian</span><span className="v">{kepalaKk.statusHunian}</span></div>}
            {kepalaKk.tanggalMenempati && <div className="kv"><span className="k">Tgl. Menempati</span><span className="v">{kepalaKk.tanggalMenempati}</span></div>}
            <div className="kv" style={{ borderBottom: 'none' }}><span className="k">Jumlah Jiwa</span><span className="v">{kepalaKk.jumlahJiwa ?? '-'}</span></div>
          </div>

          <div className="sec-h" style={{ marginBottom: 12 }}>
            <div className="t"><Users size={16} /> Anggota Keluarga</div>
            <span style={{ fontSize: 12, color: 'var(--gray400)', fontWeight: 700 }}>{allAnggota.length} jiwa</span>
          </div>

          {allAnggota.length <= 1 && !kepalaKk.noKk ? (
            <div className="ib blue">
              <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>Data anggota keluarga akan muncul setelah No. KK diisi oleh pengurus RT.</div>
            </div>
          ) : (
            <div className="peng-card">
              {allAnggota.map((a) => (
                <div key={a.id} className="peng-item" style={{ cursor: 'default' }}>
                  <div className="pi-ico" style={{ background: a.profileId === profile.id ? 'var(--g50)' : 'var(--gray100)' }}>
                    {a.profileId === profile.id
                      ? <Crown size={18} color="var(--g600)" />
                      : <User size={18} color="var(--gray500)" />}
                  </div>
                  <div className="pi-body">
                    <div className="pi-t">
                      {a.namaLengkap}
                      {a.profileId === profile.id && <span className="pill lunas">Kepala KK</span>}
                      {a.hubunganKeluarga && a.profileId !== profile.id && <span className="pill selesai">{a.hubunganKeluarga}</span>}
                    </div>
                    <div className="pi-d">
                      {[
                        a.jenisKelamin === 'L' ? 'Laki-laki' : a.jenisKelamin === 'P' ? 'Perempuan' : null,
                        a.agama,
                        a.pekerjaan,
                      ].filter(Boolean).join(' · ')}
                    </div>
                    {a.nik && <div style={{ fontSize: 11, color: 'var(--gray400)', marginTop: 2 }}>NIK: {a.nik}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="ib green" style={{ marginTop: 16 }}>
            <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>Untuk memperbarui data KK atau anggota keluarga, gunakan <b>Pemutakhiran Data</b> di halaman utama atau hubungi pengurus RT.</div>
          </div>
        </>
      )}
    </>
  )
}
