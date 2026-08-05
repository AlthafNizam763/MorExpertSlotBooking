import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import OtpVerification from '@/lib/models/OtpVerification';

export async function POST(req: Request) {
  try {
    const { email, phone, target } = await req.json();

    if (!email || !phone) {
      return NextResponse.json(
        { error: 'Both Email address and Phone number are required for OTP verification.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedPhone = phone.trim();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes validity

    const targetType = target || 'both';

    let emailCode = Math.floor(100000 + Math.random() * 900000).toString();
    let phoneCode = Math.floor(100000 + Math.random() * 900000).toString();

    const conn = await connectToDatabase();

    if (!conn) {
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 });
    }

    // Check existing OTP record
    let otpRecord = await OtpVerification.findOne({
      $or: [{ email: normalizedEmail }, { phone: normalizedPhone }],
    });

    if (!otpRecord) {
      otpRecord = new OtpVerification({
        email: normalizedEmail,
        emailOtp: emailCode,
        emailVerified: 0,
        emailCreatedAt: now,
        emailExpiresAt: expiresAt,
        phone: normalizedPhone,
        phoneOtp: phoneCode,
        phoneVerified: 0,
        phoneCreatedAt: now,
        phoneExpiresAt: expiresAt,
      });
    } else {
      otpRecord.email = normalizedEmail;
      otpRecord.phone = normalizedPhone;

      if (targetType === 'email' || targetType === 'both') {
        otpRecord.emailOtp = emailCode;
        otpRecord.emailVerified = 0; // Reset verification status to Not Verified
        otpRecord.emailCreatedAt = now;
        otpRecord.emailExpiresAt = expiresAt;
      } else {
        emailCode = otpRecord.emailOtp;
      }

      if (targetType === 'phone' || targetType === 'both') {
        otpRecord.phoneOtp = phoneCode;
        otpRecord.phoneVerified = 0; // Reset verification status to Not Verified
        otpRecord.phoneCreatedAt = now;
        otpRecord.phoneExpiresAt = expiresAt;
      } else {
        phoneCode = otpRecord.phoneOtp;
      }
    }

    await otpRecord.save();

    console.log(
      `[DUAL OTP SENT] Email: ${normalizedEmail} (OTP: ${emailCode}) | Phone: ${normalizedPhone} (OTP: ${phoneCode}) - Expires at: ${expiresAt.toISOString()}`
    );

    return NextResponse.json({
      success: true,
      message: `OTP codes generated and saved to MongoDB. Email OTP: ${emailCode}, Phone OTP: ${phoneCode}`,
      emailOtp: emailCode,
      phoneOtp: phoneCode,
      emailVerified: otpRecord.emailVerified,
      phoneVerified: otpRecord.phoneVerified,
      expiresInSeconds: 300,
      resendInSeconds: 30,
    });
  } catch (error: any) {
    console.error('Error sending Dual OTP:', error);
    return NextResponse.json({ error: error.message || 'Failed to send OTP' }, { status: 500 });
  }
}
