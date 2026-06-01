'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ChevronRight, MessageCircle, Sparkles, ShieldCheck, Lock, Server } from 'lucide-react';
import { RegistroExpressModal } from '@/components/landing/registro-modal';

export function CTASection() {
  const [registroOpen, setRegistroOpen] = useState(false);
  return (
    <section className="relative overflow-hidden border-t">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-primary/[0.02] to-transparent pointer-events-none" />

      {/* Animated background orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[400px] h-[400px] rounded-full bg-primary/5 blur-3xl animate-orb" />
        <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full bg-primary/5 blur-3xl animate-orb-2" />
      </div>

      {/* Security badge — absolute on md+, in-flow on mobile */}
      <div className="relative md:absolute inset-x-0 top-12 md:top-16 flex justify-center pointer-events-none pb-4 md:pb-0">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-primary/70 text-xs sm:text-sm px-4"
        >
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5" /> Datos 100% protegidos</span>
          <span className="inline-flex items-center gap-1.5"><Lock className="h-4 w-4 sm:h-5 sm:w-5" /> IA 100% local</span>
          <span className="inline-flex items-center gap-1.5"><Server className="h-4 w-4 sm:h-5 sm:w-5" /> Servidor propio en Chile</span>
        </motion.div>
      </div>

      <div className="container mx-auto px-4 md:px-6 py-16 md:py-24 text-center relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-2xl mx-auto"
        >
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, type: 'spring', duration: 0.5, bounce: 0.2 }}
            className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-4 py-1.5 text-xs font-medium mb-6"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Sin tarjeta de crédito · Sin compromisos
          </motion.div>

          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            ¿Listo para transformar tu consultorio?
          </h2>
          <p className="text-muted-foreground text-base mb-8">
            Empezá hoy. En 5 minutos tenés todo configurado. Sin compromisos, sin tarjeta.
            <br />
            <span className="font-medium text-foreground">14 días de prueba gratis.</span>
          </p>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button size="lg" className="text-base h-12 px-8 gap-2 shadow-lg shadow-primary/20 btn-press cta-glow-hover" onClick={() => setRegistroOpen(true)}>
              <MessageCircle className="h-4 w-4" />
              Comenzar prueba gratis
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="text-base h-12 px-8 gap-2 btn-press" asChild>
              <a href="https://wa.me/56975680702?text=Hola%20quiero%20m%C3%A1s%20informaci%C3%B3n" target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4" />
                Hablar con ventas
              </a>
            </Button>
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
