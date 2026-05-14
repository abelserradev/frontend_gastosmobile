import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * Resultado del análisis OCR de una factura.
 */
export interface ParseInvoiceResult {
  /** Monto total detectado */
  amount?: number;
  /** Fecha en formato YYYY-MM-DD */
  date?: string;
  /** Nombre del comercio */
  merchant?: string;
  /** Descripción de items */
  description?: string;
  /** Texto crudo extraído */
  rawText: string;
  /** Confianza general (0-1) */
  confidence: number;
  /** Moneda detectada */
  currency: string;
}

/**
 * Servicio para comunicarse con el backend OCR.
 */
@Injectable({ providedIn: 'root' })
export class OcrApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  /**
   * Envía una imagen de factura para ser procesada por OCR.
   * @param file Archivo de imagen (jpg, png, webp)
   * @returns Resultado del análisis con datos extraídos
   */
  parseInvoice(file: File): Observable<ParseInvoiceResult> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    return this.http.post<ParseInvoiceResult>(
      `${this.base}/ocr/parse-invoice`,
      formData,
    );
  }
}
