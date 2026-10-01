'use client'

import { useState } from 'react'
import { timeAgo } from '@/lib/utils'

interface LaporanItem {
  id: string
  kategori: string
  judul: string
  isi: string | null
  status: string
  tanggapan: string | null
  namaPelapor: string
  createdAt: string
}

const KAT_ICO: Record<string, string> = {
  infrastruktur: '🔧', keamanan: '🔒', kebersihan: '🧹',
  sosial: '🤝', keuangan: '💰', lainnya: '📋',
}
const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  menunggu: { bg: 'var(--gold-l)', color: 'var(--gold)', label: 'Menunggu' },
  diproses: { bg: 'var(--blue-l)', color: 'var(--blue)', label: 'Diproses' },
  selesai: { bg: 'var(--g50)', color: 'var(--g700)', label: 'Selesai' },
  ditolak: { bg: 'var(--red-l)', color: 'var(--red)', label: 'Ditolak' },
}

export default function LaporanMasukClient({ items }: { items: LaporanItem[] }) {
  const [list, setList] = useState(items)
  const [detail, setDetail] = useState<LaporanItem | null>(null)
  const [tanggapan, setTanggapan] = useState('')
  const [loading, setLoading] = useState(false)

  async function respond(id: string, status: string) {
    setLoading(true)
    const res = await fetch(`/api/laporan/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tanggapan, status }),
    })
    if (res.ok) {
      setList(prev => prev.map(l => l.id === id ? { ...l, status, tanggapan } : l))
      setDetail(null)
      setTanggapan('')
    }
    setLoading(false)
  }

  if (list.length === 0) {
    return (
      <div className="empty">
        <div className="e-i">📝</div>
        <div className="e-t">Tidak ada laporan masuk</div>
        <div className="e-d">Laporan dari warga akan muncul di sini</div>
      </div>
    )
  }

  return (
    <>
      {detail && (
        <div className="sheet-mask show" onClick={() => { setDetail(null); setTanggapan('') }}>
          <div className="sheet show" onClick={e => e.stopPropagation()} style={{ padding: '24px 20px' }}>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 16 }}>Tanggapi Laporan</div>
            <div className="kv-row"><span>Kategori</span><b style={{ textTransform: 'capitalize' }}>{detail.kategori}</b></div>
            <div className="kv-row"><span>Pelapor</span><b>{detail.namaPelapor}</b></div>
            <div className="kv-row"><span>Judul</span><b>{detail.judul}</b></div>
            {detail.isi && <div style={{ background: 'var(--gray50)', borderRadius: 8, padding: '10px 12px', marginBottom: 12, fontSize: 13, color: 'var(--gray700)' }}>{detail.isi}</div>}
            <div style={{ marginTop: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray600)', display: 'block', marginBottom: 4 }}>Tanggapan</label>
              <textarea className="inp" rows={3} value={tanggapan} onChange={e => setTanggapan(e.target.value)}
                placeholder="Tulis tanggapan pengurus..." style={{ resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="btn-primary" style={{ flex: 1 }} disabled={loading || !tanggapan.trim()}
                onClick={() => respond(detail.id, 'diproses')}>
                {loading ? '...' : '📋 Tandai Diproses'}
              </button>
              <button className="btn-primary" style={{ flex: 1 }} disabled={loading}
                onClick={() => respond(detail.id, 'selesai')}>
                {loading ? '...' : '✅ Selesaikan'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="peng-card">
        {list.map(item => {
          const st = STATUS_STYLE[item.status] || STATUS_STYLE.menunggu
          const ico = KAT_ICO[item.kategori] || '📋'
          return (
            <div key={item.id} className="peng-item" style={{ cursor: 'pointer' }} onClick={() => { setDetail(item); setTanggapan(item.tanggapan || '') }}>
              <div className="pi-ico" style={{ background: st.bg }}>{ico}</div>
              <div className="pi-body">
                <div className="pi-t">
                  {item.judul}
                  <span className="pill" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                </div>
                <div className="pi-d">{item.namaPelapor} · <span style={{ textTransform: 'capitalize' }}>{item.kategori}</span></div>
                {item.tanggapan && <div className="pi-d" style={{ color: 'var(--g600)' }}>↩ {item.tanggapan}</div>}
                <div className="pi-time">{timeAgo(item.createdAt)}</div>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
