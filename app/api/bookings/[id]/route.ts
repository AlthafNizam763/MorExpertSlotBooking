import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Booking from '@/lib/models/Booking';
import Slot from '@/lib/models/Slot';
import { fallbackStore } from '@/lib/fallbackStore';
import { getAuthenticatedAdmin } from '@/lib/auth';
import { logActivity } from '@/lib/logger';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const conn = await connectToDatabase();

    if (conn) {
      try {
        const booking = await Booking.findOne({
          $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { bookingId: id }],
        }).lean();

        if (booking) {
          return NextResponse.json({ success: true, data: booking });
        }
      } catch (err) {
        console.warn('DB lookup failed, checking fallback store:', err);
      }
    }

    const match = fallbackStore.bookings.find(
      (b) => b._id === id || b.bookingId.toLowerCase() === id.toLowerCase()
    );

    if (!match) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: match });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAuthenticatedAdmin();
    const actorName = admin ? admin.name : 'MorExpert Admin';

    const { id } = await params;
    const body = await req.json();
    const {
      price,
      status,
      remarks,
      privateNotes,
      publicNotes,
      rejectionReason,
      rescheduleDate,
      rescheduleSlot,
    } = body;

    const conn = await connectToDatabase();
    let updatedBooking: any = null;

    const updateFields: any = {};
    if (price !== undefined) {
      updateFields.price = price === null || price === '' ? null : Number(price);
    }
    if (status) updateFields.status = status;
    if (remarks !== undefined) updateFields.remarks = remarks;
    if (privateNotes !== undefined) updateFields.privateNotes = privateNotes;
    if (publicNotes !== undefined) updateFields.publicNotes = publicNotes;
    if (rejectionReason !== undefined) updateFields.rejectionReason = rejectionReason;

    // Timeline trace event helper
    const newTimelineEvent = {
      title: `Status set to ${status || 'Updated'}`,
      timestamp: new Date(),
      actor: actorName,
      notes: remarks || rejectionReason || '',
    };

    // Handle Reject & Reschedule
    if (status === 'Rescheduled' && rescheduleDate && rescheduleSlot) {
      updateFields.rescheduledTo = { date: rescheduleDate, slot: rescheduleSlot };
      updateFields.date = rescheduleDate;
      updateFields.slot = rescheduleSlot;
      newTimelineEvent.title = `Rescheduled to ${rescheduleDate} (${rescheduleSlot})`;

      // Lock new slot
      if (conn) {
        try {
          await Slot.findOneAndUpdate(
            { date: rescheduleDate, time: rescheduleSlot },
            { $inc: { booked: 1 } },
            { upsert: true }
          );
        } catch (e) {}
      }
    }

    if (conn) {
      try {
        updatedBooking = await Booking.findByIdAndUpdate(
          id,
          {
            $set: updateFields,
            $push: { timeline: newTimelineEvent },
          },
          { new: true }
        ).lean();

        if (!updatedBooking) {
          updatedBooking = await Booking.findOneAndUpdate(
            { bookingId: id },
            {
              $set: updateFields,
              $push: { timeline: newTimelineEvent },
            },
            { new: true }
          ).lean();
        }
      } catch (err) {
        console.warn('DB update failed, updating fallback store:', err);
      }
    }

    if (!updatedBooking) {
      const idx = fallbackStore.bookings.findIndex((b) => b._id === id || b.bookingId === id);
      if (idx !== -1) {
        const existingTimeline = fallbackStore.bookings[idx].timeline || [];
        fallbackStore.bookings[idx] = {
          ...fallbackStore.bookings[idx],
          ...updateFields,
          timeline: [
            ...existingTimeline,
            {
              title: newTimelineEvent.title,
              timestamp: new Date().toISOString(),
              actor: actorName,
              notes: newTimelineEvent.notes,
            },
          ],
        };
        updatedBooking = fallbackStore.bookings[idx];
      }
    }

    if (!updatedBooking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Log Activity
    await logActivity(actorName, `Booking ${status || 'Updated'}`, updatedBooking.bookingId);

    return NextResponse.json({
      success: true,
      message: 'Booking updated successfully',
      data: updatedBooking,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAuthenticatedAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized admin access required' }, { status: 401 });
    }

    const { id } = await params;
    const conn = await connectToDatabase();
    let deleted = false;

    if (conn) {
      try {
        const res = await Booking.findByIdAndDelete(id);
        if (res) deleted = true;
      } catch (err) {
        console.warn('DB delete failed, checking fallback store:', err);
      }
    }

    if (!deleted) {
      const initialLen = fallbackStore.bookings.length;
      fallbackStore.bookings = fallbackStore.bookings.filter(
        (b) => b._id !== id && b.bookingId !== id
      );
      if (fallbackStore.bookings.length < initialLen) {
        deleted = true;
      }
    }

    if (!deleted) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    await logActivity(admin.name, 'Booking Deleted', id);

    return NextResponse.json({ success: true, message: 'Booking deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
