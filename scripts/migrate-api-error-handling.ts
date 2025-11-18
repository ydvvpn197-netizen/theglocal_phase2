/**
 * Migration Script: API Error Handling Standardization
 *
 * Scans all API route files and identifies which ones need error handling migration.
 * Reports routes that are missing:
 * - handleAPIError import
 * - createSuccessResponse import
 * - createAPILogger import
 * - try-catch wrapper
 * - handleAPIError call in catch block
 */

import * as fs from 'fs'
import * as path from 'path'
import { glob } from 'glob'

interface RouteAnalysis {
  file: string
  hasHandleAPIError: boolean
  hasCreateSuccessResponse: boolean
  hasCreateAPILogger: boolean
  hasTryCatch: boolean
  hasHandleAPIErrorCall: boolean
  needsMigration: boolean
  methods: string[]
}

async function analyzeRouteFile(filePath: string): Promise<RouteAnalysis> {
  const content = fs.readFileSync(filePath, 'utf-8')
  const relativePath = path.relative(process.cwd(), filePath)

  // Extract HTTP methods from exports
  const methodMatches = content.match(/export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH)/g)
  const methods = methodMatches
    ? methodMatches.map((m) => m.match(/(GET|POST|PUT|DELETE|PATCH)/)?.[0] || '').filter(Boolean)
    : []

  const hasHandleAPIError = content.includes('handleAPIError')
  const hasCreateSuccessResponse = content.includes('createSuccessResponse')
  const hasCreateAPILogger = content.includes('createAPILogger')
  const hasTryCatch = content.includes('try {') && content.includes('catch')
  const hasHandleAPIErrorCall = content.includes('handleAPIError(')

  // Needs migration if:
  // - Has HTTP methods but missing error handling pattern
  // - Missing imports or try-catch wrapper
  const needsMigration =
    methods.length > 0 &&
    (!hasHandleAPIError ||
      !hasCreateSuccessResponse ||
      !hasCreateAPILogger ||
      !hasTryCatch ||
      !hasHandleAPIErrorCall)

  return {
    file: relativePath,
    hasHandleAPIError,
    hasCreateSuccessResponse,
    hasCreateAPILogger,
    hasTryCatch,
    hasHandleAPIErrorCall,
    needsMigration,
    methods,
  }
}

async function main() {
  console.log('🔍 Scanning API routes for error handling migration...\n')

  // Find all route.ts files
  const routeFiles = await glob('app/api/**/route.ts', {
    cwd: process.cwd(),
    absolute: true,
  })

  console.log(`Found ${routeFiles.length} API route files\n`)

  const analyses: RouteAnalysis[] = []
  for (const file of routeFiles) {
    const analysis = await analyzeRouteFile(file)
    analyses.push(analysis)
  }

  // Separate routes that need migration
  const needsMigration = analyses.filter((a) => a.needsMigration)
  const alreadyMigrated = analyses.filter((a) => !a.needsMigration)

  // Generate report
  console.log('='.repeat(80))
  console.log('MIGRATION REPORT')
  console.log('='.repeat(80))
  console.log(`\nTotal routes: ${analyses.length}`)
  console.log(`✅ Already migrated: ${alreadyMigrated.length}`)
  console.log(`⚠️  Needs migration: ${needsMigration.length}\n`)

  if (needsMigration.length > 0) {
    console.log('ROUTES NEEDING MIGRATION:')
    console.log('-'.repeat(80))

    // Group by missing components
    const missingHandleAPIError = needsMigration.filter((a) => !a.hasHandleAPIError)
    const missingCreateSuccessResponse = needsMigration.filter((a) => !a.hasCreateSuccessResponse)
    const missingCreateAPILogger = needsMigration.filter((a) => !a.hasCreateAPILogger)
    const missingTryCatch = needsMigration.filter((a) => !a.hasTryCatch)
    const missingHandleAPIErrorCall = needsMigration.filter((a) => !a.hasHandleAPIErrorCall)

    console.log(`\nMissing handleAPIError import: ${missingHandleAPIError.length}`)
    console.log(`Missing createSuccessResponse import: ${missingCreateSuccessResponse.length}`)
    console.log(`Missing createAPILogger import: ${missingCreateAPILogger.length}`)
    console.log(`Missing try-catch wrapper: ${missingTryCatch.length}`)
    console.log(`Missing handleAPIError call: ${missingHandleAPIErrorCall.length}\n`)

    console.log('\nDETAILED LIST:')
    console.log('-'.repeat(80))
    for (const analysis of needsMigration) {
      console.log(`\n📄 ${analysis.file}`)
      console.log(`   Methods: ${analysis.methods.join(', ') || 'None'}`)
      console.log(`   Missing:`)
      if (!analysis.hasHandleAPIError) console.log(`     - handleAPIError import`)
      if (!analysis.hasCreateSuccessResponse) console.log(`     - createSuccessResponse import`)
      if (!analysis.hasCreateAPILogger) console.log(`     - createAPILogger import`)
      if (!analysis.hasTryCatch) console.log(`     - try-catch wrapper`)
      if (!analysis.hasHandleAPIErrorCall) console.log(`     - handleAPIError call`)
    }
  }

  // Save report to file
  const reportPath = path.join(process.cwd(), 'scripts', 'api-error-handling-report.json')
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        total: analyses.length,
        migrated: alreadyMigrated.length,
        needsMigration: needsMigration.length,
        routes: analyses,
      },
      null,
      2
    )
  )

  console.log(`\n📊 Full report saved to: ${reportPath}`)
  console.log('\n' + '='.repeat(80))
}

main().catch(console.error)
