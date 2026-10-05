'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, LogIn, AlertTriangle, Clock } from 'lucide-react'

function getCookie(name: string): string {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
  return match ? decodeURIComponent(match[1]) : ''
}

function clearCookie(name: string) {
  document.cookie = name + '=; Max-Age=0; path=/'
}

export default function AdminLoginPage() {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Ambil phone dari sessionStorage (diset oleh login page) atau cookie admin_bp
    const p = sessionStorage.getItem('otp_phone') || getCookie('admin_bp')
    if (!p) { router.replace('/login'); return }
    setPhone(p)
    clearCookie('admin_bp')
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!password) { setError('Sandi wajib diisi'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Sandi salah'); return }

      sessionStorage.removeItem('otp_phone')
      router.replace('/pengurus')
    } catch {
      setError('Terjadi kesalahan jaringan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo"><Lock size={36} color="var(--g600)" /></div>
        <h1 className="auth-t">Masuk — Admin</h1>
        <p className="auth-d">Masukkan sandi untuk melanjutkan</p>

        <form onSubmit={handleSubmit}>
          <label className="auth-label" htmlFor="password">Sandi</label>
          <input
            id="password"
            type="password"
            className="auth-input"
            placeholder="Masukkan sandi"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoFocus
          />
          {error && (
            <div className="ib red" style={{ marginTop: 10 }}>
              <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} /><div>{error}</div>
            </div>
          )}
          <button type="submit" className="btn-p" disabled={loading || !phone}>
            {loading ? <><Clock size={16} /> Memverifikasi…</> : <><LogIn size={16} /> Masuk</>}
          </button>
        </form>

        <div className="auth-footer">
          <button className="auth-link" onClick={() => router.push('/login')}>
            ← Ganti nomor HP
          </button>
        </div>
      </div>
    </div>
  )
}
