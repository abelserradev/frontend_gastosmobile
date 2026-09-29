import { getLegalDocument } from './legal-content.es';
import { LEGAL_NAV_LINKS } from './legal.constants';

describe('legal-content.es', () => {
  it('should expose one document per nav slug with title and sections', () => {
    for (const { slug } of LEGAL_NAV_LINKS) {
      const doc = getLegalDocument(slug);
      expect(doc.slug).toBe(slug);
      expect(doc.title.length).toBeGreaterThan(3);
      expect(doc.metaDescription.length).toBeGreaterThan(10);
      expect(doc.sections.length).toBeGreaterThan(0);
    }
  });

  it('should mention BuildForge in privacy responsable section', () => {
    const doc = getLegalDocument('privacidad');
    const responsable = doc.sections[0]?.paragraphs.join(' ') ?? '';
    expect(responsable).toContain('BuildForge');
  });
});
