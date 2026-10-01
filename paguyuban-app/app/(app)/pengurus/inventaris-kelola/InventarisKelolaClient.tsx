'use client'

import { useState } from 'react'
import { rupiah } from '@/lib/utils'

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
}

export default function InventarisKelolaClient({ items, activeSewa }: { items: InvItem[], activeSewa: SewaItem[] }) {
  const [list, setList] = useState(items)
  const [tab, setTab] = useState<'inventaris' | 'sewa'>('inventaris')
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<InvItem | null>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ nama: '', hargaSewa: '', stokTotal: '1', stok: '1', deskripsi: '' })

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
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setList(prev => prev.map(i => i.id === editItem.id ? { ...i, ...body } : i))
        setShowForm(false)
      }
    } else {
      const res = await fetch('/api/inventaris', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  return (
    <>
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, background: 'var(--gray100)', borderRadius: 12, padding: 4 }}>
        {(['inventaris', 'sewa'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ flex: 1, padding: '8px 0', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 13,
              background: tab === t ? 'white' : 'transparent', color: tab === t ? 'var(--gray900)' : 'var(--gray500)',
              boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.1)' : 'none' }}>
            {t === 'inventaris' ? `📦 Barang (${list.length})` : `🔑 Sedang Disewa (${activeSewa.length})`}
          </button>
        ))}
      </div>

      {tab === 'inventaris' && (
        <>
          <button className="btn-primary" style={{ width: '100%', marginBottom: 12 }} onClick={openNew}>+ Tambah Barang</button>

          {list.length === 0 ? (
            <div className="empty"><div className="e-i">📦</div><div className="e-t">Belum ada barang</div></div>
          ) : (
            <div className="peng-card">
              {list.map(item => (
                <div key={item.id} className="peng-item" style={{ cursor: 'default' }}>
                  <div className="pi-ico" style={{ background: 'var(--gold-l)' }}>📦</div>
                  <div className="pi-body" style={{ flex: 1 }}>
                    <div className="pi-t">{item.nama}</div>
                    <div className="pi-d">Stok: {item.stok}/{item.stokTotal} · Sewa: {rupiah(item.hargaSewa)}/hari</div>
                    {item.deskripsi && <div className="pi-d">{item.deskripsi}</div>}
                    <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                      <button className="btn-ghost" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => openEdit(item)}>✏️ Edit</button>
                      <button className="btn-ghost" style={{ fontSize: 12, padding: '4px 10px', color: 'var(--red)' }} onClick={() => deleteItem(item.id)}>🗑</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'sewa' && (
        activeSewa.length === 0 ? (
          <div className="empty"><div className="e-i">🔑</div><div className="e-t">Tidak ada barang sedang disewa</div></div>
        ) : (
          <div className="peng-card">
            {activeSewa.map(s => (
              <div key={s.id} className="peng-item" style={{ cursor: 'default' }}>
                <div className="pi-ico" style={{ background: 'var(--blue-l)' }}>🔑</div>
                <div className="pi-body">
                  <div className="pi-t">{s.inventarisNama || '-'}</div>
                  <div className="pi-d">{s.penyewaNama} {s.penyewaHp ? `· ${s.penyewaHp}` : ''}</div>
                  <div className="pi-d">Tgl sewa: {s.tglSewa}{s.tglKembaliRencana ? ` → Kembali: ${s.tglKembaliRencana}` : ''}</div>
                  <div className="pi-d">Jumlah: {s.jumlah}</div>
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
              <input className="inp" required value={form.nama} onChange={e => setForm(f => ({ ...f, nama: e.target.value }))} placeholder="Nama barang..." />
              <input className="inp" type="number" min={0} value={form.hargaSewa} onChange={e => setForm(f => ({ ...f, hargaSewa: e.target.value }))} placeholder="Harga sewa per hari (Rp)" />
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="inp" type="number" min={1} value={form.stokTotal} onChange={e => setForm(f => ({ ...f, stokTotal: e.target.value }))} placeholder="Stok total" />
                <input className="inp" type="number" min={0} value={form.stok} onChange={e => setForm(f => ({ ...f, stok: e.target.value }))} placeholder="Stok tersedia" />
              </div>
              <textarea className="inp" rows={2} value={form.deskripsi} onChange={e => setForm(f => ({ ...f, deskripsi: e.target.value }))} placeholder="Deskripsi (opsional)..." style={{ resize: 'vertical' }} />
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
