'use client'

import { useState } from 'react'
import { timeAgo } from '@/lib/utils'

interface PItem {
  id: string
  judul: string
  isi: string | null
  kategori: string | null
  prioritas: string | null
  isPublished: boolean | null
  createdAt: string
}

const KATEGORI = ['umum', 'acara', 'keamanan', 'kebersihan', 'iuran', 'lainnya']
const PRIORITAS = ['normal', 'penting', 'tinggi']

export default function PengumumanKelolaClient({ items }: { items: PItem[] }) {
  const [list, setList] = useState(items)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<PItem | null>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ judul: '', isi: '', kategori: 'umum', prioritas: 'normal', isPublished: true })

  function openNew() {
    setEditItem(null)
    setForm({ judul: '', isi: '', kategori: 'umum', prioritas: 'normal', isPublished: true })
    setShowForm(true)
  }

  function openEdit(item: PItem) {
    setEditItem(item)
    setForm({
      judul: item.judul,
      isi: item.isi || '',
      kategori: item.kategori || 'umum',
      prioritas: item.prioritas || 'normal',
      isPublished: item.isPublished !== false,
    })
    setShowForm(true)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.judul) return
    setLoading(true)

    if (editItem) {
      const res = await fetch(`/api/pengumuman/${editItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setList(prev => prev.map(p => p.id === editItem.id ? { ...p, ...form } : p))
        setShowForm(false)
      }
    } else {
      const res = await fetch('/api/pengumuman', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        const { item } = await res.json()
        setList(prev => [{ ...item, createdAt: item.createdAt }, ...prev])
        setShowForm(false)
      }
    }
    setLoading(false)
  }

  async function deleteItem(id: string) {
    if (!confirm('Hapus pengumuman ini?')) return
    await fetch(`/api/pengumuman/${id}`, { method: 'DELETE' })
    setList(prev => prev.filter(p => p.id !== id))
  }

  async function togglePublish(item: PItem) {
    const newVal = !item.isPublished
    await fetch(`/api/pengumuman/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPublished: newVal }),
    })
    setList(prev => prev.map(p => p.id === item.id ? { ...p, isPublished: newVal } : p))
  }

  return (
    <>
      <button className="btn-primary" style={{ width: '100%', marginBottom: 16 }} onClick={openNew}>
        + Buat Pengumuman
      </button>

      {showForm && (
        <div className="sheet-mask show" onClick={() => setShowForm(false)}>
          <div className="sheet show" onClick={e => e.stopPropagation()} style={{ padding: '24px 20px' }}>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 16 }}>
              {editItem ? 'Edit Pengumuman' : 'Pengumuman Baru'}
            </div>
            <form onSubmit={submit}>
              <input className="inp" required value={form.judul} onChange={e => setForm(f => ({ ...f, judul: e.target.value }))} placeholder="Judul pengumuman..." />
              <textarea className="inp" rows={4} value={form.isi} onChange={e => setForm(f => ({ ...f, isi: e.target.value }))} placeholder="Isi pengumuman..." style={{ resize: 'vertical' }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <select className="inp" value={form.kategori} onChange={e => setForm(f => ({ ...f, kategori: e.target.value }))}>
                  {KATEGORI.map(k => <option key={k} value={k} style={{ textTransform: 'capitalize' }}>{k}</option>)}
                </select>
                <select className="inp" value={form.prioritas} onChange={e => setForm(f => ({ ...f, prioritas: e.target.value }))}>
                  {PRIORITAS.map(p => <option key={p} value={p} style={{ textTransform: 'capitalize' }}>{p}</option>)}
                </select>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, cursor: 'pointer', fontSize: 14 }}>
                <input type="checkbox" checked={form.isPublished} onChange={e => setForm(f => ({ ...f, isPublished: e.target.checked }))} />
                Publikasikan sekarang
              </label>
              <button className="btn-primary" type="submit" style={{ width: '100%', marginTop: 12 }} disabled={loading}>
                {loading ? 'Menyimpan...' : editItem ? 'Simpan Perubahan' : 'Publikasikan'}
              </button>
            </form>
          </div>
        </div>
      )}

      {list.length === 0 ? (
        <div className="empty">
          <div className="e-i">📢</div>
          <div className="e-t">Belum ada pengumuman</div>
          <div className="e-d">Buat pengumuman untuk warga RT</div>
        </div>
      ) : (
        <div className="peng-card">
          {list.map(item => (
            <div key={item.id} className="peng-item" style={{ cursor: 'default' }}>
              <div className="pi-ico" style={{ background: item.prioritas === 'penting' || item.prioritas === 'tinggi' ? 'var(--red-l)' : 'var(--orange-l)' }}>📢</div>
              <div className="pi-body" style={{ flex: 1 }}>
                <div className="pi-t">
                  {item.judul}
                  {!item.isPublished && <span className="pill" style={{ background: 'var(--gray100)', color: 'var(--gray600)' }}>Draft</span>}
                  {(item.prioritas === 'penting' || item.prioritas === 'tinggi') && <span className="pill penting">Penting</span>}
                </div>
                {item.isi && <div className="pi-d">{item.isi.substring(0, 80)}{item.isi.length > 80 ? '...' : ''}</div>}
                <div className="pi-time">{timeAgo(item.createdAt)}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button className="btn-ghost" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => openEdit(item)}>✏️ Edit</button>
                  <button className="btn-ghost" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => togglePublish(item)}>
                    {item.isPublished ? '🙈 Sembunyikan' : '👁 Publikasikan'}
                  </button>
                  <button className="btn-ghost" style={{ fontSize: 12, padding: '4px 10px', color: 'var(--red)' }} onClick={() => deleteItem(item.id)}>🗑</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
