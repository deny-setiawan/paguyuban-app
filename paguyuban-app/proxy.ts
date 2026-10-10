import { NextRequest, NextResponse } from 'next/server'
import { verifyJwt } from '@/lib/auth/jwt'

// Paths unauthenticated users can access freely
const PUBLIC_PATHS = ['/', '/login', '/otp', '/admin-login', '/register', '/inventaris', '/api/auth/send-otp', '/api/auth/verify-otp', '/api/auth/admin-login', '/api/inventaris', '/api/register']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Admin bypass: jika menuju /otp tapi punya cookie admin_bp → redirect ke /admin-login
  if (pathname === '/otp') {
    const adminBp = request.cookies.get('admin_bp')
    if (adminBp?.value) {
      return NextResponse.redirect(new URL('/admin-login', request.url))
    }
  }

  const isPublic = PUBLIC_PATHS.some(p => pathname === p || (p !== '/' && pathname.startsWith(p)))
  if (isPublic) return NextResponse.next()

  const token = request.cookies.get('session')?.value
  if (!token) {
    // Redirect unauthenticated users to home (guest view), not /login
    return NextResponse.redirect(new URL('/', request.url))
  }

  const payload = await verifyJwt(token)
  if (!payload) {
    const response = NextResponse.redirect(new URL('/', request.url))
    response.cookies.set('session', '', { maxAge: 0, path: '/' })
    return response
  }

  // Guard pengurus routes
  if (pathname.startsWith('/pengurus')) {
    const pengurusRoles = ['ketua', 'wakil_ketua', 'sekretaris', 'bendahara', 'humas', 'lingkungan', 'keamanan', 'peralatan', 'admin']
    if (!pengurusRoles.includes(payload.role)) {
      return NextResponse.redirect(new URL('/beranda', request.url))
    }
  }

  // Guard admin routes
  if (pathname.startsWith('/admin') && payload.role !== 'admin') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icon-.*\\.png).*)'],
}
