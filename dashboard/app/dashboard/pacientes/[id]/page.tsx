'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Phone,
  Mail,
  Calendar,
  MessageSquare,
  Syringe,
  FileText,
  Clock,
  AlertCircle,
  Download,
  Send,
  Edit3,
  Activity,
  Heart,
  User,
} from 'lucide-react';
import { formatDate, formatPhone, getInitials, getTurnoLabel } from '@/lib/utils';

// ============================================================
// Mock data - Pacientes
// ============================================================

const pacientesMock: Record<string, any> = {
  '1': {
    id: '1', nombre: 'Juan', apellido: 'Pérez', telefono: '+5491155550101', email: 'juan@email.com',
    dni: '30.123.456', fechaNacimiento: '1985-06-15', obraSocial: 'OSDE', numeroAfiliado: 'OS-12345',
    alergias: 'Penicilina', medicacionCronica: 'Losartán 50mg',
    notasMedicas: 'Paciente hipertenso controlado. Realizar controles cada 3 meses.',
    canalPreferido: 'whatsapp', tags: ['Obra Social', 'Crónico'],
  },
  '2': {
    id: '2', nombre: 'María', apellido: 'García', telefono: '+5491155550102', email: 'maria@email.com',
    dni: '31.789.012', fechaNacimiento: '1990-03-22', obraSocial: 'Particular', numeroAfiliado: '',
    alergias: '', medicacionCronica: '',
    notasMedicas: 'Paciente en buen estado general.',
    canalPreferido: 'whatsapp', tags: ['Particular'],
  },
  '3': {
    id: '3', nombre: 'Pedro', apellido: 'Sánchez', telefono: '+5491155550103', email: 'pedro@email.com',
    dni: '32.345.678', fechaNacimiento: '1978-11-08', obraSocial: 'Swiss Medical', numeroAfiliado: 'SM-67890',
    alergias: 'Sulfa', medicacionCronica: 'Metformina 850mg, Enalapril 10mg',
    notasMedicas: 'Diabetes tipo 2. Control trimestral de HbA1c.',
    canalPreferido: 'whatsapp', tags: ['Obra Social', 'Crónico'],
  },
  '4': {
    id: '4', nombre: 'Ana', apellido: 'López', telefono: '+5491155550104', email: 'ana@email.com',
    dni: '33.901.234', fechaNacimiento: '1995-09-30', obraSocial: 'Particular', numeroAfiliado: '',
    alergias: '', medicacionCronica: '',
    notasMedicas: '',
    canalPreferido: 'email', tags: ['Particular'],
  },
  '5': {
    id: '5', nombre: 'Carlos', apellido: 'Ruiz', telefono: '+5491155550105', email: 'carlos@email.com',
    dni: '34.567.890', fechaNacimiento: '2000-01-15', obraSocial: 'Galeno', numeroAfiliado: 'GA-24680',
    alergias: '', medicacionCronica: '',
    notasMedicas: 'Paciente nuevo, sin historial previo.',
    canalPreferido: 'whatsapp', tags: ['Nuevo'],
  },
};

// Mock turnos del paciente
const turnosMock: Record<string, any[]> = {
  '1': [
    { id: 't1', fecha: '2026-05-14T10:00:00', hora: '10:00', tipo: 'Control', medico: 'Dr. García', estado: 'completada', motivo: 'Control de presión arterial' },
    { id: 't2', fecha: '2026-05-10T09:00:00', hora: '09:00', tipo: 'Consulta', medico: 'Dr. García', estado: 'completada', motivo: 'Dolor de cabeza persistente' },
    { id: 't3', fecha: '2026-04-28T11:00:00', hora: '11:00', tipo: 'Resultados', medico: 'Dr. García', estado: 'completada', motivo: 'Resultados de análisis' },
  ],
  '2': [
    { id: 't4', fecha: '2026-05-10T09:00:00', hora: '09:00', tipo: 'Control', medico: 'Dr. García', estado: 'completada', motivo: 'Control anual' },
  ],
  '3': [
    { id: 't5', fecha: '2026-05-12T11:00:00', hora: '11:00', tipo: 'Consulta', medico: 'Dr. García', estado: 'completada', motivo: 'Control de diabetes' },
  ],
};

// Mock historial médico
const historialMock: Record<string, any[]> = {
  '1': [
    { id: 'h1', fecha: '2026-05-14', tipo: 'consulta', titulo: 'Control de presión arterial', descripcion: 'PA: 125/85. Se ajusta medicación.', codigo: 'I10' },
    { id: 'h2', fecha: '2026-04-10', tipo: 'estudio', titulo: 'Análisis de sangre', descripcion: 'HbA1c: 5.7%. Colesterol total: 190.', codigo: '' },
    { id: 'h3', fecha: '2026-03-05', tipo: 'receta', titulo: 'Renovación Losartán', descripcion: 'Se renueva Losartán 50mg por 90 días.', codigo: '' },
  ],
  '3': [
    { id: 'h4', fecha: '2026-05-12', tipo: 'consulta', titulo: 'Control de diabetes', descripcion: 'HbA1c: 7.2%. Glucemia en ayunas: 130. Se ajusta dosis de metformina.', codigo: 'E11' },
  ],
};

// Mock recetas del paciente
const recetasMock: Record<string, any[]> = {
  '1': [
    { id: 'r1', medicamento: 'Losartán 50mg', dosis: '1 comprimido por día', duracion: '90 días', estado: 'activa', vence: '2026-08-14' },
    { id: 'r2', medicamento: 'Amoxicilina 500mg', dosis: '1 comprimido c/8hs', duracion: '7 días', estado: 'activa', vence: '2026-05-21' },
  ],
  '3': [
    { id: 'r3', medicamento: 'Metformina 850mg', dosis: '1 comprimido c/12hs', duracion: '90 días', estado: 'activa', vence: '2026-08-12' },
    { id: 'r4', medicamento: 'Enalapril 10mg', dosis: '1 comprimido por día', duracion: '90 días', estado: 'activa', vence: '2026-08-12' },
  ],
};

export default function PacienteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('resumen');

  const paciente = pacientesMock[params.id as string];
  const turnos = turnosMock[params.id as string] || [];
  const historial = historialMock[params.id as string] || [];
  const recetas = recetasMock[params.id as string] || [];

  if (!paciente) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <AlertCircle className="h-16 w-16 text-destructive/50 mb-4" />
        <h2 className="text-2xl font-bold">Paciente no encontrado</h2>
        <p className="text-muted-foreground mt-2 mb-4">El paciente que buscás no existe</p>
        <Button onClick={() => router.push('/dashboard/pacientes')}>
          Volver a pacientes
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in">
      {/* Header con navegación */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/pacientes')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-4 flex-1">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="bg-primary/10 text-primary text-lg">
              {getInitials(paciente.nombre, paciente.apellido)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-2xl font-bold">{paciente.nombre} {paciente.apellido}</h2>
            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" />
                {formatPhone(paciente.telefono)}
              </span>
              {paciente.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />
                  {paciente.email}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-1 ml-auto">
            <Button variant="outline" size="sm">
              <MessageSquare className="h-4 w-4 mr-1" />
              WhatsApp
            </Button>
            <Button size="sm">
              <Calendar className="h-4 w-4 mr-1" />
              Nuevo Turno
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="resumen">
            <User className="h-4 w-4 mr-1" />
            Resumen
          </TabsTrigger>
          <TabsTrigger value="turnos">
            <Calendar className="h-4 w-4 mr-1" />
            Turnos
          </TabsTrigger>
          <TabsTrigger value="historial">
            <Activity className="h-4 w-4 mr-1" />
            Historial Médico
          </TabsTrigger>
          <TabsTrigger value="recetas">
            <Syringe className="h-4 w-4 mr-1" />
            Recetas
          </TabsTrigger>
        </TabsList>

        {/* === TAB RESUMEN === */}
        <TabsContent value="resumen" className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Datos personales */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Datos Personales
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">DNI</p>
                    <p className="text-sm font-medium">{paciente.dni || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Fecha de Nac.</p>
                    <p className="text-sm font-medium">
                      {paciente.fechaNacimiento ? formatDate(paciente.fechaNacimiento, 'dd/MM/yyyy') : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Obra Social</p>
                    <p className="text-sm font-medium">{paciente.obraSocial || 'Particular'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">N° Afiliado</p>
                    <p className="text-sm font-medium">{paciente.numeroAfiliado || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Canal Preferido</p>
                    <Badge variant="outline" className="text-xs mt-1">{paciente.canalPreferido}</Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Tags</p>
                    <div className="flex gap-1 mt-1">
                      {paciente.tags.map((tag: string) => (
                        <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Información médica */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  Información Médica
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Alergias</p>
                  <p className="text-sm font-medium">{paciente.alergias || 'Sin alergias registradas'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Medicación Crónica</p>
                  <p className="text-sm font-medium">{paciente.medicacionCronica || 'Sin medicación crónica'}</p>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Notas Médicas</p>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <Edit3 className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{paciente.notasMedicas || 'Sin notas'}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Últimos turnos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Últimos Turnos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {turnos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin turnos registrados</p>
              ) : (
                <div className="divide-y">
                  {turnos.map((turno: any) => (
                    <div key={turno.id} className="flex items-center gap-3 py-2">
                      <div className="text-sm font-medium min-w-[60px]">{formatDate(turno.fecha, 'dd/MM')}</div>
                      <div className="flex-1">
                        <p className="text-sm">{turno.tipo}</p>
                        <p className="text-xs text-muted-foreground">{turno.motivo}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">{getTurnoLabel(turno.estado)}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* === TAB TURNOS === */}
        <TabsContent value="turnos" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Historial de Turnos</CardTitle>
              <Button size="sm">
                <Calendar className="h-4 w-4 mr-1" />
                Nuevo Turno
              </Button>
            </CardHeader>
            <CardContent>
              {turnos.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Sin turnos registrados</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {turnos.map((turno: any) => (
                    <div key={turno.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                        {turno.hora}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{turno.tipo}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(turno.fecha, 'PPP')}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{turno.motivo}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">{turno.medico}</p>
                        <Badge variant="outline" className="text-xs mt-1">{getTurnoLabel(turno.estado)}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* === TAB HISTORIAL MÉDICO === */}
        <TabsContent value="historial" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Historial Clínico
              </CardTitle>
            </CardHeader>
            <CardContent>
              {historial.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Sin entradas en el historial médico</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {historial.map((entry: any) => (
                    <div key={entry.id} className="border-l-2 border-primary/30 pl-4 pb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-[10px]">
                          {entry.tipo === 'consulta' ? 'Consulta' : entry.tipo === 'estudio' ? 'Estudio' : 'Receta'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{formatDate(entry.fecha, 'dd/MM/yyyy')}</span>
                      </div>
                      <p className="font-medium text-sm">{entry.titulo}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{entry.descripcion}</p>
                      {entry.codigo && (
                        <Badge variant="outline" className="text-[10px] mt-1 font-mono">
                          CIE-10: {entry.codigo}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* === TAB RECETAS === */}
        <TabsContent value="recetas" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Syringe className="h-4 w-4" />
                Recetas
              </CardTitle>
              <Button size="sm">
                <Syringe className="h-4 w-4 mr-1" />
                Nueva Receta
              </Button>
            </CardHeader>
            <CardContent>
              {recetas.length === 0 ? (
                <div className="text-center py-12">
                  <Syringe className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Sin recetas registradas</p>
                </div>
              ) : (
                <div className="divide-y">
                  {recetas.map((receta: any) => (
                    <div key={receta.id} className="flex items-center gap-4 py-3">
                      <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <Syringe className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{receta.medicamento}</p>
                        <p className="text-xs text-muted-foreground">{receta.dosis} · {receta.duracion}</p>
                      </div>
                      <div className="text-right text-sm">
                        <p className="text-xs text-muted-foreground">Vence</p>
                        <p className="font-medium">{formatDate(receta.vence, 'dd/MM')}</p>
                      </div>
                      <Badge className={`text-xs ${
                        receta.estado === 'activa'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {receta.estado}
                      </Badge>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon"><Download className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon"><Send className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
