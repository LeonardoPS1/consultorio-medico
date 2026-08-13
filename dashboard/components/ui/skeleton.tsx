import { cn } from '@/lib/utils';

/**
 * Esqueleto de carga reutilizable.
 * @param {React.HTMLAttributes<HTMLDivElement>} root0 - Props del componente.
 * @param {string} root0.className - Clases CSS adicionales para el esqueleto.
 * @returns {React.JSX.Element} Elemento div con animación de pulso.
 */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />;
}

export { Skeleton };
