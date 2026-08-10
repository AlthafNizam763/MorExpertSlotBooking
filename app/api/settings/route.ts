import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Settings from '@/lib/models/Settings';
import { fallbackStore } from '@/lib/fallbackStore';
import { getAuthenticatedAdmin } from '@/lib/auth';
import { saveUploadedFile } from '@/lib/uploads';
import { getRazorpayCredentials } from '@/lib/payments/config';

export const dynamic = 'force-dynamic';

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

    const razorpay = getRazorpayCredentials();

    return NextResponse.json({
      success: true,
      data: settings,
      gateway: {
        provider: razorpay ? 'razorpay' : 'upi-manual',
        razorpayConfigured: Boolean(razorpay),
        webhookConfigured: Boolean(razorpay?.webhookSecret),
      },
    });
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

    const contentType = req.headers.get('content-type') || '';
    const updateObj: any = {};

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();

      const assignString = (key: string) => {
        const value = form.get(key);
        if (value !== null && typeof value === 'string') updateObj[key] = value.trim();
      };
      const assignNumber = (key: string) => {
        const value = form.get(key);
        if (value !== null && typeof value === 'string' && value !== '') {
          updateObj[key] = Number(value);
        }
      };

      assignString('upiId');
      assignString('upiPayeeName');
      assignString('theme');
      assignNumber('defaultPrice');
      assignNumber('holdMinutes');

      const qrFile = form.get('upiQrImage') as File | null;
      if (qrFile && typeof qrFile === 'object' && qrFile.name) {
        const saved = await saveUploadedFile(qrFile, { prefix: 'upi-qr', maxBytes: 4 * 1024 * 1024 });
        if (saved) updateObj.upiQrImageUrl = saved.url;
      }
      if (form.get('removeQrImage') === 'true') updateObj.upiQrImageUrl = '';
    } else {
      const body = await req.json();
      const {
        defaultPrice,
        holidayDates,
        workingDays,
        theme,
        upiId,
        upiPayeeName,
        upiQrImageUrl,
        holdMinutes,
      } = body;

      if (defaultPrice !== undefined) updateObj.defaultPrice = Number(defaultPrice);
      if (holidayDates !== undefined) updateObj.holidayDates = holidayDates;
      if (workingDays !== undefined) updateObj.workingDays = workingDays;
      if (theme !== undefined) updateObj.theme = theme;
      if (upiId !== undefined) updateObj.upiId = String(upiId).trim();
      if (upiPayeeName !== undefined) updateObj.upiPayeeName = String(upiPayeeName).trim();
      if (upiQrImageUrl !== undefined) updateObj.upiQrImageUrl = String(upiQrImageUrl).trim();
      if (holdMinutes !== undefined) updateObj.holdMinutes = Number(holdMinutes);
    }

    if (updateObj.upiId && !/^[\w.\-]{2,64}@[a-zA-Z]{2,32}$/.test(updateObj.upiId)) {
      return NextResponse.json(
        { error: 'Enter a valid UPI ID, for example name@bank.' },
        { status: 400 }
      );
    }

    const conn = await connectToDatabase();
    let updatedSettings: any = null;

    if (conn) {
      try {
        updatedSettings = await Settings.findOneAndUpdate({}, updateObj, {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
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
