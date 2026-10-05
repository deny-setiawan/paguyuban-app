import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ensureMigrations } from '@/lib/db'

export const metadata: Metadata = {
  title: 'Paguyuban PKR-Pepe',
  description: 'Aplikasi manajemen RT Paguyuban PKR-Pepe',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#1944bd',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await ensureMigrations()
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  )
}
