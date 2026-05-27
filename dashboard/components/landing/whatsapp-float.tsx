'use client';

import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';

export function WhatsAppFloat() {
  return (
    <motion.a
      href="https://wa.me/56975680702?text=Hola%20quiero%20m%C3%A1s%20informaci%C3%B3n%20sobre%20AiCoreMed"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-full bg-green-500 text-white px-5 py-3 shadow-lg shadow-green-500/30 hover:bg-green-600 transition-all duration-200 hover:scale-105 active:scale-95"
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: 1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <MessageCircle className="h-5 w-5" />
      <span className="text-sm font-medium hidden sm:inline">WhatsApp</span>
    </motion.a>
  );
}
