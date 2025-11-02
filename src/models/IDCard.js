import mongoose from 'mongoose';

const idCardSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    cardNumber: { type: String, required: true, unique: true },
    type: { type: String, enum: ['volunteer', 'member', 'staff'], required: true },
    status: { type: String, enum: ['active', 'expired', 'revoked'], default: 'active' },
    issuedDate: { type: Date, default: Date.now },
    expiryDate: Date,
    issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    photo: String, // URL to photo
    qrCode: String, // QR code data
    metadata: mongoose.Schema.Types.Mixed,
    printCount: { type: Number, default: 0 },
    lastPrintedAt: Date
  },
  { timestamps: true }
);

export default mongoose.model('IDCard', idCardSchema);

