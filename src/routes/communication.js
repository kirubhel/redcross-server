import { Router } from 'express';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import Communication from '../models/Communication.js';
import User from '../models/User.js';
import Hub from '../models/Hub.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

// SMTP Configuration
const smtpConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USERNAME || 'kirub.hel@gmail.com',
    pass: process.env.SMTP_PASSWORD || 'dqys bnjk hhny khbk'
  }
};

const emailFrom = process.env.SMTP_FROM || 'kirub.hel@gmail.com';
const emailFromName = process.env.SMTP_FROM_NAME || 'Red Cross';

// Create reusable transporter
const transporter = nodemailer.createTransport(smtpConfig);

// Verify SMTP connection on startup
transporter.verify((error, success) => {
  if (error) {
    console.log('❌ SMTP connection error:', error);
  } else {
    console.log('✅ SMTP server is ready to send emails');
  }
});

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
      createdBy: req.user.sub,
      status: 'sending'
    });
    
    // Start sending emails asynchronously
    (async () => {
      try {
        const c = await Communication.findById(comm._id);
        if (!c) return;
        
        // Determine recipients based on type
        let recipients = [];
        if (c.recipients.type === 'all') {
          recipients = await User.find({}).select('email phone name').lean();
        } else if (c.recipients.type === 'volunteers') {
          recipients = await User.find({ role: 'volunteer' }).select('email phone name').lean();
        } else if (c.recipients.type === 'members') {
          recipients = await User.find({ role: 'member' }).select('email phone name').lean();
        } else if (c.recipients.type === 'hubs') {
          const hubs = await Hub.find({}).select('email phone contactPerson name').lean();
          recipients = hubs.map(hub => ({
            email: hub.email,
            phone: hub.phone,
            name: hub.contactPerson || hub.name
          }));
        } else if (c.recipients.type === 'custom') {
          recipients = await User.find({ _id: { $in: c.recipients.userIds } }).select('email phone name').lean();
        }
        
        // Filter recipients with valid email addresses
        const validRecipients = recipients.filter(r => r.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email));
        
        let sent = 0;
        let failed = 0;
        
        // Send emails
        if (c.type === 'email' && validRecipients.length > 0) {
          const emailPromises = validRecipients.map(async (recipient) => {
            try {
              await transporter.sendMail({
                from: `"${emailFromName}" <${emailFrom}>`,
                to: recipient.email,
                subject: c.subject || 'Red Cross Communication',
                html: `
                  <!DOCTYPE html>
                  <html>
                  <head>
                    <style>
                      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                      .header { background-color: #DC143C; color: white; padding: 20px; text-align: center; }
                      .content { padding: 20px; background-color: #f9f9f9; }
                      .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
                    </style>
                  </head>
                  <body>
                    <div class="container">
                      <div class="header">
                        <h1>Ethiopian Red Cross Society</h1>
                      </div>
                      <div class="content">
                        <p>Dear ${recipient.name || 'Valued Member'},</p>
                        <div>${c.content.replace(/\n/g, '<br>')}</div>
                        <p>Thank you for your continued support.</p>
                        <p>Best regards,<br>Red Cross Team</p>
                      </div>
                      <div class="footer">
                        <p>This is an automated message from the Ethiopian Red Cross Society.</p>
                        <p>&copy; ${new Date().getFullYear()} Ethiopian Red Cross Society</p>
                      </div>
                    </div>
                  </body>
                  </html>
                `,
                text: c.content // Plain text fallback
              });
              return { success: true };
            } catch (error) {
              console.error(`Failed to send email to ${recipient.email}:`, error.message);
              return { success: false, error: error.message };
            }
          });
          
          const results = await Promise.all(emailPromises);
          sent = results.filter(r => r.success).length;
          failed = results.filter(r => !r.success).length;
        } else if (validRecipients.length === 0) {
          console.warn('No valid email recipients found');
          failed = recipients.length;
        }
        
        // Update communication status
        c.status = failed === 0 && sent > 0 ? 'sent' : failed > 0 ? 'failed' : 'sent';
        c.sentAt = new Date();
        c.sentCount = sent;
        c.failedCount = failed;
        await c.save();
        
        console.log(`✅ Communication ${c._id}: Sent ${sent}, Failed ${failed}`);
      } catch (error) {
        console.error('Error sending communication:', error);
        const c = await Communication.findById(comm._id);
        if (c) {
          c.status = 'failed';
          c.failedCount = c.sentCount || 0;
          await c.save();
        }
      }
    })();
    
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

