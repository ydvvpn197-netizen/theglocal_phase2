#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { existsSync } from 'fs';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try to find .env.local relative to the script, then try project root
const envPaths = [
  join(__dirname, '..', '.env.local'),
  resolve(__dirname, '..', '.env.local'),
  '.env.local',
];

let envLoaded = false;
for (const envPath of envPaths) {
  if (existsSync(envPath)) {
    config({ path: envPath });
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.error('Warning: .env.local file not found. Attempted paths:', envPaths);
}

// Get Vercel credentials from environment
const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;

const VERCEL_API = 'https://api.vercel.com';

if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) {
  console.error('Missing required environment variables: VERCEL_TOKEN and VERCEL_PROJECT_ID');
  process.exit(1);
}

// Helper for Vercel API
async function vercelFetch(endpoint, options = {}) {
  const headers = {
    Authorization: `Bearer ${VERCEL_TOKEN}`,
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  const url = `${VERCEL_API}${endpoint}${VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : ''}`;
  
  try {
    const res = await fetch(url, { ...options, headers });
    const data = await res.json();
    
    if (!res.ok) {
      throw new Error(`Vercel API Error: ${JSON.stringify(data)}`);
    }
    
    return data;
  } catch (error) {
    throw new Error(`Network Error: ${error.message}`);
  }
}

// Create MCP server
const server = new Server(
  {
    name: 'vercel-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_deployments',
        description: 'Get list of Vercel deployments for the project',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of deployments to return (default: 10)',
            },
          },
        },
      },
      {
        name: 'get_deployment',
        description: 'Get details of a specific deployment by ID',
        inputSchema: {
          type: 'object',
          properties: {
            deployment_id: {
              type: 'string',
              description: 'Deployment ID',
            },
          },
          required: ['deployment_id'],
        },
      },
      {
        name: 'create_deployment',
        description: 'Create a new deployment from GitHub',
        inputSchema: {
          type: 'object',
          properties: {
            branch: {
              type: 'string',
              description: 'Git branch to deploy (default: main)',
            },
            github_repo: {
              type: 'string',
              description: 'GitHub repository (e.g., owner/repo)',
            },
          },
        },
      },
      {
        name: 'get_deployment_logs',
        description: 'Get logs for a specific deployment',
        inputSchema: {
          type: 'object',
          properties: {
            deployment_id: {
              type: 'string',
              description: 'Deployment ID',
            },
          },
          required: ['deployment_id'],
        },
      },
      {
        name: 'cancel_deployment',
        description: 'Cancel a deployment',
        inputSchema: {
          type: 'object',
          properties: {
            deployment_id: {
              type: 'string',
              description: 'Deployment ID',
            },
          },
          required: ['deployment_id'],
        },
      },
      {
        name: 'get_project_info',
        description: 'Get information about the Vercel project',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_environment_variables',
        description: 'Get environment variables for the project',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'set_environment_variable',
        description: 'Set an environment variable for the project',
        inputSchema: {
          type: 'object',
          properties: {
            key: {
              type: 'string',
              description: 'Environment variable key',
            },
            value: {
              type: 'string',
              description: 'Environment variable value',
            },
            environments: {
              type: 'array',
              description: 'Environments where this variable applies (production, preview, development)',
              items: {
                type: 'string',
              },
            },
          },
          required: ['key', 'value'],
        },
      },
      {
        name: 'delete_environment_variable',
        description: 'Delete an environment variable',
        inputSchema: {
          type: 'object',
          properties: {
            key: {
              type: 'string',
              description: 'Environment variable key',
            },
          },
          required: ['key'],
        },
      },
      {
        name: 'list_domains',
        description: 'List all domains for the project',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'add_domain',
        description: 'Add a domain to the project',
        inputSchema: {
          type: 'object',
          properties: {
            domain: {
              type: 'string',
              description: 'Domain name to add (e.g., example.com)',
            },
            redirect: {
              type: 'string',
              description: 'Domain to redirect to (optional)',
            },
          },
          required: ['domain'],
        },
      },
      {
        name: 'remove_domain',
        description: 'Remove a domain from the project',
        inputSchema: {
          type: 'object',
          properties: {
            domain: {
              type: 'string',
              description: 'Domain name to remove',
            },
          },
          required: ['domain'],
        },
      },
      {
        name: 'get_domain_config',
        description: 'Get DNS configuration for a domain',
        inputSchema: {
          type: 'object',
          properties: {
            domain: {
              type: 'string',
              description: 'Domain name',
            },
          },
          required: ['domain'],
        },
      },
      {
        name: 'get_analytics',
        description: 'Get project analytics/metrics',
        inputSchema: {
          type: 'object',
          properties: {
            start_date: {
              type: 'string',
              description: 'Start date (YYYY-MM-DD format)',
            },
            end_date: {
              type: 'string',
              description: 'End date (YYYY-MM-DD format)',
            },
          },
        },
      },
      {
        name: 'get_deployment_analytics',
        description: 'Get analytics for specific deployment',
        inputSchema: {
          type: 'object',
          properties: {
            deployment_id: {
              type: 'string',
              description: 'Deployment ID',
            },
          },
          required: ['deployment_id'],
        },
      },
      {
        name: 'get_performance_metrics',
        description: 'Get Core Web Vitals and performance data',
        inputSchema: {
          type: 'object',
          properties: {
            deployment_id: {
              type: 'string',
              description: 'Deployment ID (optional, if not provided uses project default)',
            },
            start_date: {
              type: 'string',
              description: 'Start date (YYYY-MM-DD format)',
            },
            end_date: {
              type: 'string',
              description: 'End date (YYYY-MM-DD format)',
            },
          },
        },
      },
      {
        name: 'update_project_settings',
        description: 'Update project settings (framework, build settings)',
        inputSchema: {
          type: 'object',
          properties: {
            framework: {
              type: 'string',
              description: 'Framework name',
            },
            build_command: {
              type: 'string',
              description: 'Build command',
            },
            output_directory: {
              type: 'string',
              description: 'Output directory',
            },
            install_command: {
              type: 'string',
              description: 'Install command',
            },
            root_directory: {
              type: 'string',
              description: 'Root directory',
            },
          },
        },
      },
      {
        name: 'list_aliases',
        description: 'List project aliases',
        inputSchema: {
          type: 'object',
          properties: {
            deployment_id: {
              type: 'string',
              description: 'Deployment ID (optional, if not provided lists all aliases)',
            },
          },
        },
      },
      {
        name: 'create_alias',
        description: 'Create deployment alias',
        inputSchema: {
          type: 'object',
          properties: {
            deployment_id: {
              type: 'string',
              description: 'Deployment ID',
            },
            alias: {
              type: 'string',
              description: 'Alias domain (e.g., staging.example.com)',
            },
          },
          required: ['deployment_id', 'alias'],
        },
      },
      {
        name: 'list_webhooks',
        description: 'List configured webhooks',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_webhook',
        description: 'Create a new webhook',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'Webhook URL',
            },
            events: {
              type: 'array',
              description: 'Array of event types to listen for',
              items: { type: 'string' },
            },
          },
          required: ['url', 'events'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'get_deployments': {
        const limit = args.limit || 10;
        const data = await vercelFetch(`/v6/deployments?projectId=${VERCEL_PROJECT_ID}&limit=${limit}`);
        
        const deployments = data.deployments.map(dep => ({
          id: dep.uid,
          url: dep.url,
          state: dep.state,
          createdAt: dep.createdAt,
          creator: dep.creator?.username,
          meta: dep.meta,
        }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ deployments, count: deployments.length }, null, 2),
            },
          ],
        };
      }

      case 'get_deployment': {
        const data = await vercelFetch(`/v13/deployments/${args.deployment_id}`);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                id: data.uid,
                url: data.url,
                state: data.state,
                createdAt: data.createdAt,
                creator: data.creator?.username,
                meta: data.meta,
                alias: data.alias,
                target: data.target,
                regions: data.regions,
              }, null, 2),
            },
          ],
        };
      }

      case 'create_deployment': {
        const branch = args.branch || 'main';
        const githubRepo = args.github_repo || process.env.GITHUB_REPO;
        
        if (!githubRepo) {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: GitHub repository not specified. Provide github_repo argument or set GITHUB_REPO environment variable.',
              },
            ],
          };
        }

        const body = {
          name: 'cursor-auto-deploy',
          project: VERCEL_PROJECT_ID,
          gitSource: {
            type: 'github',
            repo: githubRepo,
            ref: branch,
          },
        };

        const data = await vercelFetch('/v13/deployments', {
          method: 'POST',
          body: JSON.stringify(body),
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                deployment: {
                  id: data.uid,
                  url: data.url,
                  state: data.state,
                  createdAt: data.createdAt,
                },
              }, null, 2),
            },
          ],
        };
      }

      case 'get_deployment_logs': {
        const data = await vercelFetch(`/v2/deployments/${args.deployment_id}/events`);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ logs: data, count: Array.isArray(data) ? data.length : 0 }, null, 2),
            },
          ],
        };
      }

      case 'cancel_deployment': {
        const data = await vercelFetch(`/v13/deployments/${args.deployment_id}/cancel`, {
          method: 'PATCH',
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: 'Deployment cancelled',
                deployment: data,
              }, null, 2),
            },
          ],
        };
      }

      case 'get_project_info': {
        const data = await vercelFetch(`/v9/projects/${VERCEL_PROJECT_ID}`);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                id: data.id,
                name: data.name,
                accountId: data.accountId,
                createdAt: data.createdAt,
                updatedAt: data.updatedAt,
                framework: data.framework,
                gitRepository: data.link?.repo,
                productionBranch: data.productionBranch,
              }, null, 2),
            },
          ],
        };
      }

      case 'get_environment_variables': {
        const data = await vercelFetch(`/v10/projects/${VERCEL_PROJECT_ID}/env`);
        
        const envVars = data.envs.map(env => ({
          key: env.key,
          value: env.value || '[hidden]',
          type: env.type,
          target: env.target,
          gitBranch: env.gitBranch,
          createdAt: env.createdAt,
          updatedAt: env.updatedAt,
        }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ environment_variables: envVars, count: envVars.length }, null, 2),
            },
          ],
        };
      }

      case 'set_environment_variable': {
        const environments = args.environments || ['production', 'preview', 'development'];
        
        const body = {
          key: args.key,
          value: args.value,
          type: 'encrypted',
          target: environments,
        };

        const data = await vercelFetch(`/v10/projects/${VERCEL_PROJECT_ID}/env`, {
          method: 'POST',
          body: JSON.stringify(body),
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: `Environment variable '${args.key}' set successfully`,
                environment_variable: data,
              }, null, 2),
            },
          ],
        };
      }

      case 'delete_environment_variable': {
        // First, get all env vars to find the ID
        const envVars = await vercelFetch(`/v10/projects/${VERCEL_PROJECT_ID}/env`);
        const envVar = envVars.envs.find(env => env.key === args.key);

        if (!envVar) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: Environment variable '${args.key}' not found`,
              },
            ],
          };
        }

        await vercelFetch(`/v10/projects/${VERCEL_PROJECT_ID}/env/${envVar.id}`, {
          method: 'DELETE',
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: `Environment variable '${args.key}' deleted successfully`,
              }, null, 2),
            },
          ],
        };
      }

      case 'list_domains': {
        const data = await vercelFetch(`/v9/projects/${VERCEL_PROJECT_ID}/domains`);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                domains: data.domains || [],
                count: data.domains?.length || 0,
              }, null, 2),
            },
          ],
        };
      }

      case 'add_domain': {
        const body = {
          name: args.domain,
        };
        
        if (args.redirect) {
          body.redirect = args.redirect;
        }
        
        const data = await vercelFetch(`/v10/projects/${VERCEL_PROJECT_ID}/domains`, {
          method: 'POST',
          body: JSON.stringify(body),
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: `Domain '${args.domain}' added successfully`,
                domain: data,
              }, null, 2),
            },
          ],
        };
      }

      case 'remove_domain': {
        await vercelFetch(`/v10/projects/${VERCEL_PROJECT_ID}/domains/${args.domain}`, {
          method: 'DELETE',
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: `Domain '${args.domain}' removed successfully`,
              }, null, 2),
            },
          ],
        };
      }

      case 'get_domain_config': {
        const data = await vercelFetch(`/v10/projects/${VERCEL_PROJECT_ID}/domains/${args.domain}`);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                domain: args.domain,
                config: data,
              }, null, 2),
            },
          ],
        };
      }

      case 'get_analytics': {
        let url = `/v1/analytics/projects/${VERCEL_PROJECT_ID}`;
        const params = [];
        
        if (args.start_date) params.push(`start=${args.start_date}`);
        if (args.end_date) params.push(`end=${args.end_date}`);
        
        if (params.length > 0) {
          url += `?${params.join('&')}`;
        }
        
        const data = await vercelFetch(url);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                project_id: VERCEL_PROJECT_ID,
                analytics: data,
              }, null, 2),
            },
          ],
        };
      }

      case 'get_deployment_analytics': {
        const data = await vercelFetch(`/v1/analytics/deployments/${args.deployment_id}`);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                deployment_id: args.deployment_id,
                analytics: data,
              }, null, 2),
            },
          ],
        };
      }

      case 'get_performance_metrics': {
        let url = `/v1/analytics/metrics`;
        const params = [`projectId=${VERCEL_PROJECT_ID}`];
        
        if (args.deployment_id) params.push(`deploymentId=${args.deployment_id}`);
        if (args.start_date) params.push(`start=${args.start_date}`);
        if (args.end_date) params.push(`end=${args.end_date}`);
        
        url += `?${params.join('&')}`;
        
        const data = await vercelFetch(url);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                project_id: VERCEL_PROJECT_ID,
                deployment_id: args.deployment_id || 'all',
                metrics: data,
              }, null, 2),
            },
          ],
        };
      }

      case 'update_project_settings': {
        const body = {};
        
        if (args.framework) body.framework = args.framework;
        if (args.build_command) body.buildCommand = args.build_command;
        if (args.output_directory) body.outputDirectory = args.output_directory;
        if (args.install_command) body.installCommand = args.install_command;
        if (args.root_directory) body.rootDirectory = args.root_directory;
        
        const data = await vercelFetch(`/v9/projects/${VERCEL_PROJECT_ID}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: 'Project settings updated successfully',
                project: data,
              }, null, 2),
            },
          ],
        };
      }

      case 'list_aliases': {
        let url = `/v4/deployments/${args.deployment_id || VERCEL_PROJECT_ID}/aliases`;
        
        const data = await vercelFetch(url);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                deployment_id: args.deployment_id || 'all',
                aliases: data.aliases || [],
                count: data.aliases?.length || 0,
              }, null, 2),
            },
          ],
        };
      }

      case 'create_alias': {
        const body = {
          alias: args.alias,
        };
        
        const data = await vercelFetch(`/v1/deployments/${args.deployment_id}/aliases`, {
          method: 'POST',
          body: JSON.stringify(body),
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: `Alias '${args.alias}' created successfully`,
                alias: data,
              }, null, 2),
            },
          ],
        };
      }

      case 'list_webhooks': {
        const data = await vercelFetch(`/v1/projects/${VERCEL_PROJECT_ID}/webhooks`);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                webhooks: data.webhooks || [],
                count: data.webhooks?.length || 0,
              }, null, 2),
            },
          ],
        };
      }

      case 'create_webhook': {
        const body = {
          url: args.url,
          events: args.events,
        };
        
        const data = await vercelFetch(`/v1/projects/${VERCEL_PROJECT_ID}/webhooks`, {
          method: 'POST',
          body: JSON.stringify(body),
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: 'Webhook created successfully',
                webhook: data,
              }, null, 2),
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: 'text',
              text: `Unknown tool: ${name}`,
            },
          ],
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Vercel MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

