import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/ollama', () => ({
  ollamaChat: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  safeLog: vi.fn(),
  safeWarn: vi.fn(),
  safeError: vi.fn(),
}));

import { ollamaChat } from '@/lib/ollama';
import { sugerirCie10, generarResumenLongitudinal } from '@/lib/ai-clinical';

const mockedOllamaChat = vi.mocked(ollamaChat);

beforeEach(() => {
  mockedOllamaChat.mockReset();
});

describe('sugerirCie10', () => {
  it('devuelve [] si el assessment está vacío', async () => {
    const result = await sugerirCie10('');
    expect(result).toEqual([]);
    expect(mockedOllamaChat).not.toHaveBeenCalled();
  });

  it('parsea un array JSON de sugerencias y valida códigos', async () => {
    mockedOllamaChat.mockResolvedValue({
      content: '[{"codigo":"E11.9","descripcion":"DM no insulinodependiente"},{"codigo":"I10","descripcion":"HTA"}]',
      success: true,
      error: undefined,
      sourceUrl: 'http://localhost:11434',
    });
    const result = await sugerirCie10('Diabetes mellitus tipo 2, hipertensión arterial');
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0]).toMatchObject({ codigo: expect.stringMatching(/^[A-Z]\d{2}/) });
  });

  it('descarta códigos malformados', async () => {
    mockedOllamaChat.mockResolvedValue({
      content: '[{"codigo":"garbage","descripcion":"x"},{"codigo":"J06.9","descripcion":"IRA"}]',
      success: true,
      error: undefined,
      sourceUrl: 'http://localhost:11434',
    });
    const result = await sugerirCie10('Infección respiratoria aguda');
    expect(result.length).toBe(1);
    expect(result[0].codigo).toBe('J06.9');
  });

  it('devuelve [] (fail-open) si Ollama falla', async () => {
    mockedOllamaChat.mockResolvedValue({
      content: '',
      success: false,
      error: 'connection refused',
      sourceUrl: 'http://localhost:11434',
    });
    const result = await sugerirCie10('Diagnóstico de prueba');
    expect(result).toEqual([]);
  });

  it('devuelve [] (fail-open) si el JSON es inválido', async () => {
    mockedOllamaChat.mockResolvedValue({
      content: 'no json aquí',
      success: true,
      error: undefined,
      sourceUrl: 'http://localhost:11434',
    });
    const result = await sugerirCie10('Diagnóstico de prueba');
    expect(result).toEqual([]);
  });
});

describe('generarResumenLongitudinal', () => {
  it('devuelve string vacío si no hay notas', async () => {
    const result = await generarResumenLongitudinal({ notas: [] });
    expect(result).toBe('');
    expect(mockedOllamaChat).not.toHaveBeenCalled();
  });

  it('devuelve string vacío (fail-open) si Ollama falla', async () => {
    mockedOllamaChat.mockResolvedValue({
      content: '',
      success: false,
      error: 'timeout',
      sourceUrl: 'http://localhost:11434',
    });
    const result = await generarResumenLongitudinal({
      notas: [{ assessment: 'Cefalea' }, { assessment: 'Migraña' }],
      alergias: 'Ninguna',
    });
    expect(result).toBe('');
  });

  it('genera un resumen en prosa cuando Ollama responde', async () => {
    mockedOllamaChat.mockResolvedValue({
      content: 'Paciente con cefalea recurrente tipo migraña. Evoluciona con tratamiento. Sin alergias registradas.',
      success: true,
      error: undefined,
      sourceUrl: 'http://localhost:11434',
    });
    const result = await generarResumenLongitudinal({
      notas: [{ assessment: 'Cefalea' }, { assessment: 'Migraña' }],
    });
    expect(result.length).toBeGreaterThan(10);
  });
});
