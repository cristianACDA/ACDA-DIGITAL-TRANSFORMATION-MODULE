// Google Drive upload endpoint — DISABLED pentru deploy #1 (Val 1.0).
// Motiv: OAuth2 setup nu e prioritar pre-GO-LIVE 5 Mai; amânat Val 1.5.
// Frontend citește /api/gdrive/status → {configured:false, planned:'Val 1.5'} și dezactivează butonul upload.
// Download PDF client-side rămâne 100% funcțional (jsPDF in-browser).
// Codul OAuth2 + folder helpers e păstrat în git history pentru re-activare rapidă.

import { Router } from 'express'

export function createGDriveRouter(): Router {
  const router = Router()

  router.get('/status', (_req, res) => {
    res.json({
      configured: false,
      planned: 'Val 1.5',
      message: 'Google Drive upload va fi disponibil din Val 1.5. Folosește butonul Download PDF.',
    })
  })

  router.post('/upload', (_req, res) => {
    res.status(503).json({
      error: 'GDrive upload disabled',
      planned: 'Val 1.5',
      message: 'Google Drive upload va fi disponibil din Val 1.5. Folosește butonul Download PDF.',
    })
  })

  return router
}
