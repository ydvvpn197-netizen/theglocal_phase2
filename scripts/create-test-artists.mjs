#!/usr/bin/env node
/**
 * Create Test Artist Accounts
 * 
 * This script creates test artist accounts for platform testing
 * Run with: node scripts/create-test-artists.mjs
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Test artist data
const testArtists = [
  {
    email: 'test-musician@theglocal.in',
    password: 'TestArtist123!',
    handle: 'test_musician_1',
    category: 'musician',
    bio: 'Test musician for platform testing. Professional guitarist and singer with 10+ years of experience.',
    city: 'Mumbai',
  },
  {
    email: 'test-painter@theglocal.in',
    password: 'TestArtist123!',
    handle: 'test_painter_1',
    category: 'visual-artist',
    bio: 'Test visual artist for platform testing. Contemporary painter specializing in abstract art.',
    city: 'Bengaluru',
  },
  {
    email: 'test-dancer@theglocal.in',
    password: 'TestArtist123!',
    handle: 'test_dancer_1',
    category: 'dancer',
    bio: 'Test dancer for platform testing. Classical and contemporary dance performer.',
    city: 'Delhi',
  },
]

async function createTestArtist(artistData) {
  console.log(`\n📝 Creating test artist: ${artistData.email}`)

  try {
    // Check if user already exists in auth
    const { data: { users: existingAuthUsers } } = await supabase.auth.admin.listUsers()
    const existingAuthUser = existingAuthUsers.find(u => u.email === artistData.email)

    let userId = null

    if (existingAuthUser) {
      console.log(`   ✓ Auth user already exists: ${existingAuthUser.id}`)
      userId = existingAuthUser.id
      
      // Check if user record exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, email')
        .eq('id', userId)
        .maybeSingle()

      if (!existingUser) {
        // Create user record manually
        console.log('   ⚠️  Creating missing user record...')
        const avatarSeed = `${artistData.handle}-${Date.now()}`
        const { error: userError } = await supabase
          .from('users')
          .insert({
            id: userId,
            email: artistData.email,
            anonymous_handle: artistData.handle,
            location_city: artistData.city,
            avatar_seed: avatarSeed,
          })

        if (userError) {
          console.error(`   ❌ Failed to create user record: ${userError.message}`)
        } else {
          console.log(`   ✓ User record created`)
        }
      }

      // Check if artist profile exists
      const { data: existingArtist } = await supabase
        .from('artists')
        .select('id')
        .eq('id', userId)
        .maybeSingle()

      if (existingArtist) {
        console.log(`   ✓ Artist profile already exists`)
        return { success: true, userId, existed: true }
      } else {
        console.log(`   ⚠️  Artist profile missing, creating...`)
      }
    }

    // Create user in Auth if not exists
    if (!userId) {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: artistData.email,
        password: artistData.password,
        email_confirm: true,
        user_metadata: {
          anonymous_handle: artistData.handle,
        },
      })

      if (authError) {
        console.error(`   ❌ Auth error: ${authError.message}`)
        return { success: false, error: authError.message }
      }

      if (!authData.user) {
        console.error('   ❌ No user data returned from auth')
        return { success: false, error: 'No user data' }
      }

      userId = authData.user.id
      console.log(`   ✓ Auth user created: ${userId}`)
    }

    // Wait a moment for the auto-trigger to create user record
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Ensure user record exists
    if (!userId) {
      console.error('   ❌ No user ID available')
      return { success: false, error: 'No user ID' }
    }

    // Check if user record was created
    let { data: userData } = await supabase
      .from('users')
      .select('id, anonymous_handle')
      .eq('id', userId)
      .maybeSingle()

    // If user record doesn't exist, create it manually
    if (!userData) {
      console.log('   ⚠️  User record missing, creating manually...')
      
      const avatarSeed = `${artistData.handle}-${Date.now()}`
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: artistData.email,
          anonymous_handle: artistData.handle,
          location_city: artistData.city,
          avatar_seed: avatarSeed,
        })
        .select()
        .single()

      if (userError) {
        console.error(`   ❌ Failed to create user record: ${userError.message}`)
        return { success: false, error: userError.message }
      }

      userData = newUser
      console.log(`   ✓ User record created manually: ${userData.anonymous_handle}`)
    } else {
      console.log(`   ✓ User record exists: ${userData.anonymous_handle}`)
    }

    // Create artist profile with correct schema fields
    const trialEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data: artistProfile, error: artistError } = await supabase
      .from('artists')
      .insert({
        id: userId,
        stage_name: artistData.handle,
        service_category: artistData.category,
        description: artistData.bio,
        location_city: artistData.city,
        subscription_status: 'trial',
        trial_end_date: trialEndDate,
      })
      .select()
      .single()

    if (artistError) {
      console.error(`   ❌ Artist profile error: ${artistError.message}`)
      return { success: false, error: artistError.message }
    }

    console.log(`   ✓ Artist profile created`)
    console.log(`   📧 Email: ${artistData.email}`)
    console.log(`   🔑 Password: ${artistData.password}`)
    console.log(`   👤 Handle/Stage Name: ${artistData.handle}`)
    console.log(`   🎨 Service Category: ${artistData.category}`)
    console.log(`   📅 Trial ends: ${new Date(artistProfile.trial_end_date).toLocaleDateString()}`)

    return { success: true, userId }
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`)
    return { success: false, error: error.message }
  }
}

async function main() {
  console.log('🎨 Creating Test Artist Accounts')
  console.log('================================\n')

  const results = []

  for (const artist of testArtists) {
    const result = await createTestArtist(artist)
    results.push({ artist, result })
  }

  console.log('\n📊 Summary')
  console.log('================================')

  const successful = results.filter((r) => r.result.success)
  const failed = results.filter((r) => !r.result.success)
  const existed = results.filter((r) => r.result.existed)

  console.log(`✓ Successful: ${successful.length}`)
  console.log(`✓ Already existed: ${existed.length}`)
  console.log(`✗ Failed: ${failed.length}`)

  if (failed.length > 0) {
    console.log('\n❌ Failed Artists:')
    failed.forEach((f) => {
      console.log(`   - ${f.artist.email}: ${f.result.error}`)
    })
  }

  console.log('\n🎯 Test Artist Credentials')
  console.log('================================')
  testArtists.forEach((artist) => {
    console.log(`\n${artist.category.toUpperCase()}:`)
    console.log(`  Email:    ${artist.email}`)
    console.log(`  Password: ${artist.password}`)
    console.log(`  Handle:   ${artist.handle}`)
  })

  console.log('\n✅ Test artists setup complete!')
  console.log('You can now test artist features using these accounts.')
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
