/**
 * Audit Script for TypeScript `any` Types
 * Finds and categorizes all `any` type usage in source files
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { join, extname } from 'path'

interface AnyUsage {
  file: string
  line: number
  column: number
  pattern: 'explicit' | 'record' | 'array' | 'assertion' | 'function-param' | 'generic' | 'other'
  context: string
  code: string
}

const EXCLUDE_DIRS = [
  'node_modules',
  '.next',
  'dist',
  'build',
  '__tests__',
  'tests',
  'docs',
  '.git',
]
const EXCLUDE_FILES = ['.test.ts', '.test.tsx', '.spec.ts', '.spec.tsx']
const INCLUDE_EXTENSIONS = ['.ts', '.tsx']

function shouldExcludePath(filePath: string): boolean {
  const parts = filePath.split(/[/\\]/)
  return parts.some((part) => EXCLUDE_DIRS.includes(part) || part.startsWith('.'))
}

function shouldExcludeFile(fileName: string): boolean {
  return EXCLUDE_FILES.some((pattern) => fileName.includes(pattern))
}

function findAnyTypes(content: string, filePath: string): AnyUsage[] {
  const usages: AnyUsage[] = []
  const lines = content.split('\n')

  lines.forEach((line, lineIndex) => {
    const lineNum = lineIndex + 1

    // Skip comments
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
      return
    }

    // Pattern 1: Explicit `any` type annotation
    const explicitAnyRegex = /:\s*any\b/g
    let match
    while ((match = explicitAnyRegex.exec(line)) !== null) {
      usages.push({
        file: filePath,
        line: lineNum,
        column: match.index + 1,
        pattern: 'explicit',
        context: line.trim(),
        code: line.trim(),
      })
    }

    // Pattern 2: Record<string, any>
    const recordAnyRegex = /Record\s*<\s*string\s*,\s*any\s*>/g
    while ((match = recordAnyRegex.exec(line)) !== null) {
      usages.push({
        file: filePath,
        line: lineNum,
        column: match.index + 1,
        pattern: 'record',
        context: line.trim(),
        code: line.trim(),
      })
    }

    // Pattern 3: any[]
    const arrayAnyRegex = /\bany\s*\[\]/g
    while ((match = arrayAnyRegex.exec(line)) !== null) {
      usages.push({
        file: filePath,
        line: lineNum,
        column: match.index + 1,
        pattern: 'array',
        context: line.trim(),
        code: line.trim(),
      })
    }

    // Pattern 4: Type assertion `as any`
    const assertionRegex = /\bas\s+any\b/g
    while ((match = assertionRegex.exec(line)) !== null) {
      usages.push({
        file: filePath,
        line: lineNum,
        column: match.index + 1,
        pattern: 'assertion',
        context: line.trim(),
        code: line.trim(),
      })
    }

    // Pattern 5: Function parameter `param: any`
    const funcParamRegex = /\([^)]*\b\w+\s*:\s*any\b[^)]*\)/g
    while ((match = funcParamRegex.exec(line)) !== null) {
      usages.push({
        file: filePath,
        line: lineNum,
        column: match.index + 1,
        pattern: 'function-param',
        context: line.trim(),
        code: line.trim(),
      })
    }

    // Pattern 6: Generic with any `T extends any` or `<any>`
    const genericAnyRegex = /<any>|extends\s+any\b/g
    while ((match = genericAnyRegex.exec(line)) !== null) {
      usages.push({
        file: filePath,
        line: lineNum,
        column: match.index + 1,
        pattern: 'generic',
        context: line.trim(),
        code: line.trim(),
      })
    }
  })

  return usages
}

function scanDirectory(dir: string, baseDir: string = dir): AnyUsage[] {
  const usages: AnyUsage[] = []

  try {
    const entries = readdirSync(dir)

    for (const entry of entries) {
      const fullPath = join(dir, entry)
      const relativePath = fullPath.replace(baseDir + '/', '').replace(/\\/g, '/')

      if (shouldExcludePath(relativePath)) {
        continue
      }

      const stat = statSync(fullPath)

      if (stat.isDirectory()) {
        usages.push(...scanDirectory(fullPath, baseDir))
      } else if (stat.isFile()) {
        const ext = extname(entry)
        if (INCLUDE_EXTENSIONS.includes(ext) && !shouldExcludeFile(entry)) {
          try {
            const content = readFileSync(fullPath, 'utf-8')
            const fileUsages = findAnyTypes(content, relativePath)
            usages.push(...fileUsages)
          } catch (error) {
            console.error(`Error reading ${fullPath}:`, error)
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning ${dir}:`, error)
  }

  return usages
}

function generateReport(usages: AnyUsage[]) {
  // Group by file
  const byFile = new Map<string, AnyUsage[]>()
  usages.forEach((usage) => {
    const existing = byFile.get(usage.file) || []
    existing.push(usage)
    byFile.set(usage.file, existing)
  })

  // Group by pattern
  const byPattern = new Map<string, AnyUsage[]>()
  usages.forEach((usage) => {
    const existing = byPattern.get(usage.pattern) || []
    existing.push(usage)
    byPattern.set(usage.pattern, existing)
  })

  // Count by file
  const fileCounts = Array.from(byFile.entries())
    .map(([file, fileUsages]) => ({
      file,
      count: fileUsages.length,
      patterns: fileUsages.map((u) => u.pattern),
    }))
    .sort((a, b) => b.count - a.count)

  // Count by pattern
  const patternCounts = Array.from(byPattern.entries())
    .map(([pattern, patternUsages]) => ({
      pattern,
      count: patternUsages.length,
    }))
    .sort((a, b) => b.count - a.count)

  return {
    summary: {
      total: usages.length,
      files: byFile.size,
      patterns: patternCounts,
    },
    byFile: fileCounts,
    allUsages: usages,
  }
}

// Main execution
const sourceDirs = ['app/api', 'lib']
const allUsages: AnyUsage[] = []

for (const dir of sourceDirs) {
  console.log(`Scanning ${dir}...`)
  const usages = scanDirectory(dir)
  allUsages.push(...usages)
  console.log(`Found ${usages.length} usages in ${dir}`)
}

const report = generateReport(allUsages)

// Write report
import { writeFileSync } from 'fs'
import { dirname } from 'path'

const reportPath = 'docs/audits/any-types-audit.json'
const reportDir = dirname(reportPath)

try {
  // Ensure directory exists
  const { mkdirSync } = require('fs')
  mkdirSync(reportDir, { recursive: true })
} catch (error) {
  // Directory might already exist
}

writeFileSync(reportPath, JSON.stringify(report, null, 2))

console.log('\n=== Audit Report ===')
console.log(`Total 'any' types found: ${report.summary.total}`)
console.log(`Files with 'any' types: ${report.summary.files}`)
console.log('\nBy Pattern:')
report.summary.patterns.forEach(({ pattern, count }) => {
  console.log(`  ${pattern}: ${count}`)
})
console.log('\nTop 20 files by count:')
report.byFile.slice(0, 20).forEach(({ file, count }) => {
  console.log(`  ${file}: ${count}`)
})
console.log(`\nReport written to ${reportPath}`)
