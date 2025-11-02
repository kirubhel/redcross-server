import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    summary: String,
    status: { type: String, enum: ['planning', 'active', 'paused', 'completed'], default: 'planning' },
    leads: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  },
  { timestamps: true }
);

export default mongoose.model('Project', projectSchema);



