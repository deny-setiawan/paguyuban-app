import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const MAX_FILES = 10

function toBase64Url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

async function getAccessToken(): Promise<string> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  if (!email || !rawKey) throw new Error('Konfigurasi Google Service Account belum diatur')

  const privateKey = rawKey.replace(/\\n/g, '\n')
  const iat = Math.floor(Date.now() / 1000)
  const exp = iat + 3600

  const header = toBase64Url(Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })))
  const claims = toBase64Url(Buffer.from(JSON.stringify({
    iss: email,
    scope: 'https://www.googleapis.com/auth/drive.file',
    aud: 'https://oauth2.googleapis.com/token',
    exp,
    iat,
  })))

  const signer = crypto.createSign('RSA-SHA256')
  signer.update(`${header}.${claims}`)
  const signature = toBase64Url(Buffer.from(signer.sign(privateKey, 'base64'), 'base64'))
  const jwt = `${header}.${claims}.${signature}`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })
  const data = await res.json() as { access_token?: string; error_description?: string }
  if (!res.ok) throw new Error(data.error_description || 'Gagal autentikasi Google')
  return data.access_token!
}

async function uploadToDrive(file: File, accessToken: string): Promise<string> {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID
  if (!folderId) throw new Error('GOOGLE_DRIVE_FOLDER_ID belum diatur')

  const fileBuffer = Buffer.from(await file.arrayBuffer())
  const boundary = 'boundary_' + Date.now()
  const meta = JSON.stringify({
    name: `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`,
    parents: [folderId],
  })

  const body = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    meta,
    `--${boundary}`,
    `Content-Type: ${file.type || 'application/octet-stream'}`,
    'Content-Transfer-Encoding: base64',
    '',
    fileBuffer.toString('base64'),
    `--${boundary}--`,
  ].join('\r\n')

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary="${boundary}"`,
      },
      body,
    }
  )
  const uploadData = await uploadRes.json() as { id?: string; error?: { message: string } }
  if (!uploadRes.ok) throw new Error(uploadData.error?.message || 'Upload ke Google Drive gagal')

  const fileId = uploadData.id!

  // Buat file bisa diakses publik
  await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'reader', type: 'anyone' }),
  })

  // URL langsung untuk gambar, link viewer untuk file lain
  return file.type.startsWith('image/')
    ? `https://drive.google.com/uc?export=view&id=${fileId}`
    : `https://drive.google.com/file/d/${fileId}/view`
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

    const accessToken = await getAccessToken()
    const urls = await Promise.all(files.map(f => uploadToDrive(f, accessToken)))
    return NextResponse.json({ ok: true, urls })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('upload error:', msg)
    return NextResponse.json({ error: `Gagal upload: ${msg}` }, { status: 500 })
  }
}
