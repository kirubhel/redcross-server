import express from 'express'
import OpenAI from 'openai'
import { authMiddleware } from '../middleware/auth.js'

const router = express.Router()

// Initialize OpenAI client (free tier or API key)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sk-free-trial-placeholder', // Replace with actual key or use free tier
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
})

// Chat endpoint - Tawak.io style integration
router.post('/chat', authMiddleware, async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body

    if (!message) {
      return res.status(400).json({ error: 'Message is required' })
    }

    // Build messages array with system prompt and conversation history
    const messages = [
      {
        role: 'system',
        content: 'You are Tawak, a helpful AI assistant for the Ethiopian Red Cross Society (ERCS). You help volunteers, members, and staff with questions about ERCS programs, registration, activities, training, and humanitarian work. Be friendly, professional, and provide accurate information.'
      },
      ...conversationHistory.slice(-10), // Keep last 10 messages for context
      {
        role: 'user',
        content: message
      }
    ]

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      messages: messages,
      max_tokens: 500,
      temperature: 0.7
    })

    const response = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.'

    res.json({
      response,
      conversationId: Date.now().toString(),
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('AI Chat Error:', error)
    
    // Fallback response if OpenAI fails
    res.status(500).json({
      error: 'AI service temporarily unavailable',
      message: 'Please try again later or contact support.',
      fallback: true
    })
  }
})

// Get AI suggestions for form fields (admin)
router.post('/suggest-fields', authMiddleware, async (req, res) => {
  try {
    const { formType, context } = req.body

    const prompt = `As an expert in form design for NGO volunteer and member management systems, suggest relevant form fields for a ${formType} registration form in the context of the Ethiopian Red Cross Society. 
    
    Context: ${context || 'Standard registration'}
    
    Provide suggestions in JSON format with this structure:
    {
      "fields": [
        {
          "fieldKey": "example_field",
          "fieldType": "text|email|select|etc",
          "label": "Field Label",
          "description": "Field description",
          "required": true/false,
          "options": [] // for select/radio types
        }
      ]
    }
    
    Focus on fields relevant to ${formType === 'volunteer' ? 'volunteer skills, availability, interests' : formType === 'member' ? 'member information, contact details, preferences' : 'hub organization details'}.`

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a form design expert. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.5
    })

    const response = completion.choices[0]?.message?.content || '{}'
    const suggestions = JSON.parse(response)

    res.json(suggestions)
  } catch (error) {
    console.error('AI Suggestions Error:', error)
    res.status(500).json({ error: 'Could not generate suggestions' })
  }
})

export default router


