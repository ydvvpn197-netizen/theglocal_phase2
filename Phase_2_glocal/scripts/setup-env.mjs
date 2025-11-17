#!/usr/bin/env node

/**
 * Interactive Environment Setup Script
 * 
 * This script helps you set up your .env.local file for Supabase MCP server.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createInterface } from 'readline';

const ENV_FILE = '.env.local';
const EXAMPLE_FILE = '.env.local.example';

const readline = createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => readline.question(query, resolve));
}

async function setupEnvironment() {
  console.log('🔧 Supabase MCP Environment Setup\n');
  console.log('=' .repeat(60));
  
  // Check if .env.local already exists
  if (existsSync(ENV_FILE)) {
    const overwrite = await question(`\n⚠️  ${ENV_FILE} already exists. Overwrite? (y/N): `);
    if (overwrite.toLowerCase() !== 'y') {
      console.log('Aborted. Existing file preserved.');
      readline.close();
      return;
    }
  }
  
  console.log('\nPlease provide the following values:\n');
  
  // Collect Supabase credentials
  const supabaseUrl = await question('📍 Supabase Project URL: ');
  const supabaseAnonKey = await question('🔑 Supabase Anon Key: ');
  const supabaseServiceKey = await question('🔐 Supabase Service Role Key: ');
  const supabaseJwtSecret = await question('🔒 Supabase JWT Secret (optional): ');
  
  // Collect site config
  const siteUrl = await question('\n🌐 Site URL (default: https://theglocal.in): ') || 'https://theglocal.in';
  
  // Collect auth config
  const nextauthSecret = await question('\n🔑 NextAuth Secret (optional): ');
  
  // Collect Razorpay config
  const razorpayKeyId = await question('\n💳 Razorpay Key ID (optional): ');
  const razorpayKeySecret = await question('💳 Razorpay Key Secret (optional): ');
  
  // Collect PayPal config
  const paypalClientId = await question('\n💰 PayPal Client ID (optional): ');
  const paypalClientSecret = await question('💰 PayPal Client Secret (optional): ');
  const paypalMode = await question('💰 PayPal Mode (sandbox/live, default: sandbox): ') || 'sandbox';
  const paypalPlanMonthly = await question('💰 PayPal Monthly Plan ID (optional): ');
  const paypalPlanYearly = await question('💰 PayPal Yearly Plan ID (optional): ');
  const paypalProductId = await question('💰 PayPal Product ID (optional): ');
  const paypalWebhookSecret = await question('💰 PayPal Webhook Secret (optional): ');
  
  // Collect Vercel config
  const vercelToken = await question('\n🚀 Vercel Token (optional): ');
  
  // Generate .env.local content
  const envContent = `# ============================================
# SUPABASE CONFIGURATION
# ============================================

# Public keys (safe for client-side)
NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${supabaseAnonKey}

# Server-only keys (NEVER expose to client)
SUPABASE_SERVICE_ROLE_KEY=${supabaseServiceKey}
${supabaseJwtSecret ? `SUPABASE_JWT_SECRET=${supabaseJwtSecret}` : '# SUPABASE_JWT_SECRET=your_jwt_secret'}

# ============================================
# SITE CONFIGURATION
# ============================================

NEXT_PUBLIC_SITE_URL=${siteUrl}

# ============================================
# AUTHENTICATION
# ============================================

${nextauthSecret ? `NEXTAUTH_SECRET=${nextauthSecret}` : '# NEXTAUTH_SECRET=your_nextauth_secret'}
NEXTAUTH_URL=${siteUrl}

# ============================================
# PAYMENT (RAZORPAY)
# ============================================

${razorpayKeyId ? `RAZORPAY_KEY_ID=${razorpayKeyId}` : '# RAZORPAY_KEY_ID=your_razorpay_key_id'}
${razorpayKeySecret ? `RAZORPAY_KEY_SECRET=${razorpayKeySecret}` : '# RAZORPAY_KEY_SECRET=your_razorpay_key_secret'}
${razorpayKeyId ? `NEXT_PUBLIC_RAZORPAY_KEY_ID=${razorpayKeyId}` : '# NEXT_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_key_id'}

# ============================================
# PAYMENT (PAYPAL)
# ============================================

${paypalClientId ? `PAYPAL_CLIENT_ID=${paypalClientId}` : '# PAYPAL_CLIENT_ID=your_paypal_client_id'}
${paypalClientSecret ? `PAYPAL_CLIENT_SECRET=${paypalClientSecret}` : '# PAYPAL_CLIENT_SECRET=your_paypal_client_secret'}
PAYPAL_MODE=${paypalMode}
${paypalPlanMonthly ? `PAYPAL_PLAN_MONTHLY=${paypalPlanMonthly}` : '# PAYPAL_PLAN_MONTHLY=your_paypal_monthly_plan_id'}
${paypalPlanYearly ? `PAYPAL_PLAN_YEARLY=${paypalPlanYearly}` : '# PAYPAL_PLAN_YEARLY=your_paypal_yearly_plan_id'}
${paypalProductId ? `PAYPAL_PRODUCT_ID=${paypalProductId}` : '# PAYPAL_PRODUCT_ID=your_paypal_product_id'}
${paypalWebhookSecret ? `PAYPAL_WEBHOOK_SECRET=${paypalWebhookSecret}` : '# PAYPAL_WEBHOOK_SECRET=your_paypal_webhook_secret'}

# ============================================
# DEPLOYMENT
# ============================================

${vercelToken ? `VERCEL_TOKEN=${vercelToken}` : '# VERCEL_TOKEN=your_vercel_token'}

# ============================================
# MCP SERVER CONFIGURATION
# ============================================
# These vars are used by the Supabase MCP server
SUPABASE_URL=${supabaseUrl}
`;

  // Write to file
  try {
    writeFileSync(ENV_FILE, envContent, 'utf8');
    console.log(`\n✅ Successfully created ${ENV_FILE}!`);
    console.log('\n📋 Next steps:');
    console.log('   1. Review the generated .env.local file');
    console.log('   2. Add any missing optional values');
    console.log('   3. Test your MCP server: npm run mcp');
    console.log('   4. Run test script: node scripts/test-mcp-server.mjs\n');
  } catch (error) {
    console.error('❌ Error writing file:', error.message);
  }
  
  readline.close();
}

setupEnvironment().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});


