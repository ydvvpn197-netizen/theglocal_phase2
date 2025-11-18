#!/usr/bin/env node

/**
 * Fix all missing closing braces in route files
 * Pattern: } catch ... } - should be } catch ... } }
 */

const fs = require('fs')
const path = require('path')

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8')
  const original = content

  // Find all function exports that end with catch block but missing closing brace
  // Pattern: } catch (error) { ... return handleAPIError(...) } - missing final }
  const lines = content.split('\n')
  let fixed = false
  let braceCount = 0
  let inFunction = false
  let functionStart = -1

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Check if this is an exported function
    if (line.match(/^export async function (GET|POST|PUT|PATCH|DELETE)/)) {
      inFunction = true
      functionStart = i
      braceCount = 0
    }

    if (inFunction) {
      // Count braces
      for (const char of line) {
        if (char === '{') braceCount++
        if (char === '}') braceCount--
      }

      // If we hit a catch block and then the brace count goes to 0, we might be missing a closing brace
      if (line.includes('} catch (error) {')) {
        // Look ahead to find the end of the catch block
        let j = i + 1
        let catchBraceCount = 1
        while (j < lines.length && catchBraceCount > 0) {
          for (const char of lines[j]) {
            if (char === '{') catchBraceCount++
            if (char === '}') catchBraceCount--
          }
          if (catchBraceCount === 0) {
            // Check if next line is the end of file or another export
            if (j + 1 < lines.length) {
              const nextLine = lines[j + 1].trim()
              // If next line is empty or starts with export or //, we might be missing a brace
              if (
                nextLine === '' ||
                nextLine.startsWith('export') ||
                nextLine.startsWith('//') ||
                nextLine.startsWith('interface') ||
                nextLine.startsWith('type') ||
                nextLine.startsWith('const') ||
                nextLine.startsWith('function')
              ) {
                // Check if braceCount is 0 (function should be closed)
                if (braceCount === 0) {
                  // Add closing brace after the catch block
                  lines[j] = lines[j] + '\n}'
                  fixed = true
                  inFunction = false
                  break
                }
              }
            } else {
              // End of file, check if we need a closing brace
              if (braceCount === 0) {
                lines[j] = lines[j] + '\n}'
                fixed = true
                inFunction = false
                break
              }
            }
            break
          }
          j++
        }
      }
    }
  }

  if (fixed) {
    content = lines.join('\n')
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
  try {
    if (fixFile(file)) {
      fixed++
      console.log(`Fixed: ${path.relative(process.cwd(), file)}`)
    }
  } catch (e) {
    console.error(`Error fixing ${file}:`, e.message)
  }
})

console.log(`\nFixed ${fixed} files`)
