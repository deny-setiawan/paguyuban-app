'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, User, ClipboardList, Save, LogOut, Pencil, Image, FileText, X, Users, Crown, ExternalLink } from 'lucide-react'

function detectDocType(url: string): 'image' | 'pdf' {
  if (url.startsWith('data:application/pdf') || /\.pdf(\?|$)/i.test(url)) return 'pdf'
  if (url.includes('drive.google.com/file/d/')) return 'pdf'
  return 'image'
}

function getPdfSrc(url: string): string {
  if (url.startsWith('data:')) return url
  if (url.includes('drive.google.com/file/d/')) return url.replace('/view', '/preview').replace(/\/preview.*$/, '/preview')
  return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`
}

interface ProfileData {
  id: string
  phone: string
  fullName: string | null
  noRumah: string | null
  email: string | null
  role: string
  isActive: boolean
  isVerified: boolean
}

interface WargaData {
  id: string
  namaLengkap: string
  nik: string | null
  noKk: string | null
  tanggalLahir: string | null
  tanggalMenempati: string | null
  jenisKelamin: string | null
  agama: string | null
  pekerjaan: string | null
  statusPerkawinan: string | null
  statusHunian: string | null
  jumlahJiwa: number | null
  alamatLengkap: string | null
  dansosKelahiranTerpakai: number | null
  dansosSakitTerpakai: number | null
}

interface AnggotaItem {
  id: string
  namaLengkap: string
  hubunganKeluarga: string | null
  jenisKelamin: string | null
  agama: string | null
  kkStatus: string | null
}

interface Props {
  profile: ProfileData
  warga: WargaData | null
  anggota: AnggotaItem[]
  rtName: string
  fotoFiles: string[]
}

const ROLE_LABELS: Record<string, string> = {
  warga: 'Warga', tamu: 'Tamu',
  ketua: 'Ketua RT', wakil_ketua: 'Wakil Ketua', sekretaris: 'Sekretaris',
  bendahara: 'Bendahara', humas: 'Humas', lingkungan: 'Seksi Lingkungan',
  keamanan: 'Seksi Keamanan', peralatan: 'Seksi Peralatan', admin: 'Admin',
}

export default function ProfilClient({ profile, warga, anggota, rtName, fotoFiles }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [docModal, setDocModal] = useState<{ url: string; type: 'image' | 'pdf' } | null>(null)

  function openDoc(url: string) {
    setDocModal({ url, type: detectDocType(url) })
  }
  const [form, setForm] = useState({
    fullName: profile.fullName || '',
    noRumah: profile.noRumah || '',
    email: profile.email || '',
    pekerjaan: warga?.pekerjaan || '',
    tanggalLahir: warga?.tanggalLahir || '',
    tanggalMenempati: warga?.tanggalMenempati || '',
  })
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [logoutLoading, setLogoutLoading] = useState(false)

  async function saveProfile() {
    setLoading(true); setMsg('')
    try {
      const res = await fetch('/api/profil', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setEditing(false)
      router.refresh()
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Gagal menyimpan profil')
    } finally { setLoading(false) }
  }

  async function logout() {
    setLogoutLoading(true)
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
    router.refresh()
  }

  return (
    <>
      {/* Profile header */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0 24px', gap: 12 }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--g500)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, color: 'white', fontWeight: 800 }}>
          {(profile.fullName || profile.phone || 'W').slice(0, 1).toUpperCase()}
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--gray900)' }}>{profile.fullName || '—'}</div>
          <div style={{ fontSize: 13, color: 'var(--gray500)', marginTop: 2 }}>{profile.phone}</div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 8 }}>
            <span className="pill lunas">{ROLE_LABELS[profile.role] || profile.role}</span>
            {!profile.isActive && <span className="pill menunggu">Menunggu Verifikasi</span>}
            {profile.isVerified && <span className="pill selesai">Terverifikasi</span>}
          </div>
        </div>
      </div>

      {!profile.isActive && (
        <div className="status-banner pending" style={{ marginBottom: 16 }}>
          <div className="sb-ico"><Clock size={24} /></div>
          <div className="sb-txt">
            <div className="sb-l1">Akun belum aktif</div>
            <div className="sb-l2">Pengurus RT sedang meninjau pendaftaran Anda.</div>
          </div>
        </div>
      )}

      {/* Data profil */}
      <div className="sec-h" style={{ marginBottom: 12 }}>
        <div className="t"><User size={16} /> Data Diri</div>
        {!editing && (
          <button onClick={() => setEditing(true)}
            style={{ border: 'none', background: 'none', fontSize: 13, fontWeight: 700, color: 'var(--g600)', cursor: 'pointer', fontFamily: 'var(--f)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Pencil size={13} /> Edit
          </button>
        )}
      </div>

      {editing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray600)' }}>Nama Lengkap</label>
          <input className="rl-in" value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))} placeholder="Nama lengkap" />
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray600)' }}>No. Rumah</label>
          <input className="rl-in" value={form.noRumah} onChange={e => setForm(p => ({ ...p, noRumah: e.target.value }))} placeholder="Mis. A-12" />
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray600)' }}>Email (opsional)</label>
          <input className="rl-in" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="email@contoh.com" />
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray600)' }}>Pekerjaan</label>
          <input className="rl-in" value={form.pekerjaan} onChange={e => setForm(p => ({ ...p, pekerjaan: e.target.value }))} placeholder="Mis. Karyawan Swasta" />
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray600)' }}>Tanggal Lahir</label>
          <input className="rl-in" type="date" value={form.tanggalLahir} onChange={e => setForm(p => ({ ...p, tanggalLahir: e.target.value }))} />
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray600)' }}>Tanggal Menempati</label>
          <input className="rl-in" type="date" value={form.tanggalMenempati} onChange={e => setForm(p => ({ ...p, tanggalMenempati: e.target.value }))} />
          {msg && <div style={{ fontSize: 12, color: 'var(--red)', padding: '8px 12px', background: 'var(--red-l)', borderRadius: 10 }}>{msg}</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button className="rl-b" style={{ flex: 1, height: 44 }} onClick={() => { setEditing(false); setMsg('') }}>Batal</button>
            <button className="btn-p" style={{ flex: 2, height: 44 }} onClick={saveProfile} disabled={loading}>
              {loading ? 'Menyimpan…' : <><Save size={16} /> Simpan</>}
            </button>
          </div>
        </div>
      ) : (
        <div className="peng-card" style={{ padding: '4px 14px' }}>
          <div className="kv"><span className="k">Nama</span><span className="v">{profile.fullName || '—'}</span></div>
          <div className="kv"><span className="k">No. HP</span><span className="v">{profile.phone}</span></div>
          <div className="kv"><span className="k">No. Rumah</span><span className="v">{profile.noRumah || '—'}</span></div>
          <div className="kv"><span className="k">Email</span><span className="v">{profile.email || '—'}</span></div>
          <div className="kv"><span className="k">RT</span><span className="v">{rtName}</span></div>
        </div>
      )}

      {/* Data KK */}
      {warga && (
        <>
          <div className="sec-h" style={{ margin: '20px 0 12px' }}>
            <div className="t"><ClipboardList size={16} /> Data KK</div>
          </div>
          <div className="peng-card" style={{ padding: '4px 14px' }}>
            <div className="kv"><span className="k">Nama KK</span><span className="v">{warga.namaLengkap}</span></div>
            <div className="kv"><span className="k">NIK</span><span className="v">{warga.nik || '—'}</span></div>
            <div className="kv"><span className="k">No. KK</span><span className="v">{warga.noKk || '—'}</span></div>
            <div className="kv"><span className="k">Tanggal lahir</span><span className="v">{warga.tanggalLahir || '—'}</span></div>
            <div className="kv"><span className="k">Tgl. menempati</span><span className="v">{warga.tanggalMenempati || '—'}</span></div>
            <div className="kv"><span className="k">Jenis kelamin</span><span className="v">{warga.jenisKelamin === 'L' ? 'Laki-laki' : warga.jenisKelamin === 'P' ? 'Perempuan' : '—'}</span></div>
            <div className="kv"><span className="k">Agama</span><span className="v">{warga.agama || '—'}</span></div>
            <div className="kv"><span className="k">Pekerjaan</span><span className="v">{warga.pekerjaan || '—'}</span></div>
            <div className="kv"><span className="k">Status hunian</span><span className="v">{warga.statusHunian || '—'}</span></div>
            <div className="kv" style={{ borderBottom: 'none' }}><span className="k">Jumlah jiwa</span><span className="v">{warga.jumlahJiwa ?? '—'}</span></div>
          </div>

          {/* Anggota Keluarga */}
          {anggota.length > 0 && (
            <>
              <div className="sec-h" style={{ margin: '20px 0 12px' }}>
                <div className="t"><Users size={16} /> Anggota Keluarga</div>
                <span style={{ fontSize: 12, color: 'var(--gray400)', fontWeight: 700 }}>{anggota.length} jiwa</span>
              </div>
              <div className="peng-card">
                {anggota.map(a => (
                  <div key={a.id} className="peng-item" style={{ cursor: 'default' }}>
                    <div className="pi-ico" style={{ background: a.kkStatus === 'kepala_kk' ? 'var(--g50)' : 'var(--gray100)' }}>
                      {a.kkStatus === 'kepala_kk' ? <Crown size={18} color="var(--g600)" /> : <User size={18} color="var(--gray500)" />}
                    </div>
                    <div className="pi-body">
                      <div className="pi-t">
                        {a.namaLengkap}
                        {a.hubunganKeluarga && <span className="pill selesai">{a.hubunganKeluarga}</span>}
                      </div>
                      <div className="pi-d">
                        {[a.jenisKelamin === 'L' ? 'Laki-laki' : a.jenisKelamin === 'P' ? 'Perempuan' : null, a.agama].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

        </>
      )}

      {/* Foto Dokumen Pendaftaran */}
      <div className="sec-h" style={{ margin: '20px 0 12px' }}>
        <div className="t"><Image size={16} /> Dokumen Pendaftaran</div>
      </div>
      {fotoFiles.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 4 }}>
          {fotoFiles.map((url, i) => {
            const isPdf = detectDocType(url) === 'pdf'
            return (
              <button key={i} onClick={() => openDoc(url)}
                style={{ border: `1.5px solid ${isPdf ? 'var(--red)' : 'var(--gray200)'}`, borderRadius: 10, overflow: 'hidden', aspectRatio: '1', padding: 0, cursor: 'pointer', background: 'var(--gray50)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                {isPdf
                  ? <><FileText size={28} color="var(--red)" /><span style={{ fontSize: 9, color: 'var(--red)', fontWeight: 700 }}>PDF</span></>
                  : <img src={url} alt={`Dok ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                }
              </button>
            )
          })}
        </div>
      ) : (
        <div style={{ background: 'var(--gray50)', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--gray500)', fontSize: 13, marginBottom: 4 }}>
          <FileText size={16} color="var(--gray400)" />
          Belum ada foto/dokumen terlampir
        </div>
      )}

      {/* Dokumen modal (gambar atau PDF) */}
      {docModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.88)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setDocModal(null)}>
          <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
            {docModal.type === 'pdf' && (
              <button onClick={() => window.open(docModal.url, '_blank')}
                style={{ background: 'white', border: 'none', borderRadius: 20, padding: '6px 14px', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                <ExternalLink size={13} /> Buka
              </button>
            )}
            <button onClick={() => setDocModal(null)}
              style={{ background: 'white', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={18} />
            </button>
          </div>
          {docModal.type === 'image'
            ? <img src={docModal.url} alt="Foto dokumen" style={{ maxWidth: '94vw', maxHeight: '86vh', borderRadius: 12, objectFit: 'contain' }} onClick={e => e.stopPropagation()} />
            : <div style={{ width: '94vw', height: '80vh', background: 'white', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
                <iframe src={getPdfSrc(docModal.url)} style={{ flex: 1, border: 'none', width: '100%' }} title="Dokumen PDF" />
                <div style={{ padding: '6px 12px', fontSize: 11, color: 'var(--gray400)', textAlign: 'center' }}>Jika PDF tidak tampil, klik Buka di atas</div>
              </div>
          }
        </div>
      )}

      {/* Logout */}
      <div style={{ marginTop: 24 }}>
        <button
          onClick={logout}
          disabled={logoutLoading}
          style={{
            width: '100%', height: 48, border: '2px solid var(--red)', borderRadius: 14,
            background: 'white', color: 'var(--red)', fontFamily: 'var(--f)',
            fontSize: 14, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {logoutLoading ? 'Keluar…' : <><LogOut size={16} /> Keluar dari akun</>}
        </button>
      </div>
    </>
  )
}
