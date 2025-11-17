#!/bin/bash

# API Route Migration Helper Script
# Helps identify and migrate console.log statements in API routes

echo "🔍 API Route Migration Helper"
echo "=============================="
echo ""

# Check if a path is provided
if [ -z "$1" ]; then
  echo "Usage: bash scripts/migrate-api-route.sh <path>"
  echo "Example: bash scripts/migrate-api-route.sh app/api/posts"
  echo ""
  echo "Available actions:"
  echo "  list    - List all API routes"
  echo "  count   - Count console.logs in API routes"
  echo "  find    - Find routes with console.logs"
  echo "  summary - Show migration summary"
  echo ""
  exit 1
fi

ACTION=$1

case $ACTION in
  list)
    echo "📋 All API Routes:"
    echo ""
    find app/api -name "route.ts" | sort
    echo ""
    COUNT=$(find app/api -name "route.ts" | wc -l)
    echo "Total: $COUNT route files"
    ;;

  count)
    echo "📊 Console.log Count:"
    echo ""
    echo "console.log:"
    grep -r "console\.log" app/api --include="*.ts" | wc -l
    echo ""
    echo "console.error:"
    grep -r "console\.error" app/api --include="*.ts" | wc -l
    echo ""
    echo "console.warn:"
    grep -r "console\.warn" app/api --include="*.ts" | wc -l
    echo ""
    echo "console.debug:"
    grep -r "console\.debug" app/api --include="*.ts" | wc -l
    echo ""
    TOTAL=$(grep -r "console\.\(log\|error\|warn\|debug\)" app/api --include="*.ts" | wc -l)
    echo "Total: $TOTAL console statements"
    ;;

  find)
    echo "🔍 Routes with console.logs:"
    echo ""
    grep -r "console\.\(log\|error\|warn\|debug\)" app/api --include="*.ts" -l | sort
    echo ""
    COUNT=$(grep -r "console\.\(log\|error\|warn\|debug\)" app/api --include="*.ts" -l | wc -l)
    echo "Files to migrate: $COUNT"
    ;;

  summary)
    echo "📊 Migration Summary:"
    echo ""
    
    TOTAL_ROUTES=$(find app/api -name "route.ts" | wc -l)
    ROUTES_WITH_CONSOLE=$(grep -r "console\.\(log\|error\|warn\|debug\)" app/api --include="*.ts" -l | wc -l)
    MIGRATED=$((TOTAL_ROUTES - ROUTES_WITH_CONSOLE))
    PERCENT=$((MIGRATED * 100 / TOTAL_ROUTES))
    
    echo "Total routes: $TOTAL_ROUTES"
    echo "Migrated: $MIGRATED ($PERCENT%)"
    echo "Remaining: $ROUTES_WITH_CONSOLE"
    echo ""
    
    # Check for new error handling
    HAS_NEW_HANDLER=$(grep -r "handleAPIError" app/api --include="*.ts" -l | wc -l)
    echo "Routes using new error handler: $HAS_NEW_HANDLER"
    
    HAS_NEW_LOGGER=$(grep -r "createAPILogger" app/api --include="*.ts" -l | wc -l)
    echo "Routes using new logger: $HAS_NEW_LOGGER"
    ;;

  *)
    echo "Unknown action: $ACTION"
    echo "Use: list, count, find, or summary"
    exit 1
    ;;
esac

