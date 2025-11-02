import { Router } from 'express';
import jwt from 'jsonwebtoken';
import Evaluation from '../models/Evaluation.js';
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

// Create/update evaluation
router.post('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);
    if (!['admin', 'evaluator', 'hub_coordinator'].includes(user.role)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const evaluation = await Evaluation.create({
      ...req.body,
      evaluator: req.user.sub
    });
    res.json({ item: evaluation });
  } catch (e) {
    res.status(500).json({ error: 'Failed to create evaluation', details: e.message });
  }
});

// Get evaluations for a user
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);
    // Users can only see their own evaluations unless admin/evaluator
    if (req.params.userId !== req.user.sub && !['admin', 'evaluator'].includes(user.role)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const evaluations = await Evaluation.find({ user: req.params.userId })
      .populate('evaluator', 'name')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ items: evaluations });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch evaluations' });
  }
});

// Get my evaluations
router.get('/my', auth, async (req, res) => {
  try {
    const evaluations = await Evaluation.find({ user: req.user.sub })
      .populate('evaluator', 'name')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ items: evaluations });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch evaluations' });
  }
});

export default router;

