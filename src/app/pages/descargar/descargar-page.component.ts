import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BRAND_APP_NAME } from '../../core/brand-assets';
import { SeoMetaService } from '../../core/seo-meta.service';
import { LEGAL_NAV_LINKS } from '../legal/legal.constants';

@Component({
  selector: 'app-descargar-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './descargar-page.component.html',
})
export class DescargarPageComponent implements OnInit {
  private readonly seo = inject(SeoMetaService);

  readonly brandAppName = BRAND_APP_NAME;
  readonly legalLinks = LEGAL_NAV_LINKS;

  ngOnInit(): void {
    const description =
      'Descarga la app Android Spend$ave (Gastos Mobile): control de gastos, BCV e inventario. Instalación directa vía APK mientras no esté en Google Play.';
    this.seo.setMarketingPage(
      {
        title: 'Descargar app Android',
        description,
        path: '/descargar',
      },
      {
        applicationCategory: 'FinanceApplication',
        operatingSystem: 'Android',
        downloadUrl: 'https://mobilegastos.buildforge.work/gastos-mobile.apk',
      },
    );
  }
}
