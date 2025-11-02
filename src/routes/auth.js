import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

router.post('/register', async (req, res) => {
  const { name, email, password, role, phone, membershipTypeId, ...otherData } = req.body;
  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already in use' });
    const passwordHash = await bcrypt.hash(password, 10);
    
    let membershipExpiry = null;
    let membershipStatus = 'none';
    
    // If member with membership type, calculate expiry
    if (role === 'member' && membershipTypeId) {
      const MembershipType = (await import('../models/MembershipType.js')).default;
      const membershipType = await MembershipType.findById(membershipTypeId);
      if (membershipType) {
        const expiryDate = new Date();
        if (membershipType.durationType === 'year') {
          expiryDate.setFullYear(expiryDate.getFullYear() + membershipType.duration);
        } else {
          expiryDate.setMonth(expiryDate.getMonth() + membershipType.duration);
        }
        membershipExpiry = expiryDate;
        membershipStatus = 'active';
      }
    }
    
    const user = await User.create({ 
      name, 
      email, 
      passwordHash, 
      role: role || 'volunteer',
      phone: phone || '',
      membershipStatus,
      membershipExpiry,
      ...otherData
    });
    
    const token = jwt.sign({ sub: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ 
      token,
      id: user._id, 
      name: user.name, 
      email: user.email, 
      role: user.role,
      phone: user.phone
    });
  } catch (e) {
    res.status(500).json({ error: 'Registration failed', details: e.message });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    
    // Update last login
    user.lastLoginAt = new Date();
    await user.save();
    
    const token = jwt.sign({ sub: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ 
      token, 
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        phone: user.phone,
        stats: user.stats,
        verified: user.verified
      } 
    });
  } catch (e) {
    res.status(500).json({ error: 'Login failed', details: e.message });
  }
});

// Update profile
router.patch('/profile', async (req, res) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findByIdAndUpdate(decoded.sub, req.body, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (e) {
    res.status(500).json({ error: 'Profile update failed', details: e.message });
  }
});

export default router;



