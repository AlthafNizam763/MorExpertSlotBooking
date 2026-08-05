import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Settings from '@/lib/models/Settings';
import { fallbackStore } from '@/lib/fallbackStore';
import { getAuthenticatedAdmin } from '@/lib/auth';

export async function GET() {
  try {
    const conn = await connectToDatabase();
    let settings: any = null;

    if (conn) {
      try {
        settings = await Settings.findOne().lean();
      } catch (e) {
        console.warn('DB settings query failed, using fallback store:', e);
      }
    }

    if (!settings) {
      settings = fallbackStore.settings;
    }

    return NextResponse.json({ success: true, data: settings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const admin = await getAuthenticatedAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized admin access required' }, { status: 401 });
    }

    const body = await req.json();
    const { defaultPrice, holidayDates, workingDays, theme } = body;

    const updateObj: any = {};
    if (defaultPrice !== undefined) updateObj.defaultPrice = Number(defaultPrice);
    if (holidayDates !== undefined) updateObj.holidayDates = holidayDates;
    if (workingDays !== undefined) updateObj.workingDays = workingDays;
    if (theme !== undefined) updateObj.theme = theme;

    const conn = await connectToDatabase();
    let updatedSettings: any = null;

    if (conn) {
      try {
        updatedSettings = await Settings.findOneAndUpdate({}, updateObj, {
          upsert: true,
          new: true,
        }).lean();
      } catch (e) {
        console.warn('DB settings update failed, using fallback store:', e);
      }
    }

    if (!updatedSettings) {
      fallbackStore.settings = {
        ...fallbackStore.settings,
        ...updateObj,
      };
      updatedSettings = fallbackStore.settings;
    }

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
      data: updatedSettings,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
