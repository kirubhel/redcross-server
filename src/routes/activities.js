import { Router } from 'express';
import jwt from 'jsonwebtoken';
import Activity from '../models/Activity.js';
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

// Create activity
router.post('/', auth, async (req, res) => {
  try {
    const activity = await Activity.create({
      ...req.body,
      user: req.user.sub
    });
    
    // Calculate hours if startTime and endTime provided
    if (activity.startTime && activity.endTime) {
      const diff = new Date(activity.endTime) - new Date(activity.startTime);
      activity.hours = Math.round((diff / (1000 * 60 * 60)) * 10) / 10;
      await activity.save();
      
      // Update user stats if completed
      if (activity.status === 'completed') {
        await User.findByIdAndUpdate(req.user.sub, {
          $inc: { 
            'stats.totalHours': activity.hours || 0,
            'stats.activitiesCompleted': 1
          }
        });
      }
    }
    
    res.json({ item: activity });
  } catch (e) {
    res.status(500).json({ error: 'Failed to create activity', details: e.message });
  }
});

// Get user's activities
router.get('/my', auth, async (req, res) => {
  try {
    const { type, status, startDate, endDate } = req.query;
    const filter = { user: req.user.sub };
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.startTime = {};
      if (startDate) filter.startTime.$gte = new Date(startDate);
      if (endDate) filter.startTime.$lte = new Date(endDate);
    }
    
    const activities = await Activity.find(filter)
      .populate('hub', 'name')
      .populate('event', 'title')
      .populate('project', 'name')
      .sort({ startTime: -1 })
      .lean();
    
    res.json({ items: activities });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

// Get all activities (admin/evaluator)
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);
    if (!['admin', 'evaluator'].includes(user.role)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const { user: userId, type, status, hub } = req.query;
    const filter = {};
    if (userId) filter.user = userId;
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (hub) filter.hub = hub;
    
    const activities = await Activity.find(filter)
      .populate('user', 'name email phone')
      .populate('hub', 'name')
      .populate('event', 'title')
      .populate('project', 'name')
      .sort({ startTime: -1 })
      .lean();
    
    res.json({ items: activities });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

// Update activity
router.patch('/:id', auth, async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id);
    if (!activity) return res.status(404).json({ error: 'Activity not found' });
    
    const user = await User.findById(req.user.sub);
    if (user.role !== 'admin' && activity.user.toString() !== req.user.sub) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    Object.assign(activity, req.body);
    
    // Recalculate hours if times changed
    if (activity.startTime && activity.endTime) {
      const diff = new Date(activity.endTime) - new Date(activity.startTime);
      activity.hours = Math.round((diff / (1000 * 60 * 60)) * 10) / 10;
    }
    
    await activity.save();
    
    // Update stats if status changed to completed
    if (req.body.status === 'completed' && activity.status === 'completed') {
      await User.findByIdAndUpdate(activity.user, {
        $inc: { 
          'stats.totalHours': activity.hours || 0,
          'stats.activitiesCompleted': 1
        }
      });
    }
    
    res.json({ item: activity });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update activity' });
  }
});

// Verify activity (admin/evaluator)
router.patch('/:id/verify', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);
    if (!['admin', 'evaluator'].includes(user.role)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const activity = await Activity.findByIdAndUpdate(
      req.params.id,
      { verified: true, verifiedBy: req.user.sub },
      { new: true }
    );
    if (!activity) return res.status(404).json({ error: 'Activity not found' });
    
    res.json({ item: activity });
  } catch (e) {
    res.status(500).json({ error: 'Failed to verify activity' });
  }
});

export default router;

