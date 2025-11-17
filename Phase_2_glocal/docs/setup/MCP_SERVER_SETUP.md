# MCP Server Configuration Guide

## Overview

This project includes two MCP (Model Context Protocol) servers:

- **Supabase MCP Server**: For database operations, schema management, and RLS policies
- **Vercel MCP Server**: For deployment management and environment variable management

## Fixed Issues

1. ✅ Updated `package.json` script path for Vercel MCP server
2. ✅ Fixed environment variable path resolution for both servers
3. ✅ Both servers now properly locate `.env.local` from any execution context

## Configuration in Cursor

To configure these MCP servers in Cursor:

### Method 1: Cursor Settings UI

1. Open Cursor Settings (Ctrl+, or Cmd+,)
2. Search for "MCP" or "Model Context Protocol"
3. Click "Add MCP Server" or "Edit MCP Servers"
4. Add the following configurations:

#### Supabase MCP Server:

```json
{
  "name": "supabase",
  "command": "node",
  "args": ["${workspaceFolder}/supabase-mcp-server.mjs"],
  "cwd": "${workspaceFolder}"
}
```

#### Vercel MCP Server:

```json
{
  "name": "vercel",
  "command": "node",
  "args": ["${workspaceFolder}/mcp/vercel-mcp-server.mjs"],
  "cwd": "${workspaceFolder}"
}
```

### Method 2: Settings JSON (if applicable)

If Cursor supports JSON configuration, add to your Cursor settings:

```json
{
  "mcp.servers": {
    "supabase": {
      "command": "node",
      "args": ["${workspaceFolder}/supabase-mcp-server.mjs"],
      "cwd": "${workspaceFolder}"
    },
    "vercel": {
      "command": "node",
      "args": ["${workspaceFolder}/mcp/vercel-mcp-server.mjs"],
      "cwd": "${workspaceFolder}"
    }
  }
}
```

## Required Environment Variables

Ensure your `.env.local` file (in the project root) contains:

### Supabase:

- `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### Vercel:

- `VERCEL_TOKEN`
- `VERCEL_PROJECT_ID`
- `VERCEL_TEAM_ID` (optional)

## Testing MCP Servers

You can test the servers manually using npm scripts:

```bash
# Test Supabase MCP server
npm run mcp

# Test Vercel MCP server
npm run mcp:vercel
```

Both servers should output: `[Server Name] MCP server running on stdio`

## Troubleshooting

### Server shows "Error - Show Output"

1. **Check environment variables**: Ensure `.env.local` exists and contains required variables
2. **Verify paths**: Ensure the server files exist at the configured paths
3. **Check Node.js**: Ensure Node.js v18+ is installed (`node --version`)
4. **Verify dependencies**: Run `npm install` to ensure `@modelcontextprotocol/sdk` is installed

### Server fails to find .env.local

The servers now use robust path resolution and will look for `.env.local` in:

1. Same directory as the script
2. Parent directory (project root)
3. Current working directory

### Path Issues

- **Supabase server**: Located at `supabase-mcp-server.mjs` (project root)
- **Vercel server**: Located at `mcp/vercel-mcp-server.mjs`

## Server Capabilities

### Supabase MCP Server

- Query tables with filters
- Insert/Update/Delete rows
- Execute SQL queries
- List tables and schemas
- Manage RLS policies
- Manage storage buckets and objects
- Database function execution

### Vercel MCP Server

- Get deployment information
- Create new deployments
- Get deployment logs
- Cancel deployments
- Get project information
- Manage environment variables

## Next Steps

1. Configure both servers in Cursor using one of the methods above
2. Restart Cursor to apply changes
3. Verify both servers show as "running" in Cursor's MCP server status
4. Test by asking Cursor to perform operations using these servers
