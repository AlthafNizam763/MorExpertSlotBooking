import { IBooking, ISlot, ISettings, IAdmin, IPackage, IPaymentSession } from '@/types';

// Global memory cache for fallback store during DB setup
declare global {
  // eslint-disable-next-line no-var
  var fallbackMemoryStore: {
    admins: (IAdmin & { password: string })[];
    bookings: IBooking[];
    slots: ISlot[];
    packages: IPackage[];
    paymentSessions: IPaymentSession[];
    settings: ISettings;
  } | undefined;
}

if (!global.fallbackMemoryStore) {
  global.fallbackMemoryStore = {
    admins: [],
    bookings: [],
    slots: [],
    paymentSessions: [],
    packages: [
      {
        _id: 'pkg-1',
        name: 'Silver Review Package',
        price: 499,
        description: 'Essential 1-on-1 resume feedback session for freshers and entry-level job seekers.',
        includedDocuments: ['Resume PDF Review', 'ATS Keyword Checklist'],
        includedServices: ['30 Min 1-on-1 Consultation', 'Grammar & Formatting Polish'],
        gradientTheme: 'from-slate-700 via-slate-800 to-slate-900',
        isPopular: false,
        isActive: true,
      },
      {
        _id: 'pkg-2',
        name: 'Golden Review Package',
        price: 999,
        description: 'Comprehensive resume & LinkedIn profile overhaul designed for mid-level professionals.',
        includedDocuments: ['Resume PDF Annotation', 'Cover Letter Template', 'ATS Match Score Report'],
        includedServices: ['45 Min Live Strategy Session', 'LinkedIn Profile Optimization', '2 Rounds of Edits'],
        gradientTheme: 'from-amber-500 via-amber-600 to-yellow-600',
        isPopular: true,
        isActive: true,
      },
      {
        _id: 'pkg-3',
        name: 'Premium Review Package',
        price: 1999,
        description: 'VIP Executive package with custom resume rewriting, target role positioning & direct mentor access.',
        includedDocuments: ['Custom Tailored Resume PDF', 'Targeted Cover Letter', 'LinkedIn Copywriting', 'Executive Bio'],
        includedServices: ['60 Min Executive Coaching', 'Priority 24-Hour Delivery', 'Direct WhatsApp Q&A Access'],
        gradientTheme: 'from-blue-600 via-indigo-600 to-purple-600',
        isPopular: false,
        isActive: true,
      },
    ],
    settings: {
      defaultPrice: 500,
      holidayDates: [],
      workingDays: [0, 1, 2, 3, 4, 5, 6],
      theme: 'default',
      upiId: '',
      upiPayeeName: '',
      upiQrImageUrl: '',
      holdMinutes: 10,
    },
  };
}

export const fallbackStore = global.fallbackMemoryStore;
