'use client';

import { useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ChevronRight, Bot, Play, MessageCircle, ShieldCheck, Lock, Server } from 'lucide-react';
import { RegistroExpressModal } from '@/components/landing/registro-modal';

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
};

const stagger = {
  animate: {
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const springTransition = {
  type: 'spring' as const,
  duration: 0.6,
  bounce: 0.15,
};

export interface HeroProps {
  badgeText?: string;
  titleNormal?: string;
  titleHighlight?: string;
  subtitle?: string;
  subtitleBold?: string;
  stats?: { value: string; label: string }[];
}

export function Hero({
  badgeText = 'IA local · Sin costos de API · Datos 100% privados',
  titleNormal = 'Gestiona tu consultorio',
  titleHighlight = 'con IA',
  subtitle = 'Turnos, WhatsApp, recetas, reportes y un asistente con IA local.\n              Todo en un solo panel. Sin mensualidades por IA, sin configuraciones complejas.',
  subtitleBold = 'Ahorra hasta 10 horas por semana.',
  stats = [
    { value: '85%', label: 'menos ausentismo' },
    { value: '10h+', label: 'ahorradas/semana' },
    { value: '24/7', label: 'atención con IA' },
  ],
}: HeroProps = {}) {
  const [registroOpen, setRegistroOpen] = useState(false);
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const rotateX = useSpring(mouseX, { stiffness: 100, damping: 30 });
  const rotateY = useSpring(mouseY, { stiffness: 100, damping: 30 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    mouseX.set(y - 0.5);
    mouseY.set(x - 0.5);
  };

  return (
    <section className="relative min-h-[85vh] md:min-h-[90vh] flex items-center overflow-hidden pt-16">
      {/* Animated background orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl animate-orb" />
        <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl animate-orb-2" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/[0.02] blur-3xl animate-orb-3" />
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
              transition={springTransition}
              className="inline-flex items-center gap-2 rounded-full border bg-muted/60 backdrop-blur-sm px-4 py-1.5 text-xs font-medium text-muted-foreground mb-6"
            >
              <Bot className="h-3.5 w-3.5 text-primary" />
              <span className="relative after:absolute after:inset-y-0 after:-right-0.5 after:w-px after:bg-border after:mx-2" />
              {badgeText}
            </motion.div>

            <motion.h1
              variants={fadeUp}
              transition={springTransition}
              className="text-[1.75rem] sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-6"
            >
              {titleNormal}{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-primary/80 to-primary/60">
                {titleHighlight}
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              transition={springTransition}
              className="text-lg sm:text-xl text-muted-foreground leading-relaxed mb-8"
            >
              {subtitle}
              {' '}<span className="font-semibold text-foreground">{subtitleBold}</span>
            </motion.p>

            <motion.div
              variants={fadeUp}
              transition={{ ...springTransition, delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <Button size="lg" className="text-base h-12 px-8 gap-2 shadow-lg shadow-primary/20 shine-effect btn-press" onClick={() => setRegistroOpen(true)}>
                <MessageCircle className="h-4 w-4" />
                Probar gratis
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="text-base h-12 px-8 gap-2 btn-press" onClick={() => {
                document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
              }}>
                <Play className="h-4 w-4" />
                Ver cómo funciona
              </Button>
            </motion.div>

            {/* Trusted stats */}
            <motion.div
              variants={fadeUp}
              transition={{ ...springTransition, delay: 0.3 }}
              className="grid grid-cols-3 gap-6 mt-12 pt-8 border-t"
            >
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + i * 0.1, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="group"
                >
                  <div className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60 group-hover:scale-105 transition-transform duration-200">
                    {stat.value}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Visual side */}
          <motion.div
            variants={fadeUp}
            transition={{ ...springTransition, delay: 0.15 }}
            className="relative hidden lg:block"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => { mouseX.set(0.5); mouseY.set(0.5); }}
          >
            {/* Dashboard screenshot with shadow and border */}
            <motion.div
              className="relative rounded-2xl border border-border/50 shadow-2xl shadow-primary/10 overflow-hidden bg-card hero-dashboard-hover"
              style={{
                rotateX: rotateX,
                rotateY: rotateY,
                transformPerspective: 1000,
              }}
            >
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
            </motion.div>

            {/* Floating badge 1 - WhatsApp */}
            <motion.div
              initial={{ opacity: 0, x: -20, y: 10 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="absolute -bottom-6 -left-8 flex items-center gap-3 rounded-xl border bg-card/95 backdrop-blur-xl px-4 py-3 shadow-lg animate-soft-float"
            >
              <div className="h-10 w-10 rounded-xl bg-green-500/15 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight">WhatsApp Activo</p>
                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">Agendando turnos en tiempo real</p>
              </div>
            </motion.div>

            {/* Floating badge 2 - AI */}
            <motion.div
              initial={{ opacity: 0, x: 20, y: -10 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ delay: 0.8, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="absolute -top-6 -right-8 flex items-center gap-3 rounded-xl border bg-card/95 backdrop-blur-xl px-4 py-3 shadow-lg animate-soft-float-delayed"
            >
              <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight">Asistente IA</p>
                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">Mistral · Local · Sin costos</p>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      {/* Registro exprés modal */}
      <RegistroExpressModal
        open={registroOpen}
        onOpenChange={setRegistroOpen}
      />
    </section>
  );
}
