'use client'

import { useState } from 'react'
import { Baby, Activity, Handshake, Users, X, CheckCircle, AlertTriangle, Clock } from 'lucide-react'

interface AnggotaItem {
  id: string
  nama: string
  kkStatus: string | null
  sakitTerpakai: number
}

interface KKGroup {
  noRumah: string
  kepalaId: string | null
  kepalaNama: string
  kelahiranTerpakai: number
  anggota: AnggotaItem[]
}

interface HistoryItem {
  id: string
  namaWarga: string | null
  noRumah: string | null
  jenis: string
  tahun: number
  catatan: string | null
  createdAt: string
  createdByName: string | null
}

interface Props {
  kkGroups: KKGroup[]
  history: HistoryItem[]
  tahun: number
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function DanaSosialClient({ kkGroups: initGroups, history: initHistory, tahun }: Props) {
  const [groups, setGroups] = useState<KKGroup[]>(initGroups)
  const [history, setHistory] = useState<HistoryItem[]>(initHistory)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'kk' | 'riwayat'>('kk')
  const [modal, setModal] = useState<KKGroup | null>(null)
  const [catatan, setCatatan] = useState('')
  const [loading, setLoading] = useState<string | null>(null)
  const [errMsg, setErrMsg] = useState<string | null>(null)

  const filtered = groups.filter(g =>
    g.kepalaNama.toLowerCase().includes(search.toLowerCase()) ||
    g.noRumah.includes(search)
  )

  const totalKelahiran = groups.reduce((s, g) => s + g.kelahiranTerpakai, 0)
  const totalSakit = groups.reduce((s, g) => s + g.anggota.reduce((a, w) => a + w.sakitTerpakai, 0), 0)

  async function recordKelahiran(group: KKGroup) {
    if (group.kelahiranTerpakai >= 2) return
    setLoading('kelahiran')
    setErrMsg(null)
    const res = await fetch('/api/dana-sosial', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jenis: 'kelahiran', noRumah: group.noRumah, catatan: catatan || undefined }),
    })
    const data = await res.json()
    if (!res.ok) {
      setErrMsg(data.error || 'Gagal mencatat')
    } else {
      const newCount = data.count as number
      setGroups(prev => prev.map(g => g.noRumah === group.noRumah ? { ...g, kelahiranTerpakai: newCount } : g))
      setModal(prev => prev ? { ...prev, kelahiranTerpakai: newCount } : prev)
      setHistory(prev => [{
        id: Math.random().toString(),
        namaWarga: group.kepalaNama,
        noRumah: group.noRumah,
        jenis: 'kelahiran',
        tahun,
        catatan: catatan || null,
        createdAt: new Date().toISOString(),
        createdByName: null,
      }, ...prev])
      setCatatan('')
    }
    setLoading(null)
  }

  async function recordSakit(anggota: AnggotaItem, group: KKGroup) {
    if (anggota.sakitTerpakai >= 2) return
    setLoading(`sakit_${anggota.id}`)
    setErrMsg(null)
    const res = await fetch('/api/dana-sosial', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jenis: 'sakit', wargaId: anggota.id, catatan: catatan || undefined }),
    })
    const data = await res.json()
    if (!res.ok) {
      setErrMsg(data.error || 'Gagal mencatat')
    } else {
      const newCount = data.count as number
      setGroups(prev => prev.map(g => g.noRumah === group.noRumah
        ? { ...g, anggota: g.anggota.map(a => a.id === anggota.id ? { ...a, sakitTerpakai: newCount } : a) }
        : g
      ))
      setModal(prev => prev ? {
        ...prev,
        anggota: prev.anggota.map(a => a.id === anggota.id ? { ...a, sakitTerpakai: newCount } : a)
      } : prev)
      setHistory(prev => [{
        id: Math.random().toString(),
        namaWarga: anggota.nama,
        noRumah: group.noRumah,
        jenis: 'sakit',
        tahun,
        catatan: catatan || null,
        createdAt: new Date().toISOString(),
        createdByName: null,
      }, ...prev])
      setCatatan('')
    }
    setLoading(null)
  }

  function openModal(g: KKGroup) {
    // sync with latest state
    const fresh = groups.find(x => x.noRumah === g.noRumah) || g
    setModal(fresh)
    setErrMsg(null)
    setCatatan('')
  }

  return (
    <>
      {/* Stats */}
      <div className="rl-st" style={{ marginBottom: 16 }}>
        <div>
          <b style={{ display: 'block', fontSize: 18, fontWeight: 800, color: 'var(--gray900)' }}>{groups.length}</b>
          <span>Total KK</span>
        </div>
        <div>
          <b style={{ display: 'block', fontSize: 16, fontWeight: 700, color: 'var(--blue)' }}>{totalKelahiran}×</b>
          <span>Kelahiran</span>
        </div>
        <div>
          <b style={{ display: 'block', fontSize: 16, fontWeight: 700, color: 'var(--orange)' }}>{totalSakit}×</b>
          <span>Sakit {tahun}</span>
        </div>
      </div>

      {/* Info box */}
      <div className="ib blue" style={{ marginBottom: 16 }}>
        <Handshake size={14} style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          <b>Dansos Kelahiran</b>: maks 2× seumur hidup per rumah · <b>Dansos Sakit</b>: maks 2× per tahun per anggota keluarga
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['kk', 'riwayat'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, height: 38, borderRadius: 20, border: 'none', cursor: 'pointer',
            fontWeight: 700, fontSize: 13,
            background: tab === t ? 'var(--g600)' : 'var(--gray100)',
            color: tab === t ? 'white' : 'var(--gray600)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            {t === 'kk' ? <><Users size={14} /> Daftar KK</> : <><Clock size={14} /> Riwayat ({history.length})</>}
          </button>
        ))}
      </div>

      {/* Modal */}
      {modal && (
        <div className="sheet-mask show" onClick={() => setModal(null)}>
          <div className="sheet show" onClick={e => e.stopPropagation()} style={{ padding: '20px 16px 28px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <div style={{ fontWeight: 800, fontSize: 16 }}>{modal.kepalaNama}</div>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <X size={18} color="var(--gray500)" />
              </button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--gray500)', marginBottom: 16 }}>No. {modal.noRumah}</div>

            {errMsg && (
              <div className="ib red" style={{ marginBottom: 12 }}>
                <AlertTriangle size={13} style={{ flexShrink: 0 }} /><div>{errMsg}</div>
              </div>
            )}

            {/* Catatan field */}
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray500)', display: 'block', marginBottom: 4, letterSpacing: 0.4 }}>CATATAN (opsional)</label>
            <input className="inp" value={catatan} onChange={e => setCatatan(e.target.value)}
              placeholder="Nama bayi, keterangan sakit, dll." style={{ marginBottom: 16 }} />

            {/* Kelahiran section */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--gray600)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, letterSpacing: 0.4 }}>
                <Baby size={14} /> DANSOS KELAHIRAN — PER RUMAH
              </div>
              <div className="peng-card" style={{ padding: '10px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>No. {modal.noRumah}</div>
                    <div style={{ fontSize: 12, color: modal.kelahiranTerpakai >= 2 ? 'var(--red)' : 'var(--g600)', marginTop: 2 }}>
                      {modal.kelahiranTerpakai}/2 terpakai seumur hidup
                    </div>
                  </div>
                  {modal.kelahiranTerpakai >= 2
                    ? <span className="pill" style={{ background: 'var(--red-l)', color: 'var(--red)' }}>Habis</span>
                    : (
                      <button className="btn-primary" style={{ padding: '6px 14px', fontSize: 12 }}
                        disabled={loading === 'kelahiran'}
                        onClick={() => recordKelahiran(modal)}>
                        {loading === 'kelahiran' ? '...' : 'Catat Kelahiran'}
                      </button>
                    )}
                </div>
              </div>
            </div>

            {/* Sakit section */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--gray600)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, letterSpacing: 0.4 }}>
                <Activity size={14} /> DANSOS SAKIT — PER ANGGOTA (TAHUN {tahun})
              </div>
              <div className="peng-card" style={{ padding: '4px 0' }}>
                {modal.anggota.map(a => (
                  <div key={a.id} className="peng-item" style={{ cursor: 'default' }}>
                    <div className="pi-ico" style={{ background: a.kkStatus === 'kepala_kk' ? 'var(--g50)' : 'var(--gray100)' }}>
                      <Activity size={16} color={a.kkStatus === 'kepala_kk' ? 'var(--g600)' : 'var(--gray500)'} />
                    </div>
                    <div className="pi-body">
                      <div className="pi-t">
                        {a.nama}
                        {a.kkStatus === 'kepala_kk' && <span className="pill" style={{ background: 'var(--g50)', color: 'var(--g700)' }}>Kepala KK</span>}
                      </div>
                      <div className="pi-d" style={{ color: a.sakitTerpakai >= 2 ? 'var(--red)' : 'var(--g600)' }}>
                        {a.sakitTerpakai}/2 terpakai tahun ini
                      </div>
                    </div>
                    {a.sakitTerpakai >= 2
                      ? <span className="pill" style={{ background: 'var(--red-l)', color: 'var(--red)', flexShrink: 0, alignSelf: 'center' }}>Habis</span>
                      : (
                        <button className="btn-primary" style={{ padding: '5px 12px', fontSize: 11, flexShrink: 0, alignSelf: 'center' }}
                          disabled={loading === `sakit_${a.id}`}
                          onClick={() => recordSakit(a, modal)}>
                          {loading === `sakit_${a.id}` ? '...' : 'Catat'}
                        </button>
                      )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KK Tab */}
      {tab === 'kk' && (
        <>
          <input className="inp" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama kepala KK atau no. rumah..." style={{ marginBottom: 12 }} />

          {filtered.length === 0 ? (
            <div className="empty">
              <div className="e-i" style={{ display: 'flex', justifyContent: 'center' }}><Handshake size={38} color="var(--gray400)" /></div>
              <div className="e-t">Belum ada data warga</div>
            </div>
          ) : (
            <div className="peng-card">
              {filtered.map(g => {
                const totalSakitKk = g.anggota.reduce((s, a) => s + a.sakitTerpakai, 0)
                const kelahiranHabis = g.kelahiranTerpakai >= 2
                return (
                  <div key={g.noRumah} className="peng-item" style={{ cursor: 'pointer' }} onClick={() => openModal(g)}>
                    <div className="pi-ico" style={{ background: 'var(--teal-l)' }}><Handshake size={18} color="var(--teal)" /></div>
                    <div className="pi-body">
                      <div className="pi-t">
                        {g.kepalaNama}
                        <span className="pill" style={{ background: 'var(--gray100)', color: 'var(--gray600)' }}>No. {g.noRumah}</span>
                      </div>
                      <div className="pi-d" style={{ display: 'flex', gap: 12, marginTop: 2 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: kelahiranHabis ? 'var(--red)' : 'var(--gray600)' }}>
                          <Baby size={11} /> Kelahiran {g.kelahiranTerpakai}/2
                          {kelahiranHabis && <span style={{ background: 'var(--red-l)', color: 'var(--red)', borderRadius: 4, fontSize: 9, padding: '0 4px', marginLeft: 2 }}>Habis</span>}
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--gray600)' }}>
                          <Activity size={11} /> Sakit {totalSakitKk}× ({g.anggota.length} jiwa)
                        </span>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--gray400)', flexShrink: 0, alignSelf: 'center' }}>›</div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Riwayat Tab */}
      {tab === 'riwayat' && (
        history.length === 0 ? (
          <div className="empty">
            <div className="e-i" style={{ display: 'flex', justifyContent: 'center' }}><Clock size={38} color="var(--gray400)" /></div>
            <div className="e-t">Belum ada riwayat dansos</div>
          </div>
        ) : (
          <div className="peng-card">
            {history.map((h, i) => (
              <div key={h.id + i} className="peng-item" style={{ cursor: 'default' }}>
                <div className="pi-ico" style={{ background: h.jenis === 'kelahiran' ? 'var(--blue-l)' : 'var(--orange-l)' }}>
                  {h.jenis === 'kelahiran' ? <Baby size={18} color="var(--blue)" /> : <Activity size={18} color="var(--orange)" />}
                </div>
                <div className="pi-body">
                  <div className="pi-t">
                    {h.namaWarga || '—'}
                    <span className={`pill ${h.jenis === 'kelahiran' ? '' : 'pending'}`}
                      style={h.jenis === 'kelahiran' ? { background: 'var(--blue-l)', color: 'var(--blue)' } : {}}>
                      {h.jenis === 'kelahiran' ? 'Kelahiran' : 'Sakit'}
                    </span>
                  </div>
                  <div className="pi-d">
                    No. {h.noRumah || '-'} · {h.tahun}
                    {h.catatan && ` · ${h.catatan}`}
                  </div>
                  <div className="pi-d" style={{ color: 'var(--gray400)', fontSize: 11 }}>
                    {formatDate(h.createdAt)}{h.createdByName ? ` · oleh ${h.createdByName}` : ''}
                  </div>
                </div>
                <CheckCircle size={14} color="var(--g500)" style={{ flexShrink: 0, alignSelf: 'center' }} />
              </div>
            ))}
          </div>
        )
      )}
    </>
  )
}
