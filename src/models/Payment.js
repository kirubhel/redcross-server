import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { 
      type: String, 
      enum: ['donation', 'membership_fee', 'event_fee', 'training_fee', 'other'],
      required: true 
    },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'ETB' },
    method: { 
      type: String, 
      enum: ['mobile_money', 'bank_transfer', 'card', 'cash', 'other'],
      required: true 
    },
    transactionId: { type: String, unique: true, sparse: true },
    status: { 
      type: String, 
      enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
      default: 'pending'
    },
    paymentProvider: String, // M-Pesa, Telebirr, CBE, etc.
    metadata: mongoose.Schema.Types.Mixed,
    receipt: String, // URL to receipt
    description: String,
    relatedTo: {
      type: { type: String, enum: ['event', 'project', 'hub', 'training', null] },
      refId: mongoose.Schema.Types.ObjectId
    },
    processedAt: Date,
    failureReason: String
  },
  { timestamps: true }
);

export default mongoose.model('Payment', paymentSchema);

