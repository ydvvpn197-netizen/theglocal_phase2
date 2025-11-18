#!/usr/bin/env node

/**
 * Test Environment Variables
 */

import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import dotenv from 'dotenv'

// Load environment variables
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '../.env.local') })

console.log('Environment Variables:')
console.log('- NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing')
console.log('- SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing')
console.log('- CRON_SECRET:', process.env.CRON_SECRET ? '✅ Set' : '❌ Missing')

// Test Supabase connection
try {
  const { createAdminClient } = await import('../lib/supabase/server.ts')
  const supabase = createAdminClient()
  console.log('✅ Supabase admin client created successfully')
} catch (error) {
  console.error('❌ Supabase admin client failed:', error.message)
}
