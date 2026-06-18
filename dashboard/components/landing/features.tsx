'use client';

import { motion } from 'framer-motion';
import { Calendar, MessageSquare, Syringe, BarChart3, Bot, Smartphone, Shield, Users, ChevronRight, Video } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export interface FeatureItem {
  icon: LucideIcon;
  title: string;
  desc: string;
}

export interface FeaturesProps {
  title?: string;
  subtitle?: string;
  features?: FeatureItem[];
}

const defaultFeatures: FeatureItem[] = [
  {
    icon: Calendar,
    title: 'Gestión de Turnos',
    desc: 'Calendario interactivo con vista Kanban de atención. Programá, reprogramá y gestioná pacientes en tiempo real. Filtrá por médico, especialidad y sucursal.',
  },
  {
    icon: MessageSquare,
    title: 'WhatsApp Integrado',
    desc: 'Tus pacientes te escriben por WhatsApp y la IA responde al instante. Agenda turnos, consulta recetas y resuelve dudas sin intervención humana.',
  },
  {
    icon: Bot,
    title: 'Asistente IA Local',
    desc: 'Asistente con Ollama + Mistral que entiende el contexto de cada paciente. Sin costos de API externas, sin enviar datos a la nube. Privacidad total.',
  },
  {
    icon: Syringe,
    title: 'Recetas Digitales',
    desc: 'Creá, gestioná y enviá recetas por WhatsApp automáticamente. Con historial de recetas activas y vencidas por paciente. Portal público de verificación.',
  },
  {
    icon: BarChart3,
    title: 'Reportes Analíticos',
    desc: 'Dashboard con KPIs en tiempo real, gráficos interactivos, comparativas mensuales y exportación a Excel o PDF. Datos que ayudan a decidir.',
  },
  {
    icon: Users,
    title: 'Pacientes + Historial Clínico',
    desc: 'Ficha completa con datos de contacto, sistema de salud (FONASA/Isapre), notas médicas e historial clínico con CIE-10. Todo sincronizado y accesible desde cualquier dispositivo.',
  },
  {
    icon: Video,
    title: 'Telemedicina en Vivo',
    desc: 'Videoconsultas integradas con LiveKit. Creá turnos virtuales, el link se genera automáticamente y el paciente lo recibe por WhatsApp. Sin descargas ni instalaciones.',
  },
  {
    icon: Shield,
    title: 'Seguridad y Auditoría',
    desc: 'Autenticación 2FA, rate limiting, registro de accesos, contraseñas seguras y backup encriptado automático. Cumplimiento de normativas de salud.',
  },
  {
    icon: Smartphone,
    title: 'App Instalable (PWA)',
    desc: 'Instala AiCoreMed como app en tu teléfono o escritorio. Notificaciones push, funcionamiento offline parcial y acceso rápido desde cualquier lugar.',
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export function Features({
  title = 'Todo lo que necesitas en un solo lugar',
  subtitle = 'Desde la gestión de turnos hasta reportes avanzados, pasando por WhatsApp con IA local. Todo integrado, sin depender de servicios externos.',
  features: customFeatures,
}: FeaturesProps = {}) {
  const items = customFeatures ?? defaultFeatures;

  return (
    <section id="features" className="relative overflow-hidden scroll-mt-20">
      <div className="absolute inset-0 bg-gradient-to-b from-muted/30 to-transparent pointer-events-none" />

      <div className="container mx-auto px-4 md:px-6 py-20 md:py-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {title}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-base">
            {subtitle}
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5"
        >
          {items.map((feature) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                variants={cardVariants}
                className="group relative rounded-xl border bg-card p-6 card-glow-hover"
              >
                {/* Gradient overlay on hover */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4 feature-icon-morph">
                  <Icon className="h-5.5 w-5.5 text-primary" />
                </div>
                <h3 className="font-semibold text-sm mb-2 group-hover:text-primary transition-colors duration-200">{feature.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{feature.desc}</p>
              </motion.div>
            );
          })}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mt-10"
        >
          <Button variant="outline" className="gap-2 btn-press" asChild>
            <Link href="/login?callbackUrl=/dashboard/configuracion%3Ftab%3Dsuscripcion">
              Ver todas las funcionalidades
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
