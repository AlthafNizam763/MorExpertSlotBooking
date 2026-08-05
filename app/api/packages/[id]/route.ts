import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import PackageModel from '@/lib/models/Package';
import { fallbackStore } from '@/lib/fallbackStore';
import { getAuthenticatedAdmin } from '@/lib/auth';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAuthenticatedAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized admin access required' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const { name, price, description, includedDocuments, includedServices, gradientTheme, isPopular, isActive } = body;

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

    const updateData: any = {
      ...(name && { name }),
      ...(price !== undefined && { price: Number(price) }),
      ...(description !== undefined && { description }),
      ...(includedDocuments !== undefined && { includedDocuments: docList }),
      ...(includedServices !== undefined && { includedServices: serviceList }),
      ...(gradientTheme !== undefined && { gradientTheme }),
      ...(isPopular !== undefined && { isPopular: Boolean(isPopular) }),
      ...(isActive !== undefined && { isActive: Boolean(isActive) }),
    };

    const conn = await connectToDatabase();
    let updatedPkg: any = null;

    if (conn) {
      updatedPkg = await PackageModel.findByIdAndUpdate(id, updateData, { new: true }).lean();
    } else {
      const idx = fallbackStore.packages.findIndex((p) => p._id === id);
      if (idx !== -1) {
        fallbackStore.packages[idx] = { ...fallbackStore.packages[idx], ...updateData };
        updatedPkg = fallbackStore.packages[idx];
      }
    }

    if (!updatedPkg) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedPkg, message: 'Package updated successfully' });
  } catch (error: any) {
    console.error('Error updating package:', error);
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

    if (conn) {
      await PackageModel.findByIdAndDelete(id);
    }

    // Also remove from fallback store if present
    const idx = fallbackStore.packages.findIndex((p) => p._id === id);
    if (idx !== -1) {
      fallbackStore.packages.splice(idx, 1);
    }

    return NextResponse.json({ success: true, message: 'Package deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting package:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
