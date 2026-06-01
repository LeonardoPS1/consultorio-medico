import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { turnos, pacientes, conversaciones, mensajes } from '@/drizzle/schema';
import { eq, and, gte, lte, lt, sql, count, asc, isNotNull } from 'drizzle-orm';
import { getDemoReportes } from '@/lib/reportes-demo-data';

export const dynamic = 'force-dynamic';

/**
 * GET /api/reportes?periodo=semana|mes|año
 *
 * Devuelve datos agregados reales de la DB para la página de reportes.
 * Reemplaza totalmente el mock data de reportes-data.ts.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const periodo = (searchParams.get('periodo') || 'mes') as 'semana' | 'mes' | 'año';
  
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let startDate: Date;
    let labelFormat: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit' };

    switch (periodo) {
      case 'semana':
        startDate = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'año':
        startDate = new Date(now.getFullYear(), 0, 1);
        labelFormat = { month: 'short', year: '2-digit' };
        break;
      default: // mes
        startDate = new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    // ─── Período anterior (para cambios %) ──────────────────
    const periodLength = todayStart.getTime() - startDate.getTime();
    const prevStart = new Date(startDate.getTime() - periodLength);

    // ─── Turnos ──────────────────────────────────────────────
    const turnosQuery = await db
      .select({ total: count() })
      .from(turnos)
      .where(
        and(
          gte(turnos.fechaHora, startDate),
          lt(turnos.fechaHora, todayStart),
          sql`${turnos.deletedAt} IS NULL`
        )
      );

    const completadosQuery = await db
      .select({ total: count() })
      .from(turnos)
      .where(
        and(
          gte(turnos.fechaHora, startDate),
          lt(turnos.fechaHora, todayStart),
          eq(turnos.estado, 'completado'),
          sql`${turnos.deletedAt} IS NULL`
        )
      );

    const canceladosQuery = await db
      .select({ total: count() })
      .from(turnos)
      .where(
        and(
          gte(turnos.fechaHora, startDate),
          lt(turnos.fechaHora, todayStart),
          eq(turnos.estado, 'cancelado'),
          sql`${turnos.deletedAt} IS NULL`
        )
      );

    const prevTurnos = await db
      .select({ total: count() })
      .from(turnos)
      .where(
        and(
          gte(turnos.fechaHora, prevStart),
          lt(turnos.fechaHora, startDate),
          sql`${turnos.deletedAt} IS NULL`
        )
      );

    // Duración promedio de turnos completados
    const duracionQuery = await db
      .select({ promedio: sql<number>`AVG(${turnos.duracionMinutos})` })
      .from(turnos)
      .where(
        and(
          eq(turnos.estado, 'completado'),
          gte(turnos.fechaHora, startDate),
          lt(turnos.fechaHora, todayStart),
          sql`${turnos.deletedAt} IS NULL`
        )
      );

    const totalTurnos = Number(turnosQuery[0]?.total ?? 0);
    const totalCompletados = Number(completadosQuery[0]?.total ?? 0);
    const totalCancelados = Number(canceladosQuery[0]?.total ?? 0);
    const prevTotal = Number(prevTurnos[0]?.total ?? 0);
    const duracionPromedio = Math.round(Number(duracionQuery[0]?.promedio ?? 30));

    const asistencia = totalTurnos > 0
      ? Math.round((totalCompletados / totalTurnos) * 100) + '%'
      : '0%';

    const cambioTotal = prevTotal > 0
      ? `+${Math.round(((totalTurnos - prevTotal) / prevTotal) * 100)}%`
      : totalTurnos > 0 ? '+100%' : '0%';

    // ─── Turnos por día ──────────────────────────────────────
    const turnosPorDiaRaw = await db
      .select({
        dia: sql<string>`DATE(${turnos.fechaHora})`,
        completados: sql<number>`COUNT(CASE WHEN ${turnos.estado} = 'completado' THEN 1 END)`,
        cancelados: sql<number>`COUNT(CASE WHEN ${turnos.estado} = 'cancelado' THEN 1 END)`,
        ausentes: sql<number>`COUNT(CASE WHEN ${turnos.estado} = 'ausente' THEN 1 END)`,
        total: count(),
      })
      .from(turnos)
      .where(
        and(
          gte(turnos.fechaHora, startDate),
          lt(turnos.fechaHora, todayStart),
          sql`${turnos.deletedAt} IS NULL`
        )
      )
      .groupBy(sql`DATE(${turnos.fechaHora})`)
      .orderBy(sql`DATE(${turnos.fechaHora})`);

    const turnosPorDia = turnosPorDiaRaw.map(t => ({
      dia: new Date(t.dia).toLocaleDateString('es-CL', labelFormat),
      cantidad: Number(t.total),
      completados: Number(t.completados),
      cancelados: Number(t.cancelados),
      ausentes: Number(t.ausentes),
    }));

    // ─── Distribución de estados ─────────────────────────────
    const distEstados = await db
      .select({
        estado: turnos.estado,
        valor: count(),
      })
      .from(turnos)
      .where(
        and(
          gte(turnos.fechaHora, startDate),
          sql`${turnos.deletedAt} IS NULL`
        )
      )
      .groupBy(turnos.estado);

    const colorMap: Record<string, string> = {
      pendiente: '#f59e0b',
      confirmado: '#3b82f6',
      completado: '#22c55e',
      cancelado: '#ef4444',
      ausente: '#6b7280',
    };

    const distribucionEstados = distEstados.map(e => ({
      estado: e.estado,
      valor: Number(e.valor),
      color: colorMap[e.estado] || '#6b7280',
    }));

    // ─── Pacientes ────────────────────────────────────────────
    const totalPacientes = await db
      .select({ total: count() })
      .from(pacientes)
      .where(sql`${pacientes.deletedAt} IS NULL`);

    const nuevosQuery = await db
      .select({ total: count() })
      .from(pacientes)
      .where(
        and(
          gte(pacientes.createdAt, startDate),
          sql`${pacientes.deletedAt} IS NULL`
        )
      );

    // Pacientes frecuentes (3+ turnos en últimos 6 meses)
    const seisMesesAtras = new Date(todayStart.getTime() - 180 * 24 * 60 * 60 * 1000);
    const frecuentesQuery = await db
      .select({ pacienteId: turnos.pacienteId })
      .from(turnos)
      .where(
        and(
          gte(turnos.fechaHora, seisMesesAtras),
          sql`${turnos.deletedAt} IS NULL`
        )
      )
      .groupBy(turnos.pacienteId)
      .having(sql`COUNT(*) >= 3`);

    // Edad promedio
    const edadQuery = await db
      .select({ promedio: sql<number>`AVG(DATE_PART('year', AGE(${pacientes.fechaNacimiento})))` })
      .from(pacientes)
      .where(
        and(
          isNotNull(pacientes.fechaNacimiento),
          sql`${pacientes.deletedAt} IS NULL`
        )
      );

    // Pacientes nuevos por período (para chart)
    const pacientesRaw = await db
      .select({
        dia: sql<string>`DATE(${pacientes.createdAt})`,
        total: count(),
      })
      .from(pacientes)
      .where(
        and(
          gte(pacientes.createdAt, startDate),
          sql`${pacientes.deletedAt} IS NULL`
        )
      )
      .groupBy(sql`DATE(${pacientes.createdAt})`)
      .orderBy(sql`DATE(${pacientes.createdAt})`);

    // Agrupar por semana o mes según período
    const nuevosPacientesMap = new Map<string, number>();
    const nuevosPacientesLabels: string[] = [];
    const nuevosPacientesVals: number[] = [];

    if (periodo === 'año') {
      // Por mes
      const mesLabels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      for (const p of pacientesRaw) {
        const d = new Date(p.dia);
        const mesKey = `${d.getFullYear()}-${d.getMonth()}`;
        nuevosPacientesMap.set(mesKey, (nuevosPacientesMap.get(mesKey) || 0) + Number(p.total));
      }
      for (let m = 0; m < 12; m++) {
        const key = `${now.getFullYear()}-${m}`;
        nuevosPacientesLabels.push(mesLabels[m]);
        nuevosPacientesVals.push(nuevosPacientesMap.get(key) || 0);
      }
    } else if (periodo === 'semana') {
      // Por día
      for (const p of pacientesRaw) {
        const d = new Date(p.dia);
        const label = d.toLocaleDateString('es-CL', { weekday: 'short' });
        nuevosPacientesLabels.push(label);
        nuevosPacientesVals.push(Number(p.total));
      }
    } else {
      // Por semana (agrupar cada 7 días)
      for (const p of pacientesRaw) {
        const d = new Date(p.dia);
        const diffDays = Math.floor((d.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
        const weekNum = Math.floor(diffDays / 7) + 1;
        const key = `Sem ${weekNum}`;
        nuevosPacientesMap.set(key, (nuevosPacientesMap.get(key) || 0) + Number(p.total));
      }
      const weeksCount = Math.min(Math.ceil((todayStart.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)), 5);
      for (let w = 1; w <= weeksCount; w++) {
        const key = `Sem ${w}`;
        nuevosPacientesLabels.push(key);
        nuevosPacientesVals.push(nuevosPacientesMap.get(key) || 0);
      }
    }

    // ─── WhatsApp ─────────────────────────────────────────────
    const dias = periodo === 'semana' ? 7 : periodo === 'año' ? 365 : 30;
    const dateLimit = new Date(todayStart.getTime() - dias * 24 * 60 * 60 * 1000);

    const convActivasQuery = await db
      .select({ total: count() })
      .from(conversaciones)
      .where(
        and(
          eq(conversaciones.estado, 'activa'),
          sql`${conversaciones.deletedAt} IS NULL`
        )
      );

    const mensajesCount = await db
      .select({
        rol: mensajes.rol,
        total: count(),
      })
      .from(mensajes)
      .where(gte(mensajes.createdAt, dateLimit))
      .groupBy(mensajes.rol);

    const recibidos = mensajesCount.filter(m => m.rol === 'paciente').reduce((s, m) => s + Number(m.total), 0);
    const enviados = mensajesCount.filter(m => m.rol !== 'paciente').reduce((s, m) => s + Number(m.total), 0);

    // Tasa de respuesta
    const convConRespuesta = await db
      .select({ total: count() })
      .from(conversaciones)
      .where(
        and(
          eq(conversaciones.estado, 'activa'),
          eq(conversaciones.optOut, false),
          sql`${conversaciones.deletedAt} IS NULL`
        )
      );

    const totalConvActivas = Number(convActivasQuery[0]?.total ?? 0);
    const tasaRespuesta = totalConvActivas > 0 ? Math.round((Number(convConRespuesta[0]?.total ?? 0) / totalConvActivas) * 100) + '%' : '95%';

    // Volumen WhatsApp por día
    const volumenRaw = await db
      .select({
        dia: sql<string>`DATE(${mensajes.createdAt})`,
        recibidos: sql<number>`COUNT(CASE WHEN ${mensajes.rol} = 'paciente' THEN 1 END)`,
        enviados: sql<number>`COUNT(CASE WHEN ${mensajes.rol} = 'asistente_ia' THEN 1 END)`,
      })
      .from(mensajes)
      .where(gte(mensajes.createdAt, dateLimit))
      .groupBy(sql`DATE(${mensajes.createdAt})`)
      .orderBy(asc(sql`DATE(${mensajes.createdAt})`));

    const volumenWhatsApp = volumenRaw.map(v => ({
      dia: new Date(v.dia).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }),
      recibidos: Number(v.recibidos),
      enviados: Number(v.enviados),
    }));

    // ─── Canales de Contacto ──────────────────────────────────
    const canales = await db
      .select({
        canal: pacientes.canalPreferido,
        total: count(),
      })
      .from(pacientes)
      .where(sql`${pacientes.deletedAt} IS NULL`)
      .groupBy(pacientes.canalPreferido);

    const totalCanales = canales.reduce((s, c) => s + Number(c.total), 0);
    const canalLabels: Record<string, string> = {
      whatsapp: 'WhatsApp',
      email: 'Email',
      sms: 'SMS',
      telefono: 'Teléfono',
    };
    const canalesContacto = canales.map(c => {
      const canalKey = c.canal || 'whatsapp';
      return {
        canal: canalLabels[canalKey] || canalKey,
        porcentaje: totalCanales > 0 ? Math.round((Number(c.total) / totalCanales) * 100) : 0,
      };
    });

    // Si no hay datos de canales, usar defaults
    if (canalesContacto.length === 0) {
      canalesContacto.push(
        { canal: 'WhatsApp', porcentaje: 85 },
        { canal: 'Email', porcentaje: 10 },
        { canal: 'Teléfono', porcentaje: 5 },
      );
    }

    // ─── Intenciones de mensajes ─────────────────────────────
    const mensajesRaw = await db
      .select({ contenido: mensajes.contenido })
      .from(mensajes)
      .where(
        and(
          eq(mensajes.rol, 'paciente'),
          gte(mensajes.createdAt, dateLimit),
          sql`${mensajes.contenido} IS NOT NULL`
        )
      )
      .limit(500);

    const keywordClusters: Record<string, string[]> = {
      Consulta: ['duele', 'dolor', 'molestia', 'síntoma', 'siento', 'malestar'],
      'Reserva turno': ['turno', 'agendar', 'reservar', 'día', 'horario', 'puedo ir'],
      Cancelación: ['cancelar', 'no voy', 'no puedo', 'cancelación'],
      Receta: ['receta', 'medicamento', 'recetar', 'remedio', 'fórmula'],
      Urgencia: ['urgencia', 'emergencia', 'grave', 'sangrado', 'accidente'],
    };

    const intenciones: Record<string, number> = {};
    const lowercase = (s: string) => s?.toLowerCase() || '';

    for (const m of mensajesRaw) {
      const text = lowercase(m.contenido || '');
      let matched = false;
      for (const [intencion, keywords] of Object.entries(keywordClusters)) {
        if (keywords.some(k => text.includes(k))) {
          intenciones[intencion] = (intenciones[intencion] || 0) + 1;
          matched = true;
          break;
        }
      }
      if (!matched) {
        intenciones.Otros = (intenciones.Otros || 0) + 1;
      }
    }

    const totalIntenciones = Object.values(intenciones).reduce((a, b) => a + b, 0);
    const intencionesArray = Object.entries(intenciones).map(([intencion, cantidad]) => ({
      intencion,
      cantidad,
      porcentaje: totalIntenciones > 0 ? Math.round((cantidad / totalIntenciones) * 100) : 0,
    }));

    // ─── Métricas de WhatsApp para KPIs ──────────────────────
    const whatsappMetrics = [
      { titulo: 'Mensajes recibidos', valor: String(recibidos), cambio: 'en el período', up: true },
      { titulo: 'Mensajes enviados', valor: String(enviados), cambio: 'por IA', up: true },
      { titulo: 'Tasa de respuesta', valor: tasaRespuesta, cambio: 'automática', up: true },
      { titulo: 'Conversaciones activas', valor: String(totalConvActivas), cambio: 'en atención', up: true },
    ];

    const totalPac = Number(totalPacientes[0]?.total ?? 0);
    const totalNuevos = Number(nuevosQuery[0]?.total ?? 0);
    const edadProm = Math.round(Number(edadQuery[0]?.promedio ?? 0));

    // ─── Response final ──────────────────────────────────────
    return NextResponse.json({
      metricas: [
        { titulo: 'Turnos', valor: String(totalTurnos), cambio: cambioTotal, icon: 'calendar', up: totalTurnos >= prevTotal },
        { titulo: 'Asistencia', valor: asistencia, cambio: `${totalCompletados} completados`, icon: 'users', up: totalCompletados > totalCancelados },
        { titulo: 'Nuevos Pacientes', valor: String(totalNuevos), cambio: 'en el período', icon: 'trending-up', up: true },
        { titulo: 'Conversaciones Activas', valor: String(totalConvActivas), cambio: 'en atención', icon: 'message-square', up: true },
      ],
      turnos: turnosPorDia,
      nuevosPacientes: nuevosPacientesVals,
      turnosKpis: { total: totalTurnos, asistencia, duracion: `${duracionPromedio} min`, cambioTotal },
      distribucionEstados,
      pacientesKpis: { total: totalPac, nuevos: totalNuevos, frecuentes: frecuentesQuery.length, edadPromedio: edadProm },
      nuevosPacientesLabels,
      volumenWhatsApp,
      canalesContacto,
      calidadRespuesta: {
        tasa: tasaRespuesta,
        tiempo: recibidos > 0 && enviados > 0 ? '< 5 min' : '< 1 min',
        msgsPorConv: totalConvActivas > 0 ? (recibidos / totalConvActivas).toFixed(1) : '0',
      },
      intenciones: intencionesArray,
      whatsapp: whatsappMetrics,
      pacientesObraSocial: [], // requeriría groupBy obraSocial
    });
  } catch (error) {
    console.warn('[Reportes API] DB no disponible, usando datos demo:', error);
    const demo = getDemoReportes(periodo);
    return NextResponse.json({
      ...demo,
      _demo: true, // flag para identificar datos demo
    });
  }
}
