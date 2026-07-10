'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  Database,
  Download,
  Trash2,
  RefreshCw,
  Shield,
  HardDrive,
  Table2,
  Rows3,
} from 'lucide-react';

interface BackupInfo {
  id: string;
  filename: string;
  sizeBytes: number;
  createdAt: string;
  tables: number;
  rows: number;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function AdminBackupsPage() {
  const { data: session } = useSession();

  if (session?.user?.role !== 'admin') {
    redirect('/dashboard');
  }

  return <BackupsContent />;
}

function BackupsContent() {
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const fetchBackups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/backups');
      const data = await res.json();
      setBackups(data.backups || []);
    } catch {
      setError('Error al cargar backups');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  const handleCreateBackup = async () => {
    setCreating(true);
    setError('');
    try {
      const res = await fetch('/api/admin/backups', { method: 'POST' });
      if (res.ok) {
        await fetchBackups();
      } else {
        const data = await res.json();
        setError(data.error || 'Error al crear backup');
      }
    } catch {
      setError('Error de conexión al crear backup');
    } finally {
      setCreating(false);
    }
  };

  const handleDownload = (backup: BackupInfo) => {
    window.open(`/api/admin/backups/${backup.id}`, '_blank');
  };

  const handleDelete = async (backup: BackupInfo) => {
    if (
      !confirm(
        `¿Eliminar backup del ${format(new Date(backup.createdAt), 'dd/MM/yy HH:mm', { locale: es })}?`,
      )
    )
      return;
    try {
      await fetch(`/api/admin/backups/${backup.id}`, { method: 'DELETE' });
      await fetchBackups();
    } catch {
      setError('Error al eliminar backup');
    }
  };

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <HardDrive className="h-7 w-7" />
            Backup Encriptado
          </h1>
          <p className="text-muted-foreground mt-1">
            Backups automáticos de la base de datos con encriptación AES-256-GCM
          </p>
        </div>
        <Button onClick={handleCreateBackup} disabled={creating} className="gap-2">
          {creating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Database className="h-4 w-4" />
          )}
          {creating ? 'Generando...' : 'Generar Backup'}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200/50 p-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Backups disponibles
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={fetchBackups} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <CardDescription>
            Los backups se almacenan encriptados con AES-256-GCM usando AUTH_SECRET como clave
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Database className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No hay backups todavía</p>
              <p className="text-sm mt-1">
                Generá tu primer backup haciendo clic en &quot;Generar Backup&quot;
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {backups.map((backup) => (
                <div
                  key={backup.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium truncate">
                        {format(new Date(backup.createdAt), "dd/MM/yyyy 'a las' HH:mm", {
                          locale: es,
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <HardDrive className="h-3 w-3" />
                        {formatSize(backup.sizeBytes)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Table2 className="h-3 w-3" />
                        {backup.tables} tablas
                      </span>
                      <span className="flex items-center gap-1">
                        <Rows3 className="h-3 w-3" />
                        {backup.rows.toLocaleString()} registros
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDownload(backup)}
                      title="Descargar SQL desencriptado"
                      aria-label="Descargar backup"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                      onClick={() => handleDelete(backup)}
                      title="Eliminar backup"
                      aria-label="Eliminar backup"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
