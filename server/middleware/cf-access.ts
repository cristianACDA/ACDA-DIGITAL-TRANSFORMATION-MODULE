// CF Access middleware — verifică Cf-Access-Authenticated-User-Email vs whitelist.
// Whitelist vine EXCLUSIV din process.env.CTD_WHITELIST (secret Manager ctd-whitelist).
// Zero emails hardcoded în cod.
// Dev local: NODE_ENV !== 'production' → no-op (requests pass).
// Prod: fail-safe 500 dacă whitelist gol (preferăm DoS la bypass auth).

import type { Request, Response, NextFunction } from 'express'

const IS_PROD = process.env.NODE_ENV === 'production'

const WHITELIST: string[] = (process.env.CTD_WHITELIST ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

if (IS_PROD) {
  if (WHITELIST.length === 0) {
    console.error('[cf-access] FATAL: CTD_WHITELIST env empty in production — refusing all requests')
  } else {
    console.log(`[cf-access] WHITELIST loaded: ${WHITELIST.length} emails`)
  }
} else {
  console.log('[cf-access] DEV mode (NODE_ENV != production) — middleware bypassed')
}

export function cfAccessMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!IS_PROD) {
    return next()
  }

  if (WHITELIST.length === 0) {
    res.status(500).json({ error: 'Service misconfigured (empty whitelist)' })
    return
  }

  const emailHeader = req.headers['cf-access-authenticated-user-email']
  const email = Array.isArray(emailHeader) ? emailHeader[0] : emailHeader

  if (!email || typeof email !== 'string') {
    res.status(403).json({ error: 'CF Access authentication required' })
    return
  }

  if (!WHITELIST.includes(email.toLowerCase())) {
    res.status(403).json({ error: 'Email not whitelisted' })
    return
  }

  // Atașează email pe req pentru logging/audit
  ;(req as Request & { user?: { email: string } }).user = { email }
  next()
}
