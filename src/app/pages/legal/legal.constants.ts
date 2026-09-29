/** Marca personal / titular del sitio y del tratamiento de datos. */
export const LEGAL_HOLDER_NAME = 'BuildForge';

/** Crédito de desarrollo (producto Spend$ave). */
export const LEGAL_DEVELOPER_ATTRIBUTION = 'Developed by iracuza';

/** Contacto legal y privacidad; ajustar si usas otro buzón en buildforge.work. */
export const LEGAL_CONTACT_EMAIL = 'contact@buildforge.work';

/** Fecha visible en el pie de cada documento legal. */
export const LEGAL_LAST_UPDATED = '28 de septiembre de 2026';

export type LegalDocumentSlug =
  | 'privacidad'
  | 'terminos'
  | 'cookies'
  | 'aviso-legal';

export interface LegalSection {
  heading?: string;
  paragraphs: string[];
}

export interface LegalDocumentMeta {
  slug: LegalDocumentSlug;
  title: string;
  metaDescription: string;
  sections: LegalSection[];
}
