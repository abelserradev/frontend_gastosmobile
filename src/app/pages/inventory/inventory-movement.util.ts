import type { MovementType } from '../../core/inventory-api.service';

/** Etiquetas legibles para auditoría de movimientos en UI. */
export function getMovementTypeLabel(type: MovementType): string {
  const labels: Record<MovementType, string> = {
    PURCHASE: 'Compra',
    SALE: 'Venta',
    ADJUSTMENT: 'Ajuste',
    INITIAL: 'Stock inicial',
    RETURN: 'Devolución',
    TRANSFER_OUT: 'Traslado (salida)',
    TRANSFER_IN: 'Traslado (entrada)',
  };
  return labels[type] ?? type;
}

export function getMovementTypeBadgeClass(type: MovementType): string {
  switch (type) {
    case 'SALE':
    case 'TRANSFER_OUT':
      return 'bg-secondary/10 text-secondary border-secondary/30';
    case 'PURCHASE':
    case 'RETURN':
    case 'TRANSFER_IN':
    case 'INITIAL':
      return 'bg-accent/10 text-accent border-accent/30';
    case 'ADJUSTMENT':
      return 'bg-primary/10 text-primary border-primary/30';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}
