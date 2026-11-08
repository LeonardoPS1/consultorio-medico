/**
 * Limpieza del almacenamiento del cliente al cerrar sesión.
 *
 * El service worker ya no guarda respuestas de API ni HTML autenticado, pero un
 * dispositivo puede tener caches de versiones anteriores. Además el mismo equipo
 * puede ser usado por otra persona (recepción, sala de espera), así que al salir
 * se borra todo lo que quedó en el navegador.
 */
export async function clearClientCaches(): Promise<void> {
  try {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map(async (registration) => {
          const worker = registration.active ?? registration.waiting ?? registration.installing;
          if (!worker) return;
          const channel = new MessageChannel();
          worker.postMessage({ type: 'CLEAR_CACHES' }, [channel.port2]);
        }),
      );
    }
  } catch {
    // El service worker puede no estar disponible (HTTP, navegador viejo).
  }

  try {
    if (typeof caches !== 'undefined') {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } catch {
    // Sin Cache Storage disponible.
  }

  try {
    window.localStorage.clear();
    window.sessionStorage.clear();
  } catch {
    // Storage bloqueado (modo privado / políticas del navegador).
  }
}
