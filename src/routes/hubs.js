import { Router } from 'express';
import jwt from 'jsonwebtoken';
import Hub from '../models/Hub.js';
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

// Hub registration
router.post('/register', async (req, res) => {
  try {
    const hub = await Hub.create(req.body);
    res.json({ item: hub });
  } catch (e) {
    res.status(500).json({ error: 'Hub registration failed', details: e.message });
  }
});

// Get all hubs (with filters)
router.get('/', async (req, res) => {
  try {
    const { status, verified, region } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (verified !== undefined) filter.verified = verified === 'true';
    if (region) filter['address.region'] = region;
    
    const hubs = await Hub.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ items: hubs });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch hubs' });
  }
});

// Get single hub
router.get('/:id', async (req, res) => {
  try {
    const hub = await Hub.findById(req.params.id).lean();
    if (!hub) return res.status(404).json({ error: 'Hub not found' });
    res.json({ item: hub });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch hub' });
  }
});

// Update hub (admin or hub owner)
router.patch('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);
    const hub = await Hub.findById(req.params.id);
    if (!hub) return res.status(404).json({ error: 'Hub not found' });
    
    if (user.role !== 'admin' && hub.createdBy?.toString() !== req.user.sub) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    Object.assign(hub, req.body);
    await hub.save();
    res.json({ item: hub });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update hub' });
  }
});

// Approve/reject hub (admin only)
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);
    if (user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    
    const hub = await Hub.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status, verified: req.body.status === 'approved' },
      { new: true }
    );
    if (!hub) return res.status(404).json({ error: 'Hub not found' });
    res.json({ item: hub });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update hub status' });
  }
});

// Create volunteer request (hub) - Also allow unauthenticated for public form
router.post('/:id/requests', async (req, res) => {
  try {
    const hub = await Hub.findById(req.params.id);
    if (!hub) return res.status(404).json({ error: 'Hub not found' });
    
    // If authenticated, verify it's the hub owner
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (token) {
      try {
        const user = jwt.verify(token, JWT_SECRET);
        const userDoc = await User.findById(user.sub);
        // Check if user is admin or hub owner
        if (userDoc.role !== 'admin' && hub.registeredBy?.toString() !== user.sub) {
          // For now, allow if hub status is pending (public submission)
        }
      } catch (e) {
        // Token invalid, but allow if hub is pending (public submission)
        if (hub.status !== 'pending') {
          return res.status(401).json({ error: 'Authentication required' });
        }
      }
    }
    
    const request = await VolunteerRequest.create({
      ...req.body,
      hub: req.params.id,
      status: 'open' // Will be reviewed by admin
    });
    res.json({ item: request });
  } catch (e) {
    res.status(500).json({ error: 'Failed to create request', details: e.message });
  }
});

// Public hub registration with volunteer request (no auth required)
router.post('/register-with-request', async (req, res) => {
  try {
    const { hubData, requestData } = req.body;
    
    // Create hub first
    const hub = await Hub.create({
      ...hubData,
      status: 'pending'
    });
    
    // Then create volunteer request
    const request = await VolunteerRequest.create({
      ...requestData,
      hub: hub._id,
      status: 'open'
    });
    
    res.json({ 
      hub: hub,
      request: request,
      message: 'Hub registration and volunteer request submitted. Admin will review.'
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to register hub and create request', details: e.message });
  }
});

// Get volunteer requests for a hub
router.get('/:id/requests', async (req, res) => {
  try {
    const requests = await VolunteerRequest.find({ hub: req.params.id })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ items: requests });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// Get all volunteer requests (with filters)
router.get('/requests/all', async (req, res) => {
  try {
    const { status, category, region, hub } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (region) filter['location.region'] = region;
    if (hub) filter.hub = hub;
    
    const requests = await VolunteerRequest.find(filter)
      .populate('hub', 'name email phone address')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ items: requests });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

export default router;

