'use client';

interface LogoProps {
  className?: string;
  showTagline?: boolean;
}

/**
 * Componente Logo inline SVG de AiCoreMed.
 * Reemplaza la carga externa de /aicoremed_dark_1200.svg para evitar requests HTTP adicionales.
 */
export function Logo({ className, showTagline = false }: LogoProps) {
  return (
    <svg
      width="1200"
      height="1200"
      viewBox="0 0 1200 1200"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="AiCoreMed"
    >
      <defs>
        <clipPath id="sq-dark">
          <rect x="100" y="100" width="1000" height="1000" rx="80" />
        </clipPath>
      </defs>
      {/* Fondo oscuro */}
      <rect x="100" y="100" width="1000" height="1000" rx="80" fill="#0C1E30" />
      {/* Pulso ECG */}
      <g clipPath="url(#sq-dark)">
        <polyline
          points="150,600 440,600 456,578 472,622 484,560 498,640 510,582 522,610 534,600 630,600 720,600 748,490 776,710 794,424 812,776 826,528 844,652 860,600 1000,600 1050,600"
          fill="none"
          stroke="#5DCAA5"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.45"
        />
      </g>
      {/* "Ai" teal */}
      <text
        fontFamily="'Helvetica Neue', Helvetica, Arial, sans-serif"
        fontSize="116"
        fontWeight="300"
        fill="#5DCAA5"
        x="280"
        y="635"
        letterSpacing="-2"
      >
        Ai
      </text>
      {/* "CoreMed" blanco */}
      <text
        fontFamily="'Helvetica Neue', Helvetica, Arial, sans-serif"
        fontSize="116"
        fontWeight="700"
        fill="#ffffff"
        x="388"
        y="635"
        letterSpacing="-3"
      >
        CoreMed
      </text>
      {/* Tagline */}
      {showTagline && (
        <text
          x="600"
          y="718"
          textAnchor="middle"
          fontFamily="'Helvetica Neue', Helvetica, Arial, sans-serif"
          fontSize="28"
          fontWeight="700"
          fill="#85B7EB"
          letterSpacing="5"
        >
          GESTIÓN MÉDICA INTELIGENTE
        </text>
      )}
    </svg>
  );
}
