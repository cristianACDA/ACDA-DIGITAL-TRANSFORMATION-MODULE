// P6-T2: client wrapper peste /api/gdrive/*. Nu deţine credenţiale — doar
// serializează Blob/JSON şi trimite la server.

export interface GDriveStatus {
  configured: boolean
  hasRootFolder: boolean
}

export interface GDriveUploadResult {
  fileId: string
  link: string
  folderId: string
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer()
  const bytes = new Uint8Array(buf)
  // Chunked conversion ca să evităm stack overflow pe blob-uri mari.
  let binary = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}

export class GDriveUploadService {
  static async status(): Promise<GDriveStatus> {
    try {
      const res = await fetch('/api/gdrive/status')
      if (!res.ok) return { configured: false, hasRootFolder: false }
      return (await res.json()) as GDriveStatus
    } catch {
      return { configured: false, hasRootFolder: false }
    }
  }

  static async uploadFile(
    clientName: string,
    fileName: string,
    blob: Blob,
    mimeType: string,
  ): Promise<GDriveUploadResult> {
    const contentBase64 = await blobToBase64(blob)
    const res = await fetch('/api/gdrive/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientName, fileName, mimeType, contentBase64 }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error(err.error ?? `Upload failed (${res.status})`)
    }
    return (await res.json()) as GDriveUploadResult
  }

  /** Upload dual: PDF raport + JSON date brute în CTD/{Client}/. */
  static async uploadReportBundle(
    clientName: string,
    pdfBlob: Blob,
    dataJson: object,
    date = new Date().toISOString().slice(0, 10),
  ): Promise<{ pdf: GDriveUploadResult; json: GDriveUploadResult }> {
    const pdf = await GDriveUploadService.uploadFile(
      clientName,
      `Raport_CTD_${date}.pdf`,
      pdfBlob,
      'application/pdf',
    )
    const jsonBlob = new Blob([JSON.stringify(dataJson, null, 2)], { type: 'application/json' })
    const json = await GDriveUploadService.uploadFile(
      clientName,
      `data_${date}.json`,
      jsonBlob,
      'application/json',
    )
    return { pdf, json }
  }
}
