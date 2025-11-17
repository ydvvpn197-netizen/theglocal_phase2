#!/usr/bin/env node
/**
 * Automated Console → Logger Migration Script
 *
 * This script systematically replaces console.* statements with logger.* calls
 * across the codebase, following the established pattern from manual migrations.
 *
 * Usage:
 *   node scripts/migrate-console-to-logger.js [directory]
 *
 * Example:
 *   node scripts/migrate-console-to-logger.js app/api
 *   node scripts/migrate-console-to-logger.js lib
 */

const fs = require('fs')
const path = require('path')
const { promisify } = require('util')

const readFile = promisify(fs.readFile)
const writeFile = promisify(fs.writeFile)
const readdir = promisify(fs.readdir)
const stat = promisify(fs.stat)

// Configuration
const DRY_RUN = process.env.DRY_RUN === 'true'
const VERBOSE = process.env.VERBOSE === 'true'

// Patterns to match console statements
const CONSOLE_PATTERNS = [
  // console.error patterns
  {
    regex: /console\.error\(['"]([^'"]+)['"](?:,\s*(\w+))?\)/g,
    replacement: (match, message, errorVar) => {
      if (errorVar) {
        return `logger.error('${message}', ${errorVar} instanceof Error ? ${errorVar} : undefined)`
      }
      return `logger.error('${message}')`
    },
  },
  // console.log patterns
  {
    regex: /console\.log\(['"]([^'"]+)['"](?:,\s*(.+?))?\)/g,
    replacement: (match, message, context) => {
      if (context) {
        return `logger.info('${message}', ${context})`
      }
      return `logger.info('${message}')`
    },
  },
  // console.warn patterns
  {
    regex: /console\.warn\(['"]([^'"]+)['"](?:,\s*(.+?))?\)/g,
    replacement: (match, message, context) => {
      if (context) {
        return `logger.warn('${message}', ${context})`
      }
      return `logger.warn('${message}')`
    },
  },
  // console.debug patterns
  {
    regex: /console\.debug\(['"]([^'"]+)['"](?:,\s*(.+?))?\)/g,
    replacement: (match, message, context) => {
      if (context) {
        return `logger.debug('${message}', ${context})`
      }
      return `logger.debug('${message}')`
    },
  },
]

// Import statement to add if not present
const LOGGER_IMPORT = "import { logger } from '@/lib/utils/logger'"

/**
 * Check if file needs logger import
 */
function needsLoggerImport(content) {
  return (
    content.includes('console.log') ||
    content.includes('console.error') ||
    content.includes('console.warn') ||
    content.includes('console.debug')
  )
}

/**
 * Check if file already has logger import
 */
function hasLoggerImport(content) {
  return (
    content.includes("from '@/lib/utils/logger'") || content.includes('from "@/lib/utils/logger"')
  )
}

/**
 * Add logger import to file
 */
function addLoggerImport(content) {
  // Find the last import statement
  const importRegex = /^import\s+.+from\s+['"][^'"]+['"]/gm
  const imports = content.match(importRegex)

  if (!imports || imports.length === 0) {
    // No imports found, add at the top
    return `${LOGGER_IMPORT}\n\n${content}`
  }

  // Find the position after the last import
  const lastImport = imports[imports.length - 1]
  const lastImportIndex = content.lastIndexOf(lastImport)
  const insertPosition = lastImportIndex + lastImport.length

  // Insert the logger import
  return content.slice(0, insertPosition) + '\n' + LOGGER_IMPORT + content.slice(insertPosition)
}

/**
 * Replace console statements with logger calls
 */
function replaceConsoleStatements(content) {
  let modified = content
  let changeCount = 0

  CONSOLE_PATTERNS.forEach((pattern) => {
    const matches = [...modified.matchAll(pattern.regex)]
    matches.forEach((match) => {
      const replacement = pattern.replacement(...match)
      modified = modified.replace(match[0], replacement)
      changeCount++
    })
  })

  return { content: modified, changeCount }
}

/**
 * Process a single file
 */
async function processFile(filePath) {
  try {
    const content = await readFile(filePath, 'utf8')

    // Skip if no console statements
    if (!needsLoggerImport(content)) {
      if (VERBOSE) console.log(`⏭️  Skipped (no console statements): ${filePath}`)
      return { skipped: true }
    }

    let modified = content

    // Add logger import if needed
    if (!hasLoggerImport(content)) {
      modified = addLoggerImport(modified)
    }

    // Replace console statements
    const { content: replacedContent, changeCount } = replaceConsoleStatements(modified)

    if (changeCount === 0) {
      if (VERBOSE) console.log(`⏭️  Skipped (no changes): ${filePath}`)
      return { skipped: true }
    }

    // Write the file
    if (!DRY_RUN) {
      await writeFile(filePath, replacedContent, 'utf8')
    }

    console.log(`✅ Modified (${changeCount} changes): ${filePath}`)
    return { modified: true, changeCount }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message)
    return { error: true }
  }
}

/**
 * Recursively process directory
 */
async function processDirectory(dirPath) {
  const entries = await readdir(dirPath)
  const stats = {
    processed: 0,
    modified: 0,
    skipped: 0,
    errors: 0,
    totalChanges: 0,
  }

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry)
    const entryStat = await stat(fullPath)

    if (entryStat.isDirectory()) {
      // Skip node_modules, .next, etc.
      if (entry === 'node_modules' || entry === '.next' || entry === '.git') {
        continue
      }

      // Recursively process subdirectory
      const subStats = await processDirectory(fullPath)
      stats.processed += subStats.processed
      stats.modified += subStats.modified
      stats.skipped += subStats.skipped
      stats.errors += subStats.errors
      stats.totalChanges += subStats.totalChanges
    } else if (entryStat.isFile()) {
      // Only process .ts and .tsx files
      if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
        stats.processed++
        const result = await processFile(fullPath)

        if (result.modified) {
          stats.modified++
          stats.totalChanges += result.changeCount || 0
        } else if (result.skipped) {
          stats.skipped++
        } else if (result.error) {
          stats.errors++
        }
      }
    }
  }

  return stats
}

/**
 * Main execution
 */
async function main() {
  const targetDir = process.argv[2] || 'app/api'
  const fullPath = path.resolve(process.cwd(), targetDir)

  console.log('\n🔧 Console → Logger Migration Script\n')
  console.log(`Target directory: ${fullPath}`)
  console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN (no files modified)' : '✍️  WRITE MODE'}\n`)

  if (!fs.existsSync(fullPath)) {
    console.error(`❌ Directory not found: ${fullPath}`)
    process.exit(1)
  }

  const startTime = Date.now()
  const stats = await processDirectory(fullPath)
  const duration = Date.now() - startTime

  console.log('\n📊 Migration Summary\n')
  console.log(`Files processed:  ${stats.processed}`)
  console.log(`Files modified:   ${stats.modified}`)
  console.log(`Files skipped:    ${stats.skipped}`)
  console.log(`Errors:           ${stats.errors}`)
  console.log(`Total changes:    ${stats.totalChanges}`)
  console.log(`Duration:         ${duration}ms\n`)

  if (DRY_RUN) {
    console.log('ℹ️  This was a DRY RUN. No files were modified.')
    console.log('   Run without DRY_RUN=true to apply changes.\n')
  }
}

// Run the script
main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
