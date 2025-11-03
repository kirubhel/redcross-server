import { Router } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Event from '../models/Event.js';
import Project from '../models/Project.js';
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

router.get('/me', auth, async (req, res) => {
  const user = await User.findById(req.user.sub).lean();
  res.json({ user });
});

// Events
router.get('/events', async (req, res) => {
  const items = await Event.find().sort({ startAt: 1 }).lean();
  res.json({ items });
});

router.post('/events', auth, async (req, res) => {
  const body = { ...req.body, createdBy: req.user.sub };
  const ev = await Event.create(body);
  res.json({ item: ev });
});

// Projects
router.get('/projects', async (req, res) => {
  const items = await Project.find().lean();
  res.json({ items });
});

router.post('/projects', auth, async (req, res) => {
  const pr = await Project.create(req.body);
  res.json({ item: pr });
});

// Registrations (event/project join)
router.post('/register', auth, async (req, res) => {
  const { type, refId } = req.body;
  const reg = await Registration.create({ user: req.user.sub, type, refId, status: 'confirmed' });
  res.json({ item: reg });
});

router.get('/my/registrations', auth, async (req, res) => {
  const items = await Registration.find({ user: req.user.sub }).lean();
  res.json({ items });
});

export default router;












