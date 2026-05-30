'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Building2, Plus, Loader2, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/page-header';

interface Tenant {
  id: string;
  nombre: string;
  subdomain: string;
  activo: boolean;
  created_at: string;
}

export default function AdminTenantsPage() {
  const { data: session } = useSession();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newNombre, setNewNombre] = useState('');
  const [newSubdomain, setNewSubdomain] = useState('');
  const [saving, setSaving] = useState(false);

  // Solo admin
  if (session?.user?.role !== 'admin') {
    redirect('/dashboard');
  }

  const loadTenants = () => {
    fetch('/api/admin/tenants')
      .then((r) => r.json())
      .then((res) => {
        if (res.error) setError(res.error);
        else setTenants(Array.isArray(res) ? res : []);
      })
      .catch(() => setError('Error al cargar tenants'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (session?.user?.role === 'admin') loadTenants();
  }, [session]);

  const handleCreate = async () => {
    if (!newNombre || !newSubdomain) return;
    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: newNombre, subdomain: newSubdomain }),
      });
      const json = await res.json();
      if (json.error) {
        setError(json.error);
      } else {
        setShowModal(false);
        setNewNombre('');
        setNewSubdomain('');
        loadTenants();
      }
    } catch {
      setError('Error al crear tenant');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Tenants" />
        <Button onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo tenant
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-4">
        {tenants.map((t) => (
          <Card key={t.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{t.nombre}</CardTitle>
                    <CardDescription>{t.subdomain}.aicoremed.com</CardDescription>
                  </div>
                </div>
                <Badge variant={t.activo ? 'default' : 'secondary'}>
                  {t.activo ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                ID: {t.id} · Creado: {new Date(t.created_at).toLocaleDateString('es-AR')}
              </p>
            </CardContent>
          </Card>
        ))}

        {tenants.length === 0 && !loading && (
          <Card>
            <CardContent className="text-center py-12 text-sm text-muted-foreground">
              No hay tenants configurados todavía.
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo tenant</DialogTitle>
            <DialogDescription>
              Creá una nueva instancia para un cliente de AiCoreMed
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre del consultorio / clínica</Label>
              <Input
                placeholder="Ej: Clínica Paz"
                value={newNombre}
                onChange={(e) => setNewNombre(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Subdominio</Label>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="clinica-paz"
                  value={newSubdomain}
                  onChange={(e) => setNewSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                />
                <span className="text-xs text-muted-foreground shrink-0">.aicoremed.com</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={saving || !newNombre || !newSubdomain}>
              {saving ? 'Creando...' : 'Crear tenant'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
