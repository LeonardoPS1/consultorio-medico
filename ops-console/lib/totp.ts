import { authenticator } from 'otplib'
import QRCode from 'qrcode'

const APP_NAME = 'AicoreOps'

export function generateTotpSecret(): string {
  return authenticator.generateSecret()
}

export function generateTotpUri(secret: string, email: string): string {
  return authenticator.keyuri(email, APP_NAME, secret)
}

export async function generateTotpQrCode(uri: string): Promise<string> {
  return QRCode.toDataURL(uri)
}

export function verifyTotpCode(token: string, secret: string): boolean {
  try {
    return authenticator.check(token, secret)
  } catch {
    return false
  }
}
