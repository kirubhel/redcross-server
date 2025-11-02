import mongoose from 'mongoose';

const communicationSchema = new mongoose.Schema(
  {
    type: { 
      type: String, 
      enum: ['email', 'sms', 'push', 'telegram', 'facebook', 'whatsapp'],
      required: true 
    },
    subject: String,
    content: { type: String, required: true },
    recipients: {
      type: { type: String, enum: ['all', 'volunteers', 'members', 'hubs', 'custom', 'role'] },
      roles: [{ type: String }],
      userIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      hubIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Hub' }]
    },
    status: { 
      type: String, 
      enum: ['draft', 'scheduled', 'sending', 'sent', 'failed'],
      default: 'draft'
    },
    scheduledAt: Date,
    sentAt: Date,
    sentCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    attachments: [{ url: String, type: String, name: String }]
  },
  { timestamps: true }
);

export default mongoose.model('Communication', communicationSchema);

