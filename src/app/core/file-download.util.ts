import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';

function normalizeCsvFilename(filename: string): string {
  const trimmed = filename.trim();
  if (!trimmed) {
    return 'reporte.csv';
  }
  return trimmed.toLowerCase().endsWith('.csv') ? trimmed : `${trimmed}.csv`;
}

function isShareCancelled(err: unknown): boolean {
  let msg = '';
  if (err instanceof Error) {
    msg = err.message;
  } else if (typeof err === 'string') {
    msg = err;
  }
  return /cancel|dismiss|abort/i.test(msg);
}

/**
 * Descarga CSV en web o abre hoja de compartir en Capacitor (Android/iOS).
 * En nativo el usuario elige dónde guardar (Drive, Files, etc.).
 */
export async function downloadCsvFile(
  filename: string,
  csvContent: string,
): Promise<void> {
  const safeName = normalizeCsvFilename(filename);

  if (Capacitor.isNativePlatform()) {
    try {
      await Share.share({
        title: safeName,
        text: csvContent,
        dialogTitle: 'Compartir reporte CSV',
      });
    } catch (err) {
      if (isShareCancelled(err)) {
        return;
      }
      throw new Error(
        'No se pudo compartir el archivo CSV. Intenta de nuevo.',
      );
    }
    return;
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = safeName;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
