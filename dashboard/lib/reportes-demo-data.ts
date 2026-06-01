/**
 * Datos demo para reportes — se usan como fallback cuando no hay DB disponible.
 * Muestra métricas realistas de un consultorio médico en funcionamiento.
 */

export function getDemoReportes(periodo: 'semana' | 'mes' | 'año') {
  const esAnual = periodo === 'año';
  const esSemana = periodo === 'semana';

  const etiquetas = esAnual
    ? ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun']
    : esSemana
      ? ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
      : ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'];

  // ─── Turnos por día ───────────────────────────────────────
  const turnos = etiquetas.map((label, i) => {
    const base = esAnual ? 40 : 8;
    const extra = i < (esAnual ? 5 : 3) ? 5 + i * 3 : 0;
    return {
      dia: label,
      cantidad: base + Math.round(Math.random() * 8) + extra,
      completados: Math.round(base * 0.6) + Math.round(Math.random() * 4) + Math.round(extra * 0.6),
      cancelados: 1 + Math.round(Math.random() * 2),
      ausentes: Math.round(Math.random() * 2),
    };
  });

  const totalTurnos = turnos.reduce((s: number, t: { cantidad: number }) => s + t.cantidad, 0);
  const totalCompletados = turnos.reduce((s: number, t: { completados: number }) => s + t.completados, 0);
  const totalCancelados = turnos.reduce((s: number, t: { cancelados: number }) => s + t.cancelados, 0);
  const ausentes = turnos.reduce((s: number, t: { ausentes: number }) => s + t.ausentes, 0);

  // ─── Distribución de estados ──────────────────────────────
  const distribucionEstados = [
    { estado: 'pendiente', valor: Math.max(0, totalTurnos - totalCompletados - totalCancelados - ausentes), color: '#f59e0b' },
    { estado: 'completado', valor: totalCompletados, color: '#22c55e' },
    { estado: 'cancelado', valor: totalCancelados, color: '#ef4444' },
    { estado: 'ausente', valor: ausentes, color: '#6b7280' },
  ];

  // ─── KPIs de turnos ──────────────────────────────────────
  const asistenciaPct = totalTurnos > 0 ? Math.round((totalCompletados / totalTurnos) * 100) : 85;
  const turnosKpis = {
    total: totalTurnos,
    asistencia: `${asistenciaPct}%`,
    duracion: '28 min',
    cambioTotal: '+12%',
  };

  // ─── Pacientes ────────────────────────────────────────────
  const totalPac = esAnual ? 486 : 156;
  const nuevos = esAnual ? 89 : 23;

  const nuevosPacientesLabels = etiquetas;
  const nuevosPacientes = etiquetas.map(() =>
    Math.max(1, Math.round(Math.random() * 7) + 1)
  );

  const pacientesKpis = {
    total: totalPac,
    nuevos,
    frecuentes: 42,
    edadPromedio: 45,
  };

  // ─── Volumen WhatsApp ────────────────────────────────────
  const volumenWhatsApp = etiquetas.map((label, i) => ({
    dia: label,
    recibidos: 10 + Math.round(Math.random() * 15) + i * 2,
    enviados: 8 + Math.round(Math.random() * 10) + i,
  }));

  const totalRecibidos = volumenWhatsApp.reduce((s: number, v: { recibidos: number }) => s + v.recibidos, 0);
  const totalEnviados = volumenWhatsApp.reduce((s: number, v: { enviados: number }) => s + v.enviados, 0);

  // ─── Canales de contacto ─────────────────────────────────
  const canalesContacto = [
    { canal: 'WhatsApp', porcentaje: 75 },
    { canal: 'Email', porcentaje: 15 },
    { canal: 'Teléfono', porcentaje: 8 },
    { canal: 'Presencial', porcentaje: 2 },
  ];

  // ─── Intenciones de mensajes ─────────────────────────────
  const intenciones = [
    { intencion: 'Reserva turno', cantidad: 45, porcentaje: 38 },
    { intencion: 'Consulta', cantidad: 28, porcentaje: 24 },
    { intencion: 'Cancelación', cantidad: 18, porcentaje: 15 },
    { intencion: 'Receta', cantidad: 15, porcentaje: 13 },
    { intencion: 'Urgencia', cantidad: 8, porcentaje: 7 },
    { intencion: 'Otros', cantidad: 4, porcentaje: 3 },
  ];

  // ─── Calidad de respuesta ────────────────────────────────
  const calidadRespuesta = {
    tasa: '94%',
    tiempo: '< 5 min',
    msgsPorConv: '3.2',
  };

  // ─── Métricas principales ─────────────────────────────────
  const metricas = [
    { titulo: 'Turnos', valor: String(totalTurnos), cambio: '+12% vs período anterior', icon: 'calendar', up: true },
    { titulo: 'Asistencia', valor: `${asistenciaPct}%`, cambio: `${totalCompletados} completados`, icon: 'users', up: totalCompletados > totalCancelados },
    { titulo: 'Nuevos Pacientes', valor: String(nuevos), cambio: 'en el período', icon: 'trending-up', up: true },
    { titulo: 'Conversaciones Activas', valor: String(Math.max(1, Math.floor(totalRecibidos / 5))), cambio: 'en atención', icon: 'message-square', up: true },
  ];

  // ─── WhatsApp KPIs ────────────────────────────────────────
  const whatsapp = [
    { titulo: 'Mensajes recibidos', valor: String(totalRecibidos), cambio: 'en el período', up: true },
    { titulo: 'Mensajes enviados', valor: String(totalEnviados), cambio: 'por IA', up: true },
    { titulo: 'Tasa de respuesta', valor: '94%', cambio: 'automática', up: true },
    { titulo: 'Conversaciones activas', valor: String(Math.max(1, Math.floor(totalRecibidos / 5))), cambio: 'en atención', up: true },
  ];

  // ─── Obra social ─────────────────────────────────────────
  const pacientesObraSocial = [
    { obra: 'OSDE', cantidad: 52 },
    { obra: 'Swiss Medical', cantidad: 38 },
    { obra: 'Galeno', cantidad: 31 },
    { obra: 'Particular', cantidad: 24 },
    { obra: 'Otras', cantidad: 11 },
  ];

  return {
    metricas,
    turnos,
    nuevosPacientes,
    turnosKpis,
    distribucionEstados,
    pacientesKpis,
    nuevosPacientesLabels,
    volumenWhatsApp,
    canalesContacto,
    calidadRespuesta,
    intenciones,
    whatsapp,
    pacientesObraSocial,
  };
}
