import express from 'express'
import FormField from '../models/FormField.js'
import { authMiddleware, adminMiddleware } from '../middleware/auth.js'

const router = express.Router()

// Get all form fields for a specific form type (public - used in registration)
router.get('/:formType', async (req, res) => {
  try {
    const { formType } = req.params
    const fields = await FormField.find({ 
      formType, 
      isActive: true 
    }).sort({ order: 1, createdAt: 1 })
    res.json(fields)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get all form fields (admin only - includes inactive)
router.get('/admin/:formType', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { formType } = req.params
    const fields = await FormField.find({ formType }).sort({ order: 1, createdAt: 1 })
    res.json(fields)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Create new form field (admin only)
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const fieldData = {
      ...req.body,
      createdBy: req.user.id
    }
    const field = new FormField(fieldData)
    await field.save()
    res.status(201).json(field)
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ error: 'Field key already exists for this form type' })
    } else {
      res.status(500).json({ error: error.message })
    }
  }
})

// Update form field (admin only)
router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const field = await FormField.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.user.id },
      { new: true, runValidators: true }
    )
    if (!field) {
      return res.status(404).json({ error: 'Form field not found' })
    }
    res.json(field)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Delete form field (admin only) - soft delete by setting isActive to false
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const field = await FormField.findByIdAndUpdate(
      req.params.id,
      { isActive: false, updatedBy: req.user.id },
      { new: true }
    )
    if (!field) {
      return res.status(404).json({ error: 'Form field not found' })
    }
    res.json({ message: 'Form field deactivated successfully', field })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Reorder fields (admin only)
router.post('/:formType/reorder', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { formType } = req.params
    const { fieldIds } = req.body // Array of field IDs in new order
    
    const updatePromises = fieldIds.map((fieldId, index) => 
      FormField.findByIdAndUpdate(fieldId, { order: index }, { new: true })
    )
    
    await Promise.all(updatePromises)
    const fields = await FormField.find({ formType }).sort({ order: 1 })
    res.json(fields)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router

