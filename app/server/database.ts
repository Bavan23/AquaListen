import mongoose from 'mongoose';

const MONGODB_URI = process.env.DATABASE_URL || 'mongodb+srv://aqualisten:aqualisten25@aqualisten.ukxoenp.mongodb.net/aqualisten?retryWrites=true&w=majority&appName=AquaListen';

if (!MONGODB_URI) {
  throw new Error('Please define the DATABASE_URL environment variable');
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Global cache to prevent multiple connections in development
declare global {
  var mongoose: MongooseCache | undefined;
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cached!.conn) {
    return cached!.conn;
  }

  if (!cached!.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 30000, // Increased timeout for Atlas
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      family: 4, // Use IPv4, skip trying IPv6
    };

    cached!.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log('✅ Connected to MongoDB');
      return mongoose;
    }).catch((error) => {
      console.error('❌ MongoDB connection error:', error);
      throw error;
    });
  }

  try {
    cached!.conn = await cached!.promise;
  } catch (e) {
    cached!.promise = null;
    throw e;
  }

  return cached!.conn;
}

export async function disconnectFromDatabase(): Promise<void> {
  if (cached?.conn) {
    await cached.conn.disconnect();
    cached.conn = null;
    cached.promise = null;
    console.log('🔌 Disconnected from MongoDB');
  }
}
