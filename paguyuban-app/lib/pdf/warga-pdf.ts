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

async function loadPdfBytes(url: string): Promise<ArrayBuffer | null> {
  try {
    if (url.startsWith('data:')) {
      const base64 = url.split(',')[1]
      if (!base64) return null
      const binary = atob(base64)
      const arr = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i)
      return arr.buffer
    }
    const res = await fetch(url)
    if (!res.ok) return null
    return await res.arrayBuffer()
  } catch {
    return null
  }
}

// Returns list of PDF attachment URLs found in this KK's fotoFiles
async function addKkPage(
  doc: import('jspdf').jsPDF,
  autoTable: (doc: import('jspdf').jsPDF, opts: object) => void,
  kk: KkExportData,
  rtName: string,
  isFirst: boolean,
): Promise<string[]> {
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

  // ── Lampiran Dokumen — halaman tersendiri ──
  const fotoFiles = kk.fotoFiles ?? []
  if (fotoFiles.length === 0) return []

  doc.addPage()
  y = margin

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('LAMPIRAN DOKUMEN', pageW / 2, y, { align: 'center' })
  y += 6
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80, 80, 80)
  doc.text(`No. ${kk.noRumah || '-'} — ${kepala?.namaLengkap || '-'}`, pageW / 2, y, { align: 'center' })
  doc.setTextColor(0, 0, 0)
  y += 5
  doc.setLineWidth(0.3)
  doc.line(margin, y, pageW - margin, y)
  y += 8

  const imgW = pageW - 2 * margin
  const MAX_IMG_H = 160
  const collectedPdfUrls: string[] = []

  for (let fi = 0; fi < fotoFiles.length; fi++) {
    const url = fotoFiles[fi]
    const imgData = await loadImgBase64(url)
    if (!imgData) continue

    const isPdf = !imgData.startsWith('data:image/')

    if (isPdf) {
      collectedPdfUrls.push(url)
      // Placeholder that notes the PDF is embedded at the end
      const boxH = 24
      if (y + boxH + 6 > pageH - 10) { doc.addPage(); y = margin }
      doc.setDrawColor(180, 40, 40)
      doc.setFillColor(255, 245, 245)
      doc.setLineWidth(0.5)
      doc.rect(margin, y, imgW, boxH, 'FD')
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(180, 40, 40)
      doc.text(`[ PDF ] Dokumen ${fi + 1}`, pageW / 2, y + 9, { align: 'center' })
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(80, 80, 80)
      doc.text('Lihat halaman lampiran PDF di akhir dokumen ini', pageW / 2, y + 18, { align: 'center' })
      doc.setTextColor(0, 0, 0)
      doc.setDrawColor(0, 0, 0)
      y += boxH + 8
    } else {
      let imgH: number
      try {
        const props = doc.getImageProperties(imgData)
        imgH = Math.min(Math.round((props.height * imgW) / props.width), MAX_IMG_H)
      } catch { continue }

      if (y + 14 + imgH > pageH - 10) { doc.addPage(); y = margin }

      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 100, 100)
      doc.text(`Dokumen ${fi + 1}`, margin, y)
      doc.setTextColor(0, 0, 0)
      y += 5

      const fmt = imgData.startsWith('data:image/png') ? 'PNG' : 'JPEG'
      try { doc.addImage(imgData, fmt, margin, y, imgW, imgH) } catch { continue }
      y += imgH + 10
    }
  }

  return collectedPdfUrls
}

async function buildDoc(kkList: KkExportData[], rtName: string, filename: string): Promise<PdfBuildResult> {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')
  const doc = new jsPDF()

  const allPdfUrls: string[] = []
  for (let i = 0; i < kkList.length; i++) {
    const pdfUrls = await addKkPage(doc, autoTable, kkList[i], rtName, i === 0)
    allPdfUrls.push(...pdfUrls)
  }

  // Merge PDF attachments as extra pages using pdf-lib
  if (allPdfUrls.length > 0) {
    try {
      const { PDFDocument } = await import('pdf-lib')
      const mainBytes = doc.output('arraybuffer')
      const mainDoc = await PDFDocument.load(mainBytes)

      for (const url of allPdfUrls) {
        const pdfBytes = await loadPdfBytes(url)
        if (!pdfBytes) continue
        try {
          const lampDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true })
          const indices = lampDoc.getPageIndices()
          if (indices.length === 0) continue
          const copied = await mainDoc.copyPages(lampDoc, indices)
          copied.forEach((p: import('pdf-lib').PDFPage) => mainDoc.addPage(p))
        } catch { /* skip unreadable PDF */ }
      }

      const finalBytes = await mainDoc.save()
      const blob = new Blob([finalBytes.buffer as ArrayBuffer], { type: 'application/pdf' })
      const previewUrl = URL.createObjectURL(blob)
      return {
        previewUrl,
        filename,
        download: () => {
          const a = document.createElement('a')
          a.href = previewUrl
          a.download = filename
          a.click()
        },
        cleanup: () => URL.revokeObjectURL(previewUrl),
      }
    } catch { /* fallback to plain output if pdf-lib fails */ }
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
