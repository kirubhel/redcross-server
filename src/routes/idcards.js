import { Router } from 'express';
import jwt from 'jsonwebtoken';
import IDCard from '../models/IDCard.js';
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

// Generate ID card (admin)
router.post('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);
    if (user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    
    const targetUser = await User.findById(req.body.userId);
    if (!targetUser) return res.status(404).json({ error: 'User not found' });
    
    // Check if user already has an active ID card
    const existingCard = await IDCard.findOne({ user: req.body.userId, status: 'active' });
    if (existingCard) {
      return res.status(400).json({ error: 'User already has an active ID card' });
    }
    
    // Generate card number
    const cardNumber = `ERC${targetUser.role.toUpperCase().substring(0, 2)}${Date.now().toString().slice(-8)}${Math.random().toString(36).substring(2, 4).toUpperCase()}`;
    
    // Generate QR code data
    const qrData = JSON.stringify({
      cardNumber,
      userId: targetUser._id,
      name: targetUser.name,
      role: targetUser.role,
      verified: targetUser.verified
    });
    
    const idCard = await IDCard.create({
      user: req.body.userId,
      cardNumber,
      type: targetUser.role,
      issuedBy: req.user.sub,
      qrCode: qrData,
      photo: targetUser.profile?.photo || req.body.photo,
      expiryDate: req.body.expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year default
    });
    
    res.json({ item: idCard });
  } catch (e) {
    res.status(500).json({ error: 'Failed to generate ID card', details: e.message });
  }
});

// Generate ID card for member (self-service)
router.post('/member', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);
    if (user.role !== 'member') {
      return res.status(403).json({ error: 'Members only' });
    }
    
    // Check if user already has an active ID card
    const existingCard = await IDCard.findOne({ user: req.user.sub, status: 'active' });
    if (existingCard) {
      return res.status(400).json({ error: 'You already have an active ID card' });
    }
    
    // Check if user has a photo
    if (!req.body.photo && !user.profile?.photo) {
      return res.status(400).json({ error: 'Photo is required to generate ID card' });
    }
    
    // Update user profile with photo if provided
    if (req.body.photo && !user.profile?.photo) {
      user.profile = user.profile || {};
      user.profile.photo = req.body.photo;
      await user.save();
    }
    
    // Generate card number
    const cardNumber = `ERC${user.role.toUpperCase().substring(0, 2)}${Date.now().toString().slice(-8)}${Math.random().toString(36).substring(2, 4).toUpperCase()}`;
    
    // Generate QR code data
    const qrData = JSON.stringify({
      cardNumber,
      userId: user._id,
      name: user.name,
      role: user.role,
      verified: user.verified
    });
    
    // Calculate expiry based on membership expiry if available
    let expiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // Default 1 year
    if (user.membershipExpiry) {
      expiryDate = user.membershipExpiry;
    }
    
    const idCard = await IDCard.create({
      user: req.user.sub,
      cardNumber,
      type: user.role,
      qrCode: qrData,
      photo: user.profile?.photo || req.body.photo,
      expiryDate: expiryDate
    });
    
    res.json({ item: idCard });
  } catch (e) {
    res.status(500).json({ error: 'Failed to generate ID card', details: e.message });
  }
});

// Generate ID card for volunteer (self-service)
router.post('/volunteer', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);
    if (user.role !== 'volunteer') {
      return res.status(403).json({ error: 'Volunteers only' });
    }
    
    // Check if user already has an active ID card
    const existingCard = await IDCard.findOne({ user: req.user.sub, status: 'active' });
    if (existingCard) {
      return res.status(400).json({ error: 'You already have an active ID card' });
    }
    
    // Check if user has a photo
    if (!req.body.photo && !user.profile?.photo) {
      return res.status(400).json({ error: 'Photo is required to generate ID card' });
    }
    
    // Update user profile with photo if provided
    if (req.body.photo && !user.profile?.photo) {
      user.profile = user.profile || {};
      user.profile.photo = req.body.photo;
      await user.save();
    }
    
    // Generate card number
    const cardNumber = `ERC${user.role.toUpperCase().substring(0, 2)}${Date.now().toString().slice(-8)}${Math.random().toString(36).substring(2, 4).toUpperCase()}`;
    
    // Generate QR code data
    const qrData = JSON.stringify({
      cardNumber,
      userId: user._id,
      name: user.name,
      role: user.role,
      verified: user.verified
    });
    
    // Default expiry: 1 year for volunteers
    const expiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    
    const idCard = await IDCard.create({
      user: req.user.sub,
      cardNumber,
      type: user.role,
      qrCode: qrData,
      photo: user.profile?.photo || req.body.photo,
      expiryDate: expiryDate
    });
    
    res.json({ item: idCard });
  } catch (e) {
    res.status(500).json({ error: 'Failed to generate ID card', details: e.message });
  }
});

// Get my ID card
router.get('/my', auth, async (req, res) => {
  try {
    const idCard = await IDCard.findOne({ user: req.user.sub, status: 'active' })
      .populate('user', 'name profile')
      .populate('issuedBy', 'name')
      .lean();
    if (!idCard) return res.status(404).json({ error: 'No active ID card found' });
    
    // Include user photo from profile if not in card
    if (!idCard.photo && idCard.user?.profile?.photo) {
      idCard.photo = idCard.user.profile.photo;
    }
    
    res.json({ item: idCard });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch ID card' });
  }
});

// Get ID card by card number
router.get('/card/:cardNumber', async (req, res) => {
  try {
    const idCard = await IDCard.findOne({ cardNumber: req.params.cardNumber })
      .populate('user', 'name email phone profile')
      .lean();
    if (!idCard) return res.status(404).json({ error: 'ID card not found' });
    
    // Only return public info
    res.json({ 
      item: {
        cardNumber: idCard.cardNumber,
        type: idCard.type,
        status: idCard.status,
        user: {
          name: idCard.user.name,
          photo: idCard.user.profile?.photo
        }
      }
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to verify ID card' });
  }
});

// Get all ID cards (admin)
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);
    if (user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    
    const idCards = await IDCard.find({})
      .populate('user', 'name email phone')
      .populate('issuedBy', 'name')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ items: idCards });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch ID cards' });
  }
});

export default router;

