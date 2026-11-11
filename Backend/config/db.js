import mongoose from 'mongoose';
import dns from 'dns';
import { config } from './config.js';

// Fix for Node.js querySrv ECONNREFUSED error on local networks/ISPs
dns.setServers(['8.8.8.8', '8.8.4.4']);

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.MONGO_URI, {
      maxPoolSize: 50,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host} -> ${conn.connection.name}`);
  } catch (error) {
    console.error(`MongoDB Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
