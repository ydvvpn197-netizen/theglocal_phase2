#!/usr/bin/env node

/**
 * Fix extra closing braces in catch blocks
 */

const fs = require('fs')
const path = require('path')

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8')
  const original = content

  // Fix pattern: } catch ... } } } - remove extra closing braces
  // Look for catch blocks followed by multiple closing braces
  content = content.replace(
    /(\s+} catch \(error\) \{[^}]*return handleAPIError\([^)]+\)\s*\}\s*)\n\s*\}\s*\}\s*\n\s*\}/g,
    '$1\n  }'
  )

  // Fix pattern: } catch ... } } - remove one extra brace
  content = content.replace(
    /(\s+} catch \(error\) \{[^}]*return handleAPIError\([^)]+\)\s*\}\s*)\n\s*\}\s*\}\s*\n/g,
    '$1\n  }\n'
  )

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8')
    return true
  }
  return false
}

// Get all route files
const API_DIR = path.join(process.cwd(), 'app', 'api')

function findRouteFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir)
  files.forEach((file) => {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)
    if (stat.isDirectory()) {
      findRouteFiles(filePath, fileList)
    } else if (file === 'route.ts') {
      fileList.push(filePath)
    }
  })
  return fileList
}

const routeFiles = findRouteFiles(API_DIR)
let fixed = 0

routeFiles.forEach((file) => {
  if (fixFile(file)) {
    fixed++
    console.log(`Fixed: ${path.relative(process.cwd(), file)}`)
  }
})

console.log(`\nFixed ${fixed} files`)
