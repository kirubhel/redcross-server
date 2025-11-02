import mongoose from 'mongoose';

const volunteerRequestSchema = new mongoose.Schema(
  {
    hub: { type: mongoose.Schema.Types.ObjectId, ref: 'Hub', required: true },
    title: { type: String, required: true },
    description: String,
    category: { type: String, enum: ['health', 'education', 'disaster', 'community', 'technology', 'other'] },
    requiredSkills: [{ type: String }],
    criteria: {
      // Dynamic criteria that can be added
      ageMin: Number,
      ageMax: Number,
      gender: { type: String, enum: ['any', 'male', 'female', 'other'] },
      qualifications: [{ type: String }],
      experience: Number, // years
      languages: [{ type: String }],
      availability: [{ type: String }], // days of week
      customCriteria: mongoose.Schema.Types.Mixed // For dynamic additions
    },
    startDate: Date,
    endDate: Date,
    location: {
      city: String,
      region: String,
      address: String,
      coordinates: { lat: Number, lng: Number }
    },
    numberOfVolunteers: { type: Number, required: true },
    currentVolunteers: { type: Number, default: 0 },
    status: { type: String, enum: ['open', 'filled', 'closed', 'cancelled'], default: 'open' },
    filledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Admin who approved
    filledAt: Date, // When volunteers were assigned
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    compensation: {
      provided: { type: Boolean, default: false },
      type: { type: String, enum: ['none', 'stipend', 'transport', 'meal', 'accommodation', 'mixed'] },
      amount: Number,
      currency: { type: String, default: 'ETB' }
    }
  },
  { timestamps: true }
);

export default mongoose.model('VolunteerRequest', volunteerRequestSchema);

