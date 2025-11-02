import mongoose from 'mongoose';

const evaluationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    evaluator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { 
      type: String, 
      enum: ['performance', 'placement', 'training', 'volunteer_request', 'periodic'],
      required: true 
    },
    relatedTo: {
      type: { type: String, enum: ['activity', 'training', 'placement', 'hub', null] },
      refId: mongoose.Schema.Types.ObjectId
    },
    ratings: {
      punctuality: { type: Number, min: 1, max: 5 },
      teamwork: { type: Number, min: 1, max: 5 },
      communication: { type: Number, min: 1, max: 5 },
      problemSolving: { type: Number, min: 1, max: 5 },
      dedication: { type: Number, min: 1, max: 5 },
      overall: { type: Number, min: 1, max: 5 }
    },
    comments: String,
    strengths: [{ type: String }],
    areasForImprovement: [{ type: String }],
    recommendations: String,
    status: { type: String, enum: ['draft', 'submitted', 'reviewed'], default: 'draft' }
  },
  { timestamps: true }
);

export default mongoose.model('Evaluation', evaluationSchema);

