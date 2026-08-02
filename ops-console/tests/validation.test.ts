import { describe, it, expect } from 'vitest'
import { loginBeginSchema, totpVerifySchema, validateMotivo } from '../lib/validation'

describe('loginBeginSchema', () => {
  it('accepts valid email', () => {
    const result = loginBeginSchema.safeParse({ email: 'test@example.com' })
    expect(result.success).toBe(true)
  })

  it('rejects empty body', () => {
    const result = loginBeginSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects invalid email', () => {
    const result = loginBeginSchema.safeParse({ email: 'invalid' })
    expect(result.success).toBe(false)
  })

  it('rejects non-string email', () => {
    const result = loginBeginSchema.safeParse({ email: 123 })
    expect(result.success).toBe(false)
  })
})

describe('totpVerifySchema', () => {
  it('accepts valid 6-digit code', () => {
    const result = totpVerifySchema.safeParse({ email: 'test@example.com', token: '123456' })
    expect(result.success).toBe(true)
  })

  it('rejects short code', () => {
    const result = totpVerifySchema.safeParse({ email: 'test@example.com', token: '12345' })
    expect(result.success).toBe(false)
  })

  it('rejects non-numeric code', () => {
    const result = totpVerifySchema.safeParse({ email: 'test@example.com', token: 'abc123' })
    expect(result.success).toBe(false)
  })

  it('rejects missing token', () => {
    const result = totpVerifySchema.safeParse({ email: 'test@example.com' })
    expect(result.success).toBe(false)
  })
})

describe('validateMotivo', () => {
  it('rejects empty motivo', () => {
    expect(validateMotivo('')).toBe('El motivo es obligatorio')
    expect(validateMotivo('   ')).toBe('El motivo es obligatorio')
  })

  it('rejects non-string motivo', () => {
    expect(validateMotivo(123)).toBe('El campo motivo es obligatorio')
    expect(validateMotivo(undefined)).toBe('El campo motivo es obligatorio')
  })

  it('rejects motivo shorter than 10 chars', () => {
    const result = validateMotivo('soporte')
    expect(result).toBe('El motivo debe tener al menos 10 caracteres')
  })

  it('rejects motivo with 10 chars after trimming whitespace', () => {
    const result = validateMotivo('   soporte   ')
    expect(result).toBe('El motivo debe tener al menos 10 caracteres')
  })

  it('accepts motivo with exactly 10 chars', () => {
    expect(validateMotivo('abcdefghij')).toBeNull()
  })

  it('rejects motivo longer than 500 chars', () => {
    const long = 'a'.repeat(501)
    expect(validateMotivo(long)).toBe('El motivo no puede exceder 500 caracteres')
  })

  it('accepts valid motivo of 500 chars', () => {
    const long = 'a'.repeat(500)
    expect(validateMotivo(long)).toBeNull()
  })
})
