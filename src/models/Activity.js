import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { 
      type: String, 
      enum: ['volunteer', 'training', 'meeting', 'event', 'placement', 'evaluation', 'other'],
      required: true 
    },
    title: { type: String, required: true },
    description: String,
    location: String,
    hub: { type: mongoose.Schema.Types.ObjectId, ref: 'Hub' },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    startTime: Date,
    endTime: Date,
    hours: Number, // Calculated volunteer hours
    status: { type: String, enum: ['scheduled', 'in_progress', 'completed', 'cancelled'], default: 'scheduled' },
    verified: { type: Boolean, default: false },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: String,
    attachments: [{ url: String, type: String, name: String }]
  },
  { timestamps: true }
);

export default mongoose.model('Activity', activitySchema);

