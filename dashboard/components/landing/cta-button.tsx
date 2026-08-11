'use client';

import { ChevronRight, MessageCircle } from 'lucide-react';
import { useState } from 'react';
import { RegistroExpressModal } from '@/components/landing/registro-modal';
import { Button } from '@/components/ui/button';

/**
 *
 */
export function CTASectionButton() {
  const [registroOpen, setRegistroOpen] = useState(false);

  return (
    <>
      <Button
        size="lg"
        className="text-base h-12 px-8 gap-2 shadow-lg shadow-primary/20 btn-press cta-glow-hover"
        onClick={() => setRegistroOpen(true)}
      >
        <MessageCircle className="h-4 w-4" />
        Comenzar prueba gratis
        <ChevronRight className="ml-1 h-4 w-4" />
      </Button>

      <RegistroExpressModal open={registroOpen} onOpenChange={setRegistroOpen} />
    </>
  );
}
