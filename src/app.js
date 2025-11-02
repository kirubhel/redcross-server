import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';

import authRouter from './routes/auth.js';
import coreRouter from './routes/core.js';
import hubsRouter from './routes/hubs.js';
import paymentsRouter from './routes/payments.js';
import activitiesRouter from './routes/activities.js';
import trainingRouter from './routes/training.js';
import recognitionRouter from './routes/recognition.js';
import evaluationRouter from './routes/evaluation.js';
import placementRouter from './routes/placement.js';
import communicationRouter from './routes/communication.js';
import idcardsRouter from './routes/idcards.js';
import reportsRouter from './routes/reports.js';
import formFieldsRouter from './routes/formFields.js';
import aiRouter from './routes/ai.js';
import volunteerMatchingRouter from './routes/volunteerMatching.js';
import membershipTypesRouter from './routes/membershipTypes.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'ERCS Volunteers, Members, and Hub Robotics System',
    version: '1.0.0',
    modules: [
      'Hub Management',
      'Volunteers & Members',
      'Payment Transactions',
      'Activity Tracking',
      'Training & Development',
      'Recognition & Awards',
      'Evaluation',
      'Placement',
      'Mass Communication',
      'ID Card Generation',
      'Analytics & Reporting'
    ]
  });
});

app.use('/api/auth', authRouter);
app.use('/api', coreRouter);
app.use('/api/hubs', hubsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/activities', activitiesRouter);
app.use('/api/training', trainingRouter);
app.use('/api/recognition', recognitionRouter);
app.use('/api/evaluation', evaluationRouter);
app.use('/api/placement', placementRouter);
app.use('/api/communication', communicationRouter);
app.use('/api/idcards', idcardsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/form-fields', formFieldsRouter);
app.use('/api/ai', aiRouter);
app.use('/api/volunteer-matching', volunteerMatchingRouter);
app.use('/api/membership-types', membershipTypesRouter);

const PORT = process.env.PORT || 4000;
// MongoDB connection - prioritize environment variable (for production/cloud)
// Fall back to localhost only for local development
const MONGO_URL = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/ercs_demo';

async function start() {
  try {
    await mongoose.connect(MONGO_URL);
    console.log(`✅ Connected to MongoDB: ${MONGO_URL.includes('mongodb.net') ? 'Atlas (Cloud)' : 'Local'}`);
    app.listen(PORT, () => {
      console.log(`✅ API listening on http://localhost:${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    if (MONGO_URL.includes('mongodb.net')) {
      console.error('💡 Tip: Check your MongoDB Atlas connection string and network access settings');
    }
    process.exit(1);
  }
}

start().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});



