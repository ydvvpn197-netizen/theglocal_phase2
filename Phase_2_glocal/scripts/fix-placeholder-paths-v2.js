#!/usr/bin/env node

/**
 * Fix script to replace METHOD/PATH placeholders with actual values
 * Simpler approach: read the logger line to get method and path
 */

const fs = require('fs')
const path = require('path')

function extractAPIPath(filePath) {
  const relativePath = path.relative(path.join(process.cwd(), 'app', 'api'), filePath)
  const pathParts = relativePath.split(path.sep).filter((p) => p !== 'route.ts' && p !== 'route.js')
  let apiPath = '/api/' + pathParts.join('/')

  // Replace Windows backslashes with forward slashes
  apiPath = apiPath.replace(/\\/g, '/')

  return apiPath
}

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8')
  const original = content
  const basePath = extractAPIPath(filePath)

  // Find all placeholder patterns and replace them
  // Pattern: catch (error) { return handleAPIError(error, { method: 'METHOD', path: 'PATH' }) }
  const placeholderPattern =
    /catch\s*\(error\)\s*\{\s*return\s+handleAPIError\s*\(\s*error,\s*\{\s*method:\s*['"]METHOD['"]\s*,\s*path:\s*['"]PATH['"]\s*\}\s*\)\s*\}/g

  // Find all function handlers
  const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']

  for (const method of HTTP_METHODS) {
    // Find function declarations
    const funcRegex = new RegExp(
      `export\\s+(async\\s+)?function\\s+${method}\\s*\\([^)]*\\)\\s*\\{`,
      'g'
    )
    let funcMatch

    while ((funcMatch = funcRegex.exec(content)) !== null) {
      const funcStart = funcMatch.index
      const funcBodyStart = funcStart + funcMatch[0].length

      // Find the logger line in this function
      const funcContent = content.substring(funcStart)
      const loggerMatch = funcContent.match(
        new RegExp(
          `const\\s+logger\\s*=\\s*createAPILogger\\(['"]${method}['"]\\s*,\\s*['"]([^'"]+)['"]\\)`
        )
      )

      let actualPath = basePath
      if (loggerMatch) {
        actualPath = loggerMatch[1]
      } else {
        // Check if it's a dynamic route with params
        const paramsMatch = funcContent.match(/params\s*:\s*\{[^}]*\}/)
        if (paramsMatch) {
          // For dynamic routes, construct path with template literal
          if (basePath.includes('[id]')) {
            actualPath = `\`${basePath.replace('[id]', '${params.id}').replace('[slug]', '${params.slug}').replace('[userId]', '${params.userId}').replace('[handle]', '${params.handle}').replace('[messageId]', '${params.messageId}')}\``
          } else {
            actualPath = `'${basePath}'`
          }
        } else {
          actualPath = `'${basePath}'`
        }
      }

      // Replace placeholder in this function's scope
      const funcEnd = findMatchingBrace(content, funcBodyStart - 1)
      const beforeFunc = content.substring(0, funcStart)
      const funcBody = content.substring(funcStart, funcEnd + 1)
      const afterFunc = content.substring(funcEnd + 1)

      // Replace placeholder in function body
      const fixedFuncBody = funcBody.replace(
        /catch\s*\(error\)\s*\{\s*return\s+handleAPIError\s*\(\s*error,\s*\{\s*method:\s*['"]METHOD['"]\s*,\s*path:\s*['"]PATH['"]\s*\}\s*\)\s*\}/g,
        (match) => {
          // Determine if path should be template literal or string
          const isTemplateLiteral = actualPath.startsWith('`')
          const pathValue = isTemplateLiteral ? actualPath : `'${actualPath}'`

          return `catch (error) {\n    return handleAPIError(error, {\n      method: '${method}',\n      path: ${pathValue},\n    })\n  }`
        }
      )

      if (fixedFuncBody !== funcBody) {
        content = beforeFunc + fixedFuncBody + afterFunc
        // Reset regex lastIndex since we modified content
        funcRegex.lastIndex = 0
        break // Restart from beginning
      }
    }
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8')
    return true
  }
  return false
}

function findMatchingBrace(content, startIndex) {
  let braceCount = 0
  let foundFirst = false

  for (let i = startIndex; i < content.length; i++) {
    if (content[i] === '{') {
      braceCount++
      foundFirst = true
    } else if (content[i] === '}') {
      braceCount--
      if (foundFirst && braceCount === 0) {
        return i
      }
    }
  }
  return content.length - 1
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

// Get files with placeholders
const routeFiles = findRouteFiles(API_DIR)
const filesWithPlaceholders = routeFiles.filter((file) => {
  const content = fs.readFileSync(file, 'utf-8')
  return content.includes("method: 'METHOD'") || content.includes('method: "METHOD"')
})

console.log(`Found ${filesWithPlaceholders.length} files with placeholders\n`)

let fixed = 0
filesWithPlaceholders.forEach((file) => {
  if (fixFile(file)) {
    fixed++
    console.log(`Fixed: ${path.relative(process.cwd(), file)}`)
  }
})

console.log(`\nFixed ${fixed} files`)
