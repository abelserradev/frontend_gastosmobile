import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SeoMetaService } from '../../core/seo-meta.service';
import { LandingPageComponent } from './landing-page.component';

describe('LandingPageComponent', () => {
  let fixture: ComponentFixture<LandingPageComponent>;
  let seo: SeoMetaService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LandingPageComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(LandingPageComponent);
    seo = TestBed.inject(SeoMetaService);
    spyOn(seo, 'setMarketingPage');
    fixture.detectChanges();
  });

  it('should render H1 and CTAs', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('h1')?.textContent).toContain('BCV');
    const loginLink = el.querySelector('a[routerLink="/login"]');
    expect(loginLink?.textContent).toContain('sesión');
    expect(seo.setMarketingPage).toHaveBeenCalled();
  });
});
