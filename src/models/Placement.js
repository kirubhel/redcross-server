import mongoose from 'mongoose';

const placementSchema = new mongoose.Schema(
  {
    volunteer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    hub: { type: mongoose.Schema.Types.ObjectId, ref: 'Hub', required: true },
    request: { type: mongoose.Schema.Types.ObjectId, ref: 'VolunteerRequest' },
    status: { 
      type: String, 
      enum: ['pending', 'approved', 'active', 'completed', 'terminated', 'declined'],
      default: 'pending'
    },
    startDate: Date,
    endDate: Date,
    expectedEndDate: Date,
    role: String,
    responsibilities: [{ type: String }],
    supervisor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    performance: {
      rating: Number,
      review: String,
      lastReviewDate: Date
    },
    notes: String
  },
  { timestamps: true }
);

export default mongoose.model('Placement', placementSchema);

