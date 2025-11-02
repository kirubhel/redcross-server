import { Router } from 'express';
import jwt from 'jsonwebtoken';
import Payment from '../models/Payment.js';
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

// Create payment (simulation)
router.post('/', auth, async (req, res) => {
  try {
    const { amount, type, method, description, relatedTo } = req.body;
    
    // Generate transaction ID
    const transactionId = `TXN${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    const payment = await Payment.create({
      user: req.user.sub,
      amount,
      type,
      method,
      description,
      transactionId,
      relatedTo,
      status: 'processing', // Simulate processing
      metadata: {
        userAgent: req.headers['user-agent'],
        ip: req.ip,
        timestamp: new Date()
      }
    });
    
    // Simulate payment processing (in real app, this would call payment gateway)
    setTimeout(async () => {
      const p = await Payment.findById(payment._id);
      p.status = Math.random() > 0.1 ? 'completed' : 'failed'; // 90% success rate
      if (p.status === 'failed') {
        p.failureReason = 'Simulated payment failure';
      } else {
        p.processedAt = new Date();
        // Update user stats
        await User.findByIdAndUpdate(req.user.sub, {
          $inc: { 'stats.donationsMade': 1 }
        });
      }
      await p.save();
    }, 2000);
    
    res.json({ 
      item: payment,
      message: 'Payment initiated. Status will be updated shortly.'
    });
  } catch (e) {
    res.status(500).json({ error: 'Payment creation failed', details: e.message });
  }
});

// Get user's payments
router.get('/my', auth, async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.user.sub })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ items: payments });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// Get all payments (admin only)
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);
    if (user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    
    const { status, type, method, startDate, endDate } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (method) filter.method = method;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    const payments = await Payment.find(filter)
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 })
      .lean();
    
    const total = payments.reduce((sum, p) => sum + (p.status === 'completed' ? p.amount : 0), 0);
    
    res.json({ items: payments, summary: { total, count: payments.length } });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// Get payment by transaction ID
router.get('/transaction/:id', auth, async (req, res) => {
  try {
    const payment = await Payment.findOne({ transactionId: req.params.id })
      .populate('user', 'name email')
      .lean();
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    
    // Only allow user to see their own payment unless admin
    const user = await User.findById(req.user.sub);
    if (user.role !== 'admin' && payment.user._id.toString() !== req.user.sub) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    res.json({ item: payment });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch payment' });
  }
});

// Initiate donation payment (public - no auth required)
router.post('/donation', async (req, res) => {
  try {
    const { first_name, amount, email, phone_number, title, return_url, description, currency } = req.body;
    
    // Ensure title is max 16 characters for Chapa API
    const paymentTitle = (title || 'ERCS Donation').substring(0, 16);
    
    // Frontend URL - use production URL if deployed, otherwise localhost
    const frontendUrl = process.env.FRONTEND_URL || 
      (process.env.NODE_ENV === 'production' 
        ? 'https://redcross-cleint.vercel.app' 
        : 'http://localhost:5173');
    
    // Payment Gateway URL - use production URL if deployed, otherwise localhost
    const paymentGatewayUrl = process.env.PAYMENT_GATEWAY_URL || 
      (process.env.NODE_ENV === 'production' 
        ? 'https://redcross-server-ckgo.vercel.app' 
        : 'http://localhost:8080');
    const response = await fetch(`${paymentGatewayUrl}/chapa/donation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        first_name,
        amount,
        email,
        phone_number,
        title: paymentTitle,
        return_url: return_url || `${frontendUrl}/donation/success`,
        // Description removed to avoid Chapa API validation errors
        currency: currency || 'ETB'
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json(data);
    }
    
    // Create payment record (without user if not logged in)
    const transactionId = data.response?.tx_ref || `TXN${Date.now()}`;
    
    // If payment gateway returns checkout URL, store it temporarily
    res.json({
      response: data.response,
      transactionId,
      checkoutUrl: data.response?.data?.checkout_url
    });
  } catch (error) {
    console.error('Donation payment error:', error);
    res.status(500).json({ error: 'Payment initialization failed', details: error.message });
  }
});

// Initiate membership payment
router.post('/membership', auth, async (req, res) => {
  try {
    const { membershipTypeId, amount, email, phone_number } = req.body;
    
    // Add 2 ETB processing fee for members
    const PROCESSING_FEE = 2;
    const totalAmount = parseFloat(amount) + PROCESSING_FEE;
    
    // Payment Gateway URL - use production URL if deployed, otherwise localhost
    const paymentGatewayUrl = process.env.PAYMENT_GATEWAY_URL || 
      (process.env.NODE_ENV === 'production' 
        ? 'https://redcross-server-ckgo.vercel.app' 
        : 'http://localhost:8080');
    const user = await User.findById(req.user.sub);
    
    // Ensure title is max 16 characters for Chapa API
    const title = 'ERCS Membership'.substring(0, 16);
    
    // Frontend URL - adjust port if your frontend runs on different port
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    const response = await fetch(`${paymentGatewayUrl}/chapa`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        first_name: user.name.split(' ')[0] || user.name,
        amount: totalAmount,
        email: email || user.email,
        phone_number: phone_number || user.phone,
        title: title,
        return_url: `${frontendUrl}/register/success?type=membership`,
        currency: 'ETB'
        // Description removed to avoid Chapa API validation errors
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json(data);
    }
    
    // Create payment record
    const transactionId = data.response?.tx_ref || `TXN${Date.now()}`;
    
    const payment = await Payment.create({
      user: req.user.sub,
      amount: totalAmount, // Store total amount including processing fee
      type: 'membership_fee',
      method: 'mobile_money',
      transactionId,
      status: 'pending',
      metadata: {
        membershipTypeId,
        paymentGateway: 'chapa',
        membershipAmount: parseFloat(amount), // Original membership fee
        processingFee: PROCESSING_FEE, // Processing fee
        totalAmount: totalAmount // Total charged
      }
    });
    
    res.json({
      response: data.response,
      transactionId,
      paymentId: payment._id,
      checkoutUrl: data.response?.data?.checkout_url
    });
  } catch (error) {
    console.error('Membership payment error:', error);
    res.status(500).json({ error: 'Payment initialization failed', details: error.message });
  }
});

export default router;

