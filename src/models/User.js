import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['volunteer', 'member', 'admin', 'hub_coordinator', 'evaluator'], default: 'volunteer' },
    phone: { type: String, required: true },
    alternativePhone: String,
    dateOfBirth: Date,
    gender: { type: String, enum: ['male', 'female', 'other', 'prefer_not_to_say'] },
    address: {
      city: String,
      region: String,
      subcity: String,
      woreda: String,
      kebele: String,
      street: String,
      postalCode: String
    },
    identification: {
      idType: { type: String, enum: ['national_id', 'passport', 'driving_license', 'other'] },
      idNumber: String
    },
    profile: {
      photo: String,
      bio: String,
      skills: [{ type: String }],
      qualifications: [{ 
        title: String,
        institution: String,
        year: Number,
        certificate: String
      }],
      languages: [{ 
        language: String,
        proficiency: { type: String, enum: ['basic', 'conversational', 'fluent', 'native'] }
      }],
      emergencyContact: {
        name: String,
        relationship: String,
        phone: String,
        email: String
      }
    },
    socialMedia: {
      telegram: { username: String, verified: { type: Boolean, default: false } },
      facebook: { username: String, verified: { type: Boolean, default: false } },
      tiktok: { username: String, verified: { type: Boolean, default: false } },
      twitter: { username: String, verified: { type: Boolean, default: false } },
      instagram: { username: String, verified: { type: Boolean, default: false } }
    },
    preferences: {
      language: { type: String, default: 'en' }, // en, am, or, etc.
      notifications: {
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        telegram: { type: Boolean, default: false },
        facebook: { type: Boolean, default: false }
      },
      availability: [{ 
        day: { type: String, enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] },
        timeSlots: [{ start: String, end: String }]
      }],
      interests: [{ type: String }],
      preferredRegions: [{ type: String }]
    },
    membershipStatus: { type: String, enum: ['none', 'active', 'expired', 'suspended'], default: 'none' },
    membershipExpiry: Date,
    volunteerStatus: { type: String, enum: ['active', 'inactive', 'on_leave', 'suspended'], default: 'active' },
    stats: {
      totalHours: { type: Number, default: 0 },
      activitiesCompleted: { type: Number, default: 0 },
      donationsMade: { type: Number, default: 0 },
      trainingsCompleted: { type: Number, default: 0 },
      recognitionsReceived: { type: Number, default: 0 }
    },
    verified: { type: Boolean, default: false },
    verifiedAt: Date,
    lastLoginAt: Date,
    hubAffiliation: { type: mongoose.Schema.Types.ObjectId, ref: 'Hub' }
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);



