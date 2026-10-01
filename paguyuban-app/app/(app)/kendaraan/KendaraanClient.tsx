'use client'

import { useState } from 'react'
import { timeAgo } from '@/lib/utils'

interface KendaraanItem {
  id: string
  jenis: string
  platNomor: string
  merk: string | null
  warna: string | null
  tahun: string | null
  namaPemilik: string | null
  noStnk: string | null
  pajakBerlakuSampai: string | null
  catatan: string | null
  createdAt: string
}

interface Props {
  items: KendaraanItem[]
}

const JENIS_OPTIONS = [
  { val: 'motor', lbl: '🏍️ Motor' },
  { val: 'mobil', lbl: '🚗 Mobil' },
  { val: 'truk', lbl: '🚚 Truk' },
  { val: 'lainnya', lbl: '🚘 Lainnya' },
]

const JENIS_ICO: Record<string, string> = {
  motor: '🏍️', mobil: '🚗', truk: '🚚', lainnya: '🚘',
}

export default function KendaraanClient({ items }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ jenis: 'motor', platNomor: '', merk: '', warna: '', tahun: '', namaPemilik: '', noStnk: '', pajakBerlakuSampai: '', catatan: '' })
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [localItems, setLocalItems] = useState(items)

  async function submitKendaraan() {
    if (!form.platNomor.trim()) { setMsg('Plat nomor wajib diisi'); return }
    setLoading(true); setMsg('')
    try {
      const res = await fetch('/api/kendaraan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setLocalItems(prev => [data.kendaraan, ...prev])
      setShowForm(false)
      setForm({ jenis: 'motor', platNomor: '', merk: '', warna: '', tahun: '', namaPemilik: '', noStnk: '', pajakBerlakuSampai: '', catatan: '' })
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Gagal menyimpan kendaraan')
    } finally { setLoading(false) }
  }

  const isPajakHampirExpired = (tgl: string | null) => {
    if (!tgl) return false
    const diff = new Date(tgl).getTime() - Date.now()
    return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000 // within 30 days
  }

  const isPajakExpired = (tgl: string | null) => {
    if (!tgl) return false
    return new Date(tgl).getTime() < Date.now()
  }

  return (
    <>
      {/* Sheet mask */}
      {showForm && <div className="sheet-mask show" onClick={() => setShowForm(false)} />}

      {/* Add form sheet */}
      <div className={`sheet${showForm ? ' show' : ''}`} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="sheet-grip" />
        <div className="sheet-h">🚗 Tambah Kendaraan</div>

        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray600)' }}>Jenis Kendaraan</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          {JENIS_OPTIONS.map(j => (
            <label key={j.val} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 10, border: `2px solid ${form.jenis === j.val ? 'var(--g500)' : 'var(--gray200)'}`, background: form.jenis === j.val ? 'var(--g50)' : 'white', cursor: 'pointer', fontFamily: 'var(--f)', fontSize: 13, fontWeight: 600 }}>
              <input type="radio" style={{ display: 'none' }} checked={form.jenis === j.val} onChange={() => setForm(p => ({ ...p, jenis: j.val }))} />
              {j.lbl}
            </label>
          ))}
        </div>

        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray600)' }}>Plat Nomor *</label>
        <input className="rl-in" placeholder="Mis. B 1234 XYZ" value={form.platNomor} onChange={e => setForm(p => ({ ...p, platNomor: e.target.value.toUpperCase() }))} style={{ textTransform: 'uppercase' }} />

        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray600)' }}>Merk / Model</label>
            <input className="rl-in" placeholder="Mis. Honda Beat" value={form.merk} onChange={e => setForm(p => ({ ...p, merk: e.target.value }))} />
          </div>
          <div style={{ flex: '0 0 100px' }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray600)' }}>Tahun</label>
            <input className="rl-in" inputMode="numeric" maxLength={4} placeholder="2020" value={form.tahun} onChange={e => setForm(p => ({ ...p, tahun: e.target.value }))} />
          </div>
        </div>

        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray600)' }}>Warna</label>
        <input className="rl-in" placeholder="Mis. Hitam" value={form.warna} onChange={e => setForm(p => ({ ...p, warna: e.target.value }))} />

        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray600)' }}>Nama Pemilik (sesuai STNK)</label>
        <input className="rl-in" placeholder="Nama sesuai STNK" value={form.namaPemilik} onChange={e => setForm(p => ({ ...p, namaPemilik: e.target.value }))} />

        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray600)' }}>No. STNK</label>
        <input className="rl-in" placeholder="Nomor STNK" value={form.noStnk} onChange={e => setForm(p => ({ ...p, noStnk: e.target.value }))} />

        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray600)' }}>Pajak Berlaku Sampai</label>
        <input className="rl-in" type="date" value={form.pajakBerlakuSampai} onChange={e => setForm(p => ({ ...p, pajakBerlakuSampai: e.target.value }))} />

        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray600)' }}>Catatan (opsional)</label>
        <input className="rl-in" placeholder="Catatan tambahan" value={form.catatan} onChange={e => setForm(p => ({ ...p, catatan: e.target.value }))} />

        {msg && <div style={{ fontSize: 12, color: 'var(--red)', padding: '8px 12px', background: 'var(--red-l)', borderRadius: 10 }}>{msg}</div>}
        <button className="btn-p" onClick={submitKendaraan} disabled={loading}>
          {loading ? 'Menyimpan…' : '💾 Simpan Kendaraan'}
        </button>
        <button className="rl-b" style={{ width: '100%', height: 44, marginTop: 8 }} onClick={() => setShowForm(false)}>Batal</button>
      </div>

      {/* Add button */}
      <button
        className="btn-p"
        style={{ marginBottom: 16 }}
        onClick={() => setShowForm(true)}
      >
        + Tambah Kendaraan
      </button>

      {localItems.length === 0 ? (
        <div className="empty">
          <div className="e-i">🚗</div>
          <div className="e-t">Belum ada kendaraan</div>
          <div className="e-d">Daftarkan kendaraan Anda untuk kelengkapan data RT.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {localItems.map(k => {
            const expired = isPajakExpired(k.pajakBerlakuSampai)
            const hampirExpired = !expired && isPajakHampirExpired(k.pajakBerlakuSampai)
            return (
              <div key={k.id} className="peng-card" style={{ padding: 0 }}>
                <div className="peng-item" style={{ cursor: 'default', padding: '14px 16px' }}>
                  <div className="pi-ico" style={{ background: 'var(--gray100)', fontSize: 22 }}>
                    {JENIS_ICO[k.jenis] || '🚗'}
                  </div>
                  <div className="pi-body">
                    <div className="pi-t" style={{ fontSize: 15, fontWeight: 800 }}>
                      {k.platNomor}
                      <span className="pill selesai" style={{ textTransform: 'capitalize' }}>{k.jenis}</span>
                    </div>
                    <div className="pi-d">
                      {[k.merk, k.tahun, k.warna].filter(Boolean).join(' · ')}
                    </div>
                    {k.namaPemilik && <div style={{ fontSize: 12, color: 'var(--gray500)', marginTop: 2 }}>A.n. {k.namaPemilik}</div>}
                    {k.pajakBerlakuSampai && (
                      <div style={{ fontSize: 12, marginTop: 4, fontWeight: 700, color: expired ? 'var(--red)' : hampirExpired ? 'var(--gold)' : 'var(--gray500)' }}>
                        {expired ? '⚠️ Pajak kedaluwarsa' : hampirExpired ? '⚠️ Pajak segera habis' : '✅ Pajak aktif'}
                        {' · '}{new Date(k.pajakBerlakuSampai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    )}
                    <div className="pi-time">Ditambahkan {timeAgo(k.createdAt)}</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
