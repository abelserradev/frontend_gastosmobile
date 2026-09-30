import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';
import { SeoMetaService } from './seo-meta.service';

describe('SeoMetaService', () => {
  let service: SeoMetaService;
  let title: Title;
  let meta: Meta;
  let document: Document;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SeoMetaService);
    title = TestBed.inject(Title);
    meta = TestBed.inject(Meta);
    document = TestBed.inject(DOCUMENT);
  });

  it('should set title, description and canonical on public page', () => {
    service.setPublicPage({
      title: 'Privacidad',
      description: 'Política de privacidad de prueba.',
      path: '/privacidad',
    });
    expect(title.getTitle()).toContain('Privacidad');
    expect(meta.getTag('name="description"')?.content).toContain('privacidad');
    expect(meta.getTag('property="og:title"')?.content).toContain('Privacidad');
  });

  it('should inject JSON-LD on marketing page', () => {
    service.setMarketingPage(
      {
        title: 'Landing',
        description: 'Descubre Spend$ave.',
        path: '/',
      },
      { operatingSystem: 'Android' },
    );
    const script = document.getElementById('gastos-seo-jsonld');
    expect(script?.textContent).toContain('SoftwareApplication');
    expect(script?.textContent).toContain('Android');
  });
});
