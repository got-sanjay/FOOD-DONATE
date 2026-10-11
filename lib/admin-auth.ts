import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'

export const ADMIN_SESSION_COOKIE = 'foodrescue_admin_session'
const SESSION_TTL_SECONDS = 60 * 60 * 8

function secret() {
  return process.env.NGO_SESSION_SECRET || (process.env.NODE_ENV === 'production' ? null : 'local-development-only-secret-change-before-deploy')
}

function signature(payload: string, key: string) {
  return createHmac('sha256', key).update(payload).digest('base64url')
}

function constantTimeEquals(left: string, right: string) {
  const leftHash = createHmac('sha256', 'foodrescue-admin-compare').update(left).digest()
  const rightHash = createHmac('sha256', 'foodrescue-admin-compare').update(right).digest()
  return timingSafeEqual(leftHash, rightHash) && left.length === right.length
}

export function verifyAdminCredentials(username: string, password: string) {
  const expectedUsername = process.env.ADMIN_USERNAME
  const expectedPassword = process.env.ADMIN_PASSWORD
  if (!expectedUsername || !expectedPassword || !secret()) return false
  return constantTimeEquals(username, expectedUsername) && constantTimeEquals(password, expectedPassword)
}

export function createAdminSession() {
  const key = secret()
  const username = process.env.ADMIN_USERNAME
  if (!key || !username) throw new Error('Admin authentication is not configured.')
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
  const payload = Buffer.from(`${username}|${expiresAt}`).toString('base64url')
  return { value: `${payload}.${signature(payload, key)}`, maxAge: SESSION_TTL_SECONDS }
}

export async function getAuthenticatedAdmin() {
  const key = secret()
  const cookieStore = await cookies()
  const value = cookieStore.get(ADMIN_SESSION_COOKIE)?.value
  if (!key || !value) return false

  const [payload, suppliedSignature] = value.split('.')
  if (!payload || !suppliedSignature || !constantTimeEquals(signature(payload, key), suppliedSignature)) return false

  try {
    const decoded = Buffer.from(payload, 'base64url').toString('utf8')
    const separator = decoded.lastIndexOf('|')
    const username = decoded.slice(0, separator)
    const expiresAt = Number(decoded.slice(separator + 1))
    return separator > 0 && username === process.env.ADMIN_USERNAME && Number.isFinite(expiresAt) && expiresAt > Date.now() / 1000
  } catch {
    return false
  }
}

export const adminSessionCookieOptions = {
  httpOnly: true,
  sameSite: 'strict' as const,
  path: '/',
  secure: process.env.NODE_ENV === 'production',
}