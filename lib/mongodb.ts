import mongoose from 'mongoose';

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb+srv://althafnizam763_db_user:Fk3GilZO9JbkLcsF@cluster0.at589pu.mongodb.net/MorExpert?retryWrites=true&w=majority';
const MONGODB_DB = process.env.MONGODB_DB || 'MorExpert';

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose | null> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongooseCache || { conn: null, promise: null };

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

export async function connectToDatabase(): Promise<typeof mongoose | null> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      dbName: MONGODB_DB,
      serverSelectionTimeoutMS: 8000,
    };

    cached.promise = mongoose
      .connect(MONGODB_URI, opts)
      .then((m) => {
        console.log(`[MongoDB] Connected successfully to database: ${MONGODB_DB}`);
        return m;
      })
      .catch((err) => {
        console.error('[MongoDB Connection Error]:', err.message);
        cached.promise = null;
        return null;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    cached.conn = null;
  }

  return cached.conn;
}

export default connectToDatabase;
