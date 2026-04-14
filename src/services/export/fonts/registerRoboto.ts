// Înregistrare Roboto (Unicode → diacritice RO) în jsPDF.
// Apelează o singură dată per document, înainte de primul setFont.

import type jsPDF from 'jspdf'
import { ROBOTO_REGULAR_BASE64, ROBOTO_BOLD_BASE64 } from './roboto-base64'

export function registerRoboto(doc: jsPDF): void {
  doc.addFileToVFS('Roboto-Regular.ttf', ROBOTO_REGULAR_BASE64)
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal')
  doc.addFileToVFS('Roboto-Bold.ttf', ROBOTO_BOLD_BASE64)
  doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold')
  // Aliasuri italic: fallback la regular/bold — păstrăm compatibilitatea
  // apelurilor existente `setFont('Roboto', 'italic')` fără stil italic real.
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'italic')
  doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bolditalic')
  doc.setFont('Roboto', 'normal')
}
