import { describe, it, expect } from 'vitest'
import { bucketForPacientes, agregarBenchmark, BenchmarkTenantMetric } from '@/lib/benchmark'

function tenant(overides: Partial<BenchmarkTenantMetric> & { tenantId: string; pacientesActivos: number }): BenchmarkTenantMetric {
  return {
    tenantNombre: overides.tenantId,
    totalTurnos: 50,
    noShows: 5,
    completados: 40,
    cancelados: 5,
    nps: 10,
    ...overides,
  } as BenchmarkTenantMetric
}

describe('bucketForPacientes (tamaño de clínica)', () => {
  it('asigna el bucket correcto por pacientes activos', () => {
    expect(bucketForPacientes(0).label).toBe('pequeña')
    expect(bucketForPacientes(50).label).toBe('pequeña')
    expect(bucketForPacientes(99).label).toBe('pequeña')
    expect(bucketForPacientes(100).label).toBe('mediana')
    expect(bucketForPacientes(499).label).toBe('mediana')
    expect(bucketForPacientes(500).label).toBe('grande')
    expect(bucketForPacientes(1499).label).toBe('grande')
    expect(bucketForPacientes(1500).label).toBe('muy grande')
    expect(bucketForPacientes(9999).label).toBe('muy grande')
  })

  it('reporta el rango correcto', () => {
    expect(bucketForPacientes(99).range).toBe('0-99')
    expect(bucketForPacientes(100).range).toBe('100-499')
    expect(bucketForPacientes(1500).range).toBe('1500+')
  })
})

describe('agregarBenchmark (regla anti-identificación >=5 tenants)', () => {
  it('expone un bucket solo si tiene >= 5 tenants con datos suficientes', () => {
    // 6 clínicas pequeñas → bucket EXPUESTO
    const metrics6 = Array.from({ length: 6 }, (_, i) =>
      tenant({ tenantId: `t-${i}`, pacientesActivos: 50 }),
    )
    const res6 = agregarBenchmark(metrics6)
    expect(res6.buckets.length).toBe(1)
    expect(res6.buckets[0].bucketLabel).toBe('pequeña')
    expect(res6.buckets[0].tenantCount).toBe(6)
    expect(res6.buckets[0].avgNoShow).toBeCloseTo(11.11, 1) // 5/45*100
    expect(res6.buckets[0].avgOcupacion).toBeCloseTo(90, 1) // (40+5)/(40+5+5)=90%
  })

  it('NO expone el bucket cuando hay menos de 5 tenants (< 5 → anti-inferencia)', () => {
    const metrics4 = Array.from({ length: 4 }, (_, i) =>
      tenant({ tenantId: `t-${i}`, pacientesActivos: 50 }),
    )
    const res4 = agregarBenchmark(metrics4)
    expect(res4.buckets.length).toBe(0) // NADA se muestra
  })

  it('excluye buckets con < 5 y conserva los que cumplen el umbral (mixto)', () => {
    // 5 medianas + 3 grandes → solo la mediana se expone
    const metrics = [
      ...Array.from({ length: 5 }, (_, i) =>
        tenant({ tenantId: `med-${i}`, pacientesActivos: 200 }),
      ),
      ...Array.from({ length: 3 }, (_, i) =>
        tenant({ tenantId: `gra-${i}`, pacientesActivos: 800 }),
      ),
    ]
    const res = agregarBenchmark(metrics)
    expect(res.buckets.length).toBe(1)
    expect(res.buckets[0].bucketLabel).toBe('mediana')
    expect(res.buckets[0].tenantCount).toBe(5)
  })

  it('maneja NPS nulo sin tirar (bucket con NPS nulo → avgNps null)', () => {
    const metrics = Array.from({ length: 6 }, (_, i) =>
      tenant({ tenantId: `t-${i}`, pacientesActivos: 50, nps: null }),
    )
    const res = agregarBenchmark(metrics)
    expect(res.buckets[0].avgNps).toBeNull()
  })
})
