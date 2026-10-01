import { NextRequest, NextResponse } from 'next/server'
import { verifyJwt } from '@/lib/auth/jwt'

// Paths unauthenticated users can access freely
const PUBLIC_PATHS = ['/', '/login', '/otp', '/register', '/inventaris', '/api/auth/send-otp', '/api/auth/verify-otp', '/api/inventaris', '/api/register']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

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
    const pengurusRoles = ['ketua', 'sekretaris', 'bendahara', 'admin']
    if (!pengurusRoles.includes(payload.role)) {
      return NextResponse.redirect(new URL('/', request.url))
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
