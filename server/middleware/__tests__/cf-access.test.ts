import { vi } from 'vitest'

// State + env trebuie setate ÎNAINTE de importul middleware (care citește env la load time).
// vi.hoisted rulează ca prima instrucțiune din fișier, înainte de orice import.
const state = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const crypto = require('node:crypto') as typeof import('node:crypto')
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 })
  const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString()
  const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
  const kid = 'test-kid'
  const aud = 'test-aud-uuid'
  const team = 'test-team.cloudflareaccess.com'
  process.env.NODE_ENV = 'production'
  process.env.CTD_WHITELIST = 'cristian@acda.ro'
  process.env.CF_ACCESS_AUD = aud
  process.env.CF_ACCESS_TEAM_DOMAIN = team
  return { publicKeyPem, privateKeyPem, kid, aud, team, issuer: `https://${team}` }
})

type JwksKey = { getPublicKey: () => string }
type JwksGetSigningKey = (kid: string, cb: (err: Error | null, key?: JwksKey) => void) => void

vi.mock('jwks-rsa', () => ({
  default: (): { getSigningKey: JwksGetSigningKey } => ({
    getSigningKey: (requestedKid, cb) => {
      if (requestedKid !== state.kid) return cb(new Error('unknown kid'))
      cb(null, { getPublicKey: () => state.publicKeyPem })
    },
  }),
}))

import { describe, it, expect, beforeEach } from 'vitest'
import jwt, { type JwtPayload } from 'jsonwebtoken'
import type { Request, Response, NextFunction } from 'express'
import { cfAccessMiddleware } from '../cf-access'

function signValid(extra: Partial<JwtPayload> & { email?: string } = {}): string {
  const { email = 'cristian@acda.ro', ...rest } = extra
  return jwt.sign({ email, ...rest }, state.privateKeyPem, {
    algorithm: 'RS256',
    audience: state.aud,
    issuer: state.issuer,
    expiresIn: '1h',
    keyid: state.kid,
  })
}

function makeReq(init: { jwt?: string; cookie?: string } = {}): Request {
  const headers: Record<string, string> = {}
  if (init.jwt) headers['cf-access-jwt-assertion'] = init.jwt
  if (init.cookie) headers['cookie'] = `CF_Authorization=${init.cookie}`
  return { headers } as unknown as Request
}

interface ResCapture {
  res: Response
  statusCode?: number
  body?: unknown
}

function makeRes(): ResCapture {
  const capture: ResCapture = { res: undefined as unknown as Response }
  const json = (body: unknown) => {
    capture.body = body
  }
  const status = (code: number) => {
    capture.statusCode = code
    return { json } as unknown as Response
  }
  capture.res = { status, json } as unknown as Response
  return capture
}

describe('cfAccessMiddleware', () => {
  let nextCalls: number
  let next: NextFunction

  beforeEach(() => {
    nextCalls = 0
    next = () => {
      nextCalls += 1
    }
  })

  it('1. JWT valid (în header) → next() called, no status set', async () => {
    const token = signValid()
    const req = makeReq({ jwt: token })
    const cap = makeRes()
    await cfAccessMiddleware(req, cap.res, next)
    expect(nextCalls).toBe(1)
    expect(cap.statusCode).toBeUndefined()
    expect((req as Request & { user?: { email: string } }).user?.email).toBe('cristian@acda.ro')
  })

  it('1b. JWT valid (în cookie CF_Authorization) → next() called', async () => {
    const token = signValid()
    const req = makeReq({ cookie: token })
    const cap = makeRes()
    await cfAccessMiddleware(req, cap.res, next)
    expect(nextCalls).toBe(1)
    expect(cap.statusCode).toBeUndefined()
  })

  it('2. JWT expired → 401', async () => {
    const expired = jwt.sign({ email: 'cristian@acda.ro' }, state.privateKeyPem, {
      algorithm: 'RS256',
      audience: state.aud,
      issuer: state.issuer,
      expiresIn: '-1h',
      keyid: state.kid,
    })
    const req = makeReq({ jwt: expired })
    const cap = makeRes()
    await cfAccessMiddleware(req, cap.res, next)
    expect(nextCalls).toBe(0)
    expect(cap.statusCode).toBe(401)
    expect(cap.body).toMatchObject({ error: expect.stringMatching(/expired/i) })
  })

  it('3. JWT invalid signature → 401', async () => {
    const good = signValid()
    // Alterează ultimul caracter din signature
    const parts = good.split('.')
    const sig = parts[2]
    const tampered = parts[0] + '.' + parts[1] + '.' + (sig.slice(0, -1) + (sig.endsWith('A') ? 'B' : 'A'))
    const req = makeReq({ jwt: tampered })
    const cap = makeRes()
    await cfAccessMiddleware(req, cap.res, next)
    expect(nextCalls).toBe(0)
    expect(cap.statusCode).toBe(401)
  })

  it('4. JWT wrong audience → 401', async () => {
    const wrongAud = jwt.sign({ email: 'cristian@acda.ro' }, state.privateKeyPem, {
      algorithm: 'RS256',
      audience: 'wrong-aud',
      issuer: state.issuer,
      expiresIn: '1h',
      keyid: state.kid,
    })
    const req = makeReq({ jwt: wrongAud })
    const cap = makeRes()
    await cfAccessMiddleware(req, cap.res, next)
    expect(nextCalls).toBe(0)
    expect(cap.statusCode).toBe(401)
    expect(cap.body).toMatchObject({ error: expect.stringMatching(/audience/i) })
  })

  it('5. JWT wrong issuer → 401', async () => {
    const wrongIss = jwt.sign({ email: 'cristian@acda.ro' }, state.privateKeyPem, {
      algorithm: 'RS256',
      audience: state.aud,
      issuer: 'https://evil.cloudflareaccess.com',
      expiresIn: '1h',
      keyid: state.kid,
    })
    const req = makeReq({ jwt: wrongIss })
    const cap = makeRes()
    await cfAccessMiddleware(req, cap.res, next)
    expect(nextCalls).toBe(0)
    expect(cap.statusCode).toBe(401)
    expect(cap.body).toMatchObject({ error: expect.stringMatching(/issuer/i) })
  })

  it('6. Missing JWT (no header + no cookie) → 401', async () => {
    const req = makeReq()
    const cap = makeRes()
    await cfAccessMiddleware(req, cap.res, next)
    expect(nextCalls).toBe(0)
    expect(cap.statusCode).toBe(401)
    expect(cap.body).toMatchObject({ error: expect.stringMatching(/missing/i) })
  })

  it('7. Malformed JWT → 401', async () => {
    const req = makeReq({ jwt: 'not-a-jwt' })
    const cap = makeRes()
    await cfAccessMiddleware(req, cap.res, next)
    expect(nextCalls).toBe(0)
    expect(cap.statusCode).toBe(401)
  })

  it('bonus: email valid signature dar NOT in whitelist → 403', async () => {
    const token = signValid({ email: 'attacker@example.com' })
    const req = makeReq({ jwt: token })
    const cap = makeRes()
    await cfAccessMiddleware(req, cap.res, next)
    expect(nextCalls).toBe(0)
    expect(cap.statusCode).toBe(403)
  })
})
