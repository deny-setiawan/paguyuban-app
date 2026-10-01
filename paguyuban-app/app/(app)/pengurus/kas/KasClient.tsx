'use client'

import { useState } from 'react'
import { rupiah } from '@/lib/utils'

interface TransItem {
  id: string
  jenis: string
  kategori: string | null
  judul: string
  keterangan: string | null
  nominal: number
  saldoSetelah: number | null
  tanggal: string
  createdAt: string
}

const KAT_PEMASUKAN = ['iuran', 'sewa', 'donasi', 'lainnya']
const KAT_PENGELUARAN = ['operasional', 'kebersihan', 'keamanan', 'acara', 'sosial', 'lainnya']

export default function KasClient({ items, saldoKas, canEdit }: {
  items: TransItem[]
  saldoKas: number
  canEdit: boolean
}) {
  const [list, setList] = useState(items)
  const [saldo, setSaldo] = useState(saldoKas)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    jenis: 'pemasukan', kategori: '', judul: '', keterangan: '', nominal: '', tanggal: new Date().toISOString().split('T')[0]
  })

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.judul || !form.nominal || !form.tanggal) return
    setLoading(true)
    const res = await fetch('/api/transaksi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      const { item, saldoSetelah } = await res.json()
      setList(prev => [item, ...prev])
      setSaldo(saldoSetelah)
      setShowForm(false)
      setForm({ jenis: 'pemasukan', kategori: '', judul: '', keterangan: '', nominal: '', tanggal: new Date().toISOString().split('T')[0] })
    }
    setLoading(false)
  }

  const totalMasuk = list.filter(t => t.jenis === 'pemasukan').reduce((s, t) => s + t.nominal, 0)
  const totalKeluar = list.filter(t => t.jenis === 'pengeluaran').reduce((s, t) => s + t.nominal, 0)

  return (
    <>
      <div className="rl-st" style={{ marginBottom: 16 }}>
        <div>
          <b style={{ display: 'block', fontSize: 18, fontWeight: 800, color: 'var(--g700)' }}>{rupiah(saldo)}</b>
          <span>Saldo Kas</span>
        </div>
        <div>
          <b style={{ display: 'block', fontSize: 14, fontWeight: 700, color: 'var(--g700)' }}>{rupiah(totalMasuk)}</b>
          <span>Total Masuk</span>
        </div>
        <div>
          <b style={{ display: 'block', fontSize: 14, fontWeight: 700, color: 'var(--red)' }}>{rupiah(totalKeluar)}</b>
          <span>Total Keluar</span>
        </div>
      </div>

      {canEdit && (
        <button className="btn-primary" style={{ width: '100%', marginBottom: 16 }}
          onClick={() => setShowForm(true)}>
          + Catat Transaksi
        </button>
      )}

      {showForm && (
        <div className="sheet-mask show" onClick={() => setShowForm(false)}>
          <div className="sheet show" onClick={e => e.stopPropagation()} style={{ padding: '24px 20px' }}>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 16 }}>Catat Transaksi</div>
            <form onSubmit={submit}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {['pemasukan', 'pengeluaran'].map(j => (
                  <button key={j} type="button"
                    onClick={() => setForm(f => ({ ...f, jenis: j, kategori: '' }))}
                    style={{
                      flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13,
                      background: form.jenis === j ? (j === 'pemasukan' ? 'var(--g600)' : 'var(--red)') : 'var(--gray100)',
                      color: form.jenis === j ? 'white' : 'var(--gray700)',
                    }}>
                    {j === 'pemasukan' ? '⬆️ Pemasukan' : '⬇️ Pengeluaran'}
                  </button>
                ))}
              </div>
              <select className="inp" value={form.kategori} onChange={e => setForm(f => ({ ...f, kategori: e.target.value }))}>
                <option value="">Kategori...</option>
                {(form.jenis === 'pemasukan' ? KAT_PEMASUKAN : KAT_PENGELUARAN).map(k => (
                  <option key={k} value={k} style={{ textTransform: 'capitalize' }}>{k}</option>
                ))}
              </select>
              <input className="inp" required value={form.judul} onChange={e => setForm(f => ({ ...f, judul: e.target.value }))} placeholder="Keterangan singkat..." />
              <input className="inp" type="number" required min={1} value={form.nominal} onChange={e => setForm(f => ({ ...f, nominal: e.target.value }))} placeholder="Nominal (Rp)" />
              <input className="inp" type="date" required value={form.tanggal} onChange={e => setForm(f => ({ ...f, tanggal: e.target.value }))} />
              <textarea className="inp" rows={2} value={form.keterangan} onChange={e => setForm(f => ({ ...f, keterangan: e.target.value }))} placeholder="Catatan tambahan (opsional)..." style={{ resize: 'vertical' }} />
              <button className="btn-primary" type="submit" style={{ width: '100%', marginTop: 8 }} disabled={loading}>
                {loading ? 'Menyimpan...' : 'Simpan'}
              </button>
            </form>
          </div>
        </div>
      )}

      {list.length === 0 ? (
        <div className="empty">
          <div className="e-i">💰</div>
          <div className="e-t">Belum ada transaksi</div>
          <div className="e-d">Catat pemasukan dan pengeluaran kas RT di sini</div>
        </div>
      ) : (
        <div className="peng-card">
          {list.map(t => (
            <div key={t.id} className="peng-item" style={{ cursor: 'default' }}>
              <div className="pi-ico" style={{ background: t.jenis === 'pemasukan' ? 'var(--g50)' : 'var(--red-l)' }}>
                {t.jenis === 'pemasukan' ? '⬆️' : '⬇️'}
              </div>
              <div className="pi-body">
                <div className="pi-t">
                  {t.judul}
                  {t.kategori && <span className="pill" style={{ background: 'var(--gray100)', color: 'var(--gray700)', textTransform: 'capitalize' }}>{t.kategori}</span>}
                </div>
                <div className="pi-d" style={{ fontWeight: 700, color: t.jenis === 'pemasukan' ? 'var(--g700)' : 'var(--red)' }}>
                  {t.jenis === 'pemasukan' ? '+' : '-'}{rupiah(t.nominal)}
                </div>
                {t.saldoSetelah !== null && <div className="pi-d">Saldo: {rupiah(t.saldoSetelah)}</div>}
                <div className="pi-time">{t.tanggal}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
