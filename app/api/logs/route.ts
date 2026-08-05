import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import ActivityLog from '@/lib/models/ActivityLog';
import { getAuthenticatedAdmin } from '@/lib/auth';
import { fallbackLogs } from '@/lib/logger';

export async function GET() {
  try {
    const admin = await getAuthenticatedAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const conn = await connectToDatabase();
    if (conn) {
      try {
        const logs = await ActivityLog.find().sort({ timestamp: -1 }).limit(100).lean();
        return NextResponse.json({ success: true, data: logs });
      } catch (err) {
        console.warn('DB query failed for logs, using fallback:', err);
      }
    }

    return NextResponse.json({ success: true, data: fallbackLogs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
