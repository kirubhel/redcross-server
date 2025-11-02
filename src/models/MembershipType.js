import mongoose from 'mongoose';

const membershipTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // e.g., "Basic", "Premium", "Annual"
    description: String,
    amount: { type: Number, required: true }, // in ETB
    currency: { type: String, default: 'ETB' },
    duration: { type: Number, required: true }, // in months
    durationType: { type: String, enum: ['month', 'year'], default: 'year' },
    benefits: [{ type: String }], // Array of benefit descriptions
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 } // For sorting
  },
  { timestamps: true }
);

export default mongoose.model('MembershipType', membershipTypeSchema);

