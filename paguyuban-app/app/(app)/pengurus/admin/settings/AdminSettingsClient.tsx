'use client'

import { useState } from 'react'
import { CheckCircle, Save, ClipboardList, ToggleLeft, ToggleRight } from 'lucide-react'

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
  pemutakhiranActive: boolean
  pemutakhiranTahun: number | null
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

  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 1 + i)

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

      {/* Program Pemutakhiran Data */}
      <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--gray600)', marginBottom: 8, marginTop: 16, letterSpacing: 1 }}>PROGRAM PEMUTAKHIRAN DATA</div>
      <div style={{ background: 'var(--gray50)', borderRadius: 14, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--gray800)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <ClipboardList size={14} color="var(--g600)" /> Status Program
            </div>
            <div style={{ fontSize: 11, color: 'var(--gray400)', marginTop: 2 }}>
              {form.pemutakhiranActive
                ? `Aktif — banner tampil di halaman publik (Tahun ${form.pemutakhiranTahun || currentYear})`
                : 'Nonaktif — banner tersembunyi dari halaman publik'}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setForm(f => ({ ...f, pemutakhiranActive: !f.pemutakhiranActive }))}
            style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', flexShrink: 0 }}>
            {form.pemutakhiranActive
              ? <ToggleRight size={38} color="var(--g500)" />
              : <ToggleLeft size={38} color="var(--gray300)" />}
          </button>
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray600)', display: 'block', marginBottom: 4 }}>Tahun Program</label>
          <select className="inp" value={form.pemutakhiranTahun || currentYear}
            onChange={e => setForm(f => ({ ...f, pemutakhiranTahun: Number(e.target.value) }))}>
            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <div style={{ fontSize: 11, color: 'var(--gray400)', marginTop: 4 }}>
            Judul banner akan otomatis menjadi &quot;Program Pemutakhiran Data Warga {form.pemutakhiranTahun || currentYear}&quot;
          </div>
        </div>
      </div>

      <button className="btn-primary" type="submit" style={{ width: '100%', marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        disabled={loading}>
        {loading ? 'Menyimpan...' : <><Save size={16} /> Simpan Pengaturan</>}
      </button>
    </form>
  )
}
