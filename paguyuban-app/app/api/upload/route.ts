import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const MAX_FILES = 10

function getCloudinaryConfig() {
  const url = process.env.CLOUDINARY_URL
  if (!url) throw new Error('CLOUDINARY_URL tidak dikonfigurasi')
  const match = url.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/)
  if (!match) throw new Error('Format CLOUDINARY_URL tidak valid')
  return { apiKey: match[1], apiSecret: match[2], cloudName: match[3] }
}

async function uploadFile(file: File): Promise<string> {
  const { apiKey, apiSecret, cloudName } = getCloudinaryConfig()
  const timestamp = Math.round(Date.now() / 1000).toString()
  const folder = 'paguyuban'

  const signature = crypto
    .createHash('sha256')
    .update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`)
    .digest('hex')

  const fd = new FormData()
  fd.append('file', file)
  fd.append('api_key', apiKey)
  fd.append('timestamp', timestamp)
  fd.append('signature', signature)
  fd.append('folder', folder)

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
    method: 'POST',
    body: fd,
  })
  const data = await res.json() as { secure_url?: string; error?: { message: string } }
  if (!res.ok) throw new Error(data.error?.message || 'Upload ke Cloudinary gagal')
  return data.secure_url!
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const files = formData.getAll('files') as File[]

    if (!files.length) return NextResponse.json({ error: 'Tidak ada file' }, { status: 400 })
    if (files.length > MAX_FILES) return NextResponse.json({ error: `Maks ${MAX_FILES} file` }, { status: 400 })
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: `File "${file.name}" melebihi 5 MB` }, { status: 400 })
      }
    }

    const urls = await Promise.all(files.map(uploadFile))
    return NextResponse.json({ ok: true, urls })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('upload error:', msg)
    return NextResponse.json({ error: `Gagal upload: ${msg}` }, { status: 500 })
  }
}
