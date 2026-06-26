'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Cookie, X, ChevronDown, ChevronUp } from 'lucide-react';

// ─── Tipos ────────────────────────────────────────────────────
export interface CookiePreferences {
  essential: boolean; // Sesión, autenticación, seguridad
  functional: boolean; // Preferencias de UI, sucursal, PWA
  analytics: boolean; // Tracking de uso (no implementado actualmente)
}

const COOKIE_NAME = 'consultorio_cookie_consent';
const DEFAULT_PREFS: CookiePreferences = {
  essential: true,
  functional: false,
  analytics: false,
};

// ─── Helpers ──────────────────────────────────────────────────
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : null;
}

function setCookie(name: string, value: string, days = 365) {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function parsePreferences(raw: string | null): CookiePreferences | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null) {
      return {
        essential: parsed.essential !== false,
        functional: parsed.functional === true,
        analytics: parsed.analytics === true,
      };
    }
  } catch {
    // Si es el formato legacy ('accepted' | 'rejected')
    if (raw === 'accepted') return { essential: true, functional: true, analytics: false };
    if (raw === 'rejected') return { essential: true, functional: false, analytics: false };
  }
  return null;
}

function savePreferences(prefs: CookiePreferences) {
  setCookie(COOKIE_NAME, JSON.stringify(prefs));
}

// ─── Hook público: obtener preferencias de cookies ──────────
export function useCookiePreferences(): CookiePreferences | null {
  const [prefs, setPrefs] = useState<CookiePreferences | null>(null);

  useEffect(() => {
    const raw = getCookie(COOKIE_NAME);
    setPrefs(parsePreferences(raw));
  }, []);

  return prefs;
}

// ─── Hook público: verificar si una categoría está habilitada ─
export function useCookieCategory(category: keyof CookiePreferences): boolean {
  const prefs = useCookiePreferences();
  // Si no hay preferencias guardadas, asumir false (salvo essential)
  if (!prefs) return category === 'essential';
  return prefs[category] === true;
}

// ─── Utilidad para verificar consentimiento desde otros módulos ─
export function getCookieConsent(): CookiePreferences | null {
  if (typeof document === 'undefined') return null;
  const raw = getCookie(COOKIE_NAME);
  return parsePreferences(raw);
}

export function canUseCookieCategory(category: keyof CookiePreferences): boolean {
  const prefs = getCookieConsent();
  if (!prefs) return category === 'essential'; // Denegar hasta que haya consentimiento
  return prefs[category] === true;
}

export function setCookieWithConsent(
  name: string,
  value: string,
  category: keyof CookiePreferences = 'functional',
  days = 365,
): boolean {
  if (!canUseCookieCategory(category)) return false;
  setCookie(name, value, days);
  return true;
}

// ─── Categorías con descripciones visibles ────────────────────
const CATEGORIES: {
  key: keyof CookiePreferences;
  label: string;
  description: string;
  alwaysOn?: boolean;
}[] = [
  {
    key: 'essential',
    label: 'Esenciales',
    description: 'Necesarias para la autenticación, seguridad y funcionamiento básico.',
    alwaysOn: true,
  },
  {
    key: 'functional',
    label: 'Funcionales',
    description:
      'Recuerdan tus preferencias como sucursal activa, estado de instalación PWA y versión del changelog.',
  },
];

// ─── Componente del banner ────────────────────────────────────
export function CookieConsentBanner() {
  const [savedPrefs, setSavedPrefs] = useState<CookiePreferences | null>(null);
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [draft, setDraft] = useState<CookiePreferences>(DEFAULT_PREFS);

  useEffect(() => {
    const raw = getCookie(COOKIE_NAME);
    const prefs = parsePreferences(raw);
    if (prefs) {
      setSavedPrefs(prefs);
      return;
    }
    const timer = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(timer);
  }, []);

  const handleAcceptAll = useCallback(() => {
    const prefs: CookiePreferences = { essential: true, functional: true, analytics: false };
    savePreferences(prefs);
    setSavedPrefs(prefs);
    setVisible(false);
  }, []);

  const handleRejectAll = useCallback(() => {
    const prefs: CookiePreferences = { essential: true, functional: false, analytics: false };
    savePreferences(prefs);
    setSavedPrefs(prefs);
    setVisible(false);
  }, []);

  const handleSaveCustom = useCallback(() => {
    savePreferences(draft);
    setSavedPrefs(draft);
    setVisible(false);
  }, [draft]);

  if (savedPrefs) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80"
        >
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4">
            {/* Main row */}
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="hidden sm:flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Cookie className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">Este sitio utiliza cookies</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Usamos cookies esenciales para el funcionamiento y cookies funcionales para
                    recordar tus preferencias. Podés consultar nuestra{' '}
                    <Link
                      href="/privacidad"
                      className="font-medium underline underline-offset-2 hover:text-primary transition-colors"
                    >
                      Política de Privacidad
                    </Link>{' '}
                    para más información.
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handleAcceptAll}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  Aceptar todas
                </button>
                <button
                  onClick={() => {
                    setDraft({ essential: true, functional: false, analytics: false });
                    setShowDetails(!showDetails);
                  }}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  {showDetails ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  {showDetails ? 'Ocultar configuración' : 'Configurar'}
                </button>
                <button
                  onClick={handleRejectAll}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground px-3 py-2 hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  Solo esenciales
                </button>
              </div>
            </div>

            {/* Detail panel — categorías */}
            <AnimatePresence>
              {showDetails && (
                <motion.div
                  initial={{ maxHeight: 0, opacity: 0 }}
                  animate={{ maxHeight: 2000, opacity: 1 }}
                  exit={{ maxHeight: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="border-t pt-3 space-y-3">
                    {CATEGORIES.map((cat) => (
                      <div key={cat.key} className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          id={`cookie-${cat.key}`}
                          checked={draft[cat.key]}
                          disabled={cat.alwaysOn}
                          onChange={(e) =>
                            setDraft((prev) => ({ ...prev, [cat.key]: e.target.checked }))
                          }
                          className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <div className="flex-1">
                          <label
                            htmlFor={`cookie-${cat.key}`}
                            className="text-sm font-medium cursor-pointer"
                          >
                            {cat.label}
                            {cat.alwaysOn && (
                              <span className="text-xs text-muted-foreground ml-2">
                                (siempre activas)
                              </span>
                            )}
                          </label>
                          <p className="text-xs text-muted-foreground">{cat.description}</p>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-end pt-2">
                      <button
                        onClick={handleSaveCustom}
                        className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
                      >
                        Guardar preferencias
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
