'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { greet, rupiah, timeAgo } from '@/lib/utils'
import {
  User, MapPin, Lock, Home, ClipboardList, Package, CreditCard,
  Mail, FileText, AlertTriangle, Calendar, Megaphone, Zap,
  BarChart2, Info, Send, CheckCircle, RefreshCw, ArrowLeft,
  Camera, Image, X, Shield, Bell,
} from 'lucide-react'

interface PengumumanItem {
  id: string; judul: string; isi: string | null
  kategori: string | null; prioritas: string | null; createdAt: string
}
interface InventarisItem {
  id: string; nama: string; hargaSewa: number | null
  stok: number | null; fotoUrl: string | null; deskripsi: string | null
}
interface Props {
  rtName: string
  rtId?: string | null
  pengumuman?: PengumumanItem[]
  inventaris?: InventarisItem[]
  rtStats?: { jumlahWarga: number; jumlahKk: number }
  pemutakhiranActive?: boolean
  pemutakhiranTahun?: number | null
}

type SheetType = 'login' | 'otp' | 'wargaBaru' | 'inventaris' | 'pengumuman' | null

const AGAMA_OPTIONS = ['Islam', 'Kristen Protestan', 'Kristen Katolik', 'Hindu', 'Buddha', 'Konghucu']
const KAWIN_OPTIONS = ['Menikah', 'Belum Menikah', 'Duda', 'Janda']
const HUNIAN_OPTIONS = ['Pemilik', 'Sewa', 'Kontrak']
const HUB_OPTIONS = [
  'Istri', 'Anak', 'Orang Tua', 'Kakek/Nenek', 'Cucu',
  'Menantu', 'Mertua', 'Saudara Kandung', 'Keponakan', 'Paman/Bibi', 'Ipar',
]

const defaultKepala = {
  nama: '', phone: '', noRumah: '', jk: 'L',
  agama: 'Islam', kawin: 'Menikah', hunian: 'Pemilik', tgl: '',
}
const defaultAnggota = { nama: '', hub: 'Istri', agama: 'Islam', jk: 'P' }

export default function GuestPage({
  rtName, pengumuman = [], inventaris = [], rtStats,
  pemutakhiranActive = false, pemutakhiranTahun,
}: Props) {
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
  const [anggotaList, setAnggotaList] = useState<typeof defaultAnggota[]>([])
  const [nbLoading, setNbLoading] = useState(false)
  const [nbMsg, setNbMsg] = useState('')

  // Phone check for pemutakhiran
  const [phoneCheck, setPhoneCheck] = useState<{ found: boolean; nama?: string } | null>(null)
  const [phoneChecking, setPhoneChecking] = useState(false)

  // Foto upload
  const [fotoFiles, setFotoFiles] = useState<File[]>([])
  const [fotoPreviews, setFotoPreviews] = useState<string[]>([])
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  // Inventaris sewa
  const [sewaItem, setSewaItem] = useState<InventarisItem | null>(null)
  const [sewaNama, setSewaNama] = useState('')
  const [sewaHp, setSewaHp] = useState('')
  const [sewaTgl, setSewaTgl] = useState('')
  const [sewaTglKembali, setSewaTglKembali] = useState('')
  const [sewaLoading, setSewaLoading] = useState(false)
  const [sewaMsg, setSewaMsg] = useState('')
  const [sewaDone, setSewaDone] = useState(false)

  const tahunPemutakhiran = pemutakhiranTahun || new Date().getFullYear()

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

  // Reset phoneCheck when phone changes
  useEffect(() => { setPhoneCheck(null) }, [kepala.phone])

  function openSheet(s: SheetType, mode?: 'warga_baru' | 'pemutakhiran') {
    if (s === 'wargaBaru') {
      setNbMode(mode || 'warga_baru')
      setNbStep(1)
      setKepala({ ...defaultKepala })
      setAnggotaList([])
      setNbMsg('')
      setPhoneCheck(null)
      setPhoneChecking(false)
      fotoPreviews.forEach(p => URL.revokeObjectURL(p))
      setFotoFiles([])
      setFotoPreviews([])
      setShowConfirmModal(false)
    }
    if (s === 'inventaris') {
      setSewaItem(null); setSewaNama(''); setSewaHp(''); setSewaTgl('')
      setSewaTglKembali(''); setSewaMsg(''); setSewaDone(false)
    }
    setSheet(s)
  }
  function closeSheet() { setSheet(null) }

  function addFiles(fileList: FileList | null) {
    if (!fileList) return
    const added = Array.from(fileList)
    const combined = [...fotoFiles, ...added].slice(0, 10)
    const invalid = Array.from(fileList).find(f => f.size > 10 * 1024 * 1024)
    if (invalid) { setNbMsg(`File "${invalid.name}" melebihi 10 MB`); return }
    fotoPreviews.forEach(p => { try { URL.revokeObjectURL(p) } catch {} })
    setFotoFiles(combined)
    setFotoPreviews(combined.map(f => f.type.startsWith('image/') ? URL.createObjectURL(f) : ''))
    setNbMsg('')
  }

  async function compressToBase64(file: File): Promise<string> {
    if (!file.type.startsWith('image/')) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onerror = reject
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(file)
      })
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onerror = reject
      reader.onload = e => {
        const img = new window.Image()
        img.onerror = reject
        img.onload = () => {
          const MAX = 1200
          let { width, height } = img
          if (width > MAX || height > MAX) {
            if (width > height) { height = Math.round(height * MAX / width); width = MAX }
            else { width = Math.round(width * MAX / height); height = MAX }
          }
          const canvas = document.createElement('canvas')
          canvas.width = width; canvas.height = height
          canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
          resolve(canvas.toDataURL('image/jpeg', 0.75))
        }
        img.src = e.target!.result as string
      }
      reader.readAsDataURL(file)
    })
  }
  function removeFile(i: number) {
    if (fotoFiles[i].type.startsWith('image/')) URL.revokeObjectURL(fotoPreviews[i])
    setFotoFiles(prev => prev.filter((_, idx) => idx !== i))
    setFotoPreviews(prev => prev.filter((_, idx) => idx !== i))
  }

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

  async function handleStep1Next() {
    if (!kepala.nama.trim()) { setNbMsg('Nama wajib diisi'); return }
    setNbMsg('')

    // For pemutakhiran with phone: check if phone exists (if not yet checked)
    if (nbMode === 'pemutakhiran' && kepala.phone.trim() && !phoneCheck) {
      setPhoneChecking(true)
      try {
        const res = await fetch('/api/check-phone', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: kepala.phone }),
        })
        const data = await res.json()
        setPhoneCheck(data)
      } catch {
        setPhoneCheck({ found: false })
      } finally {
        setPhoneChecking(false)
      }
      return // Show result first, user clicks Lanjut again to proceed
    }

    setPhoneCheck(null)
    setNbStep(2)
  }

  async function submitWargaBaru() {
    if (!kepala.nama.trim()) { setNbMsg('Nama wajib diisi'); return }
    if (nbMode === 'warga_baru' && !kepala.phone.trim()) { setNbMsg('Nomor HP wajib diisi'); return }
    setNbLoading(true); setNbMsg('')
    try {
      let fotoUrls: string[] = []
      if (fotoFiles.length > 0) {
        try {
          fotoUrls = await Promise.all(fotoFiles.map(compressToBase64))
        } catch {
          // Failed to process — proceed without photos
        }
      }
      const res = await fetch('/api/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jenis: nbMode, nama: kepala.nama, noRumah: kepala.noRumah,
          phone: kepala.phone, dataKk: kepala,
          anggota: anggotaList.filter(a => a.nama.trim()),
          fotoFiles: fotoUrls,
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

  const STEP_LABEL = ['', 'Data Kepala KK', 'Anggota Keluarga', 'Lampirkan Dokumen']

  // Step 1 Lanjut button label
  const lanjutLabel = (() => {
    if (nbMode !== 'pemutakhiran' || !kepala.phone.trim()) return 'Lanjut →'
    if (phoneChecking) return 'Memeriksa nomor…'
    if (!phoneCheck) return 'Lanjut →'
    if (phoneCheck.found) return `Lanjut — Perbarui data →`
    return 'Lanjut — Daftar akun baru →'
  })()

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
          <button onClick={() => openSheet('login')} style={{
            height: 38, padding: '0 14px', border: '1px solid rgba(255,255,255,.22)',
            borderRadius: 12, background: 'rgba(255,255,255,.18)', color: '#fff',
            fontFamily: 'var(--f)', fontSize: 13, fontWeight: 800, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Lock size={14} /> Masuk
          </button>
        </div>
        <div className="tb-rt"><span className="tb-chip"><MapPin size={12} /> {rtName}</span></div>
      </div>

      <div className="body" style={{ paddingBottom: 80 }}>
        {/* Banner pemutakhiran — only shown when admin has enabled it */}
        {pemutakhiranActive && (
          <div className="status-banner aktif" style={{ cursor: 'pointer' }} onClick={() => openSheet('wargaBaru', 'pemutakhiran')}>
            <div className="sb-ico"><ClipboardList size={24} /></div>
            <div className="sb-txt">
              <div className="sb-l1">Program Pemutakhiran Data Warga {tahunPemutakhiran}</div>
              <div className="sb-l2">Perbarui data KK & anggota keluarga Anda. Klik untuk mulai.</div>
            </div>
          </div>
        )}

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
            <button className="btn-p" style={{ flex: 1, height: 44, background: 'linear-gradient(135deg,#b7791f,var(--gold))', gap: 6 }}
              onClick={() => openSheet('wargaBaru', 'warga_baru')}>
              <FileText size={16} /> Daftar warga baru
            </button>
            <button className="rl-b" style={{ height: 44, padding: '0 16px', display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => openSheet('login')}>
              <Lock size={14} /> Login
            </button>
          </div>
        </div>

        {/* Ringkasan RT */}
        <div>
          <div className="sec-h" style={{ marginBottom: 12 }}><div className="t"><BarChart2 size={16} /> Ringkasan RT</div></div>
          <div className="rl-st">
            <div style={{ cursor: 'pointer' }} onClick={() => openSheet('login')}>
              <b style={(rtStats?.jumlahWarga || 0) > 0 ? { display: 'block', fontSize: 16, fontWeight: 800 } : { filter: 'blur(4px)', userSelect: 'none', display: 'block', fontSize: 16, fontWeight: 800 }}>
                {(rtStats?.jumlahWarga || 0) > 0 ? rtStats!.jumlahWarga : '000'}
              </b>
              <span>Jumlah warga</span>
            </div>
            <div style={{ cursor: 'pointer' }} onClick={() => openSheet('login')}>
              <b style={(rtStats?.jumlahKk || 0) > 0 ? { display: 'block', fontSize: 16, fontWeight: 800 } : { filter: 'blur(4px)', userSelect: 'none', display: 'block', fontSize: 16, fontWeight: 800 }}>
                {(rtStats?.jumlahKk || 0) > 0 ? rtStats!.jumlahKk : '00'}
              </b>
              <span>Jumlah KK</span>
            </div>
            <div style={{ cursor: 'pointer' }} onClick={() => openSheet('login')}>
              <b style={{ filter: 'blur(4px)', userSelect: 'none', display: 'block', fontSize: 16, fontWeight: 800 }}>Rp 0jt</b>
              <span>Saldo kas</span>
            </div>
          </div>
          <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--gray400)', marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <Lock size={10} /> Ketuk angka di atas untuk login
          </div>
        </div>

        {/* Menu layanan */}
        <div>
          <div className="sec-h" style={{ marginBottom: 12 }}><div className="t"><Zap size={16} /> Layanan umum</div></div>
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

        {pengumuman.length > 0 && (
          <div>
            <div className="sec-h" style={{ marginBottom: 12 }}>
              <div className="t"><Megaphone size={16} /> Pengumuman RT</div>
              <button style={{ border: 'none', background: 'none', fontSize: 13, fontWeight: 700, color: 'var(--g600)', cursor: 'pointer', fontFamily: 'var(--f)' }} onClick={() => openSheet('pengumuman')}>Semua ›</button>
            </div>
            <div className="peng-card">
              {pengumuman.map(p => {
                const pri = p.prioritas === 'penting' || p.prioritas === 'tinggi'
                const IcoEl = pri ? <AlertTriangle size={18} color="var(--red)" /> : p.kategori === 'acara' ? <Calendar size={18} color="var(--blue)" /> : <Megaphone size={18} color="var(--orange)" />
                const bg = pri ? 'var(--red-l)' : p.kategori === 'acara' ? 'var(--blue-l)' : 'var(--orange-l)'
                return (
                  <div key={p.id} className="peng-item">
                    <div className="pi-ico" style={{ background: bg }}>{IcoEl}</div>
                    <div className="pi-body">
                      <div className="pi-t">{p.judul}{pri && <span className="pill penting">Penting</span>}</div>
                      {p.isi && <div className="pi-d" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.isi}</div>}
                      <div className="pi-time">{timeAgo(p.createdAt)}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {inventaris.length > 0 && (
          <div>
            <div className="sec-h" style={{ marginBottom: 12 }}>
              <div className="t"><Package size={16} /> Inventaris RT</div>
              <button style={{ border: 'none', background: 'none', fontSize: 13, fontWeight: 700, color: 'var(--g600)', cursor: 'pointer', fontFamily: 'var(--f)' }} onClick={() => openSheet('inventaris')}>Semua ›</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {inventaris.slice(0, 3).map(item => (
                <div key={item.id} className="iv-card" style={{ cursor: (item.stok || 0) > 0 ? 'pointer' : 'default' }}
                  onClick={() => { if ((item.stok || 0) > 0) { setSewaItem(item); openSheet('inventaris') } }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--gold-l)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Package size={22} color="var(--gold)" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--gray800)' }}>{item.nama}</div>
                      <div style={{ fontSize: 12, color: 'var(--gray500)', marginTop: 2 }}>Stok: {item.stok ?? 0} · {item.hargaSewa ? rupiah(item.hargaSewa) + '/hari' : 'Gratis'}</div>
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
      {(sheet && !showConfirmModal) && <div className="sheet-mask show" onClick={closeSheet} />}
      {showConfirmModal && <div className="sheet-mask show" style={{ zIndex: 9998 }} onClick={() => !nbLoading && setShowConfirmModal(false)} />}

      {/* ── Login Sheet ── */}
      <div className={`sheet${sheet === 'login' ? ' show' : ''}`}>
        <div className="sheet-grip" />
        <div className="sheet-h" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Lock size={18} /> Masuk sebagai warga</div>
        <div className="sheet-d">Masukkan nomor HP kepala keluarga yang sudah terdaftar. Kode OTP dikirim via WhatsApp.</div>
        <input className="rl-in" inputMode="tel" placeholder="Nomor HP, mis. 0812xxxxxxxx"
          value={phone} onChange={e => { setPhone(e.target.value); setMsg('') }}
          onKeyDown={e => e.key === 'Enter' && sendOtp()} autoFocus={sheet === 'login'} />
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
        <input className="rl-in" inputMode="numeric" maxLength={6} placeholder="••••••"
          value={otp} onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setMsg('') }}
          onKeyDown={e => e.key === 'Enter' && otp.length === 6 && verifyOtp()} autoFocus={sheet === 'otp'}
          style={{ letterSpacing: 8, textAlign: 'center', fontSize: 24, fontWeight: 800 }} />
        {msg && <div style={{ fontSize: 11.5, color: 'var(--red)', margin: '-4px 0 8px' }}>{msg}</div>}
        <button className="btn-p" onClick={verifyOtp} disabled={loading} style={{ gap: 8 }}>
          {loading ? 'Memverifikasi…' : <><CheckCircle size={16} /> Verifikasi & masuk</>}
        </button>
        <button className="rl-b" style={{ width: '100%', height: 44, marginTop: 10 }} onClick={() => { setSheet('login'); setOtp(''); setMsg('') }}>
          <ArrowLeft size={14} style={{ marginRight: 4 }} /> Ganti nomor
        </button>
        {countdown === 0 && (
          <button className="rl-b" style={{ width: '100%', height: 44, marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            onClick={() => { sendOtp(); setOtp('') }} disabled={loading}>
            <RefreshCw size={14} /> Kirim ulang OTP
          </button>
        )}
      </div>

      {/* ── Warga Baru / Pemutakhiran Sheet ── */}
      <div className={`sheet${sheet === 'wargaBaru' ? ' show' : ''}`} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="sheet-grip" />
        {nbStep === 99 ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}><CheckCircle size={52} color="var(--g500)" /></div>
            <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--gray800)', marginBottom: 8 }}>
              {nbMode === 'warga_baru' ? 'Pendaftaran Terkirim!' : 'Pemutakhiran Terkirim!'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--gray500)', lineHeight: 1.6 }}>
              Data Anda sedang ditinjau oleh Ketua RT.<br />Anda akan mendapat konfirmasi via WhatsApp.
            </div>
            <button className="btn-p" style={{ marginTop: 20 }} onClick={closeSheet}>Tutup</button>
          </div>
        ) : (
          <>
            <div className="sheet-h" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {nbMode === 'warga_baru'
                ? <><FileText size={18} /> Pendaftaran Warga Baru</>
                : <><ClipboardList size={18} /> Pemutakhiran Data Warga {tahunPemutakhiran}</>}
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              {[1, 2, 3].map(s => (
                <div key={s} style={{ flex: 1, height: 4, borderRadius: 4, background: nbStep >= s ? 'var(--g500)' : 'var(--gray200)', transition: 'background .2s' }} />
              ))}
            </div>
            <div style={{ fontSize: 12, color: 'var(--gray500)', marginBottom: 14, textAlign: 'center' }}>
              Langkah {nbStep} dari 3 — {STEP_LABEL[nbStep]}
            </div>

            {/* ── Step 1 ── */}
            {nbStep === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray600)', display: 'block', marginBottom: 4 }}>Nama Lengkap *</label>
                  <input className="rl-in" placeholder="Nama sesuai KTP" value={kepala.nama} onChange={e => setKepala(p => ({ ...p, nama: e.target.value }))} />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray600)', display: 'block', marginBottom: 4 }}>
                    Nomor HP (WhatsApp) {nbMode === 'warga_baru' ? '*' : ''}
                  </label>
                  <input className="rl-in" inputMode="tel" placeholder="0812xxxxxxxx" value={kepala.phone}
                    onChange={e => setKepala(p => ({ ...p, phone: e.target.value }))} />
                  <div style={{ fontSize: 11, color: 'var(--gray400)', marginTop: 4, display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                    <Info size={11} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span>Masukkan nomor HP aktif yang dipakai WhatsApp — ini akan menjadi akun login Anda.</span>
                  </div>

                  {/* Phone check result */}
                  {phoneCheck && (
                    <div className={`ib ${phoneCheck.found ? 'blue' : ''}`} style={{
                      marginTop: 8,
                      background: phoneCheck.found ? 'var(--g50)' : 'var(--gray50)',
                      border: `1px solid ${phoneCheck.found ? 'var(--g200)' : 'var(--gray200)'}`,
                    }}>
                      {phoneCheck.found
                        ? <CheckCircle size={14} color="var(--g600)" style={{ flexShrink: 0, marginTop: 1 }} />
                        : <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />}
                      <div style={{ fontSize: 12 }}>
                        {phoneCheck.found
                          ? <><b>Nomor terdaftar atas nama: {phoneCheck.nama}</b><br /><span style={{ color: 'var(--gray500)' }}>Data kepala keluarga ini akan diperbarui. Klik &quot;Lanjut&quot; untuk melanjutkan.</span></>
                          : <><b>Nomor baru — belum terdaftar.</b><br /><span style={{ color: 'var(--gray500)' }}>Akan dibuat akun kepala keluarga baru dengan nomor ini. Klik &quot;Lanjut&quot; untuk melanjutkan.</span></>}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray600)', display: 'block', marginBottom: 4 }}>Blok & No. Rumah</label>
                  <input className="rl-in" placeholder="Mis. A-12 atau No. 5" value={kepala.noRumah} onChange={e => setKepala(p => ({ ...p, noRumah: e.target.value }))} />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray600)', display: 'block', marginBottom: 4 }}>Jenis Kelamin</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[['L', 'Laki-laki'], ['P', 'Perempuan']].map(([val, lbl]) => (
                      <label key={val} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, padding: '10px 12px', borderRadius: 10, border: `2px solid ${kepala.jk === val ? 'var(--g500)' : 'var(--gray200)'}`, background: kepala.jk === val ? 'var(--g50)' : 'white', fontFamily: 'var(--f)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        <input type="radio" style={{ display: 'none' }} checked={kepala.jk === val} onChange={() => setKepala(p => ({ ...p, jk: val }))} />
                        {lbl}
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray600)', display: 'block', marginBottom: 4 }}>Agama</label>
                    <select className="rl-in" value={kepala.agama} onChange={e => setKepala(p => ({ ...p, agama: e.target.value }))}>
                      {AGAMA_OPTIONS.map(a => <option key={a}>{a}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray600)', display: 'block', marginBottom: 4 }}>Status Perkawinan</label>
                    <select className="rl-in" value={kepala.kawin} onChange={e => setKepala(p => ({ ...p, kawin: e.target.value }))}>
                      {KAWIN_OPTIONS.map(k => <option key={k}>{k}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray600)', display: 'block', marginBottom: 4 }}>Status Hunian</label>
                    <select className="rl-in" value={kepala.hunian} onChange={e => setKepala(p => ({ ...p, hunian: e.target.value }))}>
                      {HUNIAN_OPTIONS.map(h => <option key={h}>{h}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray600)', display: 'block', marginBottom: 4 }}>Mulai Menempati</label>
                    <input className="rl-in" type="date" value={kepala.tgl} onChange={e => setKepala(p => ({ ...p, tgl: e.target.value }))} />
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 2 ── */}
            {nbStep === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="ib blue">
                  <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                  <div>Tambahkan anggota keluarga yang tinggal serumah di PKR. Tinggal sendiri? Langsung lewati langkah ini.</div>
                </div>
                {anggotaList.map((a, i) => (
                  <div key={i} style={{ border: '1.5px solid var(--gray200)', borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--gray700)' }}>Anggota {i + 1}</span>
                      <button onClick={() => setAnggotaList(p => p.filter((_, idx) => idx !== i))}
                        style={{ border: 'none', background: 'var(--red-l)', color: 'var(--red)', borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--f)' }}>
                        Hapus
                      </button>
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray500)', display: 'block', marginBottom: 3 }}>Nama Lengkap Sesuai KTP</label>
                      <input className="rl-in" placeholder="Nama lengkap" value={a.nama} onChange={e => setAnggota(i, 'nama', e.target.value)} style={{ marginBottom: 0 }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray500)', display: 'block', marginBottom: 3 }}>Hubungan</label>
                      <select className="rl-in" value={a.hub} onChange={e => setAnggota(i, 'hub', e.target.value)} style={{ marginBottom: 0 }}>
                        {HUB_OPTIONS.map(h => <option key={h}>{h}</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray500)', display: 'block', marginBottom: 3 }}>Agama</label>
                        <select className="rl-in" value={a.agama} onChange={e => setAnggota(i, 'agama', e.target.value)} style={{ marginBottom: 0 }}>
                          {AGAMA_OPTIONS.map(ag => <option key={ag}>{ag}</option>)}
                        </select>
                      </div>
                      <div style={{ flex: '0 0 120px' }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray500)', display: 'block', marginBottom: 3 }}>Jenis Kelamin</label>
                        <select className="rl-in" value={a.jk} onChange={e => setAnggota(i, 'jk', e.target.value)} style={{ marginBottom: 0 }}>
                          <option value="L">Laki-laki</option>
                          <option value="P">Perempuan</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
                <button className="rl-b" style={{ height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  onClick={() => setAnggotaList(p => [...p, { ...defaultAnggota }])}>
                  + Tambah Anggota
                </button>
              </div>
            )}

            {/* ── Step 3 ── */}
            {nbStep === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="ib blue">
                  <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                  <div>Bisa lebih dari satu file (maks. 10 file, 5 MB per file). Pastikan <b>foto KTP kepala keluarga</b> dan <b>scan Kartu Keluarga</b> terlihat jelas.</div>
                </div>
                <input ref={cameraRef} type="file" accept="image/*" capture="environment" multiple style={{ display: 'none' }} onChange={e => addFiles(e.target.files)} />
                <input ref={galleryRef} type="file" accept="image/*,application/pdf" multiple style={{ display: 'none' }} onChange={e => addFiles(e.target.files)} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="rl-b" style={{ flex: 1, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexDirection: 'column', fontSize: 12, fontWeight: 700 }}
                    onClick={() => cameraRef.current?.click()}>
                    <Camera size={20} color="var(--g600)" />Ambil Foto
                  </button>
                  <button className="rl-b" style={{ flex: 1, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexDirection: 'column', fontSize: 12, fontWeight: 700 }}
                    onClick={() => galleryRef.current?.click()}>
                    <Image size={20} color="var(--g600)" />Pilih dari Galeri
                  </button>
                </div>
                {fotoFiles.length > 0 ? (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                      {fotoFiles.map((file, i) => (
                        <div key={i} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', aspectRatio: '1', background: 'var(--gray100)' }}>
                          {fotoPreviews[i]
                            ? <img src={fotoPreviews[i]} alt={file.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, padding: 8 }}>
                                <FileText size={24} color="var(--gray400)" />
                                <span style={{ fontSize: 9, color: 'var(--gray500)', textAlign: 'center', wordBreak: 'break-all', lineHeight: 1.2 }}>{file.name}</span>
                              </div>}
                          <button onClick={() => removeFile(i)} style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,.55)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                            <X size={12} color="white" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--gray500)', textAlign: 'center' }}>{fotoFiles.length} file dipilih · Maks. 10 file</div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--gray400)', fontSize: 12 }}>
                    Belum ada foto yang dipilih.<br /><span style={{ fontSize: 11 }}>Lampiran tidak wajib, tapi sangat membantu verifikasi.</span>
                  </div>
                )}
              </div>
            )}

            {/* Navigation */}
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              {nbStep > 1 && (
                <button className="rl-b" style={{ height: 48, flex: '0 0 90px' }} onClick={() => { setNbStep(s => s - 1); setPhoneCheck(null) }}>← Kembali</button>
              )}
              {nbStep < 3 ? (
                <button className="btn-p" style={{ flex: 1, height: 48 }}
                  onClick={nbStep === 1 ? handleStep1Next : () => { setNbMsg(''); setNbStep(s => s + 1) }}
                  disabled={phoneChecking}>
                  {lanjutLabel}
                </button>
              ) : (
                <button className="btn-p" style={{ flex: 1, height: 48, gap: 8 }}
                  onClick={() => setShowConfirmModal(true)} disabled={nbLoading}>
                  {nbLoading ? 'Mengirim…' : <><CheckCircle size={16} /> {nbMode === 'warga_baru' ? 'Kirim Pendaftaran' : 'Kirim Pembaruan'}</>}
                </button>
              )}
            </div>
            {nbMsg && <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 8 }}>{nbMsg}</div>}
            <button className="rl-b" style={{ width: '100%', height: 44, marginTop: 8 }} onClick={closeSheet}>Batal</button>
          </>
        )}
      </div>

      {/* ── Confirmation Modal — rendered OUTSIDE the sheet to avoid overflow clipping ── */}
      {showConfirmModal && (
        <div className="sheet show" onClick={e => e.stopPropagation()} style={{ zIndex: 9999, padding: '28px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--g50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={24} color="var(--g600)" />
            </div>
          </div>
          <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--gray800)', textAlign: 'center', marginBottom: 10 }}>
            Persetujuan Data Pribadi
          </div>
          <div style={{ fontSize: 13, color: 'var(--gray600)', lineHeight: 1.65, textAlign: 'center', marginBottom: 20, padding: '0 4px' }}>
            Saya dengan kesadaran penuh mengizinkan pengurus <b>Paguyuban PKR-Pepe</b> untuk menyimpan dan menggunakan data pribadi saya untuk kepentingan lingkungan secara hati-hati dan bertanggungjawab.
          </div>
          {nbMsg && (
            <div style={{ fontSize: 12, color: 'var(--red)', padding: '8px 12px', background: 'var(--red-l)', borderRadius: 10, marginBottom: 12 }}>
              {nbMsg}
            </div>
          )}
          <button className="btn-p" style={{ width: '100%', height: 48, gap: 8, marginBottom: 10 }}
            disabled={nbLoading}
            onClick={async () => { setShowConfirmModal(false); await submitWargaBaru() }}>
            {nbLoading ? 'Mengirim…' : <><CheckCircle size={16} /> Setuju &amp; Kirim</>}
          </button>
          <button className="rl-b" style={{ width: '100%', height: 44 }}
            disabled={nbLoading} onClick={() => setShowConfirmModal(false)}>
            Batal
          </button>
        </div>
      )}

      {/* ── Pengumuman Sheet ── */}
      <div className={`sheet${sheet === 'pengumuman' ? ' show' : ''}`} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="sheet-grip" />
        <div className="sheet-h" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Bell size={18} /> Pengumuman RT</div>
        <div className="sheet-d">Informasi terbaru dari pengurus RT.</div>
        {pengumuman.length === 0 ? (
          <div className="empty">
            <div className="e-i" style={{ display: 'flex', justifyContent: 'center' }}><Megaphone size={38} color="var(--gray400)" /></div>
            <div className="e-t">Belum ada pengumuman</div>
            <div className="e-d">Info dari Ketua RT akan muncul di sini.</div>
          </div>
        ) : (
          <div className="peng-card" style={{ margin: 0 }}>
            {pengumuman.map(p => {
              const pri = p.prioritas === 'penting' || p.prioritas === 'tinggi'
              const IcoEl = pri ? <AlertTriangle size={18} color="var(--red)" /> : p.kategori === 'acara' ? <Calendar size={18} color="var(--blue)" /> : <Megaphone size={18} color="var(--orange)" />
              const bg = pri ? 'var(--red-l)' : p.kategori === 'acara' ? 'var(--blue-l)' : 'var(--orange-l)'
              return (
                <div key={p.id} className="peng-item" style={{ alignItems: 'flex-start' }}>
                  <div className="pi-ico" style={{ background: bg, marginTop: 2 }}>{IcoEl}</div>
                  <div className="pi-body">
                    <div className="pi-t">
                      {p.judul}
                      {pri && <span className="pill penting">Penting</span>}
                    </div>
                    {p.isi && <div className="pi-d" style={{ WebkitLineClamp: 'unset', overflow: 'visible' }}>{p.isi}</div>}
                    <div className="pi-time">{timeAgo(p.createdAt)}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <button className="rl-b" style={{ width: '100%', height: 44, marginTop: 16 }} onClick={closeSheet}>Tutup</button>
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
                <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}><CheckCircle size={52} color="var(--g500)" /></div>
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
                  <div key={item.id} className="iv-card" style={{ cursor: (item.stok || 0) > 0 ? 'pointer' : 'default' }}
                    onClick={() => { if ((item.stok || 0) > 0) setSewaItem(item) }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--gold-l)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Package size={22} color="var(--gold)" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--gray800)' }}>{item.nama}</div>
                        {item.deskripsi && <div style={{ fontSize: 12, color: 'var(--gray500)', marginTop: 2 }}>{item.deskripsi}</div>}
                        <div style={{ fontSize: 12, color: 'var(--gray500)', marginTop: 2 }}>Stok: {item.stok ?? 0} · {item.hargaSewa ? rupiah(item.hargaSewa) + '/hari' : 'Gratis'}</div>
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

      {/* ── Guest BottomNav ── */}
      <div className="botnav">
        <div className="bn on">
          <div className="bn-i"><Home size={21} /></div>
          <div className="bn-l">Beranda</div>
        </div>
        <div className="bn" onClick={() => openSheet('login')}>
          <div className="bn-i"><CreditCard size={21} /></div>
          <div className="bn-l">Iuran</div>
        </div>
        <div className="bn bn-fab" onClick={() => openSheet('login')}>
          <div className="fab"><Megaphone size={23} /></div>
          <div className="fab-l">Lapor</div>
        </div>
        <div className={`bn${sheet === 'pengumuman' ? ' on' : ''}`} onClick={() => openSheet('pengumuman')}>
          <div className="bn-i"><Bell size={21} /></div>
          <div className="bn-l">Info</div>
        </div>
        <div className="bn" onClick={() => openSheet('login')}>
          <div className="bn-i"><User size={21} /></div>
          <div className="bn-l">Profil</div>
        </div>
      </div>
    </>
  )
}
