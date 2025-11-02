import mongoose from 'mongoose';

const recognitionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { 
      type: String, 
      enum: ['volunteer_of_month', 'outstanding_contribution', 'long_service', 'achievement', 'award', 'badge'],
      required: true 
    },
    title: { type: String, required: true },
    description: String,
    category: String,
    issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    issuedDate: { type: Date, default: Date.now },
    expiresAt: Date,
    featured: { type: Boolean, default: false }, // For blog/announcement
    image: String, // URL to badge/image
    metrics: {
      hoursVolunteered: Number,
      activitiesCompleted: Number,
      impactDescription: String
    }
  },
  { timestamps: true }
);

export default mongoose.model('Recognition', recognitionSchema);

