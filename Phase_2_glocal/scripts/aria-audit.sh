#!/bin/bash

# ARIA Labels Audit Script
# Scans codebase for common accessibility issues

echo "🔍 ARIA Labels Audit"
echo "===================="
echo ""

# Check for buttons without aria-label or text content
echo "📋 Checking icon-only buttons..."
grep -r "button" components/ app/ --include="*.tsx" --include="*.jsx" | \
  grep -v "aria-label" | \
  grep -v "children" | \
  grep -v "Button>" | \
  wc -l | \
  xargs -I {} echo "Found {} potential icon-only buttons without labels"

echo ""

# Check for inputs without labels
echo "📋 Checking form inputs..."
grep -r "<input" components/ app/ --include="*.tsx" --include="*.jsx" | \
  grep -v "aria-label" | \
  grep -v "htmlFor" | \
  wc -l | \
  xargs -I {} echo "Found {} potential inputs without labels"

echo ""

# Check for images without alt text
echo "📋 Checking images..."
grep -r "<img" components/ app/ --include="*.tsx" --include="*.jsx" | \
  grep -v "alt=" | \
  wc -l | \
  xargs -I {} echo "Found {} potential images without alt text"

echo ""

# Check for links without context
echo "📋 Checking links..."
grep -r "Read more\|Click here\|Learn more" components/ app/ --include="*.tsx" --include="*.jsx" | \
  wc -l | \
  xargs -I {} echo "Found {} potential vague link texts"

echo ""

# Check for custom controls without ARIA
echo "📋 Checking custom controls..."
grep -r "role=" components/ app/ --include="*.tsx" --include="*.jsx" | \
  wc -l | \
  xargs -I {} echo "Found {} components with role attributes (review for proper ARIA)"

echo ""
echo "✅ Audit complete!"
echo ""
echo "📖 Next steps:"
echo "1. Review docs/ARIA_AUDIT_CHECKLIST.md"
echo "2. Run automated tools (axe, WAVE, Lighthouse)"
echo "3. Test with screen readers"
echo "4. Fix critical issues first"

