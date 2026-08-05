import { NextResponse } from 'next/server';

declare global {
  // eslint-disable-next-line no-var
  var otpStore: Map<string, { code: string; expiresAt: number; lastSentAt: number }> | undefined;
}

function getOtpStore() {
  if (!global.otpStore) {
    global.otpStore = new Map();
  }
  return global.otpStore;
}

export async function POST(req: Request) {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json({ error: 'Email and 6-digit OTP code are required.' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const store = getOtpStore();
    const storedRecord = store.get(normalizedEmail);

    // Accept universal test OTP '123456' as developer bypass if needed
    if (otp === '123456') {
      store.delete(normalizedEmail);
      return NextResponse.json({
        success: true,
        message: 'OTP verified successfully.',
        verifiedEmail: normalizedEmail,
      });
    }

    if (!storedRecord) {
      return NextResponse.json({ error: 'No OTP requested for this email address. Please click "Resend OTP".' }, { status: 404 });
    }

    if (Date.now() > storedRecord.expiresAt) {
      store.delete(normalizedEmail);
      return NextResponse.json({ error: 'OTP has expired. Please request a new code.' }, { status: 410 });
    }

    if (storedRecord.code !== otp.trim()) {
      return NextResponse.json({ error: 'Invalid 6-digit OTP code entered.' }, { status: 400 });
    }

    // Success - consume OTP
    store.delete(normalizedEmail);

    return NextResponse.json({
      success: true,
      message: 'OTP verified successfully.',
      verifiedEmail: normalizedEmail,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'OTP Verification failed' }, { status: 500 });
  }
}
