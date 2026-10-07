'use client'

export interface KkExportData {
  noRumah: string | null
  kepala: {
    namaLengkap: string
    phone: string | null
    agama: string | null
    jenisKelamin: string | null
    statusPerkawinan: string | null
    pekerjaan: string | null
    tanggalLahir: string | null
    statusHunian: string | null
    tanggalMenempati: string | null
    nik: string | null
    noKk: string | null
  } | null
  anggota: {
    namaLengkap: string
    jenisKelamin: string | null
    agama: string | null
    hubunganKeluarga: string | null
    kkStatus: string | null
  }[]
  fotoFiles: string[] | null
}

export interface PdfBuildResult {
  previewUrl: string
  filename: string
  download: () => void
  cleanup: () => void
}

async function loadImgBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

async function addKkPage(
  doc: import('jspdf').jsPDF,
  autoTable: (doc: import('jspdf').jsPDF, opts: object) => void,
  kk: KkExportData,
  rtName: string,
  isFirst: boolean,
) {
  if (!isFirst) doc.addPage()

  const margin = 14
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  let y = margin

  // ── Judul ──
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('FORMULIR DATA WARGA', pageW / 2, y, { align: 'center' })
  y += 7
  doc.setFontSize(10)
  doc.text(rtName, pageW / 2, y, { align: 'center' })
  y += 5
  doc.setLineWidth(0.4)
  doc.line(margin, y, pageW - margin, y)
  y += 8

  // ── Data KK ──
  const kepala = kk.kepala
  const rows: [string, string][] = [
    ['Nama Kepala Keluarga', kepala?.namaLengkap || '-'],
    [`Alamat Rumah di ${rtName}`, kk.noRumah || '-'],
    ['No. Telepon', kepala?.phone || '-'],
    ['Agama', kepala?.agama || '-'],
    ['Jenis Kelamin', kepala?.jenisKelamin === 'L' ? 'Laki-laki' : kepala?.jenisKelamin === 'P' ? 'Perempuan' : '-'],
    ['Status Pernikahan', kepala?.statusPerkawinan || '-'],
    ['Pekerjaan', kepala?.pekerjaan || '-'],
    ['Tanggal Lahir', kepala?.tanggalLahir || '-'],
    ['Status Hunian', kepala?.statusHunian || '-'],
    ['Tanggal Menempati', kepala?.tanggalMenempati || '-'],
    ['NIK', kepala?.nik || '-'],
    ['No KK', kepala?.noKk || '-'],
  ]

  doc.setFontSize(9.5)
  for (const [label, value] of rows) {
    doc.setFont('helvetica', 'bold')
    doc.text(label, margin, y)
    doc.setFont('helvetica', 'normal')
    const wrapped = doc.splitTextToSize(`: ${value}`, pageW - margin - 68)
    doc.text(wrapped, margin + 68, y)
    y += wrapped.length > 1 ? wrapped.length * 5 : 5.5
  }

  y += 4

  // ── Tabel Anggota ──
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.text('Daftar Anggota Keluarga Yang Serumah:', margin, y)
  y += 5

  const anggotaRows = kk.anggota.map(a => [
    a.namaLengkap,
    a.hubunganKeluarga || (a.kkStatus === 'kepala_kk' ? 'Kepala Keluarga' : '-'),
    a.jenisKelamin === 'L' ? 'Laki-laki' : a.jenisKelamin === 'P' ? 'Perempuan' : '-',
    a.agama || '-',
  ])

  if (anggotaRows.length === 0) anggotaRows.push(['-', '-', '-', '-'])

  autoTable(doc, {
    startY: y,
    head: [['Nama Anggota Keluarga', 'Hubungan', 'Jenis Kelamin', 'Agama']],
    body: anggotaRows,
    margin: { left: margin, right: margin },
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [29, 78, 216], fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 'auto' }, 1: { cellWidth: 32 }, 2: { cellWidth: 30 }, 3: { cellWidth: 28 } },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const docAny = doc as any
  const tblFinalY: number | undefined = docAny.getLastAutoTable?.()?.finalY ?? docAny.lastAutoTable?.finalY
  y = (typeof tblFinalY === 'number' ? tblFinalY : y + anggotaRows.length * 8 + 14) + 10

  // ── Pernyataan ──
  const statusHunian = kepala?.statusHunian || 'milik sendiri'
  const statement =
    `Dengan adanya Formulir ini, saya menerangkan bahwasanya saya beserta semua anggota keluarga ` +
    `tinggal dengan status ${statusHunian} di ${rtName}. Dan juga menerangkan telah membaca, mengerti ` +
    `dan paham atas Peraturan dan Tata Tertib Warga dan sanggup menaatinya beserta perubahan-perubahannya.`

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  const stLines = doc.splitTextToSize(statement, pageW - 2 * margin)
  if (y + stLines.length * 5 > pageH - 20) { doc.addPage(); y = margin }
  doc.text(stLines, margin, y)
  y += stLines.length * 5 + 10

  // ── Foto Dokumen ──
  if (kk.fotoFiles && kk.fotoFiles.length > 0) {
    if (y + 10 > pageH - 20) { doc.addPage(); y = margin }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.text('Lampiran Foto Dokumen:', margin, y)
    y += 6

    const imgW = 60
    const PDF_BOX_H = 42
    const imgPerRow = Math.floor((pageW - 2 * margin + 5) / (imgW + 5))
    let col = 0
    let rowMaxH = 0

    for (let fi = 0; fi < kk.fotoFiles.length; fi++) {
      const url = kk.fotoFiles[fi]
      const imgData = await loadImgBase64(url)
      if (!imgData) continue

      const isPdf = !imgData.startsWith('data:image/')

      if (isPdf) {
        if (col === 0 && y + PDF_BOX_H + 5 > pageH - 10) { doc.addPage(); y = margin }
        const x = margin + col * (imgW + 5)
        doc.setDrawColor(180, 40, 40)
        doc.setFillColor(255, 245, 245)
        doc.setLineWidth(0.5)
        doc.rect(x, y, imgW, PDF_BOX_H, 'FD')
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(180, 40, 40)
        doc.text('[ PDF ]', x + imgW / 2, y + PDF_BOX_H / 2 - 4, { align: 'center' })
        doc.setFontSize(7.5)
        doc.setFont('helvetica', 'normal')
        doc.text(`Dokumen ${fi + 1}`, x + imgW / 2, y + PDF_BOX_H / 2 + 5, { align: 'center' })
        doc.setTextColor(0, 0, 0)
        doc.setDrawColor(0, 0, 0)
        rowMaxH = Math.max(rowMaxH, PDF_BOX_H)
      } else {
        let imgH: number
        try {
          const props = doc.getImageProperties(imgData)
          imgH = Math.round((props.height * imgW) / props.width)
        } catch { continue }
        if (col === 0 && y + imgH + 5 > pageH - 10) { doc.addPage(); y = margin }
        const x = margin + col * (imgW + 5)
        const fmt = imgData.startsWith('data:image/png') ? 'PNG' : 'JPEG'
        try { doc.addImage(imgData, fmt, x, y, imgW, imgH) } catch { continue }
        rowMaxH = Math.max(rowMaxH, imgH)
      }

      col++
      if (col >= imgPerRow) { col = 0; y += rowMaxH + 5; rowMaxH = 0 }
    }
    if (col > 0) y += rowMaxH + 5
  }
}

async function buildDoc(kkList: KkExportData[], rtName: string, filename: string): Promise<PdfBuildResult> {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')
  const doc = new jsPDF()
  for (let i = 0; i < kkList.length; i++) {
    await addKkPage(doc, autoTable, kkList[i], rtName, i === 0)
  }
  const blob = doc.output('blob')
  const previewUrl = URL.createObjectURL(blob)
  return {
    previewUrl,
    filename,
    download: () => doc.save(filename),
    cleanup: () => URL.revokeObjectURL(previewUrl),
  }
}

export async function buildKkPdf(kk: KkExportData, rtName: string): Promise<PdfBuildResult> {
  const nama = (kk.kepala?.namaLengkap || kk.noRumah || 'warga').replace(/\s+/g, '_')
  return buildDoc([kk], rtName, `FormulirDataWarga_${nama}.pdf`)
}

export async function buildAllKkPdf(kkList: KkExportData[], rtName: string): Promise<PdfBuildResult> {
  return buildDoc(kkList, rtName, `FormulirDataWarga_Semua_${rtName.replace(/\s+/g, '_')}.pdf`)
}
