#!/usr/bin/env tsx
/**
 * Comprehensive Console → Logger Migration Script
 *
 * This script systematically replaces console.* statements with log.* calls
 * across the codebase, handling complex patterns including template literals,
 * multiple arguments, error objects, and more.
 *
 * Usage:
 *   tsx scripts/migrate-console-logs.ts [directory] [--dry-run] [--verbose]
 *
 * Examples:
 *   tsx scripts/migrate-console-logs.ts app/api --dry-run
 *   tsx scripts/migrate-console-logs.ts components
 *   tsx scripts/migrate-console-logs.ts lib --verbose
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import { existsSync } from 'fs'

interface MigrationResult {
  filePath: string
  changes: Array<{
    line: number
    before: string
    after: string
    method: string
  }>
  importAdded: boolean
  error?: string
}

interface MigrationStats {
  processed: number
  modified: number
  skipped: number
  errors: number
  totalChanges: number
  results: MigrationResult[]
}

// Configuration
const DRY_RUN = process.argv.includes('--dry-run') || process.env.DRY_RUN === 'true'
const VERBOSE = process.argv.includes('--verbose') || process.env.VERBOSE === 'true'

// Logger import statement
const LOGGER_IMPORT = "import { log } from '@/lib/utils/logger'"

// Excluded directories and files
const EXCLUDED_DIRS = ['node_modules', '.next', '.git', 'dist', 'build']
const EXCLUDED_FILES = ['logger.ts', 'migrate-console-logs.ts']

/**
 * Check if file should be excluded from migration
 */
function shouldExcludeFile(filePath: string): boolean {
  const fileName = path.basename(filePath)
  return EXCLUDED_FILES.some((excluded) => fileName.includes(excluded))
}

/**
 * Check if directory should be excluded
 */
function shouldExcludeDir(dirName: string): boolean {
  return EXCLUDED_DIRS.includes(dirName)
}

/**
 * Check if file has console statements
 */
function hasConsoleStatements(content: string): boolean {
  return /console\.(log|warn|error|info|debug)/.test(content)
}

/**
 * Check if file already has logger import
 */
function hasLoggerImport(content: string): boolean {
  return /from\s+['"]@\/lib\/utils\/logger['"]/.test(content)
}

/**
 * Map console method to logger method
 */
function mapToLoggerMethod(consoleMethod: string): string {
  const mapping: Record<string, string> = {
    log: 'info',
    info: 'info',
    warn: 'warn',
    error: 'error',
    debug: 'debug',
  }
  return mapping[consoleMethod] || 'info'
}

/**
 * Parse console statement arguments
 */
function parseConsoleArgs(args: string): {
  message: string
  error?: string
  metadata?: string
} {
  // Remove outer parentheses and trim
  const trimmed = args.trim()

  // Handle empty args
  if (!trimmed) {
    return { message: '' }
  }

  // Try to detect error object (common patterns)
  // Pattern: "message", error or "message", error, metadata
  const errorPattern = /^['"]([^'"]+)['"]\s*,\s*(\w+)(?:\s*,\s*(.+))?$/
  const errorMatch = trimmed.match(errorPattern)

  if (errorMatch && errorMatch[1]) {
    return {
      message: errorMatch[1],
      error: errorMatch[2],
      metadata: errorMatch[3],
    }
  }

  // Pattern: error (just error object)
  if (/^\w+$/.test(trimmed) && !trimmed.startsWith('"') && !trimmed.startsWith("'")) {
    return {
      message: '',
      error: trimmed,
    }
  }

  // Pattern: "message", metadata
  const metadataPattern = /^['"]([^'"]+)['"]\s*,\s*(.+)$/
  const metadataMatch = trimmed.match(metadataPattern)

  if (metadataMatch && metadataMatch[1]) {
    return {
      message: metadataMatch[1],
      metadata: metadataMatch[2],
    }
  }

  // Pattern: template literal or complex expression
  if (trimmed.startsWith('`') || trimmed.includes('${')) {
    return {
      message: trimmed,
    }
  }

  // Pattern: simple string
  if (trimmed.startsWith('"') || trimmed.startsWith("'")) {
    const stringMatch = trimmed.match(/^(['"])(.*)\1$/)
    if (stringMatch && stringMatch[2] !== undefined) {
      return {
        message: stringMatch[2],
      }
    }
  }

  // Default: treat as message
  return {
    message: trimmed,
  }
}

/**
 * Convert console statement to logger call
 */
function convertToLoggerCall(consoleMethod: string, args: string, fullStatement: string): string {
  const loggerMethod = mapToLoggerMethod(consoleMethod)
  const parsed = parseConsoleArgs(args)

  // Handle error method specially
  if (consoleMethod === 'error' && parsed.error) {
    if (parsed.metadata) {
      return `log.error('${parsed.message}', ${parsed.error}, ${parsed.metadata})`
    }
    if (parsed.message) {
      return `log.error('${parsed.message}', ${parsed.error})`
    }
    return `log.error('Error occurred', ${parsed.error})`
  }

  // Handle with metadata
  if (parsed.metadata) {
    return `log.${loggerMethod}('${parsed.message}', ${parsed.metadata})`
  }

  // Handle template literals or complex expressions
  if (parsed.message.includes('${') || parsed.message.startsWith('`')) {
    return `log.${loggerMethod}(${parsed.message})`
  }

  // Handle empty message (just error or object)
  if (!parsed.message && parsed.error) {
    return `log.${loggerMethod}('', ${parsed.error})`
  }

  // Simple message
  if (parsed.message) {
    return `log.${loggerMethod}('${parsed.message}')`
  }

  // Fallback: preserve original but convert method
  return fullStatement.replace(`console.${consoleMethod}`, `log.${loggerMethod}`)
}

/**
 * Replace console statements in content
 */
function replaceConsoleStatements(content: string): {
  modified: string
  changes: Array<{ line: number; before: string; after: string; method: string }>
} {
  const lines = content.split('\n')
  const changes: Array<{ line: number; before: string; after: string; method: string }> = []
  const modifiedLines: string[] = []

  // Pattern to match console statements (handles multi-line)
  const consolePattern = /console\.(log|warn|error|info|debug)\s*\(([^)]*(?:\([^)]*\)[^)]*)*)\)/g

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue

    let modifiedLine = line

    // Find all console statements in this line
    const matches = Array.from(line.matchAll(consolePattern))

    for (const match of matches) {
      const fullMatch = match[0]
      const consoleMethod = match[1]
      const args = match[2]

      if (!consoleMethod) continue

      const loggerCall = convertToLoggerCall(consoleMethod, args || '', fullMatch)
      modifiedLine = modifiedLine.replace(fullMatch, loggerCall)

      changes.push({
        line: i + 1,
        before: fullMatch.trim(),
        after: loggerCall.trim(),
        method: consoleMethod,
      })
    }

    modifiedLines.push(modifiedLine)
  }

  return {
    modified: modifiedLines.join('\n'),
    changes,
  }
}

/**
 * Add logger import to file content
 */
function addLoggerImport(content: string): string {
  // Find the last import statement
  const importRegex = /^import\s+.+from\s+['"][^'"]+['"]/gm
  const imports = content.match(importRegex)

  if (!imports || imports.length === 0) {
    // No imports found, add at the top
    return `${LOGGER_IMPORT}\n${content}`
  }

  // Find the position after the last import
  const lastImport = imports[imports.length - 1]
  if (!lastImport) {
    return `${LOGGER_IMPORT}\n${content}`
  }
  const lastImportIndex = content.lastIndexOf(lastImport)
  const insertPosition = lastImportIndex + lastImport.length

  // Check if there's already a logger import
  if (hasLoggerImport(content)) {
    return content
  }

  // Insert the logger import
  return content.slice(0, insertPosition) + '\n' + LOGGER_IMPORT + content.slice(insertPosition)
}

/**
 * Process a single file
 */
async function processFile(filePath: string): Promise<MigrationResult> {
  try {
    const content = await fs.readFile(filePath, 'utf8')

    // Skip if no console statements
    if (!hasConsoleStatements(content)) {
      return {
        filePath,
        changes: [],
        importAdded: false,
      }
    }

    // Replace console statements
    const { modified: replacedContent, changes } = replaceConsoleStatements(content)

    if (changes.length === 0) {
      return {
        filePath,
        changes: [],
        importAdded: false,
      }
    }

    // Add logger import if needed
    let finalContent = replacedContent
    let importAdded = false
    if (!hasLoggerImport(finalContent)) {
      finalContent = addLoggerImport(finalContent)
      importAdded = true
    }

    // Write the file if not dry run
    if (!DRY_RUN) {
      await fs.writeFile(filePath, finalContent, 'utf8')
    }

    return {
      filePath,
      changes,
      importAdded,
    }
  } catch (error) {
    return {
      filePath,
      changes: [],
      importAdded: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Recursively process directory
 */
async function processDirectory(dirPath: string): Promise<MigrationStats> {
  const stats: MigrationStats = {
    processed: 0,
    modified: 0,
    skipped: 0,
    errors: 0,
    totalChanges: 0,
    results: [],
  }

  try {
    const entries = await fs.readdir(dirPath)

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry)

      try {
        const stat = await fs.stat(fullPath)

        if (stat.isDirectory()) {
          // Skip excluded directories
          if (shouldExcludeDir(entry)) {
            continue
          }

          // Recursively process subdirectory
          const subStats = await processDirectory(fullPath)
          stats.processed += subStats.processed
          stats.modified += subStats.modified
          stats.skipped += subStats.skipped
          stats.errors += subStats.errors
          stats.totalChanges += subStats.totalChanges
          stats.results.push(...subStats.results)
        } else if (stat.isFile()) {
          // Only process .ts and .tsx files
          if (
            (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) &&
            !shouldExcludeFile(fullPath)
          ) {
            stats.processed++
            const result = await processFile(fullPath)

            if (result.error) {
              stats.errors++
              stats.results.push(result)
            } else if (result.changes.length > 0) {
              stats.modified++
              stats.totalChanges += result.changes.length
              stats.results.push(result)
            } else {
              stats.skipped++
            }
          }
        }
      } catch (error) {
        if (VERBOSE) {
          console.error(`Error processing ${fullPath}:`, error)
        }
      }
    }
  } catch (error) {
    if (VERBOSE) {
      console.error(`Error reading directory ${dirPath}:`, error)
    }
  }

  return stats
}

/**
 * Generate migration report
 */
function generateReport(stats: MigrationStats): string {
  let report = '\n' + '='.repeat(80) + '\n'
  report += 'CONSOLE → LOGGER MIGRATION REPORT\n'
  report += '='.repeat(80) + '\n\n'

  report += `Files processed:  ${stats.processed}\n`
  report += `Files modified:   ${stats.modified}\n`
  report += `Files skipped:    ${stats.skipped}\n`
  report += `Errors:           ${stats.errors}\n`
  report += `Total changes:    ${stats.totalChanges}\n\n`

  if (stats.results.length > 0) {
    report += 'DETAILED CHANGES:\n'
    report += '-'.repeat(80) + '\n\n'

    for (const result of stats.results) {
      if (result.error) {
        report += `❌ ${result.filePath}\n`
        report += `   Error: ${result.error}\n\n`
        continue
      }

      if (result.changes.length === 0) {
        continue
      }

      report += `✅ ${result.filePath}\n`
      if (result.importAdded) {
        report += `   [Added logger import]\n`
      }
      report += `   Changes (${result.changes.length}):\n`

      for (const change of result.changes) {
        report += `   Line ${change.line}: ${change.method.toUpperCase()}\n`
        report += `     Before: ${change.before}\n`
        report += `     After:  ${change.after}\n`
      }
      report += '\n'
    }
  }

  report += '='.repeat(80) + '\n'
  return report
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2).filter((arg) => !arg.startsWith('--'))
  const targetDir = args[0] || 'app/api'
  const fullPath = path.resolve(process.cwd(), targetDir)

  console.log('\n🔧 Console → Logger Migration Script\n')
  console.log(`Target directory: ${fullPath}`)
  console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN (no files modified)' : '✍️  WRITE MODE'}\n`)

  if (!existsSync(fullPath)) {
    console.error(`❌ Directory not found: ${fullPath}`)
    process.exit(1)
  }

  const startTime = Date.now()
  const stats = await processDirectory(fullPath)
  const duration = Date.now() - startTime

  // Print summary
  console.log('\n📊 Migration Summary\n')
  console.log(`Files processed:  ${stats.processed}`)
  console.log(`Files modified:   ${stats.modified}`)
  console.log(`Files skipped:    ${stats.skipped}`)
  console.log(`Errors:           ${stats.errors}`)
  console.log(`Total changes:    ${stats.totalChanges}`)
  console.log(`Duration:         ${duration}ms\n`)

  // Generate and save report
  const report = generateReport(stats)
  console.log(report)

  // Save report to file
  const reportPath = path.join(process.cwd(), 'console-migration-report.txt')
  if (!DRY_RUN) {
    await fs.writeFile(reportPath, report, 'utf8')
    console.log(`📄 Report saved to: ${reportPath}\n`)
  }

  if (DRY_RUN) {
    console.log('ℹ️  This was a DRY RUN. No files were modified.')
    console.log('   Run without --dry-run to apply changes.\n')
  }

  // Exit with error code if there were errors
  if (stats.errors > 0) {
    process.exit(1)
  }
}

// Run the script
main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
