import mongoose from 'mongoose';

const trainingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    category: { type: String, enum: ['first_aid', 'disaster_response', 'leadership', 'technical', 'soft_skills', 'other'] },
    level: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
    instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    startDate: Date,
    endDate: Date,
    duration: Number, // hours
    location: String,
    maxParticipants: Number,
    currentParticipants: Number,
    status: { type: String, enum: ['scheduled', 'ongoing', 'completed', 'cancelled'], default: 'scheduled' },
    materials: [{ url: String, type: String, name: String }],
    prerequisites: [{ type: String }],
    certification: {
      provided: { type: Boolean, default: false },
      certificateName: String,
      validFor: Number // months
    },
    cost: {
      amount: Number,
      currency: { type: String, default: 'ETB' },
      free: { type: Boolean, default: true }
    }
  },
  { timestamps: true }
);

export default mongoose.model('Training', trainingSchema);

