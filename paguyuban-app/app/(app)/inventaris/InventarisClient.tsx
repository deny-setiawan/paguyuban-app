'use client'

import { useState } from 'react'
import { rupiah } from '@/lib/utils'
import { Package, CheckCircle } from 'lucide-react'

interface Item {
  id: string
  nama: string
  hargaSewa: number | null
  stokTotal: number | null
  stok: number | null
  fotoUrl: string | null
  deskripsi: string | null
}

interface Props {
  items: Item[]
  profileName: string | null
  profilePhone: string | null
}

export default function InventarisClient({ items, profileName, profilePhone }: Props) {
  const [sewaItem, setSewaItem] = useState<Item | null>(null)
  const [sewaNama, setSewaNama] = useState(profileName || '')
  const [sewaHp, setSewaHp] = useState(profilePhone || '')
  const [sewaTgl, setSewaTgl] = useState('')
  const [sewaTglKembali, setSewaTglKembali] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [done, setDone] = useState(false)
  const [localItems, setLocalItems] = useState(items)

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
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Gagal memproses sewa')
    } finally { setLoading(false) }
  }

  return (
    <>
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
              <Package size={18} /> Pinjam: {sewaItem.nama}
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

      {localItems.length === 0 ? (
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
              <div style={{ marginTop: 12 }}>
                {(item.stok || 0) > 0 ? (
                  <button className="btn-p" style={{ height: 40 }} onClick={() => openSewa(item)}>
                    <Package size={14} /> Pinjam / Sewa
                  </button>
                ) : (
                  <div style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--gray100)', borderRadius: 12, fontSize: 13, fontWeight: 700, color: 'var(--gray400)' }}>
                    Stok habis
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
