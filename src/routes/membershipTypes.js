import express from 'express'
import MembershipType from '../models/MembershipType.js'
import { authMiddleware, adminMiddleware } from '../middleware/auth.js'

const router = express.Router()

// Get all active membership types (public) or all types for admin
router.get('/', async (req, res) => {
  try {
    const { admin } = req.query
    let query = { active: true } // Default: only active types
    
    // If admin query param is true, try to get authenticated user
    if (admin === 'true') {
      const header = req.headers.authorization || ''
      const token = header.startsWith('Bearer ') ? header.slice(7) : null
      if (token) {
        try {
          const jwt = require('jsonwebtoken')
          const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'
          const User = require('../models/User.js').default
          const decoded = jwt.verify(token, JWT_SECRET)
          const user = await User.findById(decoded.sub)
          
          // If user is admin, return all types (including inactive)
          if (user && ['admin', 'hub_coordinator'].includes(user.role)) {
            query = {} // Return all types for admin
          }
        } catch (e) {
          // Invalid token, keep default query (active only)
        }
      }
    }
    
    const types = await MembershipType.find(query)
      .sort({ order: 1, amount: 1 })
      .lean()
    res.json({ items: types })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get single membership type
router.get('/:id', async (req, res) => {
  try {
    const type = await MembershipType.findById(req.params.id).lean()
    if (!type) return res.status(404).json({ error: 'Membership type not found' })
    res.json({ item: type })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Create membership type (admin only)
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const type = await MembershipType.create(req.body)
    res.json({ item: type })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Update membership type (admin only)
router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const type = await MembershipType.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    )
    if (!type) return res.status(404).json({ error: 'Membership type not found' })
    res.json({ item: type })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Delete membership type (admin only)
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const type = await MembershipType.findByIdAndDelete(req.params.id)
    if (!type) return res.status(404).json({ error: 'Membership type not found' })
    res.json({ message: 'Membership type deleted' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router

