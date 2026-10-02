'use client'

import { useState } from 'react'
import { timeAgo } from '@/lib/utils'
import { Users, User, CheckCircle, XCircle, FileText, ExternalLink } from 'lucide-react'

interface InviteItem {
  id: string
  nama: string
  noRumah: string | null
  status: string
  jenis: string
  dataKk: Record<string, string> | null
  anggota: Array<Record<string, string>> | null
  fotoFiles: string[] | null
  createdAt: string
}

const STATUS_STYLE: Record<string, { label: string; bg: string; color: string }> = {
  pending: { label: 'Menunggu', bg: 'var(--gold-l)', color: 'var(--gold)' },
  disetujui: { label: 'Disetujui', bg: 'var(--g50)', color: 'var(--g700)' },
  ditolak: { label: 'Ditolak', bg: 'var(--red-l)', color: 'var(--red)' },
}

const KK_FIELD_LABEL: Record<string, string> = {
  nama: 'Nama', phone: 'No. HP', noRumah: 'No. Rumah', jk: 'Jenis Kelamin',
  agama: 'Agama', kawin: 'Status Perkawinan', hunian: 'Status Hunian',
  tgl: 'Mulai Menempati',
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
          <div className="sheet show" onClick={e => e.stopPropagation()} style={{ padding: '24px 20px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>
              {detail.nama}
              <span className="pill" style={{
                marginLeft: 8,
                background: STATUS_STYLE[detail.status]?.bg || 'var(--gray100)',
                color: STATUS_STYLE[detail.status]?.color || 'var(--gray600)',
              }}>
                {STATUS_STYLE[detail.status]?.label || detail.status}
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--gray500)', marginBottom: 16 }}>
              No. {detail.noRumah || '-'} · {detail.jenis === 'pemutakhiran' ? 'Pemutakhiran Data' : 'Warga Baru'}
            </div>

            {/* Data Kepala KK */}
            {detail.dataKk && Object.keys(detail.dataKk).length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--gray500)', marginBottom: 6, letterSpacing: 0.5 }}>DATA KEPALA KK</div>
                <div style={{ background: 'var(--gray50)', borderRadius: 10, padding: '8px 4px', marginBottom: 14 }}>
                  {Object.entries(detail.dataKk)
                    .filter(([k, v]) => k !== 'jk' && v)
                    .map(([k, v]) => (
                      <div className="kv" key={k}>
                        <span className="k">{KK_FIELD_LABEL[k] || k}</span>
                        <span className="v">{v || '—'}</span>
                      </div>
                    ))}
                  {detail.dataKk.jk && (
                    <div className="kv" style={{ borderBottom: 'none' }}>
                      <span className="k">Jenis Kelamin</span>
                      <span className="v">{detail.dataKk.jk === 'L' ? 'Laki-laki' : 'Perempuan'}</span>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Anggota */}
            {detail.anggota && detail.anggota.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--gray500)', marginBottom: 6, letterSpacing: 0.5 }}>
                  ANGGOTA KELUARGA ({detail.anggota.length})
                </div>
                {detail.anggota.map((a, i) => (
                  <div key={i} style={{ background: 'var(--gray50)', borderRadius: 8, padding: '8px 12px', marginBottom: 6 }}>
                    <b style={{ fontSize: 13 }}>{a.nama}</b>
                    <span style={{ color: 'var(--gray500)', fontSize: 12, marginLeft: 8 }}>{a.hub || a.hubungan}</span>
                    {a.agama && <span style={{ color: 'var(--gray400)', fontSize: 12, marginLeft: 6 }}>· {a.agama}</span>}
                    {a.jk && <span style={{ color: 'var(--gray400)', fontSize: 12, marginLeft: 6 }}>· {a.jk === 'L' ? 'L' : 'P'}</span>}
                  </div>
                ))}
              </>
            )}

            {/* Foto Dokumen */}
            {detail.fotoFiles && detail.fotoFiles.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--gray500)', marginTop: 8, marginBottom: 8, letterSpacing: 0.5 }}>
                  DOKUMEN LAMPIRAN ({detail.fotoFiles.length} file)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
                  {detail.fotoFiles.map((url, i) => {
                    const isImage = /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(url)
                    return (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'block', borderRadius: 8, overflow: 'hidden', aspectRatio: '1', background: 'var(--gray100)', textDecoration: 'none', position: 'relative' }}>
                        {isImage ? (
                          <img src={url} alt={`Dok ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                            <FileText size={24} color="var(--gray400)" />
                            <span style={{ fontSize: 9, color: 'var(--gray500)' }}>Dok {i + 1}</span>
                          </div>
                        )}
                        <div style={{ position: 'absolute', bottom: 4, right: 4, background: 'rgba(0,0,0,.4)', borderRadius: 6, padding: '2px 4px' }}>
                          <ExternalLink size={10} color="white" />
                        </div>
                      </a>
                    )
                  })}
                </div>
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
                  <div className="pi-t">
                    {item.nama}
                    <span className="pill menunggu">Pending</span>
                    {item.jenis === 'pemutakhiran' && <span className="pill" style={{ background: 'var(--blue-l)', color: 'var(--blue)' }}>Pemutakhiran</span>}
                  </div>
                  <div className="pi-d">
                    No. {item.noRumah || '-'} · {item.anggota?.length ? `${item.anggota.length + 1} jiwa` : '1 jiwa'}
                    {item.fotoFiles && item.fotoFiles.length > 0 && ` · ${item.fotoFiles.length} foto`}
                  </div>
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
