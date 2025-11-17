#!/usr/bin/env node

/**
 * Fix single-quoted template literals in handleAPIError paths
 */

const fs = require('fs')
const path = require('path')

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8')
  const original = content

  // Fix pattern: path: '/api/...${variable}'
  // Should be: path: `/api/...${variable}`
  content = content.replace(/path:\s*'\/api\/([^']*\$\{[^}]+\}[^']*)'/g, (match, pathContent) => {
    return `path: \`/api/${pathContent}\``
  })

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8')
    return true
  }
  return false
}

// Get files with single-quoted template literals
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
  return content.includes("path: '/api/") && content.includes('${')
})

console.log(`Found ${filesWithIssues.length} files with single-quoted template literals\n`)

let fixed = 0
filesWithIssues.forEach((file) => {
  if (fixFile(file)) {
    fixed++
    console.log(`Fixed: ${path.relative(process.cwd(), file)}`)
  }
})

console.log(`\nFixed ${fixed} files`)
