import type { CategoryDraft } from '../../core/app-context.service';

/** Tras crear un gasto, refleja categorías nuevas en el selector sin recargar /me. */
export function mergeCategoryDraft(
  list: CategoryDraft[],
  categoryName: string,
): CategoryDraft[] {
  const name = categoryName.trim();
  if (!name) {
    return list;
  }
  const exists = list.some(
    (c) => c.name.localeCompare(name, 'es', { sensitivity: 'accent' }) === 0,
  );
  if (exists) {
    return list;
  }
  return [...list, { id: `local-${encodeURIComponent(name)}`, name }];
}
