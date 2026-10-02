'use client'

import { useState } from 'react'
import { rupiah, BULAN } from '@/lib/utils'
import { CreditCard, CheckCircle, Clock, Send, RefreshCw } from 'lucide-react'

interface InvoiceItem {
  id: string
  wargaNama: string
  wargaNoRumah: string | null
  periodeBulan: number
  periodeTahun: number
  nominal: number
  status: string
}

interface Props {
  invoices: InvoiceItem[]
  currentBulan: number
  currentTahun: number
  nominalDefault: number
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  belum_bayar: { label: 'Belum Bayar', cls: 'belum' },
  lunas: { label: 'Lunas', cls: 'lunas' },
  dibebaskan: { label: 'Dibebaskan', cls: 'selesai' },
}

const TAHUN_OPTIONS = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 2 + i)

export default function TagihanClient({ invoices, currentBulan, currentTahun, nominalDefault }: Props) {
  const [tab, setTab] = useState<'buat' | 'riwayat'>('buat')
  const [bulan, setBulan] = useState(currentBulan)
  const [tahun, setTahun] = useState(currentTahun)
  const [nominal, setNominal] = useState(nominalDefault > 0 ? String(nominalDefault) : '')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ created: number; skipped: number; nominal: number; message: string } | null>(null)
  const [error, setError] = useState('')

  // Riwayat filter
  const [filterBulan, setFilterBulan] = useState(currentBulan)
  const [filterTahun, setFilterTahun] = useState(currentTahun)
  const [localInvoices] = useState(invoices)

  const filteredInvoices = localInvoices.filter(
    inv => inv.periodeBulan === filterBulan && inv.periodeTahun === filterTahun
  )

  const lunas = filteredInvoices.filter(i => i.status === 'lunas').length
  const belumBayar = filteredInvoices.filter(i => i.status === 'belum_bayar').length

  async function generate() {
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await fetch('/api/iuran/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bulan, tahun, nominal: nominal ? Number(nominal) : undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data)
      if (data.created > 0) {
        setFilterBulan(bulan)
        setFilterTahun(tahun)
        setTab('riwayat')
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Gagal membuat tagihan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 8, background: 'var(--gray100)', borderRadius: 14, padding: 4, marginBottom: 16 }}>
        {(['buat', 'riwayat'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, height: 38, border: 'none', borderRadius: 11,
            background: tab === t ? 'var(--white)' : 'transparent',
            color: tab === t ? 'var(--g700)' : 'var(--gray500)',
            fontFamily: 'var(--f)', fontSize: 13, fontWeight: 700,
            boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
            cursor: 'pointer',
          }}>
            {t === 'buat' ? '+ Buat Tagihan' : 'Riwayat Tagihan'}
          </button>
        ))}
      </div>

      {tab === 'buat' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {result && (
            <div className={`status-banner ${result.created > 0 ? 'aktif' : 'pending'}`}>
              <div className="sb-ico">
                {result.created > 0 ? <CheckCircle size={24} /> : <RefreshCw size={24} />}
              </div>
              <div className="sb-txt">
                <div className="sb-l1">{result.message}</div>
                <div className="sb-l2">
                  {result.created > 0
                    ? `${result.created} tagihan @ ${rupiah(result.nominal)}`
                    : `${result.skipped} tagihan sudah ada`}
                </div>
              </div>
            </div>
          )}

          <div style={{ background: 'var(--gray50)', borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray600)', marginBottom: 10, letterSpacing: 0.5 }}>PERIODE TAGIHAN</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray600)', display: 'block', marginBottom: 4 }}>Bulan</label>
                <select className="rl-in" value={bulan} onChange={e => setBulan(Number(e.target.value))}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(b => (
                    <option key={b} value={b}>{BULAN[b]}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray600)', display: 'block', marginBottom: 4 }}>Tahun</label>
                <select className="rl-in" value={tahun} onChange={e => setTahun(Number(e.target.value))}>
                  {TAHUN_OPTIONS.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray600)', display: 'block', marginBottom: 4 }}>
              Nominal Iuran (Rp)
            </label>
            <input
              className="rl-in"
              inputMode="numeric"
              placeholder={nominalDefault > 0 ? `Default: ${rupiah(nominalDefault)}` : 'Masukkan nominal...'}
              value={nominal}
              onChange={e => setNominal(e.target.value.replace(/\D/g, ''))}
            />
            {nominalDefault > 0 && !nominal && (
              <div style={{ fontSize: 11, color: 'var(--gray400)', marginTop: 4 }}>
                Kosongkan untuk pakai nominal setting RT: {rupiah(nominalDefault)}
              </div>
            )}
          </div>

          <div className="ib blue">
            <CreditCard size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              Sistem akan membuat tagihan untuk semua warga aktif yang <b>belum</b> memiliki tagihan di periode {BULAN[bulan]} {tahun}.
              Warga yang sudah punya tagihan tidak akan digandakan.
            </div>
          </div>

          {error && (
            <div style={{ fontSize: 12, color: 'var(--red)', padding: '8px 12px', background: 'var(--red-l)', borderRadius: 10 }}>
              {error}
            </div>
          )}

          <button className="btn-p" onClick={generate} disabled={loading}>
            {loading ? 'Membuat tagihan...' : <><Send size={16} /> Buat Tagihan {BULAN[bulan]} {tahun}</>}
          </button>
        </div>
      )}

      {tab === 'riwayat' && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <select className="rl-in" value={filterBulan} onChange={e => setFilterBulan(Number(e.target.value))} style={{ flex: 1 }}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(b => (
                <option key={b} value={b}>{BULAN[b]}</option>
              ))}
            </select>
            <select className="rl-in" value={filterTahun} onChange={e => setFilterTahun(Number(e.target.value))} style={{ flex: 1 }}>
              {TAHUN_OPTIONS.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {filteredInvoices.length > 0 && (
            <div className="rl-st" style={{ marginBottom: 12 }}>
              <div>
                <b style={{ display: 'block', fontSize: 16, fontWeight: 800, color: 'var(--gray900)' }}>{filteredInvoices.length}</b>
                <span>Total KK</span>
              </div>
              <div>
                <b style={{ display: 'block', fontSize: 14, fontWeight: 700, color: 'var(--g700)' }}>{lunas}</b>
                <span>Sudah Bayar</span>
              </div>
              <div>
                <b style={{ display: 'block', fontSize: 14, fontWeight: 700, color: 'var(--gold)' }}>{belumBayar}</b>
                <span>Belum Bayar</span>
              </div>
            </div>
          )}

          {filteredInvoices.length === 0 ? (
            <div className="empty">
              <div className="e-i" style={{ display: 'flex', justifyContent: 'center' }}><CreditCard size={38} color="var(--gray400)" /></div>
              <div className="e-t">Belum ada tagihan</div>
              <div className="e-d">Tagihan {BULAN[filterBulan]} {filterTahun} belum dibuat. Gunakan tab &quot;Buat Tagihan&quot; untuk generate.</div>
              <button className="btn-p" style={{ marginTop: 12 }} onClick={() => { setBulan(filterBulan); setTahun(filterTahun); setTab('buat') }}>
                + Buat Tagihan {BULAN[filterBulan]} {filterTahun}
              </button>
            </div>
          ) : (
            <div className="peng-card">
              {filteredInvoices.map(inv => {
                const st = STATUS_MAP[inv.status] || { label: inv.status, cls: '' }
                return (
                  <div key={inv.id} className="peng-item" style={{ cursor: 'default' }}>
                    <div className="pi-ico" style={{
                      background: inv.status === 'lunas' ? 'var(--g50)' : inv.status === 'dibebaskan' ? 'var(--teal-l)' : 'var(--gold-l)',
                    }}>
                      {inv.status === 'lunas'
                        ? <CheckCircle size={18} color="var(--g600)" />
                        : inv.status === 'dibebaskan'
                          ? <CheckCircle size={18} color="var(--teal)" />
                          : <Clock size={18} color="var(--gold)" />}
                    </div>
                    <div className="pi-body">
                      <div className="pi-t">
                        {inv.wargaNama}
                        <span className={`pill ${st.cls}`}>{st.label}</span>
                      </div>
                      <div className="pi-d">No. {inv.wargaNoRumah || '-'} · {rupiah(inv.nominal)}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </>
  )
}
