import { AnimatedSection } from '@/components/landing/animated-section';
import { CalendarX, PhoneCall, BellOff, FileText, Receipt, MessageCircleOff } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface PainPointItem {
  icon: LucideIcon;
  title: string;
  problem: string;
  stat?: string;
}

const defaultPainPoints: PainPointItem[] = [
  {
    icon: CalendarX,
    title: 'Ausentismo crónico',
    problem:
      'Hasta un 30% de los pacientes no se presenta a sus citas. Cada no-show es dinero perdido que podrías haber recuperado si alguien más hubiera ocupado ese turno.',
    stat: '-30% ingresos',
  },
  {
    icon: PhoneCall,
    title: 'Teléfono saturado',
    problem:
      'Tu personal pasa horas al día agendando turnos, confirmando citas y respondiendo las mismas preguntas. Tiempo que podrían dedicar a lo que realmente importa: atender pacientes.',
    stat: '+4h/día en llamadas',
  },
  {
    icon: BellOff,
    title: 'Recordatorios manuales',
    problem:
      'Sin automatización, los pacientes olvidan sus citas. Llamar uno por uno no escala y consume horas de trabajo administrativo que podrías eliminar por completo.',
    stat: '80% olvida sin recordatorio',
  },
  {
    icon: FileText,
    title: 'Fichas clínicas en papel',
    problem:
      'Historiales perdidos, recetas ilegibles, datos duplicados entre sistemas. La desorganización documental te hace perder tiempo clínico y poner en riesgo la continuidad del cuidado.',
    stat: '15-20 min/paciente',
  },
  {
    icon: Receipt,
    title: 'Cobros y facturación',
    problem:
      'Llevar el control de pagos pendientes, morosidad y facturación manual es agotador. Cada error en cobros es dinero que simplemente no llega a tu clínica.',
    stat: 'hasta 15% morosidad',
  },
  {
    icon: MessageCircleOff,
    title: 'Pacientes incomunicados',
    problem:
      'Tus pacientes no tienen un canal rápido para consultarte horarios, precios o disponibilidad. Llaman, no contestan, se frustran y terminan yéndose a la competencia.',
    stat: '60% se va sin respuesta',
  },
];

export interface PainPointsProps {
  title?: string;
  subtitle?: string;
  painPoints?: PainPointItem[];
}

export function PainPoints({
  title = '¿Tu clínica sufre estos problemas?',
  subtitle = 'La administración médica está llena de obstáculos que te hacen perder tiempo, pacientes y dinero. Identificarlos es el primer paso para resolverlos.',
  painPoints: customPainPoints,
}: PainPointsProps = {}) {
  const items = customPainPoints ?? defaultPainPoints;

  return (
    <section className="relative overflow-hidden border-t">
      {/* Fondo con gradiente sutil */}
      <div className="absolute inset-0 bg-gradient-to-b from-red-500/[0.03] via-transparent to-transparent pointer-events-none" />

      <div className="container mx-auto px-4 md:px-6 py-20 md:py-28">
        <AnimatedSection className="text-center mb-14 max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{title}</h2>
          <p className="text-muted-foreground text-base md:text-lg">{subtitle}</p>
        </AnimatedSection>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 stagger-children">
          {items.map((point) => {
            const Icon = point.icon;
            return (
              <div
                key={point.title}
                className="group relative rounded-xl border bg-card p-6 card-glow-hover"
              >
                {/* Indicador de estadística flotante */}
                {point.stat && (
                  <div className="absolute top-3 right-3 rounded-full bg-destructive/10 text-destructive text-[10px] font-semibold px-2.5 py-1 leading-none">
                    {point.stat}
                  </div>
                )}

                <div className="h-11 w-11 rounded-xl bg-destructive/10 flex items-center justify-center mb-4">
                  <Icon className="h-5.5 w-5.5 text-destructive" />
                </div>

                <h3 className="font-semibold text-sm mb-2 group-hover:text-destructive transition-colors duration-200">
                  {point.title}
                </h3>

                <p className="text-xs text-muted-foreground leading-relaxed">{point.problem}</p>
              </div>
            );
          })}
        </div>

        {/* Mensaje de cierre */}
        <AnimatedSection className="text-center mt-12" delay={0.3}>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary text-sm font-medium px-5 py-2.5">
            <span className="text-lg leading-none">💡</span>
            AiCoreMed resuelve cada uno de estos problemas. Descubrí cómo.
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
