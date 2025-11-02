import { Router } from 'express';
import jwt from 'jsonwebtoken';
import Communication from '../models/Communication.js';
import User from '../models/User.js';
import Hub from '../models/Hub.js';

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

// Create communication (admin/hub coordinator)
router.post('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);
    if (!['admin', 'hub_coordinator'].includes(user.role)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const comm = await Communication.create({
      ...req.body,
      createdBy: req.user.sub
    });
    
    // Simulate sending (in production, integrate with email/SMS services)
    setTimeout(async () => {
      const c = await Communication.findById(comm._id);
      
      // Determine recipients based on type
      let recipients = [];
      if (c.recipients.type === 'all') {
        recipients = await User.find({}).select('email phone').lean();
      } else if (c.recipients.type === 'volunteers') {
        recipients = await User.find({ role: 'volunteer' }).select('email phone').lean();
      } else if (c.recipients.type === 'members') {
        recipients = await User.find({ role: 'member' }).select('email phone').lean();
      } else if (c.recipients.type === 'hubs') {
        recipients = await Hub.find({}).select('email phone contactPerson').lean();
      } else if (c.recipients.type === 'custom') {
        recipients = await User.find({ _id: { $in: c.recipients.userIds } }).select('email phone').lean();
      }
      
      // Simulate sending
      let sent = 0;
      let failed = 0;
      
      for (const recipient of recipients) {
        // Simulate 95% success rate
        if (Math.random() > 0.05) {
          sent++;
        } else {
          failed++;
        }
      }
      
      c.status = 'sent';
      c.sentAt = new Date();
      c.sentCount = sent;
      c.failedCount = failed;
      await c.save();
    }, 1000);
    
    res.json({ 
      item: comm,
      message: 'Communication queued for sending'
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to create communication', details: e.message });
  }
});

// Get all communications (admin)
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);
    if (user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    
    const comms = await Communication.find({})
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ items: comms });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch communications' });
  }
});

export default router;

