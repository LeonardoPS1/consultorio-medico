'use client';

import { ArrowRight, MessageSquare } from 'lucide-react';
import { useState, useRef } from 'react';
import styles from './calculadora.module.css';

const CLP_FMT = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

function clp(n: number) {
  return CLP_FMT.format(Math.round(n));
}

/**
 *
 */
export default function CalculadoraAusentismo() {
  const [pacientes, setPacientes] = useState(180);
  const [tasa, setTasa] = useState(22);
  const [valor, setValor] = useState(25000);
  const [showResult, setShowResult] = useState(false);
  const resultadoRef = useRef<HTMLDivElement>(null);

  const turnosPerdidos = pacientes * (tasa / 100);
  const perdidaMes = turnosPerdidos * valor;
  const perdidaAnio = perdidaMes * 12;
  const recuperaMes = perdidaMes * 0.85;
  const recuperaAnio = perdidaAnio * 0.85;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowResult(true);
    setTimeout(() => {
      resultadoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const waText = `Hola, calculé mi pérdida por ausentismo: ${clp(perdidaMes)}/mes aprox. Quiero saber más sobre AicoreMed.`;
  const waLink = `https://wa.me/56975680702?text=${encodeURIComponent(waText)}`;

  return (
    <div className={styles.pageBody}>
      <div className={styles.wrap}>
        <svg className={styles.pulseLine} viewBox="0 0 190 34" fill="none" aria-hidden="true">
          <path d="M0 20 H55 L64 6 L74 30 L82 14 L90 20 H190" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>

        <span className={styles.eyebrow}>Calculadora clínica</span>
        <h1 className={styles.title}>
          ¿Cuánto le está costando <em>el ausentismo</em> a tu consultorio?
        </h1>
        <p className={styles.sub}>
          Completá 3 datos y calculá en segundos cuánto perdés al mes por pacientes que agendan y no llegan — y cuánto podrías recuperar automatizando recordatorios.
        </p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <p className={styles.formTitle}>Datos de tu consultorio</p>

          <div className={styles.field}>
            <label htmlFor="pacientes">Pacientes atendidos por mes</label>
            <div className={styles.row}>
              <div className={styles.numWrap}>
                <input
                  type="number"
                  id="pacientes"
                  min="1"
                  value={pacientes}
                  onChange={(e) => setPacientes(Math.max(1, parseInt(e.target.value) || 0))}
                  inputMode="numeric"
                  className="landing-input"
                />
              </div>
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="tasa">
              Tasa de inasistencia estimada <span className={styles.hint}>(no-show)</span>
            </label>
            <div className={styles.row}>
              <input
                type="range"
                id="tasa"
                min="5"
                max="50"
                value={tasa}
                step="1"
                onChange={(e) => setTasa(parseInt(e.target.value))}
                className="landing-input"
              />
              <span className={styles.pctBadge} id="tasa-badge">{tasa}%</span>
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="valor">Valor promedio de la consulta</label>
            <div className={styles.row}>
              <span className={styles.prefix}>CLP $</span>
              <div className={styles.numWrap}>
                <input
                  type="number"
                  id="valor"
                  min="1000"
                  step="1000"
                  value={valor}
                  onChange={(e) => setValor(Math.max(1000, parseInt(e.target.value) || 0))}
                  inputMode="numeric"
                  className="landing-input"
                />
              </div>
            </div>
          </div>

          <button type="submit" className={styles.calcBtn}>
            Calcular mi pérdida
            <ArrowRight width={16} height={16} aria-hidden="true" />
          </button>
        </form>

        <div
          ref={resultadoRef}
          id="resultado"
          className={`${styles.resultado} ${showResult ? styles.show : ''}`}
        >
          <div className={styles.report}>
            <div className={styles.reportInner}>
              <p className={styles.reportStamp}>Reporte — Estimación de ausentismo</p>
              <h2>Esto es lo que el no-show le cuesta a tu consultorio</h2>

              <p className={styles.turnosLine}>
                Con tus números, estimamos <strong>{Math.round(turnosPerdidos).toLocaleString('es-CL')}</strong> turnos perdidos al mes de <strong>{pacientes.toLocaleString('es-CL')}</strong> agendados.
              </p>

              <div className={styles.statGrid}>
                <div className={`${styles.stat} ${styles.loss}`}>
                  <div className={styles.statLabel}>Pérdida al mes</div>
                  <div className={styles.statValue} id="perdida-mes">{clp(perdidaMes)}</div>
                </div>
                <div className={`${styles.stat} ${styles.loss}`}>
                  <div className={styles.statLabel}>Pérdida al año</div>
                  <div className={styles.statValue} id="perdida-anio">{clp(perdidaAnio)}</div>
                </div>
                <div className={`${styles.stat} ${styles.gain}`}>
                  <div className={styles.statLabel}>Recuperable al mes*</div>
                  <div className={styles.statValue} id="recupera-mes">{clp(recuperaMes)}</div>
                </div>
                <div className={`${styles.stat} ${styles.gain}`}>
                  <div className={styles.statLabel}>Recuperable al año*</div>
                  <div className={styles.statValue} id="recupera-anio">{clp(recuperaAnio)}</div>
                </div>
              </div>

              <p className={styles.footnote}>
                *Estimado con una reducción del 85% del ausentismo, el promedio observado en consultorios con recordatorios automatizados por WhatsApp.
              </p>

              <div className={styles.cta}>
                <p>
                  <strong>AicoreMed</strong> automatiza tus recordatorios de turno por WhatsApp con IA, para que este número deje de ser una pérdida.
                </p>
                <div className={styles.ctaButtons}>
                  <a
                    className={`${styles.ctaLink} ${styles.primary}`}
                    href={waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageSquare width={16} height={16} aria-hidden="true" />
                    Hablar por WhatsApp
                  </a>
                  <a
                    className={`${styles.ctaLink} ${styles.secondary}`}
                    href="https://med.aicorebots.com"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Ver AicoreMed →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className={styles.footer}>
        <span>Hecho por <a href="https://aicorebots.com" target="_blank" rel="noopener noreferrer">Aicore Agency</a></span>
        <span>Herramienta gratuita — sin registro</span>
      </footer>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              var tasaInput = document.getElementById('tasa');
              var tasaBadge = document.getElementById('tasa-badge');
              if (tasaInput && tasaBadge) {
                tasaInput.addEventListener('input', function() {
                  tasaBadge.textContent = tasaInput.value + '%';
                });
              }
            })();
          `,
        }}
      />
    </div>
  );
}