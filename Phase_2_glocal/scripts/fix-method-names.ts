#!/usr/bin/env tsx

/**
 * Script to fix incorrect method names in error contexts
 * Fixes POST/PUT/PATCH/DELETE handlers that have method: 'GET' in error context
 */

import * as fs from 'fs'
import * as path from 'path'

const API_DIR = path.join(process.cwd(), 'app', 'api')
const HTTP_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE']

function findRouteFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir)

  files.forEach((file) => {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)

    if (stat.isDirectory()) {
      findRouteFiles(filePath, fileList)
    } else if (file === 'route.ts' || file === 'route.js') {
      fileList.push(filePath)
    }
  })

  return fileList
}

function fixMethodNames(filePath: string): boolean {
  let content = fs.readFileSync(filePath, 'utf-8')
  const originalContent = content
  let fixed = false

  for (const method of HTTP_METHODS) {
    // Pattern: export async function METHOD(...) { ... handleAPIError(..., { method: 'GET' ... }
    const methodPattern = new RegExp(
      `(export\\s+(async\\s+)?function\\s+${method}\\s*\\([^)]*\\)\\s*\\{[\\s\\S]*?handleAPIError\\s*\\([^,]+,\\s*\\{\\s*method:\\s*)['"]GET['"]`,
      'g'
    )

    if (methodPattern.test(content)) {
      content = content.replace(
        new RegExp(
          `(export\\s+(async\\s+)?function\\s+${method}\\s*\\([^)]*\\)\\s*\\{[\\s\\S]*?handleAPIError\\s*\\([^,]+,\\s*\\{\\s*method:\\s*)['"]GET['"]`,
          'g'
        ),
        `$1'${method}'`
      )
      fixed = true
    }
  }

  if (fixed && content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8')
    return true
  }

  return false
}

function main() {
  const routeFiles = findRouteFiles(API_DIR)
  let fixedCount = 0

  console.log(`Scanning ${routeFiles.length} route files for incorrect method names...\n`)

  for (const filePath of routeFiles) {
    if (fixMethodNames(filePath)) {
      const relativePath = path.relative(process.cwd(), filePath)
      console.log(`✅ Fixed: ${relativePath}`)
      fixedCount++
    }
  }

  console.log(`\nFixed ${fixedCount} files`)
}

if (require.main === module) {
  main()
}
