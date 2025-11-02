import { Router } from 'express';
import jwt from 'jsonwebtoken';
import Training from '../models/Training.js';
import User from '../models/User.js';
import Registration from '../models/Registration.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Get all trainings
router.get('/', async (req, res) => {
  try {
    const { status, category, level } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (level) filter.level = level;
    
    const trainings = await Training.find(filter)
      .populate('instructor', 'name email')
      .sort({ startDate: 1 })
      .lean();
    res.json({ items: trainings });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch trainings' });
  }
});

// Create training (admin/instructor)
router.post('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);
    if (!['admin', 'hub_coordinator'].includes(user.role)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const training = await Training.create({
      ...req.body,
      instructor: req.body.instructor || req.user.sub
    });
    res.json({ item: training });
  } catch (e) {
    res.status(500).json({ error: 'Failed to create training', details: e.message });
  }
});

// Register for training
router.post('/:id/register', auth, async (req, res) => {
  try {
    const training = await Training.findById(req.params.id);
    if (!training) return res.status(404).json({ error: 'Training not found' });
    
    if (training.currentParticipants >= training.maxParticipants) {
      return res.status(400).json({ error: 'Training is full' });
    }
    
    // Check if already registered
    const existing = await Registration.findOne({
      user: req.user.sub,
      type: 'training',
      refId: req.params.id
    });
    if (existing) {
      return res.status(400).json({ error: 'Already registered' });
    }
    
    await Registration.create({
      user: req.user.sub,
      type: 'training',
      refId: req.params.id,
      status: 'confirmed'
    });
    
    training.currentParticipants += 1;
    await training.save();
    
    // Update user stats
    await User.findByIdAndUpdate(req.user.sub, {
      $inc: { 'stats.trainingsCompleted': 0 } // Will be updated on completion
    });
    
    res.json({ message: 'Registered successfully' });
  } catch (e) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Get user's trainings
router.get('/my', auth, async (req, res) => {
  try {
    const registrations = await Registration.find({
      user: req.user.sub,
      type: 'training'
    }).populate('refId').lean();
    
    const trainingIds = registrations.map(r => r.refId._id);
    const trainings = await Training.find({ _id: { $in: trainingIds } })
      .populate('instructor', 'name')
      .sort({ startDate: -1 })
      .lean();
    
    res.json({ items: trainings });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch trainings' });
  }
});

export default router;

