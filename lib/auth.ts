import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'morexpert-super-secret-jwt-key-2026';

export interface AdminPayload {
  id: string;
  name: string;
  email: string;
  role: 'admin';
}

export function signAdminToken(payload: AdminPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyAdminToken(token: string): AdminPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AdminPayload;
  } catch (error) {
    return null;
  }
}

export async function getAuthenticatedAdmin(): Promise<AdminPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('morexpert_admin_token')?.value;

    if (!token) {
      return null;
    }

    return verifyAdminToken(token);
  } catch (error) {
    return null;
  }
}
