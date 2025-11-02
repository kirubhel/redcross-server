import mongoose from 'mongoose';

const hubSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    organizationType: { type: String, enum: ['ngo', 'government', 'private', 'academic', 'other'], required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    address: {
      city: String,
      region: String,
      street: String,
      coordinates: { lat: Number, lng: Number }
    },
    contactPerson: {
      name: String,
      title: String,
      email: String,
      phone: String
    },
    status: { type: String, enum: ['pending', 'approved', 'suspended', 'rejected'], default: 'pending' },
    verified: { type: Boolean, default: false },
    registrationDate: { type: Date, default: Date.now },
    description: String,
    website: String,
    socialMedia: {
      telegram: String,
      facebook: String,
      tiktok: String,
      twitter: String,
      instagram: String
    },
    capacity: { type: Number, default: 0 }, // Max volunteers they can host
    activeVolunteers: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export default mongoose.model('Hub', hubSchema);

