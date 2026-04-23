// CF Access middleware — verifică semnătura JWT "Cf-Access-Jwt-Assertion" vs JWKS
// publice Cloudflare Access, apoi aplică whitelist pe email (defense in depth).
//
// Dual-layer: edge CF Access (JWT semnat cu RS256) + whitelist server-side
// `CTD_WHITELIST`. JWT fără signature valid → 401. Email în JWT dar nu în
// whitelist → 403.
//
// Dev local: NODE_ENV !== 'production' → no-op (requests pass).
// Prod: fail-safe 500 dacă whitelist gol sau config JWT lipsă.

import type { Request, Response, NextFunction } from 'express'
import jwt, { type JwtPayload } from 'jsonwebtoken'
import jwksClient, { type JwksClient } from 'jwks-rsa'

const IS_PROD = process.env.NODE_ENV === 'production'

const WHITELIST: string[] = (process.env.CTD_WHITELIST ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

const CF_AUD = (process.env.CF_ACCESS_AUD ?? '').trim()
const CF_TEAM_DOMAIN = (process.env.CF_ACCESS_TEAM_DOMAIN ?? '').trim()
const CF_ISSUER = CF_TEAM_DOMAIN ? `https://${CF_TEAM_DOMAIN}` : ''
const CF_JWKS_URI = CF_TEAM_DOMAIN
  ? `https://${CF_TEAM_DOMAIN}/cdn-cgi/access/certs`
  : ''

let _jwks: JwksClient | null = null
function getJwks(): JwksClient {
  if (!_jwks) {
    _jwks = jwksClient({
      jwksUri: CF_JWKS_URI,
      cache: true,
      cacheMaxAge: 60 * 60 * 1000, // 1h
      rateLimit: true,
      jwksRequestsPerMinute: 10,
    })
  }
  return _jwks
}

if (IS_PROD) {
  const missing: string[] = []
  if (WHITELIST.length === 0) missing.push('CTD_WHITELIST')
  if (!CF_AUD) missing.push('CF_ACCESS_AUD')
  if (!CF_TEAM_DOMAIN) missing.push('CF_ACCESS_TEAM_DOMAIN')
  if (missing.length > 0) {
    console.error(
      `[cf-access] FATAL: missing env in production — refusing all requests. Missing: ${missing.join(', ')}`,
    )
  } else {
    console.log(
      `[cf-access] ENABLED: whitelist=${WHITELIST.length} emails, issuer=${CF_ISSUER}, jwks=${CF_JWKS_URI}`,
    )
  }
} else {
  console.log('[cf-access] DEV mode (NODE_ENV != production) — middleware bypassed')
}

function extractJwt(req: Request): string | null {
  const headerVal = req.headers['cf-access-jwt-assertion']
  const headerStr = Array.isArray(headerVal) ? headerVal[0] : headerVal
  if (typeof headerStr === 'string' && headerStr.length > 0) return headerStr

  const cookieHeader = req.headers['cookie']
  if (typeof cookieHeader !== 'string') return null
  for (const part of cookieHeader.split(';')) {
    const [rawName, ...rest] = part.split('=')
    if (!rawName) continue
    if (rawName.trim() === 'CF_Authorization') {
      const val = rest.join('=').trim()
      return val.length > 0 ? val : null
    }
  }
  return null
}

function deny(res: Response, status: number, reason: string): void {
  // Nu logăm JWT-ul în sine, doar motivul refuzului (audit-safe).
  console.warn(`[cf-access] DENY ${status}: ${reason}`)
  res.status(status).json({ error: reason })
}

export async function cfAccessMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!IS_PROD) {
    return next()
  }

  if (WHITELIST.length === 0 || !CF_AUD || !CF_TEAM_DOMAIN) {
    res.status(500).json({ error: 'Service misconfigured (CF Access env incomplete)' })
    return
  }

  const token = extractJwt(req)
  if (!token) {
    return deny(res, 401, 'CF Access JWT missing')
  }

  let payload: JwtPayload
  try {
    payload = await new Promise<JwtPayload>((resolve, reject) => {
      jwt.verify(
        token,
        (header, cb) => {
          if (!header.kid) return cb(new Error('JWT missing kid'))
          getJwks().getSigningKey(header.kid, (err, key) => {
            if (err || !key) return cb(err ?? new Error('signing key not found'))
            cb(null, key.getPublicKey())
          })
        },
        {
          algorithms: ['RS256'],
          audience: CF_AUD,
          issuer: CF_ISSUER,
        },
        (err, decoded) => {
          if (err || !decoded || typeof decoded !== 'object') {
            return reject(err ?? new Error('invalid token'))
          }
          resolve(decoded as JwtPayload)
        },
      )
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'verify failed'
    // Mapare concisă, fără token
    if (msg.includes('expired')) return deny(res, 401, 'CF Access JWT expired')
    if (msg.includes('audience')) return deny(res, 401, 'CF Access JWT wrong audience')
    if (msg.includes('issuer')) return deny(res, 401, 'CF Access JWT wrong issuer')
    if (msg.includes('signature')) return deny(res, 401, 'CF Access JWT bad signature')
    return deny(res, 401, `CF Access JWT invalid (${msg})`)
  }

  const emailRaw = (payload as { email?: unknown }).email
  const email = typeof emailRaw === 'string' ? emailRaw.toLowerCase() : ''
  if (!email) {
    return deny(res, 401, 'CF Access JWT missing email claim')
  }

  if (!WHITELIST.includes(email)) {
    // 403 (autorizat CF, dar nu autorizat app) — distinct de 401 (nu autentificat)
    console.warn(`[cf-access] DENY 403: email not whitelisted (${email})`)
    res.status(403).json({ error: 'Email not whitelisted' })
    return
  }

  ;(req as Request & { user?: { email: string } }).user = { email }
  next()
}
