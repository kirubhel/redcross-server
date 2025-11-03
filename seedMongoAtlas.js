// Script to seed MongoDB Atlas with admin user
// Run with: node seedMongoAtlas.js

import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import User from './src/models/User.js'

// MongoDB Atlas connection string
const MONGO_URL = 'mongodb+srv://kirub:P%40ssw0rd@ercs-cluster.z7bgqce.mongodb.net/ercs_demo?retryWrites=true&w=majority'

// Admin credentials
const adminEmail = 'admin@ercs.org'
const adminPassword = 'admin123'
const adminName = 'ERCS Administrator'
const adminPhone = '+251911000000'

async function seedAdmin() {
  try {
    console.log('🔄 Connecting to MongoDB Atlas...')
    await mongoose.connect(MONGO_URL)
    console.log('✅ Connected to MongoDB Atlas successfully!')
    console.log('📊 Database: ercs_demo')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail })
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists!')
      console.log(`📧 Email: ${adminEmail}`)
      console.log(`🔑 Password: ${adminPassword}`)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      await mongoose.disconnect()
      console.log('✅ Disconnected from MongoDB')
      process.exit(0)
      return
    }

    // Create admin user
    console.log('🔄 Creating admin user...')
    const passwordHash = await bcrypt.hash(adminPassword, 10)
    const admin = await User.create({
      name: adminName,
      email: adminEmail,
      passwordHash,
      role: 'admin',
      phone: adminPhone,
      verified: true,
      verifiedAt: new Date()
    })

    console.log('✅ Admin user created successfully!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔐 Admin Login Credentials:')
    console.log(`📧 Email: ${adminEmail}`)
    console.log(`🔑 Password: ${adminPassword}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('\n📍 Admin Routes (after login):')
    console.log('  • /form-fields - Form Field Management')
    console.log('  • /membership-types - Membership Type Management')
    console.log('  • /volunteer-requests - Volunteer Request Management')
    console.log('  • /communication - Mass Communication')
    console.log('  • /reports - Analytics & Reports')
    console.log('  • /custom-reports - Custom Reports')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`\n🌐 Login URL: https://redcross-cleint.vercel.app/login`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    await mongoose.disconnect()
    console.log('\n✅ Disconnected from MongoDB Atlas')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error seeding admin:', error.message)
    if (error.message.includes('authentication')) {
      console.error('💡 Tip: Check your MongoDB username and password')
    } else if (error.message.includes('network')) {
      console.error('💡 Tip: Check your network access settings in MongoDB Atlas')
    }
    await mongoose.disconnect()
    process.exit(1)
  }
}

seedAdmin()




