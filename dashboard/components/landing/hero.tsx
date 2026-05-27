'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronRight, Bot, Play, MessageCircle } from 'lucide-react';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const stagger = {
  animate: {
    transition: { staggerChildren: 0.1, delayChildren: 0.15 },
  },
};

export function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden pt-16">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/[0.02] blur-3xl" />
      </div>

      <div className="container mx-auto px-4 md:px-6 py-12 md:py-20">
        <motion.div
          initial="initial"
          animate="animate"
          variants={stagger}
          className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center"
        >
          {/* Text side */}
          <div className="max-w-xl">
            <motion.div
              variants={fadeUp}
              className="inline-flex items-center gap-2 rounded-full border bg-muted/60 backdrop-blur-sm px-4 py-1.5 text-xs font-medium text-muted-foreground mb-6"
            >
              <Bot className="h-3.5 w-3.5 text-primary" />
              IA local · Sin costos de API · Datos 100% privados
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-6"
            >
              Gestioná tu consultorio{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-primary/80 to-primary/60">
                con IA
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="text-lg sm:text-xl text-muted-foreground leading-relaxed mb-8"
            >
              Turnos, WhatsApp, recetas, reportes y un asistente con IA local.
              Todo en un solo panel. Sin mensualidades por IA, sin configuraciones complejas.
              {' '}<span className="font-semibold text-foreground">Ahorrá hasta 10 horas por semana.</span>
            </motion.p>

            <motion.div
              variants={fadeUp}
              className="flex flex-col sm:flex-row gap-3"
            >
              <Button size="lg" className="text-base h-12 px-8 gap-2 shadow-lg shadow-primary/20" asChild>
                <Link href="/login?callbackUrl=/dashboard/configuracion%3Ftab%3Dsuscripcion">
                  <MessageCircle className="h-4 w-4" />
                  Probar gratis
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-base h-12 px-8 gap-2" onClick={() => {
                document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
              }}>
                <Play className="h-4 w-4" />
                Ver cómo funciona
              </Button>
            </motion.div>

            {/* Trusted stats */}
            <motion.div
              variants={fadeUp}
              className="grid grid-cols-3 gap-6 mt-12 pt-8 border-t"
            >
              {[
                { value: '85%', label: 'menos ausentismo' },
                { value: '10h+', label: 'ahorradas/semana' },
                { value: '24/7', label: 'atención con IA' },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
                    {stat.value}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Visual side */}
          <motion.div
            variants={fadeUp}
            className="relative hidden lg:block"
          >
            {/* Dashboard screenshot with shadow and border */}
            <div className="relative rounded-2xl border border-border/50 shadow-2xl shadow-primary/10 overflow-hidden bg-card">
              <div className="absolute top-0 left-0 right-0 h-6 bg-muted/80 border-b flex items-center px-3 gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
              </div>
              <img
                src="/assets/dashboard-real-home.png"
                alt="Panel principal de AiCoreMed"
                className="w-full h-auto"
                loading="eager"
              />
            </div>

            {/* Floating badge 1 - WhatsApp */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="absolute -bottom-4 -left-6 flex items-center gap-3 rounded-xl border bg-card/95 backdrop-blur-xl px-4 py-3 shadow-lg"
            >
              <div className="h-9 w-9 rounded-lg bg-green-500/15 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs font-semibold">WhatsApp Activo</p>
                <p className="text-[10px] text-muted-foreground">Agendando turnos en tiempo real</p>
              </div>
            </motion.div>

            {/* Floating badge 2 - AI */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="absolute -top-4 -right-6 flex items-center gap-3 rounded-xl border bg-card/95 backdrop-blur-xl px-4 py-3 shadow-lg"
            >
              <div className="h-9 w-9 rounded-lg bg-primary/15 flex items-center justify-center">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold">Asistente IA</p>
                <p className="text-[10px] text-muted-foreground">Mistral · Local · Sin costos</p>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
