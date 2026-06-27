'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import type { PatientPanelData, PatientSummaryLite } from '@/lib/types/patient-panel';

/** Staleness threshold: 5 minutes */
const STALE_MS = 5 * 60 * 1000;

interface PatientPanelState {
  /** Whether the sheet is open */
  isOpen: boolean;
  /** Currently active patient (null = show search) */
  data: PatientPanelData | null;
  /** Loading state for detail fetch */
  isLoadingDetail: boolean;
}

interface PatientPanelActions {
  /** Open the sheet (optionally with a pre-selected patient) */
  open: (patient?: PatientSummaryLite) => void;
  /** Close the sheet entirely */
  close: () => void;
  /** Select a patient and fetch their detail */
  selectPatient: (patient: PatientSummaryLite) => void;
  /** Clear the active patient (go back to search) */
  clearPatient: () => void;
  /** Refresh detail data if stale */
  refreshIfStale: () => void;
}

type PatientPanelContextValue = PatientPanelState & PatientPanelActions;

const PatientPanelContext = createContext<PatientPanelContextValue | null>(null);

/** Fetch full panel detail data for a patient */
async function fetchPanelData(patientId: string): Promise<Omit<PatientPanelData, 'patient'>> {
  const [detailRes, soapRes] = await Promise.allSettled([
    fetch(`/api/pacientes/${patientId}/detalle`),
    fetch(`/api/pacientes/${patientId}/notas-soap?limit=1`),
  ]);

  // Parse detail
  let activeRecetas: PatientPanelData['activeRecetas'] = [];
  let upcomingTurnos: PatientPanelData['upcomingTurnos'] = [];

  if (detailRes.status === 'fulfilled' && detailRes.value.ok) {
    const detail = await detailRes.value.json();
    const d = detail.data;
    if (d) {
      activeRecetas = (d.recetas || [])
        .filter((r: { estado: string }) => r.estado === 'activa')
        .slice(0, 5);
      upcomingTurnos = (d.turnos || [])
        .filter((t: { fechaHora: string; estado: string }) => {
          const turnoDate = new Date(t.fechaHora);
          return turnoDate >= new Date() && t.estado !== 'cancelado' && t.estado !== 'no_asistio';
        })
        .slice(0, 5);
    }
  }

  // Parse last SOAP
  let lastSoap: PatientPanelData['lastSoap'] = null;
  if (soapRes.status === 'fulfilled' && soapRes.value.ok) {
    const soapJson = await soapRes.value.json();
    const notes = soapJson.data || soapJson;
    if (Array.isArray(notes) && notes.length > 0) {
      const n = notes[0];
      lastSoap = {
        id: n.id,
        subjetivo: n.subjetivo ?? null,
        objetivo: n.objetivo ?? null,
        assessment: n.assessment ?? null,
        plan: n.plan ?? null,
        cie10Codigo: n.cie10Codigo ?? null,
        cie10Descripcion: n.cie10Descripcion ?? null,
        createdAt: n.createdAt,
        medicoNombre: n.medicoNombre ?? null,
      };
    }
  }

  return { lastSoap, activeRecetas, upcomingTurnos, loadedAt: Date.now() };
}

export function PatientPanelProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PatientPanelState>({
    isOpen: false,
    data: null,
    isLoadingDetail: false,
  });

  const abortRef = useRef<AbortController | null>(null);

  const open = useCallback((patient?: PatientSummaryLite) => {
    setState((prev) => ({ ...prev, isOpen: true }));
    if (patient) {
      // Select patient immediately, fetch detail in background
      selectPatient(patient);
    }
  }, []);

  const close = useCallback(() => {
    abortRef.current?.abort();
    setState({ isOpen: false, data: null, isLoadingDetail: false });
  }, []);

  const selectPatient = useCallback(async (patient: PatientSummaryLite) => {
    // Set lite data immediately
    const panelData: PatientPanelData = {
      patient,
      lastSoap: null,
      activeRecetas: [],
      upcomingTurnos: [],
      loadedAt: 0,
    };
    setState((prev) => ({ ...prev, data: panelData, isLoadingDetail: true, isOpen: true }));

    // Fetch detail
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const detail = await fetchPanelData(patient.id);
      if (!controller.signal.aborted) {
        setState((prev) => ({
          ...prev,
          data: { ...panelData, ...detail },
          isLoadingDetail: false,
        }));
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        setState((prev) => ({ ...prev, isLoadingDetail: false }));
        console.error('[PatientPanel] Error fetching detail:', err);
      }
    }
  }, []);

  const clearPatient = useCallback(() => {
    setState((prev) => ({ ...prev, data: null }));
  }, []);

  const refreshIfStale = useCallback(() => {
    if (!state.data) return;
    if (Date.now() - state.data.loadedAt > STALE_MS) {
      selectPatient(state.data.patient);
    }
  }, [state.data, selectPatient]);

  return (
    <PatientPanelContext.Provider
      value={{ ...state, open, close, selectPatient, clearPatient, refreshIfStale }}
    >
      {children}
    </PatientPanelContext.Provider>
  );
}

/** Hook to access patient panel state & actions */
export function usePatientPanel() {
  const ctx = useContext(PatientPanelContext);
  if (!ctx) throw new Error('usePatientPanel must be used within PatientPanelProvider');
  return ctx;
}
