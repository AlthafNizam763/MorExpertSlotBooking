import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import PackageModel from '@/lib/models/Package';
import { fallbackStore } from '@/lib/fallbackStore';
import { getAuthenticatedAdmin } from '@/lib/auth';

const INITIAL_DEFAULT_PACKAGES = [
  {
    name: 'Silver Review Package',
    price: 499,
    description: 'Essential 1-on-1 resume feedback session for freshers and entry-level job seekers.',
    includedDocuments: ['Resume PDF Review', 'ATS Keyword Checklist'],
    includedServices: ['30 Min 1-on-1 Consultation', 'Grammar & Formatting Polish'],
    gradientTheme: 'from-slate-700 via-slate-800 to-slate-900',
    isPopular: false,
    isActive: true,
  },
  {
    name: 'Golden Review Package',
    price: 999,
    description: 'Comprehensive resume & LinkedIn profile overhaul designed for mid-level professionals.',
    includedDocuments: ['Resume PDF Annotation', 'Cover Letter Template', 'ATS Match Score Report'],
    includedServices: ['45 Min Live Strategy Session', 'LinkedIn Profile Optimization', '2 Rounds of Edits'],
    gradientTheme: 'from-amber-500 via-amber-600 to-yellow-600',
    isPopular: true,
    isActive: true,
  },
  {
    name: 'Premium Review Package',
    price: 1999,
    description: 'VIP Executive package with custom resume rewriting, target role positioning & direct mentor access.',
    includedDocuments: ['Custom Tailored Resume PDF', 'Targeted Cover Letter', 'LinkedIn Copywriting', 'Executive Bio'],
    includedServices: ['60 Min Executive Coaching', 'Priority 24-Hour Delivery', 'Direct WhatsApp Q&A Access'],
    gradientTheme: 'from-blue-600 via-indigo-600 to-purple-600',
    isPopular: false,
    isActive: true,
  },
];

export async function GET() {
  try {
    const conn = await connectToDatabase();
    if (conn) {
      let packages: any[] = await PackageModel.find({}).sort({ createdAt: 1 }).lean();
      
      // If MongoDB is empty, seed initial default packages
      if (!packages || packages.length === 0) {
        console.log('[MongoDB] Packages collection empty. Seeding initial packages...');
        await PackageModel.insertMany(INITIAL_DEFAULT_PACKAGES);
        packages = await PackageModel.find({}).sort({ createdAt: 1 }).lean();
      }

      return NextResponse.json({ success: true, data: packages });
    } else {
      return NextResponse.json({ success: true, data: fallbackStore.packages });
    }
  } catch (error: any) {
    console.error('Error fetching packages:', error);
    return NextResponse.json(
      { success: true, data: fallbackStore.packages, fallback: true },
      { status: 200 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const admin = await getAuthenticatedAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized admin access required' }, { status: 401 });
    }

    const body = await req.json();
    const { name, price, description, includedDocuments, includedServices, gradientTheme, isPopular, isActive } = body;

    if (!name || price === undefined || !description) {
      return NextResponse.json({ error: 'Name, price, and description are required.' }, { status: 400 });
    }

    const docList = Array.isArray(includedDocuments)
      ? includedDocuments
      : typeof includedDocuments === 'string'
      ? includedDocuments.split(',').map((s: string) => s.trim()).filter(Boolean)
      : [];

    const serviceList = Array.isArray(includedServices)
      ? includedServices
      : typeof includedServices === 'string'
      ? includedServices.split(',').map((s: string) => s.trim()).filter(Boolean)
      : [];

    const conn = await connectToDatabase();
    let newPkg: any = null;

    if (conn) {
      newPkg = await PackageModel.create({
        name,
        price: Number(price),
        description,
        includedDocuments: docList,
        includedServices: serviceList,
        gradientTheme: gradientTheme || 'from-blue-600 to-indigo-600',
        isPopular: Boolean(isPopular),
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      });
    } else {
      newPkg = {
        _id: `pkg-${Date.now()}`,
        name,
        price: Number(price),
        description,
        includedDocuments: docList,
        includedServices: serviceList,
        gradientTheme: gradientTheme || 'from-blue-600 to-indigo-600',
        isPopular: Boolean(isPopular),
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        createdAt: new Date().toISOString(),
      };
      fallbackStore.packages.push(newPkg);
    }

    return NextResponse.json({ success: true, data: newPkg, message: 'Package created successfully' });
  } catch (error: any) {
    console.error('Error creating package:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
