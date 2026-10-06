'use client'

import { useState } from 'react'
import { rupiah } from '@/lib/utils'
import { Package, CheckCircle, Clock, RotateCcw, Calendar } from 'lucide-react'

interface Item {
  id: string
  nama: string
  hargaSewa: number | null
  stokTotal: number | null
  stok: number | null
  fotoUrl: string | null
  deskripsi: string | null
}

interface SewaItem {
  id: string
  inventarisId: string
  inventarisNama: string | null
  tglSewa: string
  tglKembaliRencana: string | null
  jumlah: number | null
  hargaSatuan: number | null
  total: number | null
}

interface RiwayatItem {
  id: string
  inventarisNama: string | null
  tglSewa: string
  tglKembali: string | null
  jumlah: number | null
  total: number | null
}

interface Props {
  items: Item[]
  activeSewa: SewaItem[]
  riwayat: RiwayatItem[]
  profileId: string
  profileName: string | null
  profilePhone: string | null
}

export default function InventarisClient({ items, activeSewa: initialSewa, riwayat: initialRiwayat, profileName, profilePhone }: Props) {
  const [tab, setTab] = useState<'daftar' | 'aktif' | 'riwayat'>('daftar')
  const [sewaItem, setSewaItem] = useState<Item | null>(null)
  const [sewaNama, setSewaNama] = useState(profileName || '')
  const [sewaHp, setSewaHp] = useState(profilePhone || '')
  const [sewaTgl, setSewaTgl] = useState('')
  const [sewaTglKembali, setSewaTglKembali] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [done, setDone] = useState(false)
  const [localItems, setLocalItems] = useState(items)
  const [activeSewa, setActiveSewa] = useState(initialSewa)
  const [riwayatList, setRiwayatList] = useState(initialRiwayat)
  const [ubahTglTarget, setUbahTglTarget] = useState<SewaItem | null>(null)
  const [newTglKembali, setNewTglKembali] = useState('')
  const [ubahLoading, setUbahLoading] = useState(false)
  const [kembalikanLoading, setKembalikanLoading] = useState<string | null>(null)

  function openSewa(item: Item) {
    setSewaItem(item); setSewaNama(profileName || ''); setSewaHp(profilePhone || '')
    setSewaTgl(''); setSewaTglKembali(''); setMsg(''); setDone(false)
  }

  async function submitSewa() {
    if (!sewaItem) return
    if (!sewaNama.trim()) { setMsg('Nama penyewa wajib diisi'); return }
    if (!sewaTgl) { setMsg('Tanggal sewa wajib diisi'); return }
    setLoading(true); setMsg('')
    try {
      const res = await fetch('/api/inventaris', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sewa', inventarisId: sewaItem.id,
          penyewaNama: sewaNama, penyewaHp: sewaHp, jumlah: 1,
          tglSewa: sewaTgl, tglKembaliRencana: sewaTglKembali || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDone(true)
      setLocalItems(prev => prev.map(i => i.id === sewaItem.id ? { ...i, stok: (i.stok || 1) - 1 } : i))
      // Reload page to get updated activeSewa
      window.location.reload()
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Gagal memproses sewa')
    } finally { setLoading(false) }
  }

  async function kembalikan(sewaId: string, inventarisId: string) {
    setKembalikanLoading(sewaId)
    try {
      const today = new Date().toISOString().split('T')[0]
      const sewaToReturn = activeSewa.find(s => s.id === sewaId)
      const res = await fetch(`/api/inventaris-sewa/${sewaId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'kembalikan', tglKembali: today, inventarisId }),
      })
      if (res.ok) {
        setActiveSewa(prev => prev.filter(s => s.id !== sewaId))
        setLocalItems(prev => prev.map(i => i.id === inventarisId ? { ...i, stok: (i.stok || 0) + 1 } : i))
        if (sewaToReturn) {
          setRiwayatList(prev => [{
            id: sewaToReturn.id,
            inventarisNama: sewaToReturn.inventarisNama,
            tglSewa: sewaToReturn.tglSewa,
            tglKembali: today,
            jumlah: sewaToReturn.jumlah,
            total: sewaToReturn.total,
          }, ...prev])
        }
      }
    } catch {}
    setKembalikanLoading(null)
  }

  async function ubahTanggal() {
    if (!ubahTglTarget || !newTglKembali) return
    setUbahLoading(true)
    try {
      const res = await fetch(`/api/inventaris-sewa/${ubahTglTarget.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ubah_tanggal', tglKembaliRencana: newTglKembali }),
      })
      if (res.ok) {
        setActiveSewa(prev => prev.map(s => s.id === ubahTglTarget.id ? { ...s, tglKembaliRencana: newTglKembali } : s))
        setUbahTglTarget(null)
      }
    } catch {}
    setUbahLoading(false)
  }

  return (
    <>
      {/* Sewa sheet */}
      {sewaItem && <div className="sheet-mask show" onClick={() => setSewaItem(null)} />}
      <div className={`sheet${sewaItem ? ' show' : ''}`}>
        <div className="sheet-grip" />
        {done ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <CheckCircle size={52} color="var(--g500)" />
            </div>
            <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--gray800)', marginBottom: 8 }}>Permintaan sewa terkirim!</div>
            <div style={{ fontSize: 13, color: 'var(--gray500)' }}>Pengurus RT akan mengonfirmasi via WhatsApp.</div>
            <button className="btn-p" style={{ marginTop: 20 }} onClick={() => setSewaItem(null)}>Tutup</button>
          </div>
        ) : sewaItem && (
          <>
            <div className="sheet-h" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Package size={18} /> Sewa: {sewaItem.nama}
            </div>
            <div style={{ background: 'var(--gray50)', borderRadius: 12, padding: '10px 4px', marginBottom: 14 }}>
              <div className="kv"><span className="k">Harga sewa</span><span className="v">{sewaItem.hargaSewa ? rupiah(sewaItem.hargaSewa) + '/hari' : 'Gratis'}</span></div>
              <div className="kv" style={{ borderBottom: 'none' }}><span className="k">Stok tersedia</span><span className="v">{sewaItem.stok ?? 0}</span></div>
            </div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray600)' }}>Nama Penyewa *</label>
            <input className="rl-in" placeholder="Nama lengkap" value={sewaNama} onChange={e => setSewaNama(e.target.value)} />
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray600)' }}>No. HP / WhatsApp</label>
            <input className="rl-in" inputMode="tel" placeholder="0812xxxxxxxx" value={sewaHp} onChange={e => setSewaHp(e.target.value)} />
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray600)' }}>Tanggal Sewa *</label>
            <input className="rl-in" type="date" value={sewaTgl} onChange={e => setSewaTgl(e.target.value)} />
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray600)' }}>Rencana Tanggal Kembali</label>
            <input className="rl-in" type="date" value={sewaTglKembali} onChange={e => setSewaTglKembali(e.target.value)} />
            {msg && <div style={{ fontSize: 12, color: 'var(--red)', padding: '8px 12px', background: 'var(--red-l)', borderRadius: 10, marginBottom: 8 }}>{msg}</div>}
            <button className="btn-p" onClick={submitSewa} disabled={loading}>
              {loading ? 'Memproses…' : <><Package size={16} /> Ajukan Pinjam / Sewa</>}
            </button>
            <button className="rl-b" style={{ width: '100%', height: 44, marginTop: 8 }} onClick={() => setSewaItem(null)}>Batal</button>
          </>
        )}
      </div>

      {/* Ubah tanggal kembali modal */}
      {ubahTglTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px' }}
          onClick={() => !ubahLoading && setUbahTglTarget(null)}>
          <div style={{ background: 'white', borderRadius: 16, padding: '24px 20px', width: '100%', maxWidth: 360 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 12 }}>Ubah Tanggal Kembali</div>
            <div style={{ fontSize: 13, color: 'var(--gray600)', marginBottom: 12 }}>
              Barang: <b>{ubahTglTarget.inventarisNama}</b>
            </div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray600)', display: 'block', marginBottom: 6 }}>Tanggal Kembali Baru</label>
            <input className="rl-in" type="date" value={newTglKembali} onChange={e => setNewTglKembali(e.target.value)} />
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="rl-b" style={{ flex: 1, height: 44 }} onClick={() => setUbahTglTarget(null)} disabled={ubahLoading}>Batal</button>
              <button className="btn-p" style={{ flex: 2, height: 44 }} onClick={ubahTanggal} disabled={ubahLoading || !newTglKembali}>
                {ubahLoading ? 'Menyimpan…' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, background: 'var(--gray100)', borderRadius: 12, padding: 4 }}>
        {[
          { id: 'daftar' as const, label: 'Daftar Barang' },
          { id: 'aktif' as const, label: `Sewa Aktif${activeSewa.length > 0 ? ` (${activeSewa.length})` : ''}` },
          { id: 'riwayat' as const, label: 'Riwayat' },
        ].map(({ id: t, label }) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ flex: 1, padding: '8px 4px', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 12,
              background: tab === t ? 'var(--g600)' : 'transparent', color: tab === t ? 'white' : 'var(--gray500)',
              boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, position: 'relative' }}>
            {t === 'aktif' && activeSewa.length > 0 && tab !== t && (
              <span style={{ background: 'var(--red)', color: 'white', borderRadius: 20, fontSize: 10, fontWeight: 800, width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{activeSewa.length}</span>
            )}
            {label}
          </button>
        ))}
      </div>

      {/* Tab: Daftar Inventaris */}
      {tab === 'daftar' && (
        localItems.length === 0 ? (
          <div className="empty">
            <div className="e-i" style={{ display: 'flex', justifyContent: 'center' }}><Package size={38} color="var(--gray400)" /></div>
            <div className="e-t">Belum ada inventaris</div>
            <div className="e-d">Data barang inventaris RT belum tersedia.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {localItems.map(item => (
              <div key={item.id} className="iv-card">
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ width: 52, height: 52, borderRadius: 12, background: 'var(--gold-l)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Package size={26} color="var(--gold)" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--gray800)' }}>{item.nama}</div>
                    {item.deskripsi && <div style={{ fontSize: 12, color: 'var(--gray500)', marginTop: 2 }}>{item.deskripsi}</div>}
                    <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 12, color: 'var(--gray500)' }}>
                      <span>Stok: <b>{item.stok ?? 0}</b>/{item.stokTotal ?? 0}</span>
                      <span>{item.hargaSewa ? rupiah(item.hargaSewa) + '/hari' : 'Gratis'}</span>
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                  {(item.stok || 0) > 0 ? (
                    <button className="btn-p" style={{ flex: 2, height: 38 }} onClick={() => openSewa(item)}>
                      <Package size={14} /> Sewa
                    </button>
                  ) : (
                    <div style={{ flex: 2, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--gray100)', borderRadius: 12, fontSize: 13, fontWeight: 700, color: 'var(--gray400)' }}>
                      Stok habis
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Tab: Sewa Aktif */}
      {tab === 'aktif' && (
        activeSewa.length === 0 ? (
          <div className="empty">
            <div className="e-i" style={{ display: 'flex', justifyContent: 'center' }}><Clock size={38} color="var(--gray400)" /></div>
            <div className="e-t">Tidak ada sewa aktif</div>
            <div className="e-d">Barang yang sedang Anda sewa akan muncul di sini.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {activeSewa.map(s => (
              <div key={s.id} className="iv-card">
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--gold-l)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Package size={22} color="var(--gold)" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--gray800)' }}>{s.inventarisNama || '—'}</div>
                    <div style={{ fontSize: 12, color: 'var(--gray500)', marginTop: 2 }}>
                      Mulai: <b>{s.tglSewa}</b>
                    </div>
                    <div style={{ fontSize: 12, color: s.tglKembaliRencana ? 'var(--gray500)' : 'var(--orange)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Calendar size={11} />
                      {s.tglKembaliRencana ? <>Kembali: <b>{s.tglKembaliRencana}</b></> : 'Belum ada rencana kembali'}
                    </div>
                    {s.total ? <div style={{ fontSize: 12, color: 'var(--gray500)', marginTop: 2 }}>Total: {rupiah(s.total)}</div> : null}
                  </div>
                </div>
                <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                  <button className="btn-ghost" style={{ flex: 1, height: 36, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                    onClick={() => { setUbahTglTarget(s); setNewTglKembali(s.tglKembaliRencana || '') }}>
                    <Calendar size={13} /> Ubah Tgl Kembali
                  </button>
                  <button
                    style={{ flex: 1, height: 36, background: 'var(--g50)', color: 'var(--g700)', border: '1.5px solid var(--g200)', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                    disabled={kembalikanLoading === s.id}
                    onClick={() => kembalikan(s.id, s.inventarisId)}>
                    <RotateCcw size={13} /> {kembalikanLoading === s.id ? '…' : 'Dikembalikan'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Tab: Riwayat */}
      {tab === 'riwayat' && (
        riwayatList.length === 0 ? (
          <div className="empty">
            <div className="e-i" style={{ display: 'flex', justifyContent: 'center' }}><RotateCcw size={38} color="var(--gray400)" /></div>
            <div className="e-t">Belum ada riwayat</div>
            <div className="e-d">Barang yang sudah Anda kembalikan akan muncul di sini.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {riwayatList.map(r => (
              <div key={r.id} className="iv-card">
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--gray100)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <RotateCcw size={20} color="var(--gray400)" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--gray800)' }}>{r.inventarisNama || '—'}</div>
                    <div style={{ fontSize: 12, color: 'var(--gray500)', marginTop: 2 }}>Sewa: <b>{r.tglSewa}</b></div>
                    {r.tglKembali && <div style={{ fontSize: 12, color: 'var(--g600)', marginTop: 2 }}>Dikembalikan: <b>{r.tglKembali}</b></div>}
                    {r.total ? <div style={{ fontSize: 12, color: 'var(--gray500)', marginTop: 2 }}>Total: {rupiah(r.total)}</div> : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </>
  )
}
