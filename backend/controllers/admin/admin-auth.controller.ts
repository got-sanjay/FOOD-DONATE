import { NextResponse } from 'next/server'
import {
  ADMIN_SESSION_COOKIE,
  adminSessionCookieOptions,
  createAdminSession,
  verifyAdminCredentials,
} from '@/lib/admin-auth'

export class AdminAuthController {
  static async login(request: Request) {
    if (
      !process.env.ADMIN_USERNAME ||
      !process.env.ADMIN_PASSWORD ||
      process.env.ADMIN_PASSWORD.length < 12 ||
      (process.env.NODE_ENV === 'production' && !process.env.NGO_SESSION_SECRET)
    ) {
      return NextResponse.json({ error: 'Admin access is not configured on this server.' }, { status: 503 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 })
    }
    const username = body && typeof body === 'object' && 'username' in body && typeof body.username === 'string' ? body.username : ''
    const password = body && typeof body === 'object' && 'password' in body && typeof body.password === 'string' ? body.password : ''
    if (!verifyAdminCredentials(username, password)) {
      return NextResponse.json({ error: 'Admin username or password is incorrect.' }, { status: 401 })
    }

    const session = createAdminSession()
    const response = NextResponse.json({ success: true })
    response.cookies.set(ADMIN_SESSION_COOKIE, session.value, { ...adminSessionCookieOptions, maxAge: session.maxAge })
    return response
  }

  static async logout() {
    const response = NextResponse.json({ success: true })
    response.cookies.set(ADMIN_SESSION_COOKIE, '', { ...adminSessionCookieOptions, maxAge: 0 })
    return response
  }
}
