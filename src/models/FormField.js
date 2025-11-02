import mongoose from 'mongoose'

const formFieldSchema = new mongoose.Schema(
  {
    formType: { 
      type: String, 
      required: true, 
      enum: ['volunteer', 'member', 'hub'],
      index: true 
    },
    fieldKey: { 
      type: String, 
      required: true 
    },
    fieldType: { 
      type: String, 
      required: true,
      enum: ['text', 'email', 'tel', 'number', 'date', 'select', 'textarea', 'checkbox', 'radio', 'file']
    },
    label: { 
      type: String, 
      required: true 
    },
    placeholder: String,
    description: String,
    required: { 
      type: Boolean, 
      default: false 
    },
    options: [{ 
      label: String, 
      value: String 
    }], // For select, radio types
    validation: {
      minLength: Number,
      maxLength: Number,
      min: Number,
      max: Number,
      pattern: String, // regex pattern
      customValidation: String // JavaScript validation function as string
    },
    defaultValue: mongoose.Schema.Types.Mixed,
    order: { 
      type: Number, 
      default: 0 
    },
    section: String, // Group fields into sections
    isActive: { 
      type: Boolean, 
      default: true 
    },
    adminOnly: { 
      type: Boolean, 
      default: false 
    }, // Fields only visible to admins
    createdBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User',
      required: true 
    },
    updatedBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User' 
    }
  },
  { timestamps: true }
)

// Compound index for unique field keys per form type
formFieldSchema.index({ formType: 1, fieldKey: 1 }, { unique: true })

export default mongoose.model('FormField', formFieldSchema)


