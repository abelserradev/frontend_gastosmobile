import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { environment } from '../../environments/environment';
import { BRAND_APP_NAME } from './brand-assets';

export interface PublicPageSeoOptions {
  title: string;
  description: string;
  path: string;
}

export interface MarketingJsonLdOptions {
  applicationCategory?: string;
  operatingSystem?: string;
  downloadUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class SeoMetaService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  private static readonly CANONICAL_SELECTOR = 'rel="canonical"';
  private static readonly JSON_LD_ID = 'gastos-seo-jsonld';

  setPublicPage(options: PublicPageSeoOptions): void {
    const pageTitle = `${options.title} | ${BRAND_APP_NAME}`;
    const canonical = this.canonicalUrl(options.path);
    this.title.setTitle(pageTitle);
    this.meta.updateTag({ name: 'description', content: options.description });
    this.meta.updateTag({ name: 'robots', content: 'index, follow' });
    this.meta.updateTag(
      { rel: 'canonical', href: canonical },
      SeoMetaService.CANONICAL_SELECTOR,
    );
    this.setSocialTags(pageTitle, options.description, canonical);
    this.removeJsonLd();
  }

  /** Landing y descarga: meta social + SoftwareApplication para rich results básicos. */
  setMarketingPage(
    options: PublicPageSeoOptions,
    jsonLd?: MarketingJsonLdOptions,
  ): void {
    this.setPublicPage(options);
    if (jsonLd) {
      this.setSoftwareApplicationJsonLd(options, jsonLd);
    }
  }

  setNoIndexDefaults(): void {
    this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });
    this.removeJsonLd();
  }

  private canonicalUrl(path: string): string {
    const base = environment.appOriginUrl.replace(/\/$/, '');
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return `${base}${normalized === '/' ? '' : normalized}` || base;
  }

  private setSocialTags(
    pageTitle: string,
    description: string,
    canonical: string,
  ): void {
    this.meta.updateTag({ property: 'og:title', content: pageTitle });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: canonical });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:locale', content: 'es_VE' });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary' });
    this.meta.updateTag({ name: 'twitter:title', content: pageTitle });
    this.meta.updateTag({ name: 'twitter:description', content: description });
  }

  private setSoftwareApplicationJsonLd(
    options: PublicPageSeoOptions,
    extra: MarketingJsonLdOptions,
  ): void {
    const payload = {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: BRAND_APP_NAME,
      description: options.description,
      applicationCategory: extra.applicationCategory ?? 'FinanceApplication',
      operatingSystem: extra.operatingSystem ?? 'Android, Web',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      ...(extra.downloadUrl ? { downloadUrl: extra.downloadUrl } : {}),
    };
    this.removeJsonLd();
    const script = this.document.createElement('script');
    script.type = 'application/ld+json';
    script.id = SeoMetaService.JSON_LD_ID;
    script.text = JSON.stringify(payload);
    this.document.head.appendChild(script);
  }

  private removeJsonLd(): void {
    const existing = this.document.getElementById(SeoMetaService.JSON_LD_ID);
    existing?.remove();
  }
}
