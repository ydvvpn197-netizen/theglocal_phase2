/**
 * Load Testing Script using k6
 *
 * Tests critical endpoints with 100 concurrent users
 *
 * Install k6: https://k6.io/docs/getting-started/installation/
 * Run: k6 run __tests__/load/load-test.js
 */

import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate } from 'k6/metrics'

// Custom metrics
const errorRate = new Rate('errors')

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 50 }, // Ramp up to 50 users
    { duration: '1m', target: 100 }, // Ramp up to 100 users
    { duration: '2m', target: 100 }, // Stay at 100 users
    { duration: '30s', target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests should be below 2s
    http_req_failed: ['rate<0.01'], // Error rate should be less than 1%
    errors: ['rate<0.01'],
  },
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'

export default function () {
  // Test critical endpoints
  const endpoints = [
    { method: 'GET', path: '/api/feed', name: 'Feed' },
    { method: 'GET', path: '/api/posts', name: 'Posts' },
    { method: 'GET', path: '/api/events', name: 'Events' },
    { method: 'GET', path: '/api/communities', name: 'Communities' },
  ]

  for (const endpoint of endpoints) {
    const url = `${BASE_URL}${endpoint.path}`
    const params = {
      headers: {
        'Content-Type': 'application/json',
      },
    }

    let response
    if (endpoint.method === 'GET') {
      response = http.get(url, params)
    } else if (endpoint.method === 'POST') {
      response = http.post(url, JSON.stringify({}), params)
    }

    const success = check(response, {
      [`${endpoint.name} status is 200 or 401`]: (r) => r.status === 200 || r.status === 401,
      [`${endpoint.name} response time < 2s`]: (r) => r.timings.duration < 2000,
    })

    errorRate.add(!success)

    sleep(1) // Wait 1 second between requests
  }
}

export function handleSummary(data) {
  return {
    'load-test-results.json': JSON.stringify(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  }
}

function textSummary(data, options) {
  // Simple text summary
  return `
Load Test Summary
=================
Duration: ${data.state.testRunDurationMs / 1000}s
VUs: ${data.metrics.vus.values.max}
Requests: ${data.metrics.http_reqs.values.count}
Failed: ${data.metrics.http_req_failed.values.rate * 100}%
Avg Response Time: ${data.metrics.http_req_duration.values.avg}ms
P95 Response Time: ${data.metrics.http_req_duration.values['p(95)']}ms
`
}
