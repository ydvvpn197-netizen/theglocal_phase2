/**
 * Batch script to add rate limiting imports and wrappers to route files
 * Processes files that use withRateLimit but are missing the import
 */

import * as fs from 'fs'
import * as path from 'path'
import { glob } from 'glob'

const routeFiles = await glob('app/api/**/route.ts')

const filesToFix = []

for (const filePath of routeFiles) {
  const content = fs.readFileSync(filePath, 'utf-8')
  
  // Check if uses withRateLimit but missing import
  const usesWithRateLimit = content.includes('withRateLimit(')
  const hasImport = content.includes("from '@/lib/middleware/with-rate-limit'") ||
                    content.includes('from "@/lib/middleware/with-rate-limit"')
  
  // Check if has HTTP method exports without rate limiting
  const hasHttpMethod = /export\s+(?:const|async\s+function)\s+(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s*=/.test(content)
  const needsRateLimit = hasHttpMethod && !usesWithRateLimit && !filePath.includes('/cron/')
  
  if (usesWithRateLimit && !hasImport) {
    filesToFix.push({ filePath, action: 'add-import' })
  } else if (needsRateLimit) {
    filesToFix.push({ filePath, action: 'add-wrapper' })
  }
}

console.log(`Found ${filesToFix.length} files to fix\n`)

for (const { filePath, action } of filesToFix) {
  console.log(`${action === 'add-import' ? '📦' : '🔒'} ${filePath}`)
  
  let content = fs.readFileSync(filePath, 'utf-8')
  
  if (action === 'add-import') {
    // Add import if missing
    if (!content.includes("from '@/lib/middleware/with-rate-limit'")) {
      // Find last import
      const importMatch = content.match(/(import\s+.*?from\s+['"].*?['"];?\s*\n)/g)
      if (importMatch) {
        const lastImport = importMatch[importMatch.length - 1]
        const lastImportIndex = content.lastIndexOf(lastImport)
        const insertIndex = lastImportIndex + lastImport.length
        
        content = content.slice(0, insertIndex) +
          "import { withRateLimit } from '@/lib/middleware/with-rate-limit'\n" +
          content.slice(insertIndex)
        
        fs.writeFileSync(filePath, content, 'utf-8')
        console.log(`  ✅ Added import`)
      }
    }
  }
}

console.log(`\n✅ Processed ${filesToFix.length} files`)

