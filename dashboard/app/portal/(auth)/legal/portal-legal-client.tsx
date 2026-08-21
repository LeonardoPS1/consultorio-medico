'use client';

import { ChevronRight, ChevronLeft, Scale, Shield, AlertCircle, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { PortalBadge } from '@/components/portal/portal-badge';
import { PortalCard } from '@/components/portal/portal-card';
import { legalDocuments } from './legal-content';

/**
 *
 */
export default function PortalLegalClient() {
  const [activeTab, setActiveTab] = useState<string>('privacidad');
  const [mobileTabIndex, setMobileTabIndex] = useState(0);

  const currentDoc = legalDocuments.find((d) => d.id === activeTab) ?? legalDocuments[0];

  const handleTabChange = (id: string) => {
    setActiveTab(id);
    const index = legalDocuments.findIndex((d) => d.id === id);
    if (index !== -1) setMobileTabIndex(index);
  };

  const handleMobileSwipe = (direction: 'left' | 'right') => {
    const currentIndex = legalDocuments.findIndex((d) => d.id === activeTab);
    let newIndex = currentIndex;
    if (direction === 'left' && currentIndex < legalDocuments.length - 1)
      newIndex = currentIndex + 1;
    if (direction === 'right' && currentIndex > 0) newIndex = currentIndex - 1;
    if (newIndex !== currentIndex) {
      handleTabChange(legalDocuments[newIndex].id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PortalCard className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-10 h-10 bg-[#2563EB] rounded-xl flex items-center justify-center shadow-sm">
            <Scale className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-portal-fg">
              Legal y Cumplimiento
            </h1>
            <p className="text-sm text-portal-muted-fg mt-0.5">
              Políticas legales, privacidad y términos de uso del Portal del Paciente AicoreMed
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap text-sm">
          <PortalBadge variant="teal">Ley 19.628</PortalBadge>
          <PortalBadge variant="teal">Ley 21.719</PortalBadge>
          <PortalBadge variant="teal">Ley 20.584</PortalBadge>
          <PortalBadge variant="teal">Ley 19.496</PortalBadge>
          <PortalBadge variant="primary">AicoreMed</PortalBadge>
        </div>
      </PortalCard>

      {/* Desktop Tabs */}
      <div className="hidden md:flex gap-2">
        {legalDocuments.map((doc, _index) => (
          <button
            key={doc.id}
            onClick={() => handleTabChange(doc.id)}
            className={`
              flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
              ${
                activeTab === doc.id
                  ? 'bg-[#2563EB] text-white shadow-md'
                  : 'bg-portal-muted/50 text-portal-muted-fg hover:bg-portal-muted hover:text-portal-fg'
              }
            `}
            aria-current={activeTab === doc.id ? 'page' : undefined}
          >
            <doc.icon className="h-4 w-4" />
            <span>{doc.shortTitle}</span>
          </button>
        ))}
      </div>

      {/* Mobile Tab Navigation */}
      <div className="md:hidden">
        <div className="relative overflow-hidden rounded-xl bg-portal-muted/50 p-1">
          <div className="flex gap-1">
            {legalDocuments.map((doc, _index) => (
              <button
                key={doc.id}
                onClick={() => handleTabChange(doc.id)}
                className={`
                  flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 whitespace-nowrap
                  ${
                    activeTab === doc.id
                      ? 'bg-[#2563EB] text-white shadow-sm'
                      : 'text-portal-muted-fg hover:text-portal-fg'
                  }
                `}
              >
                <doc.icon className="h-3.5 w-3.5" />
                <span>{doc.shortTitle}</span>
              </button>
            ))}
          </div>
        </div>
        {/* Swipe indicator */}
        <div className="flex items-center justify-center gap-1 mt-2 text-xs text-portal-muted-fg">
          <ChevronLeft className="h-4 w-4" onClick={() => handleMobileSwipe('right')} />
          <span>
            {mobileTabIndex + 1} / {legalDocuments.length}
          </span>
          <ChevronRight className="h-4 w-4" onClick={() => handleMobileSwipe('left')} />
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-4"
        >
          {/* Document Header */}
          <PortalCard className="p-5 border-l-4 border-[#2563EB] bg-blue-50/50 dark:bg-blue-950/20">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-[#2563EB]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <currentDoc.icon className="h-5 w-5 text-[#2563EB]" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-semibold text-portal-fg">{currentDoc.title}</h2>
                <p className="text-sm text-portal-muted-fg mt-1">{currentDoc.description}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-portal-muted-fg">
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    Actualizada: <span className="font-medium">{currentDoc.lastUpdated}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    Cumple legislación chilena
                  </span>
                </div>
              </div>
            </div>
          </PortalCard>

          {/* Document Content */}
          <PortalCard className="p-5 md:p-7 prose prose-sm dark:prose-invert max-w-none">
            <div className="space-y-8" style={{ lineHeight: '1.7' }}>
              {currentDoc.content}
            </div>

            {/* Bottom navigation between docs */}
            <div className="pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm text-portal-muted-fg">
                <span>Documentos:</span>
                {legalDocuments.map((doc, _index) => (
                  <span
                    key={doc.id}
                    className={`
                      px-2 py-1 rounded text-xs font-medium transition-colors
                      ${
                        activeTab === doc.id
                          ? 'bg-[#2563EB] text-white'
                          : 'bg-portal-muted text-portal-muted-fg hover:bg-portal-muted/80 cursor-pointer'
                      }
                    `}
                    onClick={() => activeTab !== doc.id && handleTabChange(doc.id)}
                  >
                    {doc.shortTitle}
                  </span>
                ))}
              </div>
            </div>
          </PortalCard>

          {/* Footer notice */}
          <PortalCard className="p-4 bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800 dark:text-amber-200">
                <p className="font-medium mb-1">Información importante</p>
                <p>
                  Este documento tiene carácter informativo y no constituye asesoría legal. Para
                  consultas específicas sobre tus derechos, contacta a nuestro DPO en{' '}
                  <a href="mailto:dpo@aicorebots.com" className="underline hover:text-amber-700">
                    dpo@aicorebots.com
                  </a>
                  o a tu consultorio médico (Responsable del Tratamiento).
                </p>
                <p className="mt-2">
                  En caso de emergencia médica, <strong>no uses este portal</strong>. Acude a un
                  servicio de urgencia o llama al <strong>131 (SAMU)</strong>.
                </p>
              </div>
            </div>
          </PortalCard>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
