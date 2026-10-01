import { mergeCategoryDraft } from './merge-category-draft.util';

describe('mergeCategoryDraft', () => {
  it('should append when name is new', () => {
    const result = mergeCategoryDraft([{ id: '1', name: 'Comida' }], 'Transporte');
    expect(result.length).toBe(2);
    expect(result[1]?.name).toBe('Transporte');
  });

  it('should ignore duplicate names (accent insensitive)', () => {
    const result = mergeCategoryDraft([{ id: '1', name: 'Comida' }], 'comida');
    expect(result.length).toBe(1);
  });
});
