import { put } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const MAX_FILES = 10

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const files = formData.getAll('files') as File[]

    if (!files.length) {
      return NextResponse.json({ error: 'Tidak ada file yang dikirim' }, { status: 400 })
    }
    if (files.length > MAX_FILES) {
      return NextResponse.json({ error: `Maksimal ${MAX_FILES} file` }, { status: 400 })
    }

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: `File "${file.name}" melebihi batas 5 MB` }, { status: 400 })
      }
    }

    const urls: string[] = []
    for (const file of files) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const blob = await put(`dokumen/${Date.now()}-${safeName}`, file, { access: 'public' })
      urls.push(blob.url)
    }

    return NextResponse.json({ ok: true, urls })
  } catch (e) {
    console.error('upload error', e)
    return NextResponse.json({ error: 'Gagal mengupload file. Pastikan BLOB_READ_WRITE_TOKEN sudah dikonfigurasi.' }, { status: 500 })
  }
}
