import { DefaultSession } from 'next-auth';
import { JWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id?: string;
      role?: string;
      plan?: string;
    } & DefaultSession['user'];
  }

  interface User {
    role?: string;
    plan?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: string;
    id?: string;
    plan?: string;
  }
}
