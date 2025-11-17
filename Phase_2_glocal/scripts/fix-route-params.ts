/**
 * Script to fix route parameter scope issues in Next.js route handlers
 * Fixes cases where route params are used in catch blocks but not in scope
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

const API_DIR = 'app/api'

function shouldProcessFile(filePath: string): boolean {
  return filePath.endsWith('route.ts') && !filePath.includes('node_modules')
}

// Note: fixRouteParams function is reserved for future use
// function fixRouteParams(_content: string, _filePath: string): string {
//   let fixed = _content
//   // Pattern 1: Fix params in catch blocks for routes with [id] or [messageId] etc.
//   // Look for catch blocks that reference params but params might not be in scope
//   // This is a complex fix that requires understanding the function structure
//   // For now, we'll focus on the manual fixes we've been doing
//   return fixed
// }

function scanAndFix(dir: string): void {
  const entries = readdirSync(dir)

  for (const entry of entries) {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      scanAndFix(fullPath)
    } else if (stat.isFile() && shouldProcessFile(fullPath)) {
      try {
        const content = readFileSync(fullPath, 'utf-8')
        // For now, just log files that might need fixing
        if (content.includes('path: `/api/') && content.includes('catch (error)')) {
          console.log(`Potential fix needed: ${fullPath}`)
        }
      } catch (error) {
        console.error(`Error processing ${fullPath}:`, error)
      }
    }
  }
}

// Main execution
console.log('Scanning for route files that might need parameter fixes...')
scanAndFix(API_DIR)
console.log('Done scanning. Manual fixes are recommended for complex cases.')
