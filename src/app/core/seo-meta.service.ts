import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { environment } from '../../environments/environment';
import { BRAND_APP_NAME } from './brand-assets';

export interface PublicPageSeoOptions {
  title: string;
  description: string;
  path: string;
}

@Injectable({ providedIn: 'root' })
export class SeoMetaService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  private static readonly CANONICAL_SELECTOR = 'rel="canonical"';

  setPublicPage(options: PublicPageSeoOptions): void {
    const pageTitle = `${options.title} | ${BRAND_APP_NAME}`;
    this.title.setTitle(pageTitle);
    this.meta.updateTag({ name: 'description', content: options.description });
    this.meta.updateTag({ name: 'robots', content: 'index, follow' });
    const canonical = `${environment.appOriginUrl.replace(/\/$/, '')}${options.path}`;
    this.meta.updateTag(
      { rel: 'canonical', href: canonical },
      SeoMetaService.CANONICAL_SELECTOR,
    );
  }
}
