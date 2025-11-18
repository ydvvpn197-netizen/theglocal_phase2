/**
 * Global setup for Playwright E2E tests
 * Runs before all tests to seed test data
 */

import { seedTestData } from './helpers/test-data'

async function globalSetup() {
  console.log('Running global setup...')
  try {
    await seedTestData()
    console.log('Test data seeded successfully')
  } catch (error) {
    console.warn('Failed to seed test data:', error)
  }
}

export default globalSetup
