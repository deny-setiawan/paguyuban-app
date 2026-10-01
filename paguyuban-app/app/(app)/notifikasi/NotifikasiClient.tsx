'use client'

import { useState } from 'react'
import { timeAgo } from '@/lib/utils'

interface NotifItem {
  id: string
  judul: string
  isi: string | null
  kategori: string | null
  prioritas: string | null
  isRead: boolean | null
  createdAt: string
}

interface Props { items: NotifItem[] }

const KAT_ICO: Record<string, string> = {
  iuran: '💳', surat: '✉️', laporan: '📝', pengumuman: '📢',
  kendaraan: '🚗', inventaris: '📦', sistem: '⚙️',
}
const KAT_BG: Record<string, string> = {
  iuran: 'var(--g50)', surat: 'var(--teal-l)', laporan: 'var(--purple-l)',
  pengumuman: 'var(--orange-l)', kendaraan: 'var(--gray100)',
  inventaris: 'var(--gold-l)', sistem: 'var(--blue-l)',
}

export default function NotifikasiClient({ items }: Props) {
  const [local, setLocal] = useState(items)

  async function markRead(id: string) {
    setLocal(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
    await fetch('/api/notifikasi', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).catch(() => {})
  }

  async function markAllRead() {
    setLocal(prev => prev.map(n => ({ ...n, isRead: true })))
    await fetch('/api/notifikasi', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    }).catch(() => {})
  }

  const unread = local.filter(n => !n.isRead).length

  return (
    <>
      {unread > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray600)' }}>{unread} belum dibaca</span>
          <button onClick={markAllRead}
            style={{ border: 'none', background: 'none', fontSize: 12, fontWeight: 700, color: 'var(--g600)', cursor: 'pointer', fontFamily: 'var(--f)' }}>
            Tandai semua dibaca
          </button>
        </div>
      )}

      {local.length === 0 ? (
        <div className="empty">
          <div className="e-i">🔔</div>
          <div className="e-t">Belum ada notifikasi</div>
          <div className="e-d">Pemberitahuan dari pengurus RT dan sistem akan muncul di sini.</div>
        </div>
      ) : (
        <div className="peng-card">
          {local.map(n => {
            const ico = KAT_ICO[n.kategori || ''] || '🔔'
            const bg = KAT_BG[n.kategori || ''] || 'var(--gray100)'
            const isPenting = n.prioritas === 'penting' || n.prioritas === 'tinggi'
            return (
              <div key={n.id}
                className="peng-item"
                style={{ cursor: n.isRead ? 'default' : 'pointer', background: n.isRead ? 'transparent' : 'var(--g50)', borderRadius: 12 }}
                onClick={() => !n.isRead && markRead(n.id)}
              >
                <div className="pi-ico" style={{ background: bg, position: 'relative' }}>
                  {ico}
                  {!n.isRead && (
                    <div style={{ position: 'absolute', top: 0, right: 0, width: 10, height: 10, borderRadius: '50%', background: 'var(--red)', border: '2px solid white' }} />
                  )}
                </div>
                <div className="pi-body">
                  <div className="pi-t">
                    {n.judul}
                    {isPenting && <span className="pill penting">Penting</span>}
                    {!n.isRead && <span className="pill belum">Baru</span>}
                  </div>
                  {n.isi && <div className="pi-d">{n.isi}</div>}
                  <div className="pi-time">{timeAgo(n.createdAt)}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
