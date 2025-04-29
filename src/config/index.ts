import dotenv from 'dotenv';

dotenv.config();

export const config = {
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost',
    environment: process.env.NODE_ENV || 'development'
  },
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/royal-library',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }
  },
  email: {
    host: process.env.EMAIL_HOST || 'smtp.example.com',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER || 'user@example.com',
    password: process.env.EMAIL_PASSWORD || 'password',
    from: process.env.EMAIL_FROM || 'Royal Library <library@royallibrary.be>'
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },
  pagination: {
    defaultLimit: 10,
    maxLimit: 100
  },
  reservation: {
    standardBorrowDays: 14,
    maxBooksPerUser: 3,
    reservationFee: 3,
    lateFeePerDay: 0.2
  },
  schedule:{
    CRON_DUE_REMINDERS:  '0 8 * * *', // 8:00 AM
    CRON_LATE_REMINDERS: '0 9 * * *', // 9:00 AM
    CRON_PURCHASE_CHECK: '0 1 * * *', // 1:00 AM
  }
};

export const connectToDatabase = async (): Promise<void> => {
  try {
    const mongoose = (await import('mongoose')).default;
    
    await mongoose.connect(config.database.uri);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
};