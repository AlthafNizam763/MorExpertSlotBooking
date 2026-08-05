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
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: 'Email address is required for OTP verification.' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const now = Date.now();
    const store = getOtpStore();
    const existing = store.get(normalizedEmail);

    // 30 second resend throttle check
    if (existing && now - existing.lastSentAt < 30000) {
      const waitSec = Math.ceil((30000 - (now - existing.lastSentAt)) / 1000);
      return NextResponse.json(
        { error: `Please wait ${waitSec} seconds before requesting a new OTP.` },
        { status: 429 }
      );
    }

    // Generate 6-digit OTP (e.g. 123456 or random 6 digits)
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = now + 5 * 60 * 1000; // 5 minutes validity

    store.set(normalizedEmail, {
      code,
      expiresAt,
      lastSentAt: now,
    });

    console.log(`[OTP SENT] Email: ${normalizedEmail} | OTP Code: ${code} (Expires in 5 minutes)`);

    return NextResponse.json({
      success: true,
      message: `OTP verification code sent. (Enter code: ${code})`,
      testOtp: code,
      expiresInSeconds: 300,
      resendInSeconds: 30,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to send OTP' }, { status: 500 });
  }
}
