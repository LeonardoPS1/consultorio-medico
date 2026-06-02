'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const FAQS = [
  {
    q: '¿Cómo se integra AiCoreMed con mi agenda actual?',
    a: 'AiCoreMed es un sistema completo que incluye su propia gestión de turnos, pacientes y agenda. No requiere integración con sistemas externos. Si ya usas otro software, podemos migrar tus datos existentes o conectar via API con sistemas como Dentalink, Medilink o Doctoralia mediante nuestros workflows de n8n.',
  },
  {
    q: '¿La IA realmente entiende el contexto de mis pacientes?',
    a: 'Sí. El asistente con Mistral (IA local) se entrena con la información de tu consultorio: horarios, médicos, especialidades, obras sociales aceptadas y más. Cuando un paciente escribe por WhatsApp, la IA entiende el contexto completo: si es paciente nuevo o recurrente, qué médico atiende, y puede agendar, reprogramar o cancelar turnos sin intervención humana.',
  },
  {
    q: '¿Es seguro? ¿Dónde se almacenan los datos médicos?',
    a: 'Todos los datos se almacenan en tu propia base de datos PostgreSQL en tu VPS. La IA corre localmente con Ollama, sin enviar datos a servicios externos. Además contás con autenticación 2FA, rate limiting, auditoría de accesos, backup encriptado automático y cumplimiento de normativas de salud.',
  },
  {
    q: '¿Qué pasa si un paciente cancela a último momento?',
    a: 'Cuando un paciente cancela por WhatsApp, la IA detecta la cancelación al instante, libera el turno en la agenda y automáticamente contacta a pacientes en lista de espera para ofrecerles esa hora disponible. Esto reduce las horas muertas en tu consultorio a casi cero.',
  },
  {
    q: '¿Necesito conocimientos técnicos para usarlo?',
    a: 'No. AiCoreMed está diseñado para médicos, no para programadores. La configuración inicial la hacemos nosotros. Después, todo se maneja desde un dashboard intuitivo. El asistente IA, los recordatorios por WhatsApp y las automatizaciones funcionan solas desde el día uno.',
  },
  {
    q: '¿Puedo probarlo antes de pagar?',
    a: 'Sí. Todos los planes incluyen 14 días de prueba gratis sin tarjeta de crédito. Configuras tu consultorio en minutos y empieza a probar todas las funcionalidades. Si no te convence, cancelas sin compromiso.',
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (i: number) => setOpenIndex(openIndex === i ? null : i);

  return (
    <section id="faq" className="relative overflow-hidden scroll-mt-20 border-t">
      <div className="container mx-auto px-4 md:px-6 py-20 md:py-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Preguntas Frecuentes
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-base">
            Todo lo que necesitas saber antes de empezar. Si tienes otra consulta,
            escribinos por WhatsApp.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="max-w-3xl mx-auto space-y-2"
        >
          {FAQS.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04, duration: 0.3, ease: [0.16, 1, 0.3, 1] as const }}
              className={`rounded-xl border bg-card overflow-hidden transition-all duration-300 card-glow-hover ${
                openIndex === i ? 'shadow-sm border-primary/20' : ''
              }`}
            >
              <button
                onClick={() => toggle(i)}
                className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left text-sm font-medium transition-colors duration-200 hover:bg-muted/30"
                aria-expanded={openIndex === i}
              >
                <span className={openIndex === i ? 'text-foreground' : ''}>{faq.q}</span>
                <motion.div
                  animate={{ rotate: openIndex === i ? 180 : 0 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                >
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                </motion.div>
              </button>
              <AnimatePresence>
                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] as const }}
                    className="overflow-hidden"
                  >
                    <p className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">
                      {faq.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
