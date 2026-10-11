import { NextResponse } from 'next/server'
import {
  createNgoSession,
  getAuthenticatedNgo,
  hashPassword,
  NGO_SESSION_COOKIE,
  ngoSessionCookieOptions,
  verifyPassword,
} from '@/lib/ngo-auth'
import { NgoModel } from '@/backend/models/ngo/ngo.model'
import { NgoView } from '@/backend/views/ngo/ngo.view'

export class NgoAuthController {
  static async login(request: Request) {
    if (process.env.NODE_ENV === 'production' && !process.env.NGO_SESSION_SECRET) {
      return NextResponse.json({ error: 'NGO login is not configured on this server.' }, { status: 503 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 })
    }
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'NGO name and password are required.' }, { status: 400 })
    }

    const input = body as Record<string, unknown>
    const name = typeof input.name === 'string' ? input.name.trim().replace(/\s+/g, ' ') : ''
    const password = typeof input.password === 'string' ? input.password : ''
    if (!name || !password || password.length > 128) {
      return NextResponse.json({ error: 'Enter your NGO name and password.' }, { status: 400 })
    }

    try {
      const ngo = await NgoModel.findByNameKey(name)
      if (!ngo || !(await verifyPassword(password, ngo.passwordHash))) {
        return NextResponse.json({ error: 'NGO name or password is incorrect.' }, { status: 401 })
      }
      if (ngo.reviewStatus === 'pending') {
        return NextResponse.json({ error: 'Your NGO registration is awaiting admin approval.' }, { status: 403 })
      }
      if (ngo.reviewStatus === 'rejected') {
        return NextResponse.json({ error: 'Your NGO registration was not approved. Contact the administrator for assistance.' }, { status: 403 })
      }
      if (!ngo.isActive) {
        return NextResponse.json({ error: 'This NGO account is disabled. Contact the administrator for assistance.' }, { status: 403 })
      }

      const session = createNgoSession(ngo.id)
      const response = NextResponse.json(NgoView.formatNgoSessionResponse(ngo))
      response.cookies.set(NGO_SESSION_COOKIE, session.value, {
        ...ngoSessionCookieOptions,
        maxAge: session.maxAge,
      })
      return response
    } catch {
      return NextResponse.json({ error: 'Could not sign in. Please try again.' }, { status: 500 })
    }
  }

  static async register(request: Request) {
    if (process.env.NODE_ENV === 'production' && !process.env.NGO_SESSION_SECRET) {
      return NextResponse.json({ error: 'NGO login is not configured on this server.' }, { status: 503 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 })
    }
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'NGO name and password are required.' }, { status: 400 })
    }

    const input = body as Record<string, unknown>
    const name = typeof input.name === 'string' ? input.name.trim().replace(/\s+/g, ' ') : ''
    const region = typeof input.region === 'string' ? input.region.trim().replace(/\s+/g, ' ') : ''
    const password = typeof input.password === 'string' ? input.password : ''
    if (name.length < 2 || name.length > 100) {
      return NextResponse.json({ error: 'NGO name must be between 2 and 100 characters.' }, { status: 400 })
    }
    if (region.length < 2 || region.length > 100) {
      return NextResponse.json({ error: 'Enter a valid NGO city or region.' }, { status: 400 })
    }
    if (password.length < 8 || password.length > 128) {
      return NextResponse.json({ error: 'Password must be between 8 and 128 characters.' }, { status: 400 })
    }

    const phone = typeof input.phone === 'string' ? input.phone.trim() : null
    const email = typeof input.email === 'string' ? input.email.trim() : null
    const additionalNotes = typeof input.additionalNotes === 'string' ? input.additionalNotes.trim() : null

    try {
      const passwordHash = await hashPassword(password)
      const ngo = await NgoModel.create({
        name,
        region,
        passwordHash,
        reviewStatus: 'pending',
        phone,
        email,
        additionalNotes,
      })
      const response = NextResponse.json({ ngo, pendingReview: true }, { status: 201 })
      response.cookies.set(NGO_SESSION_COOKIE, '', { ...ngoSessionCookieOptions, maxAge: 0 })
      return response
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
        return NextResponse.json({ error: 'An account with that NGO name already exists.' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Could not create the NGO account.' }, { status: 500 })
    }
  }

  static async logout() {
    const response = NextResponse.json({ success: true })
    response.cookies.set(NGO_SESSION_COOKIE, '', { ...ngoSessionCookieOptions, maxAge: 0 })
    return response
  }

  static async updateAvailability(request: Request) {
    const ngo = await getAuthenticatedNgo()
    if (!ngo) return NextResponse.json({ error: 'Sign in as an NGO to update your availability.' }, { status: 401 })

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 })
    }

    const availability = body && typeof body === 'object' && 'availability' in body ? body.availability : null
    if (availability !== 'available' && availability !== 'busy') {
      return NextResponse.json({ error: 'Choose Active or Busy.' }, { status: 400 })
    }

    try {
      await NgoModel.updateAvailability(ngo.id, availability)
      return NextResponse.json({ availability })
    } catch {
      return NextResponse.json({ error: 'Could not update NGO availability.' }, { status: 500 })
    }
  }
}
