import express from 'express'
import VolunteerRequest from '../models/VolunteerRequest.js'
import User from '../models/User.js'
import { authMiddleware, adminMiddleware } from '../middleware/auth.js'

const router = express.Router()

// Match volunteers to a request (admin only)
router.post('/match/:requestId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const request = await VolunteerRequest.findById(req.params.requestId).populate('hub')
    if (!request) {
      return res.status(404).json({ error: 'Request not found' })
    }

    if (request.status === 'filled') {
      return res.status(400).json({ error: 'Request is already filled' })
    }

    // Build query based on criteria
    const query = { role: 'volunteer', volunteerStatus: 'active' }

    // Age filtering (if dateOfBirth available)
    if (request.criteria.ageMin || request.criteria.ageMax) {
      const today = new Date()
      if (request.criteria.ageMin) {
        const maxBirthDate = new Date(today.getFullYear() - request.criteria.ageMin, today.getMonth(), today.getDate())
        query.dateOfBirth = { ...query.dateOfBirth, $lte: maxBirthDate }
      }
      if (request.criteria.ageMax) {
        const minBirthDate = new Date(today.getFullYear() - request.criteria.ageMax - 1, today.getMonth(), today.getDate())
        query.dateOfBirth = { ...query.dateOfBirth, $gte: minBirthDate }
      }
    }

    // Gender filtering
    if (request.criteria.gender && request.criteria.gender !== 'any') {
      query.gender = request.criteria.gender
    }

    // Skills matching (volunteers should have at least one required skill)
    if (request.requiredSkills && request.requiredSkills.length > 0) {
      query['profile.skills'] = { $in: request.requiredSkills }
    }

    // Find matching volunteers
    const volunteers = await User.find(query)
      .select('name email phone dateOfBirth gender profile.stats profile.skills profile.qualifications profile.languages')
      .lean()

    // Additional filtering for qualifications and languages if specified
    let filteredVolunteers = volunteers

    if (request.criteria.qualifications && request.criteria.qualifications.length > 0) {
      filteredVolunteers = filteredVolunteers.filter(v => {
        const userQuals = v.profile?.qualifications || []
        return request.criteria.qualifications.some(reqQual => 
          userQuals.some(uq => uq.title?.toLowerCase().includes(reqQual.toLowerCase()))
        )
      })
    }

    if (request.criteria.languages && request.criteria.languages.length > 0) {
      filteredVolunteers = filteredVolunteers.filter(v => {
        const userLangs = v.profile?.languages || []
        return request.criteria.languages.some(reqLang => 
          userLangs.some(ul => ul.language?.toLowerCase().includes(reqLang.toLowerCase()))
        )
      })
    }

    // Score and sort by match quality
    const scoredVolunteers = filteredVolunteers.map(v => {
      let score = 0
      
      // Skills match score
      const volunteerSkills = v.profile?.skills || []
      const matchedSkills = request.requiredSkills?.filter(skill => 
        volunteerSkills.some(vs => vs.toLowerCase().includes(skill.toLowerCase()))
      ).length || 0
      score += (matchedSkills / (request.requiredSkills?.length || 1)) * 40

      // Experience score (if available in stats)
      if (v.profile?.stats?.totalHours) {
        score += Math.min((v.profile.stats.totalHours / 100) * 20, 20)
      }

      // Qualifications match
      if (request.criteria.qualifications && v.profile?.qualifications) {
        const matchedQuals = request.criteria.qualifications.filter(reqQual =>
          v.profile.qualifications.some(uq => 
            uq.title?.toLowerCase().includes(reqQual.toLowerCase())
          )
        ).length
        score += (matchedQuals / request.criteria.qualifications.length) * 20
      }

      // Language match
      if (request.criteria.languages && v.profile?.languages) {
        const matchedLangs = request.criteria.languages.filter(reqLang =>
          v.profile.languages.some(ul => 
            ul.language?.toLowerCase().includes(reqLang.toLowerCase())
          )
        ).length
        score += (matchedLangs / request.criteria.languages.length) * 20
      }

      return { ...v, matchScore: score }
    })

    // Sort by score descending
    scoredVolunteers.sort((a, b) => b.matchScore - a.matchScore)

    // Limit to requested number plus some buffer
    const recommendedVolunteers = scoredVolunteers.slice(0, request.numberOfVolunteers + 5)

    res.json({
      request: request,
      matches: recommendedVolunteers,
      totalMatches: filteredVolunteers.length,
      requested: request.numberOfVolunteers
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Approve and assign volunteers to a request (admin)
router.post('/approve/:requestId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { volunteerIds } = req.body // Array of volunteer user IDs
    const request = await VolunteerRequest.findById(req.params.requestId)
    
    if (!request) {
      return res.status(404).json({ error: 'Request not found' })
    }

    // Verify volunteers exist and are active
    const volunteers = await User.find({ 
      _id: { $in: volunteerIds },
      role: 'volunteer',
      volunteerStatus: 'active'
    })

    if (volunteers.length !== volunteerIds.length) {
      return res.status(400).json({ error: 'Some volunteers are invalid or inactive' })
    }

    // Update request status
    request.status = 'filled'
    request.currentVolunteers = volunteers.length
    request.filledBy = req.user._id
    request.filledAt = new Date()
    await request.save()

    // Create placements for each volunteer
    const Placement = (await import('../models/Placement.js')).default
    const placements = await Promise.all(
      volunteers.map(volunteer => 
        Placement.create({
          volunteer: volunteer._id,
          hub: request.hub,
          request: request._id,
          startDate: request.startDate || new Date(),
          endDate: request.endDate,
          status: 'active'
        })
      )
    )
    
    res.json({
      message: 'Volunteers assigned successfully',
      request: request,
      assignedVolunteers: volunteers.map(v => ({
        id: v._id,
        name: v.name,
        email: v.email,
        phone: v.phone
      }))
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get pending requests for admin review
router.get('/pending', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const requests = await VolunteerRequest.find({ status: 'open' })
      .populate('hub', 'name email phone contactPerson')
      .sort({ priority: -1, createdAt: -1 })
      .lean()
    
    res.json({ items: requests })
  } catch (error) {
    console.error('Error fetching pending requests:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router

