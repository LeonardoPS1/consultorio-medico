'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Bot, MessageCircle, PhoneCall, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SPECIALTIES = [
  {
    id: 'clinica',
    label: 'Clínicas Médicas',
    icon: '🏥',
    title: 'IA para Centros Médicos y Clínicas',
    description: 'Optimizá la recepción de pacientes con triaje inicial de síntomas, agendamiento inteligente al especialista indicado y gestión automática de cancelaciones para cubrir sobrecupos.',
    benefits: [
      'Direccionamiento inteligente al especialista (Cardiólogo, Pediatra, etc.)',
      'Redistribución automática de turnos liberados de última hora',
      'Respuestas inmediatas sobre obras sociales y convenios',
      'Recordatorios multicanal (WhatsApp + llamada IA)',
    ],
    caseUse: {
      title: 'Gestión de Cancelación',
      desc: 'Un paciente cancela su turno por WhatsApp. La IA detecta la cancelación, libera el cupo al instante y contacta automáticamente a pacientes en lista de espera para ofrecerles esa hora disponible.',
      clinic: 'Centro Médico Cordillera',
    },
  },
  {
    id: 'odontologia',
    label: 'Odontología',
    icon: '🦷',
    title: 'IA para Clínicas Dentales',
    description: 'Automatizá recordatorios de ortodoncia, agendá limpiezas periódicas de control y gestioná urgencias dentales al instante con respuestas inteligentes.',
    benefits: [
      'Confirmación activa de citas de control semestrales',
      'Filtro y agendamiento prioritario para urgencias de dolor dental',
      'Instrucciones pre y postoperatorias automatizadas',
      'Reagendamiento proactivo de controles periódicos',
    ],
    caseUse: {
      title: 'Paciente de Ortodoncia',
      desc: 'La IA detecta que el paciente no ha asistido a su control mensual. Le envía un WhatsApp ofreciendo horarios disponibles. Si no responde en 48h, el agente de voz realiza una llamada automática.',
      clinic: 'OdontoSana Clínicas',
    },
  },
  {
    id: 'oftalmologia',
    label: 'Oftalmología',
    icon: '👁️',
    title: 'IA para Centros Oftalmológicos',
    description: 'Optimizá la preparación de pacientes para exámenes de fondo de ojo o cirugías refractivas y respondé dudas postoperatorias comunes al instante.',
    benefits: [
      'Instrucciones de preparación (dilatación de pupilas, no conducir)',
      'Recordatorio periódico para renovación de recetas de lentes',
      'Seguimiento automatizado post-cirugía láser',
      'FAQ interactiva sobre procedimientos oftalmológicos',
    ],
    caseUse: {
      title: 'Preparación de Examen',
      desc: 'Un día antes de su consulta de retina, la IA envía las indicaciones: "Estimado, recuerde que para su examen se dilatarán sus pupilas, le sugerimos venir acompañado y no conducir".',
      clinic: 'Visión Sana',
    },
  },
  {
    id: 'estetica',
    label: 'Estética y Belleza',
    icon: '✨',
    title: 'IA para Clínicas Estéticas',
    description: 'Capturá y convertí leads de Instagram/Facebook al instante. Agendá evaluaciones gratuitas y hacé seguimiento automático de retoques periódicos.',
    benefits: [
      'Captura instantánea de leads desde redes sociales',
      'Agendamiento automatizado de citas de valoración sin costo',
      'Recontacto automático para retoques periódicos',
      'Cupones y ofertas personalizadas por WhatsApp',
    ],
    caseUse: {
      title: 'Conversión desde Campaña',
      desc: 'Un lead escribe por Instagram "precio de depilación láser". La IA responde con la oferta, le envía un cupón del 20% y mediante un link interactivo lo agenda para su primera sesión de evaluación.',
      clinic: 'Aura Estética',
    },
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export function Specialties() {
  const [active, setActive] = useState(SPECIALTIES[0].id);
  const current = SPECIALTIES.find((s) => s.id === active)!;

  return (
    <section id="specialties" className="relative overflow-hidden scroll-mt-20 border-t">
      <div className="container mx-auto px-4 md:px-6 py-20 md:py-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Soluciones para cada especialidad
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-base">
            Adaptamos los agentes de IA y los flujos de automatización a las necesidades
            específicas de cada nicho médico.
          </p>
        </motion.div>

        {/* Specialty tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="flex flex-wrap justify-center gap-2 mb-12"
        >
          {SPECIALTIES.map((s) => (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              className={`relative px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 btn-press ${
                active === s.id
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-105'
                  : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted hover:scale-105'
              }`}
            >
              <motion.span
                className="inline-block mr-1.5"
                animate={{ scale: active === s.id ? [1, 1.3, 1] : 1 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              >
                {s.icon}
              </motion.span>
              {s.label}
            </button>
          ))}
        </motion.div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto"
          >
            {/* Details */}
            <div className="space-y-6">
              <h3 className="text-xl font-semibold">{current.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {current.description}
              </p>
              <ul className="space-y-3">
                {current.benefits.map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <Button variant="outline" size="sm" className="gap-2" asChild>
                <a href={`https://wa.me/56975680702?text=Hola%20quiero%20informaci%C3%B3n%20para%20${encodeURIComponent(current.label)}`} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4" />
                  Consultar para {current.label}
                </a>
              </Button>
            </div>

            {/* Case use card */}
            <div className="relative rounded-xl border bg-card/60 backdrop-blur-sm overflow-hidden hover:shadow-lg hover:border-primary/20 transition-all duration-300">
              <div className="bg-muted/50 px-5 py-3 border-b flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <motion.span
                    className="w-2 h-2 rounded-full bg-green-500"
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  Simulación de Caso Real
                </div>
                <span className="text-xs text-muted-foreground">{current.caseUse.clinic}</span>
              </div>
              <div className="p-5 space-y-2">
                <h4 className="text-sm font-semibold">{current.caseUse.title}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {current.caseUse.desc}
                </p>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-card/80 to-transparent pointer-events-none" />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
