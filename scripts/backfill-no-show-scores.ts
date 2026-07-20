#!/usr/bin/env tsx
/**
 * Backfill script para calcular scores de no-show en turnos existentes.
 * 
 * Uso: npx tsx scripts/backfill-no-show-scores.ts
 * 
 * Este script:
 * 1. Obtiene todos los turnos próximos (próximos 30 días) en estados 'pendiente' o 'confirmada'
 * 2. Calcula el score de riesgo por paciente usando calcularScoreBulk
 * 3. Actualiza los turnos con risk_score, risk_nivel y risk_calculated_at
 * 4. Reporta estadísticas de actualización
 */

import { db } from '../dashboard/lib/db';
import { turnos } from '../dashboard/drizzle/schema';
import { eq, and, gte, lte, isNull, inArray } from 'drizzle-orm';
import { actualizarScoresTurnosProximos } from '../dashboard/lib/services/scoring-pacientes';

async function backfillScores() {
  console.log('🚀 Iniciando backfill de scores de no-show...');
  
  const startTime = Date.now();
  
  try {
    // Ejecutar la actualización para todas las sucursales (sin filtro de sucursal)
    const resultado = await actualizarScoresTurnosProximos({
      diasAntelacion: 30, // Próximos 30 días
    });
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('✅ Backfill completado:');
    console.log(`   - Turnos actualizados: ${resultado.actualizados}`);
    console.log(`   - Errores: ${resultado.errores}`);
    console.log(`   - Duración: ${duration}s`);
    
    if (resultado.errores > 0) {
      console.warn('⚠️  Hubo errores en algunos turnos. Revisar logs.');
      process.exit(1);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en backfill:', error);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
backfillScores();