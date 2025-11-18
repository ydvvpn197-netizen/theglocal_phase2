#!/usr/bin/env node

/**
 * Razorpay Plan Setup Script (HTTP Version)
 * 
 * Creates monthly and yearly subscription plans in Razorpay using direct HTTP requests
 * Run this once to set up your subscription plans
 * 
 * Usage: node scripts/setup-razorpay-plans-http.mjs
 */

import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import crypto from 'crypto'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') })

const MONTHLY_AMOUNT = 10000 // ₹100 in paise
const YEARLY_AMOUNT = 100000 // ₹1000 in paise

// Create authorization header for Razorpay API
function createAuthHeader(keyId, keySecret) {
  const credentials = Buffer.from(`${keyId}:${keySecret}`).toString('base64')
  return `Basic ${credentials}`
}

// Make HTTP request to Razorpay API
async function makeRazorpayRequest(endpoint, method = 'GET', data = null) {
  const url = `https://api.razorpay.com/v1${endpoint}`
  
  const options = {
    method,
    headers: {
      'Authorization': createAuthHeader(process.env.RAZORPAY_KEY_ID, process.env.RAZORPAY_KEY_SECRET),
      'Content-Type': 'application/json',
    },
  }

  if (data) {
    options.body = JSON.stringify(data)
  }

  const response = await fetch(url, options)
  
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(`HTTP ${response.status}: ${JSON.stringify(errorData)}`)
  }

  return await response.json()
}

async function setupRazorpayPlans() {
  console.log('🚀 Razorpay Plan Setup Script (HTTP Version)\n')

  // Validate environment variables
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.error('❌ Error: RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in .env.local')
    console.error('Please add your Razorpay credentials to .env.local and try again.')
    process.exit(1)
  }

  console.log('✅ Environment variables validated')
  console.log('🔑 Key ID:', process.env.RAZORPAY_KEY_ID.substring(0, 8) + '...')

  try {
    // Test API connectivity first
    console.log('🔍 Testing API connectivity...')
    await makeRazorpayRequest('/plans?count=1')
    console.log('✅ API connectivity confirmed\n')

    // Create Monthly Plan
    console.log('📝 Creating monthly plan (₹100/month)...')
    const monthlyPlanData = {
      period: 'monthly',
      interval: 1,
      item: {
        name: 'Artist Subscription - Monthly',
        amount: MONTHLY_AMOUNT,
        currency: 'INR',
        description: 'Monthly artist subscription with 30-day free trial - ₹100/month',
      },
    }

    const monthlyPlan = await makeRazorpayRequest('/plans', 'POST', monthlyPlanData)
    console.log('✅ Monthly plan created:', monthlyPlan.id)

    // Create Yearly Plan
    console.log('📝 Creating yearly plan (₹1000/year)...')
    const yearlyPlanData = {
      period: 'yearly',
      interval: 1,
      item: {
        name: 'Artist Subscription - Yearly',
        amount: YEARLY_AMOUNT,
        currency: 'INR',
        description: 'Yearly artist subscription with 30-day free trial - ₹1000/year',
      },
    }

    const yearlyPlan = await makeRazorpayRequest('/plans', 'POST', yearlyPlanData)
    console.log('✅ Yearly plan created:', yearlyPlan.id)

    // Display results
    console.log('\n' + '='.repeat(60))
    console.log('📋 PLAN SETUP COMPLETE')
    console.log('='.repeat(60))
    console.log('\n🎯 Add these Plan IDs to your environment variables:\n')
    console.log('RAZORPAY_PLAN_MONTHLY=' + monthlyPlan.id)
    console.log('RAZORPAY_PLAN_YEARLY=' + yearlyPlan.id)
    console.log('\n📝 For Local Development:')
    console.log('  Add to .env.local file\n')
    console.log('📝 For Production:')
    console.log('  Add to Vercel Environment Variables')
    console.log('  Dashboard → Settings → Environment Variables\n')
    console.log('='.repeat(60))
    console.log('\n✨ You can now start accepting subscriptions!\n')

  } catch (error) {
    console.error('\n❌ Error setting up plans:', error.message)
    if (error.message.includes('HTTP 400')) {
      console.error('\n💡 This might be due to:')
      console.error('1. Invalid Razorpay credentials')
      console.error('2. Razorpay account not activated for subscriptions')
      console.error('3. Plans with the same name already exist')
      console.error('\n🔍 Check your Razorpay dashboard at https://dashboard.razorpay.com/')
    }
    process.exit(1)
  }
}

// Run the setup
setupRazorpayPlans()
