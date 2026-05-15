'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, Phone, MessageSquare, Filter, ChevronRight, Bot, User } from 'lucide-react';
import { getInitials, formatRelative, truncate, formatPhone } from '@/lib/utils';

// Mock data
const conversaciones = [
  {
    id: '1',
    paciente: 'Juan Pérez',
    telefono: '+5491155550101',
    ultimoMensaje: 'Perfecto doctor, entonces confirmo el turno para mañana a las 10',
    ultimaIntencion: 'confirmacion',
    tiempo: '2026-05-14T10:30:00',
    noLeidos: 1,
    canal: 'whatsapp',
  },
  {
    id: '2',
    paciente: 'María García',
    telefono: '+5491155550102',
    ultimoMensaje: 'Quería saber si los resultados de los análisis ya están listos',
    ultimaIntencion: 'consulta',
    tiempo: '2026-05-14T09:15:00',
    noLeidos: 2,
    canal: 'whatsapp',
  },
  {
    id: '3',
    paciente: 'Pedro Sánchez',
    telefono: '+5491155550103',
    ultimoMensaje: 'Hola, necesito cancelar el turno del viernes, me surgió un imprevisto',
    ultimaIntencion: 'cancelacion',
    tiempo: '2026-05-13T18:45:00',
    noLeidos: 0,
    canal: 'whatsapp',
  },
  {
    id: '4',
    paciente: 'Ana López',
    telefono: '+5491155550104',
    ultimoMensaje: 'Gracias por la receta, ya la recibí por WhatsApp',
    ultimaIntencion: 'receta',
    tiempo: '2026-05-13T11:20:00',
    noLeidos: 0,
    canal: 'email',
  },
];

const intencionStyles: Record<string, string> = {
  confirmacion: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  consulta: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  cancelacion: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  receta: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
};

const intencionLabels: Record<string, string> = {
  confirmacion: 'Confirmación',
  consulta: 'Consulta',
  cancelacion: 'Cancelación',
  receta: 'Receta',
};

export default function ConversacionesPage() {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = conversaciones.find((c) => c.id === selectedId);

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Conversaciones</h2>
        <p className="text-muted-foreground">
          Bandeja unificada de WhatsApp y Email
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        {/* Lista de conversaciones */}
        <Card className="lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto">
          <CardContent className="p-0">
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar..." className="pl-9 h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
            <div className="divide-y">
              {conversaciones.map((conv) => (
                <div
                  key={conv.id}
                  className={`flex items-start gap-3 p-3 cursor-pointer transition-colors hover:bg-muted/50 ${
                    selectedId === conv.id ? 'bg-muted' : ''
                  }`}
                  onClick={() => setSelectedId(conv.id)}
                >
                  <Avatar className="h-9 w-9 mt-0.5">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {getInitials(...conv.paciente.split(' '))}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm truncate">{conv.paciente}</p>
                      <span className="text-xs text-muted-foreground shrink-0 ml-2">
                        {formatRelative(conv.tiempo)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {conv.noLeidos > 0 && (
                        <span className="flex items-center justify-center h-5 min-w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1">
                          {conv.noLeidos}
                        </span>
                      )}
                      <Badge className={`text-[10px] px-1.5 py-0 ${intencionStyles[conv.ultimaIntencion] || ''}`} variant="outline">
                        {intencionLabels[conv.ultimaIntencion] || conv.ultimaIntencion}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {truncate(conv.ultimoMensaje, 60)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Panel de conversación */}
        <Card>
          {selected ? (
            <CardContent className="p-0 flex flex-col h-[calc(100vh-12rem)]">
              {/* Header de la conversación */}
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(...selected.paciente.split(' '))}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{selected.paciente}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {formatPhone(selected.telefono)}
                    </p>
                  </div>
                </div>
                <Badge variant="outline">
                  {selected.canal === 'whatsapp' ? 'WhatsApp' : 'Email'}
                </Badge>
              </div>

              {/* Mensajes */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8 mt-1">
                    <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                      {getInitials(...selected.paciente.split(' '))}
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-2.5 max-w-[80%]">
                    <p className="text-sm">{selected.ultimoMensaje}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {formatRelative(selected.tiempo)}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 justify-end">
                  <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[80%]">
                    <p className="text-sm">
                      Hola {selected.paciente.split(' ')[0]}, gracias por tu mensaje. Te confirmo que he recibido tu solicitud. 😊
                    </p>
                    <p className="text-[10px] text-primary-foreground/70 mt-1">
                      hace 2 min
                    </p>
                  </div>
                  <Avatar className="h-8 w-8 mt-1">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>

              {/* Input */}
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Input placeholder="Escribí un mensaje..." className="flex-1" />
                  <Button>Enviar</Button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">
                  La IA puede ayudarte a redactar respuestas. Revisá siempre antes de enviar.
                </p>
              </div>
            </CardContent>
          ) : (
            <CardContent className="flex items-center justify-center h-[calc(100vh-12rem)]">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-lg font-medium text-muted-foreground">
                  Seleccioná una conversación
                </p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Elegí un chat de la lista para ver los mensajes
                </p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
