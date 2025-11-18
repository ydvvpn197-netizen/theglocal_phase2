#!/usr/bin/env node

/**
 * Fix script to replace METHOD/PATH placeholders with actual values
 */

const fs = require('fs')
const path = require('path')

function extractAPIPath(filePath) {
  const relativePath = path.relative(path.join(process.cwd(), 'app', 'api'), filePath)
  const pathParts = relativePath.split(path.sep).filter((p) => p !== 'route.ts' && p !== 'route.js')
  return '/api/' + pathParts.join('/')
}

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8')
  const original = content
  const apiPath = extractAPIPath(filePath)

  // Find all function handlers and their methods
  const methodRegex =
    /export\s+(async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*\([^)]*\)\s*\{/g
  const matches = []
  let match

  while ((match = methodRegex.exec(content)) !== null) {
    matches.push({
      method: match[2],
      index: match.index,
    })
  }

  // Process matches in reverse to maintain indices
  for (let i = matches.length - 1; i >= 0; i--) {
    const { method, index } = matches[i]

    // Find the function body
    const functionStart = index
    const functionBodyStart = content.indexOf('{', functionStart) + 1

    // Find the logger line to get the actual path
    const loggerRegex = new RegExp(
      `const\\s+logger\\s*=\\s*createAPILogger\\(['"]${method}['"]\\s*,\\s*['"]([^'"]+)['"]\\)`,
      'g'
    )
    const loggerMatch = loggerRegex.exec(content.substring(functionStart))

    let actualPath = apiPath

    // If we have dynamic segments like [id], we need to construct the path
    if (loggerMatch) {
      actualPath = loggerMatch[1]
    } else {
      // Try to find path from params if it's a dynamic route
      const paramsMatch = content
        .substring(functionStart)
        .match(/params\s*:\s*\{\s*id\s*:\s*string\s*\}/)
      if (paramsMatch && apiPath.includes('[id]')) {
        actualPath = apiPath
          .replace('[id]', '${params.id}')
          .replace('[slug]', '${params.slug}')
          .replace('[userId]', '${params.userId}')
          .replace('[handle]', '${params.handle}')
          .replace('[messageId]', '${params.messageId}')
      } else if (apiPath.includes('[')) {
        // For dynamic routes, use template literal
        actualPath = apiPath.replace(/\[(\w+)\]/g, '${params.$1}')
      }
    }

    // Replace placeholder in this function's catch block
    const functionEnd = findFunctionEnd(content, functionBodyStart)
    const functionContent = content.substring(functionStart, functionEnd)

    // Replace placeholder with actual values
    const placeholderRegex = new RegExp(
      `catch\\s*\\(error\\)\\s*\\{\\s*return\\s+handleAPIError\\(error,\\s*\\{\\s*method:\\s*['"]METHOD['"]\\s*,\\s*path:\\s*['"]PATH['"]\\s*\\}\\)\\s*\\}`,
      'g'
    )

    const fixedCatch = functionContent.replace(placeholderRegex, (match) => {
      // Check if path needs to be a template literal
      if (actualPath.includes('${')) {
        return `catch (error) {\n    return handleAPIError(error, {\n      method: '${method}',\n      path: \`${actualPath}\`,\n    })\n  }`
      } else {
        return `catch (error) {\n    return handleAPIError(error, {\n      method: '${method}',\n      path: '${actualPath}',\n    })\n  }`
      }
    })

    if (fixedCatch !== functionContent) {
      content = content.substring(0, functionStart) + fixedCatch + content.substring(functionEnd)
    }
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8')
    return true
  }
  return false
}

function findFunctionEnd(content, startIndex) {
  let braceCount = 0
  let inFunction = false

  for (let i = startIndex; i < content.length; i++) {
    if (content[i] === '{') {
      inFunction = true
      braceCount++
    } else if (content[i] === '}') {
      braceCount--
      if (inFunction && braceCount === 0) {
        return i + 1
      }
    }
  }
  return content.length
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
