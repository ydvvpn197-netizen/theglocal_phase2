/**
 * Lighthouse CI Configuration
 *
 * Configuration for automated Lighthouse accessibility audits.
 */

module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3000'],
      numberOfRuns: 3,
      startServerCommand: 'npm run dev',
      startServerReadyPattern: 'ready',
      startServerReadyTimeout: 30000,
    },
    assert: {
      assertions: {
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        'categories:performance': ['warn', { minScore: 0.8 }],
        'categories:seo': ['warn', { minScore: 0.9 }],
        // Accessibility-specific assertions
        'color-contrast': 'error',
        'document-title': 'error',
        'html-has-lang': 'error',
        'image-alt': 'error',
        label: 'error',
        'link-name': 'error',
        list: 'error',
        listitem: 'error',
        'meta-viewport': 'error',
        'button-name': 'error',
        bypass: 'error',
        'heading-order': 'error',
        'landmark-one-main': 'error',
        'page-has-heading-one': 'error',
        region: 'error',
        'aria-allowed-attr': 'error',
        'aria-hidden-body': 'error',
        'aria-hidden-focus': 'error',
        'aria-input-field-name': 'error',
        'aria-required-attr': 'error',
        'aria-roles': 'error',
        'aria-valid-attr': 'error',
        'aria-valid-attr-value': 'error',
        'duplicate-id': 'error',
        'form-field-multiple-labels': 'error',
        'frame-title': 'error',
        'html-lang-valid': 'error',
        'input-image-alt': 'error',
        'video-caption': 'warn',
        'video-description': 'warn',
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
}
