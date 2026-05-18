import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { getUserByEmail, createAdminUserIfNotExists } from '@/lib/data-store';
import { isAccountLocked, incrementFailedAttempts, resetFailedAttempts } from '@/lib/account-lockout';
import { verify2faToken } from '@/lib/mfa';
import { logAudit } from '@/lib/audit-log';

export const { handlers, auth, signIn, signOut } = NextAuth({
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
          const lockStatus = isAccountLocked(email);
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
            incrementFailedAttempts(email);
            throw new Error('Email o contraseña incorrectos');
          }

          const isValid = await compare(password, user.passwordHash);

          if (!isValid) {
            incrementFailedAttempts(email);
            const lockStatusAfter = isAccountLocked(email);
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

            if (!verify2faToken(token2fa, user.secreto2fa)) {
              throw new Error('Código 2FA incorrecto. Verificá la hora de tu celular.');
            }
          }

          // 3. Login exitoso → resetear contador + auditar
          resetFailedAttempts(email);

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
          };
        } catch (error) {
          if (error instanceof Error) {
            throw error;
          }
          console.error('[Auth] Error en authorize:', error);
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
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { role?: string; id?: string }).role = token.role;
        (session.user as { role?: string; id?: string }).id = token.id;
      }
      return session;
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
