import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id?: string;
      role?: string;
      plan?: string;
      medicoId?: string;
      tenantId?: string;
      isImpersonating?: boolean;
      impersonatedBy?: string;
      impersonatedByName?: string;
      impersonationMotivo?: string;
    } & DefaultSession['user'];
  }

  interface User {
    role?: string;
    plan?: string;
    medicoId?: string;
    tenantId?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: string;
    id?: string;
    plan?: string;
    medicoId?: string;
    tenantId?: string;
    isImpersonating?: boolean;
    impersonatedBy?: string;
    impersonatedByName?: string;
    impersonationMotivo?: string;
  }
}
