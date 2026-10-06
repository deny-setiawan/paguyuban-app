'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Wifi, WifiOff, Loader2, RefreshCw, CheckCircle, AlertTriangle,
  MessageSquare, Smartphone, Bell, Users, Package, FileText, UserCheck, Search,
} from 'lucide-react'
import type { WaNotifConfig } from '@/lib/wa-client'

type WaStatus = 'connected' | 'connecting' | 'disconnected' | 'not_configured' | 'error'

interface GroupItem { jid: string; name: string; participantCount: number }

interface Props {
  initialStatus: WaStatus
  initialPhone: string | null
  configured: boolean
  initialNotifConfig: WaNotifConfig
}

const NOTIF_ITEMS: { key: keyof Omit<WaNotifConfig, 'groupLaporan'>; label: string; desc: string; icon: React.ReactNode }[] = [
  { key: 'wargaDiterima', label: 'Pendaftaran Diterima', desc: 'Notif ke warga saat pengajuannya disetujui pengurus', icon: <UserCheck size={18} color="var(--g600)" /> },
  { key: 'laporanUpdate', label: 'Update Status Laporan', desc: 'Notif ke pelapor saat laporannya diproses atau selesai', icon: <FileText size={18} color="var(--blue)" /> },
  { key: 'suratUpdate', label: 'Update Status Surat', desc: 'Notif ke pemohon saat surat diproses atau selesai', icon: <Bell size={18} color="var(--orange)" /> },
  { key: 'inventarisSewa', label: 'Konfirmasi Sewa Inventaris', desc: 'Notif ke penyewa saat sewa inventaris berhasil dicatat', icon: <Package size={18} color="#7c3aed" /> },
]

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <div onClick={onChange} style={{
      width: 44, height: 24, borderRadius: 12, flexShrink: 0, cursor: 'pointer',
      background: on ? 'var(--g500)' : 'var(--gray300)', position: 'relative', transition: 'background .2s',
    }}>
      <div style={{
        width: 20, height: 20, borderRadius: '50%', background: 'white',
        position: 'absolute', top: 2, left: on ? 22 : 2,
        transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.25)',
      }} />
    </div>
  )
}

export default function NotifikasiServiceClient({ initialStatus, initialPhone, configured, initialNotifConfig }: Props) {
  const [status, setStatus] = useState<WaStatus>(initialStatus)
  const [phone, setPhone] = useState<string | null>(initialPhone)
  const [qrTs, setQrTs] = useState<number>(Date.now())
  const [resetting, setResetting] = useState(false)
  const [resetMsg, setResetMsg] = useState<string | null>(null)
  const [polling, setPolling] = useState(false)

  const [notifConfig, setNotifConfig] = useState<WaNotifConfig>(initialNotifConfig)
  const [savingKey, setSavingKey] = useState<string | null>(null)

  const [groups, setGroups] = useState<GroupItem[]>([])
  const [loadingGroups, setLoadingGroups] = useState(false)
  const [showGroupPicker, setShowGroupPicker] = useState(false)
  const [groupSearch, setGroupSearch] = useState('')

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

  useEffect(() => {
    if (status === 'connected' || status === 'not_configured') { setPolling(false); return }
    setPolling(true)
    const timer = setInterval(async () => {
      const s = await fetchStatus()
      if (s === 'connected') { clearInterval(timer); setPolling(false) }
    }, 3000)
    return () => clearInterval(timer)
  }, [status, fetchStatus])

  async function handleReset() {
    setResetting(true); setResetMsg(null)
    try {
      const res = await fetch('/api/wa-service/reconnect', { method: 'POST' })
      if (res.ok) {
        setStatus('connecting'); setPhone(null); setQrTs(Date.now())
        setResetMsg('Berhasil! Scan QR baru di bawah untuk menghubungkan WhatsApp.')
      } else { setResetMsg('Gagal melakukan reset. Coba lagi.') }
    } catch { setResetMsg('Koneksi gagal. Pastikan service WA sedang berjalan.') }
    finally { setResetting(false) }
  }

  async function toggleNotif(key: keyof Omit<WaNotifConfig, 'groupLaporan'>) {
    const newVal = !notifConfig[key]
    setNotifConfig(p => ({ ...p, [key]: newVal }))
    setSavingKey(key)
    try {
      await fetch('/api/wa-notif-config', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: newVal }),
      })
    } finally { setSavingKey(null) }
  }

  async function setGroupLaporan(jid: string | null) {
    setNotifConfig(p => ({ ...p, groupLaporan: jid }))
    setShowGroupPicker(false)
    setSavingKey('groupLaporan')
    try {
      await fetch('/api/wa-notif-config', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupLaporan: jid }),
      })
    } finally { setSavingKey(null) }
  }

  async function loadGroups() {
    setLoadingGroups(true)
    try {
      const res = await fetch('/api/wa-service/groups')
      if (res.ok) { const d = await res.json(); setGroups(d.groups ?? []) }
    } finally { setLoadingGroups(false) }
  }

  function openGroupPicker() { setShowGroupPicker(true); setGroupSearch(''); loadGroups() }

  const isConnected = status === 'connected'
  const isConnecting = status === 'connecting'
  const isDisconnected = status === 'disconnected' || status === 'error'
  const filteredGroups = groupSearch ? groups.filter(g => g.name.toLowerCase().includes(groupSearch.toLowerCase())) : groups
  const selectedGroupName = notifConfig.groupLaporan
    ? (groups.find(g => g.jid === notifConfig.groupLaporan)?.name ?? notifConfig.groupLaporan.split('@')[0])
    : null

  return (
    <>
      {/* Status banner */}
      <div
        className={`status-banner ${isConnected ? 'aktif' : isConnecting ? 'pending' : ''}`}
        style={isDisconnected || status === 'not_configured'
          ? { marginBottom: 16, background: 'linear-gradient(135deg,#fff1f1,#fff)', border: '1.5px solid var(--red)' }
          : { marginBottom: 16 }}
      >
        <div className="sb-ico" style={isDisconnected || status === 'not_configured' ? { background: 'var(--red)', color: 'white' } : undefined}>
          {isConnected ? <Wifi size={24} /> : isConnecting ? <Loader2 size={24} className="spin" /> : <WifiOff size={24} />}
        </div>
        <div className="sb-txt">
          <div className="sb-l1" style={isDisconnected || status === 'not_configured' ? { color: '#7f1d1d' } : undefined}>
            {status === 'not_configured' ? 'Belum Dikonfigurasi' : isConnected ? 'Terhubung' : isConnecting ? 'Menghubungkan...' : status === 'error' ? 'Tidak Dapat Dijangkau' : 'Tidak Terhubung'}
          </div>
          <div className="sb-l2" style={isDisconnected || status === 'not_configured' ? { color: '#991b1b' } : undefined}>
            {status === 'not_configured' ? 'Variabel WA_OTP_SERVICE_URL belum diset di Vercel.'
              : isConnected ? `WhatsApp aktif${phone ? ` · ${phone}` : ''}`
              : isConnecting ? 'Menunggu scan QR...'
              : 'WA OTP Service tidak terhubung ke WhatsApp.'}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      {configured && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <button onClick={handleReset} disabled={resetting}
            style={{ flex: 1, height: 44, border: '1.5px solid var(--red)', background: 'white', color: 'var(--red)', borderRadius: 12, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: resetting ? .7 : 1, fontFamily: 'var(--f)' }}>
            <RefreshCw size={15} /> {resetting ? 'Mereset...' : 'Reset & QR Baru'}
          </button>
          {!isConnected && (
            <button onClick={() => { setQrTs(Date.now()); fetchStatus() }}
              style={{ height: 44, border: '1.5px solid var(--gray200)', background: 'white', color: 'var(--gray600)', borderRadius: 12, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '0 16px', fontFamily: 'var(--f)' }}>
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

      {/* QR Code */}
      {configured && !isConnected && (
        <div className="peng-card" style={{ padding: '20px 16px', marginBottom: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray600)', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Smartphone size={15} /> Scan QR dengan WhatsApp HP pengurus
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img key={qrTs} src={`/api/wa-service/qr?t=${qrTs}`} alt="QR Code WhatsApp"
            style={{ width: 220, height: 220, borderRadius: 12, border: '1.5px solid var(--gray200)', objectFit: 'contain', background: 'white' }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
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

      {/* ─── Notifikasi Otomatis ─── */}
      <div className="sec-h" style={{ marginBottom: 12, marginTop: 4 }}>
        <div className="t"><MessageSquare size={16} /> Notifikasi Otomatis</div>
        {savingKey && savingKey !== 'groupLaporan' && <Loader2 size={14} className="spin" style={{ color: 'var(--gray400)' }} />}
      </div>
      <div className="peng-card" style={{ padding: '4px 0', marginBottom: 20 }}>
        <div className="peng-item" style={{ cursor: 'default' }}>
          <div className="pi-ico" style={{ background: 'var(--g50)' }}><MessageSquare size={18} color="var(--g600)" /></div>
          <div className="pi-body">
            <div className="pi-t">Kode OTP Login</div>
            <div className="pi-d">Dikirim otomatis saat warga login via nomor HP</div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--g600)', fontWeight: 700, flexShrink: 0, alignSelf: 'center' }}>Selalu Aktif</div>
        </div>
        {NOTIF_ITEMS.map(item => (
          <div key={item.key} className="peng-item" style={{ cursor: 'default' }}>
            <div className="pi-ico" style={{ background: 'var(--gray100)' }}>{item.icon}</div>
            <div className="pi-body">
              <div className="pi-t">{item.label}</div>
              <div className="pi-d">{item.desc}</div>
            </div>
            <Toggle on={notifConfig[item.key] !== false} onChange={() => toggleNotif(item.key)} />
          </div>
        ))}
      </div>

      {/* ─── Notifikasi Grup WhatsApp ─── */}
      <div className="sec-h" style={{ marginBottom: 12 }}>
        <div className="t"><Users size={16} /> Notifikasi Grup WA</div>
        {savingKey === 'groupLaporan' && <Loader2 size={14} className="spin" style={{ color: 'var(--gray400)' }} />}
      </div>
      <div className="peng-card" style={{ padding: '4px 0', marginBottom: 16 }}>
        <div className="peng-item" style={{ cursor: 'default' }}>
          <div className="pi-ico" style={{ background: '#eff6ff' }}><FileText size={18} color="var(--blue)" /></div>
          <div className="pi-body">
            <div className="pi-t">Laporan Baru → Grup WA</div>
            <div className="pi-d">Setiap laporan baru dari warga dikirim ke grup pengurus</div>
          </div>
          <button onClick={openGroupPicker}
            style={{ flexShrink: 0, alignSelf: 'center', border: '1.5px solid var(--gray200)', background: 'white', borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: 'var(--gray600)', fontFamily: 'var(--f)', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {notifConfig.groupLaporan ? (selectedGroupName ?? '…') : '+ Pilih Grup'}
          </button>
        </div>
        {notifConfig.groupLaporan && (
          <div style={{ padding: '8px 14px 10px 60px', borderTop: '1px solid var(--gray100)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--gray500)', flex: 1 }}>
              Grup aktif: <b style={{ color: 'var(--gray700)' }}>{selectedGroupName}</b>
            </span>
            <button onClick={() => setGroupLaporan(null)}
              style={{ background: 'none', border: 'none', color: 'var(--red)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--f)' }}>
              Hapus
            </button>
          </div>
        )}
      </div>

      <div className="ib blue" style={{ marginBottom: 16 }}>
        <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          Tombol <b>Reset & QR Baru</b> akan memutus sesi WhatsApp yang sedang aktif.
          Gunakan hanya jika nomor HP diganti atau session bermasalah.
        </div>
      </div>

      {/* ─── Group Picker Sheet ─── */}
      {showGroupPicker && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9000 }}
            onClick={() => setShowGroupPicker(false)} />
          <div style={{
            position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
            width: '100%', maxWidth: 430, background: 'white',
            borderRadius: '20px 20px 0 0', padding: '20px 16px 36px', zIndex: 9001,
            maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 12 }}>Pilih Grup WhatsApp</div>
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray400)', pointerEvents: 'none' }} />
              <input className="rl-in" style={{ paddingLeft: 34 }} placeholder="Cari nama grup..."
                value={groupSearch} onChange={e => setGroupSearch(e.target.value)} />
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {loadingGroups ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '24px 0', color: 'var(--gray400)', fontSize: 13 }}>
                  <Loader2 size={16} className="spin" /> Memuat daftar grup...
                </div>
              ) : filteredGroups.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--gray400)', fontSize: 13, lineHeight: 1.6 }}>
                  {status !== 'connected' ? 'WA belum terhubung.\nHubungkan dulu via scan QR.' : groups.length === 0 ? 'Tidak ada grup ditemukan.\nPastikan WA sudah bergabung ke grup.' : 'Tidak ada grup yang cocok.'}
                </div>
              ) : filteredGroups.map(g => (
                <button key={g.jid} onClick={() => setGroupLaporan(g.jid)}
                  style={{
                    width: '100%', border: 'none', borderBottom: '1px solid var(--gray100)',
                    background: g.jid === notifConfig.groupLaporan ? 'var(--g50)' : 'white',
                    padding: '12px 14px', textAlign: 'left', cursor: 'pointer', fontFamily: 'var(--f)',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--gray100)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Users size={16} color="var(--gray500)" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--gray900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--gray400)', marginTop: 2 }}>{g.participantCount} anggota</div>
                  </div>
                  {g.jid === notifConfig.groupLaporan && <CheckCircle size={16} color="var(--g600)" style={{ flexShrink: 0 }} />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 1.2s linear infinite; }
      `}</style>
    </>
  )
}
