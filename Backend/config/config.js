import dotenv from 'dotenv';
dotenv.config();

const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

if (process.env.NODE_ENV === 'production' && jwtSecret === 'your-secret-key-change-in-production') {
    throw new Error('JWT_SECRET must be set to a strong value in production');
}

export const config = {
    PORT: process.env.PORT || 5000,
    NODE_ENV: process.env.NODE_ENV || 'development',
    CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
    JWT_SECRET: jwtSecret,
    JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',
    MONGO_URI: process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/hrms',
    RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX) || 100,
};
