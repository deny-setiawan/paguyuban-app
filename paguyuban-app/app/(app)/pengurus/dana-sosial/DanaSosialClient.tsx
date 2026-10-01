'use client'

import { useState } from 'react'
import { rupiah } from '@/lib/utils'

interface DanaSosialItem {
  id: string
  nama: string
  noRumah: string | null
  statusSosial: string | null
  dansosKelahiranTerpakai: number
  dansosSakitTerpakai: number
}

const BATAS_KELAHIRAN = 1
const BATAS_SAKIT = 2

export default function DanaSosialClient({ items, alokasiSosial }: { items: DanaSosialItem[], alokasiSosial: number }) {
  const [list, setList] = useState(items)
  const [search, setSearch] = useState('')
  const [detail, setDetail] = useState<DanaSosialItem | null>(null)
  const [loading, setLoading] = useState(false)
  const [jenis, setJenis] = useState<'kelahiran' | 'sakit'>('kelahiran')

  async function recordUsage(id: string) {
    setLoading(true)
    const field = jenis === 'kelahiran' ? 'dansosKelahiranTerpakai' : 'dansosSakitTerpakai'
    const item = list.find(i => i.id === id)
    if (!item) { setLoading(false); return }

    const current = item[field]
    const batas = jenis === 'kelahiran' ? BATAS_KELAHIRAN : BATAS_SAKIT
    if (current >= batas) {
      alert(`Kuota ${jenis} untuk warga ini sudah habis (${batas}x)`)
      setLoading(false)
      return
    }

    const res = await fetch(`/api/warga/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: current + 1 }),
    })
    if (res.ok) {
      setList(prev => prev.map(w => w.id === id ? { ...w, [field]: current + 1 } : w))
      setDetail(null)
    }
    setLoading(false)
  }

  const filtered = list.filter(w =>
    w.nama.toLowerCase().includes(search.toLowerCase()) ||
    (w.noRumah || '').includes(search)
  )

  const totalKelahiran = list.reduce((s, w) => s + w.dansosKelahiranTerpakai, 0)
  const totalSakit = list.reduce((s, w) => s + w.dansosSakitTerpakai, 0)

  return (
    <>
      <div className="rl-st" style={{ marginBottom: 16 }}>
        <div>
          <b style={{ display: 'block', fontSize: 14, fontWeight: 800, color: 'var(--g700)' }}>{rupiah(alokasiSosial)}</b>
          <span>Alokasi/KK/bln</span>
        </div>
        <div>
          <b style={{ display: 'block', fontSize: 14, fontWeight: 700, color: 'var(--blue)' }}>{totalKelahiran}x</b>
          <span>Dansos Kelahiran</span>
        </div>
        <div>
          <b style={{ display: 'block', fontSize: 14, fontWeight: 700, color: 'var(--orange)' }}>{totalSakit}x</b>
          <span>Dansos Sakit</span>
        </div>
      </div>

      {detail && (
        <div className="sheet-mask show" onClick={() => setDetail(null)}>
          <div className="sheet show" onClick={e => e.stopPropagation()} style={{ padding: '24px 20px' }}>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>{detail.nama}</div>
            <div style={{ fontSize: 12, color: 'var(--gray500)', marginBottom: 16 }}>No. {detail.noRumah || '-'}</div>
            <div className="kv-row"><span>Dansos Kelahiran</span><b>{detail.dansosKelahiranTerpakai}/{BATAS_KELAHIRAN}x terpakai</b></div>
            <div className="kv-row"><span>Dansos Sakit</span><b>{detail.dansosSakitTerpakai}/{BATAS_SAKIT}x terpakai</b></div>
            <div style={{ marginTop: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray600)', display: 'block', marginBottom: 6 }}>Catat penggunaan dansos:</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {(['kelahiran', 'sakit'] as const).map(j => (
                  <button key={j} type="button"
                    onClick={() => setJenis(j)}
                    style={{
                      flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13,
                      background: jenis === j ? 'var(--g600)' : 'var(--gray100)',
                      color: jenis === j ? 'white' : 'var(--gray700)',
                      textTransform: 'capitalize',
                    }}>
                    {j === 'kelahiran' ? '👶 Kelahiran' : '🏥 Sakit'}
                  </button>
                ))}
              </div>
              <button className="btn-primary" style={{ width: '100%' }} disabled={loading} onClick={() => recordUsage(detail.id)}>
                {loading ? '...' : `Catat Penggunaan Dansos ${jenis === 'kelahiran' ? 'Kelahiran' : 'Sakit'}`}
              </button>
            </div>
          </div>
        </div>
      )}

      <input className="inp" value={search} onChange={e => setSearch(e.target.value)}
        placeholder="🔍 Cari nama atau no. rumah..." style={{ marginBottom: 16 }} />

      {filtered.length === 0 ? (
        <div className="empty"><div className="e-i">🤝</div><div className="e-t">Belum ada data warga</div></div>
      ) : (
        <div className="peng-card">
          {filtered.map(w => (
            <div key={w.id} className="peng-item" style={{ cursor: 'pointer' }} onClick={() => setDetail(w)}>
              <div className="pi-ico" style={{ background: 'var(--teal-l)' }}>🤝</div>
              <div className="pi-body">
                <div className="pi-t">{w.nama}</div>
                <div className="pi-d">No. {w.noRumah || '-'}</div>
                <div className="pi-d" style={{ display: 'flex', gap: 12, marginTop: 2 }}>
                  <span style={{ color: w.dansosKelahiranTerpakai >= BATAS_KELAHIRAN ? 'var(--red)' : 'var(--gray600)' }}>
                    👶 {w.dansosKelahiranTerpakai}/{BATAS_KELAHIRAN}
                  </span>
                  <span style={{ color: w.dansosSakitTerpakai >= BATAS_SAKIT ? 'var(--red)' : 'var(--gray600)' }}>
                    🏥 {w.dansosSakitTerpakai}/{BATAS_SAKIT}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
