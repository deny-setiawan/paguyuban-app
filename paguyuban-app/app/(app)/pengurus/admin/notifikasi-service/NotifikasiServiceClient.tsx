'use client'

import { useState, useEffect, useCallback } from 'react'
import { Wifi, WifiOff, Loader2, RefreshCw, CheckCircle, AlertTriangle, MessageSquare, Smartphone } from 'lucide-react'

type WaStatus = 'connected' | 'connecting' | 'disconnected' | 'not_configured' | 'error'

interface Props {
  initialStatus: WaStatus
  initialPhone: string | null
  configured: boolean
}

export default function NotifikasiServiceClient({ initialStatus, initialPhone, configured }: Props) {
  const [status, setStatus] = useState<WaStatus>(initialStatus)
  const [phone, setPhone] = useState<string | null>(initialPhone)
  const [qrTs, setQrTs] = useState<number>(Date.now())
  const [resetting, setResetting] = useState(false)
  const [resetMsg, setResetMsg] = useState<string | null>(null)
  const [polling, setPolling] = useState(false)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/wa-service/status', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setStatus(data.status ?? 'error')
        setPhone(data.phone ?? null)
        return data.status as WaStatus
      }
    } catch { /* ignore */ }
    return 'error' as WaStatus
  }, [])

  // Auto-poll every 3s when not connected
  useEffect(() => {
    if (status === 'connected' || status === 'not_configured') {
      setPolling(false)
      return
    }
    setPolling(true)
    const timer = setInterval(async () => {
      const newStatus = await fetchStatus()
      if (newStatus === 'connected') {
        clearInterval(timer)
        setPolling(false)
      }
    }, 3000)
    return () => clearInterval(timer)
  }, [status, fetchStatus])

  async function handleReset() {
    setResetting(true)
    setResetMsg(null)
    try {
      const res = await fetch('/api/wa-service/reconnect', { method: 'POST' })
      if (res.ok) {
        setStatus('connecting')
        setPhone(null)
        setQrTs(Date.now())
        setResetMsg('Berhasil! Scan QR baru di bawah untuk menghubungkan WhatsApp.')
      } else {
        setResetMsg('Gagal melakukan reset. Coba lagi.')
      }
    } catch {
      setResetMsg('Koneksi gagal. Pastikan service WA sedang berjalan.')
    } finally {
      setResetting(false)
    }
  }

  async function handleRefreshQr() {
    setQrTs(Date.now())
    await fetchStatus()
  }

  const isConnected = status === 'connected'
  const isConnecting = status === 'connecting'
  const isDisconnected = status === 'disconnected' || status === 'error'

  return (
    <>
      {/* Status banner */}
      <div
        className={`status-banner ${isConnected ? 'aktif' : isConnecting ? 'pending' : ''}`}
        style={isDisconnected || status === 'not_configured'
          ? { marginBottom: 16, background: 'linear-gradient(135deg,#fff1f1,#fff)', border: '1.5px solid var(--red)' }
          : { marginBottom: 16 }}
      >
        <div
          className="sb-ico"
          style={isDisconnected || status === 'not_configured' ? { background: 'var(--red)', color: 'white' } : undefined}
        >
          {isConnected
            ? <Wifi size={24} />
            : isConnecting
              ? <Loader2 size={24} className="spin" />
              : <WifiOff size={24} />}
        </div>
        <div className="sb-txt">
          <div
            className="sb-l1"
            style={isDisconnected || status === 'not_configured' ? { color: '#7f1d1d' } : undefined}
          >
            {status === 'not_configured' ? 'Belum Dikonfigurasi'
              : isConnected ? 'Terhubung'
              : isConnecting ? 'Menghubungkan...'
              : status === 'error' ? 'Tidak Dapat Dijangkau'
              : 'Tidak Terhubung'}
          </div>
          <div
            className="sb-l2"
            style={isDisconnected || status === 'not_configured' ? { color: '#991b1b' } : undefined}
          >
            {status === 'not_configured'
              ? 'Variabel WA_OTP_SERVICE_URL belum diset di Vercel.'
              : isConnected
                ? `WhatsApp aktif${phone ? ` · ${phone}` : ''}`
                : isConnecting
                  ? 'Menunggu scan QR...'
                  : 'WA OTP Service tidak terhubung ke WhatsApp.'}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      {configured && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <button
            onClick={handleReset}
            disabled={resetting}
            style={{
              flex: 1, height: 44, border: '1.5px solid var(--red)', background: 'white', color: 'var(--red)',
              borderRadius: 12, fontWeight: 700, fontSize: 13, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              opacity: resetting ? 0.7 : 1,
            }}>
            <RefreshCw size={15} /> {resetting ? 'Mereset...' : 'Reset & QR Baru'}
          </button>
          {!isConnected && (
            <button
              onClick={handleRefreshQr}
              style={{
                height: 44, border: '1.5px solid var(--gray200)', background: 'white', color: 'var(--gray600)',
                borderRadius: 12, fontWeight: 700, fontSize: 13, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '0 16px',
              }}>
              <RefreshCw size={14} /> Refresh
            </button>
          )}
        </div>
      )}

      {resetMsg && (
        <div className={`ib ${resetMsg.startsWith('Berhasil') ? 'green' : 'red'}`} style={{ marginBottom: 16 }}>
          {resetMsg.startsWith('Berhasil') ? <CheckCircle size={14} style={{ flexShrink: 0 }} /> : <AlertTriangle size={14} style={{ flexShrink: 0 }} />}
          <div>{resetMsg}</div>
        </div>
      )}

      {/* QR Code — shown when not connected */}
      {configured && !isConnected && (
        <div className="peng-card" style={{ padding: '20px 16px', marginBottom: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray600)', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Smartphone size={15} /> Scan QR dengan WhatsApp HP pengurus
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={qrTs}
            src={`/api/wa-service/qr?t=${qrTs}`}
            alt="QR Code WhatsApp"
            style={{ width: 220, height: 220, borderRadius: 12, border: '1.5px solid var(--gray200)', objectFit: 'contain', background: 'white' }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
          {polling && (
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--gray400)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              <Loader2 size={12} /> Memantau status koneksi...
            </div>
          )}
          <div style={{ marginTop: 12, fontSize: 12, color: 'var(--gray500)', lineHeight: 1.6 }}>
            Buka WhatsApp → <b>Perangkat Tertaut</b> → <b>Tautkan Perangkat</b> → Scan QR di atas
          </div>
        </div>
      )}

      {/* Connected detail */}
      {isConnected && phone && (
        <div className="peng-card" style={{ padding: '12px 14px', marginBottom: 20 }}>
          <div className="kv"><span className="k">Nomor WA Aktif</span><span className="v" style={{ color: 'var(--g600)', fontWeight: 800 }}>{phone}</span></div>
          <div className="kv" style={{ borderBottom: 'none' }}><span className="k">Status</span><span className="v"><CheckCircle size={13} color="var(--g600)" style={{ display: 'inline', marginRight: 4 }} />Siap mengirim pesan</span></div>
        </div>
      )}

      {/* Notifikasi aktif */}
      <div className="sec-h" style={{ marginBottom: 12, marginTop: 4 }}>
        <div className="t"><MessageSquare size={16} /> Notifikasi WhatsApp Aktif</div>
      </div>
      <div className="peng-card" style={{ padding: '4px 0' }}>
        <div className="peng-item" style={{ cursor: 'default' }}>
          <div className="pi-ico" style={{ background: 'var(--g50)' }}>
            <MessageSquare size={18} color="var(--g600)" />
          </div>
          <div className="pi-body">
            <div className="pi-t">Kode OTP Login</div>
            <div className="pi-d">Dikirim otomatis saat warga login via nomor HP</div>
          </div>
        </div>
        <div className="peng-item" style={{ cursor: 'default', opacity: 0.4 }}>
          <div className="pi-ico" style={{ background: 'var(--gray100)' }}>
            <MessageSquare size={18} color="var(--gray400)" />
          </div>
          <div className="pi-body">
            <div className="pi-t" style={{ color: 'var(--gray400)' }}>Notifikasi Tagihan</div>
            <div className="pi-d">Belum tersedia</div>
          </div>
        </div>
        <div className="peng-item" style={{ cursor: 'default', opacity: 0.4 }}>
          <div className="pi-ico" style={{ background: 'var(--gray100)' }}>
            <MessageSquare size={18} color="var(--gray400)" />
          </div>
          <div className="pi-body">
            <div className="pi-t" style={{ color: 'var(--gray400)' }}>Notifikasi Pengumuman</div>
            <div className="pi-d">Belum tersedia</div>
          </div>
        </div>
      </div>

      <div className="ib blue" style={{ marginTop: 16 }}>
        <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          Tombol <b>Reset & QR Baru</b> akan memutus sesi WhatsApp yang sedang aktif.
          Gunakan hanya jika nomor HP diganti atau session bermasalah.
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 1.2s linear infinite; }
      `}</style>
    </>
  )
}
