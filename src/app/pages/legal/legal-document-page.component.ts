import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  BRAND_APP_NAME,
  BRAND_LOGO_SRC,
} from '../../core/brand-assets';
import { SeoMetaService } from '../../core/seo-meta.service';
import { getLegalDocument } from './legal-content.es';
import {
  LEGAL_DEVELOPER_ATTRIBUTION,
  LEGAL_LAST_UPDATED,
  type LegalDocumentMeta,
  type LegalDocumentSlug,
} from './legal.constants';

const SLUG_PATH: Record<LegalDocumentSlug, string> = {
  privacidad: '/privacidad',
  terminos: '/terminos',
  cookies: '/cookies',
  'aviso-legal': '/aviso-legal',
};

@Component({
  selector: 'app-legal-document-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './legal-document-page.component.html',
  styleUrl: './legal-document-page.component.scss',
})
export class LegalDocumentPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly seo = inject(SeoMetaService);

  readonly brandAppName = BRAND_APP_NAME;
  readonly brandLogoSrc = BRAND_LOGO_SRC;
  readonly legalLastUpdated = LEGAL_LAST_UPDATED;
  readonly developerAttribution = LEGAL_DEVELOPER_ATTRIBUTION;
  readonly document = signal<LegalDocumentMeta | null>(null);

  readonly navLinks: { slug: LegalDocumentSlug; path: string; label: string }[] =
    [
      { slug: 'privacidad', path: '/privacidad', label: 'Privacidad' },
      { slug: 'terminos', path: '/terminos', label: 'Términos' },
      { slug: 'cookies', path: '/cookies', label: 'Cookies' },
      { slug: 'aviso-legal', path: '/aviso-legal', label: 'Aviso legal' },
    ];

  ngOnInit(): void {
    const slug = this.route.snapshot.data['legalSlug'] as LegalDocumentSlug;
    const doc = getLegalDocument(slug);
    this.document.set(doc);
    const path = SLUG_PATH[slug];
    this.seo.setPublicPage({
      title: doc.title,
      description: doc.metaDescription,
      path,
    });
  }
}
