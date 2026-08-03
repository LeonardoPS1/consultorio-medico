-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 0003: platform.benchmark_snapshot — Benchmark anónimo entre clínicas
-- ══════════════════════════════════════════════════════════════════════════════
-- Almacena snapshots históricos de los promedios anónimos de ocupación,
-- no-show rate y NPS agrupados por rango de tamaño de clínica (bucket).
-- Nunca almacena datos por tenant individual: solo promedios por bucket.
-- ══════════════════════════════════════════════════════════════════════════════

-- ─── Tabla benchmark_snapshot ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform.benchmark_snapshot (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket_label VARCHAR(50) NOT NULL,          -- 'pequeña' | 'mediana' | 'grande' | 'muy grande'
    bucket_range TEXT NOT NULL,                 -- '0-99' | '100-499' | ... (solo para legibilidad)
    tenant_count INTEGER NOT NULL,              -- cuántas clínicas forman el promedio
    avg_no_show NUMERIC(5,2),                   -- promedio tasa no-show (0-100)
    avg_ocupacion NUMERIC(5,2),                 -- promedio ocupación (0-100)
    avg_nps NUMERIC(6,2),                       -- promedio NPS (-100..100)
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_benchmark_snapshot_created
    ON platform.benchmark_snapshot (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_benchmark_snapshot_bucket
    ON platform.benchmark_snapshot (bucket_label, created_at DESC);

COMMENT ON TABLE platform.benchmark_snapshot IS
    'Snapshots anónimos de benchmark agregado por bucket de tamaño. ' ||
    'Solo buckets con >= 5 tenants con datos suficientes son expuestos, ' ||
    'para evitar identificación indirecta de un tenant.';
COMMENT ON COLUMN platform.benchmark_snapshot.bucket_label IS
    'Rango de tamaño: pequeña (0-99 pac), mediana (100-499), grande (500-1499), muy grande (1500+)';
COMMENT ON COLUMN platform.benchmark_snapshot.tenant_count IS
    'Cantidad de clínicas incluidas en el promedio (umbral anti-inferencia: >= 5)';
