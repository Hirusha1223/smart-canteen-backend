import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Route Imports 
import menuRoutes from './routes/menuRoutes.js';
import authRoutes from './routes/authRoutes.js'; 
import orderRoutes from './routes/orderRoutes.js'; // Imported orderRoutes with strict .js extension

// Config Environment Variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ES Module filename and dirname setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads folder exists (Handled safely for Vercel/Serverless read-only environments)
const uploadsDir = path.join(__dirname, '../uploads');
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (err) {
  console.log('Uploads directory creation skipped or handled by serverless environment.');
}

// Type Assertion 
const MONGO_URI = process.env.MONGO_URI as string;

// MIDDLEWARE SETUP 
app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true })); 

app.use('/', express.static(uploadsDir));
app.use('/uploads', express.static(uploadsDir)); 

// MongoDB Connection Logic
mongoose.connect(MONGO_URI);
const db = mongoose.connection;

db.on('connecting', () => console.log('Attempting to connect to MongoDB Cloud Database...'));
db.on('connected', () => console.log('MongoDB Cloud Database connected successfully!'));
db.on('error', (err: Error) => console.error('Database connection error detailed:', err.message));
db.on('disconnected', () => console.log('MongoDB connection disconnected.'));

// API Endpoint Links
app.use('/api/menu', menuRoutes);
app.use('/api/auth', authRoutes); 
app.use('/api/orders', orderRoutes); //  route endpoint to 404 Axios Error

// Base Test Route
app.get('/', (req: Request, res: Response) => {
  res.json({ message: "Smart Canteen Backend Server API is running successfully!" });
});

// Server Listen (Handled conditionally for local development vs Vercel deployment)
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`\n==============================================`);
    console.log(` Server is live and running on port: ${PORT}`);
    console.log(`==============================================\n`);
  });
}

// Export app instance explicitly for Vercel Serverless deployment
export default app;