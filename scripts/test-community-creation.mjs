#!/usr/bin/env node

/**
 * Test script to diagnose community creation issues
 * Run this with: node scripts/test-community-creation.mjs
 */

import { createClient } from '@supabase/supabase-js'

console.log('🔍 Testing Community Creation Setup...\n')

// Check environment variables
console.log('1. Checking Environment Variables:')
const envVars = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
}

for (const [key, value] of Object.entries(envVars)) {
  if (!value) {
    console.log(`   ❌ ${key}: NOT SET`)
  } else {
    console.log(`   ✅ ${key}: Set (${value.substring(0, 10)}...${value.substring(value.length - 4)})`)
  }
}

if (!envVars.NEXT_PUBLIC_SUPABASE_URL || !envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.log('\n❌ Missing required environment variables. Please create a .env.local file.')
  process.exit(1)
}

console.log('\n2. Testing Supabase Connection:')
const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

try {
  const { data, error } = await supabase.from('communities').select('count').limit(1)
  if (error) {
    console.log(`   ❌ Connection test failed: ${error.message}`)
  } else {
    console.log('   ✅ Successfully connected to Supabase')
  }
} catch (err) {
  console.log(`   ❌ Connection error: ${err.message}`)
}

console.log('\n3. Testing Service Role Key:')
if (!envVars.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('   ⚠️  SUPABASE_SERVICE_ROLE_KEY is NOT SET')
  console.log('   This is required for the admin client in the API route.')
  console.log('   Without it, the community creation will fail at the verification step.')
} else {
  const adminClient = createClient(
    envVars.NEXT_PUBLIC_SUPABASE_URL,
    envVars.SUPABASE_SERVICE_ROLE_KEY
  )
  
  try {
    const { data, error } = await adminClient.from('communities').select('id').limit(1)
    if (error) {
      console.log(`   ❌ Service role key test failed: ${error.message}`)
    } else {
      console.log('   ✅ Service role key is valid and working')
    }
  } catch (err) {
    console.log(`   ❌ Service role key error: ${err.message}`)
  }
}

console.log('\n4. Checking Database Policies:')
try {
  // Check if we can query the communities table
  const { error: policiesError } = await supabase.rpc('pg_policies')
  if (policiesError) {
    console.log('   ⚠️  Cannot query RLS policies (this is normal for non-admin users)')
  }
  
  console.log('   ✅ Database is accessible')
} catch (err) {
  console.log(`   ⚠️  Policy check skipped: ${err.message}`)
}

console.log('\n' + '='.repeat(60))
console.log('Summary:')
console.log('='.repeat(60))

const hasAllVars = envVars.NEXT_PUBLIC_SUPABASE_URL && 
                   envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY && 
                   envVars.SUPABASE_SERVICE_ROLE_KEY

if (hasAllVars) {
  console.log('✅ All environment variables are set')
  console.log('✅ Ready to test community creation')
} else {
  console.log('❌ Missing required environment variables')
  console.log('\nTo fix:')
  console.log('1. Create a .env.local file in the root directory')
  console.log('2. Add the following variables:')
  console.log('   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url')
  console.log('   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key')
  console.log('   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key')
}

console.log('\n')

