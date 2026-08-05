import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectToDatabase from '@/lib/mongodb';
import Admin from '@/lib/models/Admin';
import { signAdminToken } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const inputEmail = email.trim().toLowerCase();
    const masterEmail = (process.env.ADMIN_INITIAL_EMAIL || 'admin@morexpert.com').trim().toLowerCase();
    const masterPassword = process.env.ADMIN_INITIAL_PASSWORD || 'admin123';

    // 1. MASTER ADMIN CHECK (From .env variables)
    if (inputEmail === masterEmail && password === masterPassword) {
      const token = signAdminToken({
        id: 'master-admin-id',
        name: 'Master Admin',
        email: masterEmail,
        role: 'admin',
      });

      const response = NextResponse.json({
        success: true,
        message: 'Master Admin login successful',
        user: {
          id: 'master-admin-id',
          name: 'Master Admin',
          email: masterEmail,
          role: 'admin',
        },
      });

      response.cookies.set('morexpert_admin_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      });

      return response;
    }

    // 2. DATABASE AUTHENTICATION FLOW
    const conn = await connectToDatabase();
    let adminRecord: any = null;

    if (conn) {
      try {
        adminRecord = await Admin.findOne({ email: inputEmail });
      } catch (err) {
        console.warn('DB Admin query warning:', err);
      }
    }

    if (!adminRecord) {
      return NextResponse.json({ error: 'Invalid admin credentials' }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, adminRecord.password);
    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid admin credentials' }, { status: 401 });
    }

    const token = signAdminToken({
      id: adminRecord._id ? adminRecord._id.toString() : 'admin-1',
      name: adminRecord.name,
      email: adminRecord.email,
      role: adminRecord.role || 'admin',
    });

    const response = NextResponse.json({
      success: true,
      message: 'Admin login successful',
      user: {
        id: adminRecord._id ? adminRecord._id.toString() : 'admin-1',
        name: adminRecord.name,
        email: adminRecord.email,
        role: adminRecord.role || 'admin',
      },
    });

    response.cookies.set('morexpert_admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
