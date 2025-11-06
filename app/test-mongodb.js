// Test MongoDB Connection
const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://aqualisten:aqualisten25@aqualisten.ukxoenp.mongodb.net/aqualisten?retryWrites=true&w=majority&appName=AquaListen';

console.log('🔍 Testing MongoDB connection...');
console.log('URI:', MONGODB_URI);

const opts = {
  bufferCommands: false,
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 30000,
  family: 4,
};

mongoose.connect(MONGODB_URI, opts)
  .then(() => {
    console.log('✅ MongoDB connection successful!');
    console.log('Database:', mongoose.connection.db.databaseName);
    console.log('Host:', mongoose.connection.host);
    console.log('Port:', mongoose.connection.port);
    
    // Test a simple query
    return mongoose.connection.db.admin().ping();
  })
  .then(() => {
    console.log('✅ Database ping successful!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ MongoDB connection failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  });
