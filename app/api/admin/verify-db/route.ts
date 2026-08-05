import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import PackageModel from '@/lib/models/Package';
import { getAuthenticatedAdmin } from '@/lib/auth';

export async function GET() {
  const auditLogs: string[] = [];
  const results: Record<string, boolean> = {
    connection: false,
    insert: false,
    read: false,
    update: false,
    delete: false,
  };

  try {
    // 1. Connection Test
    auditLogs.push('[Step 1] Connecting to MongoDB...');
    const conn = await connectToDatabase();
    if (!conn) {
      throw new Error('Failed to establish MongoDB connection.');
    }
    results.connection = true;
    auditLogs.push('[Step 1 Success] Connected to database: ' + conn.connection.name);

    // 2. Insert Test
    auditLogs.push('[Step 2] Testing Insert operation on PackageModel...');
    const testDocName = `Test Package ${Date.now()}`;
    const insertedDoc = await PackageModel.create({
      name: testDocName,
      price: 123,
      description: 'Verification test package document',
      includedDocuments: ['Test Doc'],
      includedServices: ['Test Service'],
      gradientTheme: 'from-emerald-500 to-teal-600',
      isActive: false,
    });
    if (!insertedDoc || !insertedDoc._id) {
      throw new Error('Insert operation failed.');
    }
    results.insert = true;
    const testId = insertedDoc._id.toString();
    auditLogs.push(`[Step 2 Success] Inserted test document ID: ${testId}`);

    // 3. Read Test
    auditLogs.push('[Step 3] Testing Read operation...');
    const readDoc = await PackageModel.findById(testId).lean();
    if (!readDoc || readDoc.name !== testDocName) {
      throw new Error('Read operation failed or content mismatch.');
    }
    results.read = true;
    auditLogs.push(`[Step 3 Success] Read document successfully: ${readDoc.name}`);

    // 4. Update Test
    auditLogs.push('[Step 4] Testing Update operation...');
    const updatedName = `${testDocName} (Updated)`;
    const updatedDoc = await PackageModel.findByIdAndUpdate(
      testId,
      { name: updatedName, price: 456 },
      { new: true }
    ).lean();
    if (!updatedDoc || updatedDoc.name !== updatedName || updatedDoc.price !== 456) {
      throw new Error('Update operation failed.');
    }
    results.update = true;
    auditLogs.push(`[Step 4 Success] Updated document successfully: name=${updatedDoc.name}, price=${updatedDoc.price}`);

    // 5. Delete Test
    auditLogs.push('[Step 5] Testing Delete operation...');
    await PackageModel.findByIdAndDelete(testId);
    const verifyDeleted = await PackageModel.findById(testId).lean();
    if (verifyDeleted) {
      throw new Error('Delete operation failed, document still exists.');
    }
    results.delete = true;
    auditLogs.push('[Step 5 Success] Deleted test document successfully from MongoDB.');

    const allPassed = Object.values(results).every(Boolean);

    return NextResponse.json({
      success: allPassed,
      results,
      auditLogs,
      message: allPassed
        ? 'MongoDB Connection and CRUD (Insert, Read, Update, Delete) verification passed 100%!'
        : 'One or more database tests failed.',
    });
  } catch (error: any) {
    auditLogs.push(`[Error] ${error.message}`);
    return NextResponse.json(
      {
        success: false,
        results,
        auditLogs,
        error: error.message || 'Database verification failed',
      },
      { status: 500 }
    );
  }
}
