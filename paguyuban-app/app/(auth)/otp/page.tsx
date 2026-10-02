'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquare, AlertTriangle, Clock, CheckCircle, RefreshCw } from 'lucide-react'

export default function OtpPage() {
  const router = useRouter()
  const [otp, setOtp] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(300) // 5 minutes
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const p = sessionStorage.getItem('otp_phone')
    if (!p) { router.replace('/login'); return }
    setPhone(p)
    inputRef.current?.focus()

    const timer = setInterval(() => setCountdown(c => {
      if (c <= 1) { clearInterval(timer); return 0 }
      return c - 1
    }), 1000)
    return () => clearInterval(timer)
  }, [router])

  const minutes = Math.floor(countdown / 60)
  const seconds = countdown % 60

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
      const pengurusRoles = ['ketua', 'sekretaris', 'bendahara', 'admin']
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
