#!/usr/bin/env node
/**
 * Bulk Console Log Cleanup Script
 * Replaces console.log/warn/error with proper logger calls
 * Preserves development-only console statements
 */

const fs = require('fs')
const path = require('path')
const { glob } = require('glob')

const DRY_RUN = process.argv.includes('--dry-run')
const VERBOSE = process.argv.includes('--verbose')

// Directories to process
const DIRECTORIES = ['app', 'components', 'lib', 'hooks']

// Files to skip
const SKIP_PATTERNS = [
  '**/node_modules/**',
  '**/.next/**',
  '**/dist/**',
  '**/build/**',
  '**/*.test.ts',
  '**/*.test.tsx',
  '**/*.spec.ts',
  '**/*.spec.tsx',
]

// Console methods to replace
const CONSOLE_METHODS = ['log', 'warn', 'error', 'info', 'debug']

let totalFiles = 0
let totalReplacements = 0

function shouldProcessFile(filePath) {
  return SKIP_PATTERNS.every((pattern) => !filePath.includes(pattern.replace('**/', '')))
}

function processFile(filePath) {
  if (!shouldProcessFile(filePath)) {
    return 0
  }

  let content = fs.readFileSync(filePath, 'utf8')
  const originalContent = content
  let replacements = 0

  // Skip if already has logger import
  const hasLoggerImport = /import.*logger.*from.*@\/lib\/utils\/logger/.test(content)

  // Skip if already wrapped in development check
  const alreadyWrapped = /process\.env\.NODE_ENV.*===.*'development'.*console\./s.test(content)

  if (alreadyWrapped) {
    if (VERBOSE) console.log(`⏭️  Skipped (already wrapped): ${filePath}`)
    return 0
  }

  // Pattern: console.log/warn/error/info/debug(...)
  const consolePattern = new RegExp(`console\\.(${CONSOLE_METHODS.join('|')})\\(`, 'g')

  // Check if file has console statements
  const matches = content.match(consolePattern)
  if (!matches || matches.length === 0) {
    return 0
  }

  // Add logger import if not present
  if (!hasLoggerImport) {
    const importStatement = "import { logger } from '@/lib/utils/logger'\n"

    // Find the first import statement
    const firstImportMatch = content.match(/^import .+/m)
    if (firstImportMatch) {
      content = content.replace(firstImportMatch[0], `${importStatement}${firstImportMatch[0]}`)
    } else {
      // No imports, add at the top
      content = importStatement + content
    }
  }

  // Replace console statements
  CONSOLE_METHODS.forEach((method) => {
    const pattern = new RegExp(`console\\.${method}\\(`, 'g')
    const replacement = `logger.${method === 'log' ? 'info' : method}(`
    const methodMatches = content.match(pattern)
    if (methodMatches) {
      content = content.replace(pattern, replacement)
      replacements += methodMatches.length
    }
  })

  if (replacements > 0) {
    if (!DRY_RUN) {
      fs.writeFileSync(filePath, content, 'utf8')
    }

    console.log(
      `✅ ${DRY_RUN ? '[DRY RUN] ' : ''}Processed: ${filePath} (${replacements} replacements)`
    )
    totalReplacements += replacements
  }

  return replacements
}

async function main() {
  console.log('🧹 Console Log Cleanup Script')
  console.log('============================\n')

  if (DRY_RUN) {
    console.log('⚠️  DRY RUN MODE - No files will be modified\n')
  }

  for (const dir of DIRECTORIES) {
    console.log(`\n📂 Processing directory: ${dir}/`)

    const pattern = `${dir}/**/*.{ts,tsx}`
    const files = await glob(pattern, {
      ignore: SKIP_PATTERNS,
      absolute: true,
    })

    for (const file of files) {
      const replacements = processFile(file)
      if (replacements > 0) {
        totalFiles++
      }
    }
  }

  console.log('\n============================')
  console.log('📊 Summary')
  console.log('============================')
  console.log(`Files processed: ${totalFiles}`)
  console.log(`Total replacements: ${totalReplacements}`)

  if (DRY_RUN) {
    console.log('\n💡 Run without --dry-run to apply changes')
  } else {
    console.log('\n✅ Cleanup complete!')
  }
}

main().catch((err) => {
  console.error('❌ Error:', err)
  process.exit(1)
})
