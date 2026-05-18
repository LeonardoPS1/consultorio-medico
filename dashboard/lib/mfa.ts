// ============================================================
// 2FA / MFA - Autenticación de dos factores
// ============================================================

import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

const ISSUER = 'Consultorio Médico';

/**
 * Genera un secreto para 2FA
 */
export function generate2faSecret(): string {
  return speakeasy.generateSecret({ length: 20 }).base32;
}

/**
 * Verifica un código TOTP contra el secreto
 */
export function verify2faToken(token: string, secret: string): boolean {
  if (!token || !secret) return false;
  try {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: token.replace(/\s/g, ''),
      window: 1,
    });
  } catch {
    return false;
  }
}

/**
 * Genera la URL para Google Authenticator / Authy
 */
export function generateOtpAuthUrl(secret: string, email: string): string {
  return speakeasy.otpauthURL({
    secret,
    label: email,
    issuer: ISSUER,
    encoding: 'base32',
  });
}

/**
 * Genera un QR code en base64 para mostrar en el setup
 */
export async function generateQRCodeBase64(secret: string, email: string): Promise<string> {
  const otpauth = generateOtpAuthUrl(secret, email);
  return QRCode.toDataURL(otpauth, {
    width: 300,
    margin: 2,
    color: { dark: '#1a1a1a', light: '#ffffff' },
  });
}

/**
 * Genera códigos de respaldo (para cuando no tenés el celular)
 */
export function generateBackupCodes(count: number = 8): string[] {
  const codes: string[] = [];
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let i = 0; i < count; i++) {
    let code = '';
    for (let j = 0; j < 4; j++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    codes.push(code);
  }
  return codes;
}
