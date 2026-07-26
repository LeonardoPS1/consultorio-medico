import { describe, it, expect } from 'vitest'
import { loginBeginSchema, totpVerifySchema } from '../lib/validation'

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
