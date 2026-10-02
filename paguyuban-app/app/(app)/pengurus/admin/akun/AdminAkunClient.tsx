'use client'

import { useState } from 'react'
import { User, Users, CheckCircle, XCircle, Save } from 'lucide-react'

interface AkunItem {
  id: string
  phone: string
  fullName: string | null
  role: string
  isActive: boolean
  noRumah: string | null
  createdAt: string
}

const ROLES = ['warga', 'ketua', 'sekretaris', 'bendahara', 'admin']
const ROLE_COLOR: Record<string, string> = {
  warga: 'var(--gray100)', ketua: 'var(--g50)', sekretaris: 'var(--blue-l)',
  bendahara: 'var(--gold-l)', admin: 'var(--purple-l)',
}
const ROLE_ICON_COLOR: Record<string, string> = {
  warga: 'var(--gray500)', ketua: 'var(--g600)', sekretaris: 'var(--blue)',
  bendahara: 'var(--gold)', admin: 'var(--purple)',
}

export default function AdminAkunClient({ items, currentUserId }: { items: AkunItem[], currentUserId: string }) {
  const [list, setList] = useState(items)
  const [search, setSearch] = useState('')
  const [detail, setDetail] = useState<AkunItem | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedRole, setSelectedRole] = useState('')
  const [selectedActive, setSelectedActive] = useState<boolean | null>(null)

  function openDetail(item: AkunItem) {
    setDetail(item)
    setSelectedRole(item.role)
    setSelectedActive(item.isActive)
  }

  async function saveChanges() {
    if (!detail) return
    setLoading(true)
    const res = await fetch('/api/admin/akun', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: detail.id,
        role: selectedRole,
        isActive: selectedActive,
      }),
    })
    if (res.ok) {
      setList(prev => prev.map(a => a.id === detail.id
        ? { ...a, role: selectedRole, isActive: selectedActive ?? a.isActive }
        : a
      ))
      setDetail(null)
    }
    setLoading(false)
  }

  const filtered = list.filter(a =>
    (a.fullName || '').toLowerCase().includes(search.toLowerCase()) ||
    a.phone.includes(search) ||
    (a.noRumah || '').includes(search)
  )

  return (
    <>
      {detail && (
        <div className="sheet-mask show" onClick={() => setDetail(null)}>
          <div className="sheet show" onClick={e => e.stopPropagation()} style={{ padding: '24px 20px' }}>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>{detail.fullName || detail.phone}</div>
            <div style={{ fontSize: 12, color: 'var(--gray500)', marginBottom: 16 }}>{detail.phone} · No. {detail.noRumah || '-'}</div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray600)', display: 'block', marginBottom: 6 }}>Role</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {ROLES.map(r => (
                  <button key={r} type="button"
                    disabled={detail.id === currentUserId && r !== 'admin'}
                    onClick={() => setSelectedRole(r)}
                    style={{
                      padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                      background: selectedRole === r ? 'var(--g600)' : 'var(--gray100)',
                      color: selectedRole === r ? 'white' : 'var(--gray700)',
                      textTransform: 'capitalize',
                    }}>
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray600)', display: 'block', marginBottom: 6 }}>Status Akun</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[true, false].map(v => (
                  <button key={String(v)} type="button"
                    onClick={() => setSelectedActive(v)}
                    style={{
                      flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13,
                      background: selectedActive === v ? (v ? 'var(--g600)' : 'var(--red)') : 'var(--gray100)',
                      color: selectedActive === v ? 'white' : 'var(--gray700)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}>
                    {v ? <><CheckCircle size={13} /> Aktif</> : <><XCircle size={13} /> Nonaktif</>}
                  </button>
                ))}
              </div>
            </div>

            <button className="btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              disabled={loading} onClick={saveChanges}>
              {loading ? 'Menyimpan...' : <><Save size={14} /> Simpan Perubahan</>}
            </button>
          </div>
        </div>
      )}

      <input className="inp" value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Cari nama, HP, atau no. rumah..." style={{ marginBottom: 16 }} />

      {filtered.length === 0 ? (
        <div className="empty">
          <div className="e-i" style={{ display: 'flex', justifyContent: 'center' }}><Users size={38} color="var(--gray400)" /></div>
          <div className="e-t">Tidak ada akun ditemukan</div>
        </div>
      ) : (
        <div className="peng-card">
          {filtered.map(a => (
            <div key={a.id} className="peng-item" style={{ cursor: 'pointer' }} onClick={() => openDetail(a)}>
              <div className="pi-ico" style={{ background: ROLE_COLOR[a.role] || 'var(--gray100)' }}>
                <User size={18} color={ROLE_ICON_COLOR[a.role] || 'var(--gray500)'} />
              </div>
              <div className="pi-body">
                <div className="pi-t">
                  {a.fullName || a.phone}
                  <span className="pill" style={{ background: ROLE_COLOR[a.role], color: 'var(--gray700)', textTransform: 'capitalize' }}>{a.role}</span>
                  {!a.isActive && <span className="pill" style={{ background: 'var(--red-l)', color: 'var(--red)' }}>Nonaktif</span>}
                </div>
                <div className="pi-d">{a.phone} · No. {a.noRumah || '-'}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
