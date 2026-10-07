import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { profiles, rtGroups, wargaInvites } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { normalizePhone } from '@/lib/utils'
import { sendWhatsAppMessage, phoneToJid, DEFAULT_NOTIF_CONFIG } from '@/lib/wa-client'
import type { WaNotifConfig } from '@/lib/wa-client'

// ── Google Drive helpers ─────────────────────────────────────────────────────

function toB64Url(buf: Buffer) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

async function getGoogleToken(): Promise<string> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  if (!email || !rawKey) throw new Error('Google Service Account belum dikonfigurasi di env vars')

  const privateKey = rawKey.replace(/\\n/g, '\n')
  const iat = Math.floor(Date.now() / 1000)
  const exp = iat + 3600
  const header = toB64Url(Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })))
  const claims = toB64Url(Buffer.from(JSON.stringify({
    iss: email, scope: 'https://www.googleapis.com/auth/drive.file',
    aud: 'https://oauth2.googleapis.com/token', exp, iat,
  })))
  const signer = crypto.createSign('RSA-SHA256')
  signer.update(`${header}.${claims}`)
  const jwt = `${header}.${claims}.${toB64Url(Buffer.from(signer.sign(privateKey, 'base64'), 'base64'))}`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  })
  const data = await res.json() as { access_token?: string; error?: string; error_description?: string }
  if (!res.ok || !data.access_token) {
    throw new Error(`Google OAuth error: ${data.error_description || data.error || `HTTP ${res.status}`}`)
  }
  return data.access_token
}

async function uploadBase64ToDrive(dataUrl: string, token: string): Promise<string> {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID
  if (!folderId) return dataUrl
  const [head, b64] = dataUrl.split(',')
  const mimeType = head.match(/data:([^;]+)/)?.[1] || 'image/jpeg'
  const boundary = 'b_' + Date.now()
  const body = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8', '',
    JSON.stringify({ name: `foto_${Date.now()}.jpg`, parents: [folderId] }),
    `--${boundary}`,
    `Content-Type: ${mimeType}`, 'Content-Transfer-Encoding: base64', '', b64,
    `--${boundary}--`,
  ].join('\r\n')
  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': `multipart/related; boundary="${boundary}"` },
    body,
  })
  const data = await res.json() as { id?: string }
  if (!data.id) return dataUrl
  // Set public read
  await fetch(`https://www.googleapis.com/drive/v3/files/${data.id}/permissions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'reader', type: 'anyone' }),
  }).catch(() => {})
  return `https://drive.google.com/uc?export=view&id=${data.id}`
}

async function processPhotos(fotoFiles: string[]): Promise<{ urls: string[]; error: string | null }> {
  try {
    const token = await getGoogleToken()
    const urls = await Promise.all(fotoFiles.map(f => uploadBase64ToDrive(f, token)))
    return { urls, error: null }
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    console.error('Google Drive upload error:', error)
    return { urls: fotoFiles, error }
  }
}

// ── Main handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { jenis = 'warga_baru', nama, noRumah, phone, dataKk, anggota, fotoFiles } = body

    if (!nama || typeof nama !== 'string' || !nama.trim()) {
      return NextResponse.json({ error: 'Nama wajib diisi' }, { status: 400 })
    }

    const [rt] = await db.select().from(rtGroups).limit(1)
    if (!rt) return NextResponse.json({ error: 'Data RT belum dikonfigurasi' }, { status: 400 })

    let profileId: string | null = null
    if (phone) {
      const normalPhone = normalizePhone(phone)
      const existing = await db.select().from(profiles).where(eq(profiles.phone, normalPhone)).limit(1)
      if (jenis === 'warga_baru' && existing.length > 0) {
        return NextResponse.json({ error: 'Nomor HP sudah terdaftar. Silakan login.' }, { status: 409 })
      }
      if (jenis === 'warga_baru' && existing.length === 0) {
        const [newProfile] = await db.insert(profiles).values({
          phone: normalPhone, fullName: nama.trim(), role: 'warga',
          rtGroupId: rt.id, isActive: false, isVerified: false, noRumah: noRumah || null,
        }).returning()
        profileId = newProfile.id
      }
      if (jenis === 'pemutakhiran_warga' && existing.length > 0) {
        profileId = existing[0].id
      }
      if (jenis === 'pemutakhiran_warga' && existing.length === 0) {
        // Phone belum di-sistem — buat profile baru (diperlakukan seperti warga_baru)
        const [newProfile] = await db.insert(profiles).values({
          phone: normalPhone, fullName: nama.trim(), role: 'warga',
          rtGroupId: rt.id, isActive: false, isVerified: false, noRumah: noRumah || null,
        }).returning()
        profileId = newProfile.id
      }
      if (jenis === 'pemutakhiran' && existing.length > 0) profileId = existing[0].id
    }

    // Upload foto ke Google Drive (jika dikonfigurasi), fallback ke base64
    let finalFotos: string[] | null = null
    let driveWarning: string | null = null
    if (fotoFiles && fotoFiles.length > 0) {
      const result = await processPhotos(fotoFiles)
      finalFotos = result.urls
      driveWarning = result.error
    }

    const [invite] = await db.insert(wargaInvites).values({
      rtGroupId: rt.id, nama: nama.trim(), noRumah: noRumah || null,
      status: 'pending', jenis, profileId,
      dataKk: dataKk || null, anggota: anggota || null,
      fotoFiles: finalFotos,
    }).returning()

    // WA konfirmasi ke pendaftar (fire-and-forget, tidak memblokir response)
    if (phone) {
      try {
        const cfg: WaNotifConfig = { ...DEFAULT_NOTIF_CONFIG, ...(rt.waNotifConfig as WaNotifConfig | null ?? {}) }
        if (cfg.dataDiterima !== false) {
          const namaWarga = nama.trim()
          const msg = jenis === 'pemutakhiran_warga'
            ? `Halo *${namaWarga}*! 👋\n\nData *pemutakhiran warga* Anda sudah *diterima* dan akan diverifikasi oleh pengurus RT dalam *1×24 jam*.\n\nKami akan menginformasikan melalui WhatsApp ini ketika akun Anda telah aktif. 🏡`
            : `Halo *${namaWarga}*! 👋\n\nTerima kasih telah mendaftar sebagai warga baru! 🎉\n\nData *pendaftaran* Anda sudah *diterima* dan akan diverifikasi oleh pengurus RT dalam *1×24 jam*.\n\nKami akan menginformasikan melalui WhatsApp ini ketika akun Anda telah aktif dan siap digunakan. 🏡`
          await sendWhatsAppMessage(phoneToJid(normalizePhone(phone)), msg)
        }
      } catch { /* non-blocking */ }
    }

    return NextResponse.json({ ok: true, inviteId: invite.id, profileId, driveWarning })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('register error', msg)
    return NextResponse.json({ error: `Gagal mendaftarkan data: ${msg}` }, { status: 500 })
  }
}
