'use client'

import { useState } from 'react'
import { timeAgo } from '@/lib/utils'
import { FileText, Send, MessageSquare, CheckCircle } from 'lucide-react'

interface LaporanItem {
  id: string
  kategori: string
  judul: string
  isi: string | null
  status: string
  tanggapan: string | null
  createdAt: string
}

interface Props {
  laporan: LaporanItem[]
}

const KATEGORI_OPTIONS = [
  { val: 'infrastruktur', lbl: 'Infrastruktur', desc: 'Jalan, selokan, fasilitas umum' },
  { val: 'keamanan', lbl: 'Keamanan', desc: 'Laporan gangguan keamanan' },
  { val: 'kebersihan', lbl: 'Kebersihan', desc: 'Sampah, kebersihan lingkungan' },
  { val: 'sosial', lbl: 'Sosial', desc: 'Permasalahan sosial warga' },
  { val: 'keuangan', lbl: 'Keuangan', desc: 'Pertanyaan terkait kas RT' },
  { val: 'lainnya', lbl: 'Lainnya', desc: 'Topik lain' },
]

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  menunggu: { label: 'Menunggu', cls: 'menunggu' },
  diproses: { label: 'Diproses', cls: 'belum' },
  selesai: { label: 'Selesai', cls: 'lunas' },
  ditolak: { label: 'Ditolak', cls: 'ditolak' },
}

export default function LaporanClient({ laporan }: Props) {
  const [tab, setTab] = useState<'baru' | 'riwayat'>('riwayat')
  const [kategori, setKategori] = useState('')
  const [judul, setJudul] = useState('')
  const [isi, setIsi] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [localLaporan, setLocalLaporan] = useState(laporan)

  async function submitLaporan() {
    if (!kategori) { setMsg('Pilih kategori laporan'); return }
    if (!judul.trim()) { setMsg('Judul wajib diisi'); return }
    if (!isi.trim()) { setMsg('Isi laporan wajib diisi'); return }
    setLoading(true); setMsg('')
    try {
      const res = await fetch('/api/laporan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kategori, judul, isi }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setLocalLaporan(prev => [data.laporan, ...prev])
      setKategori(''); setJudul(''); setIsi('')
      setTab('riwayat')
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Gagal mengirim laporan')
    } finally { setLoading(false) }
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 8, background: 'var(--gray100)', borderRadius: 14, padding: 4, marginBottom: 16 }}>
        {(['riwayat', 'baru'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, height: 38, border: 'none', borderRadius: 11,
            background: tab === t ? 'var(--white)' : 'transparent',
            color: tab === t ? 'var(--g700)' : 'var(--gray500)',
            fontFamily: 'var(--f)', fontSize: 13, fontWeight: 700,
            boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
            cursor: 'pointer',
          }}>
            {t === 'riwayat' ? `Riwayat${localLaporan.length ? ` (${localLaporan.length})` : ''}` : '+ Buat Laporan'}
          </button>
        ))}
      </div>

      {tab === 'riwayat' && (
        localLaporan.length === 0 ? (
          <div className="empty">
            <div className="e-i" style={{ display: 'flex', justifyContent: 'center' }}><FileText size={38} color="var(--gray400)" /></div>
            <div className="e-t">Belum ada laporan</div>
            <div className="e-d">Laporkan masalah di lingkungan RT agar ditindaklanjuti pengurus.</div>
            <button className="btn-p" style={{ marginTop: 12 }} onClick={() => setTab('baru')}>+ Buat Laporan Baru</button>
          </div>
        ) : (
          <div className="peng-card">
            {localLaporan.map(l => {
              const st = STATUS_MAP[l.status] || { label: l.status, cls: '' }
              return (
                <div key={l.id} className="peng-item" style={{ cursor: 'default' }}>
                  <div className="pi-ico" style={{ background: 'var(--purple-l)' }}><FileText size={18} color="var(--purple)" /></div>
                  <div className="pi-body">
                    <div className="pi-t">
                      {l.judul}
                      <span className={`pill ${st.cls}`}>{st.label}</span>
                    </div>
                    <div className="pi-d" style={{ textTransform: 'capitalize' }}>{l.kategori}</div>
                    {l.isi && <div className="pi-d" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{l.isi}</div>}
                    {l.tanggapan && (
                      <div className="ib green" style={{ marginTop: 8, fontSize: 12 }}>
                        <MessageSquare size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                        <div><b>Tanggapan pengurus:</b> {l.tanggapan}</div>
                      </div>
                    )}
                    <div className="pi-time">{timeAgo(l.createdAt)}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {tab === 'baru' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="sec-h" style={{ marginBottom: 4 }}>
            <div className="t"><FileText size={16} /> Buat Laporan Baru</div>
          </div>

          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray600)' }}>Kategori Laporan *</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {KATEGORI_OPTIONS.map(k => (
              <label key={k.val} style={{
                display: 'flex', flexDirection: 'column', gap: 3, padding: '10px 12px',
                borderRadius: 12, border: `2px solid ${kategori === k.val ? 'var(--g500)' : 'var(--gray200)'}`,
                background: kategori === k.val ? 'var(--g50)' : 'white', cursor: 'pointer',
              }}>
                <input type="radio" style={{ display: 'none' }} checked={kategori === k.val} onChange={() => setKategori(k.val)} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray800)' }}>{k.lbl}</div>
                  {kategori === k.val && <CheckCircle size={14} color="var(--g500)" />}
                </div>
                <div style={{ fontSize: 11, color: 'var(--gray500)', lineHeight: 1.3 }}>{k.desc}</div>
              </label>
            ))}
          </div>

          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray600)' }}>Judul Laporan *</label>
          <input className="rl-in" placeholder="Ringkasan singkat masalah" value={judul} onChange={e => setJudul(e.target.value)} />

          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray600)' }}>Isi Laporan *</label>
          <textarea
            className="rl-in" rows={5} placeholder="Jelaskan masalah secara detail: lokasi, waktu kejadian, dll..."
            value={isi} onChange={e => setIsi(e.target.value)} style={{ resize: 'none', minHeight: 120 }}
          />

          {msg && <div style={{ fontSize: 12, color: 'var(--red)', padding: '8px 12px', background: 'var(--red-l)', borderRadius: 10 }}>{msg}</div>}

          <button className="btn-p" onClick={submitLaporan} disabled={loading}>
            {loading ? 'Mengirim…' : <><Send size={16} /> Kirim Laporan</>}
          </button>
        </div>
      )}
    </>
  )
}
