'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Dipanggil saat JWT role berbeda dengan DB role (misal admin ubah role user).
// Refresh token lalu reload halaman agar JWT sinkron dengan DB.
export default function TokenRefresher() {
  const router = useRouter()

  useEffect(() => {
    fetch('/api/auth/refresh', { method: 'POST' })
      .then(r => r.ok ? router.refresh() : null)
      .catch(() => null)
  }, [router])

  return null
}
