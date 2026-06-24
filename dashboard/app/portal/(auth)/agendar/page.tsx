'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Página de agendamiento de turnos.
 * Si el usuario no está autenticado, lo redirige al login.
 */
export default function AgendarPage() {
  const router = useRouter();

  useEffect(() => {
    const isAuth = Boolean(/* lógica de autenticación aquí */);
    if (!isAuth) {
      router.replace('/login');
    }
  }, [router]);

  // Render opcional mientras redirige o muestra UI mínima
  return null;
}
