/**
 * Layout mínimo para la página de verificación de recetas.
 * Sin auth, sin sidebar, sin providers del dashboard.
 * Es una página pública accesible via QR.
 */
export default function VerificarRecetaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
