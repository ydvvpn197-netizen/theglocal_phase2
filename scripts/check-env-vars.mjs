#!/usr/bin/env node

/**
 * Check Environment Variables for Event Aggregator
 * Verifies that all required API keys are configured
 */

console.log('🔍 CHECKING ENVIRONMENT VARIABLES\n')
console.log('=' .repeat(60))

const requiredVars = {
  'NEXT_PUBLIC_SUPABASE_URL': {
    required: true,
    description: 'Supabase project URL',
  },
  'NEXT_PUBLIC_SUPABASE_ANON_KEY': {
    required: true,
    description: 'Supabase anonymous key',
  },
  'SUPABASE_SERVICE_ROLE_KEY': {
    required: true,
    description: 'Supabase service role key (for bypassing RLS)',
  },
  'EVENTBRITE_API_KEY': {
    required: true,
    description: 'Eventbrite API key for fetching real events',
  },
  'OPENAI_API_KEY': {
    required: true,
    description: 'OpenAI API key for AI enhancement',
  },
  'CRON_SECRET': {
    required: true,
    description: 'Secret for authenticating cron jobs',
  },
  'ALLEVENTS_API_KEY': {
    required: false,
    description: 'Allevents API key (optional)',
  },
}

let allGood = true
const missing = []
const present = []

console.log('\n📋 Environment Variable Status:\n')

Object.entries(requiredVars).forEach(([varName, info]) => {
  const value = process.env[varName]
  const status = value ? '✅' : (info.required ? '❌' : '⚠️ ')
  const label = info.required ? 'REQUIRED' : 'OPTIONAL'
  
  console.log(`${status} ${varName.padEnd(30)} [${label}]`)
  console.log(`   ${info.description}`)
  
  if (value) {
    const preview = value.substring(0, 10) + '...' + value.substring(value.length - 4)
    console.log(`   Value: ${preview}`)
    present.push(varName)
  } else {
    if (info.required) {
      missing.push(varName)
      allGood = false
    }
  }
  console.log()
})

console.log('=' .repeat(60))
console.log('\n📊 Summary:\n')
console.log(`✅ Present: ${present.length}/${Object.keys(requiredVars).length}`)
if (missing.length > 0) {
  console.log(`❌ Missing: ${missing.length}`)
  console.log(`   - ${missing.join('\n   - ')}`)
}

if (allGood) {
  console.log('\n✨ All required environment variables are configured!')
} else {
  console.log('\n⚠️  Some required variables are missing!')
  console.log('\nTo fix:')
  console.log('1. Set missing variables in your .env.local (local)')
  console.log('2. Add them to Vercel environment variables (production)')
  console.log('\nFor production:')
  console.log('  vercel env add VARIABLE_NAME')
}

console.log('\n' + '=' .repeat(60))

process.exit(allGood ? 0 : 1)

