'use client'

import { useState } from 'react'
import { timeAgo } from '@/lib/utils'
import { FileText, Wrench, Lock, Sparkles, Users, Wallet, ClipboardList, CheckCircle, User } from 'lucide-react'

interface LaporanItem {
  id: string
  kategori: string
  judul: string
  isi: string | null
  status: string
  tanggapan: string | null
  namaTanggapiOleh: string | null
  namaPelapor: string
  phonePelapor: string | null
  noRumahPelapor: string | null
  createdAt: string
}

function KatIcon({ kat, size = 18 }: { kat: string; size?: number }) {
  switch (kat) {
    case 'infrastruktur': return <Wrench size={size} />
    case 'keamanan': return <Lock size={size} />
    case 'kebersihan': return <Sparkles size={size} />
    case 'sosial': return <Users size={size} />
    case 'keuangan': return <Wallet size={size} />
    default: return <ClipboardList size={size} />
  }
}

const KAT_BG: Record<string, string> = {
  infrastruktur: 'var(--blue-l)', keamanan: 'var(--red-l)', kebersihan: 'var(--g50)',
  sosial: 'var(--teal-l)', keuangan: 'var(--gold-l)', lainnya: 'var(--gray100)',
}
const KAT_COLOR: Record<string, string> = {
  infrastruktur: 'var(--blue)', keamanan: 'var(--red)', kebersihan: 'var(--g600)',
  sosial: 'var(--teal)', keuangan: 'var(--gold)', lainnya: 'var(--gray500)',
}
const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  menunggu: { bg: 'var(--gold-l)', color: 'var(--gold)', label: 'Menunggu' },
  diproses: { bg: 'var(--blue-l)', color: 'var(--blue)', label: 'Diproses' },
  selesai:  { bg: 'var(--g50)',    color: 'var(--g700)', label: 'Selesai' },
  ditolak:  { bg: 'var(--red-l)',  color: 'var(--red)',  label: 'Ditolak' },
}

type TabKey = 'menunggu' | 'diproses' | 'selesai'
const TABS: { key: TabKey; label: string }[] = [
  { key: 'menunggu', label: 'Masuk' },
  { key: 'diproses', label: 'Diproses' },
  { key: 'selesai',  label: 'Selesai' },
]

export default function LaporanMasukClient({ items }: { items: LaporanItem[] }) {
  const [list, setList] = useState(items)
  const [tab, setTab] = useState<TabKey>('menunggu')
  const [detail, setDetail] = useState<LaporanItem | null>(null)
  const [tanggapan, setTanggapan] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState('')

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  function closeModal() {
    setDetail(null)
    setTanggapan('')
  }

  async function respond(id: string, status: 'diproses' | 'selesai') {
    setLoading(true)
    const res = await fetch(`/api/laporan/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tanggapan, status }),
    })
    if (res.ok) {
      setList(prev => prev.map(l => l.id === id ? { ...l, status, tanggapan } : l))
      closeModal()
      if (status === 'diproses') {
        setTab('diproses')
        showToast('Laporan ditandai sedang diproses')
      } else {
        setTab('selesai')
        showToast('Laporan telah diselesaikan')
      }
    }
    setLoading(false)
  }

  const filtered = list.filter(l => l.status === tab)

  return (
    <>
      {toast && (
        <div className="ib green" style={{ marginBottom: 12 }}>
          <CheckCircle size={14} style={{ flexShrink: 0 }} />
          <div>{toast}</div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 4, background: 'var(--gray100)', borderRadius: 14, padding: 4, marginBottom: 16 }}>
        {TABS.map(t => {
          const count = list.filter(l => l.status === t.key).length
          return (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              flex: 1, height: 38, border: 'none', borderRadius: 11,
              background: tab === t.key ? 'var(--white)' : 'transparent',
              color: tab === t.key ? 'var(--g700)' : 'var(--gray500)',
              fontFamily: 'var(--f)', fontSize: 12, fontWeight: 700,
              boxShadow: tab === t.key ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
              cursor: 'pointer',
            }}>
              {t.label}{count > 0 ? ` (${count})` : ''}
            </button>
          )
        })}
      </div>

      {detail && (
        <div className="sheet-mask show" onClick={closeModal}>
          <div className="sheet show" onClick={e => e.stopPropagation()} style={{ padding: '24px 20px' }}>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 14 }}>
              {detail.status === 'selesai' ? 'Detail Laporan' : 'Tanggapi Laporan'}
            </div>

            <div style={{ background: 'var(--gray50)', borderRadius: 10, padding: '4px 4px', marginBottom: 12 }}>
              {(() => {
                const rows: [string, React.ReactNode][] = [
                  ['Kategori', <span key="kat" style={{ textTransform: 'capitalize' }}>{detail.kategori}</span>],
                  ['Pelapor', detail.namaPelapor],
                  ['No. Rumah', detail.noRumahPelapor || '-'],
                  ['No. Telepon', detail.phonePelapor
                    ? <a key="phone" href={`https://wa.me/${detail.phonePelapor.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
                        style={{ color: 'var(--g600)', fontWeight: 700, textDecoration: 'none' }}>
                        {detail.phonePelapor} 💬
                      </a>
                    : '-'],
                  ['Judul', detail.judul],
                ]
                if (detail.namaTanggapiOleh) rows.push(['Ditangani oleh', detail.namaTanggapiOleh])
                return rows.map(([label, value], i) => (
                  <div key={i} className="kv" style={i === rows.length - 1 ? { borderBottom: 'none' } : {}}>
                    <span className="k">{label}</span>
                    <span className="v">{value}</span>
                  </div>
                ))
              })()}
            </div>

            {detail.isi && (
              <div style={{ background: 'var(--gray50)', borderRadius: 8, padding: '10px 12px', marginBottom: 12, fontSize: 13, color: 'var(--gray700)', lineHeight: 1.6 }}>
                {detail.isi}
              </div>
            )}

            {detail.status === 'selesai' ? (
              detail.tanggapan && (
                <div className="ib green">
                  <CheckCircle size={14} style={{ flexShrink: 0 }} />
                  <div><b>Tanggapan:</b> {detail.tanggapan}</div>
                </div>
              )
            ) : (
              <>
                <div style={{ marginTop: 4 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray600)', display: 'block', marginBottom: 4 }}>Tanggapan</label>
                  <textarea className="inp" rows={3} value={tanggapan} onChange={e => setTanggapan(e.target.value)}
                    placeholder="Tulis tanggapan pengurus..." style={{ resize: 'vertical' }} />
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  {detail.status === 'menunggu' && (
                    <button className="btn-primary"
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                      disabled={loading || !tanggapan.trim()}
                      onClick={() => respond(detail.id, 'diproses')}>
                      {loading ? '…' : <><ClipboardList size={14} /> Tandai Diproses</>}
                    </button>
                  )}
                  <button className="btn-primary"
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    disabled={loading}
                    onClick={() => respond(detail.id, 'selesai')}>
                    {loading ? '…' : <><CheckCircle size={14} /> Selesaikan</>}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="empty">
          <div className="e-i" style={{ display: 'flex', justifyContent: 'center' }}><FileText size={38} color="var(--gray400)" /></div>
          <div className="e-t">
            {tab === 'menunggu' ? 'Tidak ada laporan masuk'
              : tab === 'diproses' ? 'Tidak ada laporan diproses'
              : 'Tidak ada laporan selesai'}
          </div>
          <div className="e-d">
            {tab === 'menunggu' ? 'Laporan baru dari warga akan muncul di sini'
              : tab === 'diproses' ? 'Laporan yang sedang diproses akan muncul di sini'
              : 'Laporan yang sudah diselesaikan akan muncul di sini'}
          </div>
        </div>
      ) : (
        <div className="peng-card">
          {filtered.map(item => {
            const st = STATUS_STYLE[item.status] || STATUS_STYLE.menunggu
            const bg = KAT_BG[item.kategori] || 'var(--gray100)'
            const color = KAT_COLOR[item.kategori] || 'var(--gray500)'
            return (
              <div key={item.id} className="peng-item" style={{ cursor: 'pointer' }}
                onClick={() => { setDetail(item); setTanggapan(item.tanggapan || '') }}>
                <div className="pi-ico" style={{ background: bg, color }}>
                  <KatIcon kat={item.kategori} size={18} />
                </div>
                <div className="pi-body">
                  <div className="pi-t">
                    {item.judul}
                    <span className="pill" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                  </div>
                  <div className="pi-d">{item.namaPelapor} · <span style={{ textTransform: 'capitalize' }}>{item.kategori}</span></div>
                  {item.tanggapan && <div className="pi-d" style={{ color: 'var(--g600)' }}>↩ {item.tanggapan}</div>}
                  {item.namaTanggapiOleh && (
                    <div className="pi-d" style={{ color: 'var(--gray500)', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <User size={11} />{item.namaTanggapiOleh}
                    </div>
                  )}
                  <div className="pi-time">{timeAgo(item.createdAt)}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
