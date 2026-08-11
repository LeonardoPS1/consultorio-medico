/**
 * Layout específico para la página de videollamada.
 * Full screen, fondo negro para el video.
 */

import './livekit-styles.css';

/**
 *
 * @param root0
 * @param root0.children
 */
export default function VideollamadaLayout({ children }: { children: React.ReactNode }) {
  return <div className="h-screen w-screen overflow-hidden bg-black">{children}</div>;
}
