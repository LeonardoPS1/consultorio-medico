import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';

const config: Config = {
  darkMode: ['class'],
  content: [
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          muted: 'hsl(var(--sidebar-muted))',
          accent: 'hsl(var(--sidebar-accent))',
        },
        // Portal del Paciente — colores
        portal: {
          bg: 'hsl(var(--portal-bg))',
          'bg-alt': 'hsl(var(--portal-bg-alt))',
          fg: 'hsl(var(--portal-foreground))',
          'muted-fg': 'hsl(var(--portal-muted-foreground))',
          muted: 'hsl(var(--portal-muted))',
          border: 'hsl(var(--portal-border))',
          'border-light': 'hsl(var(--portal-border-light))',
          primary: 'hsl(var(--portal-primary))',
          'primary-soft': 'hsl(var(--portal-primary-soft))',
          accent: 'hsl(var(--portal-accent))',
          'accent-soft': 'hsl(var(--portal-accent-soft))',
          destructive: 'hsl(var(--portal-destructive))',
          success: 'hsl(var(--portal-success))',
          warning: 'hsl(var(--portal-warning))',
        },
        // Estados para turnos
        turno: {
          pendiente: '#F59E0B',
          confirmada: '#10B981',
          en_consulta: '#3B82F6',
          completada: '#6B7280',
          cancelada: '#EF4444',
          no_asistio: '#EC4899',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.9)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(20px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in-up': 'fade-in-up 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fade-in 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-right': 'slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-subtle': 'pulse-subtle 2s ease-in-out infinite',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      transitionTimingFunction: {
        'custom-out': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'custom-in-out': 'cubic-bezier(0.77, 0, 0.175, 1)',
        drawer: 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.05)',
        'card-lg': '0 8px 24px rgba(0,0,0,0.06)',
        toast: '0 8px 24px rgba(0,0,0,0.12)',
        'portal-sm': 'var(--portal-shadow-sm)',
        'portal-md': 'var(--portal-shadow-md)',
        'portal-lg': 'var(--portal-shadow-lg)',
        'portal-xl': 'var(--portal-shadow-xl)',
      },
      backgroundImage: {
        'portal-gradient': 'linear-gradient(135deg, hsl(var(--portal-primary) / 0.08), hsl(var(--portal-accent) / 0.05))',
        'portal-gradient-strong': 'linear-gradient(135deg, hsl(var(--portal-primary)), hsl(var(--portal-accent)))',
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    plugin(({ addVariant }) => {
      // Variant que solo aplica en dispositivos con hover (excluye touch)
      addVariant('hoverable', '@media (hover: hover) and (pointer: fine)');
    }),
  ],
};

export default config;
