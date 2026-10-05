'use client'

import { useState } from 'react'
import { FileDown, Crown, User, Info, Users } from 'lucide-react'
import type { KkExportData, PdfBuildResult } from '@/lib/pdf/warga-pdf'
import PdfPreviewModal from '@/components/ui/PdfPreviewModal'

interface WargaData {
  id: string
  namaLengkap: string
  nik: string | null
  noKk: string | null
  noRumah: string | null
  jenisKelamin: string | null
  agama: string | null
  statusPerkawinan: string | null
  pekerjaan: string | null
  statusHunian: string | null
  tanggalMenempati: string | null
  tanggalLahir: string | null
  jumlahJiwa: number | null
  hubunganKeluarga: string | null
  kkStatus: string | null
  profileId: string | null
}

interface Props {
  profileId: string
  kepalaKk: WargaData | null
  allAnggota: WargaData[]
  phone: string | null
  fotoFiles: string[]
  rtName: string
}

export default function KeluargaClient({ profileId, kepalaKk, allAnggota, phone, fotoFiles, rtName }: Props) {
  const [building, setBuilding] = useState(false)
  const [pdfPreview, setPdfPreview] = useState<PdfBuildResult | null>(null)

  function closePdfPreview() {
    pdfPreview?.cleanup()
    setPdfPreview(null)
  }

  async function handleExport() {
    if (!kepalaKk) return
    setBuilding(true)
    try {
      const { buildKkPdf } = await import('@/lib/pdf/warga-pdf')
      const exportData: KkExportData = {
        noRumah: kepalaKk.noRumah,
        kepala: {
          namaLengkap: kepalaKk.namaLengkap,
          phone,
          agama: kepalaKk.agama,
          jenisKelamin: kepalaKk.jenisKelamin,
          statusPerkawinan: kepalaKk.statusPerkawinan,
          pekerjaan: kepalaKk.pekerjaan,
          tanggalLahir: kepalaKk.tanggalLahir,
          statusHunian: kepalaKk.statusHunian,
          tanggalMenempati: kepalaKk.tanggalMenempati,
          nik: kepalaKk.nik,
          noKk: kepalaKk.noKk,
        },
        anggota: allAnggota.filter(a => a.id !== kepalaKk.id).map(a => ({
          namaLengkap: a.namaLengkap,
          jenisKelamin: a.jenisKelamin,
          agama: a.agama,
          hubunganKeluarga: a.hubunganKeluarga,
          kkStatus: a.kkStatus,
        })),
        fotoFiles: fotoFiles.length > 0 ? fotoFiles : null,
      }
      const result = await buildKkPdf(exportData, rtName)
      setPdfPreview(result)
    } finally {
      setBuilding(false)
    }
  }

  if (!kepalaKk) {
    return (
      <>
        <div className="status-banner pending">
          <div className="sb-ico"><Users size={24} /></div>
          <div className="sb-txt">
            <div className="sb-l1">Data KK belum tersedia</div>
            <div className="sb-l2">Pengurus RT belum menginput data KK Anda. Hubungi pengurus untuk proses pendaftaran.</div>
          </div>
        </div>
        <div className="ib blue" style={{ marginTop: 16 }}>
          <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>Jika sudah mendaftar, tunggu konfirmasi dari Ketua RT via WhatsApp.</div>
        </div>
      </>
    )
  }

  return (
    <>
      {pdfPreview && (
        <PdfPreviewModal
          previewUrl={pdfPreview.previewUrl}
          filename={pdfPreview.filename}
          onDownload={pdfPreview.download}
          onClose={closePdfPreview}
        />
      )}

      <div className="sec-h" style={{ marginBottom: 12 }}>
        <div className="t"><Users size={16} /> Data Kepala KK</div>
        <button
          onClick={handleExport}
          disabled={building}
          style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: '1.5px solid var(--g600)', color: 'var(--g600)', borderRadius: 10, padding: '5px 12px', fontWeight: 700, fontSize: 12, cursor: 'pointer', opacity: building ? 0.7 : 1 }}>
          <FileDown size={13} /> {building ? 'Membuat PDF...' : 'Export PDF'}
        </button>
      </div>
      <div className="peng-card" style={{ padding: '4px 14px', marginBottom: 20 }}>
        <div className="kv"><span className="k">Nama KK</span><span className="v">{kepalaKk.namaLengkap}</span></div>
        {kepalaKk.noKk && <div className="kv"><span className="k">No. KK</span><span className="v">{kepalaKk.noKk}</span></div>}
        {kepalaKk.nik && <div className="kv"><span className="k">NIK</span><span className="v">{kepalaKk.nik}</span></div>}
        {kepalaKk.noRumah && <div className="kv"><span className="k">No. Rumah</span><span className="v">{kepalaKk.noRumah}</span></div>}
        {kepalaKk.jenisKelamin && <div className="kv"><span className="k">Jenis Kelamin</span><span className="v">{kepalaKk.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</span></div>}
        {kepalaKk.agama && <div className="kv"><span className="k">Agama</span><span className="v">{kepalaKk.agama}</span></div>}
        {kepalaKk.statusPerkawinan && <div className="kv"><span className="k">Status Kawin</span><span className="v">{kepalaKk.statusPerkawinan}</span></div>}
        {kepalaKk.pekerjaan && <div className="kv"><span className="k">Pekerjaan</span><span className="v">{kepalaKk.pekerjaan}</span></div>}
        {kepalaKk.statusHunian && <div className="kv"><span className="k">Status Hunian</span><span className="v">{kepalaKk.statusHunian}</span></div>}
        {kepalaKk.tanggalMenempati && <div className="kv"><span className="k">Tgl. Menempati</span><span className="v">{kepalaKk.tanggalMenempati}</span></div>}
        <div className="kv" style={{ borderBottom: 'none' }}><span className="k">Jumlah Jiwa</span><span className="v">{kepalaKk.jumlahJiwa ?? '-'}</span></div>
      </div>

      <div className="sec-h" style={{ marginBottom: 12 }}>
        <div className="t"><Users size={16} /> Anggota Keluarga</div>
        <span style={{ fontSize: 12, color: 'var(--gray400)', fontWeight: 700 }}>{allAnggota.length} jiwa</span>
      </div>

      {allAnggota.length <= 1 && !kepalaKk.noKk && !kepalaKk.noRumah ? (
        <div className="ib blue">
          <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>Data anggota keluarga akan muncul setelah No. KK atau No. Rumah diisi oleh pengurus RT.</div>
        </div>
      ) : (
        <div className="peng-card">
          {allAnggota.map((a) => (
            <div key={a.id} className="peng-item" style={{ cursor: 'default' }}>
              <div className="pi-ico" style={{ background: a.profileId === profileId ? 'var(--g50)' : 'var(--gray100)' }}>
                {a.profileId === profileId
                  ? <Crown size={18} color="var(--g600)" />
                  : <User size={18} color="var(--gray500)" />}
              </div>
              <div className="pi-body">
                <div className="pi-t">
                  {a.namaLengkap}
                  {a.profileId === profileId && <span className="pill lunas">Kepala KK</span>}
                  {a.hubunganKeluarga && a.profileId !== profileId && <span className="pill selesai">{a.hubunganKeluarga}</span>}
                </div>
                <div className="pi-d">
                  {[
                    a.jenisKelamin === 'L' ? 'Laki-laki' : a.jenisKelamin === 'P' ? 'Perempuan' : null,
                    a.agama,
                    a.pekerjaan,
                  ].filter(Boolean).join(' · ')}
                </div>
                {a.nik && <div style={{ fontSize: 11, color: 'var(--gray400)', marginTop: 2 }}>NIK: {a.nik}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="ib green" style={{ marginTop: 16 }}>
        <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
        <div>Untuk memperbarui data KK atau anggota keluarga, gunakan <b>Pemutakhiran Data</b> di halaman utama atau hubungi pengurus RT.</div>
      </div>
    </>
  )
}
