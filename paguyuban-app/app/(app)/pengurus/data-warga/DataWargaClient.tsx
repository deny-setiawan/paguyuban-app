'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Users, User, Save, Trash2, X, Image, Home, AlertTriangle, FileDown, FileText } from 'lucide-react'
import type { KkExportData, PdfBuildResult } from '@/lib/pdf/warga-pdf'
import PdfPreviewModal from '@/components/ui/PdfPreviewModal'

interface WargaItem {
  id: string
  source: 'warga' | 'pengurus'
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
  pekerjaan: string | null
  statusHunian: string | null
  tanggalMenempati: string | null
  statusSosial: string | null
  status: string | null
  phone: string | null
  isActive: boolean | null
  role: string | null
  fotoFiles: string[] | null
}

interface KKGroup {
  noRumah: string
  kepala: WargaItem | null
  anggota: WargaItem[]
  all: WargaItem[]
}

const AGAMA_LABEL: Record<string, string> = {
  'Kristen': 'Kristen Protestan',
  'Katolik': 'Kristen Katolik',
}
function agamaLabel(a: string | null) {
  return a ? (AGAMA_LABEL[a] || a) : '—'
}

function kkToExportData(group: KKGroup): KkExportData {
  const kepala = group.kepala
  return {
    noRumah: group.noRumah,
    kepala: kepala ? {
      namaLengkap: kepala.namaLengkap,
      phone: kepala.phone,
      agama: kepala.agama,
      jenisKelamin: kepala.jenisKelamin,
      statusPerkawinan: kepala.statusPerkawinan,
      pekerjaan: kepala.pekerjaan,
      tanggalLahir: kepala.tanggalLahir,
      statusHunian: kepala.statusHunian,
      tanggalMenempati: kepala.tanggalMenempati,
      nik: kepala.nik,
      noKk: kepala.noKk,
    } : null,
    anggota: group.anggota.map(a => ({
      namaLengkap: a.namaLengkap,
      jenisKelamin: a.jenisKelamin,
      agama: a.agama,
      hubunganKeluarga: a.hubunganKeluarga,
      kkStatus: a.kkStatus,
    })),
    fotoFiles: group.all.flatMap(w => w.fotoFiles ?? []).filter((v, i, arr) => arr.indexOf(v) === i),
  }
}

const PAGE_SIZE = 5

export default function DataWargaClient({ items, rtName, canDeleteKk = false }: { items: WargaItem[]; rtName: string; canDeleteKk?: boolean }) {
  const [list, setList] = useState(items)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'warga' | 'kk'>('warga')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const sentinelRef = useCallback((el: HTMLDivElement | null) => {
    observerRef.current?.disconnect()
    observerRef.current = null
    if (!el) return
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) setVisibleCount(prev => prev + PAGE_SIZE)
    }, { threshold: 0 })
    obs.observe(el)
    observerRef.current = obs
  }, [])
  const [detail, setDetail] = useState<WargaItem | null>(null)
  const [editForm, setEditForm] = useState<Partial<WargaItem>>({})
  const [loading, setLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; noRumah: string; nama: string } | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [fotoModal, setFotoModal] = useState<string | null>(null)
  const [buildingKk, setBuildingKk] = useState<string | null>(null)
  const [buildingAll, setBuildingAll] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [pdfPreview, setPdfPreview] = useState<PdfBuildResult | null>(null)

  useEffect(() => { setVisibleCount(PAGE_SIZE) }, [search, tab])

  function closePdfPreview() {
    pdfPreview?.cleanup()
    setPdfPreview(null)
  }

  function openDoc(url: string) {
    const isPdf = url.startsWith('data:application/pdf') || /\.pdf(\?|$)/i.test(url)
    if (isPdf) { window.open(url, '_blank'); return }
    setFotoModal(url)
  }

  async function handleExportKk(group: KKGroup) {
    setBuildingKk(group.noRumah)
    setExportError(null)
    try {
      const { buildKkPdf } = await import('@/lib/pdf/warga-pdf')
      const result = await buildKkPdf(kkToExportData(group), rtName)
      setPdfPreview(result)
    } catch (e) {
      setExportError(e instanceof Error ? e.message : 'Gagal membuat PDF')
    } finally {
      setBuildingKk(null)
    }
  }

  async function handleExportAll() {
    setBuildingAll(true)
    setExportError(null)
    try {
      const { buildAllKkPdf } = await import('@/lib/pdf/warga-pdf')
      const map: Record<string, KKGroup> = {}
      for (const w of list) {
        const key = w.noRumah || 'Tanpa Nomor'
        if (!map[key]) map[key] = { noRumah: key, kepala: null, anggota: [], all: [] }
        map[key].all.push(w)
        if (w.kkStatus === 'kepala_kk') map[key].kepala = w
        else map[key].anggota.push(w)
      }
      const allKk = Object.values(map).sort((a, b) => a.noRumah.localeCompare(b.noRumah))
      const result = await buildAllKkPdf(allKk.map(kkToExportData), rtName)
      setPdfPreview(result)
    } catch (e) {
      setExportError(e instanceof Error ? e.message : 'Gagal membuat PDF')
    } finally {
      setBuildingAll(false)
    }
  }

  function openDetail(item: WargaItem) {
    setDetail(item)
    setEditForm({
      namaLengkap: item.namaLengkap,
      nik: item.nik || '',
      noRumah: item.noRumah || '',
      noKk: item.noKk || '',
      tanggalLahir: item.tanggalLahir || '',
      tanggalMenempati: item.tanggalMenempati || '',
      statusSosial: item.statusSosial || '',
    })
  }

  async function saveEdit() {
    if (!detail || detail.source === 'pengurus') return
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

  async function confirmDeleteKk() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    const res = await fetch(`/api/warga/${deleteTarget.id}`, { method: 'DELETE' })
    if (res.ok) {
      setList(prev => prev.filter(w => w.noRumah !== deleteTarget.noRumah))
      setDeleteTarget(null)
      setDetail(null)
    }
    setDeleteLoading(false)
  }

  const filtered = list.filter(w =>
    w.namaLengkap.toLowerCase().includes(search.toLowerCase()) ||
    (w.noRumah || '').includes(search) ||
    (w.phone || '').includes(search)
  )

  // Group by noRumah for KK tab
  const kkGroups = (() => {
    const map: Record<string, KKGroup> = {}
    for (const w of filtered) {
      const key = w.noRumah || 'Tanpa Nomor'
      if (!map[key]) map[key] = { noRumah: key, kepala: null, anggota: [], all: [] }
      map[key].all.push(w)
      if (w.kkStatus === 'kepala_kk') map[key].kepala = w
      else map[key].anggota.push(w)
    }
    return Object.values(map).sort((a, b) => a.noRumah.localeCompare(b.noRumah))
  })()

  // Group by noRumah for warga tab
  const wargaGrouped = filtered.reduce((acc, w) => {
    const key = w.noRumah || 'Tanpa Nomor'
    if (!acc[key]) acc[key] = []
    acc[key].push(w)
    return acc
  }, {} as Record<string, WargaItem[]>)

  const sortedWargaEntries = Object.entries(wargaGrouped).sort(([a], [b]) => a.localeCompare(b))
  const visibleWargaEntries = sortedWargaEntries.slice(0, visibleCount)
  const visibleKkGroups = kkGroups.slice(0, visibleCount)
  const hasMore = tab === 'kk' ? visibleCount < kkGroups.length : visibleCount < sortedWargaEntries.length

  return (
    <>
      {/* PDF Preview Modal */}
      {pdfPreview && (
        <PdfPreviewModal
          previewUrl={pdfPreview.previewUrl}
          filename={pdfPreview.filename}
          onDownload={pdfPreview.download}
          onClose={closePdfPreview}
        />
      )}

      {/* Foto lightbox */}
      {fotoModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.88)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setFotoModal(null)}
        >
          <button onClick={() => setFotoModal(null)} style={{ position: 'absolute', top: 20, right: 20, background: 'white', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={18} />
          </button>
          <img src={fotoModal} alt="Foto dokumen" style={{ maxWidth: '94vw', maxHeight: '86vh', borderRadius: 12, objectFit: 'contain' }} />
        </div>
      )}

      {/* Delete KK confirmation modal */}
      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px' }}>
          <div style={{ background: 'white', borderRadius: 16, padding: '24px 20px', width: '100%', maxWidth: 380 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <AlertTriangle size={22} color="var(--red)" />
              <div style={{ fontWeight: 800, fontSize: 16 }}>Hapus Data KK?</div>
            </div>
            <p style={{ fontSize: 13, color: 'var(--gray600)', marginBottom: 8, lineHeight: 1.5 }}>
              Seluruh data anggota keluarga di <b>No. {deleteTarget.noRumah}</b> akan dihapus permanen, termasuk data dokumen terlampir.
            </p>
            <p style={{ fontSize: 12, color: 'var(--gray500)', marginBottom: 20 }}>Kepala KK: <b>{deleteTarget.nama}</b></p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-ghost" style={{ flex: 1, height: 44, justifyContent: 'center' }}
                onClick={() => setDeleteTarget(null)} disabled={deleteLoading}>
                Batal
              </button>
              <button
                style={{ flex: 1, height: 44, background: 'var(--red)', color: 'white', border: 'none', borderRadius: 12, fontWeight: 800, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                onClick={confirmDeleteKk} disabled={deleteLoading}>
                {deleteLoading ? 'Menghapus...' : <><Trash2 size={14} /> Hapus KK</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail sheet */}
      {detail && (
        <div className="sheet-mask show" onClick={() => setDetail(null)}>
          <div className="sheet show" onClick={e => e.stopPropagation()} style={{ padding: '24px 20px', maxHeight: '88vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
              <div style={{ fontWeight: 800, fontSize: 16 }}>{detail.namaLengkap}</div>
              {canDeleteKk && detail.source === 'warga' && detail.noRumah && detail.kkStatus === 'kepala_kk' && (
                <button className="btn-ghost" style={{ color: 'var(--red)', borderColor: 'var(--red)', display: 'flex', alignItems: 'center', gap: 4 }}
                  onClick={() => setDeleteTarget({ id: detail.id, noRumah: detail.noRumah!, nama: detail.namaLengkap })}>
                  <Trash2 size={13} /> Hapus KK
                </button>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--gray500)', marginBottom: 14 }}>
              No. {detail.noRumah || '-'} · {detail.kkStatus === 'kepala_kk' ? 'Kepala KK' : (detail.hubunganKeluarga || 'Anggota')}
              {detail.phone && ` · ${detail.phone}`}
              {detail.source === 'pengurus' && detail.role && (
                <span className="pill" style={{ marginLeft: 6, background: 'var(--g50)', color: 'var(--g700)' }}>{detail.role.replace('_', ' ')}</span>
              )}
            </div>

            {/* Read-only info */}
            <div style={{ background: 'var(--gray50)', borderRadius: 10, padding: '10px 4px', marginBottom: 14 }}>
              {detail.agama && <div className="kv"><span className="k">Agama</span><span className="v">{agamaLabel(detail.agama)}</span></div>}
              {detail.jenisKelamin && <div className="kv"><span className="k">Jenis Kelamin</span><span className="v">{detail.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</span></div>}
              {detail.statusPerkawinan && <div className="kv"><span className="k">Status Kawin</span><span className="v">{detail.statusPerkawinan}</span></div>}
              {detail.statusHunian && <div className="kv"><span className="k">Hunian</span><span className="v">{detail.statusHunian}</span></div>}
              {detail.tanggalMenempati && <div className="kv" style={{ borderBottom: 'none' }}><span className="k">Mulai Menempati</span><span className="v">{detail.tanggalMenempati}</span></div>}
            </div>

            {/* Foto dokumen */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray600)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Image size={13} /> Foto Dokumen
              </div>
              {detail.fotoFiles && detail.fotoFiles.length > 0 ? (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {detail.fotoFiles.map((url, i) => {
                    const isPdf = url.startsWith('data:application/pdf') || /\.pdf(\?|$)/i.test(url)
                    return (
                      <button key={i} onClick={() => openDoc(url)}
                        style={{ border: `1.5px solid ${isPdf ? 'var(--red)' : 'var(--gray200)'}`, borderRadius: 10, overflow: 'hidden', width: 80, height: 80, padding: 0, cursor: 'pointer', background: 'var(--gray50)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4 }}>
                        {isPdf
                          ? <><FileText size={28} color="var(--red)" /><span style={{ fontSize: 9, color: 'var(--red)', fontWeight: 700 }}>PDF</span></>
                          : <img src={url} alt={`Foto ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        }
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div style={{ background: 'var(--gray50)', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--gray500)', fontSize: 12 }}>
                  Tidak ada foto/dokumen terlampir
                </div>
              )}
            </div>

            {/* Editable fields — only for warga records */}
            {detail.source === 'warga' && (
              <>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--gray500)', marginBottom: 8, letterSpacing: 0.5 }}>EDIT DATA</div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray600)', display: 'block', marginBottom: 3 }}>Nama Lengkap</label>
                <input className="inp" value={editForm.namaLengkap || ''} onChange={e => setEditForm(f => ({ ...f, namaLengkap: e.target.value }))} placeholder="Nama lengkap sesuai KTP" />
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray600)', display: 'block', marginBottom: 3 }}>NIK</label>
                <input className="inp" value={editForm.nik || ''} onChange={e => setEditForm(f => ({ ...f, nik: e.target.value }))} placeholder="16 digit NIK" maxLength={16} inputMode="numeric" />
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray600)', display: 'block', marginBottom: 3 }}>No. KK</label>
                <input className="inp" value={editForm.noKk || ''} onChange={e => setEditForm(f => ({ ...f, noKk: e.target.value }))} placeholder="16 digit No. KK" maxLength={16} inputMode="numeric" />
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray600)', display: 'block', marginBottom: 3 }}>No. Rumah / Blok</label>
                <input className="inp" value={editForm.noRumah || ''} onChange={e => setEditForm(f => ({ ...f, noRumah: e.target.value }))} placeholder="Mis. A-12 atau No. 5" />
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray600)', display: 'block', marginBottom: 3 }}>Tanggal Lahir</label>
                <input className="inp" type="date" value={editForm.tanggalLahir || ''} onChange={e => setEditForm(f => ({ ...f, tanggalLahir: e.target.value }))} />
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray600)', display: 'block', marginBottom: 3 }}>Tanggal Menempati</label>
                <input className="inp" type="date" value={(editForm as Record<string, string>).tanggalMenempati || ''} onChange={e => setEditForm(f => ({ ...f, tanggalMenempati: e.target.value }))} />
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray600)', display: 'block', marginBottom: 3 }}>Status Sosial</label>
                <select className="inp" value={editForm.statusSosial || ''} onChange={e => setEditForm(f => ({ ...f, statusSosial: e.target.value }))}>
                  <option value="">— pilih status sosial —</option>
                  {['mampu', 'kurang_mampu', 'tidak_mampu', 'lansia', 'disabilitas'].map(s => (
                    <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                  ))}
                </select>
                <button className="btn-primary" style={{ width: '100%', marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  disabled={loading} onClick={saveEdit}>
                  {loading ? 'Menyimpan...' : <><Save size={14} /> Simpan</>}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Search + Tabs */}
      <input className="inp" value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Cari nama, no. rumah, atau HP..." style={{ marginBottom: 12 }} />

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {(['warga', 'kk'] as const).map(t => (
          <button key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, height: 38, borderRadius: 20, border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: 13,
              background: tab === t ? 'var(--g600)' : 'var(--gray100)',
              color: tab === t ? 'white' : 'var(--gray600)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
            {t === 'warga' ? <><User size={14} /> Data Warga ({filtered.length})</> : <><Home size={14} /> Data KK ({kkGroups.length})</>}
          </button>
        ))}
      </div>

      {tab === 'warga' && (
        <>
          <button
            onClick={handleExportAll}
            disabled={buildingAll || list.length === 0}
            style={{ width: '100%', marginBottom: exportError ? 8 : 16, height: 40, borderRadius: 12, border: '1.5px solid var(--g600)', background: 'white', color: 'var(--g600)', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: buildingAll ? 0.7 : 1 }}>
            <FileDown size={15} /> {buildingAll ? 'Membuat PDF...' : `Export All PDF (${kkGroups.length} KK)`}
          </button>
          {exportError && (
            <div style={{ background: 'var(--red-l)', color: 'var(--red)', borderRadius: 10, padding: '8px 14px', fontSize: 12, marginBottom: 12 }}>
              {exportError}
            </div>
          )}
        </>
      )}

      {/* Tab: Data Warga */}
      {tab === 'warga' && (
        filtered.length === 0 ? (
          <div className="empty">
            <div className="e-i" style={{ display: 'flex', justifyContent: 'center' }}><Users size={38} color="var(--gray400)" /></div>
            <div className="e-t">Tidak ada warga ditemukan</div>
          </div>
        ) : (
          <>
            {visibleWargaEntries.map(([noRumah, wargaList]) => (
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
                          {w.source === 'pengurus' && <span className="pill" style={{ background: 'var(--blue-l)', color: 'var(--blue)' }}>Pengurus</span>}
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
            ))}
            {hasMore && <div ref={sentinelRef} style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray400)', fontSize: 12 }}>Memuat...</div>}
          </>
        )
      )}

      {/* Tab: Data KK */}
      {tab === 'kk' && (
        kkGroups.length === 0 ? (
          <div className="empty">
            <div className="e-i" style={{ display: 'flex', justifyContent: 'center' }}><Home size={38} color="var(--gray400)" /></div>
            <div className="e-t">Tidak ada data KK ditemukan</div>
          </div>
        ) : (
          <>
          {visibleKkGroups.map(group => {
            const kepala = group.kepala
            const hasFoto = group.all.some(w => w.fotoFiles && w.fotoFiles.length > 0)
            return (
              <div key={group.noRumah} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--gray500)', textTransform: 'uppercase', letterSpacing: 1 }}>
                    No. {group.noRumah} · {group.all.length} jiwa
                    {hasFoto && <span style={{ marginLeft: 6, background: 'var(--blue-l)', color: 'var(--blue)', padding: '1px 6px', borderRadius: 6, fontSize: 10 }}>Ada Foto</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <button
                      className="btn-ghost"
                      style={{ fontSize: 11, color: 'var(--g600)', borderColor: 'var(--g300)', padding: '3px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
                      onClick={() => handleExportKk(group)}
                      disabled={buildingKk === group.noRumah}
                      title="Export PDF">
                      <FileDown size={11} /> {buildingKk === group.noRumah ? '...' : 'PDF'}
                    </button>
                    {canDeleteKk && kepala && kepala.source === 'warga' && (
                      <button className="btn-ghost" style={{ fontSize: 11, color: 'var(--red)', borderColor: 'var(--red)', padding: '3px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
                        onClick={() => setDeleteTarget({ id: kepala.id, noRumah: group.noRumah, nama: kepala.namaLengkap })}>
                        <Trash2 size={11} /> Hapus KK
                      </button>
                    )}
                  </div>
                </div>
                <div className="peng-card">
                  {group.all.map(w => (
                    <div key={w.id} className="peng-item" style={{ cursor: 'pointer' }} onClick={() => openDetail(w)}>
                      <div className="pi-ico" style={{ background: w.kkStatus === 'kepala_kk' ? 'var(--g50)' : 'var(--gray100)' }}>
                        <User size={18} color={w.kkStatus === 'kepala_kk' ? 'var(--g600)' : 'var(--gray500)'} />
                      </div>
                      <div className="pi-body">
                        <div className="pi-t">
                          {w.namaLengkap}
                          {w.kkStatus === 'kepala_kk' && <span className="pill" style={{ background: 'var(--g50)', color: 'var(--g700)' }}>Kepala KK</span>}
                          {w.fotoFiles && w.fotoFiles.length > 0 && (
                            <span className="pill" style={{ background: 'var(--blue-l)', color: 'var(--blue)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                              <Image size={10} /> {w.fotoFiles.length} foto
                            </span>
                          )}
                        </div>
                        <div className="pi-d">
                          {w.hubunganKeluarga || (w.kkStatus === 'kepala_kk' ? 'Kepala Keluarga' : 'Anggota')}
                          {w.agama && ` · ${agamaLabel(w.agama)}`}
                        </div>
                        {w.phone && <div className="pi-d" style={{ color: 'var(--g600)' }}>{w.phone}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
          {hasMore && <div ref={sentinelRef} style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray400)', fontSize: 12 }}>Memuat...</div>}
          </>
        )
      )}
    </>
  )
}
