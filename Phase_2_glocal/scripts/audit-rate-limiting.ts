/**
 * Rate Limiting Audit Script
 * Scans all API routes and identifies which ones have rate limiting applied
 */

import * as fs from 'fs'
import * as path from 'path'
import { glob } from 'glob'

interface RouteAuditResult {
  path: string
  hasRateLimit: boolean
  usesWithRateLimit: boolean
  usesOldRateLimit: boolean
  httpMethods: string[]
  shouldExclude: boolean
  exclusionReason?: string
}

interface AuditReport {
  totalRoutes: number
  routesWithRateLimit: number
  routesWithoutRateLimit: number
  routesExcluded: number
  routesWithOldRateLimit: number
  routes: RouteAuditResult[]
  missingRateLimit: RouteAuditResult[]
  recommendations: string[]
}

/**
 * Check if a route should be excluded from rate limiting
 */
function shouldExcludeRoute(routePath: string): { exclude: boolean; reason?: string } {
  // Cron routes should be excluded
  if (routePath.includes('/cron/')) {
    return { exclude: true, reason: 'Cron job route' }
  }

  return { exclude: false }
}

/**
 * Extract HTTP methods from route file
 */
function extractHttpMethods(content: string): string[] {
  const methods: string[] = []
  const methodPattern =
    /export\s+(?:const|async\s+function)\s+(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s*=/g
  let match

  while ((match = methodPattern.exec(content)) !== null) {
    const method = match[1]
    if (method && !methods.includes(method)) {
      methods.push(method)
    }
  }

  return methods
}

/**
 * Audit a single route file
 */
function auditRoute(filePath: string): RouteAuditResult {
  const content = fs.readFileSync(filePath, 'utf-8')
  const relativePath = path.relative(process.cwd(), filePath)
  const routePath = relativePath
    .replace(/\\/g, '/')
    .replace(/^app\/api\//, '/api/')
    .replace(/\/route\.ts$/, '')
    .replace(/\[([^\]]+)\]/g, ':$1')

  const exclusion = shouldExcludeRoute(routePath)
  const httpMethods = extractHttpMethods(content)

  // Check for withRateLimit wrapper
  const usesWithRateLimit =
    content.includes('withRateLimit') &&
    (content.includes("from '@/lib/middleware/with-rate-limit'") ||
      content.includes('from "@/lib/middleware/with-rate-limit"'))

  // Check for old rate limit utilities
  const usesOldRateLimit =
    (content.includes("from '@/lib/middleware/rate-limit'") ||
      content.includes('from "@/lib/middleware/rate-limit"')) &&
    !usesWithRateLimit

  // Check if rate limiting is applied (withRateLimit wrapper or old utilities)
  const hasRateLimit = usesWithRateLimit || usesOldRateLimit

  return {
    path: routePath,
    hasRateLimit,
    usesWithRateLimit,
    usesOldRateLimit,
    httpMethods,
    shouldExclude: exclusion.exclude,
    exclusionReason: exclusion.reason,
  }
}

/**
 * Main audit function
 */
async function auditRateLimiting(): Promise<AuditReport> {
  console.log('🔍 Scanning API routes for rate limiting coverage...\n')

  // Find all route.ts files in app/api
  const routeFiles = await glob('app/api/**/route.ts', {
    cwd: process.cwd(),
    absolute: true,
  })

  console.log(`Found ${routeFiles.length} API route files\n`)

  const routes: RouteAuditResult[] = routeFiles.map(auditRoute)
  const routesWithRateLimit = routes.filter((r) => r.hasRateLimit && !r.shouldExclude)
  const routesWithoutRateLimit = routes.filter((r) => !r.hasRateLimit && !r.shouldExclude)
  const routesExcluded = routes.filter((r) => r.shouldExclude)
  const routesWithOldRateLimit = routes.filter((r) => r.usesOldRateLimit)

  const recommendations: string[] = []

  if (routesWithoutRateLimit.length > 0) {
    recommendations.push(`Add rate limiting to ${routesWithoutRateLimit.length} routes missing it`)
  }

  if (routesWithOldRateLimit.length > 0) {
    recommendations.push(
      `Migrate ${routesWithOldRateLimit.length} routes from old rate limit utilities to withRateLimit wrapper`
    )
  }

  const report: AuditReport = {
    totalRoutes: routes.length,
    routesWithRateLimit: routesWithRateLimit.length,
    routesWithoutRateLimit: routesWithoutRateLimit.length,
    routesExcluded: routesExcluded.length,
    routesWithOldRateLimit: routesWithOldRateLimit.length,
    routes,
    missingRateLimit: routesWithoutRateLimit,
    recommendations,
  }

  return report
}

/**
 * Print audit report
 */
function printReport(report: AuditReport): void {
  console.log('='.repeat(80))
  console.log('RATE LIMITING AUDIT REPORT')
  console.log('='.repeat(80))
  console.log()

  console.log('Summary:')
  console.log(`  Total routes: ${report.totalRoutes}`)
  console.log(`  ✅ With rate limiting: ${report.routesWithRateLimit}`)
  console.log(`  ❌ Without rate limiting: ${report.routesWithoutRateLimit}`)
  console.log(`  ⏭️  Excluded (cron, etc.): ${report.routesExcluded}`)
  console.log(`  ⚠️  Using old rate limit: ${report.routesWithOldRateLimit}`)
  console.log()

  if (report.missingRateLimit.length > 0) {
    console.log('Routes Missing Rate Limiting:')
    console.log('-'.repeat(80))
    report.missingRateLimit.forEach((route) => {
      console.log(`  ${route.path} [${route.httpMethods.join(', ')}]`)
    })
    console.log()
  }

  if (report.routesWithOldRateLimit > 0) {
    const oldRoutes = report.routes.filter((r) => r.usesOldRateLimit)
    console.log('Routes Using Old Rate Limit Utilities:')
    console.log('-'.repeat(80))
    oldRoutes.forEach((route) => {
      console.log(`  ${route.path} [${route.httpMethods.join(', ')}]`)
    })
    console.log()
  }

  if (report.recommendations.length > 0) {
    console.log('Recommendations:')
    console.log('-'.repeat(80))
    report.recommendations.forEach((rec, i) => {
      console.log(`  ${i + 1}. ${rec}`)
    })
    console.log()
  }

  const coveragePercent = (
    (report.routesWithRateLimit / (report.totalRoutes - report.routesExcluded)) *
    100
  ).toFixed(1)
  console.log(`Coverage: ${coveragePercent}%`)
  console.log('='.repeat(80))
}

/**
 * Save report to JSON file
 */
function saveReport(report: AuditReport, outputPath: string): void {
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2))
  console.log(`\n📄 Report saved to: ${outputPath}`)
}

// Run audit
if (require.main === module) {
  auditRateLimiting()
    .then((report) => {
      printReport(report)
      saveReport(report, 'rate-limiting-audit-report.json')
      process.exit(report.routesWithoutRateLimit > 0 ? 1 : 0)
    })
    .catch((error) => {
      console.error('Error running audit:', error)
      process.exit(1)
    })
}

export { auditRateLimiting, type AuditReport, type RouteAuditResult }
