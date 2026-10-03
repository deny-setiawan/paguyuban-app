'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { normalizePhone } from '@/lib/utils'
import { Building2, AlertTriangle, Clock, Send, Lock, LogIn } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [adminMode, setAdminMode] = useState(false)
  const [adminPhone, setAdminPhone] = useState('')
  const [password, setPassword] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!phone.trim()) { setError('Nomor HP wajib diisi'); return }

    setLoading(true)
    try {
      const normalized = normalizePhone(phone)
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalized }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Gagal mengirim OTP'); return }

      if (data.adminBypass) {
        setAdminPhone(data.phone)
        setAdminMode(true)
        return
      }

      sessionStorage.setItem('otp_phone', data.phone)
      router.push('/otp')
    } catch {
      setError('Terjadi kesalahan jaringan')
    } finally {
      setLoading(false)
    }
  }

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!password) { setError('Sandi wajib diisi'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: adminPhone, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Sandi salah'); return }

      const role = data.role
      const isAdmin = ['ketua', 'wakil_ketua', 'sekretaris', 'bendahara', 'humas', 'lingkungan', 'keamanan', 'peralatan', 'admin'].includes(role)
      router.push(isAdmin ? '/pengurus' : '/')
    } catch {
      setError('Terjadi kesalahan jaringan')
    } finally {
      setLoading(false)
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
            <button className="auth-link" onClick={() => { setAdminMode(false); setPassword(''); setError('') }}>
              ← Kembali
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo"><Building2 size={36} color="var(--g600)" /></div>
        <h1 className="auth-t">Masuk ke Paguyuban</h1>
        <p className="auth-d">Masukkan nomor WhatsApp Anda untuk menerima kode OTP</p>

        <form onSubmit={handleSubmit}>
          <label className="auth-label" htmlFor="phone">Nomor WhatsApp</label>
          <input
            id="phone"
            type="tel"
            className="auth-input"
            placeholder="Contoh: 08123456789"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            autoComplete="tel"
            autoFocus
          />
          {error && (
            <div className="ib red" style={{ marginTop: 10 }}>
              <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} /><div>{error}</div>
            </div>
          )}
          <p className="auth-hint">
            Kode OTP akan dikirim via WhatsApp ke nomor ini. Pastikan WhatsApp aktif.
          </p>
          <button type="submit" className="btn-p" disabled={loading}>
            {loading ? <><Clock size={16} /> Mengirim OTP…</> : <><Send size={16} /> Kirim Kode OTP</>}
          </button>
        </form>

        <div className="auth-footer">
          Belum terdaftar?{' '}
          <button className="auth-link" onClick={() => router.push('/register')}>
            Daftar sebagai warga baru
          </button>
        </div>
      </div>
    </div>
  )
}
