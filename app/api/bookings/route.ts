import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import connectToDatabase from '@/lib/mongodb';
import Booking from '@/lib/models/Booking';
import Slot from '@/lib/models/Slot';
import { generateBookingId } from '@/lib/utils';
import { fallbackStore } from '@/lib/fallbackStore';
import { IBooking } from '@/types';

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
try {
  if (!existsSync(uploadsDir)) {
    mkdirSync(uploadsDir, { recursive: true });
  }
} catch (e) {
  console.warn('Uploads directory creation warning:', e);
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const phone = searchParams.get('phone');
    const bookingId = searchParams.get('bookingId');

    const conn = await connectToDatabase();
    let query: any = {};

    if (date) query.date = date;
    if (phone) query.phone = phone;
    if (bookingId) query.bookingId = bookingId;

    let list: IBooking[] = [];
    if (conn) {
      list = (await Booking.find(query).sort({ createdAt: -1 }).lean()) as unknown as IBooking[];
    } else {
      list = fallbackStore.bookings.filter((b) => {
        if (date && b.date !== date) return false;
        if (phone && b.phone !== phone) return false;
        if (bookingId && b.bookingId !== bookingId) return false;
        return true;
      });
    }

    return NextResponse.json({ success: true, data: list });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    let name = '';
    let email = '';
    let phone = '';
    let date = '';
    let slot = '';
    let notes = '';
    let packageName = 'Standard Package';
    let packagePrice: number | null = 500;
    let resumeUrl = '';
    let bookingSource: 'User' | 'Admin' = 'User';
    let status: any = 'Pending Admin Approval';

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      try {
        const json = await req.json();
        name = json.name || '';
        email = json.email || '';
        phone = json.phone || '';
        date = json.date || '';
        slot = json.slot || '';
        notes = json.notes || '';
        packageName = json.packageName || 'Standard Package';
        packagePrice = json.packagePrice !== undefined ? Number(json.packagePrice) : 500;
        if (json.bookingSource === 'Admin') bookingSource = 'Admin';
        if (json.status) status = json.status;
        else if (bookingSource === 'Admin') status = 'Approved';
      } catch (err) {
        console.warn('Error parsing JSON payload:', err);
      }
    } else {
      try {
        const formData = await req.formData();
        name = (formData.get('name') as string) || '';
        email = (formData.get('email') as string) || '';
        phone = (formData.get('phone') as string) || '';
        date = (formData.get('date') as string) || '';
        slot = (formData.get('slot') as string) || '';
        notes = (formData.get('notes') as string) || '';
        packageName = (formData.get('packageName') as string) || 'Standard Package';
        const pStr = formData.get('packagePrice') as string;
        packagePrice = pStr ? Number(pStr) : 500;
        const srcStr = formData.get('bookingSource') as string;
        if (srcStr === 'Admin') bookingSource = 'Admin';
        const stStr = formData.get('status') as string;
        if (stStr) status = stStr;
        else if (bookingSource === 'Admin') status = 'Approved';

        const resumeFile = formData.get('resume') as File | null;
        if (resumeFile && typeof resumeFile === 'object' && resumeFile.name) {
          if (resumeFile.type === 'application/pdf' || resumeFile.name.endsWith('.pdf')) {
            if (resumeFile.size <= 10 * 1024 * 1024) {
              const bytes = await resumeFile.arrayBuffer();
              const buffer = Buffer.from(bytes);
              const sanitizedFileName = `${Date.now()}_${resumeFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
              const filePath = path.join(uploadsDir, sanitizedFileName);
              await fs.writeFile(filePath, buffer);
              resumeUrl = `/uploads/${sanitizedFileName}`;
            }
          }
        }
      } catch (err) {
        console.warn('Error parsing FormData payload:', err);
      }
    }

    if (!name || !phone || !date || !slot) {
      return NextResponse.json(
        { error: 'Required fields (Full Name, Phone Number, Date, Slot) must be provided.' },
        { status: 400 }
      );
    }

    const conn = await connectToDatabase();

    // Prevent Duplicate Bookings for the same slot on the same date
    if (conn) {
      try {
        const existingBooking = await Booking.findOne({
          date,
          slot,
          status: { $ne: 'Cancelled' },
        });

        if (existingBooking) {
          return NextResponse.json(
            {
              error: `Slot "${slot}" on ${date} is already booked by ${existingBooking.name}. Please select an available slot.`,
              bookedBy: existingBooking.name,
            },
            { status: 400 }
          );
        }
      } catch (e) {
        console.warn('DB findOne failed during duplicate check:', e);
      }
    } else {
      const existingFallback = fallbackStore.bookings.find(
        (b) => b.date === date && b.slot === slot && b.status !== 'Cancelled'
      );
      if (existingFallback) {
        return NextResponse.json(
          {
            error: `Slot "${slot}" on ${date} is already booked by ${existingFallback.name}. Please select an available slot.`,
            bookedBy: existingFallback.name,
          },
          { status: 400 }
        );
      }
    }

    const bookingId = generateBookingId();

    const newBookingData: IBooking = {
      bookingId,
      name: name.trim(),
      email: email ? email.trim().toLowerCase() : 'adminbooking@morexpert.com',
      phone: phone.trim(),
      resume: resumeUrl,
      notes: notes.trim(),
      date,
      slot,
      status: status || 'Pending Admin Approval',
      price: packagePrice,
      packageName,
      packagePrice,
      bookingSource,
      remarks: bookingSource === 'Admin' ? 'Created directly from Admin Panel' : '',
      createdAt: new Date().toISOString(),
    };

    let createdBooking: any = null;

    if (conn) {
      try {
        createdBooking = await Booking.create(newBookingData);

        // Update slot booked count
        await Slot.findOneAndUpdate(
          { date, time: slot },
          { $inc: { booked: 1 } },
          { upsert: true, new: true }
        );
      } catch (err) {
        console.warn('DB creation failed, pushing to fallback store:', err);
      }
    }

    if (!createdBooking) {
      const fallbackBooking: IBooking = {
        _id: `b-${Date.now()}`,
        ...newBookingData,
      };
      fallbackStore.bookings.unshift(fallbackBooking);
      createdBooking = fallbackBooking;
    }

    return NextResponse.json({
      success: true,
      message: 'Booking created successfully',
      bookingId: createdBooking.bookingId,
      booking: createdBooking,
    });
  } catch (error: any) {
    console.error('Booking Creation Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process booking' },
      { status: 500 }
    );
  }
}
