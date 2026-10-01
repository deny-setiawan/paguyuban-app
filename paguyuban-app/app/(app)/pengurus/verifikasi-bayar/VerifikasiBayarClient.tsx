'use client'

import { useState } from 'react'
import { rupiah, timeAgo } from '@/lib/utils'

interface PaymentItem {
  id: string
  nama: string
  noRumah: string
  nominal: number
  metode: string
  buktiUrl: string | null
  periode: string
  createdAt: string
}

export default function VerifikasiBayarClient({ items }: { items: PaymentItem[] }) {
  const [list, setList] = useState(items)
  const [detail, setDetail] = useState<PaymentItem | null>(null)
  const [catatan, setCatatan] = useState('')
  const [loading, setLoading] = useState<string | null>(null)

  async function handleAction(id: string, action: 'approve' | 'reject') {
    setLoading(id + action)
    const res = await fetch('/api/iuran/verifikasi', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action, catatan }),
    })
    if (res.ok) {
      setList(prev => prev.filter(p => p.id !== id))
      setDetail(null)
      setCatatan('')
    }
    setLoading(null)
  }

  if (list.length === 0) {
    return (
      <div className="empty">
        <div className="e-i">💳</div>
        <div className="e-t">Tidak ada pembayaran menunggu</div>
        <div className="e-d">Pembayaran transfer yang perlu diverifikasi akan muncul di sini</div>
      </div>
    )
  }

  return (
    <>
      {detail && (
        <div className="sheet-mask show" onClick={() => { setDetail(null); setCatatan('') }}>
          <div className="sheet show" onClick={e => e.stopPropagation()} style={{ padding: '24px 20px' }}>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 16 }}>Verifikasi Pembayaran</div>
            <div className="kv-row"><span>Warga</span><b>{detail.nama}</b></div>
            <div className="kv-row"><span>No. Rumah</span><b>{detail.noRumah}</b></div>
            <div className="kv-row"><span>Periode</span><b>{detail.periode}</b></div>
            <div className="kv-row"><span>Nominal</span><b style={{ color: 'var(--g700)' }}>{rupiah(detail.nominal)}</b></div>
            <div className="kv-row"><span>Metode</span><b style={{ textTransform: 'capitalize' }}>{detail.metode}</b></div>
            {detail.buktiUrl && (
              <div style={{ marginBottom: 12 }}>
                <a href={detail.buktiUrl} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 13, color: 'var(--g600)', fontWeight: 700, textDecoration: 'none' }}>
                  📎 Lihat Bukti Transfer ↗
                </a>
              </div>
            )}
            <div style={{ marginTop: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray600)', display: 'block', marginBottom: 4 }}>Catatan (opsional)</label>
              <input className="inp" value={catatan} onChange={e => setCatatan(e.target.value)} placeholder="Catatan untuk warga..." />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button className="btn-primary" style={{ flex: 1 }}
                disabled={!!loading} onClick={() => handleAction(detail.id, 'approve')}>
                {loading === detail.id + 'approve' ? '...' : '✅ Setujui'}
              </button>
              <button className="btn-ghost" style={{ flex: 1, color: 'var(--red)' }}
                disabled={!!loading} onClick={() => handleAction(detail.id, 'reject')}>
                {loading === detail.id + 'reject' ? '...' : '❌ Tolak'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="peng-card">
        {list.map(item => (
          <div key={item.id} className="peng-item" style={{ cursor: 'pointer' }} onClick={() => setDetail(item)}>
            <div className="pi-ico" style={{ background: 'var(--g50)' }}>💳</div>
            <div className="pi-body">
              <div className="pi-t">{item.nama} <span className="pill menunggu">Pending</span></div>
              <div className="pi-d">{item.periode} · {rupiah(item.nominal)}</div>
              <div className="pi-d" style={{ textTransform: 'capitalize' }}>via {item.metode}</div>
              <div className="pi-time">{timeAgo(item.createdAt)}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
