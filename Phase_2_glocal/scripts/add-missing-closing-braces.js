#!/usr/bin/env node

/**
 * Add missing closing braces to route files
 * Files that end with } catch ... } but TypeScript says they're missing a closing brace
 */

const fs = require('fs')
const path = require('path')

// List of files that need closing braces (from TypeScript errors)
const filesToFix = [
  'app/api/artists/route.ts',
  'app/api/communities/[slug]/analytics/route.ts',
  'app/api/communities/[slug]/delete/route.ts',
  'app/api/communities/[slug]/edit/route.ts',
  'app/api/communities/[slug]/join/route.ts',
  'app/api/communities/[slug]/leave/route.ts',
  'app/api/communities/[slug]/members/[userId]/route.ts',
  'app/api/communities/[slug]/members/route.ts',
  'app/api/communities/[slug]/reclaim-admin/route.ts',
  'app/api/communities/[slug]/restore/route.ts',
  'app/api/communities/[slug]/route.ts',
  'app/api/communities/archived/route.ts',
  'app/api/communities/route.ts',
  'app/api/communities/user/route.ts',
  'app/api/cron/send-renewal-reminders/route.ts',
  'app/api/docs/route.ts',
  'app/api/events/[id]/rsvp/route.ts',
  'app/api/events/route.ts',
  'app/api/feed/route.ts',
  'app/api/geocoding/process/route.ts',
  'app/api/locations/saved/route.ts',
  'app/api/moderation/route.ts',
  'app/api/notifications/[id]/route.ts',
]

function fixFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`)
    return false
  }

  let content = fs.readFileSync(filePath, 'utf-8')
  const original = content

  // Check if file ends with } catch ... } but no final }
  const trimmed = content.trim()

  // If file ends with } catch ... } (without final closing brace for function)
  if (trimmed.endsWith('}') && !trimmed.endsWith('}\n}') && !trimmed.endsWith('}\n}\n')) {
    // Check if last non-empty line is a catch block closing
    const lines = content.split('\n')
    let lastNonEmptyLine = ''
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].trim()) {
        lastNonEmptyLine = lines[i].trim()
        break
      }
    }

    // If last line is just }, and we have a catch block before it, add another }
    if (lastNonEmptyLine === '}' && content.includes('} catch (error) {')) {
      // Count opening and closing braces to see if we're balanced
      const openBraces = (content.match(/{/g) || []).length
      const closeBraces = (content.match(/}/g) || []).length

      // If we have one more opening brace, add a closing brace
      if (openBraces > closeBraces) {
        content = content.trimEnd() + '\n}'
        fs.writeFileSync(filePath, content, 'utf-8')
        return true
      }
    }
  }

  return false
}

let fixed = 0
filesToFix.forEach((file) => {
  const fullPath = path.join(process.cwd(), file)
  if (fixFile(fullPath)) {
    fixed++
    console.log(`Fixed: ${file}`)
  }
})

console.log(`\nFixed ${fixed} files`)
