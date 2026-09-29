import { Route } from '@angular/router';
import { LegalDocumentPageComponent } from './legal-document-page.component';
import { LEGAL_NAV_LINKS } from './legal.constants';

/** Rutas públicas legales — una sola fuente para app.routes y sitemap manual. */
export const legalPublicRoutes: Route[] = LEGAL_NAV_LINKS.map((entry) => ({
  path: entry.path.replace(/^\//, ''),
  component: LegalDocumentPageComponent,
  data: { legalSlug: entry.slug },
}));
