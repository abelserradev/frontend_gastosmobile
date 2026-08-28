/** Iconos por categoría: el usuario reconoce el gasto antes de leer el monto. */
export type ExpenseCategoryIconKind =
  | 'food'
  | 'transport'
  | 'home'
  | 'health'
  | 'entertainment'
  | 'shopping'
  | 'default';

const CATEGORY_RULES: ReadonlyArray<{
  kind: ExpenseCategoryIconKind;
  tokens: readonly string[];
}> = [
  {
    kind: 'food',
    tokens: ['comida', 'restaurant', 'super', 'mercado', 'aliment'],
  },
  {
    kind: 'transport',
    tokens: ['vehic', 'auto', 'carro', 'gasolin', 'manten', 'transport'],
  },
  { kind: 'home', tokens: ['casa', 'hogar', 'servicio', 'alquiler', 'condom'] },
  { kind: 'health', tokens: ['salud', 'medic', 'farmaci', 'clinic'] },
  {
    kind: 'entertainment',
    tokens: ['entreten', 'ocio', 'cine', 'streaming', 'juego'],
  },
  { kind: 'shopping', tokens: ['compra', 'ropa', 'tecnolog', 'electro'] },
];

export function resolveExpenseCategoryIcon(
  categoryName: string | null | undefined,
): ExpenseCategoryIconKind {
  const haystack = (categoryName ?? '').trim().toLowerCase();
  if (!haystack) {
    return 'default';
  }
  for (const rule of CATEGORY_RULES) {
    if (rule.tokens.some((t) => haystack.includes(t))) {
      return rule.kind;
    }
  }
  return 'default';
}
