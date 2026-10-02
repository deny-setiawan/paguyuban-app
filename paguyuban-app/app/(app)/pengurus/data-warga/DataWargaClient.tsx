'use client'

import { useState } from 'react'
import { Users, User, Save } from 'lucide-react'

interface WargaItem {
  id: string
  namaLengkap: string
  nik: string | null
  noRumah: string | null
  noKk: string | null
  kkStatus: string | null
  hubunganKeluarga: string | null
  jenisKelamin: string | null
  tanggalLahir: string | null
  agama: string | null
  statusPerkawinan: string | null
  statusHunian: string | null
  tanggalMenempati: string | null
  statusSosial: string | null
  status: string | null
  phone: string | null
  isActive: boolean | null
}

const AGAMA_LABEL: Record<string, string> = {
  'Kristen': 'Kristen Protestan',
  'Katolik': 'Kristen Katolik',
}
function agamaLabel(a: string | null) {
  if (!a) return '—'
  return AGAMA_LABEL[a] || a
}

export default function DataWargaClient({ items }: { items: WargaItem[] }) {
  const [list, setList] = useState(items)
  const [search, setSearch] = useState('')
  const [detail, setDetail] = useState<WargaItem | null>(null)
  const [editForm, setEditForm] = useState<Partial<WargaItem>>({})
  const [loading, setLoading] = useState(false)

  function openDetail(item: WargaItem) {
    setDetail(item)
    setEditForm({
      namaLengkap: item.namaLengkap,
      nik: item.nik || '',
      noRumah: item.noRumah || '',
      noKk: item.noKk || '',
      tanggalLahir: item.tanggalLahir || '',
      statusSosial: item.statusSosial || '',
    })
  }

  async function saveEdit() {
    if (!detail) return
    setLoading(true)
    const res = await fetch(`/api/warga/${detail.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    })
    if (res.ok) {
      setList(prev => prev.map(w => w.id === detail.id ? { ...w, ...editForm } : w))
      setDetail(prev => prev ? { ...prev, ...editForm } : prev)
    }
    setLoading(false)
  }

  const filtered = list.filter(w =>
    w.namaLengkap.toLowerCase().includes(search.toLowerCase()) ||
    (w.noRumah || '').includes(search) ||
    (w.phone || '').includes(search)
  )

  const grouped = filtered.reduce((acc, w) => {
    const key = w.noRumah || 'Tanpa Nomor'
    if (!acc[key]) acc[key] = []
    acc[key].push(w)
    return acc
  }, {} as Record<string, WargaItem[]>)

  return (
    <>
      {detail && (
        <div className="sheet-mask show" onClick={() => setDetail(null)}>
          <div className="sheet show" onClick={e => e.stopPropagation()} style={{ padding: '24px 20px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>{detail.namaLengkap}</div>
            <div style={{ fontSize: 12, color: 'var(--gray500)', marginBottom: 14 }}>
              No. {detail.noRumah || '-'} · {detail.kkStatus === 'kepala_kk' ? 'Kepala KK' : (detail.hubunganKeluarga || 'Anggota')}
              {detail.phone && ` · ${detail.phone}`}
            </div>

            {/* Read-only info */}
            <div style={{ background: 'var(--gray50)', borderRadius: 10, padding: '10px 4px', marginBottom: 14 }}>
              {detail.agama && (
                <div className="kv"><span className="k">Agama</span><span className="v">{agamaLabel(detail.agama)}</span></div>
              )}
              {detail.jenisKelamin && (
                <div className="kv"><span className="k">Jenis Kelamin</span><span className="v">{detail.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</span></div>
              )}
              {detail.statusPerkawinan && (
                <div className="kv"><span className="k">Status Kawin</span><span className="v">{detail.statusPerkawinan}</span></div>
              )}
              {detail.statusHunian && (
                <div className="kv"><span className="k">Hunian</span><span className="v">{detail.statusHunian}</span></div>
              )}
              {detail.tanggalMenempati && (
                <div className="kv" style={{ borderBottom: 'none' }}><span className="k">Mulai Menempati</span><span className="v">{detail.tanggalMenempati}</span></div>
              )}
            </div>

            {/* Editable fields */}
            <input className="inp" value={editForm.namaLengkap || ''} onChange={e => setEditForm(f => ({ ...f, namaLengkap: e.target.value }))} placeholder="Nama lengkap" />
            <input className="inp" value={editForm.nik || ''} onChange={e => setEditForm(f => ({ ...f, nik: e.target.value }))} placeholder="NIK (16 digit)" maxLength={16} />
            <input className="inp" value={editForm.noKk || ''} onChange={e => setEditForm(f => ({ ...f, noKk: e.target.value }))} placeholder="No. KK" maxLength={16} />
            <input className="inp" value={editForm.noRumah || ''} onChange={e => setEditForm(f => ({ ...f, noRumah: e.target.value }))} placeholder="No. Rumah" />
            <input className="inp" value={editForm.tanggalLahir || ''} onChange={e => setEditForm(f => ({ ...f, tanggalLahir: e.target.value }))} placeholder="Tanggal lahir (YYYY-MM-DD)" />
            <select className="inp" value={editForm.statusSosial || ''} onChange={e => setEditForm(f => ({ ...f, statusSosial: e.target.value }))}>
              <option value="">Status sosial...</option>
              {['mampu', 'kurang_mampu', 'tidak_mampu', 'lansia', 'disabilitas'].map(s => (
                <option key={s} value={s} style={{ textTransform: 'capitalize' }}>{s.replace('_', ' ')}</option>
              ))}
            </select>
            <button className="btn-primary" style={{ width: '100%', marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              disabled={loading} onClick={saveEdit}>
              {loading ? 'Menyimpan...' : <><Save size={14} /> Simpan</>}
            </button>
          </div>
        </div>
      )}

      <input className="inp" value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Cari nama, no. rumah, atau HP..." style={{ marginBottom: 16 }} />

      {filtered.length === 0 ? (
        <div className="empty">
          <div className="e-i" style={{ display: 'flex', justifyContent: 'center' }}><Users size={38} color="var(--gray400)" /></div>
          <div className="e-t">Tidak ada warga ditemukan</div>
        </div>
      ) : (
        Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([noRumah, wargaList]) => (
          <div key={noRumah} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--gray500)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>
              No. {noRumah}
            </div>
            <div className="peng-card">
              {wargaList.map(w => (
                <div key={w.id} className="peng-item" style={{ cursor: 'pointer' }} onClick={() => openDetail(w)}>
                  <div className="pi-ico" style={{ background: w.kkStatus === 'kepala_kk' ? 'var(--g50)' : 'var(--gray100)' }}>
                    <User size={18} color={w.kkStatus === 'kepala_kk' ? 'var(--g600)' : 'var(--gray500)'} />
                  </div>
                  <div className="pi-body">
                    <div className="pi-t">
                      {w.namaLengkap}
                      {w.kkStatus === 'kepala_kk' && <span className="pill" style={{ background: 'var(--g50)', color: 'var(--g700)' }}>Kepala KK</span>}
                    </div>
                    <div className="pi-d">
                      {w.hubunganKeluarga || w.kkStatus || '-'}
                      {w.agama && ` · ${agamaLabel(w.agama)}`}
                      {w.statusHunian && ` · ${w.statusHunian}`}
                    </div>
                    {w.phone && <div className="pi-d" style={{ color: 'var(--g600)' }}>{w.phone}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </>
  )
}
