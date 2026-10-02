'use client'

import { useState } from 'react'
import { timeAgo } from '@/lib/utils'
import { Users, User, CheckCircle, XCircle } from 'lucide-react'

interface InviteItem {
  id: string
  nama: string
  noRumah: string | null
  status: string
  jenis: string
  dataKk: Record<string, string> | null
  anggota: Array<Record<string, string>> | null
  createdAt: string
}

const STATUS_STYLE: Record<string, { label: string; bg: string; color: string }> = {
  pending: { label: 'Menunggu', bg: 'var(--gold-l)', color: 'var(--gold)' },
  disetujui: { label: 'Disetujui', bg: 'var(--g50)', color: 'var(--g700)' },
  ditolak: { label: 'Ditolak', bg: 'var(--red-l)', color: 'var(--red)' },
}

export default function VerifikasiClient({ items, canApprove }: { items: InviteItem[], canApprove: boolean }) {
  const [list, setList] = useState(items)
  const [loading, setLoading] = useState<string | null>(null)
  const [detail, setDetail] = useState<InviteItem | null>(null)

  async function handleAction(id: string, action: 'approve' | 'reject') {
    setLoading(id + action)
    const res = await fetch('/api/warga-invite', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action }),
    })
    if (res.ok) {
      setList(prev => prev.map(i => i.id === id
        ? { ...i, status: action === 'approve' ? 'disetujui' : 'ditolak' }
        : i
      ))
      setDetail(null)
    }
    setLoading(null)
  }

  const pending = list.filter(i => i.status === 'pending')
  const done = list.filter(i => i.status !== 'pending')

  if (list.length === 0) {
    return (
      <div className="empty">
        <div className="e-i" style={{ display: 'flex', justifyContent: 'center' }}><Users size={38} color="var(--gray400)" /></div>
        <div className="e-t">Belum ada pendaftaran</div>
        <div className="e-d">Pendaftaran warga baru akan muncul di sini</div>
      </div>
    )
  }

  return (
    <>
      {detail && (
        <div className="sheet-mask show" onClick={() => setDetail(null)}>
          <div className="sheet show" onClick={e => e.stopPropagation()} style={{ padding: '24px 20px' }}>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 16 }}>Detail Pendaftaran</div>
            <div className="kv-row"><span>Nama</span><b>{detail.nama}</b></div>
            <div className="kv-row"><span>No. Rumah</span><b>{detail.noRumah || '-'}</b></div>
            {detail.dataKk && Object.entries(detail.dataKk).map(([k, v]) => (
              <div className="kv-row" key={k}><span style={{ textTransform: 'capitalize' }}>{k}</span><b>{v || '-'}</b></div>
            ))}
            {detail.anggota && detail.anggota.length > 0 && (
              <>
                <div style={{ fontWeight: 700, marginTop: 12, marginBottom: 6, color: 'var(--gray600)', fontSize: 12 }}>
                  ANGGOTA KELUARGA ({detail.anggota.length})
                </div>
                {detail.anggota.map((a, i) => (
                  <div key={i} style={{ background: 'var(--gray50)', borderRadius: 8, padding: '8px 12px', marginBottom: 6 }}>
                    <b>{a.nama}</b><span style={{ color: 'var(--gray500)', fontSize: 12, marginLeft: 8 }}>{a.hubungan}</span>
                  </div>
                ))}
              </>
            )}
            {canApprove && detail.status === 'pending' && (
              <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                <button className="btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  disabled={!!loading}
                  onClick={() => handleAction(detail.id, 'approve')}>
                  {loading === detail.id + 'approve' ? '...' : <><CheckCircle size={14} /> Setujui</>}
                </button>
                <button className="btn-ghost" style={{ flex: 1, color: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  disabled={!!loading}
                  onClick={() => handleAction(detail.id, 'reject')}>
                  {loading === detail.id + 'reject' ? '...' : <><XCircle size={14} /> Tolak</>}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {pending.length > 0 && (
        <>
          <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--gray600)', marginBottom: 8 }}>
            MENUNGGU VERIFIKASI ({pending.length})
          </div>
          <div className="peng-card" style={{ marginBottom: 16 }}>
            {pending.map(item => (
              <div key={item.id} className="peng-item" style={{ cursor: 'pointer' }} onClick={() => setDetail(item)}>
                <div className="pi-ico" style={{ background: 'var(--gold-l)' }}><User size={18} color="var(--gold)" /></div>
                <div className="pi-body">
                  <div className="pi-t">{item.nama} <span className="pill menunggu">Pending</span></div>
                  <div className="pi-d">No. {item.noRumah || '-'} · {item.anggota?.length ? `${item.anggota.length + 1} jiwa` : '1 jiwa'}</div>
                  <div className="pi-time">{timeAgo(item.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {done.length > 0 && (
        <>
          <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--gray600)', marginBottom: 8 }}>RIWAYAT</div>
          <div className="peng-card">
            {done.map(item => {
              const st = STATUS_STYLE[item.status] || STATUS_STYLE.pending
              return (
                <div key={item.id} className="peng-item" style={{ cursor: 'pointer', opacity: 0.75 }} onClick={() => setDetail(item)}>
                  <div className="pi-ico" style={{ background: st.bg }}><User size={18} color={st.color} /></div>
                  <div className="pi-body">
                    <div className="pi-t">{item.nama} <span className="pill" style={{ background: st.bg, color: st.color }}>{st.label}</span></div>
                    <div className="pi-d">No. {item.noRumah || '-'}</div>
                    <div className="pi-time">{timeAgo(item.createdAt)}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </>
  )
}
