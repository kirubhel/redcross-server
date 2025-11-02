import { Router } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Activity from '../models/Activity.js';
import Payment from '../models/Payment.js';
import Placement from '../models/Placement.js';
import VolunteerRequest from '../models/VolunteerRequest.js';
import Hub from '../models/Hub.js';
import Training from '../models/Training.js';
import Recognition from '../models/Recognition.js';

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

// Dashboard analytics
router.get('/dashboard', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);
    if (!['admin', 'hub_coordinator'].includes(user.role)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const { startDate, endDate } = req.query;
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }
    
    // Get all stats
    const [
      totalVolunteers,
      totalMembers,
      totalHubs,
      activePlacements,
      totalActivities,
      totalHours,
      totalDonations,
      activeRequests,
      completedTrainings,
      recognitions
    ] = await Promise.all([
      User.countDocuments({ role: 'volunteer' }),
      User.countDocuments({ role: 'member' }),
      Hub.countDocuments({ status: 'approved' }),
      Placement.countDocuments({ status: 'active' }),
      Activity.countDocuments({ status: 'completed', ...dateFilter }),
      Activity.aggregate([
        { $match: { status: 'completed', ...dateFilter } },
        { $group: { _id: null, total: { $sum: '$hours' } } }
      ]),
      Payment.aggregate([
        { $match: { status: 'completed', ...dateFilter } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      VolunteerRequest.countDocuments({ status: 'open' }),
      Training.countDocuments({ status: 'completed', ...dateFilter }),
      Recognition.countDocuments({ featured: true, ...dateFilter })
    ]);
    
    // Recent activities
    const recentActivities = await Activity.find({ status: 'completed', ...dateFilter })
      .populate('user', 'name')
      .populate('hub', 'name')
      .sort({ endTime: -1 })
      .limit(10)
      .lean();
    
    // Top volunteers by hours
    const topVolunteers = await User.find({ role: 'volunteer' })
      .sort({ 'stats.totalHours': -1 })
      .limit(10)
      .select('name stats profile')
      .lean();
    
    // Hub distribution
    const hubDistribution = await Hub.aggregate([
      { $group: { _id: '$address.region', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    res.json({
      summary: {
        totalVolunteers,
        totalMembers,
        totalHubs,
        activePlacements,
        totalActivities,
        totalHours: totalHours[0]?.total || 0,
        totalDonations: totalDonations[0]?.total || 0,
        activeRequests,
        completedTrainings,
        recognitions
      },
      recentActivities,
      topVolunteers,
      hubDistribution
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to generate dashboard data', details: e.message });
  }
});

// Custom report
router.post('/custom', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);
    if (user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    
    const { type, filters, format } = req.body;
    // Implementation for custom reports based on type and filters
    // This is a placeholder - in production, you'd generate actual reports
    
    res.json({ 
      message: 'Custom report generation',
      type,
      filters,
      format: format || 'json',
      data: [] // Generated report data
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to generate report', details: e.message });
  }
});

export default router;

