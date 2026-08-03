import { ShieldCheck, Lock, Server, KeyRound, FileCheck2, Eye } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Logo } from '@/components/layout/logo';

export const metadata: Metadata = {
  title: 'Cumplimiento y Seguridad — AiCoreMed',
  description:
    'Cómo AiCoreMed protege los datos de tu consultorio: aislamiento entre clínicas, cifrado, registro de accesos y respaldo automático.',
};

const PROTECCIONES = [
  {
    icono: Lock,
    titulo: 'Cifrado de datos',
    descripcion:
      'Toda la información se guarda cifrada y las comunicaciones viajan por conexiones seguras. Incluso si alguien accediera al almacenamiento, los datos serían ilegibles sin la clave.',
  },
  {
    icono: Server,
    titulo: 'Infraestructura propia',
    descripcion:
      'Tus datos se almacenan en servidores propios en Chile. El asistente de IA corre 100% local: la información del consultorio nunca sale de tu servidor ni se envía a terceros.',
  },
  {
    icono: KeyRound,
    titulo: 'Acceso con doble verificación',
    descripcion:
      'El acceso al panel de administración está protegido con contraseña reforzada y verificación en dos pasos, para que solo el personal autorizado pueda entrar.',
  },
  {
    icono: Eye,
    titulo: 'Registro de accesos',
    descripcion:
      'Cada vez que un médico o administrativo consulta la ficha de un paciente queda registrado quién lo hizo y cuándo. Los pacientes pueden ver este registro desde su portal.',
  },
  {
    icono: FileCheck2,
    titulo: 'Derechos de los pacientes',
    descripcion:
      'El sistema cumple la Ley 19.628 (protección de datos personales) y la Ley 20.584 (derechos del paciente): exportación y solicitud de eliminación de datos desde el portal, con revisión manual del consultorio.',
  },
  {
    icono: ShieldCheck,
    titulo: 'Respaldo automático',
    descripcion:
      'Los datos se respaldan a diario de forma automática y encriptada, y se conservan copias para poder recuperar el sistema ante cualquier eventualidad.',
  },
];

/**
 *
 */
export default function CumplimientoPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar simplificado */}
      <header className="border-b bg-background/95 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2">
            <Logo className="h-14 md:h-24 w-auto" />
          </Link>
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Volver al inicio
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-12 md:py-16 max-w-3xl">
        {/* Badge de cumplimiento */}
        <div className="inline-flex items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-sm font-medium text-green-700 dark:text-green-400 mb-4">
          <ShieldCheck className="h-4 w-4" />
          Cumplimiento Ley 19.628 y Ley 20.584
        </div>

        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
          Cumplimiento y Seguridad
        </h1>
        <p className="text-sm text-muted-foreground mb-4">
          Última actualización: 3 de agosto de 2026
        </p>

        {/* Security banner */}
        <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 md:p-5 mb-8">
          <div className="flex flex-col sm:flex-row items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm mb-0.5">
                Tus datos están 100% protegidos
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                En AiCoreMed la seguridad y el cumplimiento normativo son nuestra prioridad. Cada
                clínica trabaja en un espacio aislado de las demás, todo se cifra, cada acceso queda
                registrado y los respaldos son automáticos. Así protegemos la información de tu
                consultorio y de tus pacientes.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {PROTECCIONES.map((p) => (
            <div
              key={p.titulo}
              className="rounded-xl border bg-card p-5 transition-colors hover:border-primary/30"
            >
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <p.icono className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-1">{p.titulo}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{p.descripcion}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 prose prose-sm dark:prose-invert max-w-none space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">
              Nuestro compromiso con tus datos
            </h2>
            <p>
              AiCoreMed trata los datos de salud con el máximo resguardo. Los datos se almacenan en
              infraestructura propia en Chile, se cifran en reposo y en tránsito, y el acceso al
              panel administrativo requiere autenticación reforzada. El asistente de IA corre
              íntegramente en tu servidor, por lo que la información clínica nunca sale de tu
              infraestructura.
            </p>
            <p>
              Cada clínica opera en un espacio aislado: los datos de un consultorio no son visibles
              para otros, y solo el personal autorizado de tu propio equipo puede acceder a ellos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">
              Tus derechos como paciente
            </h2>
            <p>
              Si sos paciente de un consultorio que usa AiCoreMed, podés desde el portal: consultar
              tu historial, exportar una copia de tus datos y solicitar la eliminación de tu
              información. Estas solicitudes las revisa manualmente el consultorio conforme a la
              normativa vigente.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">Contacto</h2>
            <p>
              Si tenés preguntas sobre cómo protegemos los datos, escribinos a{' '}
              <a href="mailto:info@aicorebots.com" className="text-primary hover:underline">
                info@aicorebots.com
              </a>
              .
            </p>
          </section>
        </div>
      </main>

      {/* Footer simplificado */}
      <footer className="border-t py-6">
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 px-4 md:px-6 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Aicore. Todos los derechos reservados.</p>
          <div className="flex items-center gap-4">
            <Link href="/terminos" className="hover:text-foreground transition-colors">
              Términos
            </Link>
            <Link href="/privacidad" className="hover:text-foreground transition-colors">
              Privacidad
            </Link>
            <Link href="/cumplimiento" className="hover:text-foreground transition-colors">
              Cumplimiento
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
