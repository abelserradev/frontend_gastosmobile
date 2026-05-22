/** Heurística ligera sobre texto OCR solo para estadística / retrieval futuro (v1.3). */

export type OcrDocumentKindGuessApi =
  | 'payment_screenshot'
  | 'physical_receipt'
  | 'fiscal_or_formal_invoice'
  | 'unknown';

export type ReceiptCaptureFlow = 'invoice' | 'payment';

export function guessOcrDocumentKind(
  receiptKind: ReceiptCaptureFlow | null | undefined,
  rawText: string,
): OcrDocumentKindGuessApi {
  const lc = (rawText ?? '').trim().toLowerCase();
  if (!lc) return 'unknown';
  if (
    /\bpago\s*m[oó]vil\b|\btransferencia\b|c2p|debit\w*|ponte\s+pago|\bbdv\b|\bben\b|\bbenefit\b|\bbnc\b|\b100%\s*banco/i.test(
      lc,
    )
  ) {
    return 'payment_screenshot';
  }
  if (receiptKind === 'payment') {
    return 'payment_screenshot';
  }
  if (/\bseniat\b|\brif\b|factura\s*comercial|\bn[º°]\s*control\b/i.test(lc)) {
    return 'fiscal_or_formal_invoice';
  }
  if (receiptKind === 'invoice') {
    return 'physical_receipt';
  }
  return 'unknown';
}
