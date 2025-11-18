/**
 * Stress Testing Script using k6
 *
 * Tests system limits and identifies breaking points
 *
 * Run: k6 run __tests__/load/stress-test.js
 */

import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate } from 'k6/metrics'

const errorRate = new Rate('errors')

// Stress test configuration - gradually increase load until system breaks
export const options = {
  stages: [
    { duration: '1m', target: 50 }, // Start with 50 users
    { duration: '2m', target: 100 }, // Increase to 100
    { duration: '2m', target: 200 }, // Increase to 200
    { duration: '2m', target: 300 }, // Increase to 300
    { duration: '2m', target: 400 }, // Increase to 400
    { duration: '2m', target: 500 }, // Increase to 500
    { duration: '1m', target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'], // Allow up to 5s under stress
    http_req_failed: ['rate<0.1'], // Allow up to 10% errors under stress
  },
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'

export default function () {
  // Test most resource-intensive endpoints
  const endpoints = [
    { method: 'GET', path: '/api/feed?limit=50', name: 'Feed with limit' },
    { method: 'GET', path: '/api/posts?limit=50', name: 'Posts with limit' },
    { method: 'GET', path: '/api/events?limit=50', name: 'Events with limit' },
    { method: 'GET', path: '/api/discover', name: 'Discover' },
  ]

  for (const endpoint of endpoints) {
    const url = `${BASE_URL}${endpoint.path}`
    const params = {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: '10s', // 10 second timeout
    }

    const response = http.get(url, params)

    const success = check(response, {
      [`${endpoint.name} responded`]: (r) => r.status !== 0,
      [`${endpoint.name} not timeout`]: (r) => r.status !== 0 && r.status !== 408,
    })

    errorRate.add(!success)

    sleep(0.5) // Shorter sleep for stress test
  }
}

export function handleSummary(data) {
  return {
    'stress-test-results.json': JSON.stringify(data),
    stdout: `
Stress Test Summary
===================
Max VUs: ${data.metrics.vus.values.max}
Total Requests: ${data.metrics.http_reqs.values.count}
Failed Requests: ${data.metrics.http_req_failed.values.rate * 100}%
Avg Response Time: ${data.metrics.http_req_duration.values.avg}ms
P95 Response Time: ${data.metrics.http_req_duration.values['p(95)']}ms
P99 Response Time: ${data.metrics.http_req_duration.values['p(99)']}ms
`,
  }
}
