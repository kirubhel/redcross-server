import { Router } from 'express';
import jwt from 'jsonwebtoken';
import Placement from '../models/Placement.js';
import VolunteerRequest from '../models/VolunteerRequest.js';
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

// Apply for placement (volunteer)
router.post('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);
    if (user.role !== 'volunteer') {
      return res.status(403).json({ error: 'Volunteers only' });
    }
    
    const placement = await Placement.create({
      ...req.body,
      volunteer: req.user.sub
    });
    
    // Update volunteer request count
    if (req.body.request) {
      const request = await VolunteerRequest.findById(req.body.request);
      if (request) {
        request.currentVolunteers += 1;
        if (request.currentVolunteers >= request.numberOfVolunteers) {
          request.status = 'filled';
        }
        await request.save();
      }
    }
    
    res.json({ item: placement });
  } catch (e) {
    res.status(500).json({ error: 'Failed to create placement', details: e.message });
  }
});

// Get my placements
router.get('/my', auth, async (req, res) => {
  try {
    const placements = await Placement.find({ volunteer: req.user.sub })
      .populate('hub', 'name address contactPerson')
      .populate('request', 'title description')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ items: placements });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch placements' });
  }
});

// Get all placements (admin/hub coordinator)
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);
    if (!['admin', 'hub_coordinator'].includes(user.role)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const { status, hub } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (hub) filter.hub = hub;
    
    const placements = await Placement.find(filter)
      .populate('volunteer', 'name email phone')
      .populate('hub', 'name')
      .populate('request', 'title')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ items: placements });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch placements' });
  }
});

// Update placement status (admin/hub)
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);
    const placement = await Placement.findById(req.params.id);
    if (!placement) return res.status(404).json({ error: 'Placement not found' });
    
    if (user.role !== 'admin' && placement.hub.toString() !== user.hubAffiliation?.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    placement.status = req.body.status;
    await placement.save();
    
    res.json({ item: placement });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update placement' });
  }
});

export default router;

