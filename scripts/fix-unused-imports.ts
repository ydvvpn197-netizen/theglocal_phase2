/**
 * Script to automatically remove unused imports and variables
 * This helps clean up TS6133 errors
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

const API_DIR = 'app/api'
const LIB_DIR = 'lib'

function shouldProcessFile(filePath: string): boolean {
  return (
    (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) && !filePath.includes('node_modules')
  )
}

// Note: removeUnusedImports function is reserved for future use
// function removeUnusedImports(content: string): string {
//   // This is a simplified version - in practice, you'd want to use TypeScript compiler API
//   // For now, we'll just identify common patterns
//   // Pattern: Unused NextResponse import
//   // const nextResponsePattern = /import\s*{\s*([^}]*NextResponse[^}]*)\s*}\s*from\s*['"]next\/server['"]/g
//   // Pattern: Unused createSuccessResponse
//   // Pattern: Unused APIErrors
//   // Pattern: Unused logger variables
//   // Note: This is complex to do correctly without full AST parsing
//   // For now, we'll just log files that might have unused imports
//   return content
// }

function scanDirectory(dir: string, baseDir: string = dir): void {
  try {
    const entries = readdirSync(dir)

    for (const entry of entries) {
      const fullPath = join(dir, entry)
      const relativePath = fullPath.replace(baseDir + '/', '').replace(/\\/g, '/')

      if (entry.startsWith('.') || entry === 'node_modules') {
        continue
      }

      const stat = statSync(fullPath)

      if (stat.isDirectory()) {
        scanDirectory(fullPath, baseDir)
      } else if (stat.isFile() && shouldProcessFile(entry)) {
        try {
          const content = readFileSync(fullPath, 'utf-8')

          // Check for common unused import patterns
          if (
            content.includes('NextResponse') &&
            content.includes('import.*NextResponse') &&
            !content.match(/NextResponse\.(json|redirect)/)
          ) {
            console.log(`Potential unused NextResponse: ${relativePath}`)
          }
        } catch (error) {
          // Skip files that can't be read
        }
      }
    }
  } catch (error) {
    // Skip directories that can't be read
  }
}

console.log('Scanning for potential unused imports...')
scanDirectory(API_DIR)
scanDirectory(LIB_DIR)
console.log(
  '\nNote: Manual cleanup is recommended. Use ESLint autofix or IDE features for accurate removal.'
)
