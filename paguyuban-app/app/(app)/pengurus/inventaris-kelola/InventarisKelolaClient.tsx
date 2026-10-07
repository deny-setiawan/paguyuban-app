'use client'

import { useState } from 'react'
import { rupiah } from '@/lib/utils'
import { Package, Key, Pencil, Trash2, RotateCcw, History } from 'lucide-react'

interface InvItem {
  id: string
  nama: string
  hargaSewa: number | null
  stok: number | null
  stokTotal: number | null
  deskripsi: string | null
  fotoUrl: string | null
}

interface SewaItem {
  id: string
  inventarisNama: string | null
  penyewaNama: string
  penyewaHp: string | null
  tglSewa: string
  tglKembaliRencana: string | null
  jumlah: number | null
  inventarisId: string
  total: number | null
  catatanSewa: string | null
}

interface RiwayatItem {
  id: string
  inventarisNama: string | null
  penyewaNama: string
  penyewaHp: string | null
  tglSewa: string
  tglKembali: string | null
  tglKembaliRencana: string | null
  jumlah: number | null
  total: number | null
  catatanSewa: string | null
}

export default function InventarisKelolaClient({
  items,
  activeSewa,
  riwayat,
  initialTab = 'inventaris',
}: {
  items: InvItem[]
  activeSewa: SewaItem[]
  riwayat: RiwayatItem[]
  initialTab?: 'inventaris' | 'sewa' | 'riwayat'
}) {
  const [list, setList] = useState(items)
  const [tab, setTab] = useState<'inventaris' | 'sewa' | 'riwayat'>(initialTab)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<InvItem | null>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ nama: '', hargaSewa: '', stokTotal: '1', stok: '1', deskripsi: '' })
  const [sewaList, setSewaList] = useState(activeSewa)
  const [riwayatList, setRiwayatList] = useState(riwayat)
  const [kembalikanLoading, setKembalikanLoading] = useState<string | null>(null)

  function openNew() {
    setEditItem(null)
    setForm({ nama: '', hargaSewa: '', stokTotal: '1', stok: '1', deskripsi: '' })
    setShowForm(true)
  }

  function openEdit(item: InvItem) {
    setEditItem(item)
    setForm({
      nama: item.nama,
      hargaSewa: item.hargaSewa?.toString() || '',
      stokTotal: item.stokTotal?.toString() || '1',
      stok: item.stok?.toString() || '1',
      deskripsi: item.deskripsi || '',
    })
    setShowForm(true)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nama) return
    setLoading(true)
    const body = {
      nama: form.nama,
      hargaSewa: form.hargaSewa ? Number(form.hargaSewa) : 0,
      stokTotal: Number(form.stokTotal) || 1,
      stok: Number(form.stok) || Number(form.stokTotal) || 1,
      deskripsi: form.deskripsi || null,
    }
    if (editItem) {
      const res = await fetch(`/api/inventaris/${editItem.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setList(prev => prev.map(i => i.id === editItem.id ? { ...i, ...body } : i))
        setShowForm(false)
      }
    } else {
      const res = await fetch('/api/inventaris', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const { item } = await res.json()
        setList(prev => [...prev, item])
        setShowForm(false)
      }
    }
    setLoading(false)
  }

  async function deleteItem(id: string) {
    if (!confirm('Hapus barang ini?')) return
    await fetch(`/api/inventaris/${id}`, { method: 'DELETE' })
    setList(prev => prev.filter(i => i.id !== id))
  }

  async function kembalikan(s: SewaItem) {
    setKembalikanLoading(s.id)
    try {
      const today = new Date().toISOString().split('T')[0]
      const res = await fetch(`/api/inventaris-sewa/${s.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'kembalikan', tglKembali: today }),
      })
      if (res.ok) {
        setSewaList(prev => prev.filter(x => x.id !== s.id))
        setRiwayatList(prev => [{
          id: s.id,
          inventarisNama: s.inventarisNama,
          penyewaNama: s.penyewaNama,
          penyewaHp: s.penyewaHp,
          tglSewa: s.tglSewa,
          tglKembali: today,
          tglKembaliRencana: s.tglKembaliRencana,
          jumlah: s.jumlah,
          total: s.total,
          catatanSewa: s.catatanSewa,
        }, ...prev])
        setList(prev => prev.map(i =>
          i.id === s.inventarisId ? { ...i, stok: (i.stok || 0) + (s.jumlah || 1) } : i
        ))
      }
    } catch {}
    setKembalikanLoading(null)
  }

  const tabs = [
    { id: 'inventaris' as const, label: `Barang (${list.length})` },
    { id: 'sewa' as const, label: `Disewa (${sewaList.length})` },
    { id: 'riwayat' as const, label: 'Riwayat' },
  ]

  return (
    <>
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, background: 'var(--gray100)', borderRadius: 12, padding: 4 }}>
        {tabs.map(({ id: t, label }) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ flex: 1, padding: '8px 4px', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 12,
              background: tab === t ? 'white' : 'transparent', color: tab === t ? 'var(--gray900)' : 'var(--gray500)',
              boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'inventaris' && (
        <>
          <button className="btn-primary" style={{ width: '100%', marginBottom: 12 }} onClick={openNew}>+ Tambah Barang</button>
          {list.length === 0 ? (
            <div className="empty">
              <div className="e-i" style={{ display: 'flex', justifyContent: 'center' }}><Package size={38} color="var(--gray400)" /></div>
              <div className="e-t">Belum ada barang</div>
            </div>
          ) : (
            <div className="peng-card">
              {list.map(item => (
                <div key={item.id} className="peng-item" style={{ cursor: 'default' }}>
                  <div className="pi-ico" style={{ background: 'var(--gold-l)' }}><Package size={18} color="var(--gold)" /></div>
                  <div className="pi-body" style={{ flex: 1 }}>
                    <div className="pi-t">{item.nama}</div>
                    <div className="pi-d">Stok: {item.stok}/{item.stokTotal} · Sewa: {rupiah(item.hargaSewa)}/hari</div>
                    {item.deskripsi && <div className="pi-d">{item.deskripsi}</div>}
                    <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                      <button className="btn-ghost" style={{ fontSize: 12, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => openEdit(item)}>
                        <Pencil size={12} /> Edit
                      </button>
                      <button className="btn-ghost" style={{ fontSize: 12, padding: '4px 10px', color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => deleteItem(item.id)}>
                        <Trash2 size={12} /> Hapus
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'sewa' && (
        sewaList.length === 0 ? (
          <div className="empty">
            <div className="e-i" style={{ display: 'flex', justifyContent: 'center' }}><Key size={38} color="var(--gray400)" /></div>
            <div className="e-t">Tidak ada barang sedang disewa</div>
          </div>
        ) : (
          <div className="peng-card">
            {sewaList.map(s => (
              <div key={s.id} className="peng-item" style={{ cursor: 'default' }}>
                <div className="pi-ico" style={{ background: 'var(--blue-l)' }}><Key size={18} color="var(--blue)" /></div>
                <div className="pi-body" style={{ flex: 1 }}>
                  <div className="pi-t">{s.inventarisNama || '-'}</div>
                  <div className="pi-d">{s.penyewaNama}{s.penyewaHp ? ` · ${s.penyewaHp}` : ''}</div>
                  <div className="pi-d">Tgl sewa: {s.tglSewa}{s.tglKembaliRencana ? ` → ${s.tglKembaliRencana}` : ''}</div>
                  <div className="pi-d">Jumlah: {s.jumlah}{s.total ? ` · ${rupiah(s.total)}` : ''}</div>
                  {s.catatanSewa && <div className="pi-d" style={{ fontStyle: 'italic', color: 'var(--gray600)' }}>"{s.catatanSewa}"</div>}
                  <button
                    style={{ marginTop: 8, height: 34, background: 'var(--g50)', color: 'var(--g700)', border: '1.5px solid var(--g200)', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px' }}
                    disabled={kembalikanLoading === s.id}
                    onClick={() => kembalikan(s)}>
                    <RotateCcw size={13} />
                    {kembalikanLoading === s.id ? 'Memproses…' : 'Tandai Dikembalikan'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'riwayat' && (
        riwayatList.length === 0 ? (
          <div className="empty">
            <div className="e-i" style={{ display: 'flex', justifyContent: 'center' }}><History size={38} color="var(--gray400)" /></div>
            <div className="e-t">Belum ada riwayat penyewaan</div>
          </div>
        ) : (
          <div className="peng-card">
            {riwayatList.map(r => (
              <div key={r.id} className="peng-item" style={{ cursor: 'default' }}>
                <div className="pi-ico" style={{ background: 'var(--gray100)' }}><History size={18} color="var(--gray500)" /></div>
                <div className="pi-body">
                  <div className="pi-t">{r.inventarisNama || '-'}</div>
                  <div className="pi-d">{r.penyewaNama}{r.penyewaHp ? ` · ${r.penyewaHp}` : ''}</div>
                  <div className="pi-d">Sewa: {r.tglSewa}{r.tglKembali ? ` → Kembali: ${r.tglKembali}` : ''}</div>
                  {r.jumlah && r.jumlah > 1 ? <div className="pi-d">Jumlah: {r.jumlah}</div> : null}
                  {r.total ? <div className="pi-d">Total: {rupiah(r.total)}</div> : null}
                  {r.catatanSewa && <div className="pi-d" style={{ fontStyle: 'italic', color: 'var(--gray600)' }}>"{r.catatanSewa}"</div>}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {showForm && (
        <div className="sheet-mask show" onClick={() => setShowForm(false)}>
          <div className="sheet show" onClick={e => e.stopPropagation()} style={{ padding: '24px 20px' }}>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 16 }}>{editItem ? 'Edit Barang' : 'Tambah Barang'}</div>
            <form onSubmit={submit}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray600)', display: 'block', marginBottom: 4 }}>Nama Barang *</label>
              <input className="inp" required value={form.nama} onChange={e => setForm(f => ({ ...f, nama: e.target.value }))} placeholder="mis. Kursi lipat, Sound system" />
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray600)', display: 'block', marginBottom: 4 }}>Harga Sewa per Hari (Rp)</label>
              <input className="inp" type="number" min={0} value={form.hargaSewa} onChange={e => setForm(f => ({ ...f, hargaSewa: e.target.value }))} placeholder="0 = gratis" />
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray600)', display: 'block', marginBottom: 4 }}>Stok Total</label>
                  <input className="inp" type="number" min={1} value={form.stokTotal} onChange={e => setForm(f => ({ ...f, stokTotal: e.target.value }))} placeholder="1" />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray600)', display: 'block', marginBottom: 4 }}>Stok Tersedia</label>
                  <input className="inp" type="number" min={0} value={form.stok} onChange={e => setForm(f => ({ ...f, stok: e.target.value }))} placeholder="1" />
                </div>
              </div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray600)', display: 'block', marginBottom: 4 }}>Deskripsi</label>
              <textarea className="inp" rows={2} value={form.deskripsi} onChange={e => setForm(f => ({ ...f, deskripsi: e.target.value }))} placeholder="Keterangan tambahan (opsional)..." style={{ resize: 'vertical' }} />
              <button className="btn-primary" type="submit" style={{ width: '100%', marginTop: 8 }} disabled={loading}>
                {loading ? 'Menyimpan...' : editItem ? 'Simpan Perubahan' : 'Tambah'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
