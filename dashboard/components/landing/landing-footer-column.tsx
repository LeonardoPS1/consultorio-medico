'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ExternalLink, MessageCircle, Mail } from 'lucide-react';
import Link from 'next/link';

type FooterLink = {
  label: string;
  href: string;
  external?: boolean;
};

export function FooterColumn({
  section,
  defaultOpen = true,
}: {
  section: { label: string; links: FooterLink[] };
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:cursor-default flex items-center justify-between w-full md:w-auto group"
        aria-expanded={isOpen}
      >
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 group-hover:text-foreground transition-colors">
          {section.label}
        </h4>
        <ChevronDown
          className={`h-3.5 w-3.5 text-muted-foreground/40 transition-transform duration-200 md:hidden ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      <motion.ul
        initial={false}
        animate={{
          height: isOpen ? 'auto' : 0,
          opacity: isOpen ? 1 : 0,
        }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-1 overflow-hidden md:!h-auto md:!opacity-100 mt-3 md:mt-3"
      >
        {section.links.map((link) => {
          const Icon = link.href.startsWith('https://wa.me')
            ? MessageCircle
            : link.href.startsWith('mailto:')
              ? Mail
              : link.external
                ? ExternalLink
                : undefined;
          return (
            <li key={link.label}>
              {link.external || link.href.startsWith('mailto:') || link.href.startsWith('https://wa') ? (
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-link text-muted-foreground/70 hover:text-foreground transition-colors inline-flex items-center gap-1.5 py-2 md:py-1 min-h-[44px] md:min-h-0 w-full md:w-auto text-sm"
                >
                  {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
                  {link.label}
                  {link.href.startsWith('http') && !link.href.includes('wa.me') && !link.href.includes('aicorebots.com/') ? (
                    <ExternalLink className="h-2.5 w-2.5 shrink-0 opacity-40" />
                  ) : null}
                </a>
              ) : link.href.startsWith('#') ? (
                <a
                  href={link.href}
                  className="footer-link text-muted-foreground/70 hover:text-foreground transition-colors inline-flex items-center gap-1.5 py-2 md:py-1 min-h-[44px] md:min-h-0 w-full md:w-auto text-sm"
                >
                  {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
                  {link.label}
                </a>
              ) : (
                <Link
                  href={link.href}
                  className="footer-link text-muted-foreground/70 hover:text-foreground transition-colors inline-flex items-center gap-1.5 py-2 md:py-1 min-h-[44px] md:min-h-0 w-full md:w-auto text-sm"
                >
                  {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
                  {link.label}
                </Link>
              )}
            </li>
          );
        })}
      </motion.ul>
    </motion.div>
  );
}
