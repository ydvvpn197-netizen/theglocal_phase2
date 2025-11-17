#!/usr/bin/env node

/**
 * Fix double-quoted paths in handleAPIError calls
 */

const fs = require('fs')
const path = require('path')

function extractAPIPath(filePath) {
  const relativePath = path.relative(path.join(process.cwd(), 'app', 'api'), filePath)
  const pathParts = relativePath.split(path.sep).filter((p) => p !== 'route.ts' && p !== 'route.js')
  let apiPath = '/api/' + pathParts.join('/')
  apiPath = apiPath.replace(/\\/g, '/')
  return apiPath
}

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8')
  const original = content
  const basePath = extractAPIPath(filePath)

  // Fix double-quoted paths: path: ''/api/...''
  content = content.replace(/path:\s*''([^']+)''/g, (match, pathValue) => {
    // Check if it's a dynamic route
    if (pathValue.includes('[') && pathValue.includes(']')) {
      // Extract the dynamic segment name
      const dynamicMatch = pathValue.match(/\[(\w+)\]/)
      if (dynamicMatch) {
        const paramName = dynamicMatch[1]
        // Check if params is available in the function
        if (content.includes(`params: { ${paramName}:`)) {
          return `path: \`${pathValue.replace(`[${paramName}]`, `\${params.${paramName}}`)}\``
        } else if (content.includes(`params: Promise<{ ${paramName}:`)) {
          return `path: \`${pathValue.replace(`[${paramName}]`, `\${${paramName}}`)}\``
        }
      }
      // For multiple dynamic segments
      let fixedPath = pathValue
      const allMatches = pathValue.matchAll(/\[(\w+)\]/g)
      for (const m of allMatches) {
        const paramName = m[1]
        if (content.includes(`${paramName}`)) {
          fixedPath = fixedPath.replace(`[${paramName}]`, `\${${paramName}}`)
        } else {
          fixedPath = fixedPath.replace(`[${paramName}]`, `\${params.${paramName}}`)
        }
      }
      return `path: \`${fixedPath}\``
    }
    return `path: '${pathValue}'`
  })

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8')
    return true
  }
  return false
}

// Get files with double-quoted paths
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
  return content.includes("path: ''/api")
})

console.log(`Found ${filesWithIssues.length} files with double-quoted paths\n`)

let fixed = 0
filesWithIssues.forEach((file) => {
  if (fixFile(file)) {
    fixed++
    console.log(`Fixed: ${path.relative(process.cwd(), file)}`)
  }
})

console.log(`\nFixed ${fixed} files`)
