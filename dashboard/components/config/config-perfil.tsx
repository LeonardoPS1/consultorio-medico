'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ImageUpload } from '@/components/ui/image-upload';

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <div className="h-10 w-10 rounded-md border shrink-0" style={{ backgroundColor: value }} />
        <Input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-10 cursor-pointer p-1"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-28 font-mono text-xs"
        />
      </div>
    </div>
  );
}

export function PerfilOrganizacion() {
  const [data, setData] = useState({
    nombre: 'Consultorio Médico',
    eslogan: 'Tu salud, nuestra prioridad',
    descripcion: 'Centro médico especializado en atención clínica general.',
    logoUrl: '',
    avatarUrl: '',
    fondoUrl: '',
    firmaNombre: 'Dr. García',
    colorPrimario: '#2563eb',
    colorSecundario: '#7c3aed',
    direccion: 'Av. Providencia 1234',
    ciudad: 'Santiago',
    provincia: 'Región Metropolitana',
    telefono: '+56 9 5555 0000',
    telefonoSecundario: '',
    whatsapp: '+56955550000',
    email: 'info@consultorio.cl',
    emailSecundario: '',
    sitioWeb: 'https://consultorio.cl',
    instagram: '',
    facebook: '',
  });
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [previewColor, setPreviewColor] = useState(data.colorPrimario);

  useEffect(() => {
    fetch('/api/organization')
      .then((r) => r.json())
      .then((res) => {
        if (res.data) {
          const { redesSociales, ...rest } = res.data;
          setData((prev) => ({
            ...prev,
            ...rest,
            instagram: redesSociales?.instagram || '',
            facebook: redesSociales?.facebook || '',
          }));
          setPreviewColor(res.data.colorPrimario || '#2563eb');
        }
      })
      .catch(() => console.warn('[Config] Error al cargar organización'));
  }, []);

  const handleSave = async () => {
    setGuardando(true);
    setMensaje('');
    try {
      const { instagram, facebook, ...restData } = data;
      const payload = {
        ...restData,
        redesSociales: {
          instagram: instagram || '',
          facebook: facebook || '',
          twitter: '',
        },
      };

      const res = await fetch('/api/organization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setMensaje('ó Configuración guardada correctamente');
        setPreviewColor(data.colorPrimario);
        window.dispatchEvent(new CustomEvent('organization-updated'));
        setTimeout(() => setMensaje(''), 3000);
      } else {
        setMensaje(`ó ${json.error || 'Error al guardar'}`);
      }
    } catch (err) {
      setMensaje(
        `ó Error de conexión: ${err instanceof Error ? err.message : 'Error desconocido'}`,
      );
    } finally {
      setGuardando(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div
          className="h-28 relative bg-cover bg-center transition-[opacity]"
          style={
            data.fondoUrl
              ? { backgroundImage: `url(${data.fondoUrl})` }
              : {
                  background: `linear-gradient(135deg, ${previewColor}, ${data.colorSecundario || previewColor})`,
                }
          }
        >
          <ImageUpload
            value={data.fondoUrl}
            onChange={(url) => updateField('fondoUrl', url)}
            onRemove={() => updateField('fondoUrl', '')}
            shape="square"
            size="sm"
            label="Fondo"
            className="absolute bottom-2 right-2"
            fallback={
              <span className="text-foreground text-[9px] flex items-center gap-1 bg-background/60 backdrop-blur-sm rounded-md px-2 py-1">
                <svg
                  className="h-3 w-3"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                Fondo
              </span>
            }
          />
        </div>
        <CardContent className="relative -mt-10 flex items-end gap-4 pb-4">
          <ImageUpload
            value={data.avatarUrl}
            onChange={(url) => updateField('avatarUrl', url)}
            onRemove={() => updateField('avatarUrl', '')}
            shape="circle"
            size="md"
            label="Foto"
            className="shrink-0"
            fallback={
              <span className="text-xl font-bold" style={{ color: previewColor }}>
                {data.firmaNombre ? data.firmaNombre.charAt(0).toUpperCase() : 'ñ'}
              </span>
            }
          />
          <div className="pb-1 flex-1">
            <h3 className="text-lg font-bold">{data.firmaNombre || 'Dr. García'}</h3>
            <p className="text-sm text-muted-foreground">{data.nombre || 'Mi Consultorio'}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{data.email}</p>
          </div>
        </CardContent>
      </Card>

      {mensaje && (
        <div className="text-sm font-medium p-3 rounded-lg bg-muted text-center">{mensaje}</div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Datos del Consultorio</CardTitle>
            <CardDescription>Información principal que se muestra en la interfaz</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field
              label="Nombre del consultorio / médico"
              value={data.nombre}
              onChange={(v) => updateField('nombre', v)}
            />
            <Field
              label="Nombre del profesional (firma)"
              value={data.firmaNombre}
              onChange={(v) => updateField('firmaNombre', v)}
              placeholder="Ej: Dr. Juan García"
            />
            <Field
              label="Eslogan"
              value={data.eslogan}
              onChange={(v) => updateField('eslogan', v)}
            />
            <div className="space-y-1">
              <Label>Descripción</Label>
              <Textarea
                value={data.descripcion}
                onChange={(e) => updateField('descripcion', e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Personalización Visual</CardTitle>
            <CardDescription>Colores principales de la interfaz</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ColorField
              label="Color primario"
              value={data.colorPrimario}
              onChange={(v) => {
                updateField('colorPrimario', v);
                setPreviewColor(v);
              }}
            />
            <ColorField
              label="Color secundario"
              value={data.colorSecundario}
              onChange={(v) => updateField('colorSecundario', v)}
            />
            <div className="pt-2">
              <p className="text-sm text-muted-foreground mb-2">Vista previa de los colores:</p>
              <div className="flex gap-2">
                <div
                  className="h-8 w-8 rounded-lg"
                  style={{ backgroundColor: data.colorPrimario }}
                />
                <div
                  className="h-8 w-8 rounded-lg"
                  style={{ backgroundColor: data.colorSecundario }}
                />
                <div
                  className="h-8 w-8 rounded-lg"
                  style={{
                    background: `linear-gradient(135deg, ${data.colorPrimario}, ${data.colorSecundario})`,
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dirección y Contacto</CardTitle>
            <CardDescription>Datos de ubicación del consultorio</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field
              label="Dirección"
              value={data.direccion}
              onChange={(v) => updateField('direccion', v)}
            />
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Comuna"
                value={data.ciudad}
                onChange={(v) => updateField('ciudad', v)}
              />
              <Field
                label="Región"
                value={data.provincia}
                onChange={(v) => updateField('provincia', v)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Teléfonos y Email</CardTitle>
            <CardDescription>Canales de comunicación</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field
              label="Teléfono principal"
              value={data.telefono}
              onChange={(v) => updateField('telefono', v)}
            />
            <Field
              label="Teléfono secundario"
              value={data.telefonoSecundario}
              onChange={(v) => updateField('telefonoSecundario', v)}
            />
            <Field
              label="WhatsApp"
              value={data.whatsapp}
              onChange={(v) => updateField('whatsapp', v)}
            />
            <Field
              label="Email principal"
              type="email"
              value={data.email}
              onChange={(v) => updateField('email', v)}
            />
            <Field
              label="Email secundario"
              type="email"
              value={data.emailSecundario}
              onChange={(v) => updateField('emailSecundario', v)}
            />
            <Field
              label="Sitio web"
              value={data.sitioWeb}
              onChange={(v) => updateField('sitioWeb', v)}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Redes Sociales</CardTitle>
            <CardDescription>Vinculá las redes del consultorio</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              <Field
                label="Instagram"
                value={data.instagram}
                onChange={(v) => updateField('instagram', v)}
                placeholder="@usuario"
              />
              <Field
                label="Facebook"
                value={data.facebook}
                onChange={(v) => updateField('facebook', v)}
                placeholder="facebook.com/pagina"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => {
            setMensaje('');
            fetch('/api/organization')
              .then((r) => r.json())
              .then((res) => {
                if (res.data) {
                  const { redesSociales, ...rest } = res.data;
                  setData((prev) => ({
                    ...prev,
                    ...rest,
                    instagram: redesSociales?.instagram || '',
                    facebook: redesSociales?.facebook || '',
                  }));
                }
              });
          }}
        >
          Restablecer
        </Button>
        <Button onClick={handleSave} disabled={guardando}>
          {guardando ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </div>
    </div>
  );
}
