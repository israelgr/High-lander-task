import mongoose from 'mongoose';
import { config } from './index.js';

export async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(config.mongodb.uri);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

mongoose.connection.on('error', err => {
  console.error('MongoDB error:', err);
});
