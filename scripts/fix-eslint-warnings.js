#!/usr/bin/env node

/**
 * Batch Fix ESLint Warnings Script
 *
 * Automatically fixes common TypeScript unsafe any patterns:
 * 1. response.json() calls without type assertions
 * 2. Supabase RPC data access without type assertions
 * 3. Object destructuring from any values
 * 4. Common API response patterns
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// Patterns to fix
const FIX_PATTERNS = [
  // Pattern 1: await response.json() without type assertion
  {
    name: 'response.json() without type assertion',
    regex: /const\s+(\w+)\s*=\s*await\s+response\.json\(\)/g,
    replacement: (match, varName, context) => {
      // Try to infer type from context
      const contextStr = typeof context === 'string' ? context : ''
      if (contextStr.includes('error') || contextStr.includes('Error')) {
        return `const ${varName} = (await response.json()) as { error?: string; message?: string }`
      }
      if (contextStr.includes('result') || contextStr.includes('data')) {
        return `const ${varName} = (await response.json()) as { success?: boolean; error?: string; data?: unknown }`
      }
      return `const ${varName} = (await response.json()) as unknown`
    },
    test: (line) => line.includes('response.json()') && !line.includes('as '),
  },

  // Pattern 2: response.json().catch(() => ({}))
  {
    name: 'response.json().catch without type assertion',
    regex: /const\s+(\w+)\s*=\s*await\s+response\.json\(\)\.catch\(\(\)\s*=>\s*\(\{\}\)\)/g,
    replacement: (match, varName) => {
      return `const ${varName} = (await response.json().catch(() => ({}))) as { error?: string }`
    },
    test: (line) => line.includes('response.json().catch') && !line.includes('as '),
  },

  // Pattern 3: Supabase RPC data access without type check
  {
    name: 'Supabase RPC data without Array.isArray check',
    regex: /if\s*\(\s*error\s*\|\|\s*!data\s*\)\s*\{/g,
    replacement: () => {
      return 'if (error || !data || !Array.isArray(data)) {'
    },
    test: (line, context) => {
      const contextStr = typeof context === 'string' ? context : ''
      return (
        line.includes('if (error || !data)') &&
        (contextStr.includes('data.length') ||
          contextStr.includes('data[0]') ||
          contextStr.includes('data.map')) &&
        !line.includes('Array.isArray')
      )
    },
  },

  // Pattern 4: data[0] without type assertion (when data is array)
  {
    name: 'data[0] access without type assertion',
    regex: /const\s+(\w+)\s*=\s*data\[0\]/g,
    replacement: (match, varName, context) => {
      // Try to infer from context
      const contextStr = typeof context === 'string' ? context : ''
      if (contextStr.includes('status') || contextStr.includes('budget')) {
        return `const ${varName} = data[0] as { service_name?: string; status?: string; [key: string]: unknown }`
      }
      if (contextStr.includes('usage')) {
        return `const ${varName} = data[0] as { total_cost?: string; total_requests?: string; [key: string]: unknown }`
      }
      return `const ${varName} = data[0] as Record<string, unknown>`
    },
    test: (line) => line.includes('data[0]') && !line.includes('as '),
  },

  // Pattern 5: Object destructuring from any
  {
    name: 'Object destructuring from any',
    regex: /const\s+\{\s*(\w+)\s*\}\s*=\s*await\s+response\.json\(\)/g,
    replacement: (match, prop) => {
      return `const { ${prop} } = (await response.json()) as { ${prop}?: unknown }`
    },
    test: (line) =>
      line.includes('const {') && line.includes('response.json()') && !line.includes('as '),
  },

  // Pattern 6: Supabase .data access without type assertion
  {
    name: 'Supabase data access without type assertion',
    regex: /const\s+\{\s*data\s*,\s*error\s*\}\s*=\s*await\s+supabase\.rpc\(/g,
    replacement: () => {
      // This pattern is too complex to fix automatically - needs manual review
      return null
    },
    test: () => false, // Skip for now
  },

  // Pattern 7: payload.new or payload.old access
  {
    name: 'payload property access without type guard',
    regex: /payload\.(new|old)\?\.(\w+)/g,
    replacement: (match, prop, field) => {
      // Only fix if there's no type guard before
      return match // Keep as is - needs type guard check
    },
    test: () => false, // Skip - needs context
  },

  // Pattern 8: result.data access without type assertion
  {
    name: 'result.data access without type assertion',
    regex: /result\.data/g,
    replacement: () => {
      // Needs context to determine type
      return null
    },
    test: () => false, // Skip for now
  },

  // Pattern 9: Fix common Supabase query patterns
  {
    name: 'Supabase query data without type assertion',
    regex: /const\s+\{\s*data\s*:\s*(\w+)\s*,\s*error\s*\}\s*=\s*await\s+supabase\.from\(/g,
    replacement: () => {
      // Too complex - needs manual review
      return null
    },
    test: () => false,
  },
]

// Files to process
const TARGET_DIRS = ['lib/integrations', 'lib/utils', 'lib/payments', 'lib/security', 'lib/server']

// Files to skip
const SKIP_FILES = ['node_modules', '.next', '__tests__', '.test.', '.spec.']

/**
 * Check if file should be processed
 */
function shouldProcessFile(filePath) {
  if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) {
    return false
  }

  return !SKIP_FILES.some((skip) => filePath.includes(skip))
}

/**
 * Get all TypeScript files in directory
 */
function getTypeScriptFiles(dir) {
  const files = []

  function walkDir(currentPath) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name)

      if (entry.isDirectory()) {
        if (!SKIP_FILES.includes(entry.name)) {
          walkDir(fullPath)
        }
      } else if (shouldProcessFile(fullPath)) {
        files.push(fullPath)
      }
    }
  }

  walkDir(dir)
  return files
}

/**
 * Apply fixes to a file
 */
function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8')
    const originalContent = content
    let changed = false

    const lines = content.split('\n')
    const fixedLines = lines.map((line, index) => {
      let fixedLine = line
      const context = lines
        .slice(Math.max(0, index - 3), Math.min(lines.length, index + 3))
        .join('\n')

      for (const pattern of FIX_PATTERNS) {
        // Skip patterns with test returning false
        if (pattern.test === undefined || pattern.test(fixedLine, context)) {
          try {
            const newLine = fixedLine.replace(pattern.regex, (match, ...args) => {
              // Pass context as last argument
              const result = pattern.replacement(match, ...args, context)
              // Skip if replacement returns null
              return result === null ? match : result
            })

            if (newLine !== fixedLine) {
              fixedLine = newLine
              changed = true
            }
          } catch (err) {
            // Skip if replacement fails
            console.warn(
              `  Warning: Failed to apply pattern "${pattern.name}" to line ${index + 1}: ${err.message}`
            )
          }
        }
      }

      return fixedLine
    })

    if (changed) {
      content = fixedLines.join('\n')
      fs.writeFileSync(filePath, content, 'utf8')
      return true
    }

    return false
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message)
    return false
  }
}

/**
 * Main function
 */
function main() {
  console.log('🔧 ESLint Warning Batch Fix Script\n')
  console.log('Scanning files...\n')

  const allFiles = []
  for (const dir of TARGET_DIRS) {
    const dirPath = path.join(process.cwd(), dir)
    if (fs.existsSync(dirPath)) {
      const files = getTypeScriptFiles(dirPath)
      allFiles.push(...files)
      console.log(`Found ${files.length} files in ${dir}`)
    }
  }

  console.log(`\nTotal files to process: ${allFiles.length}\n`)
  console.log('Applying fixes...\n')

  let fixedCount = 0
  const fixedFiles = []

  for (const file of allFiles) {
    const relativePath = path.relative(process.cwd(), file)
    if (fixFile(file)) {
      fixedCount++
      fixedFiles.push(relativePath)
      console.log(`✓ Fixed: ${relativePath}`)
    }
  }

  console.log(`\n✅ Fixed ${fixedCount} files`)

  if (fixedFiles.length > 0) {
    console.log('\nFixed files:')
    fixedFiles.forEach((file) => console.log(`  - ${file}`))
  }

  console.log('\n💡 Next steps:')
  console.log('  1. Run: npm run lint')
  console.log('  2. Review the changes')
  console.log('  3. Run: npm run type-check')
  console.log('  4. Test your application')
}

// Run if executed directly
if (require.main === module) {
  main()
}

module.exports = { fixFile, FIX_PATTERNS }
