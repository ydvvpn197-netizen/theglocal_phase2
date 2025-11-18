#!/usr/bin/env node

/**
 * Razorpay Plan Setup Script
 * 
 * Creates monthly and yearly subscription plans in Razorpay
 * Run this once to set up your subscription plans
 * 
 * Usage: node scripts/setup-razorpay-plans.mjs
 */

import Razorpay from 'razorpay'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') })

const MONTHLY_AMOUNT = 10000 // ₹100 in paise
const YEARLY_AMOUNT = 100000 // ₹1000 in paise

async function setupRazorpayPlans() {
  console.log('🚀 Razorpay Plan Setup Script\n')

  // Validate environment variables
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.error('❌ Error: RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in .env.local')
    console.error('Please add your Razorpay credentials to .env.local and try again.')
    process.exit(1)
  }

  // Initialize Razorpay client
  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  })

  console.log('✅ Razorpay client initialized\n')

  try {
    // Create Monthly Plan
    console.log('📝 Creating monthly plan (₹100/month)...')
    let monthlyPlan
    try {
      monthlyPlan = await razorpay.plans.create({
        period: 'monthly',
        interval: 1,
        item: {
          name: 'Artist Subscription - Monthly',
          amount: MONTHLY_AMOUNT,
          currency: 'INR',
          description: 'Monthly artist subscription with 30-day free trial - ₹100/month',
        },
      })
      console.log('✅ Monthly plan created:', monthlyPlan.id)
    } catch (planError) {
      if (planError.error?.code === 'BAD_REQUEST_ERROR' && planError.error?.description?.includes('already exists')) {
        console.log('✅ Monthly plan already exists')
        // Try to fetch existing plan
        const plans = await razorpay.plans.all({ count: 100 })
        monthlyPlan = plans.items.find(plan => plan.item.name === 'Artist Subscription - Monthly')
        if (monthlyPlan) {
          console.log('✅ Found existing monthly plan:', monthlyPlan.id)
        }
      } else {
        throw planError
      }
    }

    // Create Yearly Plan
    console.log('📝 Creating yearly plan (₹1000/year)...')
    let yearlyPlan
    try {
      yearlyPlan = await razorpay.plans.create({
        period: 'yearly',
        interval: 1,
        item: {
          name: 'Artist Subscription - Yearly',
          amount: YEARLY_AMOUNT,
          currency: 'INR',
          description: 'Yearly artist subscription with 30-day free trial - ₹1000/year',
        },
      })
      console.log('✅ Yearly plan created:', yearlyPlan.id)
    } catch (planError) {
      if (planError.error?.code === 'BAD_REQUEST_ERROR' && planError.error?.description?.includes('already exists')) {
        console.log('✅ Yearly plan already exists')
        // Try to fetch existing plan
        const plans = await razorpay.plans.all({ count: 100 })
        yearlyPlan = plans.items.find(plan => plan.item.name === 'Artist Subscription - Yearly')
        if (yearlyPlan) {
          console.log('✅ Found existing yearly plan:', yearlyPlan.id)
        }
      } else {
        throw planError
      }
    }

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
    console.error('\n❌ Error setting up plans:', error)
    if (error.error) {
      console.error('Details:', error.error)
    }
    process.exit(1)
  }
}

// Run the setup
setupRazorpayPlans()

