'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { greet, rupiah, timeAgo } from '@/lib/utils'
import {
  User, MapPin, Lock, Home, ClipboardList, Package, CreditCard,
  Mail, FileText, AlertTriangle, Calendar, Megaphone, Zap,
  BarChart2, Info, Send, CheckCircle, RefreshCw, ArrowLeft,
} from 'lucide-react'

interface PengumumanItem {
  id: string
  judul: string
  isi: string | null
  kategori: string | null
  prioritas: string | null
  createdAt: string
}

interface InventarisItem {
  id: string
  nama: string
  hargaSewa: number | null
  stok: number | null
  fotoUrl: string | null
  deskripsi: string | null
}

interface Props {
  rtName: string
  rtId?: string | null
  pengumuman?: PengumumanItem[]
  inventaris?: InventarisItem[]
  rtStats?: { jumlahWarga: number; jumlahKk: number }
}

type SheetType = 'login' | 'otp' | 'wargaBaru' | 'inventaris' | null

const AGAMA_OPTIONS = ['Islam', 'Kristen', 'Katolik', 'Hindu', 'Buddha', 'Konghucu']
const KAWIN_OPTIONS = ['Belum Kawin', 'Kawin', 'Cerai Hidup', 'Cerai Mati']
const HUNIAN_OPTIONS = ['Pemilik', 'Sewa', 'Kontrak']
const HUB_OPTIONS = ['Istri', 'Suami', 'Anak', 'Orang Tua', 'Kakek', 'Nenek', 'Cucu', 'Menantu', 'Adik', 'Kakak', 'Lainnya']

const defaultKepala = {
  nama: '', phone: '', noRumah: '', jk: 'L', agama: 'Islam',
  kawin: 'Kawin', pekerjaan: '', hunian: 'Pemilik', tgl: '', alamat: '',
}
const defaultAnggota = { nama: '', hub: 'Istri', agama: 'Islam', jk: 'P', pekerjaan: '' }

export default function GuestPage({ rtName, pengumuman = [], inventaris = [], rtStats }: Props) {
  const router = useRouter()
  const [sheet, setSheet] = useState<SheetType>(null)
  const [greeting, setGreeting] = useState('')

  // Login / OTP
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)

  // Warga Baru 3-step
  const [nbMode, setNbMode] = useState<'warga_baru' | 'pemutakhiran'>('warga_baru')
  const [nbStep, setNbStep] = useState(1)
  const [kepala, setKepala] = useState({ ...defaultKepala })
  const [anggotaList, setAnggotaList] = useState([{ ...defaultAnggota }])
  const [nbLoading, setNbLoading] = useState(false)
  const [nbMsg, setNbMsg] = useState('')

  // Inventaris sewa
  const [sewaItem, setSewaItem] = useState<InventarisItem | null>(null)
  const [sewaNama, setSewaNama] = useState('')
  const [sewaHp, setSewaHp] = useState('')
  const [sewaTgl, setSewaTgl] = useState('')
  const [sewaTglKembali, setSewaTglKembali] = useState('')
  const [sewaLoading, setSewaLoading] = useState(false)
  const [sewaMsg, setSewaMsg] = useState('')
  const [sewaDone, setSewaDone] = useState(false)

  useEffect(() => { setGreeting(greet()) }, [])

  useEffect(() => {
    if (!sheet) { setPhone(''); setOtp(''); setMsg('') }
    document.body.style.overflow = sheet ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [sheet])

  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  function openSheet(s: SheetType, mode?: 'warga_baru' | 'pemutakhiran') {
    if (s === 'wargaBaru') {
      setNbMode(mode || 'warga_baru')
      setNbStep(1)
      setKepala({ ...defaultKepala })
      setAnggotaList([{ ...defaultAnggota }])
      setNbMsg('')
    }
    if (s === 'inventaris') {
      setSewaItem(null); setSewaNama(''); setSewaHp(''); setSewaTgl('')
      setSewaTglKembali(''); setSewaMsg(''); setSewaDone(false)
    }
    setSheet(s)
  }

  function closeSheet() { setSheet(null) }

  async function sendOtp() {
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length < 9) { setMsg('Nomor HP tidak valid'); return }
    setLoading(true); setMsg('')
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSheet('otp'); setCountdown(300)
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Gagal mengirim OTP')
    } finally { setLoading(false) }
  }

  async function verifyOtp() {
    if (otp.length !== 6) { setMsg('Kode OTP harus 6 digit'); return }
    setLoading(true); setMsg('')
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const pengurusRoles = ['ketua', 'sekretaris', 'bendahara', 'admin']
      if (pengurusRoles.includes(data.role)) router.push('/pengurus')
      else { router.refresh(); router.push('/') }
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'OTP salah atau kedaluwarsa')
    } finally { setLoading(false) }
  }

  async function submitWargaBaru() {
    if (!kepala.nama.trim()) { setNbMsg('Nama wajib diisi'); return }
    if (nbMode === 'warga_baru' && !kepala.phone.trim()) { setNbMsg('Nomor HP wajib diisi'); return }
    setNbLoading(true); setNbMsg('')
    try {
      const res = await fetch('/api/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jenis: nbMode, nama: kepala.nama, noRumah: kepala.noRumah,
          phone: kepala.phone, dataKk: kepala, anggota: anggotaList,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setNbStep(99)
    } catch (e: unknown) {
      setNbMsg(e instanceof Error ? e.message : 'Gagal mengirim data')
    } finally { setNbLoading(false) }
  }

  async function submitSewa() {
    if (!sewaItem) return
    if (!sewaNama.trim()) { setSewaMsg('Nama penyewa wajib diisi'); return }
    if (!sewaTgl) { setSewaMsg('Tanggal sewa wajib diisi'); return }
    setSewaLoading(true); setSewaMsg('')
    try {
      const res = await fetch('/api/inventaris', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sewa', inventarisId: sewaItem.id,
          penyewaNama: sewaNama, penyewaHp: sewaHp,
          jumlah: 1, tglSewa: sewaTgl, tglKembaliRencana: sewaTglKembali || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSewaDone(true)
    } catch (e: unknown) {
      setSewaMsg(e instanceof Error ? e.message : 'Gagal memproses sewa')
    } finally { setSewaLoading(false) }
  }

  const maskPhone = (p: string) => {
    const c = p.replace(/\D/g, '')
    return c.length < 8 ? p : c.slice(0, 4) + '••••' + c.slice(-3)
  }
  const fmtCountdown = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  function setAnggota(i: number, field: string, val: string) {
    setAnggotaList(prev => prev.map((a, idx) => idx === i ? { ...a, [field]: val } : a))
  }

  return (
    <>
      {/* TopBar — guest */}
      <div className="topbar">
        <div className="tb-top">
          <div className="tb-av"><User size={20} /></div>
          <div className="tb-hi">
            <div className="g">{greeting}</div>
            <div className="n">Selamat datang</div>
          </div>
          <button
            onClick={() => openSheet('login')}
            style={{
              height: 38, padding: '0 14px', border: '1px solid rgba(255,255,255,.22)',
              borderRadius: 12, background: 'rgba(255,255,255,.18)', color: '#fff',
              fontFamily: 'var(--f)', fontSize: 13, fontWeight: 800, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <Lock size={14} /> Masuk
          </button>
        </div>
        <div className="tb-rt">
          <span className="tb-chip"><MapPin size={12} /> {rtName}</span>
        </div>
      </div>

      <div className="body">
        {/* Banner pemutakhiran */}
        <div className="status-banner aktif" style={{ cursor: 'pointer' }} onClick={() => openSheet('wargaBaru', 'pemutakhiran')}>
          <div className="sb-ico"><ClipboardList size={24} /></div>
          <div className="sb-txt">
            <div className="sb-l1">Program Pemutakhiran Data Warga 2026</div>
            <div className="sb-l2">Perbarui data KK & anggota keluarga Anda. Klik untuk mulai.</div>
          </div>
        </div>

        {/* Banner warga baru */}
        <div className="status-banner pending" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="sb-ico"><Home size={24} /></div>
            <div className="sb-txt">
              <div className="sb-l1">Warga baru? Daftar sekarang</div>
              <div className="sb-l2">Isi data KK untuk akses iuran, surat, dan layanan RT.</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn-p"
              style={{ flex: 1, height: 44, background: 'linear-gradient(135deg,#b7791f,var(--gold))', gap: 6 }}
              onClick={() => openSheet('wargaBaru', 'warga_baru')}
            >
              <FileText size={16} /> Daftar warga baru
            </button>
            <button className="rl-b" style={{ height: 44, padding: '0 16px', display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => openSheet('login')}>
              <Lock size={14} /> Login
            </button>
          </div>
        </div>

        {/* Ringkasan RT */}
        <div>
          <div className="sec-h" style={{ marginBottom: 12 }}>
            <div className="t"><BarChart2 size={16} /> Ringkasan RT</div>
          </div>
          <div className="rl-st">
            <div>
              <b style={(rtStats?.jumlahWarga || 0) > 0 ? { display: 'block', fontSize: 16, fontWeight: 800 } : { filter: 'blur(4px)', userSelect: 'none', display: 'block', fontSize: 16, fontWeight: 800 }}>
                {(rtStats?.jumlahWarga || 0) > 0 ? rtStats!.jumlahWarga : '000'}
              </b>
              <span>Jumlah warga</span>
            </div>
            <div>
              <b style={(rtStats?.jumlahKk || 0) > 0 ? { display: 'block', fontSize: 16, fontWeight: 800 } : { filter: 'blur(4px)', userSelect: 'none', display: 'block', fontSize: 16, fontWeight: 800 }}>
                {(rtStats?.jumlahKk || 0) > 0 ? rtStats!.jumlahKk : '00'}
              </b>
              <span>Jumlah KK</span>
            </div>
            <div>
              <b style={{ filter: 'blur(4px)', userSelect: 'none', display: 'block', fontSize: 16, fontWeight: 800 }}>Rp 0jt</b>
              <span>Saldo kas</span>
            </div>
          </div>
          <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--gray400)', marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <Lock size={10} /> Login untuk melihat saldo kas RT
          </div>
        </div>

        {/* Menu layanan */}
        <div>
          <div className="sec-h" style={{ marginBottom: 12 }}>
            <div className="t"><Zap size={16} /> Layanan umum</div>
          </div>
          <div className="menu-grid">
            <div className="menu-item" onClick={() => openSheet('inventaris')}>
              <div className="mi-ico" style={{ background: 'var(--gold-l)' }}><Package size={22} color="var(--gold)" /></div>
              <div className="mi-lbl">Inventaris</div>
            </div>
            <div className="menu-item" style={{ opacity: 0.45 }} onClick={() => openSheet('login')}>
              <div className="mi-ico" style={{ background: 'var(--g50)' }}><CreditCard size={22} color="var(--g600)" /></div>
              <div className="mi-lbl">Iuran</div>
            </div>
            <div className="menu-item" style={{ opacity: 0.45 }} onClick={() => openSheet('login')}>
              <div className="mi-ico" style={{ background: 'var(--teal-l)' }}><Mail size={22} color="var(--teal)" /></div>
              <div className="mi-lbl">Surat</div>
            </div>
            <div className="menu-item" style={{ opacity: 0.45 }} onClick={() => openSheet('login')}>
              <div className="mi-ico" style={{ background: 'var(--purple-l)' }}><FileText size={22} color="var(--purple)" /></div>
              <div className="mi-lbl">Layanan</div>
            </div>
          </div>
        </div>

        {/* Pengumuman RT */}
        {pengumuman.length > 0 && (
          <div>
            <div className="sec-h" style={{ marginBottom: 12 }}>
              <div className="t"><Megaphone size={16} /> Pengumuman RT</div>
            </div>
            <div className="peng-card">
              {pengumuman.map(p => {
                const pri = p.prioritas === 'penting' || p.prioritas === 'tinggi'
                const IcoEl = pri
                  ? <AlertTriangle size={18} color="var(--red)" />
                  : p.kategori === 'acara'
                    ? <Calendar size={18} color="var(--blue)" />
                    : <Megaphone size={18} color="var(--orange)" />
                const bg = pri ? 'var(--red-l)' : p.kategori === 'acara' ? 'var(--blue-l)' : 'var(--orange-l)'
                return (
                  <div key={p.id} className="peng-item">
                    <div className="pi-ico" style={{ background: bg }}>{IcoEl}</div>
                    <div className="pi-body">
                      <div className="pi-t">
                        {p.judul}
                        {pri && <span className="pill penting">Penting</span>}
                      </div>
                      {p.isi && <div className="pi-d" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.isi}</div>}
                      <div className="pi-time">{timeAgo(p.createdAt)}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Inventaris preview */}
        {inventaris.length > 0 && (
          <div>
            <div className="sec-h" style={{ marginBottom: 12 }}>
              <div className="t"><Package size={16} /> Inventaris RT</div>
              <button
                style={{ border: 'none', background: 'none', fontSize: 13, fontWeight: 700, color: 'var(--g600)', cursor: 'pointer', fontFamily: 'var(--f)' }}
                onClick={() => openSheet('inventaris')}
              >
                Semua ›
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {inventaris.slice(0, 3).map(item => (
                <div
                  key={item.id} className="iv-card"
                  style={{ cursor: (item.stok || 0) > 0 ? 'pointer' : 'default' }}
                  onClick={() => { if ((item.stok || 0) > 0) { setSewaItem(item); openSheet('inventaris') } }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--gold-l)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Package size={22} color="var(--gold)" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--gray800)' }}>{item.nama}</div>
                      <div style={{ fontSize: 12, color: 'var(--gray500)', marginTop: 2 }}>
                        Stok: {item.stok ?? 0} · {item.hargaSewa ? rupiah(item.hargaSewa) + '/hari' : 'Gratis'}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, flexShrink: 0, background: (item.stok || 0) > 0 ? 'var(--g50)' : 'var(--gray100)', color: (item.stok || 0) > 0 ? 'var(--g700)' : 'var(--gray400)' }}>
                      {(item.stok || 0) > 0 ? 'Tersedia' : 'Habis'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sheet mask */}
      {sheet && <div className="sheet-mask show" onClick={closeSheet} />}

      {/* ── Login Sheet ── */}
      <div className={`sheet${sheet === 'login' ? ' show' : ''}`}>
        <div className="sheet-grip" />
        <div className="sheet-h" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Lock size={18} /> Masuk sebagai warga</div>
        <div className="sheet-d">Masukkan nomor HP kepala keluarga yang sudah terdaftar. Kode OTP dikirim via WhatsApp.</div>
        <input
          className="rl-in" inputMode="tel" placeholder="Nomor HP, mis. 0812xxxxxxxx"
          value={phone} onChange={e => { setPhone(e.target.value); setMsg('') }}
          onKeyDown={e => e.key === 'Enter' && sendOtp()}
          autoFocus={sheet === 'login'}
        />
        {msg && <div style={{ fontSize: 11.5, color: 'var(--red)', margin: '-4px 0 8px' }}>{msg}</div>}
        <button className="btn-p" onClick={sendOtp} disabled={loading} style={{ gap: 8 }}>
          {loading ? 'Mengirim…' : <><Send size={16} /> Kirim OTP via WhatsApp</>}
        </button>
        <div className="ib blue" style={{ marginTop: 12 }}>
          <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>Kode OTP 6 digit akan dikirim ke nomor WhatsApp Anda.</div>
        </div>
        <button className="rl-b" style={{ width: '100%', height: 44, marginTop: 10 }} onClick={closeSheet}>Batal</button>
      </div>

      {/* ── OTP Sheet ── */}
      <div className={`sheet${sheet === 'otp' ? ' show' : ''}`}>
        <div className="sheet-grip" />
        <div className="sheet-h" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Send size={18} /> Masukkan kode OTP</div>
        <div className="sheet-d">
          Kode 6 digit dikirim ke {maskPhone(phone)}
          {countdown > 0 && <span style={{ color: 'var(--g600)', fontWeight: 700 }}> · {fmtCountdown(countdown)}</span>}
        </div>
        <input
          className="rl-in" inputMode="numeric" maxLength={6} placeholder="••••••"
          value={otp} onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setMsg('') }}
          onKeyDown={e => e.key === 'Enter' && otp.length === 6 && verifyOtp()}
          autoFocus={sheet === 'otp'}
          style={{ letterSpacing: 8, textAlign: 'center', fontSize: 24, fontWeight: 800 }}
        />
        {msg && <div style={{ fontSize: 11.5, color: 'var(--red)', margin: '-4px 0 8px' }}>{msg}</div>}
        <button className="btn-p" onClick={verifyOtp} disabled={loading} style={{ gap: 8 }}>
          {loading ? 'Memverifikasi…' : <><CheckCircle size={16} /> Verifikasi & masuk</>}
        </button>
        <button className="rl-b" style={{ width: '100%', height: 44, marginTop: 10 }} onClick={() => { setSheet('login'); setOtp(''); setMsg('') }}>
          <ArrowLeft size={14} style={{ marginRight: 4 }} /> Ganti nomor
        </button>
        {countdown === 0 && (
          <button className="rl-b" style={{ width: '100%', height: 44, marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} onClick={() => { sendOtp(); setOtp('') }} disabled={loading}>
            <RefreshCw size={14} /> Kirim ulang OTP
          </button>
        )}
      </div>

      {/* ── Warga Baru / Pemutakhiran Sheet ── */}
      <div className={`sheet${sheet === 'wargaBaru' ? ' show' : ''}`} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="sheet-grip" />
        {nbStep === 99 ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
              <CheckCircle size={52} color="var(--g500)" />
            </div>
            <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--gray800)', marginBottom: 8 }}>
              {nbMode === 'warga_baru' ? 'Pendaftaran Terkirim!' : 'Pemutakhiran Terkirim!'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--gray500)', lineHeight: 1.6 }}>
              Data Anda sedang ditinjau oleh Ketua RT.<br />
              Anda akan mendapat konfirmasi via WhatsApp.
            </div>
            <button className="btn-p" style={{ marginTop: 20 }} onClick={closeSheet}>Tutup</button>
          </div>
        ) : (
          <>
            <div className="sheet-h" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {nbMode === 'warga_baru' ? <><FileText size={18} /> Pendaftaran Warga Baru</> : <><ClipboardList size={18} /> Pemutakhiran Data Warga</>}
            </div>
            {/* Step progress */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              {[1, 2, 3].map(s => (
                <div key={s} style={{ flex: 1, height: 4, borderRadius: 4, background: nbStep >= s ? 'var(--g500)' : 'var(--gray200)', transition: 'background .2s' }} />
              ))}
            </div>
            <div style={{ fontSize: 12, color: 'var(--gray500)', marginBottom: 14, textAlign: 'center' }}>
              Langkah {nbStep} dari 3 — {['', 'Data Kepala KK', 'Anggota Keluarga', 'Konfirmasi'][nbStep]}
            </div>

            {/* Step 1 */}
            {nbStep === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray600)' }}>Nama Lengkap *</label>
                <input className="rl-in" placeholder="Nama sesuai KTP" value={kepala.nama} onChange={e => setKepala(p => ({ ...p, nama: e.target.value }))} />
                {nbMode === 'warga_baru' && (
                  <>
                    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray600)' }}>Nomor HP (WhatsApp) *</label>
                    <input className="rl-in" inputMode="tel" placeholder="0812xxxxxxxx" value={kepala.phone} onChange={e => setKepala(p => ({ ...p, phone: e.target.value }))} />
                  </>
                )}
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray600)' }}>Blok & No. Rumah</label>
                <input className="rl-in" placeholder="Mis. A-12 atau No. 5" value={kepala.noRumah} onChange={e => setKepala(p => ({ ...p, noRumah: e.target.value }))} />
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray600)' }}>Jenis Kelamin</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[['L', 'Laki-laki'], ['P', 'Perempuan']].map(([val, lbl]) => (
                    <label key={val} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, padding: '10px 12px', borderRadius: 10, border: `2px solid ${kepala.jk === val ? 'var(--g500)' : 'var(--gray200)'}`, background: kepala.jk === val ? 'var(--g50)' : 'white', fontFamily: 'var(--f)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                      <input type="radio" style={{ display: 'none' }} checked={kepala.jk === val} onChange={() => setKepala(p => ({ ...p, jk: val }))} />
                      {lbl}
                    </label>
                  ))}
                </div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray600)' }}>Agama</label>
                <select className="rl-in" value={kepala.agama} onChange={e => setKepala(p => ({ ...p, agama: e.target.value }))}>
                  {AGAMA_OPTIONS.map(a => <option key={a}>{a}</option>)}
                </select>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray600)' }}>Status Perkawinan</label>
                <select className="rl-in" value={kepala.kawin} onChange={e => setKepala(p => ({ ...p, kawin: e.target.value }))}>
                  {KAWIN_OPTIONS.map(k => <option key={k}>{k}</option>)}
                </select>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray600)' }}>Pekerjaan</label>
                <input className="rl-in" placeholder="Mis. Karyawan Swasta, Wiraswasta..." value={kepala.pekerjaan} onChange={e => setKepala(p => ({ ...p, pekerjaan: e.target.value }))} />
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray600)' }}>Status Hunian</label>
                <select className="rl-in" value={kepala.hunian} onChange={e => setKepala(p => ({ ...p, hunian: e.target.value }))}>
                  {HUNIAN_OPTIONS.map(h => <option key={h}>{h}</option>)}
                </select>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray600)' }}>Tanggal Mulai Menempati</label>
                <input className="rl-in" type="date" value={kepala.tgl} onChange={e => setKepala(p => ({ ...p, tgl: e.target.value }))} />
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray600)' }}>Alamat Lengkap</label>
                <textarea className="rl-in" placeholder="Alamat lengkap..." rows={3} value={kepala.alamat} onChange={e => setKepala(p => ({ ...p, alamat: e.target.value }))} style={{ resize: 'none', minHeight: 80 }} />
              </div>
            )}

            {/* Step 2 */}
            {nbStep === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="ib blue">
                  <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                  <div>Tambahkan anggota keluarga selain kepala KK (opsional).</div>
                </div>
                {anggotaList.map((a, i) => (
                  <div key={i} style={{ border: '1.5px solid var(--gray200)', borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--gray700)' }}>Anggota {i + 1}</span>
                      {anggotaList.length > 1 && (
                        <button onClick={() => setAnggotaList(p => p.filter((_, idx) => idx !== i))}
                          style={{ border: 'none', background: 'var(--red-l)', color: 'var(--red)', borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--f)' }}>
                          Hapus
                        </button>
                      )}
                    </div>
                    <input className="rl-in" placeholder="Nama lengkap" value={a.nama} onChange={e => setAnggota(i, 'nama', e.target.value)} style={{ marginBottom: 0 }} />
                    <select className="rl-in" value={a.hub} onChange={e => setAnggota(i, 'hub', e.target.value)} style={{ marginBottom: 0 }}>
                      {HUB_OPTIONS.map(h => <option key={h}>{h}</option>)}
                    </select>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <select className="rl-in" value={a.agama} onChange={e => setAnggota(i, 'agama', e.target.value)} style={{ flex: 1, marginBottom: 0 }}>
                        {AGAMA_OPTIONS.map(ag => <option key={ag}>{ag}</option>)}
                      </select>
                      <select className="rl-in" value={a.jk} onChange={e => setAnggota(i, 'jk', e.target.value)} style={{ flex: '0 0 110px', marginBottom: 0 }}>
                        <option value="L">Laki-laki</option><option value="P">Perempuan</option>
                      </select>
                    </div>
                    <input className="rl-in" placeholder="Pekerjaan" value={a.pekerjaan} onChange={e => setAnggota(i, 'pekerjaan', e.target.value)} style={{ marginBottom: 0 }} />
                  </div>
                ))}
                <button className="rl-b" style={{ height: 44 }} onClick={() => setAnggotaList(p => [...p, { ...defaultAnggota }])}>
                  + Tambah anggota keluarga
                </button>
              </div>
            )}

            {/* Step 3 */}
            {nbStep === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="ib blue">
                  <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                  <div>Pastikan data sudah benar. Pengurus RT akan meninjau dan menghubungi Anda via WhatsApp untuk verifikasi dokumen (KTP & KK).</div>
                </div>
                <div style={{ background: 'var(--gray50)', borderRadius: 12, padding: '12px 4px' }}>
                  <div className="kv"><span className="k">Nama</span><span className="v">{kepala.nama}</span></div>
                  {kepala.phone && <div className="kv"><span className="k">HP</span><span className="v">{kepala.phone}</span></div>}
                  {kepala.noRumah && <div className="kv"><span className="k">No. Rumah</span><span className="v">{kepala.noRumah}</span></div>}
                  <div className="kv"><span className="k">Agama</span><span className="v">{kepala.agama}</span></div>
                  <div className="kv"><span className="k">Status hunian</span><span className="v">{kepala.hunian}</span></div>
                  <div className="kv" style={{ borderBottom: 'none' }}><span className="k">Anggota</span><span className="v">{anggotaList.filter(a => a.nama.trim()).length} orang</span></div>
                </div>
                {nbMsg && <div style={{ fontSize: 12, color: 'var(--red)', padding: '8px 12px', background: 'var(--red-l)', borderRadius: 10 }}>{nbMsg}</div>}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              {nbStep > 1 && (
                <button className="rl-b" style={{ height: 48, flex: '0 0 90px' }} onClick={() => setNbStep(s => s - 1)}>← Kembali</button>
              )}
              {nbStep < 3 ? (
                <button className="btn-p" style={{ flex: 1, height: 48 }} onClick={() => {
                  if (nbStep === 1 && !kepala.nama.trim()) { setNbMsg('Nama wajib diisi'); return }
                  setNbMsg(''); setNbStep(s => s + 1)
                }}>
                  Lanjut →
                </button>
              ) : (
                <button className="btn-p" style={{ flex: 1, height: 48, gap: 8 }} onClick={submitWargaBaru} disabled={nbLoading}>
                  {nbLoading ? 'Mengirim…' : <><CheckCircle size={16} /> Kirim Pendaftaran</>}
                </button>
              )}
            </div>
            {nbMsg && nbStep < 3 && <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 8 }}>{nbMsg}</div>}
            <button className="rl-b" style={{ width: '100%', height: 44, marginTop: 8 }} onClick={closeSheet}>Batal</button>
          </>
        )}
      </div>

      {/* ── Inventaris Sheet ── */}
      <div className={`sheet${sheet === 'inventaris' ? ' show' : ''}`} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="sheet-grip" />
        {sewaItem ? (
          <>
            <button onClick={() => setSewaItem(null)} style={{ border: 'none', background: 'none', color: 'var(--g600)', fontFamily: 'var(--f)', fontSize: 13, fontWeight: 700, cursor: 'pointer', marginBottom: 8, padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
              <ArrowLeft size={14} /> Kembali ke daftar
            </button>
            <div className="sheet-h" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Package size={18} /> {sewaItem.nama}</div>
            {sewaDone ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
                  <CheckCircle size={52} color="var(--g500)" />
                </div>
                <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--gray800)', marginBottom: 8 }}>Permintaan sewa terkirim!</div>
                <div style={{ fontSize: 13, color: 'var(--gray500)' }}>Pengurus RT akan mengonfirmasi via WhatsApp.</div>
                <button className="btn-p" style={{ marginTop: 20 }} onClick={closeSheet}>Tutup</button>
              </div>
            ) : (
              <>
                <div style={{ background: 'var(--gray50)', borderRadius: 12, padding: '10px 4px', marginBottom: 14 }}>
                  <div className="kv"><span className="k">Harga sewa</span><span className="v">{sewaItem.hargaSewa ? rupiah(sewaItem.hargaSewa) + '/hari' : 'Gratis'}</span></div>
                  <div className="kv" style={{ borderBottom: 'none' }}><span className="k">Stok tersedia</span><span className="v">{sewaItem.stok ?? 0}</span></div>
                </div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray600)' }}>Nama Penyewa *</label>
                <input className="rl-in" placeholder="Nama lengkap" value={sewaNama} onChange={e => setSewaNama(e.target.value)} />
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray600)' }}>No. HP / WhatsApp</label>
                <input className="rl-in" inputMode="tel" placeholder="0812xxxxxxxx" value={sewaHp} onChange={e => setSewaHp(e.target.value)} />
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray600)' }}>Tanggal Sewa *</label>
                <input className="rl-in" type="date" value={sewaTgl} onChange={e => setSewaTgl(e.target.value)} />
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray600)' }}>Rencana Tanggal Kembali</label>
                <input className="rl-in" type="date" value={sewaTglKembali} onChange={e => setSewaTglKembali(e.target.value)} />
                {sewaMsg && <div style={{ fontSize: 12, color: 'var(--red)', padding: '8px 12px', background: 'var(--red-l)', borderRadius: 10, marginBottom: 8 }}>{sewaMsg}</div>}
                <button className="btn-p" onClick={submitSewa} disabled={sewaLoading} style={{ gap: 8 }}>
                  {sewaLoading ? 'Memproses…' : <><Package size={16} /> Ajukan Pinjam / Sewa</>}
                </button>
              </>
            )}
          </>
        ) : (
          <>
            <div className="sheet-h" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Package size={18} /> Inventaris RT</div>
            {inventaris.length === 0 ? (
              <div className="empty">
                <div className="e-i" style={{ display: 'flex', justifyContent: 'center' }}><Package size={38} color="var(--gray400)" /></div>
                <div className="e-t">Belum ada inventaris</div>
                <div className="e-d">Data barang inventaris RT belum tersedia.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {inventaris.map(item => (
                  <div key={item.id} className="iv-card"
                    style={{ cursor: (item.stok || 0) > 0 ? 'pointer' : 'default' }}
                    onClick={() => { if ((item.stok || 0) > 0) setSewaItem(item) }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--gold-l)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Package size={22} color="var(--gold)" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--gray800)' }}>{item.nama}</div>
                        {item.deskripsi && <div style={{ fontSize: 12, color: 'var(--gray500)', marginTop: 2 }}>{item.deskripsi}</div>}
                        <div style={{ fontSize: 12, color: 'var(--gray500)', marginTop: 2 }}>
                          Stok: {item.stok ?? 0} · {item.hargaSewa ? rupiah(item.hargaSewa) + '/hari' : 'Gratis'}
                        </div>
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, flexShrink: 0, background: (item.stok || 0) > 0 ? 'var(--g50)' : 'var(--gray100)', color: (item.stok || 0) > 0 ? 'var(--g700)' : 'var(--gray400)' }}>
                        {(item.stok || 0) > 0 ? 'Pinjam' : 'Habis'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button className="rl-b" style={{ width: '100%', height: 44, marginTop: 16 }} onClick={closeSheet}>Tutup</button>
          </>
        )}
      </div>
    </>
  )
}
