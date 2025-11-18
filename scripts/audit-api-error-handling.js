#!/usr/bin/env node

/**
 * Script to audit API routes and identify which ones are missing try-catch error handling
 */

const fs = require('fs')
const path = require('path')

const API_DIR = path.join(process.cwd(), 'app', 'api')

// Required imports for proper error handling
const REQUIRED_IMPORTS = ['handleAPIError', 'createSuccessResponse', 'createAPILogger']

// HTTP methods that should have error handling
const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']

function findRouteFiles(dir, fileList = []) {
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

function auditFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const relativePath = path.relative(process.cwd(), filePath)

  const issues = {
    missingTryCatch: [],
    missingImports: [],
    missingLogger: [],
    missingErrorHandler: [],
  }

  // Check for HTTP method handlers
  HTTP_METHODS.forEach((method) => {
    const methodRegex = new RegExp(`export\\s+(async\\s+)?function\\s+${method}\\s*\\(`, 'g')
    const matches = [...content.matchAll(methodRegex)]

    matches.forEach((match) => {
      const startIndex = match.index
      const handlerStart = startIndex + match[0].length

      // Find the function body (simplified - looks for opening brace)
      let braceCount = 0
      let inFunction = false
      let functionEnd = -1

      for (let i = handlerStart; i < content.length; i++) {
        if (content[i] === '{') {
          if (!inFunction) {
            inFunction = true
          }
          braceCount++
        } else if (content[i] === '}') {
          braceCount--
          if (inFunction && braceCount === 0) {
            functionEnd = i
            break
          }
        }
      }

      if (functionEnd === -1) {
        return // Couldn't find function end
      }

      const functionBody = content.substring(handlerStart, functionEnd)

      // Check if function has try-catch
      const hasTryCatch = /try\s*\{/.test(functionBody) && /catch\s*\(/.test(functionBody)

      if (!hasTryCatch) {
        issues.missingTryCatch.push(method)
      }

      // Check for required imports
      if (!content.includes('handleAPIError')) {
        issues.missingErrorHandler.push(method)
      }

      if (!content.includes('createSuccessResponse')) {
        issues.missingErrorHandler.push(method)
      }

      // Check for logger
      if (!content.includes('createAPILogger')) {
        issues.missingLogger.push(method)
      }
    })
  })

  // Check for required imports
  const hasHandleAPIError =
    content.includes("from '@/lib/utils/api-response'") ||
    content.includes("from '../lib/utils/api-response'") ||
    content.includes("from '../../lib/utils/api-response'")
  const hasLogger =
    content.includes("from '@/lib/utils/logger-context'") ||
    content.includes("from '../lib/utils/logger-context'") ||
    content.includes("from '../../lib/utils/logger-context'")

  if (!hasHandleAPIError && issues.missingErrorHandler.length > 0) {
    issues.missingImports.push('api-response')
  }

  if (!hasLogger && issues.missingLogger.length > 0) {
    issues.missingImports.push('logger-context')
  }

  // Return issues if any found
  const hasIssues =
    issues.missingTryCatch.length > 0 ||
    issues.missingImports.length > 0 ||
    issues.missingLogger.length > 0 ||
    issues.missingErrorHandler.length > 0

  return hasIssues ? { file: relativePath, issues } : null
}

function main() {
  console.log('Auditing API routes for error handling...\n')

  const routeFiles = findRouteFiles(API_DIR)
  console.log(`Found ${routeFiles.length} route files\n`)

  const filesWithIssues = []
  const filesWithoutIssues = []

  routeFiles.forEach((filePath) => {
    const result = auditFile(filePath)
    if (result) {
      filesWithIssues.push(result)
    } else {
      filesWithoutIssues.push(filePath)
    }
  })

  console.log('='.repeat(80))
  console.log('AUDIT RESULTS')
  console.log('='.repeat(80))
  console.log(`\nFiles with proper error handling: ${filesWithoutIssues.length}`)
  console.log(`Files needing migration: ${filesWithIssues.length}\n`)

  if (filesWithIssues.length > 0) {
    console.log('FILES NEEDING MIGRATION:')
    console.log('-'.repeat(80))

    filesWithIssues.forEach(({ file, issues }) => {
      console.log(`\n${file}`)
      if (issues.missingTryCatch.length > 0) {
        console.log(`  ❌ Missing try-catch for: ${issues.missingTryCatch.join(', ')}`)
      }
      if (issues.missingImports.length > 0) {
        console.log(`  ❌ Missing imports: ${issues.missingImports.join(', ')}`)
      }
      if (issues.missingLogger.length > 0) {
        console.log(`  ⚠️  Missing logger for: ${issues.missingLogger.join(', ')}`)
      }
      if (issues.missingErrorHandler.length > 0) {
        console.log(`  ⚠️  Missing error handler for: ${issues.missingErrorHandler.join(', ')}`)
      }
    })

    // Group by feature area
    console.log('\n' + '='.repeat(80))
    console.log('GROUPED BY FEATURE AREA:')
    console.log('='.repeat(80))

    const grouped = {}
    filesWithIssues.forEach(({ file }) => {
      const parts = file.split(path.sep)
      const featureArea = parts[parts.indexOf('api') + 1] || 'other'
      if (!grouped[featureArea]) {
        grouped[featureArea] = []
      }
      grouped[featureArea].push(file)
    })

    Object.keys(grouped)
      .sort()
      .forEach((area) => {
        console.log(`\n${area.toUpperCase()} (${grouped[area].length} files):`)
        grouped[area].forEach((file) => {
          console.log(`  - ${file}`)
        })
      })
  } else {
    console.log('✅ All API routes have proper error handling!')
  }

  // Write results to file
  const outputFile = path.join(process.cwd(), 'api-error-handling-audit.json')
  fs.writeFileSync(
    outputFile,
    JSON.stringify(
      {
        totalFiles: routeFiles.length,
        filesWithIssues: filesWithIssues.length,
        filesWithoutIssues: filesWithoutIssues.length,
        issues: filesWithIssues,
        timestamp: new Date().toISOString(),
      },
      null,
      2
    )
  )

  console.log(`\n📄 Detailed results saved to: ${outputFile}`)
  console.log(`\nExit code: ${filesWithIssues.length > 0 ? 1 : 0}`)

  process.exit(filesWithIssues.length > 0 ? 1 : 0)
}

main()
