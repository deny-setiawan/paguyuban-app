'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquare, AlertTriangle, Clock, CheckCircle, RefreshCw, Lock, LogIn } from 'lucide-react'

function getCookie(name: string): string {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
  return match ? decodeURIComponent(match[1]) : ''
}

function clearCookie(name: string) {
  document.cookie = name + '=; Max-Age=0; path=/'
}

export default function OtpPage() {
  const router = useRouter()
  const [otp, setOtp] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(300)
  const [adminMode, setAdminMode] = useState(false)
  const [password, setPassword] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const p = sessionStorage.getItem('otp_phone')
    if (!p) { router.replace('/login'); return }
    setPhone(p)

    // Cek cookie admin_bp yang di-set oleh send-otp API
    const adminPhone = getCookie('admin_bp')
    if (adminPhone) {
      clearCookie('admin_bp')
      setAdminMode(true)
      return
    }

    inputRef.current?.focus()

    const timer = setInterval(() => setCountdown(c => {
      if (c <= 1) { clearInterval(timer); return 0 }
      return c - 1
    }), 1000)
    return () => clearInterval(timer)
  }, [router])

  const minutes = Math.floor(countdown / 60)
  const seconds = countdown % 60

  async function handleAdminLogin(e: React.FormEvent) {
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
      const pengurusRoles = ['ketua', 'wakil_ketua', 'sekretaris', 'bendahara', 'humas', 'lingkungan', 'keamanan', 'peralatan', 'admin']
      router.replace(pengurusRoles.includes(data.role) ? '/pengurus' : '/')
    } catch {
      setError('Terjadi kesalahan jaringan')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (otp.length !== 6) { setError('Masukkan 6 digit kode OTP'); return }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Kode salah'); return }

      sessionStorage.removeItem('otp_phone')
      const pengurusRoles = ['ketua', 'wakil_ketua', 'sekretaris', 'bendahara', 'humas', 'lingkungan', 'keamanan', 'peralatan', 'admin']
      if (pengurusRoles.includes(data.role)) {
        router.replace('/pengurus')
      } else {
        router.replace('/')
      }
    } catch {
      setError('Terjadi kesalahan jaringan')
    } finally {
      setLoading(false)
    }
  }

  async function resendOtp() {
    if (countdown > 0) return
    setError('')
    try {
      await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })
      setCountdown(300)
      setOtp('')
      inputRef.current?.focus()
    } catch {
      setError('Gagal mengirim ulang OTP')
    }
  }

  if (adminMode) {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <div className="auth-logo"><Lock size={36} color="var(--g600)" /></div>
          <h1 className="auth-t">Masuk — Admin</h1>
          <p className="auth-d">Masukkan sandi untuk melanjutkan</p>

          <form onSubmit={handleAdminLogin}>
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
            <button type="submit" className="btn-p" disabled={loading}>
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

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo"><MessageSquare size={36} color="var(--g600)" /></div>
        <h1 className="auth-t">Masukkan Kode OTP</h1>
        <p className="auth-d">
          Kode 6 digit telah dikirim via WhatsApp ke<br />
          <strong>{phone ? phone.replace(/(\d{2})(\d+)(\d{4})/, '$1****$3') : '...'}</strong>
        </p>

        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            className="auth-input otp"
            placeholder="000000"
            maxLength={6}
            value={otp}
            onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            autoComplete="one-time-code"
          />
          {error && (
            <div className="ib red" style={{ marginTop: 10, marginBottom: 10 }}>
              <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} /><div>{error}</div>
            </div>
          )}
          <p className="auth-hint">
            {countdown > 0
              ? `Kode berlaku ${minutes}:${String(seconds).padStart(2, '0')} menit`
              : 'Kode sudah kadaluarsa'}
          </p>
          <button type="submit" className="btn-p" disabled={loading || otp.length !== 6}>
            {loading ? <><Clock size={16} /> Memverifikasi…</> : <><CheckCircle size={16} /> Verifikasi</>}
          </button>
        </form>

        <div className="auth-footer">
          Tidak menerima kode?{' '}
          <button className="auth-link" onClick={resendOtp} disabled={countdown > 0}>
            {countdown > 0 ? `Kirim ulang (${minutes}:${String(seconds).padStart(2, '0')})` : 'Kirim ulang OTP'}
          </button>
        </div>
        <div className="auth-footer">
          <button className="auth-link" onClick={() => router.push('/login')}>
            ← Ganti nomor HP
          </button>
        </div>
      </div>
    </div>
  )
}
