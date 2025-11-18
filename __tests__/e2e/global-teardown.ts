/**
 * Global teardown for Playwright E2E tests
 * Runs after all tests to cleanup test data
 */

import { cleanupTestData } from './helpers/test-data'

async function globalTeardown() {
  console.log('Running global teardown...')
  try {
    await cleanupTestData('e2e')
    console.log('Test data cleaned up successfully')
  } catch (error) {
    console.warn('Failed to cleanup test data:', error)
  }
}

export default globalTeardown
