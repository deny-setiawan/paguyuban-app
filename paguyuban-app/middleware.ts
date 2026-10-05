import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Jika user menuju /otp tapi punya cookie admin_bp → redirect ke /admin-login
  if (pathname === '/otp') {
    const adminBp = request.cookies.get('admin_bp')
    if (adminBp?.value) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin-login'
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/otp'],
}
