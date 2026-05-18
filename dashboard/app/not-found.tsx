'use client';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="mx-auto max-w-md text-center">
        <div className="mb-6 text-7xl font-bold text-muted-foreground/30">404</div>
        <h1 className="mb-2 text-2xl font-semibold tracking-tight">
          Página no encontrada
        </h1>
        <p className="mb-8 text-sm text-muted-foreground">
          La página que buscás no existe, fue movida o no tenés acceso.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Volver al inicio
          </Link>
          <button
            onClick={() => history.back()}
            className="inline-flex h-9 items-center justify-center rounded-lg border bg-background px-4 text-sm font-medium transition-colors hover:bg-accent"
          >
            Retroceder
          </button>
        </div>
      </div>
    </div>
  );
}
