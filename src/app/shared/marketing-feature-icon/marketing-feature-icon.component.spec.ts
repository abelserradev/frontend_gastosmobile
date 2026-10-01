import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MarketingFeatureIconComponent } from './marketing-feature-icon.component';

describe('MarketingFeatureIconComponent', () => {
  let fixture: ComponentFixture<MarketingFeatureIconComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MarketingFeatureIconComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MarketingFeatureIconComponent);
    fixture.componentRef.setInput('kind', 'exchange-rate');
    fixture.detectChanges();
  });

  it('should render decorative svg', () => {
    const svg = fixture.nativeElement.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg.getAttribute('aria-hidden')).toBe('true');
  });
});
