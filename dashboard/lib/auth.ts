import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { getUserByEmail, createAdminUserIfNotExists } from '@/lib/data-store';
import { isAccountLocked, incrementFailedAttempts, resetFailedAttempts } from '@/lib/account-lockout';
import { verify2faToken } from '@/lib/mfa';
import { logAudit } from '@/lib/audit-log';
import { createHash } from 'crypto';
import { db } from '@/lib/db';
import { safeError } from '@/lib/logger';
import { usuarios } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
        token2fa: { label: 'Código 2FA', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email as string;
        const password = credentials.password as string;
        const token2fa = credentials.token2fa as string | undefined;

        try {
          // 1. Verificar si la cuenta está bloqueada por intentos fallidos
          const lockStatus = await isAccountLocked(email);
          if (lockStatus.locked) {
            throw new Error(
              'Demasiados intentos fallidos. Intentá de nuevo más tarde.'
            );
          }

          // Asegurar que existe el admin por si es primera vez
          await createAdminUserIfNotExists();

          // Buscar usuario (PostgreSQL o JSON fallback)
          const user = await getUserByEmail(email);

          if (!user) {
            await incrementFailedAttempts(email);
            throw new Error('Email o contraseña incorrectos');
          }

          const isValid = await compare(password, user.passwordHash);

          if (!isValid) {
            await incrementFailedAttempts(email);
            const lockStatusAfter = await isAccountLocked(email);
            if (lockStatusAfter.locked) {
              throw new Error(
                'Demasiados intentos fallidos. Intentá de nuevo más tarde.'
              );
            }
            throw new Error('Email o contraseña incorrectos');
          }

          // 2. Verificar 2FA si está activo
          if (user.activo2fa && user.secreto2fa) {
            if (!token2fa) {
              throw new Error('2FA_REQUIRED');
            }

            // Intentar verificación TOTP primero
            if (verify2faToken(token2fa, user.secreto2fa)) {
              // TOTP válido → todo ok
            } else if (user.backupCodes) {
              // Fallback: verificar contra códigos de respaldo hasheados
              let parsedCodes: string[] = [];
              try {
                parsedCodes = JSON.parse(user.backupCodes);
              } catch { /* formato inválido */ }

              const codeHash = createHash('sha256').update(token2fa.toUpperCase()).digest('hex');
              const idx = parsedCodes.indexOf(codeHash);

              if (idx === -1) {
                throw new Error('Código 2FA o código de respaldo incorrecto.');
              }

              // Backup code usado → eliminarlo (one-time use)
              parsedCodes.splice(idx, 1);
              await db
                .update(usuarios)
                .set({
                  backupCodes: parsedCodes.length > 0 ? JSON.stringify(parsedCodes) : null,
                })
                .where(eq(usuarios.email, email));
            } else {
              throw new Error('Código 2FA incorrecto. Verificá la hora de tu celular.');
            }
          }

          // 3. Login exitoso → resetear contador + auditar
          await resetFailedAttempts(email);

          logAudit({
            usuarioId: user.id,
            usuarioEmail: user.email,
            usuarioNombre: user.nombre,
            accion: 'login',
            entidad: 'usuario',
            entidadId: user.id,
          }).catch(() => {});

          return {
            id: user.id,
            email: user.email,
            name: user.nombre,
            role: user.rol,
            plan: user.plan || 'free',
            medicoId: user.medicoId,
          };
        } catch (error) {
          if (error instanceof Error) {
            throw error;
          }
          safeError('[Auth] Error en authorize:', error instanceof Error ? { message: error.message } : error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
        token.plan = user.plan;
        token.medicoId = user.medicoId;
      }
      // Refrescar plan y medicoId desde DB para que cambios post-pago apliquen sin re-login
      if (token.email && !user) {
        try {
          const dbUser = await getUserByEmail(token.email);
          if (dbUser) {
            if (dbUser.plan) token.plan = dbUser.plan;
            if (dbUser.medicoId) token.medicoId = dbUser.medicoId;
          }
        } catch {
          // Si falla la consulta, mantenemos los valores actuales del token
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role;
        if (token.id) session.user.id = token.id;
        if (token.plan) session.user.plan = token.plan;
        if (token.medicoId) session.user.medicoId = token.medicoId;
      }
      return session;
    },
  },
  events: {
    async signOut(message) {
      const token = 'token' in message ? message.token : null;
      if (token?.sub) {
        logAudit({
          usuarioId: token.sub,
          accion: 'logout',
          entidad: 'usuario',
          entidadId: token.sub,
        }).catch(() => {});
      }
    },
  },
  pages: {
    signIn: '/',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 60, // 30 minutos
    updateAge: 5 * 60, // Renovar cada 5 minutos de uso activo
  },
});
