import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Términos del Servicio — AiCoreMed',
  description: 'Términos y condiciones de uso de AiCoreMed, sistema de gestión para consultorios médicos.',
};

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar simplificado */}
      <header className="border-b bg-background/95 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2">
            <img src="/aicoremed_dark_1200.svg" alt="AiCoreMed" className="h-9 md:h-11 w-auto" />
          </Link>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Volver al inicio
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-12 md:py-16 max-w-3xl">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
          Términos del Servicio
        </h1>
        <p className="text-sm text-muted-foreground mb-4">
          Última actualización: 27 de mayo de 2026
        </p>

        {/* Security banner */}
        <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 md:p-5 mb-8">
          <div className="flex flex-col sm:flex-row items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm mb-0.5">
                Plataforma 100% segura y conforme a la ley
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                AiCoreMed cumple con la Ley 19.628 de Chile sobre
                protección de datos personales. Todos los datos de salud se tratan bajo estrictas
                medidas de seguridad: cifrado AES-256, autenticación con 2FA, IA local sin acceso
                externo, y backup encriptado diario. Tus pacientes están protegidos.
              </p>
            </div>
          </div>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">1. Aceptación de los Términos</h2>
            <p>
              Al acceder o utilizar la plataforma AiCoreMed (en adelante, &laquo;la Plataforma&raquo;), usted acepta
              estar sujeto a estos Términos del Servicio. Si no está de acuerdo con alguna parte de los términos,
              no podrá acceder a la Plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">2. Descripción del Servicio</h2>
            <p>
              AiCoreMed es un sistema de gestión para consultorios médicos que proporciona herramientas para:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>Gestión de turnos y agenda médica</li>
              <li>Historia clínica digital</li>
              <li>Recetas digitales</li>
              <li>Comunicación automatizada con pacientes vía WhatsApp</li>
              <li>Asistente de inteligencia artificial local (Ollama + Mistral)</li>
              <li>Reportes y estadísticas de gestión</li>
              <li>Portal del paciente</li>
              <li>Automatizaciones vía n8n</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">3. Roles y Responsabilidades</h2>
            <h3 className="text-base font-medium text-foreground mt-4 mb-2">3.1 Responsable del Tratamiento</h3>
            <p>
              El profesional médico o la institución que utiliza la Plataforma es el <strong>Responsable del Tratamiento</strong>{' '}
              de los datos de salud de sus pacientes, según lo definido por las leyes de protección de datos aplicables.
            </p>

            <h3 className="text-base font-medium text-foreground mt-4 mb-2">3.2 Encargado del Tratamiento</h3>
            <p>
              Aicore actúa como <strong>Encargado del Tratamiento</strong>, procesando los datos personales según las
              instrucciones del profesional médico y bajo estrictas medidas de seguridad.
            </p>

            <h3 className="text-base font-medium text-foreground mt-4 mb-2">3.3 Obligaciones del Profesional</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>Obtener el consentimiento informado de sus pacientes para el uso de la Plataforma</li>
              <li>Garantizar que los datos ingresados son precisos y actualizados</li>
              <li>Mantener la confidencialidad de sus credenciales de acceso</li>
              <li>Informar a sus pacientes sobre el tratamiento de sus datos</li>
              <li>Responder ante sus pacientes por el ejercicio de sus derechos ARCO</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">4. Cuentas y Registro</h2>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>Debe proporcionar información precisa y completa al registrarse</li>
              <li>Es responsable de mantener la confidencialidad de su contraseña</li>
              <li>Debe notificar inmediatamente cualquier uso no autorizado de su cuenta</li>
              <li>Una persona no puede tener múltiples cuentas gratuitas</li>
              <li>Nos reservamos el derecho de suspender cuentas que violen estos términos</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">5. Privacidad y Datos</h2>
            <p>
              El tratamiento de datos personales se rige por nuestra{' '}
              <Link href="/privacidad" className="text-primary hover:underline">Política de Privacidad</Link>,
              que forma parte integral de estos Términos del Servicio.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">6. Propiedad Intelectual</h2>
            <p>
              La Plataforma, incluyendo su código, diseño, logotipos y contenido, es propiedad exclusiva de Aicore
              y está protegida por leyes de propiedad intelectual. El usuario obtiene una licencia limitada,
              no exclusiva e intransferible para usar la Plataforma durante la vigencia de su suscripción.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">7. Planes y Facturación</h2>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>Ofrecemos planes gratuitos y de pago con diferentes niveles de funcionalidades</li>
              <li>Los planes de pago se facturan mensualmente en USD a través de MercadoPago</li>
              <li>Puede cancelar su suscripción en cualquier momento desde el panel de configuración</li>
              <li>Al cancelar, conservará acceso hasta el final del período facturado</li>
              <li>14 días de prueba gratuita en todos los planes (sin tarjeta de crédito requerida para el plan Free)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">8. Limitación de Responsabilidad</h2>
            <p>
              AiCoreMed se proporciona &laquo;tal cual&raquo; y &laquo;según disponibilidad&raquo;. Aicore no será
              responsable por:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>Daños indirectos, incidentales o consecuentes derivados del uso de la Plataforma</li>
              <li>Decisiones médicas basadas en la información proporcionada por el asistente IA</li>
              <li>Interrupciones del servicio por mantenimiento, fuerza mayor o problemas de terceros</li>
              <li>Pérdida de datos por causas ajenas a nuestra voluntad (siempre mantenemos backups)</li>
            </ul>
            <p className="text-sm mt-3">
              El asistente de IA es una <strong>herramienta de apoyo</strong> y no reemplaza el criterio profesional
              del médico. Todas las decisiones médicas son responsabilidad exclusiva del profesional tratante.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">9. Cancelación y Eliminación de Datos</h2>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>Puede cancelar su cuenta en cualquier momento desde Configuración</li>
              <li>Al cancelar, los datos se conservan por 90 días (período de gracia para reactivación)</li>
              <li>Pasado ese período, los datos personales son anonimizados irreversiblemente</li>
              <li>Los registros de auditoría se conservan por obligación legal</li>
              <li>Puede solicitar la exportación de sus datos antes de la cancelación</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">10. Modificaciones</h2>
            <p>
              Nos reservamos el derecho de modificar estos términos en cualquier momento. Los cambios serán notificados
              a través de la Plataforma con al menos 15 días de anticipación. El uso continuado de la Plataforma
              después de los cambios constituye la aceptación de los nuevos términos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">11. Legislación Aplicable</h2>
            <p>
              Estos Términos se rigen por las leyes de la República de Chile. Cualquier disputa será resuelta
              ante los tribunales de Santiago de Chile.
            </p>

          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">12. Contacto</h2>
            <p>
              Para consultas sobre estos términos, contactanos en:
            </p>
            <div className="bg-muted/50 rounded-lg p-4 mt-2 text-sm">
              <p><strong>Aicore</strong></p>
              <p>Email: <a href="mailto:info@aicorebots.com" className="text-primary hover:underline">info@aicorebots.com</a></p>
              <p>Web: <a href="https://aicorebots.com" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">aicorebots.com</a></p>
            </div>
          </section>
        </div>
      </main>

      {/* Footer simplificado */}
      <footer className="border-t mt-12">
        <div className="container mx-auto px-4 md:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} AiCoreMed. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link href="/privacidad" className="hover:text-foreground transition-colors">
              Política de Privacidad
            </Link>
            <Link href="/terminos" className="hover:text-foreground transition-colors">
              Términos del Servicio
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
