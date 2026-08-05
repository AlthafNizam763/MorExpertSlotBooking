import connectToDatabase from '@/lib/mongodb';
import ActivityLog from '@/lib/models/ActivityLog';

declare global {
  // eslint-disable-next-line no-var
  var fallbackLogsStore: any[] | undefined;
}

if (!global.fallbackLogsStore) {
  global.fallbackLogsStore = [];
}

export const fallbackLogs = global.fallbackLogsStore;

export async function logActivity(
  actor: string,
  action: string,
  bookingId?: string,
  oldValue?: string,
  newValue?: string
) {
  try {
    const conn = await connectToDatabase();
    if (conn) {
      await ActivityLog.create({ actor, action, bookingId, oldValue, newValue });
    } else {
      fallbackLogs.unshift({
        _id: `log-${Date.now()}`,
        actor,
        action,
        bookingId,
        oldValue,
        newValue,
        ip: '127.0.0.1',
        timestamp: new Date().toISOString(),
      });
    }
  } catch (err) {
    fallbackLogs.unshift({
      _id: `log-${Date.now()}`,
      actor,
      action,
      bookingId,
      oldValue,
      newValue,
      ip: '127.0.0.1',
      timestamp: new Date().toISOString(),
    });
  }
}
