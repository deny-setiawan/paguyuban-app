'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

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
  jenisKelamin: string | null
  agama: string | null
  pekerjaan: string | null
  statusPerkawinan: string | null
  statusHunian: string | null
  jumlahJiwa: number | null
  alamatLengkap: string | null
}

interface Props {
  profile: ProfileData
  warga: WargaData | null
  rtName: string
}

const ROLE_LABELS: Record<string, string> = {
  warga: 'Warga', ketua: 'Ketua RT', sekretaris: 'Sekretaris', bendahara: 'Bendahara', admin: 'Admin', tamu: 'Tamu',
}

export default function ProfilClient({ profile, warga, rtName }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    fullName: profile.fullName || '',
    noRumah: profile.noRumah || '',
    email: profile.email || '',
    pekerjaan: warga?.pekerjaan || '',
    tanggalLahir: warga?.tanggalLahir || '',
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
          <div className="sb-ico">⏳</div>
          <div className="sb-txt">
            <div className="sb-l1">Akun belum aktif</div>
            <div className="sb-l2">Pengurus RT sedang meninjau pendaftaran Anda.</div>
          </div>
        </div>
      )}

      {/* Data profil */}
      <div className="sec-h" style={{ marginBottom: 12 }}>
        <div className="t"><span className="em">👤</span> Data Diri</div>
        {!editing && (
          <button onClick={() => setEditing(true)}
            style={{ border: 'none', background: 'none', fontSize: 13, fontWeight: 700, color: 'var(--g600)', cursor: 'pointer', fontFamily: 'var(--f)' }}>
            ✏️ Edit
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
          {msg && <div style={{ fontSize: 12, color: 'var(--red)', padding: '8px 12px', background: 'var(--red-l)', borderRadius: 10 }}>{msg}</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button className="rl-b" style={{ flex: 1, height: 44 }} onClick={() => { setEditing(false); setMsg('') }}>Batal</button>
            <button className="btn-p" style={{ flex: 2, height: 44 }} onClick={saveProfile} disabled={loading}>
              {loading ? 'Menyimpan…' : '💾 Simpan'}
            </button>
          </div>
        </div>
      ) : (
        <div className="peng-card" style={{ padding: '4px 0' }}>
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
            <div className="t"><span className="em">📋</span> Data KK</div>
          </div>
          <div className="peng-card" style={{ padding: '4px 0' }}>
            <div className="kv"><span className="k">Nama KK</span><span className="v">{warga.namaLengkap}</span></div>
            <div className="kv"><span className="k">NIK</span><span className="v">{warga.nik || '—'}</span></div>
            <div className="kv"><span className="k">No. KK</span><span className="v">{warga.noKk || '—'}</span></div>
            <div className="kv"><span className="k">Tanggal lahir</span><span className="v">{warga.tanggalLahir || '—'}</span></div>
            <div className="kv"><span className="k">Jenis kelamin</span><span className="v">{warga.jenisKelamin === 'L' ? 'Laki-laki' : warga.jenisKelamin === 'P' ? 'Perempuan' : '—'}</span></div>
            <div className="kv"><span className="k">Agama</span><span className="v">{warga.agama || '—'}</span></div>
            <div className="kv"><span className="k">Pekerjaan</span><span className="v">{warga.pekerjaan || '—'}</span></div>
            <div className="kv"><span className="k">Status hunian</span><span className="v">{warga.statusHunian || '—'}</span></div>
            <div className="kv" style={{ borderBottom: 'none' }}><span className="k">Jumlah jiwa</span><span className="v">{warga.jumlahJiwa ?? '—'}</span></div>
          </div>
        </>
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
          }}
        >
          {logoutLoading ? 'Keluar…' : '🚪 Keluar dari akun'}
        </button>
      </div>
    </>
  )
}
