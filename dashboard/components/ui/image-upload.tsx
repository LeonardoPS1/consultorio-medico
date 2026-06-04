'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

interface ImageUploadProps {
  value: string; // data URL o URL externa
  onChange: (dataUrl: string) => void;
  onRemove?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  shape?: 'circle' | 'rounded' | 'square';
  label?: string;
  fallback?: React.ReactNode;
  maxSizeMB?: number;
}

const sizeClasses = {
  sm: 'h-12 w-12',
  md: 'h-20 w-20',
  lg: 'h-28 w-28',
};

const shapeClasses = {
  circle: 'rounded-full',
  rounded: 'rounded-2xl',
  square: 'rounded-lg',
};

export function ImageUpload({
  value,
  onChange,
  onRemove,
  className,
  size = 'md',
  shape = 'rounded',
  label = 'Subir imagen',
  fallback,
  maxSizeMB = 2,
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      if (!file.type.startsWith('image/')) {
        setError('Solo se permiten imágenes');
        return;
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`Máximo ${maxSizeMB}MB`);
        return;
      }
      setLoading(true);
      try {
        // Subir el archivo al servidor (evita guardar base64 en JSON)
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        const json = await res.json();
        if (res.ok && json.url) {
          onChange(json.url);
        } else {
          setError(json.error || 'Error al subir la imagen');
        }
      } catch {
        setError('Error de conexión al subir la imagen');
      } finally {
        setLoading(false);
      }
    },
    [onChange, maxSizeMB]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
        e.target.value = '';
      }
    },
    [handleFile]
  );

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      {/* Imagen / fallback */}
      <label
        className={cn(
          'relative flex items-center justify-center border-2 border-dashed cursor-pointer transition-all overflow-hidden group',
          sizeClasses[size],
          shapeClasses[shape],
          isDragging
            ? 'border-primary bg-primary/5 scale-105'
            : value
            ? 'border-border hoverable:hover:border-primary/50'
            : 'border-muted-foreground/30 hoverable:hover:border-primary/50 bg-muted/30',
          loading && 'opacity-50 pointer-events-none'
        )}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(false);
        }}
        onDrop={handleDrop}
      >
        {/* Input oculto */}
        <input
          type="file"
          accept="image/*"
          onChange={handleChange}
          className="absolute inset-0 opacity-0 cursor-pointer z-10"
          disabled={loading}
        />

        {value ? (
          <>
            <img
              src={value}
              alt="Upload"
              className="h-full w-full object-cover"
              style={{
                borderRadius:
                  shape === 'circle'
                    ? '50%'
                    : shape === 'rounded'
                    ? '1rem'
                    : '0.5rem',
              }}
              onError={() => {
                // Si la imagen falla, dejamos que se vea el botón de upload
                // Esto lo manejará la condición value/false del padre
              }}
            />
            {/* Overlay al hover */}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-inherit">
              <Upload className="h-5 w-5 text-white" />
            </div>
            {/* Botón de eliminar */}
            {onRemove && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onRemove();
                }}
                className="absolute -top-1.5 -right-1.5 h-6 w-6 rounded-full bg-destructive hoverable:hover:bg-destructive/90 text-white flex items-center justify-center shadow-md z-20 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center text-muted-foreground p-2">
            {fallback || (
              <>
                <ImageIcon className="h-5 w-5 mb-1" />
                <span className="text-[10px] text-center leading-tight">{label}</span>
              </>
            )}
          </div>
        )}
      </label>

      {/* Mensaje de error */}
      {error && (
        <p className="text-xs text-destructive text-center">{error}</p>
      )}
    </div>
  );
}
