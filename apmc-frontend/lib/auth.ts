import 'server-only';
import { SignJWT, jwtVerify } from 'jose';

export type UserRole = 'doctor' | 'opd_head' | 'admin';

export interface SessionPayload {
  role: UserRole;
  username: string;
  officeName?: string;
  officeId?: string;
  iat?: number;
  exp?: number;
}

if (!process.env.JWT_SECRET) {
  throw new Error(
    'JWT_SECRET environment variable is not set. ' +
    'Set it in .env before starting the server.'
  );
}

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export async function signToken(
  payload: Omit<SessionPayload, 'iat' | 'exp'>,
  expiresIn: string = '8h'
): Promise<string> {
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret);
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
