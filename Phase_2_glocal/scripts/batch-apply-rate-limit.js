/**
 * Batch script to apply rate limiting to all API routes
 * This script helps identify routes that need rate limiting
 *
 * Usage: node scripts/batch-apply-rate-limit.js
 */

const fs = require('fs')
const path = require('path')
const { glob } = require('glob')

async function findRouteFiles() {
  const files = await glob('app/api/**/route.ts', { cwd: process.cwd() })
  return files
}

async function needsRateLimit(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')

  // Check if already has rate limiting
  if (content.includes('withRateLimit')) {
    return false
  }

  // Check if it's a route file with handlers
  if (content.includes('export async function') || content.includes('export function')) {
    return true
  }

  return false
}

async function main() {
  const routeFiles = await findRouteFiles()
  const needsUpdate = []

  for (const file of routeFiles) {
    if (await needsRateLimit(file)) {
      needsUpdate.push(file)
    }
  }

  console.log(`Found ${needsUpdate.length} routes that need rate limiting:`)
  needsUpdate.forEach((file) => console.log(`  - ${file}`))
  console.log(`\nTotal routes: ${routeFiles.length}`)
  console.log(`Already have rate limiting: ${routeFiles.length - needsUpdate.length}`)
  console.log(`Need rate limiting: ${needsUpdate.length}`)
}

main().catch(console.error)
