'use client'

import { useState } from 'react'
import { timeAgo } from '@/lib/utils'

interface SuratItem {
  id: string
  jenis: string
  keperluan: string | null
  status: string
  nomorSurat: string | null
  createdAt: string
}

interface Props {
  suratList: SuratItem[]
}

const JENIS_OPTIONS = [
  { val: 'pengantar', lbl: '📄 Surat Pengantar', desc: 'Pengantar RT untuk keperluan umum', ico: '📄', bg: 'var(--blue-l)' },
  { val: 'domisili', lbl: '🏠 Surat Domisili', desc: 'Keterangan berdomisili di wilayah RT', ico: '🏠', bg: 'var(--g50)' },
  { val: 'tidak_mampu', lbl: '📋 Surat Tidak Mampu', desc: 'Keterangan ekonomi tidak mampu', ico: '📋', bg: 'var(--gold-l)' },
  { val: 'usaha', lbl: '💼 Surat Keterangan Usaha', desc: 'Keterangan usaha/bisnis warga', ico: '💼', bg: 'var(--purple-l)' },
]

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  diajukan: { label: 'Diajukan', cls: 'menunggu' },
  diproses: { label: 'Diproses', cls: 'belum' },
  selesai: { label: 'Selesai', cls: 'lunas' },
  ditolak: { label: 'Ditolak', cls: 'ditolak' },
}

export default function SuratClient({ suratList }: Props) {
  const [tab, setTab] = useState<'pilih' | 'form' | 'riwayat'>(suratList.length > 0 ? 'riwayat' : 'pilih')
  const [jenis, setJenis] = useState('')
  const [keperluan, setKeperluan] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [localSurat, setLocalSurat] = useState(suratList)

  function pilihJenis(val: string) { setJenis(val); setTab('form') }

  async function submitSurat() {
    if (!keperluan.trim()) { setMsg('Keperluan wajib diisi'); return }
    setLoading(true); setMsg('')
    try {
      const res = await fetch('/api/surat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jenis, keperluan }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setLocalSurat(prev => [data.surat, ...prev])
      setTab('riwayat'); setJenis(''); setKeperluan('')
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Gagal mengajukan surat')
    } finally { setLoading(false) }
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 8, background: 'var(--gray100)', borderRadius: 14, padding: 4, marginBottom: 16 }}>
        {(['pilih', 'riwayat'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, height: 38, border: 'none', borderRadius: 11,
            background: tab === t || (t === 'pilih' && tab === 'form') ? 'var(--white)' : 'transparent',
            color: tab === t || (t === 'pilih' && tab === 'form') ? 'var(--g700)' : 'var(--gray500)',
            fontFamily: 'var(--f)', fontSize: 13, fontWeight: 700,
            boxShadow: tab === t || (t === 'pilih' && tab === 'form') ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
            cursor: 'pointer',
          }}>
            {t === 'pilih' ? '+ Ajukan Surat' : `Riwayat${localSurat.length ? ` (${localSurat.length})` : ''}`}
          </button>
        ))}
      </div>

      {tab === 'pilih' && (
        <>
          <div className="sec-h" style={{ marginBottom: 12 }}>
            <div className="t"><span className="em">✉️</span> Pilih jenis surat</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {JENIS_OPTIONS.map(j => (
              <div key={j.val} className="peng-item" style={{ cursor: 'pointer' }} onClick={() => pilihJenis(j.val)}>
                <div className="pi-ico" style={{ background: j.bg }}>{j.ico}</div>
                <div className="pi-body">
                  <div className="pi-t">{j.lbl.replace(/^.+ /, '')}</div>
                  <div className="pi-d">{j.desc}</div>
                </div>
                <div style={{ color: 'var(--gray400)', fontSize: 16 }}>›</div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'form' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button onClick={() => setTab('pilih')} style={{ border: 'none', background: 'none', color: 'var(--g600)', fontFamily: 'var(--f)', fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: 0, textAlign: 'left' }}>
            ← Ganti jenis surat
          </button>

          <div className="ib blue">
            <span>{JENIS_OPTIONS.find(j => j.val === jenis)?.ico}</span>
            <div><b>{JENIS_OPTIONS.find(j => j.val === jenis)?.lbl}</b><br />{JENIS_OPTIONS.find(j => j.val === jenis)?.desc}</div>
          </div>

          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray600)' }}>Keperluan / Tujuan *</label>
          <textarea
            className="rl-in" rows={4}
            placeholder="Jelaskan keperluan pembuatan surat ini..."
            value={keperluan} onChange={e => setKeperluan(e.target.value)}
            style={{ resize: 'none', minHeight: 100 }}
          />

          <div className="ib gold">
            <span>⏱️</span>
            <div>Surat biasanya diproses dalam 1-3 hari kerja oleh pengurus RT. Anda akan mendapat notifikasi saat surat siap.</div>
          </div>

          {msg && <div style={{ fontSize: 12, color: 'var(--red)', padding: '8px 12px', background: 'var(--red-l)', borderRadius: 10 }}>{msg}</div>}

          <button className="btn-p" onClick={submitSurat} disabled={loading}>
            {loading ? 'Mengirim…' : '📨 Ajukan Surat'}
          </button>
        </div>
      )}

      {tab === 'riwayat' && (
        localSurat.length === 0 ? (
          <div className="empty">
            <div className="e-i">✉️</div>
            <div className="e-t">Belum ada pengajuan surat</div>
            <div className="e-d">Ajukan surat keterangan RT untuk keperluan Anda.</div>
            <button className="btn-p" style={{ marginTop: 12 }} onClick={() => setTab('pilih')}>+ Ajukan Surat</button>
          </div>
        ) : (
          <div className="peng-card">
            {localSurat.map(s => {
              const st = STATUS_MAP[s.status] || { label: s.status, cls: '' }
              const j = JENIS_OPTIONS.find(j => j.val === s.jenis)
              return (
                <div key={s.id} className="peng-item" style={{ cursor: 'default' }}>
                  <div className="pi-ico" style={{ background: j?.bg || 'var(--blue-l)' }}>{j?.ico || '✉️'}</div>
                  <div className="pi-body">
                    <div className="pi-t">
                      {j?.lbl.replace(/^.+ /, '') || s.jenis}
                      <span className={`pill ${st.cls}`}>{st.label}</span>
                    </div>
                    {s.keperluan && (
                      <div className="pi-d" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {s.keperluan}
                      </div>
                    )}
                    {s.nomorSurat && (
                      <div style={{ fontSize: 12, color: 'var(--g600)', fontWeight: 700, marginTop: 4 }}>
                        No. Surat: {s.nomorSurat}
                      </div>
                    )}
                    <div className="pi-time">{timeAgo(s.createdAt)}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}
    </>
  )
}
