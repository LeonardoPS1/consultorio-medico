import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type VerifiedRegistrationResponse,
  type VerifiedAuthenticationResponse,
} from '@simplewebauthn/server'

type AuthenticatorTransport = 'ble' | 'internal' | 'nfc' | 'usb' | 'hybrid'

const RP_NAME = 'AicoreOps'
const RP_ID = process.env.NEXT_PUBLIC_APP_URL
  ? new URL(process.env.NEXT_PUBLIC_APP_URL).hostname
  : 'ops.aicorebots.com'
const ORIGIN = process.env.NEXT_PUBLIC_APP_URL || `https://${RP_ID}`

export interface PasskeyCredential {
  id: string
  publicKey: string
  counter: number
  transports: AuthenticatorTransport[]
}

export async function generateRegistration(
  email: string,
  nombre: string,
  existingCredentials: PasskeyCredential[]
) {
  return generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userName: email,
    userDisplayName: nombre,
    attestationType: 'none',
    excludeCredentials: existingCredentials.map(c => ({
      id: c.id,
      transports: c.transports,
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
  })
}

export async function verifyRegistration(
  response: any,
  challenge: string,
  expectedOrigin?: string,
  expectedRpId?: string
): Promise<VerifiedRegistrationResponse> {
  return verifyRegistrationResponse({
    response,
    expectedChallenge: challenge,
    expectedOrigin: expectedOrigin || ORIGIN,
    expectedRPID: expectedRpId || RP_ID,
  })
}

export async function generateLogin(
  existingCredentials: PasskeyCredential[]
) {
  return generateAuthenticationOptions({
    rpID: RP_ID,
    allowCredentials: existingCredentials.map(c => ({
      id: c.id,
      transports: c.transports,
    })),
    userVerification: 'preferred',
  })
}

export async function verifyLogin(
  response: any,
  challenge: string,
  credentialData: {
    credentialId: string
    publicKey: string
    counter: number
    transports: AuthenticatorTransport[]
  },
  expectedOrigin?: string,
  expectedRpId?: string
): Promise<VerifiedAuthenticationResponse> {
  return verifyAuthenticationResponse({
    response,
    expectedChallenge: challenge,
    expectedOrigin: expectedOrigin || ORIGIN,
    expectedRPID: expectedRpId || RP_ID,
    authenticator: {
      credentialID: credentialData.credentialId,
      credentialPublicKey: Uint8Array.from(
        atob(credentialData.publicKey),
        c => c.charCodeAt(0)
      ),
      counter: Number(credentialData.counter),
      transports: credentialData.transports,
    },
  })
}
