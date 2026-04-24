// TE-21 GDRIVE-SA-SHAREDDRIVE-001: upload în Shared Drive via ADC + SA runtime.
// Zero JSON keys, zero OAuth refresh token. google-auth-library detectează
// automat Cloud Run SA (ctd-runner@acda-os-sso.iam.gserviceaccount.com) via ADC.
// Scope: drive.file (doar fișiere create de acest SA, nu acces full Drive).

import { Router } from 'express'
import { google, drive_v3 } from 'googleapis'
import { Readable } from 'node:stream'

const SHARED_DRIVE_ID = process.env.GDRIVE_SHARED_DRIVE_ID || ''
const DRIVE_SCOPES = ['https://www.googleapis.com/auth/drive.file']

type DriveClient = drive_v3.Drive

// ─── ADC client ──────────────────────────────────────────────────────────────
// În Cloud Run: GoogleAuth preia automat SA-ul atașat serviciului.
// În dev local: GOOGLE_APPLICATION_CREDENTIALS (path .json) SAU gcloud auth
// application-default login (user ADC). Nu hardcodăm nimic.

let driveClientPromise: Promise<DriveClient> | null = null

async function getDriveClient(): Promise<DriveClient> {
  if (!driveClientPromise) {
    driveClientPromise = (async () => {
      const auth = new google.auth.GoogleAuth({ scopes: DRIVE_SCOPES })
      const authClient = await auth.getClient()
      return google.drive({ version: 'v3', auth: authClient as any })
    })().catch((err) => {
      driveClientPromise = null
      throw err
    })
  }
  return driveClientPromise
}

// ─── Drive helpers ───────────────────────────────────────────────────────────

async function findOrCreateFolder(
  drive: DriveClient,
  parentId: string,
  name: string,
): Promise<string> {
  const escaped = name.replace(/'/g, "\\'")
  const q = [
    `'${parentId}' in parents`,
    `name = '${escaped}'`,
    `mimeType = 'application/vnd.google-apps.folder'`,
    `trashed = false`,
  ].join(' and ')

  const existing = await drive.files.list({
    q,
    fields: 'files(id,name)',
    pageSize: 1,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    corpora: 'drive',
    driveId: SHARED_DRIVE_ID,
  })
  const found = existing.data.files?.[0]?.id
  if (found) return found

  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id',
    supportsAllDrives: true,
  })
  if (!created.data.id) throw new Error('Drive folder creation returned no id')
  return created.data.id
}

async function ensureCTDDateFolder(
  drive: DriveClient,
  clientName: string,
  date: string,
): Promise<string> {
  // Structura: {SHARED_DRIVE_ID}/CTD/{clientName}/{YYYY-MM-DD}/
  const ctdId = await findOrCreateFolder(drive, SHARED_DRIVE_ID, 'CTD')
  const clientId = await findOrCreateFolder(drive, ctdId, clientName)
  return findOrCreateFolder(drive, clientId, date)
}

async function findFileInFolder(
  drive: DriveClient,
  folderId: string,
  fileName: string,
): Promise<{ id: string; webViewLink?: string | null; createdTime?: string | null } | null> {
  const escaped = fileName.replace(/'/g, "\\'")
  const q = [
    `'${folderId}' in parents`,
    `name = '${escaped}'`,
    `trashed = false`,
  ].join(' and ')
  const res = await drive.files.list({
    q,
    fields: 'files(id,name,webViewLink,createdTime)',
    pageSize: 1,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    corpora: 'drive',
    driveId: SHARED_DRIVE_ID,
  })
  const found = res.data.files?.[0]
  if (!found?.id) return null
  return {
    id: found.id,
    webViewLink: found.webViewLink,
    createdTime: found.createdTime,
  }
}

// ─── Router ──────────────────────────────────────────────────────────────────

export function createGDriveRouter(): Router {
  if (SHARED_DRIVE_ID) {
    console.log(
      `[gdrive] ENABLED — ADC + Shared Drive ${SHARED_DRIVE_ID.slice(0, 10)}…`,
    )
  } else {
    console.log('[gdrive] DISABLED — GDRIVE_SHARED_DRIVE_ID not set (status → 503)')
  }

  const router = Router()

  router.get('/status', (_req, res) => {
    res.json({
      configured: !!SHARED_DRIVE_ID,
      hasRootFolder: !!SHARED_DRIVE_ID,
      mode: 'sa-adc-shared-drive',
    })
  })

  // POST /api/gdrive/upload
  // Body JSON: { clientName, fileName, mimeType, contentBase64 }
  // Returns: { fileId, link, folderId }
  router.post('/upload', async (req, res) => {
    if (!SHARED_DRIVE_ID) {
      return res.status(503).json({ error: 'GDRIVE_SHARED_DRIVE_ID not set' })
    }
    const { clientName, fileName, mimeType, contentBase64 } = req.body ?? {}
    if (
      typeof clientName !== 'string' ||
      typeof fileName !== 'string' ||
      typeof mimeType !== 'string' ||
      typeof contentBase64 !== 'string'
    ) {
      return res.status(400).json({
        error:
          'Missing or invalid fields: clientName, fileName, mimeType, contentBase64',
      })
    }

    try {
      const drive = await getDriveClient()
      const date = new Date().toISOString().slice(0, 10)
      const folderId = await ensureCTDDateFolder(drive, clientName, date)

      // Idempotency: dacă fișier cu același nume există deja în folder-ul
      // zilei, return URL-ul existing. Evită duplicate la auto-upload pe mount.
      const existing = await findFileInFolder(drive, folderId, fileName)
      if (existing) {
        return res.json({
          fileId: existing.id,
          link:
            existing.webViewLink ??
            `https://drive.google.com/file/d/${existing.id}/view`,
          folderId,
          alreadyExisted: true,
          uploadedAt: existing.createdTime ?? new Date().toISOString(),
        })
      }

      const buffer = Buffer.from(contentBase64, 'base64')
      const stream = Readable.from(buffer)

      const created = await drive.files.create({
        requestBody: { name: fileName, parents: [folderId] },
        media: { mimeType, body: stream },
        fields: 'id, webViewLink, createdTime',
        supportsAllDrives: true,
      })
      const fileId = created.data.id
      if (!fileId) throw new Error('Drive upload returned no file id')

      return res.json({
        fileId,
        link:
          created.data.webViewLink ??
          `https://drive.google.com/file/d/${fileId}/view`,
        folderId,
        alreadyExisted: false,
        uploadedAt: created.data.createdTime ?? new Date().toISOString(),
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'upload failed'
      console.error('[gdrive] upload failed:', msg)
      return res.status(500).json({ error: msg })
    }
  })

  return router
}
