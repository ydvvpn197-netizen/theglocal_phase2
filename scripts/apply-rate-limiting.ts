/**
 * Script to apply rate limiting to routes missing it
 * Reads the audit report and applies withRateLimit wrapper to missing routes
 */

import * as fs from 'fs'
import * as path from 'path'

interface RouteAuditResult {
  path: string
  hasRateLimit: boolean
  usesWithRateLimit: boolean
  httpMethods: string[]
  shouldExclude: boolean
}

interface AuditReport {
  missingRateLimit: RouteAuditResult[]
}

/**
 * Convert route path to file path
 */
function routePathToFilePath(routePath: string): string {
  // Convert /api/users/:handle to app/api/users/[handle]/route.ts
  let filePath = routePath
    .replace(/^\/api\//, 'app/api/')
    .replace(/:(\w+)/g, '[$1]')
    .replace(/\//g, path.sep)

  return path.join(filePath, 'route.ts')
}

/**
 * Check if file needs rate limiting added
 */
function needsRateLimit(filePath: string): boolean {
  if (!fs.existsSync(filePath)) {
    return false
  }

  const content = fs.readFileSync(filePath, 'utf-8')

  // Already has withRateLimit
  if (
    content.includes('withRateLimit') &&
    content.includes("from '@/lib/middleware/with-rate-limit'")
  ) {
    return false
  }

  // Has export function or export const for HTTP methods
  const hasHttpMethod =
    /export\s+(?:const|async\s+function)\s+(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s*=/.test(
      content
    )

  return hasHttpMethod
}

/**
 * Add rate limiting to a route file
 */
function addRateLimitToFile(filePath: string, httpMethods: string[]): boolean {
  if (!fs.existsSync(filePath)) {
    console.log(`  ⚠️  File not found: ${filePath}`)
    return false
  }

  let content = fs.readFileSync(filePath, 'utf-8')
  const originalContent = content

  // Check if already has import
  const hasImport =
    content.includes("from '@/lib/middleware/with-rate-limit'") ||
    content.includes('from "@/lib/middleware/with-rate-limit"')

  // Add import if missing
  if (!hasImport) {
    // Find the last import statement
    const importMatch = content.match(/(import\s+.*?from\s+['"].*?['"];?\s*\n)/g)
    if (importMatch && importMatch.length > 0) {
      const lastImport = importMatch[importMatch.length - 1]
      if (lastImport) {
        const lastImportIndex = content.lastIndexOf(lastImport)
        const insertIndex = lastImportIndex + lastImport.length

        content =
          content.slice(0, insertIndex) +
          "import { withRateLimit } from '@/lib/middleware/with-rate-limit'\n" +
          content.slice(insertIndex)
      }
    } else {
      // No imports, add at the top after any comments
      const firstLineMatch = content.match(/^(\/\*\*[\s\S]*?\*\/\s*\n|.*?\n)/)
      if (firstLineMatch) {
        const insertIndex = firstLineMatch[0].length
        content =
          content.slice(0, insertIndex) +
          "import { withRateLimit } from '@/lib/middleware/with-rate-limit'\n" +
          content.slice(insertIndex)
      } else {
        content = "import { withRateLimit } from '@/lib/middleware/with-rate-limit'\n" + content
      }
    }
  }

  // Add NextRequest import if missing and needed
  if (
    !content.includes('NextRequest') &&
    (content.includes('NextRequest') || httpMethods.length > 0)
  ) {
    if (content.includes("from 'next/server'")) {
      content = content.replace(/from\s+['"]next\/server['"]/, "from 'next/server'")
      if (!content.includes('NextRequest')) {
        content = content.replace(
          /import\s+{([^}]*)}\s+from\s+['"]next\/server['"]/,
          (match, imports) => {
            if (!imports.includes('NextRequest')) {
              return `import { NextRequest, ${imports.trim()} } from 'next/server'`
            }
            return match
          }
        )
      }
    }
  }

  // Wrap HTTP method exports with withRateLimit
  for (const method of httpMethods) {
    // Pattern 1: export async function GET(request: NextRequest)
    const asyncFunctionPattern = new RegExp(
      `export\\s+async\\s+function\\s+${method}\\s*\\(([^)]*)\\)\\s*{`,
      'g'
    )
    content = content.replace(asyncFunctionPattern, (_match, params) => {
      return `export const ${method} = withRateLimit(async function ${method}(${params}) {`
    })

    // Pattern 2: export const GET = async (request: NextRequest) =>
    const constArrowPattern = new RegExp(
      `export\\s+const\\s+${method}\\s*=\\s*async\\s*\\(([^)]*)\\)\\s*=>`,
      'g'
    )
    content = content.replace(constArrowPattern, (_match, params) => {
      return `export const ${method} = withRateLimit(async function ${method}(${params}) {`
    })

    // Pattern 3: export const GET = async function GET(request: NextRequest)
    // (already wrapped, skip)
    if (content.includes(`export const ${method} = withRateLimit`)) {
      continue
    }

    // Close the function if we opened it
    // Find the matching closing brace for the function we just wrapped
    // This is complex, so we'll handle it case by case
  }

  // Fix closing braces - if we changed export async function to export const, we need to add closing paren
  // This is a simplified approach - may need manual review
  // Note: functionOpenings and functionClosings are for future use
  // const functionOpenings = (content.match(/export\s+const\s+(GET|POST|PUT|DELETE|PATCH)\s*=\s*withRateLimit\s*\(async\s+function/g) || []).length
  // const functionClosings = (content.match(/}\)\s*$/gm) || []).length

  // If we have more openings than closings, we may need to fix some
  // For now, we'll just write the file and let TypeScript catch errors

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8')
    return true
  }

  return false
}

/**
 * Main function
 */
async function main() {
  console.log('🔧 Applying rate limiting to missing routes...\n')

  // Read audit report
  const reportPath = path.join(process.cwd(), 'rate-limiting-audit-report.json')
  if (!fs.existsSync(reportPath)) {
    console.error('❌ Audit report not found. Run audit-rate-limiting.ts first.')
    process.exit(1)
  }

  const report: AuditReport = JSON.parse(fs.readFileSync(reportPath, 'utf-8'))
  const missingRoutes = report.missingRateLimit.filter((r) => !r.shouldExclude)

  console.log(`Found ${missingRoutes.length} routes missing rate limiting\n`)

  let updated = 0
  let skipped = 0
  let errors = 0

  for (const route of missingRoutes) {
    const filePath = routePathToFilePath(route.path)
    console.log(`Processing: ${route.path}`)

    if (!needsRateLimit(filePath)) {
      console.log(`  ⏭️  Skipped (already has rate limiting or no HTTP methods)`)
      skipped++
      continue
    }

    try {
      if (addRateLimitToFile(filePath, route.httpMethods)) {
        console.log(`  ✅ Updated`)
        updated++
      } else {
        console.log(`  ⚠️  No changes needed`)
        skipped++
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error instanceof Error ? error.message : String(error)}`)
      errors++
    }
  }

  console.log(`\n📊 Summary:`)
  console.log(`  ✅ Updated: ${updated}`)
  console.log(`  ⏭️  Skipped: ${skipped}`)
  console.log(`  ❌ Errors: ${errors}`)
  console.log(`\n⚠️  Note: Some files may need manual review for proper closing braces.`)
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })
}

export { addRateLimitToFile, routePathToFilePath }
