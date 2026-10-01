'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { greet } from '@/lib/utils'

interface Props {
  rtName: string
}

export default function GuestPage({ rtName }: Props) {
  const router = useRouter()
  const [sheet, setSheet] = useState<'login' | 'otp' | null>(null)
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [greeting, setGreeting] = useState('')

  useEffect(() => {
    setGreeting(greet())
  }, [])

  useEffect(() => {
    if (sheet === null) {
      setPhone('')
      setOtp('')
      setMsg('')
    }
    // Lock body scroll when sheet is open
    document.body.style.overflow = sheet ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [sheet])

  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  async function sendOtp() {
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length < 9) { setMsg('Nomor HP tidak valid'); return }
    setLoading(true); setMsg('')
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSheet('otp')
      setCountdown(300)
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Gagal mengirim OTP')
    } finally {
      setLoading(false)
    }
  }

  async function verifyOtp() {
    if (otp.length !== 6) { setMsg('Kode OTP harus 6 digit'); return }
    setLoading(true); setMsg('')
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      // Redirect based on role
      const pengurusRoles = ['ketua', 'sekretaris', 'bendahara', 'admin']
      if (pengurusRoles.includes(data.role)) {
        router.push('/pengurus')
      } else {
        router.refresh()
        router.push('/')
      }
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'OTP salah atau kedaluwarsa')
    } finally {
      setLoading(false)
    }
  }

  const maskPhone = (p: string) => {
    const c = p.replace(/\D/g, '')
    if (c.length < 8) return p
    return c.slice(0, 4) + '••••' + c.slice(-3)
  }

  const fmtCountdown = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  return (
    <>
      {/* TopBar — guest variant */}
      <div className="topbar">
        <div className="tb-top">
          <div className="tb-av">👤</div>
          <div className="tb-hi">
            <div className="g">{greeting}</div>
            <div className="n">Selamat datang</div>
          </div>
          <button
            onClick={() => setSheet('login')}
            style={{
              height: 38, padding: '0 14px', border: '1px solid rgba(255,255,255,.22)', borderRadius: 12,
              background: 'rgba(255,255,255,.18)', color: '#fff',
              fontFamily: 'var(--f)', fontSize: 13, fontWeight: 800, cursor: 'pointer',
            } as React.CSSProperties}
          >
            🔒 Masuk
          </button>
        </div>
        <div className="tb-rt">
          <span className="tb-chip">📍 {rtName}</span>
        </div>
      </div>

      {/* Guest body content */}
      <div className="body">
        {/* Banner warga baru */}
        <div className="status-banner pending" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="sb-ico">🏠</div>
            <div className="sb-txt">
              <div className="sb-l1">Apakah Anda warga baru?</div>
              <div className="sb-l2">Daftarkan data Anda agar bisa mengakses iuran, surat, dan layanan RT.</div>
            </div>
          </div>
          <button
            className="btn-p"
            style={{ height: 46, background: 'linear-gradient(135deg,#b7791f,var(--gold))' }}
            onClick={() => setSheet('login')}
          >
            Isi data warga / Login
          </button>
          <div style={{ textAlign: 'center', fontSize: 12.5, color: '#78350f' }}>
            Sudah punya akun?{' '}
            <b style={{ textDecoration: 'underline', cursor: 'pointer' }} onClick={() => setSheet('login')}>
              Login
            </b>
          </div>
        </div>

        {/* Blurred stats */}
        <div>
          <div className="sec-h" style={{ marginBottom: 12 }}>
            <div className="t"><span className="em">📊</span> Ringkasan RT</div>
          </div>
          <div
            className="rl-st"
            style={{ cursor: 'pointer' }}
            onClick={() => setSheet('login')}
          >
            {[['000', 'Jumlah warga'], ['00', 'Jumlah KK'], ['Rp 0jt', 'Saldo kas']].map(([val, lbl]) => (
              <div key={lbl}>
                <b style={{ filter: 'blur(5px)', userSelect: 'none', display: 'block', fontSize: 16, fontWeight: 800 }}>{val}</b>
                <span>{lbl}</span>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--gray400)', marginTop: 8 }}>
            🔒 Login untuk melihat ringkasan RT
          </div>
        </div>

        {/* Menu layanan umum */}
        <div>
          <div className="sec-h" style={{ marginBottom: 12 }}>
            <div className="t"><span className="em">⚡</span> Layanan umum</div>
          </div>
          <div className="menu-grid">
            <div className="menu-item" onClick={() => setSheet('login')}>
              <div className="mi-ico" style={{ background: 'var(--gold-l)' }}>📦</div>
              <div className="mi-lbl">Inventaris</div>
            </div>
            <div className="menu-item" style={{ opacity: 0.5 }} onClick={() => setSheet('login')}>
              <div className="mi-ico" style={{ background: 'var(--g50)' }}>💳</div>
              <div className="mi-lbl">Iuran</div>
            </div>
            <div className="menu-item" style={{ opacity: 0.5 }} onClick={() => setSheet('login')}>
              <div className="mi-ico" style={{ background: 'var(--orange-l)' }}>📢</div>
              <div className="mi-lbl">Pengumuman</div>
            </div>
            <div className="menu-item" style={{ opacity: 0.5 }} onClick={() => setSheet('login')}>
              <div className="mi-ico" style={{ background: 'var(--teal-l)' }}>✉️</div>
              <div className="mi-lbl">Surat</div>
            </div>
          </div>
        </div>
      </div>

      {/* Sheet mask */}
      {sheet && (
        <div
          className="sheet-mask show"
          style={{ position: 'fixed', zIndex: 50 }}
          onClick={() => setSheet(null)}
        />
      )}

      {/* Login sheet */}
      <div className={`sheet${sheet === 'login' ? ' show' : ''}`} style={{ zIndex: 51 }}>
        <div className="sheet-grip" />
        <div className="sheet-h">🔒 Masuk sebagai warga</div>
        <div className="sheet-d">
          Masukkan nomor HP kepala keluarga yang sudah terdaftar. Kami kirim kode OTP via WhatsApp.
        </div>
        <input
          className="rl-in"
          inputMode="tel"
          placeholder="Nomor HP, mis. 0812xxxxxxxx"
          value={phone}
          onChange={e => { setPhone(e.target.value); setMsg('') }}
          onKeyDown={e => e.key === 'Enter' && sendOtp()}
          autoFocus={sheet === 'login'}
        />
        {msg && <div style={{ fontSize: 11.5, color: 'var(--red)', margin: '-4px 0 8px', minHeight: 16 }}>{msg}</div>}
        <button className="btn-p" onClick={sendOtp} disabled={loading}>
          {loading ? 'Mengirim…' : '📨 Kirim OTP via WhatsApp'}
        </button>
        <div className="ib blue" style={{ marginTop: 12 }}>
          <span>ℹ️</span>
          <div>Kode OTP 6 digit akan dikirim ke nomor WhatsApp Anda.</div>
        </div>
        <button
          className="rl-b"
          style={{ width: '100%', height: 44, marginTop: 10 }}
          onClick={() => setSheet(null)}
        >
          Batal
        </button>
      </div>

      {/* OTP sheet */}
      <div className={`sheet${sheet === 'otp' ? ' show' : ''}`} style={{ zIndex: 51 }}>
        <div className="sheet-grip" />
        <div className="sheet-h">📨 Masukkan kode OTP</div>
        <div className="sheet-d">
          Kode 6 digit dikirim ke {maskPhone(phone)}
          {countdown > 0 && <span style={{ color: 'var(--g600)', fontWeight: 700 }}> · {fmtCountdown(countdown)}</span>}
        </div>
        <input
          className="rl-in auth-input otp"
          inputMode="numeric"
          maxLength={6}
          placeholder="••••••"
          value={otp}
          onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setMsg('') }}
          onKeyDown={e => e.key === 'Enter' && otp.length === 6 && verifyOtp()}
          autoFocus={sheet === 'otp'}
          style={{ letterSpacing: 8, textAlign: 'center', fontSize: 24, fontWeight: 800 }}
        />
        {msg && <div style={{ fontSize: 11.5, color: 'var(--red)', margin: '-4px 0 8px', minHeight: 16 }}>{msg}</div>}
        <button className="btn-p" onClick={verifyOtp} disabled={loading}>
          {loading ? 'Memverifikasi…' : '✅ Verifikasi & masuk'}
        </button>
        <button
          className="rl-b"
          style={{ width: '100%', height: 44, marginTop: 10 }}
          onClick={() => { setSheet('login'); setOtp(''); setMsg('') }}
        >
          ← Ganti nomor
        </button>
        {countdown === 0 && (
          <button
            className="rl-b"
            style={{ width: '100%', height: 44, marginTop: 8 }}
            onClick={() => { sendOtp(); setOtp('') }}
            disabled={loading}
          >
            🔄 Kirim ulang OTP
          </button>
        )}
      </div>
    </>
  )
}
