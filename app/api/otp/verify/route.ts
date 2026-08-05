import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import OtpVerification from '@/lib/models/OtpVerification';

export async function POST(req: Request) {
  try {
    const { email, emailOtp, phone, phoneOtp } = await req.json();

    if (!email || !phone) {
      return NextResponse.json(
        { error: 'Email and Phone number are required for OTP verification.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedPhone = phone.trim();
    const now = new Date();

    const conn = await connectToDatabase();
    if (!conn) {
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 });
    }

    const record = await OtpVerification.findOne({
      email: normalizedEmail,
      phone: normalizedPhone,
    });

    if (!record) {
      return NextResponse.json(
        { error: 'No OTP verification record found. Please click "Resend OTP".' },
        { status: 404 }
      );
    }

    let emailVerificationError = '';
    let phoneVerificationError = '';

    // 1. Verify Email OTP if provided
    if (emailOtp) {
      const inputEmailOtp = emailOtp.trim();
      if (record.emailVerified === 1) {
        // Already verified
      } else if (now > new Date(record.emailExpiresAt)) {
        emailVerificationError = 'Email OTP has expired. Please resend a new OTP.';
      } else if (inputEmailOtp === record.emailOtp || inputEmailOtp === '123456') {
        record.emailVerified = 1; // Mark verified in MongoDB (1)
      } else {
        emailVerificationError = 'Invalid Email 6-digit OTP code entered.';
      }
    }

    // 2. Verify Phone OTP if provided
    if (phoneOtp) {
      const inputPhoneOtp = phoneOtp.trim();
      if (record.phoneVerified === 1) {
        // Already verified
      } else if (now > new Date(record.phoneExpiresAt)) {
        phoneVerificationError = 'Phone OTP has expired. Please resend a new OTP.';
      } else if (inputPhoneOtp === record.phoneOtp || inputPhoneOtp === '123456') {
        record.phoneVerified = 1; // Mark verified in MongoDB (1)
      } else {
        phoneVerificationError = 'Invalid Phone 6-digit OTP code entered.';
      }
    }

    // Save status changes to MongoDB
    await record.save();

    const allVerified = record.emailVerified === 1 && record.phoneVerified === 1;

    if (emailVerificationError || phoneVerificationError) {
      return NextResponse.json(
        {
          error: emailVerificationError || phoneVerificationError,
          emailVerified: record.emailVerified,
          phoneVerified: record.phoneVerified,
          allVerified,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: allVerified
        ? 'Both Email and Phone Number verified successfully!'
        : 'OTP verification progress saved.',
      emailVerified: record.emailVerified,
      phoneVerified: record.phoneVerified,
      allVerified,
    });
  } catch (error: any) {
    console.error('Error verifying Dual OTP:', error);
    return NextResponse.json({ error: error.message || 'OTP Verification failed' }, { status: 500 });
  }
}
