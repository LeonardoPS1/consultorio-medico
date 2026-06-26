'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function PortalLogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await fetch('/api/portal/logout', { method: 'POST' });
    } catch {
      // Ignorar errores de red, redirigir igual
    }
    router.push('/portal');
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="relative h-8 w-8 rounded-xl flex items-center justify-center
        text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400
        hover:bg-red-50 dark:hover:bg-red-950/30
        transition-all duration-200 active:scale-90 disabled:opacity-50"
      aria-label="Cerrar sesión"
      title="Cerrar sesión"
    >
      <LogOut className={`h-4 w-4 ${loading ? 'animate-pulse' : ''}`} />
    </button>
  );
}
