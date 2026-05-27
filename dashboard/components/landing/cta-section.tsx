'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronRight, MessageCircle } from 'lucide-react';

export function CTASection() {
  return (
    <section className="relative overflow-hidden border-t">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-primary/[0.02] to-transparent pointer-events-none" />

      <div className="container mx-auto px-4 md:px-6 py-16 md:py-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-2xl mx-auto"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            ¿Listo para transformar tu consultorio?
          </h2>
          <p className="text-muted-foreground text-base mb-8">
            Empezá hoy. En 5 minutos tenés todo configurado. Sin compromisos, sin tarjeta.
            <br />
            <span className="font-medium text-foreground">14 días de prueba gratis.</span>
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-base h-12 px-8 gap-2 shadow-lg shadow-primary/20" asChild>
              <Link href="/login?callbackUrl=/dashboard/configuracion%3Ftab%3Dsuscripcion">
                <MessageCircle className="h-4 w-4" />
                Comenzar prueba gratis
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="text-base h-12 px-8 gap-2" asChild>
              <a href="https://wa.me/56975680702?text=Hola%20quiero%20m%C3%A1s%20informaci%C3%B3n" target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4" />
                Hablar con ventas
              </a>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
