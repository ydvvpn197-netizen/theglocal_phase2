#!/usr/bin/env node

/**
 * Lighthouse Accessibility Audit Script
 *
 * Runs Lighthouse accessibility audit on the application.
 * Usage: node scripts/lighthouse-audit.js [url]
 */

const { execSync } = require('child_process')
const path = require('path')

const url = process.argv[2] || 'http://localhost:3000'
const outputDir = path.join(process.cwd(), 'lighthouse-reports')

console.log(`Running Lighthouse accessibility audit on ${url}...`)

try {
  // Create output directory if it doesn't exist
  execSync(`mkdir -p ${outputDir}`, { stdio: 'inherit' })

  // Run Lighthouse
  const command = `npx lighthouse ${url} --only-categories=accessibility --output=html,json --output-path=${outputDir}/report --chrome-flags="--headless" --quiet`

  execSync(command, {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'production',
    },
  })

  console.log(`\n✅ Lighthouse audit complete!`)
  console.log(`📊 Report saved to: ${outputDir}/report.html`)
  console.log(`📄 JSON report: ${outputDir}/report.report.json`)
} catch (error) {
  console.error('❌ Lighthouse audit failed:', error.message)
  process.exit(1)
}
