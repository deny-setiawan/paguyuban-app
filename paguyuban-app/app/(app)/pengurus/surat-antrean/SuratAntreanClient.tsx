'use client'

import { useState } from 'react'
import { timeAgo } from '@/lib/utils'

interface SuratItem {
  id: string
  jenis: string
  keperluan: string | null
  namaPemohon: string
  noRumah: string
  status: string
  nomorSurat: string | null
  dataTambahan: Record<string, string> | null
  createdAt: string
}

const JENIS_LABEL: Record<string, string> = {
  pengantar: 'Surat Pengantar',
  domisili: 'Surat Domisili',
  tidak_mampu: 'Surat Tidak Mampu',
  usaha: 'Surat Keterangan Usaha',
}

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  diajukan: { bg: 'var(--gold-l)', color: 'var(--gold)', label: 'Diajukan' },
  diproses: { bg: 'var(--blue-l)', color: 'var(--blue)', label: 'Diproses' },
  selesai: { bg: 'var(--g50)', color: 'var(--g700)', label: 'Selesai' },
  ditolak: { bg: 'var(--red-l)', color: 'var(--red)', label: 'Ditolak' },
}

export default function SuratAntreanClient({ items }: { items: SuratItem[] }) {
  const [list, setList] = useState(items)
  const [detail, setDetail] = useState<SuratItem | null>(null)
  const [loading, setLoading] = useState(false)
  const [nomorSurat, setNomorSurat] = useState('')

  async function updateStatus(id: string, status: string, nomor?: string) {
    setLoading(true)
    const res = await fetch(`/api/surat/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, nomorSurat: nomor || undefined }),
    })
    if (res.ok) {
      setList(prev => prev.map(s => s.id === id ? { ...s, status, nomorSurat: nomor || s.nomorSurat } : s))
      setDetail(null)
      setNomorSurat('')
    }
    setLoading(false)
  }

  if (list.length === 0) {
    return (
      <div className="empty">
        <div className="e-i">✉️</div>
        <div className="e-t">Tidak ada antrian surat</div>
        <div className="e-d">Pengajuan surat dari warga akan muncul di sini</div>
      </div>
    )
  }

  return (
    <>
      {detail && (
        <div className="sheet-mask show" onClick={() => { setDetail(null); setNomorSurat('') }}>
          <div className="sheet show" onClick={e => e.stopPropagation()} style={{ padding: '24px 20px' }}>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 16 }}>Proses Surat</div>
            <div className="kv-row"><span>Jenis</span><b>{JENIS_LABEL[detail.jenis] || detail.jenis}</b></div>
            <div className="kv-row"><span>Pemohon</span><b>{detail.namaPemohon}</b></div>
            <div className="kv-row"><span>No. Rumah</span><b>{detail.noRumah}</b></div>
            <div className="kv-row"><span>Keperluan</span><b>{detail.keperluan || '-'}</b></div>
            {detail.dataTambahan && Object.entries(detail.dataTambahan).map(([k, v]) => (
              <div className="kv-row" key={k}><span style={{ textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</span><b>{v}</b></div>
            ))}
            <div style={{ marginTop: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray600)', display: 'block', marginBottom: 4 }}>
                Nomor Surat (opsional)
              </label>
              <input className="inp" value={nomorSurat} onChange={e => setNomorSurat(e.target.value)}
                placeholder="Contoh: 001/RT.01/I/2025" />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              {detail.status === 'diajukan' && (
                <button className="btn-primary" style={{ flex: 1 }} disabled={loading}
                  onClick={() => updateStatus(detail.id, 'diproses', nomorSurat || undefined)}>
                  {loading ? '...' : '📋 Proses'}
                </button>
              )}
              <button className="btn-primary" style={{ flex: 1 }} disabled={loading}
                onClick={() => updateStatus(detail.id, 'selesai', nomorSurat || undefined)}>
                {loading ? '...' : '✅ Selesaikan'}
              </button>
              <button className="btn-ghost" style={{ color: 'var(--red)' }} disabled={loading}
                onClick={() => updateStatus(detail.id, 'ditolak')}>
                Tolak
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="peng-card">
        {list.map(item => {
          const st = STATUS_STYLE[item.status] || STATUS_STYLE.diajukan
          return (
            <div key={item.id} className="peng-item" style={{ cursor: 'pointer' }} onClick={() => setDetail(item)}>
              <div className="pi-ico" style={{ background: st.bg }}>✉️</div>
              <div className="pi-body">
                <div className="pi-t">
                  {JENIS_LABEL[item.jenis] || item.jenis}
                  <span className="pill" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                </div>
                <div className="pi-d">{item.namaPemohon} · No. {item.noRumah}</div>
                {item.nomorSurat && <div className="pi-d" style={{ color: 'var(--g600)' }}>No: {item.nomorSurat}</div>}
                <div className="pi-time">{timeAgo(item.createdAt)}</div>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
