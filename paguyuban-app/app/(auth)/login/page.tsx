'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { normalizePhone } from '@/lib/utils'

export default function LoginPage() {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

      sessionStorage.setItem('otp_phone', data.phone)
      router.push('/otp')
    } catch {
      setError('Terjadi kesalahan jaringan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">🏘️</div>
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
              <span>⚠️</span><div>{error}</div>
            </div>
          )}
          <p className="auth-hint">
            Kode OTP akan dikirim via WhatsApp ke nomor ini. Pastikan WhatsApp aktif.
          </p>
          <button type="submit" className="btn-p" disabled={loading}>
            {loading ? '⏳ Mengirim OTP…' : '📱 Kirim Kode OTP'}
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
