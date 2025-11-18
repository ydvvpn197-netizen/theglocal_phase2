#!/usr/bin/env node

/**
 * Fix remaining routes with common patterns:
 * 1. Remove syntax errors (extra braces, status codes)
 * 2. Convert NextResponse.json to APIErrors/createSuccessResponse
 * 3. Fix placeholder paths
 */

const fs = require('fs')
const path = require('path')

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8')
  const original = content

  // Fix syntax errors: }, { status: 500 } ) }
  content = content.replace(
    /(\s+} catch \(error\) \{[^}]*return handleAPIError\([^)]+\)\s*\}),\s*\{\s*status:\s*500\s*\}\s*\)\s*}/g,
    (match, catchBlock) => {
      return catchBlock + '\n  }'
    }
  )

  // Fix placeholder paths in handleAPIError
  const relativePath = path.relative(path.join(process.cwd(), 'app', 'api'), filePath)
  const pathParts = relativePath.split(path.sep).filter((p) => p !== 'route.ts' && p !== 'route.js')
  let basePath = '/api/' + pathParts.join('/')
  basePath = basePath.replace(/\\/g, '/')

  // Replace placeholder paths like '/api/polls/[id]' with actual path
  content = content.replace(/path:\s*['"]\/api\/[^'"]*\[id\]/g, (match) => {
    // Extract the base path and replace [id] with ${id} or ${pollId} etc
    const varName = pathParts[pathParts.length - 2]?.replace(/s$/, '') + 'Id' || 'id'
    return match.replace(/\[id\]/, `\${${varName}}`)
  })

  // Replace other placeholder patterns
  content = content.replace(/path:\s*['"]\/api\/[^'"]*\[handle\]/g, (match) => {
    return match.replace(/\[handle\]/, '${handle}')
  })
  content = content.replace(/path:\s*['"]\/api\/[^'"]*\[messageId\]/g, (match) => {
    return match.replace(/\[messageId\]/, '${messageId}')
  })
  content = content.replace(/path:\s*['"]\/api\/[^'"]*\[slug\]/g, (match) => {
    return match.replace(/\[slug\]/, '${slug}')
  })
  content = content.replace(/path:\s*['"]\/api\/[^'"]*\[userId\]/g, (match) => {
    return match.replace(/\[userId\]/, '${userId}')
  })

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
