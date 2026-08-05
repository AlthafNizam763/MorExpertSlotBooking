import { NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/auth';

export async function GET() {
  const admin = await getAuthenticatedAdmin();

  if (!admin) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({ authenticated: true, user: admin });
}
