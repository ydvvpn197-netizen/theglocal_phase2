#!/usr/bin/env node

/**
 * Migration script to standardize error handling across all API routes
 *
 * Transforms API routes to use:
 * - handleAPIError, createSuccessResponse, APIErrors from @/lib/utils/api-response
 * - createAPILogger from @/lib/utils/logger-context
 * - Standardized try-catch error handling
 */

const fs = require('fs')
const path = require('path')

const API_DIR = path.join(process.cwd(), 'app', 'api')
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

function extractAPIPath(filePath) {
  const relativePath = path.relative(path.join(process.cwd(), 'app', 'api'), filePath)
  const pathParts = relativePath.split(path.sep).filter((p) => p !== 'route.ts' && p !== 'route.js')
  return '/api/' + pathParts.join('/')
}

function migrateFile(filePath, dryRun = false) {
  const relativePath = path.relative(process.cwd(), filePath)
  const result = {
    file: relativePath,
    migrated: false,
    changes: [],
    errors: [],
  }

  try {
    let content = fs.readFileSync(filePath, 'utf-8')
    const originalContent = content
    const apiPath = extractAPIPath(filePath)

    // Check if file already uses standardized pattern
    const hasHandleAPIError = content.includes('handleAPIError')
    const hasCreateSuccessResponse = content.includes('createSuccessResponse')
    const hasCreateAPILogger = content.includes('createAPILogger')

    // Step 1: Add/update imports
    const apiResponseImport =
      "import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'"
    const loggerImport = "import { createAPILogger } from '@/lib/utils/logger-context'"

    // Remove old logger imports if present
    content = content.replace(
      /import\s+{\s*logger\s*}\s+from\s+['"]@\/lib\/utils\/logger['"];?\n?/g,
      ''
    )
    content = content.replace(/import\s+logger\s+from\s+['"]@\/lib\/utils\/logger['"];?\n?/g, '')

    // Add new imports if not present
    if (!content.includes('handleAPIError')) {
      // Find the last import statement
      const importRegex = /^import\s+.*$/gm
      const imports = content.match(importRegex) || []
      const lastImportIndex =
        imports.length > 0
          ? content.lastIndexOf(imports[imports.length - 1]) + imports[imports.length - 1].length
          : 0

      const beforeImports = content.substring(0, lastImportIndex)
      const afterImports = content.substring(lastImportIndex)

      // Add new imports after existing imports
      const newImports = `\n${apiResponseImport}\n${loggerImport}`
      content =
        beforeImports + (afterImports.startsWith('\n') ? '' : '\n') + newImports + afterImports
      result.changes.push(
        'Added imports for handleAPIError, createSuccessResponse, APIErrors, createAPILogger'
      )
    } else if (!content.includes('createAPILogger')) {
      // Add logger import if missing
      const importRegex = /^import\s+.*$/gm
      const imports = content.match(importRegex) || []
      const lastImportIndex =
        imports.length > 0
          ? content.lastIndexOf(imports[imports.length - 1]) + imports[imports.length - 1].length
          : 0

      const beforeImports = content.substring(0, lastImportIndex)
      const afterImports = content.substring(lastImportIndex)

      content =
        beforeImports +
        (afterImports.startsWith('\n') ? '' : '\n') +
        '\n' +
        loggerImport +
        afterImports
      result.changes.push('Added import for createAPILogger')
    }

    // Step 2: Migrate each HTTP method handler
    for (const method of HTTP_METHODS) {
      // Match function declaration and body
      const methodRegex = new RegExp(
        `(export\\s+(async\\s+)?function\\s+${method}\\s*\\([^)]*\\)\\s*\\{)([\\s\\S]*?)(\\n\\})`,
        'g'
      )

      let match
      const matches = []
      while ((match = methodRegex.exec(content)) !== null) {
        matches.push(match)
      }

      // Process matches in reverse to maintain indices
      for (let i = matches.length - 1; i >= 0; i--) {
        const match = matches[i]
        const funcStart = match[1]
        const funcBody = match[3]
        const funcEnd = match[4]

        // Skip if this handler uses redirects (like auth/callback)
        if (funcBody.includes('NextResponse.redirect')) {
          continue
        }

        // Check if already has try-catch
        const hasTryCatch = /try\s*\{/.test(funcBody) && /catch\s*\(/.test(funcBody)

        // Check if already has logger
        const hasLogger = /const\s+logger\s*=\s*createAPILogger/.test(funcBody)

        let newBody = funcBody

        // Add logger if missing
        if (!hasLogger) {
          const loggerLine = `  const logger = createAPILogger('${method}', '${apiPath}')`
          // Insert after opening brace
          const firstLineBreak = newBody.indexOf('\n')
          if (firstLineBreak >= 0) {
            newBody =
              newBody.substring(0, firstLineBreak + 1) +
              loggerLine +
              '\n' +
              newBody.substring(firstLineBreak + 1)
          } else {
            newBody = '\n' + loggerLine + newBody
          }
          result.changes.push(`Added logger to ${method} handler`)
        }

        // Wrap in try-catch if missing
        if (!hasTryCatch) {
          // Find the actual function body (skip logger line)
          const bodyStart = newBody.indexOf('\n') + 1
          const actualBody = newBody.substring(bodyStart)

          // Indent existing body
          const indentedBody = actualBody
            .split('\n')
            .map((line) => {
              // Preserve empty lines
              if (line.trim() === '') return line
              // Add 2 spaces for try block
              return '    ' + line
            })
            .join('\n')

          // Wrap in try-catch
          newBody =
            newBody.substring(0, bodyStart) +
            '  try {\n' +
            indentedBody +
            '\n' +
            '  } catch (error) {\n' +
            `    return handleAPIError(error, { method: '${method}', path: '${apiPath}' })\n` +
            '  }'

          result.changes.push(`Wrapped ${method} handler in try-catch`)
        } else {
          // Update existing catch block to use handleAPIError
          const catchRegex = /catch\s*\([^)]*\)\s*\{([\s\S]*?)\n\s*\}/
          const newBodyWithCatch = newBody.replace(catchRegex, (catchMatch, catchBody) => {
            // Check if already uses handleAPIError
            if (catchBody.includes('handleAPIError')) {
              return catchMatch
            }

            // Replace old error handling - preserve indentation
            const indent = catchMatch.match(/^(\s*)/)[1]
            const newCatchBody = `${indent}    return handleAPIError(error, { method: '${method}', path: '${apiPath}' })`
            return `catch (error) {\n${newCatchBody}\n${indent}  }`
          })

          if (newBodyWithCatch !== newBody) {
            newBody = newBodyWithCatch
            result.changes.push(`Updated ${method} catch block to use handleAPIError`)
          }
        }

        // Replace NextResponse.json success responses
        newBody = newBody.replace(
          /return\s+NextResponse\.json\(\s*\{\s*success:\s*true\s*,\s*data:\s*([^,}]+)(?:,\s*([^}]+))?\s*\}\s*\)/g,
          (match, dataExpr, metaExpr) => {
            if (metaExpr) {
              return `return createSuccessResponse(${dataExpr.trim()}, { ${metaExpr.trim()} })`
            }
            return `return createSuccessResponse(${dataExpr.trim()})`
          }
        )

        // Replace NextResponse.json with success: true (more flexible pattern)
        newBody = newBody.replace(
          /return\s+NextResponse\.json\(\s*\{\s*success:\s*true\s*,\s*data:\s*([^,}]+)\s*,\s*message:\s*['"]([^'"]+)['"]\s*\}\s*\)/g,
          (match, dataExpr, message) => {
            return `return createSuccessResponse(${dataExpr.trim()}, { message: '${message}' })`
          }
        )

        newBody = newBody.replace(
          /return\s+NextResponse\.json\(\s*\{\s*success:\s*true\s*,\s*data:\s*([^}]+)\s*\}\s*\)/g,
          (match, dataExpr) => {
            return `return createSuccessResponse(${dataExpr.trim()})`
          }
        )

        // Replace error responses in catch blocks (but not if already using handleAPIError)
        if (!newBody.includes('handleAPIError(error')) {
          // Replace logger.error + NextResponse.json pattern
          newBody = newBody.replace(
            /logger\.error\([^)]+\)\s*;?\s*return\s+NextResponse\.json\(\s*\{\s*error:\s*([^}]+)\}\s*,\s*\{\s*status:\s*(\d+)\s*\}\s*\)/g,
            (match, errorExpr, status) => {
              return `return handleAPIError(error, { method: '${method}', path: '${apiPath}' })`
            }
          )

          // Replace standalone error responses
          newBody = newBody.replace(
            /return\s+NextResponse\.json\(\s*\{\s*error:\s*['"]([^'"]+)['"]\s*\}\s*,\s*\{\s*status:\s*(\d+)\s*\}\s*\)/g,
            (match, errorMsg, status) => {
              // Map status codes to APIErrors
              if (status === '401') {
                return `throw APIErrors.unauthorized()`
              } else if (status === '403') {
                return `throw APIErrors.forbidden()`
              } else if (status === '404') {
                return `throw APIErrors.notFound()`
              } else if (status === '400') {
                return `throw APIErrors.badRequest('${errorMsg}')`
              } else if (status === '409') {
                return `throw APIErrors.conflict('${errorMsg}')`
              } else if (status === '429') {
                return `throw APIErrors.tooManyRequests()`
              }
              // For 500, let it be caught by handleAPIError
              return match
            }
          )
        }

        // Replace the function in content
        const beforeMatch = content.substring(0, match.index)
        const afterMatch = content.substring(match.index + match[0].length)
        content = beforeMatch + funcStart + newBody + funcEnd + afterMatch
      }
    }

    if (content !== originalContent) {
      result.migrated = true
      if (!dryRun) {
        fs.writeFileSync(filePath, content, 'utf-8')
        result.changes.push('File written')
      } else {
        result.changes.push('DRY RUN - File not written')
      }
    } else {
      result.changes.push('No changes needed (already migrated or no handlers found)')
    }
  } catch (error) {
    result.errors.push(`Error migrating file: ${error.message}`)
  }

  return result
}

function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run') || args.includes('-d')
  const specificFile = args.find(
    (arg) => !arg.startsWith('-') && (arg.endsWith('.ts') || arg.endsWith('.js'))
  )

  console.log('Migrating API routes to standardized error handling...\n')
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No files will be modified\n')
  }

  const routeFiles = specificFile ? [path.resolve(specificFile)] : findRouteFiles(API_DIR)

  console.log(`Found ${routeFiles.length} route files\n`)

  const results = []
  let migratedCount = 0
  let errorCount = 0
  let skippedCount = 0

  for (const filePath of routeFiles) {
    const result = migrateFile(filePath, dryRun)
    results.push(result)

    if (result.migrated) {
      migratedCount++
      console.log(`✅ ${result.file}`)
      result.changes.forEach((change) => console.log(`   - ${change}`))
      if (result.errors.length > 0) {
        errorCount++
        result.errors.forEach((error) => console.log(`   ⚠️  ${error}`))
      }
    } else if (result.errors.length > 0) {
      errorCount++
      console.log(`❌ ${result.file}`)
      result.errors.forEach((error) => console.log(`   ⚠️  ${error}`))
    } else {
      skippedCount++
    }
  }

  console.log('\n' + '='.repeat(80))
  console.log('MIGRATION SUMMARY')
  console.log('='.repeat(80))
  console.log(`Total files: ${routeFiles.length}`)
  console.log(`Migrated: ${migratedCount}`)
  console.log(`Skipped: ${skippedCount}`)
  console.log(`Errors: ${errorCount}`)

  if (dryRun) {
    console.log('\n🔍 This was a dry run. Use without --dry-run to apply changes.')
  }

  // Write results to file
  const outputFile = path.join(process.cwd(), 'migration-results.json')
  fs.writeFileSync(
    outputFile,
    JSON.stringify(
      {
        results,
        summary: {
          total: routeFiles.length,
          migrated: migratedCount,
          skipped: skippedCount,
          errors: errorCount,
        },
      },
      null,
      2
    )
  )
  console.log(`\n📄 Detailed results saved to: ${outputFile}`)

  process.exit(errorCount > 0 ? 1 : 0)
}

if (require.main === module) {
  main()
}
