import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Política de Privacidad — AiCoreMed',
  description: 'Política de privacidad y protección de datos de AiCoreMed, sistema de gestión para consultorios médicos.',
};

export default function PrivacidadPage() {
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
          Política de Privacidad
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
                Tus datos están 100% protegidos
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                En AiCoreMed la seguridad es nuestra prioridad. Todos los datos de salud se almacenan
                en infraestructura propia en Chile con cifrado AES-256, autenticación reforzada (2FA),
                y un asistente de IA que corre 100% local — tus datos nunca salen de tu servidor.
              </p>
            </div>
          </div>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">1. Introducción</h2>
            <p>
              En AiCoreMed (en adelante, &laquo;la Plataforma&raquo;), operada por <strong>Aicore</strong> (aicorebots.com),
              nos comprometemos a proteger la privacidad y confidencialidad de los datos de salud de los pacientes.
              Esta Política de Privacidad describe cómo recopilamos, usamos, almacenamos y protegemos la información
              personal y médica en nuestra plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">2. Responsable del Tratamiento</h2>
            <p>
              <strong>Aicore</strong> — Agencia especializada en automatizaciones, agentes de IA y chatbots.
              Contacto:{' '}
              <a href="mailto:info@aicorebots.com" className="text-primary hover:underline">info@aicorebots.com</a>
              {' '}|{' '}
              <a href="https://aicorebots.com" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">aicorebots.com</a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">3. Datos que Recopilamos</h2>
            <h3 className="text-base font-medium text-foreground mt-4 mb-2">3.1 Datos de la Cuenta</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>Nombre y apellido del profesional médico</li>
              <li>Dirección de correo electrónico</li>
              <li>Contraseña (almacenada de forma segura con bcrypt + hash)</li>
              <li>Número de teléfono profesional</li>
            </ul>

            <h3 className="text-base font-medium text-foreground mt-4 mb-2">3.2 Datos de Pacientes</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>Nombre completo</li>
              <li>Número de teléfono y/o email</li>
              <li>DNI / RUT / documento de identidad</li>
              <li>Datos de salud: historial médico, diagnósticos, recetas, alergias, medicación crónica</li>
              <li>Obra social / sistema de salud y número de afiliado</li>
              <li>Historial de turnos y consultas</li>
              <li>Conversaciones por WhatsApp con el consultorio</li>
            </ul>

            <h3 className="text-base font-medium text-foreground mt-4 mb-2">3.3 Datos de Uso</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>Dirección IP</li>
              <li>Tipo de navegador y sistema operativo</li>
              <li>Páginas visitadas dentro de la plataforma</li>
              <li>Registros de auditoría de accesos a datos médicos</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">4. Finalidad del Tratamiento</h2>
            <p>Utilizamos los datos recopilados para:</p>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>Gestionar turnos médicos y recordatorios</li>
              <li>Administrar la historia clínica digital</li>
              <li>Emitir recetas digitales</li>
              <li>Facilitar la comunicación entre el consultorio y el paciente vía WhatsApp</li>
              <li>Generar reportes y estadísticas de gestión (sin identificar pacientes)</li>
              <li>Mejorar la plataforma y su seguridad</li>
              <li>Cumplir con obligaciones legales y regulatorias</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">5. Base Legal para el Tratamiento</h2>
            <p>El tratamiento de sus datos se basa en:</p>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li><strong>Consentimiento explícito</strong> del paciente (para comunicación por WhatsApp/email)</li>
              <li><strong>Ejecución de un contrato</strong> de servicios médicos entre el profesional y el paciente</li>
              <li><strong>Interés legítimo</strong> del profesional médico para gestionar su consultorio</li>
              <li><strong>Cumplimiento de obligaciones legales</strong> (historia clínica, recetas, auditoría)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">6. IA Local y Confidencialidad</h2>
            <div className="bg-primary/5 border border-primary/10 rounded-lg p-4 my-4">
              <p className="text-sm font-medium text-foreground mb-1">
                🛡️ Diferenciador clave: IA 100% Local
              </p>
              <p className="text-sm">
                A diferencia de otros softwares médicos, el asistente de inteligencia artificial de AiCoreMed
                (<strong>Mistral</strong>) corre <strong>exclusivamente en su propia infraestructura</strong>
                (Ollama en su VPS). Esto significa que:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-sm mt-2">
                <li>Los datos de los pacientes <strong>nunca salen</strong> de su servidor</li>
                <li>No se envían datos a APIs externas como OpenAI, Google Cloud o Anthropic</li>
                <li>No se usan datos de pacientes para reentrenar modelos de IA</li>
                <li>No hay costos adicionales por API de IA</li>
                <li>No hay riesgo de fuga de datos por terceros</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">7. Compartición de Datos con Terceros</h2>
            <p>No compartimos datos personales de pacientes con terceros, excepto en los siguientes casos:</p>
            <table className="w-full text-sm border-collapse mt-3">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 font-medium text-foreground">Servicio</th>
                  <th className="text-left py-2 font-medium text-foreground">Qué datos se comparten</th>
                  <th className="text-left py-2 pl-4 font-medium text-foreground">Propósito</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="py-2 pr-4">Twilio (WhatsApp)</td>
                  <td className="py-2">Nombre + teléfono del paciente</td>
                  <td className="py-2 pl-4">Envío de recordatorios y comunicación</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">n8n (automatización)</td>
                  <td className="py-2">Datos del turno, paciente, receta</td>
                  <td className="py-2 pl-4">Ejecución de workflows internos</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">MercadoPago</td>
                  <td className="py-2">Solo datos de pago (no datos médicos)</td>
                  <td className="py-2 pl-4">Procesamiento de suscripciones</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Google Calendar</td>
                  <td className="py-2">Nombre del paciente (anonimizado opcional)</td>
                  <td className="py-2 pl-4">Sincronización de turnos</td>
                </tr>
              </tbody>
            </table>
            <p className="text-sm mt-3">
              Todos estos servicios operan bajo acuerdos de confidencialidad y cumplen con estándares de seguridad.
              En ningún caso se venden, alquilan o comercializan datos personales o médicos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">8. Medidas de Seguridad</h2>
            <p>Implementamos las siguientes medidas técnicas y organizativas:</p>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li><strong>Cifrado en tránsito:</strong> HTTPS/TLS 1.3 en todas las comunicaciones</li>
              <li><strong>Cifrado en reposo:</strong> AES-256-GCM para credenciales y backups</li>
              <li><strong>Autenticación:</strong> JWT + 2FA TOTP + bloqueo por intentos fallidos</li>
              <li><strong>Multi-tenant:</strong> Aislamiento completo de datos entre consultorios</li>
              <li><strong>Auditoría:</strong> Registro de todos los accesos a datos médicos con trazabilidad</li>
              <li><strong>Borrado lógico:</strong> Soft-delete en todas las tablas (nada se pierde accidentalmente)</li>
              <li><strong>Firewall:</strong> Puerto de base de datos bloqueado a acceso externo</li>
              <li><strong>Backup encriptado:</strong> Copias de seguridad diarias con cifrado</li>
              <li><strong>Sanitización de prompts:</strong> Protección contra jailbreak en asistentes IA</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">9. Retención de Datos</h2>
            <p>Conservamos los datos durante el tiempo necesario para cumplir con las finalidades descritas:</p>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li><strong>Datos de cuenta:</strong> Mientras la cuenta esté activa</li>
              <li><strong>Historial clínico:</strong> Mínimo 5 años desde la última consulta (según normativa local)</li>
              <li><strong>Logs de auditoría:</strong> 90 días (configurable)</li>
              <li><strong>Conversaciones:</strong> 1 año desde la última interacción</li>
              <li><strong>Backups:</strong> 30 días rotativos</li>
            </ul>
            <p className="text-sm">Al cancelar la cuenta, los datos se conservan por 90 días antes de ser anonimizados definitivamente.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">10. Derechos del Paciente (ARCO)</h2>
            <p>Todo paciente tiene derecho a:</p>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li><strong>Acceso:</strong> Solicitar una copia de todos sus datos personales y médicos</li>
              <li><strong>Rectificación:</strong> Corregir datos inexactos o incompletos</li>
              <li><strong>Cancelación:</strong> Solicitar la eliminación o anonimización de sus datos</li>
              <li><strong>Oposición:</strong> Oponerse al tratamiento de sus datos para fines específicos</li>
              <li><strong>Portabilidad:</strong> Recibir sus datos en formato estructurado (JSON/PDF)</li>
              <li><strong>Revocar consentimiento:</strong> En cualquier momento, sin afectar la licitud del tratamiento previo</li>
            </ul>
            <p className="text-sm mt-3">
              Para ejercer estos derechos, el paciente puede contactar directamente a su médico o escribirnos a{' '}
              <a href="mailto:info@aicorebots.com" className="text-primary hover:underline">info@aicorebots.com</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">11. Consentimiento para Comunicaciones</h2>
            <p>
              La plataforma requiere consentimiento explícito del paciente para enviar comunicaciones por WhatsApp y email.
              El paciente puede gestionar sus preferencias en cualquier momento desde su perfil en el Portal del Paciente.
              Cada cambio de consentimiento queda registrado en el historial de auditoría.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">12. Cookies</h2>
            <p>
              AiCoreMed utiliza únicamente cookies técnicas esenciales para el funcionamiento de la plataforma
              (autenticación, sesión, seguridad). No utilizamos cookies de tracking, publicidad ni de terceros.
              Al utilizar la plataforma, usted acepta el uso de estas cookies técnicas.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">13. Cambios en esta Política</h2>
            <p>
              Nos reservamos el derecho de actualizar esta Política de Privacidad en cualquier momento.
              Los cambios serán notificados a través de la plataforma y, cuando sea relevante, por correo electrónico.
              La fecha de la última actualización aparece al inicio de este documento.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">14. Contacto</h2>
            <p>
              Si tenés preguntas sobre esta Política de Privacidad o sobre el tratamiento de tus datos,
              podés contactarnos en:
            </p>
            <div className="bg-muted/50 rounded-lg p-4 mt-2 text-sm">
              <p><strong>Aicore</strong></p>
              <p>Email: <a href="mailto:info@aicorebots.com" className="text-primary hover:underline">info@aicorebots.com</a></p>
              <p>Web: <a href="https://aicorebots.com" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">aicorebots.com</a></p>
              <p>WhatsApp: <a href="https://wa.me/56975680702" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">+56 9 7568 0702</a></p>
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
            <Link href="/terminos" className="hover:text-foreground transition-colors">
              Términos del Servicio
            </Link>
            <Link href="/privacidad" className="hover:text-foreground transition-colors">
              Política de Privacidad
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
