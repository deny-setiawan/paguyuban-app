'use client'

import { useState } from 'react'
import { CheckCircle, Save } from 'lucide-react'

interface RtData {
  id: string
  namaRt: string
  rtNumber: string | null
  rwNumber: string | null
  kelurahan: string | null
  kecamatan: string | null
  kota: string | null
  provinsi: string | null
  namaJalan: string | null
  noRekening: string | null
  bankNama: string | null
  bankAtasNama: string | null
  ketuaNama: string | null
  temaWarna: string | null
}

export default function AdminSettingsClient({ rt }: { rt: RtData }) {
  const [form, setForm] = useState(rt)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
    setLoading(false)
  }

  const inp = (label: string, key: keyof RtData, placeholder?: string) => (
    <div style={{ marginBottom: 4 }}>
      <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray600)', display: 'block', marginBottom: 2 }}>{label}</label>
      <input className="inp" value={(form[key] as string) || ''} placeholder={placeholder || label}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
    </div>
  )

  return (
    <form onSubmit={submit}>
      {saved && (
        <div className="status-banner aktif" style={{ marginBottom: 16 }}>
          <div className="sb-ico"><CheckCircle size={24} /></div>
          <div className="sb-txt"><div className="sb-l1">Pengaturan berhasil disimpan</div></div>
        </div>
      )}

      <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--gray600)', marginBottom: 8, letterSpacing: 1 }}>IDENTITAS RT</div>
      {inp('Nama RT', 'namaRt', 'Contoh: Paguyuban PKR-Pepe')}
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1 }}>{inp('RT', 'rtNumber', 'Contoh: 01')}</div>
        <div style={{ flex: 1 }}>{inp('RW', 'rwNumber', 'Contoh: 05')}</div>
      </div>
      {inp('Nama Ketua RT', 'ketuaNama')}

      <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--gray600)', marginBottom: 8, marginTop: 16, letterSpacing: 1 }}>ALAMAT</div>
      {inp('Nama Jalan', 'namaJalan')}
      {inp('Kelurahan', 'kelurahan')}
      {inp('Kecamatan', 'kecamatan')}
      {inp('Kota/Kabupaten', 'kota')}
      {inp('Provinsi', 'provinsi')}

      <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--gray600)', marginBottom: 8, marginTop: 16, letterSpacing: 1 }}>REKENING KAS</div>
      {inp('Nama Bank', 'bankNama', 'Contoh: BRI')}
      {inp('No. Rekening', 'noRekening')}
      {inp('Atas Nama', 'bankAtasNama')}

      <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--gray600)', marginBottom: 8, marginTop: 16, letterSpacing: 1 }}>TAMPILAN</div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray600)', display: 'block', marginBottom: 4 }}>Warna Tema</label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="color" value={form.temaWarna || '#1d4ed8'}
            onChange={e => setForm(f => ({ ...f, temaWarna: e.target.value }))}
            style={{ width: 44, height: 36, borderRadius: 8, border: '1px solid var(--gray200)', cursor: 'pointer' }} />
          <span style={{ fontSize: 13, color: 'var(--gray600)' }}>{form.temaWarna || '#1d4ed8'}</span>
        </div>
      </div>

      <button className="btn-primary" type="submit" style={{ width: '100%', marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        disabled={loading}>
        {loading ? 'Menyimpan...' : <><Save size={16} /> Simpan Pengaturan</>}
      </button>
    </form>
  )
}
