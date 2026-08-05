import { IBooking, ISlot, ISettings, IAdmin } from '@/types';

// Global memory cache for fallback store during DB setup
declare global {
  // eslint-disable-next-line no-var
  var fallbackMemoryStore: {
    admins: (IAdmin & { password: string })[];
    bookings: IBooking[];
    slots: ISlot[];
    settings: ISettings;
  } | undefined;
}

if (!global.fallbackMemoryStore) {
  global.fallbackMemoryStore = {
    admins: [],
    bookings: [],
    slots: [],
    settings: {
      defaultPrice: 500,
      holidayDates: [],
      workingDays: [0, 1, 2, 3, 4, 5, 6],
      theme: 'default',
    },
  };
}

export const fallbackStore = global.fallbackMemoryStore;
