'use client';

import { FileText, Shield, Gavel, Scale } from 'lucide-react';

export interface LegalDocument {
  id: string;
  title: string;
  shortTitle: string;
  icon: React.ElementType;
  description: string;
  lastUpdated: string;
  content: React.ReactNode;
}

export const legalDocuments: LegalDocument[] = [
  {
    id: 'privacidad',
    title: 'Política de Privacidad',
    shortTitle: 'Privacidad',
    icon: Shield,
    description: 'Cómo protegemos tus datos personales y de salud según la legislación chilena',
    lastUpdated: 'Agosto 2026',
    content: (
      <>
        <section>
          <h2>1. Introducción</h2>
          <p>
            En <strong>AicoreMed</strong> (marca comercial de <strong>Aicore SpA</strong>), nos
            comprometemos a proteger la privacidad y confidencialidad de tus datos personales y de
            salud. Esta Política de Privacidad explica cómo recopilamos, usamos, almacenamos y
            protegemos tu información cuando utilizas el Portal del Paciente de tu consultorio
            médico.
          </p>
          <p>
            Cumplimos con la <strong>Ley 19.628 sobre Protección de la Vida Privada</strong> (y su
            reciente modificación por la <strong>Ley 21.719</strong>, publicada en el Diario Oficial
            el 13 de diciembre de 2024, que crea la nueva Ley de Datos Personales y se encuentra en
            vacancia legal), la <strong>Ley 20.584</strong> que regula los derechos y deberes de los
            pacientes, y la <strong>Ley 19.496</strong> sobre protección de los derechos de los
            consumidores.
          </p>
        </section>

        <section>
          <h2>2. Responsable y Encargado del Tratamiento</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                <Scale className="h-5 w-5" /> Responsable del Tratamiento
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Tu <strong>consultorio médico / profesional de salud</strong> es el responsable de
                decidir qué datos se recopilan y para qué finalidades, conforme a la Ley 19.628 y
                Ley 20.584.
              </p>
            </div>
            <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg border border-green-200 dark:border-green-800">
              <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2 flex items-center gap-2">
                <Shield className="h-5 w-5" /> Encargado del Tratamiento
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300">
                <strong>AicoreMed (Aicore SpA)</strong> actúa como encargado, procesando tus datos
                por cuenta del consultorio bajo estrictas medidas de seguridad y contractuales.
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm">
            Contacto del Encargado: <strong>Aicore SpA</strong> — Email:{' '}
            <a href="mailto:info@aicorebots.com" className="text-primary hover:underline">
              info@aicorebots.com
            </a>{' '}
            — Web:{' '}
            <a
              href="https://aicorebots.com"
              className="text-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              aicorebots.com
            </a>{' '}
            — WhatsApp:{' '}
            <a
              href="https://wa.me/56975680702"
              className="text-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              +56 9 7568 0702
            </a>
          </p>
        </section>

        <section>
          <h2>3. Datos que Recopilamos</h2>
          <p>
            Solo recopilamos los datos estrictamente necesarios para tu atención médica y el
            funcionamiento del portal:
          </p>

          <h3>3.1 Datos de Identificación y Cuenta</h3>
          <ul>
            <li>Nombre completo</li>
            <li>RUT (solo para identificación única en el sistema de salud)</li>
            <li>Fecha de nacimiento</li>
            <li>Dirección de correo electrónico</li>
            <li>Número de teléfono móvil (para notificaciones y WhatsApp)</li>
            <li>Contraseña (almacenada de forma segura con bcrypt + hash, nunca en texto plano)</li>
          </ul>

          <h3>3.2 Datos de Salud (Categoría Especial — Protección Reforzada)</h3>
          <ul>
            <li>Historial médico: diagnósticos, alergias, medicación crónica, antecedentes</li>
            <li>Recetas médicas emitidas y su estado</li>
            <li>Certificados médicos solicitados</li>
            <li>Órdenes de estudios y exámenes</li>
            <li>Consentimientos informados firmados</li>
            <li>Turnos agendados, asistidos, cancelados o no asistidos</li>
            <li>Comunicaciones por WhatsApp con el consultorio (solo si das consentimiento)</li>
            <li>Sistema de salud / previsión (FONASA / ISAPRE) y número de afiliado</li>
          </ul>

          <h3>3.3 Datos Técnicos y de Uso</h3>
          <ul>
            <li>Dirección IP, tipo de navegador y sistema operativo</li>
            <li>Páginas visitadas dentro del portal</li>
            <li>Registros de auditoría: quién accedió a tu ficha, cuándo y qué acción realizó</li>
            <li>Preferencias de notificación y configuración de la cuenta</li>
          </ul>
        </section>

        <section>
          <h2>4. Finalidad del Tratamiento (Ley 20.584 y 19.628)</h2>
          <p>Tus datos se tratan exclusivamente para:</p>
          <ul>
            <li>Gestionar tus turnos médicos: agendar, reprogramar, cancelar, recordatorios</li>
            <li>Mantener tu historia clínica digital accesible para ti y tu equipo tratante</li>
            <li>Emitir y renovar recetas médicas digitales</li>
            <li>Generar certificados médicos y órdenes de estudios</li>
            <li>
              Facilitar la comunicación con tu consultorio (WhatsApp, email){' '}
              <strong>solo con tu consentimiento</strong>
            </li>
            <li>
              Permitirte ejercer tus derechos ARCO (Acceso, Rectificación, Cancelación, Oposición) y
              portabilidad
            </li>
            <li>
              Cumplir obligaciones legales: retención de historia clínica, auditorías, regulaciones
              sanitarias
            </li>
            <li>Mejorar la seguridad y el funcionamiento de la plataforma</li>
          </ul>
        </section>

        <section>
          <h2>5. Base Legal para el Tratamiento (Ley 19.628 Art. 4 y Ley 21.719)</h2>
          <ul>
            <li>
              <strong>Consentimiento libre, informado, específico e inequívoco</strong> — para
              comunicaciones por WhatsApp/email, uso del portal, tratamientos no obligatorios.
            </li>
            <li>
              <strong>Ejecución de un contrato / relación asistencial</strong> — la atención médica
              genera obligaciones legales de registro (Ley 20.584).
            </li>
            <li>
              <strong>Obligación legal</strong> — retención de historia clínica, recetas,
              auditorías, notificaciones sanitarias.
            </li>
            <li>
              <strong>Interés legítimo</strong> — seguridad de la plataforma, prevención de fraude,
              mejora del servicio (siempre ponderado con tus derechos).
            </li>
            <li>
              <strong>Interés vital</strong> — en situaciones de emergencia médica que amenacen tu
              vida o salud.
            </li>
          </ul>
        </section>

        <section>
          <h2>6. IA Local y Confidencialidad — Diferenciador Clave</h2>
          <div className="bg-primary/5 border border-primary/10 rounded-lg p-4 my-4">
            <p className="font-medium text-primary mb-2 flex items-center gap-2">
              <Shield className="h-5 w-5" /> Tu información nunca sale de la infraestructura del
              consultorio
            </p>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>
                El asistente de IA (<strong>Mistral</strong> via <strong>Ollama</strong>) corre{' '}
                <strong>100% en los servidores del consultorio</strong> (on-premise / VPS privada).
              </li>
              <li>
                <strong>No se envían datos a APIs externas</strong> (OpenAI, Google Cloud,
                Anthropic, Azure, etc.).
              </li>
              <li>
                <strong>No se usan tus datos para entrenar modelos de IA</strong>.
              </li>
              <li>No hay costos por uso de API de IA ni riesgo de fuga por terceros.</li>
            </ul>
          </div>
        </section>

        <section>
          <h2>7. Compartición de Datos con Terceros</h2>
          <p>
            No vendemos, alquilamos ni comercializamos tus datos. Solo se comparten en estos casos:
          </p>
          <table className="w-full text-sm border-collapse mt-3">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4 font-medium">Servicio / Destinatario</th>
                <th className="text-left py-2">Qué datos</th>
                <th className="text-left py-2 pl-4 font-medium">Finalidad / Base Legal</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr>
                <td className="py-2 pr-4">Twilio (WhatsApp)</td>
                <td className="py-2">Nombre + teléfono</td>
                <td className="py-2 pl-4">
                  Recordatorios de turnos, comunicación asistencial — <em>Consentimiento</em>
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-4">n8n (Automatización interna)</td>
                <td className="py-2">Datos de turno, receta, paciente</td>
                <td className="py-2 pl-4">
                  Ejecución de workflows del consultorio — <em>Encargado de tratamiento</em>
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-4">MercadoPago</td>
                <td className="py-2">Solo datos de pago (no datos médicos)</td>
                <td className="py-2 pl-4">
                  Procesamiento de pagos del consultorio — <em>Contrato</em>
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-4">Google Calendar (opcional)</td>
                <td className="py-2">Nombre (anonimizable) + turno</td>
                <td className="py-2 pl-4">
                  Sincronización de agenda del profesional —{' '}
                  <em>Interés legítimo / Consentimiento</em>
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-4">Autoridades sanitarias / judiciales</td>
                <td className="py-2">Lo estrictamente requerido</td>
                <td className="py-2 pl-4">
                  Cumplimiento de obligaciones legales — <em>Obligación legal</em>
                </td>
              </tr>
            </tbody>
          </table>
          <p className="text-sm mt-3">
            Todos los terceros operan bajo acuerdos de confidencialidad y cumplen estándares de
            seguridad equivalentes.
          </p>
        </section>

        <section>
          <h2>8. Medidas de Seguridad Técnicas y Organizativas</h2>
          <ul>
            <li>
              <strong>Cifrado en tránsito:</strong> HTTPS/TLS 1.3 en todas las comunicaciones.
            </li>
            <li>
              <strong>Cifrado en reposo:</strong> AES-256-GCM para credenciales, backups y datos
              sensibles.
            </li>
            <li>
              <strong>Autenticación robusta:</strong> JWT + 2FA TOTP opcional + bloqueo por intentos
              fallidos (5 intentos = 15 min).
            </li>
            <li>
              <strong>Aislamiento multi-tenant:</strong> Separación completa de datos entre
              consultorios (Row Level Security en PostgreSQL).
            </li>
            <li>
              <strong>Auditoría completa:</strong> Registro inmutable de todos los accesos a tu
              ficha médica con trazabilidad (ver sección "Privacidad y accesos" en tu portal).
            </li>
            <li>
              <strong>Borrado lógico (soft-delete):</strong> Nada se elimina accidentalmente; todo
              es recuperable por auditoría.
            </li>
            <li>
              <strong>Firewall:</strong> Base de datos sin acceso externo; solo accesible desde red
              Docker interna.
            </li>
            <li>
              <strong>Backup encriptado diario:</strong> Copias de seguridad con cifrado GPG,
              retención 30 días, almacenamiento off-site.
            </li>
            <li>
              <strong>Sanitización de prompts:</strong> Protección contra inyección de prompts
              (jailbreak) en asistentes IA.
            </li>
          </ul>
        </section>

        <section>
          <h2>9. Retención de Datos</h2>
          <ul>
            <li>
              <strong>Datos de cuenta y portal:</strong> Mientras tu cuenta esté activa + 2 años
              tras baja o inactividad.
            </li>
            <li>
              <strong>Historia clínica y datos de salud:</strong> Mínimo <strong>10 años</strong>{' '}
              desde la última consulta (Art. 17 Ley 20.584 y normativa sanitaria chilena).
            </li>
            <li>
              <strong>Recetas médicas:</strong> Mínimo 5 años (normativa de farmacovigilancia).
            </li>
            <li>
              <strong>Logs de auditoría y accesos:</strong> 90 días (configurable por el
              consultorio).
            </li>
            <li>
              <strong>Conversaciones WhatsApp:</strong> 1 año desde la última interacción.
            </li>
            <li>
              <strong>Backups encriptados:</strong> 30 días rotativos.
            </li>
          </ul>
          <p className="mt-3 text-sm">
            Al solicitar la baja de tu cuenta, los datos se conservan 90 días (período de gracia
            para reactivación) y luego son anonimizados irreversiblemente. Los registros de
            auditoría y obligaciones legales se conservan según la norma aplicable.
          </p>
        </section>

        <section>
          <h2>10. Tus Derechos (Ley 19.628, Ley 21.719, Ley 20.584)</h2>
          <p>Como titular de datos, tienes derecho a:</p>
          <ul>
            <li>
              <strong>Acceso:</strong> Solicitar copia de todos tus datos personales y de salud en
              formato legible.
            </li>
            <li>
              <strong>Rectificación:</strong> Corregir datos inexactos, incompletos o
              desactualizados.
            </li>
            <li>
              <strong>Cancelación / Supresión:</strong> Solicitar eliminación cuando los datos no
              sean necesarios para la finalidad original (sujeto a obligaciones de retención legal).
            </li>
            <li>
              <strong>Oposición:</strong> Oponerte al tratamiento para fines específicos (ej.
              marketing, perfiles).
            </li>
            <li>
              <strong>Portabilidad:</strong> Recibir tus datos en formato estructurado, de uso común
              y lectura mecánica (JSON/PDF).
            </li>
            <li>
              <strong>Revocar consentimiento:</strong> En cualquier momento, sin afectar la licitud
              del tratamiento previo.
            </li>
            <li>
              <strong>No ser sometido a decisiones automatizadas</strong> que produzcan efectos
              jurídicos significativos (Art. 15 Ley 19.628).
            </li>
          </ul>
          <p className="mt-3">
            <strong>Plazo de respuesta:</strong> 10 días hábiles (Ley 19.628 Art. 14), prorrogables
            10 días más con notificación.
          </p>
          <p className="mt-2">
            Para ejercer tus derechos: escribe a{' '}
            <a href="mailto:info@aicorebots.com" className="text-primary hover:underline">
              info@aicorebots.com
            </a>{' '}
            o usa el formulario en tu portal (sección "Mis datos"). También puedes contactar
            directamente a tu consultorio, que es el Responsable del Tratamiento.
          </p>
        </section>

        <section>
          <h2>11. Consentimiento para Comunicaciones</h2>
          <p>
            El portal requiere tu consentimiento explícito para enviar comunicaciones por WhatsApp y
            email (recordatorios, resultados, novedades). Puedes gestionar tus preferencias en
            cualquier momento desde <strong>Perfil → Notificaciones</strong>. Cada cambio queda
            registrado en la auditoría.
          </p>
        </section>

        <section>
          <h2>12. Cookies y Tecnologías Similares</h2>
          <p>
            AicoreMed utiliza únicamente <strong>cookies técnicas esenciales</strong> para el
            funcionamiento del portal: autenticación, sesión, seguridad, preferencias de
            idioma/tema.{' '}
            <strong>
              No utilizamos cookies de tracking, publicidad, analítica de terceros ni redes
              sociales.
            </strong>{' '}
            Al utilizar el portal, aceptas el uso de estas cookies técnicas necesarias.
          </p>
        </section>

        <section>
          <h2>13. Cambios en esta Política</h2>
          <p>
            Nos reservamos el derecho de actualizar esta Política de Privacidad. Los cambios
            sustanciales serán notificados a través del portal y, cuando sea relevante, por correo
            electrónico con al menos 30 días de antelación. La fecha de última actualización aparece
            al inicio de este documento.
          </p>
        </section>

        <section>
          <h2>14. Contacto y Delegado de Protección de Datos (DPO)</h2>
          <div className="bg-muted/50 rounded-lg p-4 mt-2 text-sm">
            <p>
              <strong>Aicore SpA — Delegado de Protección de Datos (DPO)</strong>
            </p>
            <p>
              Email:{' '}
              <a href="mailto:dpo@aicorebots.com" className="text-primary hover:underline">
                dpo@aicorebots.com
              </a>
            </p>
            <p>
              Email general:{' '}
              <a href="mailto:info@aicorebots.com" className="text-primary hover:underline">
                info@aicorebots.com
              </a>
            </p>
            <p>
              Web:{' '}
              <a
                href="https://aicorebots.com"
                className="text-primary hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                aicorebots.com
              </a>
            </p>
            <p>
              WhatsApp:{' '}
              <a
                href="https://wa.me/56975680702"
                className="text-primary hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                +56 9 7568 0702
              </a>
            </p>
            <p>Dirección: Viña del Mar, Región de Valparaíso, Chile</p>
            <p>Horario: Lunes a Viernes 9:00–18:00</p>
          </div>
          <p className="mt-3 text-sm">
            También puedes presentar reclamo ante la{' '}
            <strong>Agencia de Protección de Datos Personales (APDP)</strong> de Chile (según Ley
            21.719) o la autoridad que la sustituya, una vez constituida.
          </p>
        </section>
      </>
    ),
  },
  {
    id: 'aviso-legal',
    title: 'Aviso Legal',
    shortTitle: 'Aviso Legal',
    icon: FileText,
    description: 'Información legal del servicio, titularidad y condiciones de acceso',
    lastUpdated: 'Agosto 2026',
    content: (
      <>
        <section>
          <h2>1. Titularidad y Datos Identificativos</h2>
          <p>
            En cumplimiento de la <strong>Ley 19.496</strong> (Protección de Derechos del
            Consumidor) y la <strong>Ley 20.584</strong> (Derechos y Deberes de los Pacientes), se
            informa que:
          </p>
          <ul>
            <li>
              <strong>Denominación social:</strong> Aicore SpA
            </li>
            <li>
              <strong>Nombre comercial:</strong> AicoreMed
            </li>
            <li>
              <strong>RUT:</strong> 77.123.456-7
            </li>
            <li>
              <strong>Domicilio:</strong> Viña del Mar, Región de Valparaíso, Chile
            </li>
            <li>
              <strong>Email de contacto:</strong>{' '}
              <a href="mailto:info@aicorebots.com" className="text-primary hover:underline">
                info@aicorebots.com
              </a>
            </li>
            <li>
              <strong>Sitio web:</strong>{' '}
              <a
                href="https://aicorebots.com"
                className="text-primary hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                aicorebots.com
              </a>
            </li>
            <li>
              <strong>WhatsApp:</strong>{' '}
              <a
                href="https://wa.me/56975680702"
                className="text-primary hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                +56 9 7568 0702
              </a>
            </li>
          </ul>
        </section>

        <section>
          <h2>2. Objeto del Portal</h2>
          <p>
            El <strong>Portal del Paciente de AicoreMed</strong> es una plataforma digital que
            permite a los pacientes de consultorios médicos adheridos acceder a sus turnos, recetas,
            historial clínico, certificados, consentimientos, ordenes de estudio y comunicaciones
            con su equipo de salud, de forma segura y en cumplimiento de la normativa chilena.
          </p>
          <p>
            AicoreMed actúa como <strong>proveedor tecnológico (Encargado del Tratamiento)</strong>{' '}
            de la plataforma. El consultorio médico es el{' '}
            <strong>Responsable del Tratamiento</strong> de tus datos de salud y el prestador del
            servicio asistencial.
          </p>
        </section>

        <section>
          <h2>3. Acceso y Uso del Portal</h2>
          <ul>
            <li>
              El acceso al portal es <strong>personal, intransferible y gratuito</strong> para el
              paciente.
            </li>
            <li>
              Requiere autenticación mediante <strong>magic link enviado por WhatsApp/email</strong>{' '}
              (JWT con expiración 24h).
            </li>
            <li>
              El paciente es responsable de mantener la confidencialidad de su acceso y notificar
              cualquier uso no autorizado.
            </li>
            <li>
              El portal <strong>no sustituye la atención médica presencial ni de urgencia</strong>.
              En caso de emergencia, acude a un servicio de urgencia o llama al 131 (SAMU).
            </li>
            <li>
              La información médica mostrada es la registrada por tu equipo tratante. AicoreMed no
              genera, modifica ni valida contenido clínico.
            </li>
          </ul>
        </section>

        <section>
          <h2>4. Propiedad Intelectual e Industrial</h2>
          <p>
            Todos los derechos de propiedad intelectual e industrial sobre la plataforma AicoreMed
            (código fuente, diseño, logotipos, marcas, interfaces, bases de datos, documentación)
            son titularidad exclusiva de <strong>Aicore SpA</strong> y se encuentran protegidos por
            la legislación chilena e internacional aplicable.
          </p>
          <p>
            El paciente obtiene una{' '}
            <strong>licencia limitada, no exclusiva, intransferible y revocable</strong> para usar
            el portal durante la vigencia de su relación con el consultorio. Queda prohibida la
            reproducción, distribución, comunicación pública, transformación, ingeniería inversa o
            cualquier explotación no autorizada.
          </p>
        </section>

        <section>
          <h2>5. Responsabilidad y Limitaciones</h2>
          <ul>
            <li>
              <strong>Disponibilidad:</strong> AicoreMed se proporciona «tal cual» y «según
              disponibilidad». No garantizamos disponibilidad ininterrumpida (mantenimientos, fuerza
              mayor, problemas de terceros).
            </li>
            <li>
              <strong>Decisiones médicas:</strong> La información del portal y del asistente IA son{' '}
              <strong>herramientas de apoyo</strong>. No reemplazan el criterio profesional del
              médico. Todas las decisiones clínicas son responsabilidad exclusiva del profesional
              tratante.
            </li>
            <li>
              <strong>Exactitud de datos:</strong> El consultorio es responsable de la exactitud de
              los datos clínicos ingresados. El paciente debe verificar y solicitar rectificación si
              detecta errores.
            </li>
            <li>
              <strong>Enlaces a terceros:</strong> El portal puede contener enlaces a sitios
              externos (p.ej. laboratorios, prepagas). AicoreMed no controla ni se responsabiliza
              por su contenido o políticas.
            </li>
            <li>
              <strong>Daños indirectos:</strong> AicoreMed no será responsable por daños indirectos,
              incidentales, consecuentes, lucro cesante o pérdida de datos por causas ajenas a su
              voluntad (siempre mantenemos backups encriptados).
            </li>
          </ul>
        </section>

        <section>
          <h2>6. Protección de Datos Personales y de Salud</h2>
          <p>
            El tratamiento de tus datos se rige por la <strong>Política de Privacidad</strong>{' '}
            (pestaña correspondiente), que forma parte integrante de este Aviso Legal. Cumplimos con
            la Ley 19.628, Ley 21.719, Ley 20.584 y Ley 19.496.
          </p>
          <p>
            Los datos de salud gozan de <strong>protección reforzada</strong> (categoría especial).
            Solo el personal autorizado del consultorio puede acceder a tu ficha, y cada acceso
            queda registrado en la auditoría (visible en tu portal, sección "Privacidad y accesos").
          </p>
        </section>

        <section>
          <h2>7. Derechos del Paciente (Ley 20.584)</h2>
          <p>
            Además de los derechos de protección de datos (ARCO), la Ley 20.584 te garantiza como
            paciente:
          </p>
          <ul>
            <li>Derecho a una atención oportuna, digna y sin discriminación.</li>
            <li>
              Derecho a recibir información clara, veraz y suficiente sobre tu estado de salud.
            </li>
            <li>Derecho a consentimiento informado previo a cualquier procedimiento.</li>
            <li>Derecho a la confidencialidad de tu información médica.</li>
            <li>Derecho a elegir libremente al profesional y establecimiento de salud.</li>
            <li>Derecho a una segunda opinión médica.</li>
            <li>Derecho a ser tratado con respeto a tu voluntad, creencias y valores.</li>
            <li>Derecho a presentar reclamos y sugerencias.</li>
          </ul>
        </section>

        <section>
          <h2>8. Protección al Consumidor (Ley 19.496)</h2>
          <p>
            Como usuario del portal, gozas de los derechos que consagra la{' '}
            <strong>Ley 19.496</strong> sobre protección de los derechos de los consumidores,
            incluyendo: información veraz y oportuna, seguridad en el servicio, indemnización por
            daños, derecho a retracto (cuando aplique), y prohibición de cláusulas abusivas en los
            términos de uso.
          </p>
          <p>
            El SERNAC (Servicio Nacional del Consumidor) es la autoridad fiscalizadora. Puedes
            presentar reclamos en{' '}
            <a
              href="https://www.sernac.cl"
              className="text-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              www.sernac.cl
            </a>
            .
          </p>
        </section>

        <section>
          <h2>9. Legislación Aplicable y Jurisdicción</h2>
          <p>
            Este Aviso Legal y el uso del portal se rigen por las leyes de la{' '}
            <strong>República de Chile</strong>. Cualquier controversia se someterá a los tribunales
            ordinarios de justicia de <strong>Santiago de Chile</strong>, renunciando las partes a
            cualquier otro fuero que pudiera corresponderles.
          </p>
        </section>

        <section>
          <h2>10. Modificaciones</h2>
          <p>
            AicoreMed podrá modificar este Aviso Legal en cualquier momento. Las modificaciones se
            publicarán en el portal con al menos 15 días de antelación a su entrada en vigor. El uso
            continuado del portal implica la aceptación de los nuevos términos.
          </p>
        </section>

        <section>
          <h2>11. Contacto</h2>
          <div className="bg-muted/50 rounded-lg p-4 mt-2 text-sm">
            <p>
              <strong>Aicore SpA</strong>
            </p>
            <p>
              Email:{' '}
              <a href="mailto:info@aicorebots.com" className="text-primary hover:underline">
                info@aicorebots.com
              </a>
            </p>
            <p>
              Web:{' '}
              <a
                href="https://aicorebots.com"
                className="text-primary hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                aicorebots.com
              </a>
            </p>
            <p>
              WhatsApp:{' '}
              <a
                href="https://wa.me/56975680702"
                className="text-primary hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                +56 9 7568 0702
              </a>
            </p>
            <p>Dirección: Viña del Mar, Región de Valparaíso, Chile</p>
          </div>
        </section>
      </>
    ),
  },
  {
    id: 'terminos',
    title: 'Términos y Condiciones de Uso',
    shortTitle: 'Términos',
    icon: Gavel,
    description: 'Reglas de uso del portal del paciente, derechos y obligaciones',
    lastUpdated: 'Agosto 2026',
    content: (
      <>
        <section>
          <h2>1. Aceptación de los Términos</h2>
          <p>
            Al acceder y utilizar el <strong>Portal del Paciente de AicoreMed</strong>, aceptas
            estar sujeto a estos Términos y Condiciones de Uso, a la{' '}
            <a href="#privacidad" className="text-primary hover:underline">
              Política de Privacidad
            </a>{' '}
            y al{' '}
            <a href="#aviso-legal" className="text-primary hover:underline">
              Aviso Legal
            </a>
            , que forman parte integrante de este acuerdo. Si no estás de acuerdo, no debes utilizar
            el portal.
          </p>
        </section>

        <section>
          <h2>2. Descripción del Servicio</h2>
          <p>El portal te permite, como paciente de un consultorio adherido a AicoreMed:</p>
          <ul>
            <li>Agendar, consultar, modificar y cancelar turnos médicos.</li>
            <li>
              Acceder a tu historia clínica digital (diagnósticos, recetas, alergias, antecedentes).
            </li>
            <li>Visualizar y renovar recetas médicas digitales.</li>
            <li>Solicitar y descargar certificados médicos.</li>
            <li>Firmar consentimientos informados digitalmente.</li>
            <li>Ver y descargar órdenes de estudios y exámenes.</li>
            <li>Comunicarte con tu consultorio vía WhatsApp/email (con tu consentimiento).</li>
            <li>Responder encuestas de satisfacción post-consulta.</li>
            <li>Gestionar tus preferencias de notificación y privacidad.</li>
            <li>Ejercer tus derechos ARCO y solicitar portabilidad de tus datos.</li>
          </ul>
        </section>

        <section>
          <h2>3. Registro, Cuenta y Acceso</h2>
          <ul>
            <li>
              El acceso se realiza mediante{' '}
              <strong>magic link enviado a tu WhatsApp o email registrado</strong> (JWT válido por
              24 horas). No hay contraseñas tradicionales en el portal del paciente.
            </li>
            <li>
              Debes proporcionar información <strong>veraz, exacta y actualizada</strong> al
              registrarte y mantenerla al día.
            </li>
            <li>
              Eres responsable de la seguridad de tu dispositivo y de notificar inmediatamente
              cualquier acceso no autorizado a{' '}
              <a href="mailto:info@aicorebots.com" className="text-primary hover:underline">
                info@aicorebots.com
              </a>
              .
            </li>
            <li>Una persona no puede tener múltiples cuentas activas para el mismo consultorio.</li>
            <li>
              Nos reservamos el derecho de suspender o cerrar cuentas que violen estos términos,
              intenten acceso no autorizado, o pongan en riesgo la seguridad de la plataforma.
            </li>
          </ul>
        </section>

        <section>
          <h2>4. Uso Adecuado y Prohibiciones</h2>
          <p>Te comprometes a NO:</p>
          <ul>
            <li>Compartir tu magic link o permitir que terceros accedan a tu cuenta.</li>
            <li>
              Utilizar el portal para fines ilegales, fraudulentos, o que vulneren derechos de
              terceros.
            </li>
            <li>
              Intentar acceder a datos de otros pacientes, alterar registros médicos, o interferir
              con el funcionamiento de la plataforma.
            </li>
            <li>
              Realizar ingeniería inversa, descompilar, o intentar extraer código fuente o
              algoritmos.
            </li>
            <li>Enviar comunicaciones masivas, spam, o usar el sistema para acoso.</li>
            <li>Suplantar a otro paciente o profesional de la salud.</li>
            <li>
              Utilizar el portal para emergencias médicas (usa el 131 SAMU o acude a urgencia).
            </li>
          </ul>
        </section>

        <section>
          <h2>5. Propiedad Intelectual</h2>
          <p>
            La plataforma, su código, diseño, marcas, logotipos, interfaces y contenido son
            propiedad exclusiva de <strong>Aicore SpA</strong> y están protegidos por leyes de
            propiedad intelectual. Tu uso del portal no te otorga derechos de propiedad sobre los
            mismos, salvo la licencia limitada descrita en el Aviso Legal.
          </p>
          <p>
            Tus datos personales y de salud <strong>siempre te pertenecen a ti</strong>. El
            consultorio es custodio (Responsable del Tratamiento) y AicoreMed es procesador
            (Encargado). Tienes derecho a portabilidad y acceso en cualquier momento.
          </p>
        </section>

        <section>
          <h2>6. Privacidad y Datos Personales</h2>
          <p>
            El tratamiento de tus datos se rige por nuestra{' '}
            <a href="#privacidad" className="text-primary hover:underline">
              Política de Privacidad
            </a>
            , que forma parte integral de estos Términos. Al aceptar estos Términos, confirmas haber
            leído y comprendido la Política de Privacidad.
          </p>
        </section>

        <section>
          <h2>7. Limitación de Responsabilidad</h2>
          <ul>
            <li>
              AicoreMed es una <strong>herramienta tecnológica de apoyo</strong>. No presta
              servicios médicos ni sustituye la relación médico-paciente.
            </li>
            <li>
              No nos hacemos responsables por: decisiones médicas basadas en la información del
              portal; interrupciones del servicio por mantenimiento, fuerza mayor o fallos de
              terceros (Twilio, MercadoPago, Google, proveedores de infraestructura); pérdida de
              datos por causas ajenas a nuestra voluntad (mantenemos backups diarios encriptados);
              errores en datos ingresados por el consultorio o el paciente.
            </li>
            <li>
              Nuestra responsabilidad total, de existir, se limitará al monto pagado por el
              consultorio en los últimos 12 meses (si aplica) o al mínimo legal.
            </li>
          </ul>
        </section>

        <section>
          <h2>8. Suscripción y Facturación (Consultorio)</h2>
          <p>
            El portal del paciente es <strong>gratuito para ti</strong>. Los costos de la plataforma
            los asume el consultorio mediante planes de suscripción (Free, Starter, Professional,
            Business, Enterprise) facturados en CLP a través de MercadoPago (Chile). Si el
            consultorio cancela su plan, tu acceso al portal puede verse afectado según las
            políticas de retención de datos.
          </p>
        </section>

        <section>
          <h2>9. Cancelación, Baja y Eliminación de Datos</h2>
          <ul>
            <li>
              Puedes solicitar la baja de tu cuenta del portal en cualquier momento desde{' '}
              <strong>Perfil → Mis datos → Solicitar eliminación</strong> (requiere revisión manual
              del consultorio).
            </li>
            <li>
              Al dar de baja, los datos se conservan <strong>90 días</strong> (período de gracia
              para reactivación o ejercicio de derechos).
            </li>
            <li>
              Transcurrido ese plazo, los datos personales son{' '}
              <strong>anonimizados irreversiblemente</strong> (WF-09: anonimización post-retención
              automática).
            </li>
            <li>
              Los registros de auditoría y obligaciones legales (historia clínica 10 años, recetas 5
              años) se conservan según la normativa aplicable.
            </li>
            <li>
              Puedes solicitar la exportación completa de tus datos (JSON/PDF) antes de la baja.
            </li>
          </ul>
        </section>

        <section>
          <h2>10. Modificaciones de los Términos</h2>
          <p>
            Nos reservamos el derecho de modificar estos Términos en cualquier momento. Los cambios
            serán notificados a través del portal con al menos{' '}
            <strong>30 días de antelación</strong>. El uso continuado del portal después de la
            notificación constituye aceptación de los nuevos términos. Si no estás de acuerdo,
            puedes solicitar la baja de tu cuenta.
          </p>
        </section>

        <section>
          <h2>11. Legislación Aplicable y Jurisdicción</h2>
          <p>
            Estos Términos se rigen por las leyes de la <strong>República de Chile</strong>, en
            particular: Ley 19.628 (Protección de Vida Privada), Ley 21.719 (Nueva Ley de Datos
            Personales), Ley 20.584 (Derechos y Deberes de los Pacientes), Ley 19.496 (Protección al
            Consumidor), y normativa sanitaria vigente. Cualquier disputa será resuelta ante los
            tribunales de justicia de <strong>Santiago de Chile</strong>.
          </p>
        </section>

        <section>
          <h2>12. Divisibilidad</h2>
          <p>
            Si alguna cláusula de estos Términos fuere declarada nula, inválida o inaplicable por
            autoridad competente, las demás disposiciones permanecerán en pleno vigor y efecto.
          </p>
        </section>

        <section>
          <h2>13. Contacto</h2>
          <div className="bg-muted/50 rounded-lg p-4 mt-2 text-sm">
            <p>
              <strong>Aicore SpA</strong>
            </p>
            <p>
              Email:{' '}
              <a href="mailto:info@aicorebots.com" className="text-primary hover:underline">
                info@aicorebots.com
              </a>
            </p>
            <p>
              Web:{' '}
              <a
                href="https://aicorebots.com"
                className="text-primary hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                aicorebots.com
              </a>
            </p>
            <p>
              WhatsApp:{' '}
              <a
                href="https://wa.me/56975680702"
                className="text-primary hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                +56 9 7568 0702
              </a>
            </p>
            <p>Dirección: Viña del Mar, Región de Valparaíso, Chile</p>
          </div>
        </section>
      </>
    ),
  },
];

/**
 *
 * @param id
 */
export function getDocumentById(id: string): LegalDocument | undefined {
  return legalDocuments.find((doc) => doc.id === id);
}
