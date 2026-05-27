'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { CheckCircle2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PLANES_ORDERED } from '@/lib/planes';

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
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

const floatClasses = ['animate-gentle-float', 'animate-gentle-float-2', 'animate-gentle-float-3', 'animate-gentle-float-4'];

export function Pricing() {
  return (
    <section id="pricing" className="relative overflow-hidden scroll-mt-20 border-t">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-transparent pointer-events-none" />

      <div className="container mx-auto px-4 md:px-6 py-20 md:py-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Planes simples, sin sorpresas
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-base">
            Elegí el plan que mejor se adapte a tu consultorio. Todos incluyen IA local sin costos adicionales.
            Cancelá cuando quieras, sin preguntas.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto"
        >
          {PLANES_ORDERED.filter((p) => p.id !== 'free').map((plan, index) => (
            <motion.div
              key={plan.id}
              variants={cardVariants}
              className={`relative rounded-xl border bg-card p-6 grid grid-rows-[auto_1fr_auto] gap-6 card-lift-hover ${
                plan.popular
                  ? 'popular-border-shine popular-ring-pulse z-10'
                  : 'shadow-sm'
              } ${floatClasses[index]}`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20">
                  <span className="inline-flex items-center rounded-full bg-primary px-4 py-1 text-xs font-medium text-primary-foreground shadow-lg shadow-primary/30">
                    ★ Más elegido
                  </span>
                </div>
              )}

              <div>
                <h3 className="text-lg font-semibold">{plan.nombre}</h3>
                <div className="mt-2">
                  <span className="text-3xl font-bold">${plan.precioUSD}</span>
                  <span className="text-sm text-muted-foreground">/mes USD</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  ≈ ${plan.precioCLP.toLocaleString('es-CL')} CLP/mes
                </div>
                <p className="text-xs text-muted-foreground mt-2">{plan.descripcion}</p>
              </div>

              <ul className="space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs">
                    {f.startsWith('Todo lo de') ? (
                      <>
                        <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-primary/10 text-primary text-[10px] font-bold shrink-0 mt-0.5">
                          +
                        </span>
                        <span className="font-medium text-foreground/90">
                          {f} <span className="text-primary text-[10px] font-bold">(incluido)</span>
                        </span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </>
                    )}
                  </li>
                ))}
              </ul>

              <div className="self-end">
                <Button
                  variant={plan.popular ? 'default' : 'outline'}
                  className={`w-full gap-2 btn-press ${plan.popular ? 'shadow-lg shadow-primary/20' : ''}`}
                  asChild
                >
                  <Link href={`/login?callbackUrl=/dashboard/configuracion%3Ftab%3Dsuscripcion%26plan%3D${plan.id}`}>
                    {plan.cta}
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-xs text-muted-foreground mt-8"
        >
          Todos los planes incluyen 14 días de prueba gratis. Sin tarjeta de crédito.
        </motion.p>
      </div>
    </section>
  );
}
