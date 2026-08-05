import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Slot from '@/lib/models/Slot';
import Booking from '@/lib/models/Booking';
import { fallbackStore } from '@/lib/fallbackStore';
import { getAuthenticatedAdmin } from '@/lib/auth';

const DEFAULT_TIMINGS = ['09:00 AM', '11:00 AM', '03:00 PM'];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');

    const conn = await connectToDatabase();
    let bookedCountsBySlot: Record<string, number> = {};

    if (date) {
      // Get booked count for each slot on this date
      let existingBookings: any[] = [];
      if (conn) {
        try {
          existingBookings = await Booking.find({ date, status: { $ne: 'Cancelled' } }).lean();
        } catch (e) {
          existingBookings = fallbackStore.bookings.filter(
            (b) => b.date === date && b.status !== 'Cancelled'
          );
        }
      } else {
        existingBookings = fallbackStore.bookings.filter(
          (b) => b.date === date && b.status !== 'Cancelled'
        );
      }

      existingBookings.forEach((b) => {
        bookedCountsBySlot[b.slot] = (bookedCountsBySlot[b.slot] || 0) + 1;
      });

      // Fetch custom slots override from DB or store
      let dbSlots: any[] = [];
      if (conn) {
        try {
          dbSlots = await Slot.find({ date }).lean();
        } catch (e) {
          dbSlots = fallbackStore.slots.filter((s) => s.date === date);
        }
      } else {
        dbSlots = fallbackStore.slots.filter((s) => s.date === date);
      }

      // Merge defaults with DB overrides and compute status colors & remaining count
      const resultSlots = DEFAULT_TIMINGS.map((time, index) => {
        const custom = dbSlots.find((s) => s.time === time);
        const booked = bookedCountsBySlot[time] || 0;
        const capacity = custom?.capacity !== undefined ? custom.capacity : 1;
        const isEnabledInDb = custom ? custom.isAvailable : true;
        const remaining = Math.max(0, capacity - booked);

        const slotBookable = isEnabledInDb && remaining > 0;
        
        let statusColor: 'green' | 'yellow' | 'red' = 'green';
        let statusText = '';

        if (!slotBookable || remaining <= 0) {
          statusColor = 'red';
          statusText = 'Fully Booked';
        } else if (remaining === 1) {
          statusColor = 'yellow';
          statusText = 'Limited (1 Slot Left)';
        } else {
          statusColor = 'green';
          statusText = `Available (${remaining} Slots Left)`;
        }

        const displayName = `Slot ${index + 1}`;

        return {
          _id: custom?._id ? custom._id.toString() : `${date}-${time.replace(/[^a-zA-Z0-9]/g, '')}`,
          date,
          time, // internal time value
          displayName, // user-facing slot label e.g. "Slot 1"
          capacity,
          booked,
          remaining,
          isAvailable: slotBookable,
          statusColor,
          statusText,
        };
      });

      return NextResponse.json({ success: true, data: resultSlots });
    }

    // If fetching summary for calendar
    return NextResponse.json({
      success: true,
      defaultTimings: DEFAULT_TIMINGS,
      maxSlotsPerDay: 3,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await getAuthenticatedAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized admin access required' }, { status: 401 });
    }

    const { date, time, capacity, isAvailable } = await req.json();

    if (!date || !time) {
      return NextResponse.json({ error: 'Date and time are required' }, { status: 400 });
    }

    const conn = await connectToDatabase();
    let slotObj: any = null;

    if (conn) {
      try {
        slotObj = await Slot.findOneAndUpdate(
          { date, time },
          { capacity: capacity || 1, isAvailable: isAvailable !== undefined ? isAvailable : true },
          { upsert: true, new: true }
        ).lean();
      } catch (err) {
        console.warn('DB slot save failed, using fallback store:', err);
      }
    }

    if (!slotObj) {
      const idx = fallbackStore.slots.findIndex((s) => s.date === date && s.time === time);
      const newSlot = {
        _id: `slot-${Date.now()}`,
        date,
        time,
        capacity: capacity || 1,
        booked: 0,
        isAvailable: isAvailable !== undefined ? isAvailable : true,
      };
      if (idx !== -1) {
        fallbackStore.slots[idx] = { ...fallbackStore.slots[idx], ...newSlot };
        slotObj = fallbackStore.slots[idx];
      } else {
        fallbackStore.slots.push(newSlot);
        slotObj = newSlot;
      }
    }

    return NextResponse.json({ success: true, data: slotObj });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
