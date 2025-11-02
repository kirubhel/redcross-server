import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import User from '../models/User.js'
import dotenv from 'dotenv'

dotenv.config()

const MONGO_URL = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/ercs_demo'

async function seedAdmin() {
  try {
    await mongoose.connect(MONGO_URL)
    console.log('Connected to MongoDB')

    // Default admin credentials
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@ercs.org'
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'
    const adminName = process.env.ADMIN_NAME || 'ERCS Administrator'
    const adminPhone = process.env.ADMIN_PHONE || '+251911000000'

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail })
    if (existingAdmin) {
      console.log('Admin user already exists!')
      console.log(`Email: ${adminEmail}`)
      console.log(`Password: ${adminPassword}`)
      await mongoose.disconnect()
      return
    }

    // Create admin user
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
    console.log('Admin Login Credentials:')
    console.log(`📧 Email: ${adminEmail}`)
    console.log(`🔑 Password: ${adminPassword}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('\nAdmin Routes:')
    console.log('  • /form-fields - Form Field Management')
    console.log('  • /communication - Mass Communication')
    console.log('  • /reports - Analytics & Reports')
    console.log('  • /custom-reports - Custom Reports')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    await mongoose.disconnect()
    process.exit(0)
  } catch (error) {
    console.error('Error seeding admin:', error)
    await mongoose.disconnect()
    process.exit(1)
  }
}

seedAdmin()

