import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BRAND_APP_NAME, BRAND_LOGO_SRC } from '../../core/brand-assets';
import { MarketingFeatureIconComponent } from '../../shared/marketing-feature-icon/marketing-feature-icon.component';
import { SeoMetaService } from '../../core/seo-meta.service';
import { LEGAL_NAV_LINKS } from '../legal/legal.constants';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [RouterLink, MarketingFeatureIconComponent],
  templateUrl: './landing-page.component.html',
})
export class LandingPageComponent implements OnInit {
  private readonly seo = inject(SeoMetaService);

  readonly brandAppName = BRAND_APP_NAME;
  readonly brandLogoSrc = BRAND_LOGO_SRC;
  readonly legalLinks = LEGAL_NAV_LINKS;

  ngOnInit(): void {
    const description =
      'Control de gastos e ingresos con tasa BCV, OCR de facturas, presupuesto por periodo de corte e inventario para comercios. Spend$ave para familias y negocios en Venezuela y LATAM.';
    this.seo.setMarketingPage(
      {
        title: 'Control de gastos con BCV, OCR e inventario',
        description,
        path: '/',
      },
      {
        applicationCategory: 'FinanceApplication',
        operatingSystem: 'Android, Web',
        downloadUrl: 'https://mobilegastos.buildforge.work/descargar',
      },
    );
  }
}
