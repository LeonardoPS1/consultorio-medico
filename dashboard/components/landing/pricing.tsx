'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PLANES_ORDERED } from '@/lib/planes';
import { RegistroExpressModal } from '@/components/landing/registro-modal';

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

const floatClasses = [
  'animate-gentle-float',
  'animate-gentle-float-2',
  'animate-gentle-float-3',
  'animate-gentle-float-4',
];

export function Pricing() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | undefined>();

  const handleSubscribe = (planId: string) => {
    setSelectedPlan(planId);
    setModalOpen(true);
  };

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
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Planes simples, sin sorpresas</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-base">
            Elige el plan que mejor se adapte a tu consultorio. Todos incluyen IA local sin costos
            adicionales. Cancela cuando quieras, sin preguntas.
          </p>
        </motion.div>

        {/* Mobile: horizontal swipeable cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          className="space-y-4 md:hidden"
        >
          <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4 scrollbar-none">
            {PLANES_ORDERED.filter((p) => p.id !== 'free').map((plan, index) => (
              <motion.div
                key={plan.id}
                variants={cardVariants}
                className={`snap-center shrink-0 w-[85vw] max-w-[320px] relative rounded-xl border bg-card p-5 flex flex-col gap-5 ${
                  plan.popular
                    ? 'popular-border-shine popular-ring-pulse z-10 border-primary/30 shadow-lg shadow-primary/10'
                    : 'shadow-sm'
                } ${floatClasses[index]}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                    <span className="inline-flex items-center rounded-full bg-primary px-3 py-0.5 text-[11px] font-medium text-primary-foreground shadow-lg shadow-primary/30 whitespace-nowrap">
                      ★ Más elegido
                    </span>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold">{plan.nombre}</h3>
                  </div>
                  <div className="mt-2">
                    <span className="text-2xl font-bold">${plan.precioUSD}</span>
                    <span className="text-xs text-muted-foreground">/mes USD</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                    {plan.descripcion}
                  </p>
                </div>

                <ul className="space-y-2">
                  {plan.features.slice(0, 4).map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                      <span className="text-foreground/80">
                        {f.length > 45 ? f.slice(0, 42) + '...' : f}
                      </span>
                    </li>
                  ))}
                  {plan.features.length > 4 && (
                    <li className="text-[11px] text-muted-foreground font-medium">
                      +{plan.features.length - 4} funcionalidades más
                    </li>
                  )}
                </ul>

                <div className="mt-auto">
                  <Button
                    variant={plan.popular ? 'default' : 'outline'}
                    className={`w-full gap-1.5 btn-press min-h-[48px] text-sm ${
                      plan.popular ? 'shadow-lg shadow-primary/20' : ''
                    }`}
                    onClick={() => handleSubscribe(plan.id)}
                  >
                    {plan.cta}
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
          {/* Scroll indicator dots */}
          <div className="flex justify-center gap-1.5">
            {PLANES_ORDERED.filter((p) => p.id !== 'free').map((_, i) => (
              <div key={i} className="h-1.5 w-1.5 rounded-full bg-primary/30" />
            ))}
          </div>
        </motion.div>

        {/* Desktop grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto"
        >
          {PLANES_ORDERED.filter((p) => p.id !== 'free').map((plan, index) => (
            <motion.div
              key={plan.id}
              variants={cardVariants}
              className={`relative rounded-xl border bg-card p-6 grid grid-rows-[auto_1fr_auto] gap-6 card-lift-hover ${
                plan.popular ? 'popular-border-shine popular-ring-pulse z-10' : 'shadow-sm'
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
                  onClick={() => handleSubscribe(plan.id)}
                >
                  {plan.cta}
                  <ChevronRight className="h-3.5 w-3.5" />
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

      {/* Registro exprés modal */}
      <RegistroExpressModal open={modalOpen} onOpenChange={setModalOpen} planId={selectedPlan} />
    </section>
  );
}
