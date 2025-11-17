#!/usr/bin/env node
import express from 'express'
// Using native fetch API (Node 18+)

const app = express()
app.use(express.json())

const VERCEL_API = 'https://api.vercel.com'
const GITHUB_API = 'https://api.github.com'

const {
  VERCEL_TOKEN,
  VERCEL_PROJECT_ID,
  VERCEL_TEAM_ID,
  GITHUB_TOKEN,
  GITHUB_REPO,
  GITHUB_BRANCH,
} = process.env

// Validate env vars
if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) {
  console.error('❌ Missing VERCEL_TOKEN or VERCEL_PROJECT_ID')
  process.exit(1)
}
if (!GITHUB_TOKEN || !GITHUB_REPO) {
  console.error('⚠️  GitHub integration disabled: Missing GITHUB_TOKEN or GITHUB_REPO')
}

// --- Helper for Vercel API ---
async function vercelFetch(endpoint, options = {}) {
  const headers = {
    Authorization: `Bearer ${VERCEL_TOKEN}`,
    'Content-Type': 'application/json',
    ...options.headers,
  }
  const url = `${VERCEL_API}${endpoint}${VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : ''}`
  const res = await fetch(url, { ...options, headers })
  const data = await res.json()
  if (!res.ok) throw new Error(JSON.stringify(data))
  return data
}

// --- Helper for GitHub API ---
async function githubFetch(endpoint, options = {}) {
  const headers = {
    Authorization: `token ${GITHUB_TOKEN}`,
    'Content-Type': 'application/json',
    Accept: 'application/vnd.github+json',
    ...options.headers,
  }
  const url = `${GITHUB_API}${endpoint}`
  const res = await fetch(url, { ...options, headers })
  const data = await res.json()
  if (!res.ok) throw new Error(JSON.stringify(data))
  return data
}

// --- Deploy latest GitHub commit ---
app.post('/deploy', async (req, res) => {
  try {
    const { branch = GITHUB_BRANCH || 'main' } = req.body
    console.log(`🚀 Deploying branch ${branch} from ${GITHUB_REPO}`)

    const body = {
      name: 'cursor-auto-deploy',
      project: VERCEL_PROJECT_ID,
      gitSource: {
        type: 'github',
        repo: GITHUB_REPO,
        ref: branch,
      },
    }

    const deployment = await vercelFetch('/v13/deployments', {
      method: 'POST',
      body: JSON.stringify(body),
    })

    res.json({
      status: 'success',
      deploymentUrl: `https://${deployment.url}`,
      id: deployment.id,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// --- Get latest commit from GitHub ---
app.get('/github/latest', async (req, res) => {
  try {
    const data = await githubFetch(`/repos/${GITHUB_REPO}/commits/${GITHUB_BRANCH}`)
    res.json({
      commit: data.sha,
      message: data.commit.message,
      author: data.commit.author.name,
      date: data.commit.author.date,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// --- Get Vercel deployment status ---
app.get('/status', async (req, res) => {
  try {
    const data = await vercelFetch(`/v6/deployments?projectId=${VERCEL_PROJECT_ID}`)
    const latest = data.deployments[0]
    res.json({
      id: latest.uid,
      state: latest.state,
      url: latest.url,
      createdAt: new Date(latest.createdAt).toLocaleString(),
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// --- Get logs ---
app.get('/logs/:id', async (req, res) => {
  try {
    const logs = await vercelFetch(`/v2/deployments/${req.params.id}/events`)
    res.json(logs)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

const PORT = 8080
app.listen(PORT, () =>
  console.log(`✅ MCP server (Vercel + GitHub) running at http://localhost:${PORT}`)
)
