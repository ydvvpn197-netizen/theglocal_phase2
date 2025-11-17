#!/usr/bin/env node

/**
 * Setup Super Admin Account
 * 
 * Sets up super admin privileges for vipin@theglocal.in
 * This script sets the is_super_admin flag in the database.
 * 
 * Usage:
 *   node scripts/setup-super-admin.mjs
 * 
 * Prerequisites:
 *   - User account must exist with email: vipin@theglocal.in
 *   - Supabase connection must be configured
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Load environment variables
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, '..')

dotenv.config({ path: join(rootDir, '.env.local') })
dotenv.config({ path: join(rootDir, '.env') })

const SUPER_ADMIN_EMAIL = 'vipin@theglocal.in'

async function setupSuperAdmin() {
  console.log('🔧 Setting up super admin account...\n')

  // Get Supabase credentials
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Error: Missing Supabase credentials')
    console.error('   Required environment variables:')
    console.error('   - NEXT_PUBLIC_SUPABASE_URL')
    console.error('   - SUPABASE_SERVICE_ROLE_KEY')
    console.error('\n   Make sure these are set in .env.local or .env file')
    process.exit(1)
  }

  // Create Supabase client with service role key (bypasses RLS)
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    // Check if user exists
    console.log(`📧 Checking if user exists: ${SUPER_ADMIN_EMAIL}`)
    
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, anonymous_handle, is_super_admin')
      .eq('email', SUPER_ADMIN_EMAIL)
      .single()

    if (userError) {
      if (userError.code === 'PGRST116') {
        console.error(`❌ User not found: ${SUPER_ADMIN_EMAIL}`)
        console.error('\n   Please create the account first:')
        console.error('   1. Sign up at https://theglocal.in/auth/signup')
        console.error(`   2. Use email: ${SUPER_ADMIN_EMAIL}`)
        console.error('   3. Run this script again after account creation')
        process.exit(1)
      }
      throw userError
    }

    if (!user) {
      console.error(`❌ User not found: ${SUPER_ADMIN_EMAIL}`)
      console.error('\n   Please create the account first via signup flow')
      process.exit(1)
    }

    console.log(`✅ User found: ${user.email} (ID: ${user.id})`)
    console.log(`   Handle: ${user.anonymous_handle}`)
    console.log(`   Current super admin status: ${user.is_super_admin || false}\n`)

    // Check if already a super admin
    if (user.is_super_admin) {
      console.log('✅ User is already a super admin!')
      console.log('\n   No changes needed.')
      return
    }

    // Update user to super admin
    console.log('🔧 Setting super admin flag...')
    
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ 
        is_super_admin: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select('id, email, is_super_admin')
      .single()

    if (updateError) {
      throw updateError
    }

    if (!updatedUser) {
      throw new Error('Failed to update user')
    }

    console.log('✅ Super admin flag set successfully!\n')

    // Verify the update
    const { data: verifiedUser } = await supabase
      .from('users')
      .select('id, email, is_super_admin')
      .eq('id', user.id)
      .single()

    console.log('📋 Verification:')
    console.log(`   Email: ${verifiedUser.email}`)
    console.log(`   Super Admin: ${verifiedUser.is_super_admin}\n`)

    console.log('✅ Setup complete!')
    console.log('\n📝 Next steps:')
    console.log('   1. Add to environment variable (recommended for redundancy):')
    console.log(`      SUPER_ADMIN_EMAILS=${SUPER_ADMIN_EMAIL}`)
    console.log('   2. Verify super admin access at: /admin')
    console.log('   3. Test admin routes to ensure access works')

  } catch (error) {
    console.error('❌ Error setting up super admin:')
    console.error(error)
    
    if (error.message) {
      console.error(`   Message: ${error.message}`)
    }
    
    process.exit(1)
  }
}

// Run the setup
setupSuperAdmin()
  .then(() => {
    console.log('\n✨ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:')
    console.error(error)
    process.exit(1)
  })

