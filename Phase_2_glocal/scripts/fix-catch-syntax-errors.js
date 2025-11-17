#!/usr/bin/env node

/**
 * Fix syntax errors in catch blocks: remove extra closing braces and status codes
 */

const fs = require('fs')
const path = require('path')

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8')
  const original = content

  // Fix pattern: } catch (error) { ... }, { status: 500 } ) }
  // Should be: } catch (error) { ... } }
  content = content.replace(
    /(\s+} catch \(error\) \{[^}]*return handleAPIError\([^)]+\)\s*\}),\s*\{\s*status:\s*500\s*\}\s*\)\s*}/g,
    (match, catchBlock) => {
      return catchBlock + '\n  }'
    }
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
const filesWithIssues = routeFiles.filter((file) => {
  const content = fs.readFileSync(file, 'utf-8')
  return content.includes('}, { status: 500 }')
})

console.log(`Found ${filesWithIssues.length} files with syntax errors\n`)

let fixed = 0
filesWithIssues.forEach((file) => {
  if (fixFile(file)) {
    fixed++
    console.log(`Fixed: ${path.relative(process.cwd(), file)}`)
  }
})

console.log(`\nFixed ${fixed} files`)
