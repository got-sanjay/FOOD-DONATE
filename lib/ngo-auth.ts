import { createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

const scryptAsync = promisify(scrypt)
export const NGO_SESSION_COOKIE = 'foodrescue_ngo_session'
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7

export type AuthenticatedNgo = {
  id: string
  name: string
  region: string
  availability: 'available' | 'busy'
  latitude?: number | null
  longitude?: number | null
}

function sessionSecret() {
  const configured = process.env.NGO_SESSION_SECRET
  if (configured) return configured
  if (process.env.NODE_ENV === 'production') return null
  return 'local-development-only-secret-change-before-deploy'
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex')
  const derived = (await scryptAsync(password, salt, 64)) as Buffer
  return `scrypt$${salt}$${derived.toString('base64url')}`
}

export async function verifyPassword(password: string, encoded: string) {
  const [algorithm, salt, original] = encoded.split('$')
  if (algorithm !== 'scrypt' || !salt || !original) return false
  const originalBytes = Buffer.from(original, 'base64url')
  const candidate = (await scryptAsync(password, salt, originalBytes.length)) as Buffer
  return candidate.length === originalBytes.length && timingSafeEqual(candidate, originalBytes)
}

function sign(value: string, secret: string) {
  return createHmac('sha256', secret).update(value).digest('base64url')
}

export function createNgoSession(ngoId: string) {
  const secret = sessionSecret()
  if (!secret) throw new Error('Set NGO_SESSION_SECRET before enabling production logins.')
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
  const payload = Buffer.from(`${ngoId}|${expiresAt}`).toString('base64url')
  return { value: `${payload}.${sign(payload, secret)}`, maxAge: SESSION_TTL_SECONDS }
}

function readNgoId(value: string) {
  const secret = sessionSecret()
  if (!secret) return null
  const [payload, signature] = value.split('.')
  if (!payload || !signature) return null
  const expected = Buffer.from(sign(payload, secret))
  const actual = Buffer.from(signature)
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null

  try {
    const decoded = Buffer.from(payload, 'base64url').toString('utf8')
    const separator = decoded.lastIndexOf('|')
    const ngoId = decoded.slice(0, separator)
    const expiresAt = Number(decoded.slice(separator + 1))
    if (separator < 1 || !Number.isFinite(expiresAt) || expiresAt <= Date.now() / 1000) return null
    return ngoId
  } catch {
    return null
  }
}

export async function getAuthenticatedNgo(): Promise<AuthenticatedNgo | null> {
  const cookieStore = await cookies()
  const value = cookieStore.get(NGO_SESSION_COOKIE)?.value
  if (!value) return null
  const id = readNgoId(value)
  if (!id) return null
  const ngo = await prisma.ngoAccount.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      region: true,
      availability: true,
      isActive: true,
      reviewStatus: true,
      latitude: true,
      longitude: true,
    },
  })
  if (!ngo?.isActive || ngo.reviewStatus !== 'approved') return null
  return {
    id: ngo.id,
    name: ngo.name,
    region: ngo.region,
    availability: ngo.availability === 'busy' ? 'busy' : 'available',
    latitude: ngo.latitude,
    longitude: ngo.longitude,
  }
}

export const ngoSessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  secure: process.env.NODE_ENV === 'production',
}