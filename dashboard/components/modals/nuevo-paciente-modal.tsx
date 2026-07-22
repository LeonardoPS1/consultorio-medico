'use client';

import { useState, useRef, useEffect } from 'react';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SISTEMAS_SALUD, ISAPRES_CHILENAS } from '@/lib/isapres';
import { getTramos } from '@/lib/aranceles-fonasa';

interface Region {
  id: string;
  nombre: string;
  numeroRomano: string | null;
}

interface Comuna {
  id: string;
  nombre: string;
}

// Zod schema for validation
const nuevoPacienteSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(50),
  apellido: z.string().min(2, 'El apellido debe tener al menos 2 caracteres').max(50),
  telefono: z.string().regex(/^\+569\d{8}$/, 'Formato: +569XXXXXXXX'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  dni: z.string().regex(/^\d{1,2}\.\d{3}\.\d{3}[-][0-9Kk]{1}$/, 'Formato: 12.345.678-9').optional().or(z.literal('')),
  sistemaSalud: z.enum(['fonasa', 'isapre', 'particular', 'prais', 'otro']),
  isapreNombre: z.string().optional(),
  regionId: z.string().optional(),
  comunaId: z.string().optional(),
  prevision: z.enum(['fonasa', 'isapre', 'particular', 'prais', 'otro']),
  tramoFonasa: z.enum(['A', 'B', 'C', 'D']).optional(),
  numeroAfiliado: z.string().optional(),
});

/** Formatea RUT chileno: 12.345.678-9 */
function formatRut(value: string): string {
  const cleaned = value.replace(/[^0-9Kk]/g, '').toUpperCase();
  if (cleaned.length <= 1) return cleaned;
  const body = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1);
  // Add dots every 3 digits from right
  const withDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${withDots}-${dv}`;
}

/** Agrega prefijo +569 si el teléfono no lo tiene */
function formatTelefonoChile(value: string): string {
  const digits = value.replace(/\D/g, '');
  // 9 dígitos empezando con 9 → +569 + últimos 8 dígitos
  if (digits.length === 9 && digits.startsWith('9')) return `+56${digits}`;
  // 11 dígitos empezando con 569 → +569 + últimos 8 dígitos
  if (digits.length === 11 && digits.startsWith('569')) return `+${digits}`;
  // 12 dígitos empezando con 569 → ya tiene formato correcto
  if (digits.length === 12 && digits.startsWith('569')) return `+${digits}`;
  return value;
}

interface NuevoPacienteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (data: {
    nombre: string;
    apellido: string;
    telefono: string;
    email: string;
    dni?: string | null;
    obraSocial: string;
    sistemaSalud?: string;
    isapreNombre?: string;
    regionId?: string;
    comunaId?: string;
    prevision?: string;
    tramoFonasa?: string;
    numeroAfiliado?: string;
  }) => void;
}

export function NuevoPacienteModal({ open, onOpenChange, onSubmit }: NuevoPacienteModalProps) {
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [dni, setDni] = useState('');
  const [sistemaSalud, setSistemaSalud] = useState('particular');
  const [isapreNombre, setIsapreNombre] = useState('');
  const [prevision, setPrevision] = useState('particular');
  const [tramoFonasa, setTramoFonasa] = useState('');
  const [numeroAfiliado, setNumeroAfiliado] = useState('');
  const [regionId, setRegionId] = useState('');
  const [comunaId, setComunaId] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Regiones/comunas
  const [regiones, setRegiones] = useState<Region[]>([]);
  const [comunas, setComunas] = useState<Comuna[]>([]);
  const [loadingComunas, setLoadingComunas] = useState(false);

  // Cargar regiones al abrir el modal
  useEffect(() => {
    if (open) {
      fetch('/api/regiones')
        .then((r) => r.json())
        .then((data) => setRegiones(data.data || []))
        .catch(() => {});
    }
  }, [open]);

  // Cargar comunas al cambiar región
  useEffect(() => {
    if (!regionId) {
      setComunas([]);
      return;
    }
    setLoadingComunas(true);
    fetch(`/api/comunas?region_id=${regionId}`)
      .then((r) => r.json())
      .then((data) => setComunas(data.data || []))
      .catch(() => {})
      .finally(() => setLoadingComunas(false));
  }, [regionId]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const validateField = (name: keyof typeof nuevoPacienteSchema.shape, value: string) => {
    const fieldSchema = nuevoPacienteSchema.shape[name];
    if (fieldSchema) {
      const result = fieldSchema.safeParse(value);
      setErrors(prev => {
        if (result.success) {
          const { [name]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [name]: result.error.errors[0].message };
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = {
      nombre,
      apellido,
      telefono: formatTelefonoChile(telefono),
      email,
      dni: dni.trim() || '',
      sistemaSalud: prevision === 'prais' ? 'otro' : prevision,
      isapreNombre,
      prevision,
      tramoFonasa: prevision === 'fonasa' ? tramoFonasa : undefined,
      numeroAfiliado: prevision === 'isapre' ? numeroAfiliado : undefined,
      regionId: regionId || undefined,
      comunaId: comunaId || undefined,
    };
    const result = nuevoPacienteSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }
    const isapreValue = prevision === 'isapre' ? isapreNombre : undefined;
    setLoading(true);
    onSubmit?.({
      nombre,
      apellido,
      telefono: formatTelefonoChile(telefono),
      email,
      dni: dni.trim() || null,
      obraSocial: isapreValue || prevision || 'Particular',
      sistemaSalud: prevision === 'prais' ? 'otro' : prevision,
      isapreNombre: isapreValue,
      prevision,
      tramoFonasa: prevision === 'fonasa' ? tramoFonasa : undefined,
      numeroAfiliado: prevision === 'isapre' ? numeroAfiliado : undefined,
      regionId: regionId || undefined,
      comunaId: comunaId || undefined,
    });
    setLoading(false);
    onOpenChange(false);
    setNombre('');
    setApellido('');
    setTelefono('');
    setEmail('');
    setDni('');
    setSistemaSalud('particular');
    setIsapreNombre('');
    setPrevision('particular');
    setTramoFonasa('');
    setNumeroAfiliado('');
    setRegionId('');
    setComunaId('');
    setErrors({});
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nuevo Paciente</DialogTitle>
          <DialogDescription>Registra un nuevo paciente en el sistema</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                placeholder="Nombre"
                value={nombre}
                onChange={(e) => { setNombre(e.target.value); validateField('nombre', e.target.value); }}
                required
                autoFocus
                aria-invalid={errors.nombre ? 'true' : 'false'}
                aria-describedby={errors.nombre ? 'nombre-error' : undefined}
              />
              {errors.nombre && <p id="nombre-error" className="text-xs text-destructive" role="alert">{errors.nombre}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="apellido">Apellido *</Label>
              <Input
                id="apellido"
                placeholder="Apellido"
                value={apellido}
                onChange={(e) => { setApellido(e.target.value); validateField('apellido', e.target.value); }}
                required
                aria-invalid={errors.apellido ? 'true' : 'false'}
                aria-describedby={errors.apellido ? 'apellido-error' : undefined}
              />
              {errors.apellido && <p id="apellido-error" className="text-xs text-destructive" role="alert">{errors.apellido}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefono">Teléfono *</Label>
            <Input
              id="telefono"
              placeholder="+569XXXXXXXX"
              value={telefono}
              onChange={(e) => { setTelefono(e.target.value); validateField('telefono', formatTelefonoChile(e.target.value)); }}
              required
              aria-invalid={errors.telefono ? 'true' : 'false'}
              aria-describedby={errors.telefono ? 'telefono-error' : undefined}
            />
            {errors.telefono && <p id="telefono-error" className="text-xs text-destructive" role="alert">{errors.telefono}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="paciente@email.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); validateField('email', e.target.value); }}
              aria-invalid={errors.email ? 'true' : 'false'}
              aria-describedby={errors.email ? 'email-error' : undefined}
            />
            {errors.email && <p id="email-error" className="text-xs text-destructive" role="alert">{errors.email}</p>}
          </div>

          {/* RUT */}
          <div className="space-y-2">
            <Label htmlFor="rut">RUT</Label>
            <Input
              id="rut"
              placeholder="12.345.678-9"
              value={dni}
              onChange={(e) => { const formatted = formatRut(e.target.value); setDni(formatted); validateField('dni', formatted); }}
              maxLength={12}
              aria-invalid={errors.dni ? 'true' : 'false'}
              aria-describedby={errors.dni ? 'dni-error' : undefined}
            />
            {errors.dni && <p id="dni-error" className="text-xs text-destructive" role="alert">{errors.dni}</p>}
          </div>

          <div className="space-y-2">
            <Label>Previsión</Label>
            <Select
              value={prevision}
              onValueChange={(val) => {
                setPrevision(val);
                setIsapreNombre('');
                setTramoFonasa('');
                setNumeroAfiliado('');
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fonasa">FONASA</SelectItem>
                <SelectItem value="isapre">ISAPRE</SelectItem>
                <SelectItem value="particular">Particular</SelectItem>
                <SelectItem value="prais">PRAIS</SelectItem>
                <SelectItem value="otro">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {prevision === 'fonasa' && (
            <div className="space-y-2">
              <Label>Tramo FONASA</Label>
              <Select value={tramoFonasa} onValueChange={setTramoFonasa}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona tramo" />
                </SelectTrigger>
                <SelectContent>
                  {getTramos().map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label} — {t.descripcion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {prevision === 'isapre' && (
            <>
              <div className="space-y-2">
                <Label>Isapre</Label>
                <Select value={isapreNombre} onValueChange={setIsapreNombre}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una Isapre" />
                  </SelectTrigger>
                  <SelectContent>
                    {ISAPRES_CHILENAS.map((i) => (
                      <SelectItem key={i.value} value={i.value}>
                        {i.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nuevo-numero-afiliado">N° de Afiliado</Label>
                <Input
                  id="nuevo-numero-afiliado"
                  placeholder="Número de afiliado"
                  value={numeroAfiliado}
                  onChange={(e) => setNumeroAfiliado(e.target.value)}
                  maxLength={100}
                />
              </div>
            </>
          )}

          {prevision === 'particular' && (
            <div className="rounded-lg border border-muted bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
              Sin copago por arancel particular
            </div>
          )}

          {/* Región */}
          <div className="space-y-2">
            <Label>Región</Label>
            <Select
              value={regionId}
              onValueChange={(val) => {
                setRegionId(val);
                setComunaId('');
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una región" />
              </SelectTrigger>
              <SelectContent>
                {regiones.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.numeroRomano ? `${r.numeroRomano} - ` : ''}
                    {r.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Comuna */}
          <div className="space-y-2">
            <Label>Comuna</Label>
            <Select
              value={comunaId}
              onValueChange={setComunaId}
              disabled={!regionId || loadingComunas}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={loadingComunas ? 'Cargando...' : 'Selecciona una comuna'}
                />
              </SelectTrigger>
              <SelectContent>
                {comunas.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !nombre.trim() || !apellido.trim() || !telefono.trim()}
            >
              {loading ? 'Registrando...' : 'Registrar Paciente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
