import { Router } from 'express';
import jwt from 'jsonwebtoken';
import Recognition from '../models/Recognition.js';
import User from '../models/User.js';

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

// Get all recognitions (for blog/announcements)
router.get('/', async (req, res) => {
  try {
    const { featured, type } = req.query;
    const filter = {};
    if (featured === 'true') filter.featured = true;
    if (type) filter.type = type;
    
    const recognitions = await Recognition.find(filter)
      .populate('user', 'name photo profile')
      .populate('issuedBy', 'name')
      .sort({ issuedDate: -1 })
      .lean();
    res.json({ items: recognitions });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch recognitions' });
  }
});

// Create recognition (admin/evaluator)
router.post('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);
    if (!['admin', 'evaluator', 'hub_coordinator'].includes(user.role)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const recognition = await Recognition.create({
      ...req.body,
      issuedBy: req.user.sub
    });
    
    // Update user stats
    await User.findByIdAndUpdate(req.body.user, {
      $inc: { 'stats.recognitionsReceived': 1 }
    });
    
    res.json({ item: recognition });
  } catch (e) {
    res.status(500).json({ error: 'Failed to create recognition', details: e.message });
  }
});

// Get user's recognitions
router.get('/my', auth, async (req, res) => {
  try {
    const recognitions = await Recognition.find({ user: req.user.sub })
      .populate('issuedBy', 'name')
      .sort({ issuedDate: -1 })
      .lean();
    res.json({ items: recognitions });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch recognitions' });
  }
});

export default router;

