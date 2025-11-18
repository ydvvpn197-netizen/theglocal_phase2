#!/usr/bin/env node

/**
 * Fix script to correct common migration errors
 * - Removes duplicate catch blocks
 * - Fixes broken try-catch structures
 * - Replaces remaining NextResponse.json patterns
 */

const fs = require('fs')
const path = require('path')

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8')
  const original = content

  // Fix pattern: duplicate catch blocks with orphaned code
  // Pattern: } catch (error) { return handleAPIError(...) } throw error }
  content = content.replace(
    /}\s*catch\s*\([^)]*\)\s*{\s*return\s+handleAPIError\([^)]+\)\s*}\s*throw\s+error\s*}/g,
    "} catch (error) { return handleAPIError(error, { method: 'METHOD', path: 'PATH' }) }"
  )

  // Fix pattern: orphaned return statements after catch
  content = content.replace(
    /}\s*catch\s*\([^)]*\)\s*{\s*return\s+handleAPIError\([^)]+\)\s*}\s*}\s*$/gm,
    "} catch (error) { return handleAPIError(error, { method: 'METHOD', path: 'PATH' }) }"
  )

  // Fix empty meta objects in createSuccessResponse
  content = content.replace(
    /createSuccessResponse\(([^,]+),\s*\{\s*\}\s*\)/g,
    'createSuccessResponse($1)'
  )

  // Fix remaining NextResponse.json success patterns
  content = content.replace(
    /return\s+NextResponse\.json\(\s*\{\s*success:\s*true\s*,\s*data:\s*([^,}]+)\s*,\s*message:\s*['"]([^'"]+)['"]\s*\}\s*\)/g,
    "return createSuccessResponse($1, { message: '$2' })"
  )

  // Fix remaining NextResponse.json success patterns without message
  content = content.replace(
    /return\s+NextResponse\.json\(\s*\{\s*success:\s*true\s*,\s*data:\s*([^}]+)\s*\}\s*\)/g,
    'return createSuccessResponse($1)'
  )

  // Fix remaining error responses in catch blocks
  content = content.replace(
    /catch\s*\([^)]*\)\s*{\s*logger\.error\([^;]+\)\s*;?\s*return\s+NextResponse\.json\(\s*\{\s*error:\s*([^}]+)\}\s*,\s*\{\s*status:\s*(\d+)\s*\}\s*\)\s*}/g,
    (match, errorExpr, status) => {
      return `catch (error) { return handleAPIError(error, { method: 'METHOD', path: 'PATH' }) }`
    }
  )

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8')
    return true
  }
  return false
}

// Get list of files with errors from type-check output
// For now, just fix common patterns in all route files
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
