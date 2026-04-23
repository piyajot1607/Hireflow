/**
 * Database Configuration
 * Connects to MongoDB using Mongoose
 */

const mongoose = require('mongoose');

const connectDB = async () => {
    // Fail fast with a clear message if env var is missing
    if (!process.env.MONGODB_URI) {
        console.error('❌ MONGODB_URI is not defined in .env file');
        process.exit(1);
    }

    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI);

        console.log(`✅ MongoDB connected: ${conn.connection.host}`);
        return conn;
    } catch (error) {
        console.error(`❌ MongoDB connection error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;