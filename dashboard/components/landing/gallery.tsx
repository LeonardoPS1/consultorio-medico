'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SCREENSHOTS = [
  { id: 'home', label: 'Panel Principal', src: '/assets/dashboard-real-home.png' },
  { id: 'turnos', label: 'Agenda y Turnos', src: '/assets/dashboard-real-turnos.png' },
  { id: 'pacientes', label: 'Pacientes', src: '/assets/dashboard-real-pacientes.png' },
  { id: 'config', label: 'Configuración', src: '/assets/dashboard-real-configuracion.png' },
  { id: 'reportes', label: 'Reportes', src: '/assets/dashboard-real-reportes.png' },
  { id: 'atencion', label: 'Atención', src: '/assets/dashboard-real-atencion.png' },
  { id: 'recetas', label: 'Recetas', src: '/assets/dashboard-real-recetas.png' },
];

export function Gallery() {
  const [active, setActive] = useState(SCREENSHOTS[0].id);

  return (
    <section className="relative overflow-hidden border-t bg-muted/20">
      <div className="container mx-auto px-4 md:px-6 py-20 md:py-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Explorá el sistema por dentro
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-base">
            Una interfaz intuitiva, moderna y diseñada especialmente para el flujo de trabajo
            de médicos y administradores. 100% real.
          </p>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="flex flex-wrap justify-center gap-1.5 mb-8"
        >
          {SCREENSHOTS.map((s) => (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                active === s.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              }`}
            >
              {s.label}
            </button>
          ))}
        </motion.div>

        {/* Screenshot display */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="relative rounded-xl border bg-card shadow-xl overflow-hidden max-w-5xl mx-auto"
        >
          <div className="absolute top-0 left-0 right-0 h-7 bg-muted/80 border-b flex items-center px-3 gap-1.5 z-10">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
          </div>
          <AnimatePresence mode="wait">
            <motion.img
              key={active}
              src={SCREENSHOTS.find((s) => s.id === active)!.src}
              alt={`Captura de ${SCREENSHOTS.find((s) => s.id === active)!.label}`}
              className="w-full h-auto pt-7"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            />
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
