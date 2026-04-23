// P6-T2: Google Drive upload endpoints (server-side).
// Credenţialele NU se expun în browser — totul trece prin /api/gdrive/*.
// OAuth2 cu refresh token (sursă: .env sau server/.gdrive-credentials.json).

import { Router } from 'express'
import { google } from 'googleapis'
import fs from 'node:fs'
import path from 'node:path'
import { Readable } from 'node:stream'

export interface GDriveCreds {
  client_id: string
  client_secret: string
  refresh_token: string
  /** Folder rădăcină implicit pentru upload (ex. ID folder "CTD"). Opţional. */
  root_folder_id?: string
}

// ─── Credential loading ──────────────────────────────────────────────────────
// Sursă prod: env vars din Secret Manager (ctd-gdrive-client-id/secret/refresh-token
// + GOOGLE_DRIVE_ROOT_FOLDER_ID în env non-secret).
// Sursă dev local: `.env` sau `server/.gdrive-credentials.json` (ambele gitignored).
// GOOGLE_DRIVE_ROOT_FOLDER_ID acceptă "root" literal (My Drive root) sau un folder ID.

function loadCreds(): GDriveCreds | null {
  try {
    const envId      = process.env.GOOGLE_CLIENT_ID
    const envSecret  = process.env.GOOGLE_CLIENT_SECRET
    const envRefresh = process.env.GOOGLE_REFRESH_TOKEN
    const envRoot    = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || undefined
    if (envId && envSecret && envRefresh) {
      return { client_id: envId, client_secret: envSecret, refresh_token: envRefresh, root_folder_id: envRoot }
    }
    const credsPath = path.resolve(process.cwd(), 'server/.gdrive-credentials.json')
    if (fs.existsSync(credsPath)) {
      const raw = fs.readFileSync(credsPath, 'utf-8')
      const parsed = JSON.parse(raw) as Partial<GDriveCreds>
      if (parsed.client_id && parsed.client_secret && parsed.refresh_token) {
        return parsed as GDriveCreds
      }
    }
  } catch (err) {
    console.error('[gdrive] loadCreds failed:', err instanceof Error ? err.message : err)
  }
  return null
}

function buildDriveClient(creds: GDriveCreds) {
  const auth = new google.auth.OAuth2(creds.client_id, creds.client_secret)
  auth.setCredentials({ refresh_token: creds.refresh_token })
  return google.drive({ version: 'v3', auth })
}

// ─── Drive helpers ───────────────────────────────────────────────────────────

type DriveClient = ReturnType<typeof buildDriveClient>

async function findFolder(drive: DriveClient, parentId: string, name: string): Promise<string | null> {
  const q = [
    `'${parentId}' in parents`,
    `name = '${name.replace(/'/g, "\\'")}'`,
    `mimeType = 'application/vnd.google-apps.folder'`,
    `trashed = false`,
  ].join(' and ')
  const res = await drive.files.list({ q, fields: 'files(id,name)', pageSize: 1 })
  return res.data.files?.[0]?.id ?? null
}

async function createFolder(drive: DriveClient, parentId: string, name: string): Promise<string> {
  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id',
  })
  if (!res.data.id) throw new Error('Drive folder creation returned no id')
  return res.data.id
}

async function findOrCreateFolder(drive: DriveClient, parentId: string, name: string): Promise<string> {
  const existing = await findFolder(drive, parentId, name)
  if (existing) return existing
  return createFolder(drive, parentId, name)
}

async function ensureCTDClientFolder(
  drive: DriveClient,
  rootFolderId: string,
  clientName: string,
): Promise<string> {
  // CTD/{Client_Name}/ — dacă rootFolderId e deja folder „CTD", creăm doar subfolderul clientului.
  // Dacă root este „root" / parent generic, creăm şi CTD dedesubt.
  const ctdId = await findOrCreateFolder(drive, rootFolderId, 'CTD')
  return findOrCreateFolder(drive, ctdId, clientName)
}

// ─── Router ──────────────────────────────────────────────────────────────────

export function createGDriveRouter(): Router {
  // Startup log: arată clar dacă Drive upload e ENABLED sau DISABLED.
  const bootCreds = loadCreds()
  if (bootCreds) {
    const rootLabel = bootCreds.root_folder_id && bootCreds.root_folder_id !== 'root'
      ? `folder:${bootCreds.root_folder_id.slice(0, 8)}…`
      : 'My Drive root'
    console.log(`[gdrive] ENABLED — client_id=${bootCreds.client_id.slice(0, 16)}… root=${rootLabel}`)
  } else {
    console.log('[gdrive] DISABLED — credentials missing (status endpoint → configured:false, upload → 503)')
  }

  const router = Router()

  router.get('/status', (_req, res) => {
    const creds = loadCreds()
    res.json({
      configured: creds !== null,
      hasRootFolder: !!creds?.root_folder_id,
    })
  })

  // POST /api/gdrive/upload
  // Body JSON: { clientName, fileName, mimeType, contentBase64 }
  router.post('/upload', async (req, res) => {
    const creds = loadCreds()
    if (!creds) {
      return res.status(503).json({ error: 'GDrive not configured' })
    }
    const { clientName, fileName, mimeType, contentBase64 } = req.body ?? {}
    if (typeof clientName !== 'string' || typeof fileName !== 'string'
        || typeof mimeType !== 'string' || typeof contentBase64 !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid fields: clientName, fileName, mimeType, contentBase64' })
    }

    try {
      const drive = buildDriveClient(creds)
      const rootId = creds.root_folder_id ?? 'root'
      const clientFolderId = await ensureCTDClientFolder(drive, rootId, clientName)

      const buffer = Buffer.from(contentBase64, 'base64')
      const stream = Readable.from(buffer)

      const created = await drive.files.create({
        requestBody: { name: fileName, parents: [clientFolderId] },
        media: { mimeType, body: stream },
        fields: 'id, webViewLink, webContentLink',
      })
      const fileId = created.data.id
      if (!fileId) throw new Error('Drive upload returned no file id')

      return res.json({
        fileId,
        link: created.data.webViewLink ?? `https://drive.google.com/file/d/${fileId}/view`,
        folderId: clientFolderId,
      })
    } catch (err) {
      console.error('[gdrive] upload failed', err)
      return res.status(500).json({ error: err instanceof Error ? err.message : 'upload failed' })
    }
  })

  return router
}
