import { v2 as cloudinary } from 'cloudinary'
import { NextRequest, NextResponse } from 'next/server'

// Auto-configures from CLOUDINARY_URL env var
cloudinary.config({ secure: true })

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const MAX_FILES = 10

async function uploadToCloudinary(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer())
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder: 'paguyuban', resource_type: 'auto' },
      (err, result) => {
        if (err) reject(err)
        else resolve(result!.secure_url)
      }
    ).end(buffer)
  })
}

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

    const urls = await Promise.all(files.map(uploadToCloudinary))
    return NextResponse.json({ ok: true, urls })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('upload error', msg)
    return NextResponse.json({ error: `Gagal upload: ${msg}` }, { status: 500 })
  }
}
