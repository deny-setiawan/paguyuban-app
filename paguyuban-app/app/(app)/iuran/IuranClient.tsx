'use client'

import { useState } from 'react'
import { rupiah, BULAN } from '@/lib/utils'
import type { IuranInvoice, IuranPayment } from '@/lib/db/schema'

interface Props {
  invoices: IuranInvoice[]
  payments: IuranPayment[]
  rtBank?: string | null
  rtRekening?: string | null
  rtAtasNama?: string | null
}

const STATUS_INVOICE: Record<string, { label: string; cls: string }> = {
  belum_bayar: { label: 'Belum Bayar', cls: 'belum' },
  lunas: { label: 'Lunas', cls: 'lunas' },
  dibebaskan: { label: 'Dibebaskan', cls: 'selesai' },
}

const STATUS_PAYMENT: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Menunggu Verif', cls: 'menunggu' },
  disetujui: { label: 'Disetujui', cls: 'lunas' },
  ditolak: { label: 'Ditolak', cls: 'ditolak' },
}

export default function IuranClient({ invoices, payments, rtBank, rtRekening, rtAtasNama }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showSheet, setShowSheet] = useState(false)
  const [metode, setMetode] = useState<'transfer' | 'tunai'>('transfer')
  const [buktiUrl, setBuktiUrl] = useState('')
  const [catatan, setCatatan] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState('')
  const [toastOn, setToastOn] = useState(false)
  const [tab, setTab] = useState<'tagihan' | 'riwayat'>('tagihan')
  const [localInvoices, setLocalInvoices] = useState(invoices)

  const unpaid = localInvoices.filter(i => i.status === 'belum_bayar')
  const paid = localInvoices.filter(i => i.status !== 'belum_bayar')
  const selectedInvoices = unpaid.filter(i => selected.has(i.id))
  const totalSelected = selectedInvoices.reduce((s, i) => s + (i.nominal || 0), 0)

  function toggleSelect(id: string) {
    setSelected(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  function selectAll() {
    if (selected.size === unpaid.length) setSelected(new Set())
    else setSelected(new Set(unpaid.map(i => i.id)))
  }

  function showToast(msg: string) {
    setToast(msg)
    setToastOn(true)
    setTimeout(() => setToastOn(false), 2600)
  }

  async function submitPayment() {
    if (!selectedInvoices.length) return
    if (metode === 'transfer' && !buktiUrl.trim()) {
      showToast('Masukkan nomor referensi atau link bukti transfer')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/iuran/bayar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceIds: Array.from(selected),
          metode,
          buktiUrl: buktiUrl.trim() || null,
          catatan: catatan.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      showToast(`✅ Pembayaran ${data.jumlah} tagihan terkirim, menunggu verifikasi`)
      setShowSheet(false)
      setSelected(new Set())
      setBuktiUrl('')
      setCatatan('')
      // Reload invoices from server
      const reload = await fetch('/api/iuran')
      const reloaded = await reload.json()
      if (reloaded.invoices) setLocalInvoices(reloaded.invoices)
    } catch (e: unknown) {
      showToast(`❌ ${e instanceof Error ? e.message : 'Gagal mengirim pembayaran'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className={`toast${toastOn ? ' show' : ''}`}>{toast}</div>

      {/* Tab selector */}
      <div style={{ display: 'flex', gap: 8, background: 'var(--gray100)', borderRadius: 14, padding: 4 }}>
        {(['tagihan', 'riwayat'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, height: 38, border: 'none', borderRadius: 11,
              background: tab === t ? 'var(--white)' : 'transparent',
              color: tab === t ? 'var(--g700)' : 'var(--gray500)',
              fontFamily: 'var(--f)', fontSize: 13, fontWeight: 700,
              boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
              cursor: 'pointer', transition: 'all .15s',
            }}
          >
            {t === 'tagihan' ? `Tagihan${unpaid.length ? ` (${unpaid.length})` : ''}` : 'Riwayat'}
          </button>
        ))}
      </div>

      {tab === 'tagihan' && (
        <>
          {unpaid.length === 0 && paid.length === 0 ? (
            <div className="empty">
              <div className="e-i">💳</div>
              <div className="e-t">Belum ada tagihan</div>
              <div className="e-d">Tagihan iuran bulanan akan muncul di sini setelah dikeluarkan oleh pengurus.</div>
            </div>
          ) : unpaid.length === 0 ? (
            <div className="status-banner aktif">
              <div className="sb-ico">✅</div>
              <div className="sb-txt">
                <div className="sb-l1">Semua iuran lunas</div>
                <div className="sb-l2">Terima kasih atas kontribusi Anda! 🎉</div>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray700)' }}>
                  {unpaid.length} tagihan belum dibayar
                </div>
                <button
                  onClick={selectAll}
                  style={{ border: 'none', background: 'none', fontSize: 12, fontWeight: 700,
                    color: 'var(--g600)', cursor: 'pointer', fontFamily: 'var(--f)' }}
                >
                  {selected.size === unpaid.length ? 'Batal pilih semua' : 'Pilih semua'}
                </button>
              </div>

              <div className="peng-card">
                {unpaid.map(inv => (
                  <div
                    key={inv.id}
                    className="peng-item"
                    onClick={() => toggleSelect(inv.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div style={{
                      width: 22, height: 22, borderRadius: 7, flexShrink: 0,
                      border: `2px solid ${selected.has(inv.id) ? 'var(--g500)' : 'var(--gray300)'}`,
                      background: selected.has(inv.id) ? 'var(--g500)' : 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, color: 'white', marginTop: 2,
                    }}>
                      {selected.has(inv.id) && '✓'}
                    </div>
                    <div className="pi-body">
                      <div className="pi-t">
                        Iuran {BULAN[inv.periodeBulan - 1]} {inv.periodeTahun}
                        <span className={`pill ${STATUS_INVOICE[inv.status]?.cls}`}>
                          {STATUS_INVOICE[inv.status]?.label}
                        </span>
                      </div>
                      <div className="pi-d">
                        {inv.jatuhTempo ? `Jatuh tempo: ${inv.jatuhTempo}` : 'Segera lunasi'}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--g700)', marginTop: 3 }}>
                        {rupiah(inv.nominal)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {selected.size > 0 && (
                <div style={{ position: 'sticky', bottom: 'calc(var(--tabbar-total) + 8px)', zIndex: 20 }}>
                  <button
                    className="btn-p"
                    onClick={() => setShowSheet(true)}
                  >
                    💵 Bayar {selected.size} tagihan · {rupiah(totalSelected)}
                  </button>
                </div>
              )}
            </>
          )}

          {paid.length > 0 && (
            <>
              <div className="sec-h">
                <div className="t"><span className="em">✅</span> Sudah lunas</div>
              </div>
              <div className="peng-card">
                {paid.map(inv => (
                  <div key={inv.id} className="peng-item" style={{ cursor: 'default' }}>
                    <div className="pi-ico" style={{ background: 'var(--g50)' }}>✅</div>
                    <div className="pi-body">
                      <div className="pi-t">
                        Iuran {BULAN[inv.periodeBulan - 1]} {inv.periodeTahun}
                        <span className={`pill ${STATUS_INVOICE[inv.status]?.cls}`}>
                          {STATUS_INVOICE[inv.status]?.label}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--g700)', marginTop: 3 }}>
                        {rupiah(inv.nominal)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {tab === 'riwayat' && (
        payments.length === 0 ? (
          <div className="empty">
            <div className="e-i">📋</div>
            <div className="e-t">Belum ada riwayat pembayaran</div>
            <div className="e-d">Riwayat pembayaran yang sudah diverifikasi akan muncul di sini.</div>
          </div>
        ) : (
          <div className="peng-card">
            {payments.map(p => {
              const st = STATUS_PAYMENT[p.statusVerif] || { label: p.statusVerif, cls: '' }
              return (
                <div key={p.id} className="peng-item" style={{ cursor: 'default' }}>
                  <div className="pi-ico" style={{ background: st.cls === 'lunas' ? 'var(--g50)' : 'var(--gold-l)' }}>
                    {st.cls === 'lunas' ? '✅' : st.cls === 'ditolak' ? '❌' : '⏳'}
                  </div>
                  <div className="pi-body">
                    <div className="pi-t">
                      Pembayaran via {p.metode}
                      <span className={`pill ${st.cls}`}>{st.label}</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--g700)', marginTop: 3 }}>
                      {rupiah(p.nominalBayar)}
                    </div>
                    <div className="pi-time">{new Date(p.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                    {p.catatan && <div className="pi-d">{p.catatan}</div>}
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* Sheet mask */}
      <div
        className={`sheet-mask${showSheet ? ' show' : ''}`}
        onClick={() => setShowSheet(false)}
      />

      {/* Payment sheet */}
      <div className={`sheet${showSheet ? ' show' : ''}`}>
        <div className="sheet-grip" />
        <div className="sheet-h">💵 Konfirmasi Pembayaran</div>
        <div className="sheet-d">
          {selectedInvoices.length} tagihan · Total {rupiah(totalSelected)}
        </div>

        {/* Selected invoices summary */}
        <div style={{ background: 'var(--gray50)', borderRadius: 12, padding: '8px 4px', marginBottom: 16 }}>
          {selectedInvoices.map(inv => (
            <div key={inv.id} className="kv">
              <span className="k">Iuran {BULAN[inv.periodeBulan - 1]} {inv.periodeTahun}</span>
              <span className="v">{rupiah(inv.nominal)}</span>
            </div>
          ))}
          <div className="kv" style={{ borderBottom: 'none' }}>
            <span className="k" style={{ fontWeight: 800, color: 'var(--gray800)' }}>Total</span>
            <span className="v" style={{ color: 'var(--g700)', fontSize: 16 }}>{rupiah(totalSelected)}</span>
          </div>
        </div>

        {/* Method selection */}
        <div className="iv-lb">Metode Pembayaran</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {(['transfer', 'tunai'] as const).map(m => (
            <label key={m} className="nb-seg" style={{ cursor: 'pointer' }}>
              <input type="radio" checked={metode === m} onChange={() => setMetode(m)} />
              {m === 'transfer' ? '🏦 Transfer' : '💵 Tunai'}
            </label>
          ))}
        </div>

        {metode === 'transfer' && (
          <>
            {(rtBank || rtRekening) && (
              <div className="ib blue" style={{ marginBottom: 12 }}>
                <span>🏦</span>
                <div>
                  Transfer ke: <b>{rtBank || 'Bank'}</b><br />
                  No. Rek: <b>{rtRekening || '-'}</b> a.n. <b>{rtAtasNama || '-'}</b>
                </div>
              </div>
            )}
            <div className="iv-lb">Nomor Referensi / Link Bukti Transfer</div>
            <input
              className="rl-in"
              placeholder="Contoh: TRF20240115xxxx atau link screenshot"
              value={buktiUrl}
              onChange={e => setBuktiUrl(e.target.value)}
            />
          </>
        )}

        {metode === 'tunai' && (
          <div className="ib gold" style={{ marginBottom: 12 }}>
            <span>💵</span>
            <div>Pembayaran tunai akan dikonfirmasi langsung oleh Bendahara RT saat menerima uang.</div>
          </div>
        )}

        <div className="iv-lb">Catatan (opsional)</div>
        <input
          className="rl-in"
          placeholder="Catatan untuk pengurus..."
          value={catatan}
          onChange={e => setCatatan(e.target.value)}
        />

        <button
          className="btn-p"
          onClick={submitPayment}
          disabled={loading}
          style={{ marginTop: 8 }}
        >
          {loading ? 'Mengirim...' : `✅ Kirim Pembayaran · ${rupiah(totalSelected)}`}
        </button>
      </div>
    </>
  )
}
