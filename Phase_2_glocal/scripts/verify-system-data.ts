#!/usr/bin/env tsx

/**
 * Verification script to check if system data exists
 * Run with: npx tsx scripts/verify-system-data.ts
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Load environment variables
config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function verifySystemData() {
  console.log('🔍 Verifying system data...\n')

  try {
    // Call the verification function
    const { data, error } = await supabase.rpc('verify_system_data')

    if (error) {
      console.error('❌ Error calling verification function:', error)
      return false
    }

    interface VerifyResult {
      valid?: boolean
      count?: number
      system_user_exists?: boolean
      archived_community_exists?: boolean
      success?: boolean
      [key: string]: unknown
    }
    const result = data as VerifyResult | null

    if (!result) {
      console.error('❌ No result returned from verification function')
      return false
    }

    console.log('📊 System Data Status:')
    console.log(`   System User Exists: ${result.system_user_exists ? '✅' : '❌'}`)
    console.log(`   Archived Community Exists: ${result.archived_community_exists ? '✅' : '❌'}`)
    console.log(`   Overall Status: ${result.success ? '✅ All Good' : '❌ Issues Found'}`)

    if (result.success) {
      console.log('\n🎉 System data is properly configured!')
      console.log('   Community deletion should work correctly.')
    } else {
      console.log('\n⚠️  System data is missing!')
      console.log('   Run the latest migration to fix this:')
      console.log('   npx supabase db reset')
      console.log('   or')
      console.log('   npx supabase migration up')
    }

    return result.success
  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return false
  }
}

async function checkDirectly() {
  console.log('\n🔍 Direct database checks...\n')

  try {
    // Check system user directly
    const { data: systemUser, error: userError } = await supabase
      .from('users')
      .select('id, email, anonymous_handle')
      .eq('id', '00000000-0000-0000-0000-000000000000')
      .single()

    if (userError && userError.code !== 'PGRST116') {
      console.error('❌ Error checking system user:', userError)
    } else if (systemUser) {
      console.log('✅ System User Found:')
      console.log(`   ID: ${systemUser.id}`)
      console.log(`   Email: ${systemUser.email}`)
      console.log(`   Handle: ${systemUser.anonymous_handle}`)
    } else {
      console.log('❌ System User Not Found')
    }

    // Check archived community directly
    const { data: archivedCommunity, error: communityError } = await supabase
      .from('communities')
      .select('id, name, slug, created_by')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single()

    if (communityError && communityError.code !== 'PGRST116') {
      console.error('❌ Error checking archived community:', communityError)
    } else if (archivedCommunity) {
      console.log('✅ Archived Community Found:')
      console.log(`   ID: ${archivedCommunity.id}`)
      console.log(`   Name: ${archivedCommunity.name}`)
      console.log(`   Slug: ${archivedCommunity.slug}`)
      console.log(`   Created By: ${archivedCommunity.created_by}`)
    } else {
      console.log('❌ Archived Community Not Found')
    }
  } catch (error) {
    console.error('❌ Error during direct checks:', error)
  }
}

async function main() {
  console.log('🚀 TheGlocal System Data Verification\n')

  const verificationSuccess = await verifySystemData()
  await checkDirectly()

  if (!verificationSuccess) {
    console.log('\n💡 To fix missing system data:')
    console.log('   1. Run: npx supabase db reset')
    console.log('   2. Or run: npx supabase migration up')
    console.log('   3. Then run this script again to verify')
    process.exit(1)
  } else {
    console.log('\n✨ All system data is properly configured!')
    process.exit(0)
  }
}

// Run the verification
main().catch(console.error)
